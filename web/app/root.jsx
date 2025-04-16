import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import "@shopify/polaris/build/esm/styles.css";

export default function App() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <AppProvider isEmbeddedApp={true}>
          <Outlet />
        </AppProvider>
        <ScrollRestoration />
        <LiveReload />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary({ error }) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
        <title>Error</title>
      </head>
      <body>
        <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
          <h1>Application Error</h1>
          <pre style={{ padding: "1rem", background: "#f7f7f7", borderRadius: "4px" }}>
            {error.message}
          </pre>
          <p>Check the console for more details.</p>
        </div>
        <Scripts />
      </body>
    </html>
  );
} 