// @ts-check
import "@shopify/shopify-app-remix/adapters/node";
import {
  createRequestHandler,
  getSessionStorage,
  uploadPath,
} from "@shopify/shopify-app-remix/server";
import { createReadableStreamFromReadable } from "@remix-run/node";
import { createRequire } from "module";
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";
import shopify from "./shopify.js";
import GDPRWebhookHandlers from "./gdpr.js";
import { AppProvider } from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { PrismaClient } from "@prisma/client";

const require = createRequire(import.meta.url);

const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT || "8081", 10);
const isTest = process.env.NODE_ENV === "test" || !!process.env.VITE_TEST_BUILD;

// Create a new instance of the Prisma client
const prisma = new PrismaClient();
const storage = new PrismaSessionStorage(prisma);

// Set up Shopify authentication
const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/public`
    : `${process.cwd()}/public`;

const app = express();

// Set up Shopify authentication
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

app.use(express.json());

// Serve the static assets
app.use(serveStatic(STATIC_PATH, { index: false }));

// Handle incoming requests to your app's endpoints
app.use("/*", shopify.ensureInstalledOnShop(), async (req, res, next) => {
  const shopifyConfig = {
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: shopify.config.scopes,
    hostName: process.env.HOST.replace(/https?:\/\//, ""),
    hostScheme: process.env.HOST.split("://")[0],
    signedOutRedirectPath: "/",
    apiVersion: process.env.SHOPIFY_API_VERSION,
    isEmbeddedApp: true,
  };

  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(readFileSync(join(STATIC_PATH, "index.html"), "utf-8"));
});

app.listen(PORT, () => {
  console.log(`Running on ${PORT}`);
});

const BUILD_DIR = join(process.cwd(), "dist");
const STATIC_DIR = join(process.cwd(), "public");

const build = require(join(BUILD_DIR, "server", "index.js"));

const appRemix = createRequestHandler({
  build,
  mode: process.env.NODE_ENV || "development",
  getLoadContext: () => ({ sessionStorage: getSessionStorage() }),
});

const server = {
  async fetch(request) {
    try {
      // Handle static asset requests
      if (new URL(request.url).pathname.startsWith("/assets/")) {
        const filePath = join(STATIC_DIR, new URL(request.url).pathname);
        try {
          const file = readFileSync(filePath);
          return new Response(createReadableStreamFromReadable(file), {
            status: 200,
            headers: {
              "Content-Type": "application/javascript",
            },
          });
        } catch (error) {
          return new Response("Not Found", { status: 404 });
        }
      }

      // Handle all other requests with the Remix app
      return await appRemix(request);
    } catch (error) {
      console.error(error);
      return new Response("Internal Error", { status: 500 });
    }
  },
};

export default server; 