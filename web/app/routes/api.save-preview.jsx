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
    const { imageData, sectionId } = await request.json();
    
    if (!imageData || !sectionId) {
      return json({ error: "Missing required fields" }, { status: 400 });
    }

    // Remove header from data URL
    const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
    
    // Ensure section directory exists
    const sectionDir = path.resolve(process.cwd(), "..", "sections", sectionId);
    try {
      await fs.access(sectionDir);
    } catch (error) {
      return json({ error: `Section directory not found: ${sectionId}` }, { status: 404 });
    }
    
    // Write the preview image
    const previewPath = path.join(sectionDir, "preview.png");
    await fs.writeFile(previewPath, base64Data, "base64");
    
    return json({ success: true, message: "Preview image saved successfully" });
  } catch (error) {
    console.error("Error saving preview image:", error);
    return json({ error: error.message || "Failed to save preview image" }, { status: 500 });
  }
} 