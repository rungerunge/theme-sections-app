import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import fs from "fs/promises";
import path from "path";

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { sectionId, title } = await request.json();
    
    if (!sectionId) {
      return json({ error: "Missing section ID" }, { status: 400 });
    }

    // Create a simple SVG placeholder
    const sectionTitle = title || sectionId.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    const svgTemplate = `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="800" height="600" fill="#f8f8f8"/>
        <rect x="50" y="50" width="700" height="500" rx="10" fill="#ffffff" stroke="#e0e0e0" stroke-width="2"/>
        <text x="400" y="150" font-family="Arial, sans-serif" font-size="32" font-weight="bold" text-anchor="middle" fill="#333333">${sectionTitle}</text>
        <text x="400" y="300" font-family="Arial, sans-serif" font-size="18" text-anchor="middle" fill="#666666">Preview coming soon</text>
      </svg>
    `;
    
    // Convert SVG to base64
    const base64Data = Buffer.from(svgTemplate).toString('base64');
    
    // Ensure section directory exists
    const sectionDir = path.resolve(process.cwd(), "..", "sections", sectionId);
    try {
      await fs.access(sectionDir);
    } catch (error) {
      await fs.mkdir(sectionDir, { recursive: true });
    }
    
    // Check if preview already exists
    const previewPath = path.join(sectionDir, "preview.png");
    try {
      await fs.access(previewPath);
      return json({ success: true, message: "Preview already exists", exists: true });
    } catch (error) {
      // Write placeholder SVG as preview
      await fs.writeFile(previewPath, svgTemplate);
      
      return json({ 
        success: true, 
        message: "Placeholder preview generated", 
        base64: `data:image/svg+xml;base64,${base64Data}`
      });
    }
  } catch (error) {
    console.error("Error generating placeholder image:", error);
    return json({ error: error.message || "Failed to generate placeholder image" }, { status: 500 });
  }
} 