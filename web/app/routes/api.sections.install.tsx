import { json } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import fs from 'fs/promises';
import path from 'path';

interface RequestBody {
  sectionId: string;
  themeId: string; // Theme ID is required now
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
  const { admin } = await authenticate.admin(request);
  const { sectionId, themeId } = await request.json() as RequestBody;

  if (!sectionId) {
    return json({ error: "Section ID is required" }, { status: 400 });
  }

  if (!themeId) {
    return json({ error: "Theme ID is required" }, { status: 400 });
  }

  try {
    // Determine the sections directory path
    // First try relative to web directory
    let sectionsDir = path.join(process.cwd(), '..', 'sections');
    let sectionPath = path.join(sectionsDir, sectionId, 'section.liquid');
    
    // Check if path exists, if not try alternate paths
    try {
      await fs.access(sectionPath);
    } catch (e) {
      // Try direct path from root
      sectionsDir = path.join(process.cwd(), 'sections');
      sectionPath = path.join(sectionsDir, sectionId, 'section.liquid');
      
      try {
        await fs.access(sectionPath);
      } catch (e) {
        // One more attempt with public directory
        sectionsDir = path.join(process.cwd(), 'public', 'sections');
        sectionPath = path.join(sectionsDir, sectionId, 'section.liquid');
      }
    }

    console.log(`Looking for section at: ${sectionPath}`);
    
    let sectionContent;
    try {
      sectionContent = await fs.readFile(sectionPath, 'utf8');
    } catch (err) {
      console.error(`Error reading section file: ${err}`);
      return json({ error: "Section file not found" }, { status: 404 });
    }

    // Check for additional assets (CSS, JS)
    const cssPath = path.join(path.dirname(sectionPath), 'style.css');
    const jsPath = path.join(path.dirname(sectionPath), 'script.js');
    const schemaPath = path.join(path.dirname(sectionPath), 'schema.json');

    // Add section to theme
    try {
      // Add main section file
      await admin.rest.put({
        path: `themes/${themeId}/assets`,
        data: {
          asset: {
            key: `sections/${sectionId}.liquid`,
            value: sectionContent
          }
        }
      });

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
      } catch (err) {
        console.log('No CSS file found for section, skipping...');
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
      } catch (err) {
        console.log('No JS file found for section, skipping...');
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
          if (!currentSchema.some(item => item.name === sectionId)) {
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
          }
        }
      } catch (err) {
        console.log('No schema file found for section, skipping...');
      }

      return json({ 
        success: true, 
        message: "Section installed successfully" 
      });
    } catch (error) {
      console.error("Error installing section:", error);
      return json({ 
        error: "Failed to install section" 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error installing section:', error);
    return json({ error: error.message }, { status: 500 });
  }
};

// Add default export for Remix route
export default function InstallSection() {
  return null;
} 