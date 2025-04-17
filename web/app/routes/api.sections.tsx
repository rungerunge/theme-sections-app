import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import fs from 'fs/promises';
import path from 'path';

interface Section {
  id: string;
  title: string;
  description: string;
  categories: string[];
  price: string;
  previewUrl?: string;
}

export const loader: LoaderFunction = async () => {
  try {
    // Try multiple paths to find the sections directory
    const possiblePaths = [
      path.join(process.cwd(), '..', 'sections'),
      path.join(process.cwd(), 'sections'),
      path.join(process.cwd(), 'public', 'sections')
    ];
    
    let sectionsDir = '';
    let directoryExists = false;
    
    // Find the first path that exists
    for (const dirPath of possiblePaths) {
      try {
        await fs.access(dirPath);
        sectionsDir = dirPath;
        directoryExists = true;
        console.log(`Found sections directory at: ${dirPath}`);
        break;
      } catch (e) {
        console.log(`Sections directory not found at: ${dirPath}`);
      }
    }
    
    if (!directoryExists) {
      console.warn('No sections directory found, returning sample data');
      // Return sample sections since we couldn't find the directory
      return json([
        {
          id: 'faq-1',
          title: 'FAQ #1',
          description: 'Expandable FAQ section with accordion functionality.',
          previewUrl: '/section-previews/faq-1/preview.png',
          price: 'Free',
          categories: ['faq', 'free']
        },
        {
          id: 'hero-banner',
          title: 'Hero Banner',
          description: 'A full-width hero banner with text overlay and button.',
          previewUrl: '/section-previews/hero-banner/preview.png',
          price: 'Free',
          categories: ['hero', 'free']
        },
        {
          id: 'todo-list',
          title: 'Todo List',
          description: 'A simple todo list component with add, edit, and delete functionality.',
          previewUrl: '/section-previews/todo-list/preview.png',
          price: 'Free',
          categories: ['features', 'free']
        }
      ]);
    }
    
    // List all sections in the directory
    const items = await fs.readdir(sectionsDir);
    const sections: Section[] = [];
    
    for (const item of items) {
      const sectionDir = path.join(sectionsDir, item);
      const stats = await fs.stat(sectionDir);
      
      if (stats.isDirectory()) {
        try {
          // Try to read metadata file
          const metadataPath = path.join(sectionDir, 'metadata.json');
          let metadata: Partial<Section> = {};
          
          try {
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            metadata = JSON.parse(metadataContent);
          } catch (e) {
            console.log(`No metadata file found for section: ${item}`);
          }
          
          // Ensure the section has the required liquid file
          const sectionPath = path.join(sectionDir, 'section.liquid');
          await fs.access(sectionPath);
          
          // Find preview file
          const files = await fs.readdir(sectionDir);
          const previewFile = files.find(file => file.startsWith('preview.'));
          
          // Check if preview exists in public directory
          const publicPreviewPath = path.join(process.cwd(), 'public', 'section-previews', item);
          let previewUrl: string | undefined = undefined;
          
          try {
            await fs.access(publicPreviewPath);
            // If directory exists, check for preview file
            const publicFiles = await fs.readdir(publicPreviewPath);
            const publicPreview = publicFiles.find(file => file.startsWith('preview.'));
            if (publicPreview) {
              previewUrl = `/section-previews/${item}/${publicPreview}`;
            }
          } catch (e) {
            console.log(`No public preview found for section: ${item}`);
          }
          
          // Add section to list
          sections.push({
            id: item,
            title: metadata.title || item,
            description: metadata.description || 'No description available',
            categories: metadata.categories || ['general'],
            price: metadata.price || 'Free',
            previewUrl: previewUrl || (previewFile ? `/section-previews/${item}/${previewFile}` : undefined)
          });
        } catch (e) {
          console.log(`Error processing section: ${item}`, e);
        }
      }
    }
    
    return json(sections);
  } catch (error) {
    console.error("Error fetching sections:", error);
    return json({ error: (error as Error).message }, { status: 500 });
  }
};

export default function Sections() {
  return null;
} 