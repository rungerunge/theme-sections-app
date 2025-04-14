require('dotenv').config();
const express = require('express');
const { Shopify } = require('@shopify/shopify-api');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Shopify
Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_API_KEY,
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
  SCOPES: ['read_themes', 'write_themes'],
  HOST_NAME: process.env.HOST.replace(/https?:\/\//, ''),
  HOST_SCHEME: process.env.HOST.split('://')[0],
  IS_EMBEDDED_APP: true,
  API_VERSION: '2024-01' // Use the latest stable API version
});

app.use(express.json());

// Endpoint to install a section
app.post('/api/sections/:sectionId/install', async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { shop, accessToken } = req.body;

    // Create a new client for the shop
    const client = new Shopify.Clients.Rest(shop, accessToken);

    // Read the section file
    const sectionContent = await fs.readFile(
      path.join(__dirname, '..', 'sections', sectionId, 'section.liquid'),
      'utf8'
    );

    // Get the active theme ID
    const { body: { themes } } = await client.get({
      path: 'themes',
    });
    
    const activeTheme = themes.find(theme => theme.role === 'main');

    if (!activeTheme) {
      throw new Error('No active theme found');
    }

    // Add the section to the theme
    await client.put({
      path: `themes/${activeTheme.id}/assets`,
      data: {
        asset: {
          key: `sections/${sectionId}.liquid`,
          value: sectionContent
        }
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error installing section:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 