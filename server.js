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

// All routes after this point will require authentication
app.use("/api/*", authenticate.validateAuthenticatedSession());

app.all("*", createRequestHandler({
  build: require(BUILD_DIR),
  mode: process.env.NODE_ENV,
}));

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
}); 