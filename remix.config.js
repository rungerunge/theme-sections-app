/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ["**/.*"],
  routes: require("./remix.routes.js"),
  server: "./server.js",
  serverBuildPath: "build/index.js",
  serverModuleFormat: "cjs",
  appDirectory: "app",
  assetsBuildDirectory: "public/build",
  publicPath: "/build/",
  serverDependenciesToBundle: ["@shopify/shopify-app-remix", /@shopify\/shopify-api.*/],
}; 