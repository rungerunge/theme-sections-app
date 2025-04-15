import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return new Response("Shop parameter is required", { status: 400 });
  }

  // Sanitize shop parameter
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop)) {
    return new Response("Invalid shop parameter", { status: 400 });
  }

  return await authenticate.beginAuth(request);
}

export default function Auth() {
  return null;
} 