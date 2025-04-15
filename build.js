#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const webDir = path.join(__dirname, 'web');
const publicDir = path.join(webDir, 'public');
const sectionsDir = path.join(__dirname, 'sections');
const webSectionsDir = path.join(publicDir, 'sections');
const previewsDir = path.join(publicDir, 'section-previews');

// Helper function to run shell commands
function run(command, cwd = __dirname) {
  console.log(`Running: ${command}`);
  try {
    execSync(command, { 
      cwd, 
      stdio: 'inherit',
      env: { ...process.env }
    });
  } catch (error) {
    console.error(`Error running "${command}":`, error.message);
    process.exit(1);
  }
}

// Helper function to ensure directories exist
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Main build process
async function build() {
  try {
    console.log('Starting build process...');

    // Install dependencies
    console.log('Installing root dependencies...');
    run('npm install --no-audit --loglevel=error');

    // Create required directories
    ensureDir(publicDir);
    ensureDir(webSectionsDir);
    ensureDir(previewsDir);

    // Copy sections to web/public/sections if they exist
    if (fs.existsSync(sectionsDir)) {
      console.log('Copying sections to web directory...');
      
      // Read section directories
      const sectionFolders = fs.readdirSync(sectionsDir);
      
      // Copy each section
      for (const folder of sectionFolders) {
        const srcFolder = path.join(sectionsDir, folder);
        const destFolder = path.join(webSectionsDir, folder);
        
        // Skip if not a directory
        if (!fs.statSync(srcFolder).isDirectory()) continue;
        
        ensureDir(destFolder);
        
        // Copy section.liquid file if it exists
        const sectionFile = path.join(srcFolder, 'section.liquid');
        if (fs.existsSync(sectionFile)) {
          fs.copyFileSync(
            sectionFile, 
            path.join(destFolder, 'section.liquid')
          );
          console.log(`Copied ${folder}/section.liquid`);
        }
      }
    } else {
      console.log('Sections directory not found, creating a sample...');
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
    }

    // Build the Remix app
    console.log('Building Remix app...');
    
    // First ensure the web directory has its dependencies and MDX-related packages
    console.log('Installing web dependencies...');
    run('npm install --no-audit --loglevel=error', webDir);
    
    // Install specific MDX dependencies that might be needed
    console.log('Installing MDX dependencies...');
    run('npm install --no-audit --loglevel=error xdm@3.0.0 isbot@3.6.8', webDir);
    
    // Create an empty remix.config.js if it doesn't exist
    const remixConfigPath = path.join(webDir, 'remix.config.js');
    if (!fs.existsSync(remixConfigPath)) {
      console.log('Creating minimal remix.config.js...');
      fs.writeFileSync(
        remixConfigPath,
        `/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  ignoredRouteFiles: ["**/.*"],
  appDirectory: "app",
  assetsBuildDirectory: "public/build",
  serverBuildPath: "build/index.js",
  publicPath: "/build/"
};
`
      );
    }
    
    // Then build using Remix directly (avoiding Shopify CLI)
    run('npx remix build', webDir);

    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Run the build
build(); 