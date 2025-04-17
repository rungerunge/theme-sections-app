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

// All routes after this point will require authentication
app.use("/api/*", (req, res, next) => {
  // Skip auth for debug endpoint
  if (req.path === "/api/debug-info") {
    return next();
  }
  
  authenticate.validateAuthenticatedSession()(req, res, next);
});

app.all("*", createRequestHandler({
  build: require(BUILD_DIR),
  mode: process.env.NODE_ENV,
}));

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
}); 