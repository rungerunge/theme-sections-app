import React, { useState, useEffect } from 'react';
import { Card, ResourceList, ResourceItem, TextStyle, Button } from '@shopify/polaris';

export function SectionList() {
  const [sections, setSections] = useState([
    {
      id: 'feature-1',
      title: 'Feature Section #1',
      description: 'A customizable feature section with icons and text blocks',
      preview: '/previews/feature-1.png'
    }
  ]);

  const handleAddSection = async (sectionId) => {
    try {
      const response = await fetch(`/api/sections/${sectionId}/install`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to install section');
      }

      // Show success message
    } catch (error) {
      console.error('Error installing section:', error);
      // Show error message
    }
  };

  return (
    <Card title="Available Sections">
      <ResourceList
        items={sections}
        renderItem={(section) => (
          <ResourceItem
            id={section.id}
            media={
              <img 
                src={section.preview}
                alt={section.title}
                style={{ width: '100%', maxWidth: '200px' }}
              />
            }
            accessibilityLabel={`View details for ${section.title}`}
          >
            <h3>
              <TextStyle variation="strong">{section.title}</TextStyle>
            </h3>
            <div>{section.description}</div>
            <Button primary onClick={() => handleAddSection(section.id)}>
              Add to Theme
            </Button>
          </ResourceItem>
        )}
      />
    </Card>
  );
} 