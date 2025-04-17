import { json } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import fs from 'fs/promises';
import path from 'path';

interface RequestBody {
  sectionId: string;
  themeId: string;
  shop?: string; // Make shop parameter optional in type but we'll ensure it's available
}

interface Theme {
  id: number;
  role: string;
  name: string;
}

interface ThemesResponse {
  data: Theme[];
}

interface SettingsResponse {
  body: {
    asset: {
      key: string;
      value: string;
    };
  };
}

export const action: ActionFunction = async ({ request }) => {
  try {
    // Extract the shop domain from request if available
    const url = new URL(request.url);
    let shopParam = url.searchParams.get('shop');
    
    console.log(`[INFO] Received request to install section, shop param from URL: ${shopParam}`);
    
    // Get admin API session - this contains the shop information
    const { admin, session } = await authenticate.admin(request);
    
    // If no shop from URL, use the one from session
    if (!shopParam && session?.shop) {
      shopParam = session.shop;
      console.log(`[INFO] Using shop from session: ${shopParam}`);
    }
    
    // Log complete session info for debugging
    console.log(`[DEBUG] Session info: ${JSON.stringify({
      shopFromSession: session?.shop,
      hasAccessToken: !!session?.accessToken,
      expires: session?.expires
    })}`);
    
    // Extract request body
    const body = await request.json() as RequestBody;
    const { sectionId, themeId } = body;
    
    // If body contains shop, prioritize it
    if (body.shop) {
      shopParam = body.shop;
      console.log(`[INFO] Using shop from request body: ${shopParam}`);
    }
    
    // Validate required parameters
    if (!sectionId) {
      return json({ error: "Section ID is required" }, { status: 400 });
    }

    if (!themeId) {
      return json({ error: "Theme ID is required" }, { status: 400 });
    }
    
    // Make sure we have a shop parameter at this point
    if (!shopParam && !session?.shop) {
      // Create a safe object from URLSearchParams for JSON serialization
      const urlParamsObj: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        urlParamsObj[key] = value;
      });
      
      return json({ 
        error: "Shop parameter is required",
        details: { 
          message: "No shop found in URL params, request body, or session",
          urlParams: urlParamsObj,
          hasSession: !!session,
          hasShopInSession: !!session?.shop
        }
      }, { status: 400 });
    }

    console.log(`[INFO] Processing section install: ID=${sectionId}, themeID=${themeId}, shop=${shopParam || session?.shop}`);

    // Determine the sections directory path
    // Try multiple paths for sections directory
    const possiblePaths = [
      path.join(process.cwd(), '..', 'sections'),
      path.join(process.cwd(), 'sections'),
      path.join(process.cwd(), 'public', 'sections')
    ];
    
    let sectionsDir = '';
    let sectionPath = '';
    let sectionExists = false;
    
    // Keep track of all paths tried for debugging
    const triedPaths: string[] = [];
    
    // Check each possible path
    for (const baseDir of possiblePaths) {
      const tryPath = path.join(baseDir, sectionId, 'section.liquid');
      triedPaths.push(tryPath);
      
      try {
        await fs.access(tryPath);
        sectionsDir = baseDir;
        sectionPath = tryPath;
        sectionExists = true;
        console.log(`[INFO] Found section at: ${sectionPath}`);
        break;
      } catch (e) {
        console.log(`[INFO] Section not found at: ${tryPath}`);
      }
    }
    
    if (!sectionExists) {
      console.error(`[ERROR] Section file not found after trying paths: ${triedPaths.join(', ')}`);
      return json({ 
        error: "Section file not found", 
        details: {
          sectionId,
          triedPaths
        }
      }, { status: 404 });
    }

    console.log(`[INFO] Using section file at: ${sectionPath}`);
    
    let sectionContent;
    try {
      sectionContent = await fs.readFile(sectionPath, 'utf8');
      console.log(`[INFO] Read section content (${sectionContent.length} bytes)`);
    } catch (err) {
      console.error(`[ERROR] Error reading section file: ${err}`);
      return json({ 
        error: "Failed to read section file",
        details: { path: sectionPath, message: (err as Error).message }
      }, { status: 500 });
    }

    // Check for additional assets (CSS, JS)
    const cssPath = path.join(path.dirname(sectionPath), 'style.css');
    const jsPath = path.join(path.dirname(sectionPath), 'script.js');
    const schemaPath = path.join(path.dirname(sectionPath), 'schema.json');

    // Add section to theme
    try {
      console.log(`[INFO] Adding section ${sectionId} to theme ${themeId}`);
      
      // Add main section file
      const sectionResponse = await admin.rest.put({
        path: `themes/${themeId}/assets`,
        data: {
          asset: {
            key: `sections/${sectionId}.liquid`,
            value: sectionContent
          }
        }
      });
      
      console.log(`[INFO] Section file added successfully: ${sectionResponse.status}`);

      // Add CSS if exists
      try {
        const cssContent = await fs.readFile(cssPath, 'utf8');
        await admin.rest.put({
          path: `themes/${themeId}/assets`,
          data: {
            asset: {
              key: `assets/${sectionId}.css`,
              value: cssContent
            }
          }
        });
        console.log('[INFO] CSS file added successfully');
      } catch (err) {
        console.log('[INFO] No CSS file found for section, skipping...');
      }

      // Add JS if exists
      try {
        const jsContent = await fs.readFile(jsPath, 'utf8');
        await admin.rest.put({
          path: `themes/${themeId}/assets`,
          data: {
            asset: {
              key: `assets/${sectionId}.js`,
              value: jsContent
            }
          }
        });
        console.log('[INFO] JS file added successfully');
      } catch (err) {
        console.log('[INFO] No JS file found for section, skipping...');
      }

      // Update settings schema if exists
      try {
        const schemaContent = await fs.readFile(schemaPath, 'utf8');
        const schemaData = JSON.parse(schemaContent);
        
        // Get current settings schema
        const settingsResponse = await admin.rest.get({
          path: `themes/${themeId}/assets`,
          query: { 'asset[key]': 'config/settings_schema.json' }
        }) as unknown as SettingsResponse;

        if (settingsResponse.body) {
          const currentSchema = JSON.parse(settingsResponse.body.asset.value);
          // Add new section settings if not already present
          if (!currentSchema.some((item: any) => item.name === sectionId)) {
            currentSchema.push(schemaData);
            
            await admin.rest.put({
              path: `themes/${themeId}/assets`,
              data: {
                asset: {
                  key: 'config/settings_schema.json',
                  value: JSON.stringify(currentSchema, null, 2)
                }
              }
            });
            console.log('[INFO] Schema file added successfully');
          }
        }
      } catch (err) {
        console.log('[INFO] No schema file found for section, skipping...');
      }

      return json({ 
        success: true, 
        message: "Section installed successfully",
        sectionId,
        themeId,
        shop: shopParam || session?.shop
      });
    } catch (error: any) {
      console.error("[ERROR] Error installing section:", error);
      return json({ 
        error: "Failed to install section", 
        details: {
          message: error.message,
          status: error.status,
          sectionId,
          themeId,
          shop: shopParam || session?.shop
        }
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[ERROR] Error processing request:', error);
    return json({ 
      error: error.message || "An unexpected error occurred",
      details: { trace: error.stack }
    }, { status: 500 });
  }
};

// Add default export for Remix route
export default function InstallSection() {
  return null;
} 