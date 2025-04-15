import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";
import shopify from "./shopify.js";
import GDPRWebhookHandlers from "./gdpr.js";
import { Shopify } from "@shopify/shopify-api";
import { ApiVersion } from "@shopify/shopify-api";

const PORT = parseInt(process.env.PORT || "8081", 10);
const isTest = process.env.NODE_ENV === "test" || !!process.env.VITE_TEST_BUILD;

const app = express();

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: GDPRWebhookHandlers })
);

// All endpoints after this point will require authentication
app.use("/api/*", shopify.validateAuthenticatedSession());

// Section installation API endpoint
app.post("/api/sections/install", async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const { shop } = session;
    const { sectionId, themeId } = req.body;
    
    if (!sectionId) {
      return res.status(400).json({ error: 'Section ID is required' });
    }
    
    // Get section content from the sections directory
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const sectionPath = path.join(process.cwd(), 'sections', sectionId, 'section.liquid');
    
    let sectionContent;
    try {
      sectionContent = await fs.readFile(sectionPath, 'utf8');
      console.log(`Section file found for ${sectionId}`);
    } catch (error) {
      console.log(`Section file not found at ${sectionPath}`);
      
      // List available sections
      try {
        const sectionsDir = path.join(process.cwd(), 'sections');
        const availableSections = await fs.readdir(sectionsDir);
        console.log('Available sections:', availableSections);
        
        return res.status(404).json({ 
          error: 'Section not found',
          availableSections 
        });
      } catch (dirError) {
        return res.status(404).json({ 
          error: 'Section not found and sections directory could not be read',
          message: dirError.message
        });
      }
    }
    
    // Get theme (either the specified theme or fetch active theme)
    let selectedThemeId = themeId;
    let themeName = null;
    
    const client = new Shopify.Clients.Rest(shop, session.accessToken);
    
    if (!selectedThemeId) {
      // Get active theme
      const themesResponse = await client.get({
        path: 'themes',
      });
      
      const themes = themesResponse.body.themes;
      const activeTheme = themes.find(theme => theme.role === 'main');
      
      if (!activeTheme) {
        return res.status(404).json({ error: 'No active theme found' });
      }
      
      selectedThemeId = activeTheme.id;
      themeName = activeTheme.name;
      console.log('Active theme found:', selectedThemeId, themeName);
    } else {
      // Get theme name if possible
      try {
        const themeResponse = await client.get({
          path: `themes/${selectedThemeId}`,
        });
        
        themeName = themeResponse.body.theme.name;
      } catch (error) {
        // If we can't get the theme name, use a default
        themeName = "Selected Theme";
        console.log('Could not fetch theme name:', error.message);
      }
    }
    
    // Add the section to the theme
    const assetResponse = await client.put({
      path: `themes/${selectedThemeId}/assets`,
      data: {
        asset: {
          key: `sections/${sectionId}.liquid`,
          value: sectionContent
        }
      },
    });
    
    console.log('Section successfully installed');
    
    return res.status(200).json({
      success: true,
      message: 'Section successfully installed to theme',
      sectionId,
      themeId: selectedThemeId,
      themeName: themeName || "Unknown Theme",
      asset: assetResponse.body.asset,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in section install endpoint:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
});

// API endpoint to get themes
app.get("/api/themes", async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const { shop } = session;
    
    const client = new Shopify.Clients.Rest(shop, session.accessToken);
    
    // Get themes from Shopify
    const themesResponse = await client.get({
      path: 'themes',
    });
    
    return res.status(200).json({
      success: true,
      themes: themesResponse.body.themes
    });
  } catch (error) {
    console.error('Error in get themes endpoint:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
});

app.use(serveStatic(join(process.cwd(), "public")));
app.use(express.json());

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(readFileSync(join(process.cwd(), "index.html")));
});

app.listen(PORT); 