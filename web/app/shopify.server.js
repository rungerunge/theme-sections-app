import { shopifyApp } from "@shopify/shopify-app-remix";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-01";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.HOST,
  authPathPrefix: "/auth",
  restResources,
  isEmbeddedApp: true,
});

export const authenticate = shopify.authenticate; 