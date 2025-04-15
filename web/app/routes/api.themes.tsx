import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { authenticate } from "../shopify.server";

interface Theme {
  id: number;
  name: string;
  role: string;
  theme_store_id: number | null;
  previewable: boolean;
  processing: boolean;
  created_at: string;
  updated_at: string;
}

interface ThemesResponse {
  data: Theme[];
}

export const loader: LoaderFunction = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  try {
    // Get all themes
    const response = await admin.rest.get({
      path: 'themes',
    });
    
    const typedResponse = response as unknown as ThemesResponse;
    
    return json({ 
      themes: typedResponse.data 
    });
  } catch (error) {
    console.error('Error fetching themes:', error);
    return json({ error: (error as Error).message }, { status: 500 });
  }
};

// Add default export for Remix route
export default function Themes() {
  return null;
} 