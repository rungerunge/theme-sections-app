import { json, ActionFunction, LoaderFunction } from "@remix-run/node";
import fs from 'fs/promises';
import path from 'path';
import { authenticate } from "../shopify.server";

// Simple in-memory auth check - must match the admin dashboard password
const ADMIN_PASSWORD = "your-secure-password"; // Change this to match admin.tsx

export const action: ActionFunction = async ({ request, params }) => {
  const sectionId = params.sectionId;
  
  if (!sectionId) {
    return json({ error: "Section ID is required" }, { status: 400 });
  }
  
  // Handle different request methods
  if (request.method === 'PUT') {
    // Update section
    return handleUpdateSection(request, sectionId);
  } else if (request.method === 'DELETE') {
    // Delete section
    return handleDeleteSection(request, sectionId);
  }
  
  return json({ error: "Method not allowed" }, { status: 405 });
};

async function handleUpdateSection(request: Request, sectionId: string) {
  try {
    const data = await request.json();
    const { section, adminToken } = data;
    
    // Verify admin token
    if (!adminToken || adminToken !== ADMIN_PASSWORD) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }
    
    if (!section) {
      return json({ error: "Section data is required" }, { status: 400 });
    }
    
    // Find the section directory
    let sectionsDir = path.join(process.cwd(), '..', 'sections');
    let sectionDir = path.join(sectionsDir, sectionId);
    
    try {
      await fs.access(sectionDir);
    } catch (e) {
      // Try direct path from root
      sectionsDir = path.join(process.cwd(), 'sections');
      sectionDir = path.join(sectionsDir, sectionId);
      
      try {
        await fs.access(sectionDir);
      } catch (e) {
        // Section directory not found
        return json({ error: "Section not found" }, { status: 404 });
      }
    }
    
    // Update the section metadata
    const metadata = {
      title: section.title,
      description: section.description,
      categories: section.categories,
      price: section.price || 'Free',
      lastUpdated: new Date().toISOString()
    };
    
    await fs.writeFile(
      path.join(sectionDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    // Update the public preview metadata as well (for display in the app)
    const previewsDir = path.join(process.cwd(), 'public', 'section-previews', sectionId);
    try {
      await fs.access(previewsDir);
      // If the directory exists, update metadata there too
      await fs.writeFile(
        path.join(previewsDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
    } catch (e) {
      // Preview directory doesn't exist, that's okay
      console.log(`Preview directory doesn't exist for ${sectionId}, skipping metadata update there`);
    }
    
    return json({ 
      success: true, 
      message: `Section ${section.title} updated successfully` 
    });
  } catch (error: any) {
    console.error("Error updating section:", error);
    return json({ 
      error: error.message || "An unexpected error occurred" 
    }, { status: 500 });
  }
}

async function handleDeleteSection(request: Request, sectionId: string) {
  try {
    const data = await request.json();
    const { adminToken } = data;
    
    // Verify admin token
    if (!adminToken || adminToken !== ADMIN_PASSWORD) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Find the section directory
    let sectionsDir = path.join(process.cwd(), '..', 'sections');
    let sectionDir = path.join(sectionsDir, sectionId);
    
    try {
      await fs.access(sectionDir);
    } catch (e) {
      // Try direct path from root
      sectionsDir = path.join(process.cwd(), 'sections');
      sectionDir = path.join(sectionsDir, sectionId);
      
      try {
        await fs.access(sectionDir);
      } catch (e) {
        // Section directory not found
        return json({ error: "Section not found" }, { status: 404 });
      }
    }
    
    // Delete the section directory recursively
    await fs.rm(sectionDir, { recursive: true, force: true });
    
    // Also delete the public preview directory if it exists
    const previewsDir = path.join(process.cwd(), 'public', 'section-previews', sectionId);
    try {
      await fs.access(previewsDir);
      await fs.rm(previewsDir, { recursive: true, force: true });
    } catch (e) {
      // Preview directory doesn't exist, that's okay
      console.log(`Preview directory doesn't exist for ${sectionId}, skipping deletion`);
    }
    
    return json({ 
      success: true, 
      message: `Section ${sectionId} deleted successfully` 
    });
  } catch (error: any) {
    console.error("Error deleting section:", error);
    return json({ 
      error: error.message || "An unexpected error occurred" 
    }, { status: 500 });
  }
}

// For completeness, add loader to get section details
export const loader: LoaderFunction = async ({ params, request }) => {
  const sectionId = params.sectionId;
  
  if (!sectionId) {
    return json({ error: "Section ID is required" }, { status: 400 });
  }
  
  try {
    // Find the section directory
    let sectionsDir = path.join(process.cwd(), '..', 'sections');
    let sectionDir = path.join(sectionsDir, sectionId);
    
    try {
      await fs.access(sectionDir);
    } catch (e) {
      // Try direct path from root
      sectionsDir = path.join(process.cwd(), 'sections');
      sectionDir = path.join(sectionsDir, sectionId);
      
      try {
        await fs.access(sectionDir);
      } catch (e) {
        // Section directory not found
        return json({ error: "Section not found" }, { status: 404 });
      }
    }
    
    // Read the section metadata
    const metadataPath = path.join(sectionDir, 'metadata.json');
    let metadata = {};
    
    try {
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      metadata = JSON.parse(metadataContent);
    } catch (e) {
      // Metadata file doesn't exist or is invalid JSON
      console.log(`Metadata file not found or invalid for ${sectionId}`);
    }
    
    // Read the section content
    const sectionPath = path.join(sectionDir, 'section.liquid');
    const sectionContent = await fs.readFile(sectionPath, 'utf8');
    
    // Check for additional files
    const hasCSS = await fileExists(path.join(sectionDir, 'style.css'));
    const hasJS = await fileExists(path.join(sectionDir, 'script.js'));
    const hasSchema = await fileExists(path.join(sectionDir, 'schema.json'));
    
    // Find preview image if any
    const files = await fs.readdir(sectionDir);
    const previewFile = files.find(file => file.startsWith('preview.'));
    
    const previewUrl = previewFile 
      ? `/section-previews/${sectionId}/${previewFile}`
      : null;
    
    return json({
      id: sectionId,
      content: sectionContent,
      hasCSS,
      hasJS,
      hasSchema,
      previewUrl,
      ...metadata
    });
  } catch (error: any) {
    console.error("Error fetching section:", error);
    return json({ 
      error: error.message || "An unexpected error occurred" 
    }, { status: 500 });
  }
};

// Helper function to check if a file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch (e) {
    return false;
  }
}

// Add default export for Remix route
export default function SectionRoute() {
  return null;
} 