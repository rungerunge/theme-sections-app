import "@shopify/shopify-app-remix/adapters/node";
import {
  createRequestHandler,
  getSessionStorage,
} from "@shopify/shopify-app-remix/server";
import { createStorefrontClient } from "@shopify/hydrogen";
import { HydrogenSession } from "@shopify/remix-oxygen";
import { AppSession } from "@shopify/shopify-app-session-storage";
import express from "express";
import { createRequire } from "module";
import { join } from "path";
import { fileURLToPath } from "url";
import { authenticate } from "./shopify.server";
import fs from "fs/promises";
import path from "path";

const require = createRequire(import.meta.url);
const BUILD_DIR = join(process.cwd(), "build");
const PORT = parseInt(process.env.PORT || "8081", 10);

const app = express();

// Setup Shopify auth
app.get("/api/auth", authenticate.begin());
app.get("/api/auth/callback", authenticate.callback());
app.get("/api/auth/redirect", authenticate.redirectToShopifyOrAppRoot());

// Static assets
app.use(express.static("public"));
app.use(express.static("build/client"));

// DIRECT ADMIN ROUTE - Handles /admin path directly
app.get("/admin", (req, res) => {
  const adminToken = req.query.adminToken;
  
  if (adminToken === "okayscale") {
    res.send(`
      <html>
        <head>
          <title>OkayScale Admin</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
          <style>
            body { padding: 20px; }
            .admin-card { margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="my-4">Section Store Admin Dashboard</h1>
            <div class="row">
              <div class="col-md-6">
                <div class="card admin-card">
                  <div class="card-header bg-primary text-white">
                    <h4>Manage Sections</h4>
                  </div>
                  <div class="card-body">
                    <p>View and manage your section library</p>
                    <a href="/app" class="btn btn-primary">Go to App</a>
                  </div>
                </div>
              </div>
              <div class="col-md-6">
                <div class="card admin-card">
                  <div class="card-header bg-success text-white">
                    <h4>Diagnostics</h4>
                  </div>
                  <div class="card-body">
                    <p>Check system diagnostics</p>
                    <a href="/api/debug-info" class="btn btn-success">View Debug Info</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
        </body>
      </html>
    `);
  } else {
    res.send(`
      <html>
        <head>
          <title>Admin Login</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
          <style>
            body { padding: 20px; }
            .login-card { max-width: 400px; margin: 50px auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card login-card">
              <div class="card-header bg-primary text-white">
                <h4>Admin Login</h4>
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
        </body>
      </html>
    `);
  }
});

// Custom admin endpoint for debugging
app.get("/admin-debug", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Admin Debug</title>
      </head>
      <body>
        <h1>Admin Debug</h1>
        <p>This confirms the direct Express routes are working</p>
        <p>Try the <a href="/admin?adminToken=okayscale">main admin page</a></p>
        <p>Or try the <a href="/app">app route</a></p>
      </body>
    </html>
  `);
});

// Debug endpoint for API diagnostics
app.get("/api/debug-info", async (req, res) => {
  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      requestUrl: req.url,
      requestHeaders: req.headers,
      environment: process.env.NODE_ENV,
      paths: {
        cwd: process.cwd(),
        sections: []
      },
      serverInfo: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        uptime: process.uptime()
      }
    };
    
    // Check sections directory
    const possiblePaths = [
      path.join(process.cwd(), '..', 'sections'),
      path.join(process.cwd(), 'sections'),
      path.join(process.cwd(), 'public', 'sections')
    ];
    
    for (const dirPath of possiblePaths) {
      try {
        await fs.access(dirPath);
        const items = await fs.readdir(dirPath);
        debugInfo.paths.sections.push({
          path: dirPath,
          exists: true,
          items: items.slice(0, 10) // Just first 10 for brevity
        });
      } catch (e) {
        debugInfo.paths.sections.push({
          path: dirPath,
          exists: false,
          error: e.message
        });
      }
    }
    
    res.json(debugInfo);
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Inject shop parameter for API calls
app.use('/api/sections/install', (req, res, next) => {
  const shopParam = req.query.shop || 'admin.shopify.com'; // Default shop if none provided
  
  // Add shop parameter to all install requests
  if (!req.query.shop) {
    req.query.shop = shopParam;
    
    // If this is a POST with JSON body, we'll need to read and modify it
    if (req.method === 'POST') {
      const originalJson = req.body;
      if (originalJson && !originalJson.shop) {
        originalJson.shop = shopParam;
      }
    }
  }
  
  console.log(`[SERVER] Adding shop parameter to request: ${shopParam}`);
  next();
});

// All routes after this point will require authentication
app.use("/api/*", (req, res, next) => {
  // Skip auth for debug endpoint
  if (req.path === "/api/debug-info") {
    return next();
  }
  
  authenticate.validateAuthenticatedSession()(req, res, next);
});

// Add shop parameter to any request to the remix handler if needed
app.use((req, res, next) => {
  // Add a default shop parameter to ensure code doesn't fail
  if (req.path.includes('/api/sections/install') && !req.query.shop) {
    req.query.shop = 'admin.shopify.com';
  }
  next();
});

app.all("*", createRequestHandler({
  build: require(BUILD_DIR),
  mode: process.env.NODE_ENV,
}));

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
}); 