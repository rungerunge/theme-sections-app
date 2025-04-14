import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  
  return json({
    apiKey: process.env.SHOPIFY_API_KEY || "",
    shopOrigin: session.shop,
  });
};

export default function App() {
  const { apiKey, shopOrigin } = useLoaderData();

  return (
    <AppProvider 
      isEmbeddedApp
      apiKey={apiKey}
      shopOrigin={shopOrigin}
    >
      <Outlet />
    </AppProvider>
  );
}

// Ensure we handle errors appropriately
export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <AppProvider isEmbeddedApp>
      <div style={{ margin: "2rem" }}>
        <h1>Error</h1>
        <pre>{error.message}</pre>
      </div>
    </AppProvider>
  );
} 