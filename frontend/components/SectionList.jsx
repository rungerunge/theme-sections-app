import React, { useState, useEffect } from 'react';
import { Card, Popover, ActionList, Button, Grid, Text, Banner, Frame } from '@shopify/polaris';
import { motion } from 'framer-motion';

export function SectionList() {
  const [sections, setSections] = useState([
    {
      id: 'feature-1',
      title: 'Feature Section #1',
      description: 'A customizable feature section with icons and text blocks',
      preview: '/previews/feature-1.png',
      tags: ['featured', 'customizable']
    }
  ]);
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activePopoverId, setActivePopoverId] = useState(null);

  useEffect(() => {
    fetchThemes();
  }, []);

  const fetchThemes = async () => {
    try {
      const response = await fetch('/api/themes');
      if (!response.ok) throw new Error('Failed to fetch themes');
      const data = await response.json();
      setThemes(data.themes);
    } catch (err) {
      console.error('Error fetching themes:', err);
      setError('Failed to load themes. Please try again.');
    }
  };

  const handleAddSection = async (sectionId, themeId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/sections/${sectionId}/install`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ themeId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to install section');
      }
      setActivePopoverId(null);
      // Show success toast or banner
    } catch (err) {
      console.error('Error installing section:', err);
      setError('Failed to install section. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const togglePopover = (id) => {
    setActivePopoverId(activePopoverId === id ? null : id);
  };

  return (
    <Frame>
      {error && (
        <Banner status="critical" onDismiss={() => setError(null)}>
          <p>{error}</p>
        </Banner>
      )}
      
      <div className="section-grid">
        {sections.map((section) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <div className="section-card">
                <div className="section-preview">
                  <img 
                    src={section.preview}
                    alt={section.title}
                    loading="lazy"
                  />
                </div>
                
                <div className="section-content">
                  <Text variant="headingMd" as="h3">{section.title}</Text>
                  <Text variant="bodyMd" as="p" color="subdued">
                    {section.description}
                  </Text>
                  
                  <div className="section-tags">
                    {section.tags.map((tag) => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="section-actions">
                    <Popover
                      active={activePopoverId === section.id}
                      activator={
                        <Button
                          primary
                          loading={loading && activePopoverId === section.id}
                          onClick={() => togglePopover(section.id)}
                        >
                          Add to Theme
                        </Button>
                      }
                      onClose={() => setActivePopoverId(null)}
                    >
                      <ActionList
                        items={themes.map((theme) => ({
                          content: theme.name,
                          onAction: () => handleAddSection(section.id, theme.id)
                        }))}
                      />
                    </Popover>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <style jsx>{`
        .section-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          padding: 20px;
        }

        .section-card {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .section-preview {
          position: relative;
          padding-top: 56.25%; /* 16:9 aspect ratio */
          overflow: hidden;
          border-radius: 8px;
          background: #f4f6f8;
        }

        .section-preview img {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .section-card:hover .section-preview img {
          transform: scale(1.05);
        }

        .section-content {
          padding: 16px;
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .section-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: auto;
        }

        .tag {
          padding: 4px 8px;
          background: #f4f6f8;
          border-radius: 4px;
          font-size: 12px;
          color: #637381;
          text-transform: capitalize;
        }

        .section-actions {
          margin-top: 16px;
        }
      `}</style>
    </Frame>
  );
} 