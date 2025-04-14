import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { promises as fs } from "fs";
import path from "path";

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  
  try {
    const formData = await request.json();
    const { sectionId } = formData;
    
    if (!sectionId) {
      return json({ error: "Section ID is required" }, { status: 400 });
    }
    
    // Read the section content from file
    const sectionPath = path.join(process.cwd(), "sections", sectionId, "section.liquid");
    const sectionContent = await fs.readFile(sectionPath, "utf8");
    
    // Get the active theme
    const themes = await admin.rest.resources.Theme.all({
      session: admin.session,
    });
    
    const activeTheme = themes.data.find(theme => theme.role === "main");
    
    if (!activeTheme) {
      return json({ error: "No active theme found" }, { status: 404 });
    }
    
    // Add the section to the theme
    await admin.rest.resources.Asset.create({
      session: admin.session,
      theme_id: activeTheme.id,
      asset: {
        key: `sections/${sectionId}.liquid`,
        value: sectionContent
      },
    });
    
    return json({ success: true, message: `Section ${sectionId} installed successfully` });
  } catch (error) {
    console.error("Section installation error:", error);
    return json({ error: error.message || "Failed to install section" }, { status: 500 });
  }
}; 