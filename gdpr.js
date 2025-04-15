/**
 * This file contains handlers for GDPR webhooks
 * Learn more about GDPR webhooks: https://shopify.dev/apps/webhooks/configuration/mandatory-webhooks
 */

/**
 * Triggered when a customer requests their data from a store.
 * @param {import("@shopify/shopify-api").ShopifyRestResources.WebhookPayloadData} topic
 * @param {import("@shopify/shopify-api").ShopifyHeader} shop
 * @param {import("@shopify/shopify-api").ShopifyHeader} body
 */
export function customerDataRequest(topic, shop, body) {
  console.log(`Received ${topic} webhook for ${shop}`);
  // You need to respond to the customer data request by providing the customer's data
  // as required by your legal obligations. This has no response.
  // Learn more: https://shopify.dev/apps/webhooks/configuration/mandatory-webhooks#customers-data_request
}

/**
 * Triggered when a customer requests to redact their data from a store.
 * @param {import("@shopify/shopify-api").ShopifyRestResources.WebhookPayloadData} topic
 * @param {import("@shopify/shopify-api").ShopifyHeader} shop
 * @param {import("@shopify/shopify-api").ShopifyHeader} body
 */
export function customerRedact(topic, shop, body) {
  console.log(`Received ${topic} webhook for ${shop}`);
  // You need to redact the customer's data as required by your legal obligations.
  // This has no response.
  // Learn more: https://shopify.dev/apps/webhooks/configuration/mandatory-webhooks#customers-redact
}

/**
 * Triggered when a shop requests to redact their data from a store.
 * @param {import("@shopify/shopify-api").ShopifyRestResources.WebhookPayloadData} topic
 * @param {import("@shopify/shopify-api").ShopifyHeader} shop
 * @param {import("@shopify/shopify-api").ShopifyHeader} body
 */
export function shopRedact(topic, shop, body) {
  console.log(`Received ${topic} webhook for ${shop}`);
  // You need to redact the shop's data as required by your legal obligations.
  // This has no response.
  // Learn more: https://shopify.dev/apps/webhooks/configuration/mandatory-webhooks#shop-redact
}

// Export the webhooks
export default {
  CUSTOMERS_DATA_REQUEST: {
    deliveryMethod: "http",
    callbackUrl: "/api/webhooks",
    callback: customerDataRequest,
  },
  CUSTOMERS_REDACT: {
    deliveryMethod: "http",
    callbackUrl: "/api/webhooks",
    callback: customerRedact,
  },
  SHOP_REDACT: {
    deliveryMethod: "http",
    callbackUrl: "/api/webhooks",
    callback: shopRedact,
  },
}; 