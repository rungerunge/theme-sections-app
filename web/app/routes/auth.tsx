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

  try {
    // Start the OAuth process
    const { session } = await authenticate.admin(request);
    return redirect(`/app?shop=${session.shop}`);
  } catch (error) {
    // If we get here, we likely need to start the OAuth flow
    const authUrl = `https://${shop}/admin/oauth/authorize?` + 
      `client_id=${process.env.SHOPIFY_API_KEY}&` +
      `scope=${process.env.SCOPES}&` +
      `redirect_uri=${process.env.HOST}/auth/callback`;
    
    return redirect(authUrl);
  }
}

export default function Auth() {
  return null;
} 