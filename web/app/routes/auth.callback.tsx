import { authenticate } from "../shopify.server";
import { redirect } from "@remix-run/node";

export async function loader({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const code = url.searchParams.get("code");
  const hmac = url.searchParams.get("hmac");

  if (!shop || !code || !hmac) {
    return new Response("Required parameters missing", { status: 400 });
  }

  try {
    await authenticate.validateAuthCallback(request);
    
    // After successful authentication, redirect to the app
    return redirect(`/app?shop=${shop}`);
  } catch (error) {
    console.error("Auth callback error:", error);
    return new Response("Authentication failed", { status: 401 });
  }
}

export default function AuthCallback() {
  return null;
} 