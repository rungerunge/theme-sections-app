import { json } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import fs from 'fs/promises';
import path from 'path';

interface RequestBody {
  sectionId: string;
}

export const action: ActionFunction = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const { sectionId } = await request.json() as RequestBody;

  try {
    // Read the section template
    const sectionContent = await fs.readFile(
      path.join(process.cwd(), 'sections', sectionId, 'section.liquid'),
      'utf8'
    );

    // Get the active theme
    const { themes } = await admin.rest.get({
      path: 'themes',
    });
    
    const activeTheme = themes.data.find((theme: { role: string }) => theme.role === 'main');

    if (!activeTheme) {
      throw new Error('No active theme found');
    }

    // Add the section to the theme
    await admin.rest.put({
      path: `themes/${activeTheme.id}/assets`,
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