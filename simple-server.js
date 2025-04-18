const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const fileUpload = require('express-fileupload');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  createParentPath: true
}));

// Define logging
function logMessage(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logPrefix = isError ? '[ERROR]' : '[INFO]';
  console.log(`${timestamp} ${logPrefix} ${message}`);
}

// Shopify API credentials
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
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
const dataDir = path.join(__dirname, 'data');
const dataSectionsDir = path.join(dataDir, 'sections');

ensureDir(webPublicDir);
ensureDir(sectionPreviewsDir);
ensureDir(sectionsDir);
ensureDir(dataDir);
ensureDir(dataSectionsDir);

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

// Add a new route for the special installer
app.get('/install-with-scopes', (req, res) => {
  logMessage('Serving special installation page');
  res.sendFile(path.join(__dirname, 'web', 'public', 'install-with-scopes.html'));
});

// Original install route
app.get('/install', (req, res) => {
  logMessage('Serving installation page');
  res.sendFile(path.join(__dirname, 'web', 'public', 'install.html'));
});

// Root endpoint
app.get('/', (req, res) => {
  logMessage('Received request to root endpoint');
  
  // Check if shop parameter is provided
  const shop = req.query.shop;
  if (!shop) {
    logMessage('No shop parameter provided, serving installation page');
    const installHtmlPath = path.join(__dirname, 'web', 'public', 'install.html');
    
    if (fs.existsSync(installHtmlPath)) {
      return res.sendFile(installHtmlPath);
    } else {
      return res.redirect('/auth?shop=' + req.query.shop);
    }
  }

  // Check if the shop has a valid token
  const accessToken = PRIVATE_APP_TOKENS[shop];
  if (!accessToken) {
    logMessage(`No token found for shop: ${shop}, redirecting to auth`);
    // Redirect to auth
    return res.redirect(`/auth?shop=${shop}`);
  }
  
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
  
  // Check if shop parameter is provided
  const shop = req.query.shop;
  if (!shop) {
    return res.status(400).send('Shop parameter is required. Please add ?shop=your-shop.myshopify.com to the URL.');
  }

  // Check if the shop has a valid token
  const accessToken = PRIVATE_APP_TOKENS[shop];
  if (!accessToken) {
    logMessage(`No token found for shop: ${shop}, redirecting to auth`);
    // Redirect to auth
    return res.redirect(`/auth?shop=${shop}`);
  }
  
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
      message: 'This store is not authorized. Please check env variables or use the OAuth flow by clicking "Install App on Store".' 
    });
  }
  
  try {
    logMessage(`Fetching themes for shop: ${shop}`);
    logMessage(`Using access token: ${accessToken ? 'Valid token exists' : 'No token available'}`);
    
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

// API endpoint for fetching available sections
app.get('/api/sections', (req, res) => {
  try {
    const sectionsPath = path.join(__dirname, 'sections');
    ensureDir(sectionsPath);

    const sectionDirs = fs.readdirSync(sectionsPath).filter(
      dir => fs.statSync(path.join(sectionsPath, dir)).isDirectory()
    );

    const sections = [];

    for (const sectionDir of sectionDirs) {
      const sectionPath = path.join(sectionsPath, sectionDir);
      
      // Load metadata
      let metadata = {};
      const metaPath = path.join(sectionPath, 'meta.json');
      
      if (fs.existsSync(metaPath)) {
        try {
          metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        } catch (error) {
          logMessage(`Error reading metadata for ${sectionDir}: ${error.message}`, true);
        }
      } else {
        logMessage(`No metadata found for ${sectionDir}`, true);
      }
      
      if (!metadata.id) {
        metadata.id = sectionDir;
      }
      
      if (!metadata.categories) {
        metadata.categories = ['general'];
      }
      
      // Get preview image if it exists
      let previewUrl = null;
      
      // Try with any extension
      const extensions = ['.png', '.jpg', '.jpeg', '.svg', '.gif'];
      for (const ext of extensions) {
        const previewPath = path.join(sectionPath, `preview${ext}`);
        if (fs.existsSync(previewPath)) {
          // Copy to web public dir if it doesn't exist there
          const publicPreviewPath = path.join(__dirname, 'web', 'public', 'section-previews', `${sectionDir}${ext}`);
          ensureDir(path.join(__dirname, 'web', 'public', 'section-previews'));
          
          if (!fs.existsSync(publicPreviewPath)) {
            try {
              fs.copyFileSync(previewPath, publicPreviewPath);
            } catch (copyError) {
              logMessage(`Error copying preview image: ${copyError.message}`, true);
            }
          }
          
          previewUrl = `/section-previews/${sectionDir}${ext}`;
          logMessage(`Using ${ext.toUpperCase()} preview: ${previewUrl}`);
          break;
        }
      }
      
      // If no preview image found, use the default preview endpoint
      if (!previewUrl) {
        previewUrl = `/section-preview/${sectionDir}`;
        logMessage(`Using default preview endpoint: ${previewUrl}`);
      }
      
      sections.push({
        ...metadata,
        id: sectionDir,
        previewUrl: previewUrl,
      });
    }
    
    res.json(sections);
  } catch (error) {
    logMessage(`Error getting sections: ${error.message}`, true);
    res.status(500).json({
      success: false,
      error: 'Error loading sections',
      details: error.message
    });
  }
});

// API endpoint for fetching user's stored sections
app.get('/api/my-sections', (req, res) => {
  // This would normally fetch from a database
  // For now we'll return a sample list
  try {
    logMessage('Received request to /api/my-sections');
    return res.status(200).json([]);
  } catch (error) {
    logMessage(`Error fetching my sections: ${error.message}`, true);
    return res.status(500).json({
      error: 'Server error',
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

// API endpoint for applying a section to a theme
app.post('/api/apply-section', async (req, res) => {
  try {
    logMessage('Received request to /api/apply-section with body: ' + JSON.stringify(req.body));
    const { sectionId, themeId } = req.body;
    
    if (!sectionId) {
      return res.status(400).json({ error: 'Section ID is required' });
    }
    
    if (!themeId) {
      return res.status(400).json({ error: 'Theme ID is required' });
    }
    
    // For now, forward to the existing install endpoint
    // This is a workaround until we can update the frontend to use the proper endpoint
    const shop = req.query.shop || 'okayscaledemo.myshopify.com'; // Use a default shop or query param
    
    // Call the install endpoint directly
    try {
      // Read the section file
      const sectionPath = path.join(process.cwd(), 'sections', sectionId, 'section.liquid');
      let sectionContent = null;
      
      if (fs.existsSync(sectionPath)) {
        sectionContent = fs.readFileSync(sectionPath, 'utf8');
      } else {
        return res.status(404).json({
          error: 'Section not found',
          message: `Could not find section ${sectionId}`
        });
      }
      
      // Get the access token
      const accessToken = PRIVATE_APP_TOKENS[shop];
      if (!accessToken) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'No access token found for shop'
        });
      }
      
      // Get theme name
      let themeName = "Selected Theme";
      try {
        const themeResponse = await axios.get(`https://${shop}/admin/api/2024-01/themes/${themeId}.json`, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          }
        });
        
        themeName = themeResponse.data.theme.name;
      } catch (error) {
        logMessage(`Could not get theme name: ${error.message}`, true);
      }
      
      // Add section to theme
      const assetResponse = await axios.put(
        `https://${shop}/admin/api/2024-01/themes/${themeId}/assets.json`,
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
      
      return res.status(200).json({
        success: true,
        message: 'Section applied to theme',
        themeId,
        themeName,
        sectionId
      });
    } catch (error) {
      logMessage(`Error applying section: ${error.message}`, true);
      return res.status(500).json({
        error: 'Error applying section',
        message: error.message
      });
    }
  } catch (error) {
    logMessage('Error in apply section endpoint: ' + error.message, true);
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
  
  // Define the exact scopes we want to request - use the explicit list rather than env variable
  const requestedScopes = "read_themes,write_themes,read_files,write_files,read_content,write_content,read_products,write_products,read_script_tags,write_script_tags";
  
  logMessage(`Initiating OAuth for shop: ${shop}`);
  logMessage(`Using scopes: ${requestedScopes}`);
  
  // Construct the authorization URL with explicit scopes
  const redirectUri = `${HOST}/auth/callback`;
  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${requestedScopes}&redirect_uri=${redirectUri}`;
  
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
    
    // Redirect to the app with shop parameter
    res.redirect(`/?shop=${shop}`);
  } catch (error) {
    logMessage(`Error completing OAuth: ${error.message}`, true);
    if (error.response) {
      logMessage(`OAuth error response: ${JSON.stringify(error.response.data)}`, true);
    }
    res.status(500).send('Error completing OAuth flow. Please try again or contact support.');
  }
});

// Serve section preview images
app.get('/section-preview/:sectionId', (req, res) => {
  const { sectionId } = req.params;
  logMessage(`Serving preview for section: ${sectionId}`);
  
  // Check for previews in multiple formats
  const formats = [
    { ext: '.png', contentType: 'image/png' },
    { ext: '.jpg', contentType: 'image/jpeg' },
    { ext: '.jpeg', contentType: 'image/jpeg' },
    { ext: '.svg', contentType: 'image/svg+xml' },
    { ext: '.gif', contentType: 'image/gif' }
  ];
  
  // First check in the public directory
  for (const format of formats) {
    const publicPreviewPath = path.join(__dirname, 'web', 'public', 'section-previews', `${sectionId}${format.ext}`);
    if (fs.existsSync(publicPreviewPath)) {
      logMessage(`Found ${format.ext.toUpperCase()} preview in public dir: ${publicPreviewPath}`);
      return res.sendFile(publicPreviewPath);
    }
  }
  
  // Then check in the section directory
  for (const format of formats) {
    const sectionPreviewPath = path.join(__dirname, 'sections', sectionId, `preview${format.ext}`);
    if (fs.existsSync(sectionPreviewPath)) {
      logMessage(`Found ${format.ext.toUpperCase()} preview in section dir: ${sectionPreviewPath}`);
      return res.sendFile(sectionPreviewPath);
    }
  }
  
  // If no preview found, generate a placeholder SVG
  logMessage(`No preview found for ${sectionId}, generating placeholder`);
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(`
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#f8f9fa" />
      <rect x="50" y="50" width="700" height="500" rx="5" ry="5" fill="#ffffff" stroke="#e9ecef" stroke-width="1" />
      
      <text x="400" y="200" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="#212529">${sectionId}</text>
      <text x="400" y="300" font-family="Arial, sans-serif" font-size="18" text-anchor="middle" fill="#666666">Preview coming soon</text>
    </svg>
  `);
});

// Admin route
app.get('/admin', (req, res) => {
  const adminToken = req.query.adminToken;
  
  if (adminToken !== 'okayscale') {
    return res.send(`
      <html>
        <head>
          <title>Admin Login</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        </head>
        <body class="bg-light">
          <div class="container mt-5">
            <div class="row justify-content-center">
              <div class="col-md-6">
                <div class="card">
                  <div class="card-header">
                    <h4 class="mb-0">Admin Login</h4>
                  </div>
                  <div class="card-body">
                    <form action="/admin" method="get">
                      <div class="mb-3">
                        <label for="adminToken" class="form-label">Admin Password</label>
                        <input type="password" class="form-control" id="adminToken" name="adminToken" required>
                      </div>
                      <button type="submit" class="btn btn-primary">Login</button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
  }

  // Admin interface
  res.send(`
    <html>
      <head>
        <title>Section Store Admin</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
      </head>
      <body class="bg-light">
        <div class="container mt-4">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Section Store Admin</h2>
            <div>
              <button class="btn btn-success" onclick="showAddForm()">Add New Section</button>
              <a href="/app" class="btn btn-outline-primary ms-2">View App</a>
            </div>
          </div>

          <!-- Add/Edit Section Form -->
          <div id="sectionForm" class="card mb-4" style="display: none;">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="mb-0" id="formTitle">Add New Section</h5>
              <button type="button" class="btn-close" onclick="hideForm()"></button>
            </div>
            <div class="card-body">
              <form id="addEditForm" onsubmit="handleSubmit(event)">
                <input type="hidden" id="editingId" name="editingId">
                <div class="mb-3">
                  <label for="sectionId" class="form-label">Section ID</label>
                  <input type="text" class="form-control" id="sectionId" name="sectionId" required>
                </div>
                <div class="mb-3">
                  <label for="title" class="form-label">Title</label>
                  <input type="text" class="form-control" id="title" name="title" required>
                </div>
                <div class="mb-3">
                  <label for="description" class="form-label">Description</label>
                  <textarea class="form-control" id="description" name="description" rows="3" required></textarea>
                </div>
                <div class="mb-3">
                  <label for="categories" class="form-label">Categories (comma-separated)</label>
                  <input type="text" class="form-control" id="categories" name="categories" required>
                </div>
                <div class="mb-3">
                  <label for="sectionFile" class="form-label">Section File (section.liquid)</label>
                  <input type="file" class="form-control" id="sectionFile" name="sectionFile" accept=".liquid">
                </div>
                <div class="mb-3">
                  <label for="previewFile" class="form-label">Preview Image</label>
                  <input type="file" class="form-control" id="previewFile" name="previewFile" accept="image/*">
                </div>
                <button type="submit" class="btn btn-primary">Save Section</button>
              </form>
            </div>
          </div>

          <!-- Sections List -->
          <div class="card">
            <div class="card-header">
              <h5 class="mb-0">Available Sections</h5>
            </div>
            <div class="card-body">
              <div id="sectionsList"></div>
            </div>
          </div>
        </div>

        <script>
          // Load sections on page load
          loadSections();

          function loadSections() {
            fetch('/api/sections')
              .then(response => response.json())
              .then(sections => {
                const list = document.getElementById('sectionsList');
                list.innerHTML = '';
                
                if (sections.length === 0) {
                  list.innerHTML = '<div class="alert alert-info">No sections available</div>';
                  return;
                }

                const table = document.createElement('table');
                table.className = 'table table-striped';
                
                // Build the table header separately to avoid template literal issues
                const thead = document.createElement('thead');
                thead.innerHTML = '<tr><th>ID</th><th>Preview</th><th>Title</th><th>Description</th><th>Categories</th><th>Actions</th></tr>';
                table.appendChild(thead);
                
                const tbody = document.createElement('tbody');
                table.appendChild(tbody);

                sections.forEach(section => {
                  const row = document.createElement('tr');
                  
                  // ID cell
                  const idCell = document.createElement('td');
                  idCell.textContent = section.id;
                  row.appendChild(idCell);
                  
                  // Preview cell
                  const previewCell = document.createElement('td');
                  if (section.previewUrl) {
                    const img = document.createElement('img');
                    img.src = section.previewUrl;
                    img.alt = section.title;
                    img.style.maxWidth = '100px';
                    img.style.maxHeight = '75px';
                    previewCell.appendChild(img);
                  } else {
                    const span = document.createElement('span');
                    span.className = 'text-muted';
                    span.textContent = 'No preview';
                    previewCell.appendChild(span);
                  }
                  row.appendChild(previewCell);
                  
                  // Title cell
                  const titleCell = document.createElement('td');
                  titleCell.textContent = section.title;
                  row.appendChild(titleCell);
                  
                  // Description cell
                  const descCell = document.createElement('td');
                  descCell.textContent = section.description;
                  row.appendChild(descCell);
                  
                  // Categories cell
                  const catCell = document.createElement('td');
                  catCell.textContent = section.categories.join(', ');
                  row.appendChild(catCell);
                  
                  // Actions cell
                  const actionsCell = document.createElement('td');
                  
                  const editBtn = document.createElement('button');
                  editBtn.className = 'btn btn-sm btn-primary';
                  editBtn.textContent = 'Edit';
                  editBtn.onclick = function() { editSection(section); };
                  actionsCell.appendChild(editBtn);
                  
                  actionsCell.appendChild(document.createTextNode(' '));
                  
                  const deleteBtn = document.createElement('button');
                  deleteBtn.className = 'btn btn-sm btn-danger';
                  deleteBtn.textContent = 'Delete';
                  deleteBtn.onclick = function() { deleteSection(section.id); };
                  actionsCell.appendChild(deleteBtn);
                  
                  row.appendChild(actionsCell);
                  
                  tbody.appendChild(row);
                });

                list.appendChild(table);
              })
              .catch(error => {
                console.error('Error loading sections:', error);
                document.getElementById('sectionsList').innerHTML = 
                  '<div class="alert alert-danger">Error loading sections</div>';
              });
          }

          function showAddForm() {
            document.getElementById('formTitle').textContent = 'Add New Section';
            document.getElementById('sectionForm').style.display = 'block';
            document.getElementById('editingId').value = '';
            document.getElementById('addEditForm').reset();
          }

          function hideForm() {
            document.getElementById('sectionForm').style.display = 'none';
            document.getElementById('addEditForm').reset();
          }

          function editSection(section) {
            document.getElementById('formTitle').textContent = 'Edit Section';
            document.getElementById('sectionForm').style.display = 'block';
            document.getElementById('editingId').value = section.id;
            document.getElementById('sectionId').value = section.id;
            document.getElementById('title').value = section.title;
            document.getElementById('description').value = section.description;
            document.getElementById('categories').value = section.categories.join(', ');
          }

          async function handleSubmit(event) {
            event.preventDefault();
            const formData = new FormData(event.target);
            const editingId = document.getElementById('editingId').value;
            
            try {
              const url = editingId ? 
                '/api/sections/' + editingId + '?adminToken=okayscale' : 
                '/api/sections/upload?adminToken=okayscale';
              
              console.log('Submitting form to:', url);
              const response = await fetch(url, {
                method: editingId ? 'PUT' : 'POST',
                body: formData
              });

              const result = await response.json();
              
              if (!response.ok) {
                console.error('Server error:', result);
                throw new Error(result.error || 'Failed to save section');
              }

              hideForm();
              loadSections();
              alert(editingId ? 'Section updated successfully' : 'Section added successfully');
            } catch (error) {
              console.error('Error saving section:', error);
              alert('Error saving section. Please try again.');
            }
          }

          async function deleteSection(sectionId) {
            if (!confirm('Are you sure you want to delete this section?')) {
              return;
            }

            try {
              const response = await fetch('/api/sections/' + sectionId + '?adminToken=okayscale', {
                method: 'DELETE'
              });

              if (!response.ok) {
                throw new Error('Failed to delete section');
              }

              loadSections();
              alert('Section deleted successfully');
            } catch (error) {
              console.error('Error deleting section:', error);
              alert('Error deleting section. Please try again.');
            }
          }
        </script>
      </body>
    </html>
  `);
});

// API endpoint for uploading a new section
app.post('/api/sections/upload', (req, res) => {
  const adminToken = req.query.adminToken;
  if (adminToken !== 'okayscale') {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized'
    });
  }

  try {
    const { sectionId, title, description, categories } = req.body;
    if (!sectionId || !title) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields'
      });
    }

    logMessage(`Creating new section: ${sectionId}`);
    
    // Create directories
    const sectionDir = path.join(__dirname, 'sections', sectionId);
    ensureDir(sectionDir);
    
    const categoriesArray = categories ? categories.split(',').map(c => c.trim()) : ['general'];
    
    // Create metadata
    const metadata = {
      id: sectionId,
      title: title,
      description: description || '',
      categories: categoriesArray,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save metadata to a meta.json file
    fs.writeFileSync(
      path.join(sectionDir, 'meta.json'), 
      JSON.stringify(metadata, null, 2)
    );

    // Save section file if provided
    if (req.files?.sectionFile) {
      const sectionFile = req.files.sectionFile;
      sectionFile.mv(path.join(sectionDir, 'section.liquid'));
      logMessage(`Saved section file for ${sectionId}`);
    } else {
      // Create a default section file
      const defaultSection = `{% comment %}
  ${title} 
  ${description || ''}
{% endcomment %}

<div class="${sectionId}">
  <h2>{{ section.settings.heading }}</h2>
  <div>{{ section.settings.content }}</div>
</div>

{% schema %}
{
  "name": "${title}",
  "settings": [
    {
      "type": "text",
      "id": "heading",
      "label": "Heading",
      "default": "${title}"
    },
    {
      "type": "richtext",
      "id": "content",
      "label": "Content",
      "default": "<p>${description || 'Add your content here'}</p>"
    }
  ],
  "presets": [
    {
      "name": "${title}",
      "category": "Custom"
    }
  ]
}
{% endschema %}`;

      fs.writeFileSync(path.join(sectionDir, 'section.liquid'), defaultSection);
      logMessage(`Created default section file for ${sectionId}`);
    }

    // Save preview image if provided
    if (req.files?.previewFile) {
      const previewFile = req.files.previewFile;
      const ext = path.extname(previewFile.name);
      previewFile.mv(path.join(sectionDir, `preview${ext}`));
      
      // Also copy to web public directory for serving
      ensureDir(path.join(__dirname, 'web', 'public', 'section-previews'));
      previewFile.mv(path.join(__dirname, 'web', 'public', 'section-previews', `${sectionId}${ext}`));
      
      logMessage(`Saved preview image for ${sectionId}`);
    }

    res.json({ 
      success: true, 
      message: 'Section uploaded successfully'
    });
  } catch (error) {
    logMessage(`Error uploading section: ${error.message}`, true);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to upload section',
      details: error.message
    });
  }
});

// API endpoint for updating a section
app.put('/api/sections/:sectionId', (req, res) => {
  const adminToken = req.query.adminToken;
  if (adminToken !== 'okayscale') {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized'
    });
  }

  try {
    const { sectionId } = req.params;
    const { title, description, categories } = req.body;
    
    logMessage(`Updating section: ${sectionId}`);
    
    const sectionDir = path.join(__dirname, 'sections', sectionId);
    if (!fs.existsSync(sectionDir)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Section not found'
      });
    }

    const categoriesArray = categories ? categories.split(',').map(c => c.trim()) : ['general'];
    
    // Create or update metadata
    const metaPath = path.join(sectionDir, 'meta.json');
    let metadata = {
      id: sectionId,
      title: title,
      description: description || '',
      categories: categoriesArray,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Try to load existing metadata if it exists
    try {
      if (fs.existsSync(metaPath)) {
        const currentMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        metadata = {
          ...currentMeta,
          title: title,
          description: description || currentMeta.description || '',
          categories: categoriesArray,
          updatedAt: new Date().toISOString()
        };
      }
    } catch (metaError) {
      logMessage(`Error reading existing metadata: ${metaError.message}`, true);
    }

    // Save updated metadata
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
    logMessage(`Updated metadata for ${sectionId}`);

    // Update section file if provided
    if (req.files?.sectionFile) {
      const sectionFile = req.files.sectionFile;
      sectionFile.mv(path.join(sectionDir, 'section.liquid'));
      logMessage(`Updated section file for ${sectionId}`);
    }

    // Update preview image if provided
    if (req.files?.previewFile) {
      const previewFile = req.files.previewFile;
      const ext = path.extname(previewFile.name);
      
      // Remove old preview files if they exist
      for (const ext of ['.png', '.jpg', '.svg', '.jpeg', '.gif']) {
        const oldFile = path.join(sectionDir, `preview${ext}`);
        if (fs.existsSync(oldFile)) {
          fs.unlinkSync(oldFile);
        }
      }
      
      // Save new preview
      previewFile.mv(path.join(sectionDir, `preview${ext}`));
      
      // Also update in web public directory
      ensureDir(path.join(__dirname, 'web', 'public', 'section-previews'));
      previewFile.mv(path.join(__dirname, 'web', 'public', 'section-previews', `${sectionId}${ext}`));
      
      logMessage(`Updated preview image for ${sectionId}`);
    }

    res.json({ 
      success: true, 
      message: 'Section updated successfully'
    });
  } catch (error) {
    logMessage(`Error updating section: ${error.message}`, true);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update section',
      details: error.message
    });
  }
});

// API endpoint for deleting a section
app.delete('/api/sections/:sectionId', (req, res) => {
  // Check admin token
  const adminToken = req.headers.authorization?.split(' ')[1];
  if (adminToken !== 'okayscale') {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const { sectionId } = req.params;
    const sectionDir = path.join(__dirname, 'data', 'sections', sectionId);
    
    if (!fs.existsSync(sectionDir)) {
      return res.status(404).json({ success: false, error: 'Section not found' });
    }

    // Remove section directory and all its contents
    fs.rmSync(sectionDir, { recursive: true, force: true });

    res.json({ success: true, message: 'Section deleted successfully' });
  } catch (error) {
    console.error('Error deleting section:', error);
    res.status(500).json({ success: false, error: 'Failed to delete section' });
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