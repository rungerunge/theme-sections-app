const express = require("express");
const path = require("path");
const compression = require("compression");
const morgan = require("morgan");
const { createRequestHandler } = require("@remix-run/express");

const BUILD_DIR = path.join(process.cwd(), "build");

const app = express();

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable("x-powered-by");

// Compress responses
app.use(compression());

// Add logging middleware
app.use(morgan("tiny"));

// Static files
app.use(express.static("public", { maxAge: "1h" }));

// Remix build files
app.use("/build", express.static("public/build", { immutable: true, maxAge: "1y" }));

// Everything else
app.all(
  "*",
  createRequestHandler({
    build: require(BUILD_DIR),
    mode: process.env.NODE_ENV || "production",
  })
);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
}); 