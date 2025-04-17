import { json, ActionFunction } from "@remix-run/node";
import fs from 'fs/promises';
import path from 'path';
import { authenticate } from "../shopify.server";

// Simple in-memory auth check - must match the admin dashboard password
const ADMIN_PASSWORD = "okayscale"; // Change this to match admin.tsx

export const action: ActionFunction = async ({ request }) => {
  try {
    // Parse the form data
    const formData = await request.formData();
    const adminToken = formData.get('adminToken') as string;
    
    // Verify admin token
    if (!adminToken || adminToken !== ADMIN_PASSWORD) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Extract form data
    const sectionId = formData.get('sectionId') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const categories = formData.get('categories') as string;
    const price = formData.get('price') as string;
    
    // Extract files
    const sectionFile = formData.get('sectionFile') as File;
    const previewFile = formData.get('previewFile') as File;
    const schemaFile = formData.get('schemaFile') as File;
    const cssFile = formData.get('cssFile') as File;
    const jsFile = formData.get('jsFile') as File;
    
    // Validate required fields
    if (!sectionId || !title || !description || !categories) {
      return json({ error: "Missing required fields" }, { status: 400 });
    }
    
    if (!sectionFile || sectionFile.size === 0) {
      return json({ error: "Section file is required" }, { status: 400 });
    }
    
    // Normalize the section ID
    const safeId = sectionId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    // Get categories as an array
    const categoriesArray = categories.split(',').map(cat => cat.trim());
    
    // Define the section directory path
    let sectionsDir = path.join(process.cwd(), '..', 'sections');
    
    // Check if the sections directory exists, if not, try alternate paths
    try {
      await fs.access(sectionsDir);
    } catch (e) {
      // Try direct path from root
      sectionsDir = path.join(process.cwd(), 'sections');
      
      try {
        await fs.access(sectionsDir);
      } catch (e) {
        // Create the sections directory if it doesn't exist
        await fs.mkdir(sectionsDir, { recursive: true });
      }
    }
    
    console.log(`Using sections directory: ${sectionsDir}`);
    
    // Create section directory
    const sectionDir = path.join(sectionsDir, safeId);
    await fs.mkdir(sectionDir, { recursive: true });
    
    // Write section.liquid file
    const sectionContent = await sectionFile.text();
    await fs.writeFile(
      path.join(sectionDir, 'section.liquid'),
      sectionContent
    );
    
    // Create section metadata file
    const metadata = {
      title,
      description,
      categories: categoriesArray,
      price: price || 'Free',
      lastUpdated: new Date().toISOString()
    };
    
    await fs.writeFile(
      path.join(sectionDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    // Handle optional files
    if (previewFile && previewFile.size > 0) {
      const previewContent = await previewFile.arrayBuffer();
      await fs.writeFile(
        path.join(sectionDir, 'preview.' + getFileExtension(previewFile.name)),
        Buffer.from(previewContent)
      );
    }
    
    if (schemaFile && schemaFile.size > 0) {
      const schemaContent = await schemaFile.text();
      await fs.writeFile(
        path.join(sectionDir, 'schema.json'),
        schemaContent
      );
    }
    
    if (cssFile && cssFile.size > 0) {
      const cssContent = await cssFile.text();
      await fs.writeFile(
        path.join(sectionDir, 'style.css'),
        cssContent
      );
    }
    
    if (jsFile && jsFile.size > 0) {
      const jsContent = await jsFile.text();
      await fs.writeFile(
        path.join(sectionDir, 'script.js'),
        jsContent
      );
    }
    
    // Create a public preview directory if it doesn't exist yet
    const previewsDir = path.join(process.cwd(), 'public', 'section-previews', safeId);
    await fs.mkdir(previewsDir, { recursive: true });
    
    // If preview file was uploaded, copy it to the public directory
    if (previewFile && previewFile.size > 0) {
      const previewContent = await previewFile.arrayBuffer();
      await fs.writeFile(
        path.join(previewsDir, 'preview.' + getFileExtension(previewFile.name)),
        Buffer.from(previewContent)
      );
    }
    
    return json({ 
      success: true, 
      sectionId: safeId,
      message: `Section ${title} uploaded successfully`
    });
  } catch (error: any) {
    console.error("Error uploading section:", error);
    return json({ 
      error: error.message || "An unexpected error occurred" 
    }, { status: 500 });
  }
};

// Helper function to get file extension
function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

// Add default export for Remix route
export default function UploadSection() {
  return null;
} 