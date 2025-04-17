import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import fs from 'fs/promises';
import path from 'path';

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const debugInfo: Record<string, any> = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      paths: {
        cwd: process.cwd(),
        sections: [],
        sectionsExists: false
      },
      auth: {
        status: "pending"
      },
      shopifyApi: {
        status: "pending"
      },
      themes: []
    };

    // Check sections directory
    const possiblePaths = [
      path.join(process.cwd(), '..', 'sections'),
      path.join(process.cwd(), 'sections'),
      path.join(process.cwd(), 'public', 'sections')
    ];
    
    for (const dirPath of possiblePaths) {
      try {
        await fs.access(dirPath);
        debugInfo.paths.sections.push({
          path: dirPath,
          exists: true
        });
        
        if (!debugInfo.paths.sectionsExists) {
          debugInfo.paths.sectionsExists = true;
          
          // List contents if it exists
          const items = await fs.readdir(dirPath);
          debugInfo.paths.sectionItems = items.slice(0, 10); // Just show first 10 items
        }
      } catch (e) {
        debugInfo.paths.sections.push({
          path: dirPath,
          exists: false,
          error: (e as Error).message
        });
      }
    }

    // Test authentication
    try {
      const { admin, session } = await authenticate.admin(request);
      debugInfo.auth = {
        status: "success",
        session: {
          shop: session.shop,
          accessToken: session.accessToken ? "present" : "missing",
          expires: session.expires
        }
      };
      
      // Try to fetch themes
      try {
        const response = await admin.rest.get({
          path: 'themes',
        });
        
        debugInfo.shopifyApi = {
          status: "success",
          statusCode: response.status,
          headers: response.headers
        };
        
        // @ts-ignore - typecasting to access data property
        debugInfo.themes = response.data || [];
      } catch (apiError) {
        debugInfo.shopifyApi = {
          status: "error",
          message: (apiError as Error).message,
          stack: (apiError as Error).stack
        };
      }
    } catch (authError) {
      debugInfo.auth = {
        status: "error",
        message: (authError as Error).message,
        stack: (authError as Error).stack
      };
    }

    // Add server info
    debugInfo.server = {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      uptime: process.uptime()
    };

    return json(debugInfo);
  } catch (error) {
    return json({ 
      error: (error as Error).message,
      stack: (error as Error).stack
    }, { status: 500 });
  }
};

export default function Debug() {
  return null;
} 