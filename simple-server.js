const express = require('express');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Create Express app
const app = express();

// Add CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Parse JSON requests
app.use(express.json());
// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// Shopify API credentials
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || 'your_api_key';
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || 'your_api_secret';
const HOST = process.env.HOST || 'https://theme-sections-app-chjk.onrender.com';
const SCOPES = process.env.SCOPES || 'read_themes,write_themes,write_products,write_customers,write_draft_orders,write_content';

// Private app credentials - store tokens securely
const PRIVATE_APP_TOKENS = {
  // Format: 'shop-name.myshopify.com': 'access_token'
  'okayscaledemo.myshopify.com': process.env.OKAYSCALE_DEMO_TOKEN || 'your_token_here',
  // Add more stores and their tokens as needed
};

// Log server start
console.log('Starting simple Express server...');
console.log('Current working directory:', process.cwd());
console.log('Directory contents:', fs.readdirSync(process.cwd()));

// Add direct route to the app
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'public', 'app.html'));
});

// Serve static files
app.use('/section-previews', express.static(path.join(__dirname, 'web', 'public', 'section-previews')));
app.use('/public', express.static(path.join(__dirname, 'web', 'public')));
app.use('/assets', express.static(path.join(__dirname, 'web', 'public')));
app.use('/web/public', express.static(path.join(__dirname, 'web', 'public')));

// Root endpoint
app.get('/', (req, res) => {
  // Redirect directly to the app.html page
  return res.redirect('/web/public/app.html');
});

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.2',
    server: 'simple-express'
  });
});

// API endpoint for connecting to a store
app.get('/api/connect-store', (req, res) => {
  const { shop } = req.query;
  
  if (!shop) {
    return res.status(400).json({ error: 'Shop parameter is required' });
  }
  
  // Check if we have a token for this shop
  if (!PRIVATE_APP_TOKENS[shop]) {
    return res.status(404).json({ 
      error: 'Store not found in authorized list',
      message: 'This store is not authorized to use this app. Please contact support to add your store.'
    });
  }
  
  // Return success with shop info
  return res.status(200).json({
    success: true,
    shop,
    message: 'Successfully connected to store'
  });
});

// API endpoint for loading themes
app.get('/api/themes', async (req, res) => {
  const { shop } = req.query;
  
  if (!shop) {
    return res.status(400).json({ error: 'Shop parameter is required' });
  }
  
  // Get the access token for this shop
  const accessToken = PRIVATE_APP_TOKENS[shop];
  if (!accessToken) {
    return res.status(404).json({ error: 'Store not authorized' });
  }
  
  try {
    // Get themes from Shopify
    const themesResponse = await axios.get(`https://${shop}/admin/api/2024-01/themes.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    
    return res.status(200).json({
      success: true,
      themes: themesResponse.data.themes
    });
  } catch (error) {
    console.error('Error fetching themes:', error.message);
    return res.status(500).json({
      error: 'Error fetching themes',
      message: error.message
    });
  }
});

// API endpoint for section installation
app.post('/api/sections/install', async (req, res) => {
  try {
    console.log('Received request to /api/sections/install with body:', req.body);
    const { sectionId, shop, themeId } = req.body;
    
    if (!sectionId) {
      return res.status(400).json({ error: 'Section ID is required' });
    }

    if (!shop) {
      return res.status(400).json({ error: 'Shop parameter is required' });
    }

    // Get the access token for this shop from our private tokens
    const accessToken = PRIVATE_APP_TOKENS[shop];
    if (!accessToken) {
      return res.status(404).json({ error: 'Store not authorized' });
    }
    
    console.log(`Processing installation for shop: ${shop}, section: ${sectionId}, themeId: ${themeId}`);
    
    // Try to read the section file if it exists
    let sectionContent = null;
    const sectionPath = path.join(process.cwd(), 'sections', sectionId, 'section.liquid');
    
    if (fs.existsSync(sectionPath)) {
      sectionContent = fs.readFileSync(sectionPath, 'utf8');
      console.log(`Section file found for ${sectionId}`);
    } else {
      console.log(`Section file not found at ${sectionPath}`);
      
      // List available sections
      const sectionsDir = path.join(process.cwd(), 'sections');
      if (fs.existsSync(sectionsDir)) {
        console.log('Available sections:', fs.readdirSync(sectionsDir));
      }
      
      return res.status(404).json({ 
        error: 'Section not found',
        availableSections: fs.existsSync(sectionsDir) ? fs.readdirSync(sectionsDir) : [] 
      });
    }
    
    try {
      // Get theme (either the specified theme or fetch active theme)
      let selectedThemeId = themeId;
      let themeName = null;
      
      if (!selectedThemeId) {
        console.log('No theme ID provided, fetching active theme');
        // Get active theme
        const themesResponse = await axios.get(`https://${shop}/admin/api/2024-01/themes.json`, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          }
        });
        
        const themes = themesResponse.data.themes;
        const activeTheme = themes.find(theme => theme.role === 'main');
        
        if (!activeTheme) {
          return res.status(404).json({ error: 'No active theme found' });
        }
        
        selectedThemeId = activeTheme.id;
        themeName = activeTheme.name;
        console.log('Active theme found:', selectedThemeId, themeName);
      } else {
        // Use provided theme ID
        console.log('Using provided theme ID:', selectedThemeId);
        
        // Get theme name if possible
        try {
          const themeResponse = await axios.get(`https://${shop}/admin/api/2024-01/themes/${selectedThemeId}.json`, {
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json'
            }
          });
          
          themeName = themeResponse.data.theme.name;
        } catch (error) {
          // If we can't get the theme name, use a default
          themeName = "Selected Theme";
          console.log('Could not fetch theme name:', error.message);
        }
      }
      
      // Add the section to the theme
      const assetResponse = await axios.put(
        `https://${shop}/admin/api/2024-01/themes/${selectedThemeId}/assets.json`,
        {
          asset: {
            key: `sections/${sectionId}.liquid`,
            value: sectionContent
          }
        },
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Section successfully installed');
      
      return res.status(200).json({
        success: true,
        message: 'Section successfully installed to theme',
        sectionId,
        themeId: selectedThemeId,
        themeName: themeName || "Unknown Theme",
        asset: assetResponse.data.asset,
        timestamp: new Date().toISOString()
      });
    } catch (apiError) {
      console.error('Shopify API Error:', apiError.message);
      if (apiError.response) {
        console.error('API Response:', apiError.response.data);
      }
      
      return res.status(500).json({
        error: 'Shopify API Error',
        message: apiError.message,
        details: apiError.response ? apiError.response.data : null
      });
    }
  } catch (error) {
    console.error('Error in section install endpoint:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
});

// Add a route for initiating Shopify OAuth
app.get('/auth', (req, res) => {
  const { shop } = req.query;
  
  if (!shop) {
    return res.status(400).send('Missing shop parameter. Please add ?shop=your-shop.myshopify.com to the URL.');
  }
  
  // Construct the authorization URL
  const redirectUri = `${HOST}/auth/callback`;
  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${SCOPES}&redirect_uri=${redirectUri}`;
  
  res.redirect(installUrl);
});

// Handle the OAuth callback from Shopify
app.get('/auth/callback', async (req, res) => {
  const { shop, hmac, code, state } = req.query;
  
  if (!shop || !code) {
    return res.status(400).send('Required parameters missing');
  }
  
  try {
    // Exchange the temporary code for a permanent access token
    const response = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code
    });
    
    const accessToken = response.data.access_token;
    
    // For demo purposes, we're storing the token for the shop
    // In a real app, you'd save this to a database
    PRIVATE_APP_TOKENS[shop] = accessToken;
    console.log(`Stored access token for ${shop}`);
    
    // Redirect to the app
    res.redirect(`/web/public/app.html?shop=${shop}`);
  } catch (error) {
    console.error('Error completing OAuth:', error);
    res.status(500).send('Error completing OAuth flow');
  }
});

// Serve todo preview page
app.get('/preview/todo-list', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'public', 'todo-preview.html'));
});

// Serve section preview images
app.get('/section-preview/:sectionId', (req, res) => {
  const sectionId = req.params.sectionId;
  const previewPath = path.join(__dirname, 'sections', sectionId, 'preview.png');
  
  // Check if file exists
  if (fs.existsSync(previewPath)) {
    res.sendFile(previewPath);
  } else {
    // Generate simple SVG as placeholder
    const sectionTitle = sectionId.split('-').map(word => 
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
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svgTemplate);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Simple Express server running on port ${port}`);
}); 