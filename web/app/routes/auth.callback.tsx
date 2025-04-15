import { authenticate } from "../shopify.server";
import { redirect } from "@remix-run/node";

export async function loader({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  try {
    // Complete the OAuth process
    await authenticate.admin(request);
    
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