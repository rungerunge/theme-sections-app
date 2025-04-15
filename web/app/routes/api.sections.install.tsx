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
    // Read the section template
    const sectionPath = path.join(process.cwd(), '..', 'sections', sectionId, 'section.liquid');

    console.log(`Looking for section at: ${sectionPath}`);
    
    let sectionContent;
    try {
      sectionContent = await fs.readFile(sectionPath, 'utf8');
    } catch (readError) {
      console.error(`Failed to read section file: ${readError.message}`);
      
      // Log available sections for debugging
      try {
        const sectionsDir = path.join(process.cwd(), '..', 'sections');
        const availableSections = await fs.readdir(sectionsDir);
        console.log('Available sections:', availableSections);
      } catch (dirError) {
        console.error(`Failed to read sections directory: ${dirError.message}`);
      }
      
      return json({ 
        error: "Section template not found. Make sure the section exists and has a valid section.liquid file." 
      }, { status: 404 });
    }

    // Add the section to the theme
    try {
      await admin.rest.put({
        path: `themes/${themeId}/assets`,
        data: {
          asset: {
            key: `sections/${sectionId}.liquid`,
            value: sectionContent
          }
        }
      });
    } catch (apiError: any) {
      console.error('Error while adding section to theme:', apiError.message);
      return json({ error: `Failed to add section to theme: ${apiError.message}` }, { status: 500 });
    }

    return json({ 
      success: true,
      sectionId,
      themeId
    });
  } catch (error: any) {
    console.error('Error installing section:', error);
    return json({ error: error.message }, { status: 500 });
  }
};

// Add default export for Remix route
export default function InstallSection() {
  return null;
} 