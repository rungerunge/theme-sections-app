/** @type {import('@remix-run/dev').AppConfig['routes']} */
module.exports = {
  // Define the root route
  "routes/root": {
    path: "/",
    file: "./app/root.jsx",
  },
  
  // Define the index route
  "routes/index": {
    path: "/",
    file: "./app/routes/_index.jsx",
    parentId: "routes/root",
  },
  
  // Define the app routes
  "routes/app": {
    path: "/app",
    file: "./app/routes/app.jsx",
    parentId: "routes/root",
  },
  
  "routes/app.index": {
    index: true,
    file: "./app/routes/app._index.jsx",
    parentId: "routes/app",
  },
  
  // Define the API routes
  "routes/api.sections.install": {
    path: "/api/sections/install",
    file: "./app/routes/api.sections.install.tsx",
    parentId: "routes/root",
  }
}; 