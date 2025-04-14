import "@shopify/shopify-api/adapters/node";
import { LATEST_API_VERSION, shopifyApp } from "@shopify/shopify-app-express";
import { restResources } from "@shopify/shopify-api/rest/admin/2023-04";
import { MemorySessionStorage } from "@shopify/shopify-app-session-storage-memory";

const shopify = shopifyApp({
  api: {
    apiVersion: LATEST_API_VERSION,
    restResources,
    billing: undefined, // or replace with billing options
  },
  auth: {
    path: "/api/auth",
    callbackPath: "/api/auth/callback",
  },
  webhooks: {
    path: "/api/webhooks",
  },
  sessionStorage: new MemorySessionStorage(),
});

export default shopify; 