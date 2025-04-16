#!/usr/bin/env node

const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const webDir = path.join(__dirname, 'web');
const publicDir = path.join(webDir, 'public');
const sectionsDir = path.join(__dirname, 'sections');
const webSectionsDir = path.join(publicDir, 'sections');
const previewsDir = path.join(publicDir, 'section-previews');
const logPath = path.join(__dirname, 'build-debug.log');

// Setup logging
const logStream = fs.createWriteStream(logPath, { flags: 'a' });
const log = (message) => {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  logStream.write(formattedMessage);
};

const logError = (message, error) => {
  const timestamp = new Date().toISOString();
  let errorDetails = '';
  
  if (error) {
    errorDetails = `\nError: ${error.message || error}`;
    if (error.stack) {
      errorDetails += `\nStack: ${error.stack}`;
    }
  }
  
  const formattedMessage = `[${timestamp}] ERROR: ${message}${errorDetails}\n`;
  console.error(`ERROR: ${message}`);
  if (error) console.error(error);
  logStream.write(formattedMessage);
};

// Helper function to run shell commands
function run(command, cwd = __dirname) {
  log(`Running: ${command} in ${cwd}`);
  try {
    const output = execSync(command, { 
      cwd, 
      stdio: 'pipe',
      env: { ...process.env },
      encoding: 'utf8'
    });
    log(`Command output: ${output.substring(0, 500)}${output.length > 500 ? '...(truncated)' : ''}`);
    return output;
  } catch (error) {
    logError(`Error running "${command}":`, error);
    log(`Command stderr: ${error.stderr || 'N/A'}`);
    log(`Command stdout: ${error.stdout || 'N/A'}`);
    throw error;
  }
}

// Helper function for running commands with detailed output
function runDetailed(command, cwd = __dirname) {
  return new Promise((resolve, reject) => {
    log(`Running with detailed output: ${command} in ${cwd}`);
    
    const child = exec(command, { cwd, env: { ...process.env } });
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data;
      log(`[OUT] ${data.trim()}`);
    });
    
    child.stderr.on('data', (data) => {
      stderr += data;
      log(`[ERR] ${data.trim()}`);
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        log(`Command completed successfully with exit code: ${code}`);
        resolve({ stdout, stderr });
      } else {
        logError(`Command failed with exit code: ${code}`);
        reject(new Error(`Command failed with exit code: ${code}\nStderr: ${stderr}`));
      }
    });
  });
}

// Helper function to ensure directories exist
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Helper function to check package dependencies
async function checkDependencies() {
  log('Checking package dependencies...');
  
  // Read package.json
  const packagePath = path.join(__dirname, 'package.json');
  const packageLock = path.join(__dirname, 'package-lock.json');
  
  log(`Package.json path: ${packagePath}`);
  log(`Package exists: ${fs.existsSync(packagePath)}`);
  log(`Package-lock exists: ${fs.existsSync(packageLock)}`);
  
  if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    log(`Dependencies: ${JSON.stringify(packageJson.dependencies, null, 2)}`);
  }
  
  try {
    // Check for specific conflicts
    const output = run('npm ls @shopify/shopify-api', __dirname);
    log(`Dependency check result: ${output}`);
  } catch (error) {
    logError('Dependency check failed, but continuing build...', error);
  }
}

// Main build process
async function build() {
  log('=== BUILD STARTED ===');
  log(`Node version: ${process.version}`);
  log(`Working directory: ${__dirname}`);
  
  try {
    // Check current environment and files
    log('Environment and file check:');
    log(`Node modules exists: ${fs.existsSync(path.join(__dirname, 'node_modules'))}`);
    log(`Web directory exists: ${fs.existsSync(webDir)}`);
    
    // Perform dependency check
    await checkDependencies();
    
    log('Starting build process...');

    // Create required directories
    ensureDir(publicDir);
    ensureDir(webSectionsDir);
    ensureDir(previewsDir);

    // Install dependencies with detailed output
    log('Installing root dependencies...');
    try {
      await runDetailed('npm install --no-fund --no-audit --loglevel=verbose', __dirname);
    } catch (error) {
      logError('Failed to install root dependencies, attempting to continue...', error);
    }

    // Copy sections to web/public/sections if they exist
    if (fs.existsSync(sectionsDir)) {
      log('Copying sections to web directory...');
      
      // Read section directories
      const sectionFolders = fs.readdirSync(sectionsDir);
      log(`Found section folders: ${sectionFolders.join(', ')}`);
      
      // Copy each section
      for (const folder of sectionFolders) {
        const srcFolder = path.join(sectionsDir, folder);
        const destFolder = path.join(webSectionsDir, folder);
        
        // Skip if not a directory
        if (!fs.statSync(srcFolder).isDirectory()) {
          log(`Skipping non-directory: ${folder}`);
          continue;
        }
        
        ensureDir(destFolder);
        
        // Copy section.liquid file if it exists
        const sectionFile = path.join(srcFolder, 'section.liquid');
        if (fs.existsSync(sectionFile)) {
          fs.copyFileSync(
            sectionFile, 
            path.join(destFolder, 'section.liquid')
          );
          log(`Copied ${folder}/section.liquid`);
        } else {
          log(`Section file not found: ${sectionFile}`);
        }
      }
    } else {
      log('Sections directory not found, creating a sample...');
      ensureDir(sectionsDir);
      const testSectionDir = path.join(sectionsDir, 'test-section');
      const testSectionWebDir = path.join(webSectionsDir, 'test-section');
      ensureDir(testSectionDir);
      ensureDir(testSectionWebDir);
      
      // Create a basic section template
      const sectionContent = `{%- comment -%}
  This is a test section template for the Theme Sections App
{%- endcomment -%}

<div class="test-section" {{ block.shopify_attributes }}>
  <h2>{{ section.settings.heading }}</h2>
  <div>{{ section.settings.content }}</div>
</div>

{% schema %}
{
  "name": "Test Section",
  "settings": [
    {
      "type": "text",
      "id": "heading",
      "label": "Heading",
      "default": "Test Section Heading"
    },
    {
      "type": "richtext",
      "id": "content",
      "label": "Content",
      "default": "<p>This is a test section created by the Theme Sections App.</p>"
    }
  ],
  "presets": [
    {
      "name": "Test Section",
      "category": "Custom"
    }
  ]
}
{% endschema %}`;
      
      fs.writeFileSync(
        path.join(testSectionDir, 'section.liquid'), 
        sectionContent
      );
      fs.writeFileSync(
        path.join(testSectionWebDir, 'section.liquid'), 
        sectionContent
      );
      log('Created sample section template');
    }

    // Build the simple server directly (bypassing Remix build)
    log('Building simple server for Render deployment...');
    
    // Copy necessary files to public directory
    ensureDir(publicDir);
    
    // Create a simpler package.json for web
    log('Creating simplified web package.json...');
    const webPackageJson = {
      "name": "okayscale-sections-web",
      "private": true,
      "dependencies": {
        "express": "^4.18.2"
      }
    };
    
    fs.writeFileSync(
      path.join(webDir, 'package.json'),
      JSON.stringify(webPackageJson, null, 2)
    );
    
    // Install web dependencies
    log('Installing web dependencies...');
    try {
      await runDetailed('npm install --no-fund --no-audit', webDir);
    } catch (error) {
      logError('Failed to install web dependencies, attempting to continue...', error);
    }
    
    // Create a basic express server file if needed
    const serverPath = path.join(webDir, 'server.js');
    if (!fs.existsSync(serverPath)) {
      log('Creating basic express server...');
      const serverContent = `
const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve main html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`;
      fs.writeFileSync(serverPath, serverContent);
      log('Created basic express server');
    }

    log('Build completed successfully!');
    log('=== BUILD FINISHED ===');
  } catch (error) {
    logError('Build failed:', error);
    log('=== BUILD FAILED ===');
    process.exit(1);
  } finally {
    logStream.end();
  }
}

// Run the build
build().catch(error => {
  logError('Unhandled error during build:', error);
  process.exit(1);
}); 