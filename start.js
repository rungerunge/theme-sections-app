const express = require('express');
const path = require('path');
const { createRequestHandler } = require('@remix-run/express');

const BUILD_DIR = path.join(process.cwd(), 'build');
const app = express();

// Handle static files
app.use(express.static('public'));
app.use('/build', express.static('public/build', { immutable: true, maxAge: '1y' }));

// Handle API and all other routes with Remix
app.all(
  '*',
  createRequestHandler({
    build: require(BUILD_DIR),
    mode: process.env.NODE_ENV || 'production',
  })
);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 