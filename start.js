const express = require('express');
const path = require('path');
const fs = require('fs');
const { createRequestHandler } = require('@remix-run/express');

// Log the current directory and contents
console.log('Current working directory:', process.cwd());
console.log('Directory contents:', fs.readdirSync(process.cwd()));

// Use a more reliable way to find the build directory
const BUILD_DIR = path.join(process.cwd(), 'build');

// Check if build directory exists
if (fs.existsSync(BUILD_DIR)) {
  console.log('Build directory exists at:', BUILD_DIR);
  console.log('Build directory contents:', fs.readdirSync(BUILD_DIR));
} else {
  console.error('Build directory does not exist at:', BUILD_DIR);
}

const app = express();

// Handle static files
app.use(express.static('public'));
app.use('/build', express.static('public/build', { immutable: true, maxAge: '1y' }));

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Add a debug route to see environment variables
app.get('/debug', (req, res) => {
  res.status(200).json({
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT
    },
    cwd: process.cwd(),
    buildDir: BUILD_DIR,
    buildDirExists: fs.existsSync(BUILD_DIR)
  });
});

try {
  // Handle API and all other routes with Remix
  app.all(
    '*',
    (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        console.log('API request:', req.method, req.path);
      }
      next();
    },
    createRequestHandler({
      build: require(BUILD_DIR),
      mode: process.env.NODE_ENV || 'production',
    })
  );
} catch (error) {
  console.error('Error setting up Remix handler:', error);
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 