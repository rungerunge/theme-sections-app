const express = require('express');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Create Express app
const app = express();

// Define logging
function logMessage(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logPrefix = isError ? '[ERROR]' : '[INFO]';
  console.log(`${timestamp} ${logPrefix} ${message}`);
}

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
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || 'cf5df4d826a3faea551a29eec40ad090';
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || 'a750fba3926ae2137fdac14dff34631c';
const HOST = process.env.HOST || 'https://theme-sections-app-chjk.onrender.com';
const SCOPES = process.env.SCOPES || 'read_themes,write_themes,read_files,write_files,read_content,write_content,read_products,write_products,read_script_tags,write_script_tags';

// Private app credentials - store tokens securely
const PRIVATE_APP_TOKENS = {
  // Format: 'shop-name.myshopify.com': 'access_token'
  'okayscaledemo.myshopify.com': process.env.OKAYSCALE_DEMO_TOKEN || '',
  // Add more stores and their tokens as needed
};

// Log server start
logMessage('Starting Express server...');
logMessage('Current working directory: ' + process.cwd());

try {
  logMessage('Directory contents: ' + fs.readdirSync(process.cwd()).join(', '));
} catch (error) {
  logMessage('Error reading directory: ' + error.message, true);
}

// Check if directories exist and create them if needed
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    logMessage(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Ensure essential directories exist
const webPublicDir = path.join(__dirname, 'web', 'public');
const sectionPreviewsDir = path.join(webPublicDir, 'section-previews');
const sectionsDir = path.join(__dirname, 'sections');

ensureDir(webPublicDir);
ensureDir(sectionPreviewsDir);
ensureDir(sectionsDir);

// Serve static files
app.use('/section-previews', express.static(path.join(__dirname, 'web', 'public', 'section-previews')));
app.use('/public', express.static(path.join(__dirname, 'web', 'public')));
app.use('/assets', express.static(path.join(__dirname, 'web', 'public')));
app.use('/web/public', express.static(path.join(__dirname, 'web', 'public')));

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.3',
    server: 'simple-express'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  logMessage('Received request to root endpoint');
  const appHtmlPath = path.join(__dirname, 'web', 'public', 'app.html');
  
  if (fs.existsSync(appHtmlPath)) {
    logMessage('Serving app.html');
    return res.sendFile(appHtmlPath);
  } else {
    logMessage('app.html not found at ' + appHtmlPath, true);
    return res.status(404).send('App HTML file not found. Please check server configuration.');
  }
});

// Direct route to the app
app.get('/app', (req, res) => {
  logMessage('Received request to /app endpoint');
  const appHtmlPath = path.join(__dirname, 'web', 'public', 'app.html');
  
  if (fs.existsSync(appHtmlPath)) {
    logMessage('Serving app.html');
    return res.sendFile(appHtmlPath);
  } else {
    logMessage('app.html not found at ' + appHtmlPath, true);
    return res.status(404).send('App HTML file not found. Please check server configuration.');
  }
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
    logMessage(`No access token found for shop: ${shop}`, true);
    return res.status(404).json({ 
      error: 'Store not authorized',
      message: 'This store is not authorized. Please check env variables.' 
    });
  }
  
  try {
    logMessage(`Fetching themes for shop: ${shop}`);
    logMessage(`Using access token: ${accessToken ? 'Valid token' : 'No token available'}`);
    
    // Get themes from Shopify
    const themesResponse = await axios.get(`https://${shop}/admin/api/2024-01/themes.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    
    logMessage(`Successfully fetched ${themesResponse.data.themes.length} themes`);
    
    return res.status(200).json({
      success: true,
      themes: themesResponse.data.themes
    });
  } catch (error) {
    logMessage(`Error fetching themes: ${error.message}`, true);
    if (error.response) {
      logMessage(`API response: ${JSON.stringify(error.response.data)}`, true);
      return res.status(error.response.status).json({
        error: 'Error fetching themes',
        message: error.response.data.errors || error.message,
        details: error.response.data
      });
    }
    
    return res.status(500).json({
      error: 'Error fetching themes',
      message: error.message
    });
  }
});

// API endpoint for section installation
app.post('/api/sections/install', async (req, res) => {
  try {
    logMessage('Received request to /api/sections/install with body: ' + JSON.stringify(req.body));
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
      return res.status(404).json({ 
        error: 'Store not authorized',
        message: 'Please connect your store first by clicking "Connect" on the pre-configured store or installing the app via the Shopify App Store.'
      });
    }
    
    logMessage(`Processing installation for shop: ${shop}, section: ${sectionId}, themeId: ${themeId}`);
    
    // Try to read the section file if it exists
    let sectionContent = null;
    const sectionPath = path.join(process.cwd(), 'sections', sectionId, 'section.liquid');
    
    if (fs.existsSync(sectionPath)) {
      sectionContent = fs.readFileSync(sectionPath, 'utf8');
      logMessage(`Section file found for ${sectionId}`);
    } else {
      logMessage(`Section file not found at ${sectionPath}`, true);
      
      // List available sections
      const sectionsDir = path.join(process.cwd(), 'sections');
      if (fs.existsSync(sectionsDir)) {
        const availableSections = fs.readdirSync(sectionsDir);
        logMessage('Available sections: ' + availableSections.join(', '));
        
        // Try to find the section file with a different structure
        let alternativePath = null;
        
        for (const section of availableSections) {
          const potentialPath = path.join(sectionsDir, section, 'section.liquid');
          if (fs.existsSync(potentialPath)) {
            logMessage(`Found alternative section file at ${potentialPath}`);
            alternativePath = potentialPath;
            break;
          }
        }
        
        if (alternativePath) {
          sectionContent = fs.readFileSync(alternativePath, 'utf8');
        } else {
          return res.status(404).json({ 
            error: 'Section not found',
            message: 'The specified section could not be found. Please check the section ID and try again.',
            availableSections
          });
        }
      } else {
        return res.status(404).json({ 
          error: 'Sections directory not found',
          message: 'The sections directory could not be found. Please check your app configuration.'
        });
      }
    }
    
    try {
      // Get theme (either the specified theme or fetch active theme)
      let selectedThemeId = themeId;
      let themeName = null;
      
      if (!selectedThemeId) {
        logMessage('No theme ID provided, fetching active theme');
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
        logMessage('Active theme found: ' + selectedThemeId + ', ' + themeName);
      } else {
        // Use provided theme ID
        logMessage('Using provided theme ID: ' + selectedThemeId);
        
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
          logMessage('Could not fetch theme name: ' + error.message, true);
        }
      }
      
      // Add the section to the theme
      logMessage('Adding section to theme...');
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
      
      logMessage('Section successfully installed');
      
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
      logMessage('Shopify API Error: ' + apiError.message, true);
      if (apiError.response) {
        logMessage('API Response: ' + JSON.stringify(apiError.response.data), true);
      }
      
      return res.status(500).json({
        error: 'Shopify API Error',
        message: apiError.message,
        details: apiError.response ? apiError.response.data : null
      });
    }
  } catch (error) {
    logMessage('Error in section install endpoint: ' + error.message, true);
    logMessage(error.stack || 'No stack trace available', true);
    
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
  
  logMessage(`Initiating OAuth for shop: ${shop}`);
  
  // Construct the authorization URL
  const redirectUri = `${HOST}/auth/callback`;
  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${SCOPES}&redirect_uri=${redirectUri}`;
  
  logMessage(`Redirecting to: ${installUrl}`);
  res.redirect(installUrl);
});

// Handle the OAuth callback from Shopify
app.get('/auth/callback', async (req, res) => {
  const { shop, hmac, code, state } = req.query;
  
  logMessage(`Received OAuth callback for shop: ${shop}`);
  
  if (!shop || !code) {
    logMessage('Missing required OAuth parameters', true);
    return res.status(400).send('Required parameters missing');
  }
  
  try {
    logMessage(`Exchanging temporary code for permanent token for shop: ${shop}`);
    
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
    logMessage(`Successfully stored access token for ${shop}`);
    
    // Redirect to the app
    res.redirect(`/web/public/app.html?shop=${shop}`);
  } catch (error) {
    logMessage(`Error completing OAuth: ${error.message}`, true);
    if (error.response) {
      logMessage(`OAuth error response: ${JSON.stringify(error.response.data)}`, true);
    }
    res.status(500).send('Error completing OAuth flow. Please check server logs.');
  }
});

// Serve section preview images
app.get('/section-preview/:sectionId', (req, res) => {
  const sectionId = req.params.sectionId;
  logMessage(`Serving preview for section: ${sectionId}`);
  
  // First check if an SVG exists in the web/public/section-previews directory
  const svgPreviewPath = path.join(__dirname, 'web', 'public', 'section-previews', `${sectionId}.svg`);
  const pngPreviewPath = path.join(__dirname, 'sections', sectionId, 'preview.png');
  
  if (fs.existsSync(svgPreviewPath)) {
    logMessage(`Found SVG preview at ${svgPreviewPath}`);
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.sendFile(svgPreviewPath);
  } else if (fs.existsSync(pngPreviewPath)) {
    logMessage(`Found PNG preview at ${pngPreviewPath}`);
    return res.sendFile(pngPreviewPath);
  } else {
    // Generate simple SVG as placeholder
    logMessage(`No preview found for ${sectionId}, generating placeholder`);
    
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

// Error handling middleware
app.use((err, req, res, next) => {
  logMessage(`Unhandled error: ${err.message}`, true);
  logMessage(err.stack, true);
  
  res.status(500).json({
    error: 'Server error',
    message: 'An unexpected error occurred'
  });
});

// Start the server
const port = process.env.PORT || 3001;
const server = app.listen(port, '0.0.0.0', () => {
  logMessage(`Express server running on port ${port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logMessage('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logMessage('HTTP server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logMessage(`Unhandled Rejection at: ${promise}, reason: ${reason}`, true);
});

process.on('uncaughtException', (error) => {
  logMessage(`Uncaught Exception: ${error.message}`, true);
  logMessage(error.stack, true);
  
  // Only exit for truly fatal errors
  if (error.fatal) {
    process.exit(1);
  }
}); 