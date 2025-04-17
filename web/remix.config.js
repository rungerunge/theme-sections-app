/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ["**/.*"],
  server: "../server.js",
  serverBuildPath: "../build/index.js",
  serverModuleFormat: "cjs",
  appDirectory: "app",
  assetsBuildDirectory: "../public/build",
  publicPath: "/build/",
  routes(defineRoutes) {
    return defineRoutes(route => {
      // Ensure admin routes are properly registered
      route("/admin", "routes/admin.tsx", () => {
        route("/sections", "routes/admin.sections.tsx");
        route("/upload", "routes/admin.upload.tsx");
      });
    });
  },
  serverDependenciesToBundle: ["@shopify/shopify-app-remix", /@shopify\/shopify-api.*/],
  mdx: false
}; 