const fs = require('fs');
const path = require('path');

// Log basic system information
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Current working directory:', process.cwd());
console.log('Environment:', process.env.NODE_ENV || 'not set');

// List all directories in the current path
console.log('\nDirectory contents:');
const items = fs.readdirSync(process.cwd());
items.forEach(item => {
  const stats = fs.statSync(path.join(process.cwd(), item));
  console.log(`- ${item} (${stats.isDirectory() ? 'directory' : 'file'})`);
});

// Check for key files
const keyFiles = ['package.json', 'start.js', 'Procfile', 'build'];
console.log('\nChecking for key files:');
keyFiles.forEach(file => {
  const exists = fs.existsSync(path.join(process.cwd(), file));
  console.log(`- ${file}: ${exists ? 'exists' : 'missing'}`);
});

// Check build directory if it exists
const buildDir = path.join(process.cwd(), 'build');
if (fs.existsSync(buildDir)) {
  console.log('\nBuild directory contents:');
  const buildItems = fs.readdirSync(buildDir);
  buildItems.forEach(item => {
    console.log(`- ${item}`);
  });
}

// Check package.json
if (fs.existsSync(path.join(process.cwd(), 'package.json'))) {
  const packageJson = require('./package.json');
  console.log('\nPackage.json info:');
  console.log('- Name:', packageJson.name);
  console.log('- Version:', packageJson.version);
  console.log('- Main:', packageJson.main);
  console.log('- Scripts:', Object.keys(packageJson.scripts).join(', '));
} 