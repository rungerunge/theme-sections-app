import { json } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import fs from 'fs/promises';
import path from 'path';

interface RequestBody {
  sectionId: string;
  themeId?: string; // Optional theme ID (defaults to active theme if not provided)
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

  try {
    // Read the section template
    const sectionContent = await fs.readFile(
      path.join(process.cwd(), 'sections', sectionId, 'section.liquid'),
      'utf8'
    );

    let targetThemeId: number;

    // If themeId is provided, use it; otherwise, get the active theme
    if (themeId) {
      targetThemeId = parseInt(themeId, 10);
    } else {
      // Get the active theme
      const response = await admin.rest.get({
        path: 'themes',
      });
      const { data: themes } = response as unknown as ThemesResponse;
      
      const activeTheme = themes.find((theme) => theme.role === 'main');
      if (!activeTheme) {
        throw new Error('No active theme found');
      }
      
      targetThemeId = activeTheme.id;
    }

    // Add the section to the theme
    await admin.rest.put({
      path: `themes/${targetThemeId}/assets`,
      data: {
        asset: {
          key: `sections/${sectionId}.liquid`,
          value: sectionContent
        }
      }
    });

    return json({ success: true });
  } catch (error) {
    console.error('Error installing section:', error);
    return json({ error: (error as Error).message }, { status: 500 });
  }
};

// Add default export for Remix route
export default function InstallSection() {
  return null;
} 