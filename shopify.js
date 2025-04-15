import { BillingInterval, LATEST_API_VERSION } from "@shopify/shopify-api";
import { shopifyApp } from "@shopify/shopify-app-express";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-01";

// The transactions with Shopify will always be marked as test transactions
const billingConfig = {
  "My Section Store": {
    amount: 0,  // Free app!
    currencyCode: "USD",
    interval: BillingInterval.Every30Days,
  },
};

const shopify = shopifyApp({
  // The API key and secret are provided by Shopify when you create an app
  api: {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
    apiVersion: LATEST_API_VERSION,
    scopes: [
      "read_themes", 
      "write_themes",
      "read_products",
      "write_products"
    ],
    restResources,
  },
  auth: {
    path: "/api/auth",
    callbackPath: "/api/auth/callback",
  },
  webhooks: {
    path: "/api/webhooks",
  },
  sessionStorage: new (shopify.session.MemorySessionStorage)(),
  billing: billingConfig,
});

export default shopify; 