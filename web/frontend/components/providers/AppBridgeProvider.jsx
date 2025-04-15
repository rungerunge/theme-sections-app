import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Provider } from "@shopify/app-bridge-react";
import { Banner, Layout, Page } from "@shopify/polaris";

export function AppBridgeProvider({ children }) {
  const location = useLocation();

  // Get the query params from the URL
  const query = new URLSearchParams(location.search);
  
  // Get the Shopify app API key from env or set a placeholder
  const apiKey = process.env.SHOPIFY_API_KEY || "SHOPIFY_API_KEY";

  // Create a config object for App Bridge
  const appBridgeConfig = useMemo(
    () => ({
      apiKey,
      host: query.get("host"),
      forceRedirect: true,
    }),
    [apiKey, query]
  );

  // Check if we have a host param, if not show an error
  if (!query.get("host")) {
    return (
      <Page narrowWidth>
        <Layout>
          <Layout.Section>
            <div style={{ marginTop: "100px" }}>
              <Banner title="Missing host parameter" status="critical">
                <p>
                  Your app can only be used inside the Shopify Admin. Please open
                  this app through your Shopify Admin dashboard.
                </p>
              </Banner>
            </div>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return <Provider config={appBridgeConfig}>{children}</Provider>;
} 