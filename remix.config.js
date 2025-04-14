/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ["**/.*"],
  server: "./server.js",
  serverBuildPath: "build/index.js",
  serverModuleFormat: "cjs",
  appDirectory: "app",
  assetsBuildDirectory: "public/build",
  publicPath: "/build/",
  future: {
    v2_errorBoundary: true,
    v2_meta: true,
    v2_normalizeFormMethod: true,
    v2_routeConvention: true,
  },
  serverDependenciesToBundle: "all",
}; 