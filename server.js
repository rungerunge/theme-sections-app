const express = require("express");
const compression = require("compression");
const { createRequestHandler } = require("@remix-run/express");
const path = require("path");

const app = express();

// Use compression middleware
app.use(compression());

// Handle asset requests
app.use(
  "/build",
  express.static(path.join(process.cwd(), "public/build"), {
    immutable: true,
    maxAge: "1y",
  })
);

// Handle public file requests
app.use(express.static("public", { maxAge: "1h" }));

// Handle all other requests with the Remix handler
app.all(
  "*",
  createRequestHandler({
    build: require("./build"),
    mode: process.env.NODE_ENV,
  })
);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
}); 