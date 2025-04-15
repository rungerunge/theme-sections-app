const express = require('express');
const path = require('path');
const fs = require('fs');
const { createRequestHandler } = require('@remix-run/express');

// Log the current directory and contents
console.log('Current working directory:', process.cwd());
console.log('Directory contents:', fs.readdirSync(process.cwd()));

// Log environment variables
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

// Use a more reliable way to find the build directory
const BUILD_DIR = path.join(process.cwd(), 'build');

// Check if build directory exists
if (fs.existsSync(BUILD_DIR)) {
  console.log('Build directory exists at:', BUILD_DIR);
  console.log('Build directory contents:', fs.readdirSync(BUILD_DIR));
} else {
  console.error('Build directory does not exist at:', BUILD_DIR);
  // Check the web directory build
  const webBuildDir = path.join(process.cwd(), 'web', 'build');
  if (fs.existsSync(webBuildDir)) {
    console.log('Web build directory exists at:', webBuildDir);
    console.log('Web build directory contents:', fs.readdirSync(webBuildDir));
  }
}

const app = express();

// Handle static files
app.use(express.static('public'));
app.use('/build', express.static('public/build', { immutable: true, maxAge: '1y' }));

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Add a debug route to see environment variables
app.get('/debug', (req, res) => {
  const directories = {
    root: fs.existsSync(process.cwd()) ? fs.readdirSync(process.cwd()) : 'N/A',
    build: fs.existsSync(BUILD_DIR) ? fs.readdirSync(BUILD_DIR) : 'N/A',
    public: fs.existsSync(path.join(process.cwd(), 'public')) ? fs.readdirSync(path.join(process.cwd(), 'public')) : 'N/A',
    web: fs.existsSync(path.join(process.cwd(), 'web')) ? fs.readdirSync(path.join(process.cwd(), 'web')) : 'N/A'
  };
  
  res.status(200).json({
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT
    },
    cwd: process.cwd(),
    buildDir: BUILD_DIR,
    buildDirExists: fs.existsSync(BUILD_DIR),
    directories,
    timestamp: new Date().toISOString(),
    version: '1.0.1' // Version to track changes
  });
});

try {
  // Handle API and all other routes with Remix
  app.all(
    '*',
    (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        console.log('API request:', req.method, req.path, req.headers);
      }
      next();
    },
    (req, res, next) => {
      try {
        const handler = createRequestHandler({
          build: require(BUILD_DIR),
          mode: process.env.NODE_ENV || 'production',
        });
        return handler(req, res, next);
      } catch (error) {
        console.error('Error in Remix handler:', error);
        res.status(500).json({ error: 'Remix handler error', message: error.message });
      }
    }
  );
} catch (error) {
  console.error('Error setting up Remix handler:', error);
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port} (version 1.0.1)`);
}); 