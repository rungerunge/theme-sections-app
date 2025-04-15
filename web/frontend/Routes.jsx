import { Routes as ReactRouterRoutes, Route } from "react-router-dom";

/**
 * Routes component that renders a route for each page in the pages directory
 */
export default function Routes() {
  // Import all page components dynamically
  const pages = import.meta.globEager("./pages/**/*.jsx");

  // Create routes from pages directory
  const routes = Object.keys(pages)
    .map((key) => {
      const path = key
        .replace("./pages", "")
        .replace(/\.(t|j)sx?$/, "")
        .replace(/\/index$/i, "/")
        .replace(/\b[A-Z]/, (match) => match.toLowerCase());

      if (path === "/") {
        return {
          exact: true,
          path,
          component: pages[key].default,
        };
      }

      return {
        path,
        component: pages[key].default,
      };
    })
    .filter(Boolean);

  return (
    <ReactRouterRoutes>
      {routes.map(({ exact, path, component: Component }) => (
        <Route
          key={path}
          path={path}
          element={<Component />}
          exact={exact}
        />
      ))}
    </ReactRouterRoutes>
  );
} 