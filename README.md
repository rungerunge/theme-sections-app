# OkayScale Sections

A Shopify app for managing and installing custom sections in your themes. This app is designed for internal use at OkayScale to help customers easily add pre-built sections to their themes.

## Features

- Browse available sections
- Preview section designs
- One-click installation to your active theme
- Manage installed sections

## Setup

1. Create a new app in your Shopify Partner dashboard
2. Copy your API key and API secret
3. Update the `.env` file with your credentials:
   ```
   SHOPIFY_API_KEY=your_api_key_here
   SHOPIFY_API_SECRET=your_api_secret_here
   HOST=https://your-app-domain.com
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Adding New Sections

1. Create a new directory in the `sections` folder with your section name
2. Add your section file as `section.liquid`
3. Add a preview image (optional)
4. Update the sections list in the frontend

## Development

- Frontend: React with Shopify Polaris
- Backend: Node.js with Express
- Authentication: Shopify OAuth

## Security

This app requires the following Shopify permissions:
- `read_themes`: To access the store's themes
- `write_themes`: To install sections into themes

## Support

For support, contact the OkayScale development team. 