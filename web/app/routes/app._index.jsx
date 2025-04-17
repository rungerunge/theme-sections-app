import { useEffect, useState } from "react";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { 
  Page, 
  Layout, 
  Card, 
  Tabs, 
  Grid, 
  Text, 
  Box, 
  Button, 
  Popover, 
  ActionList, 
  Icon, 
  Spinner,
  TextField
} from "@shopify/polaris";
import { SearchIcon, ImageIcon, StarFilledIcon, FlameIcon, DiamondIcon, ChatIcon, PlayIcon, QuestionIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { motion } from "framer-motion";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Fetch themes
  let themes = [];
  try {
    const response = await admin.rest.get({
      path: 'themes',
    });
    themes = response.data;
  } catch (error) {
    console.error("Error fetching themes:", error);
  }

  return json({
    sections: [
      {
        id: "testimonial-8",
        title: "Testimonial #8",
        description: "A modern testimonial section with customer ratings.",
        preview: "/section-previews/testimonial-8.png",
        tags: ["testimonial", "free"]
      },
      {
        id: "product-tabs",
        title: "Product Tabs",
        description: "Tabbed interface for product details and information.",
        preview: "/section-previews/product-tabs.png",
        tags: ["features", "free"]
      },
      {
        id: "video-banner",
        title: "Video Banner",
        description: "Full-width video background banner with text overlay.",
        preview: "/section-previews/video-banner.png",
        tags: ["hero", "video", "free"]
      },
      {
        id: "slider-2",
        title: "Slider 2",
        description: "Responsive image slider with navigation controls.",
        preview: "/section-previews/slider-2.png",
        tags: ["slider", "free"]
      },
      {
        id: "testimonial-35",
        title: "Testimonial 35",
        description: "Minimalist testimonial display with author information.",
        preview: "/section-previews/testimonial-35.png",
        tags: ["testimonial", "free"]
      },
      {
        id: "video-grid-5",
        title: "Video Grid 5",
        description: "Grid layout for featuring multiple videos.",
        preview: "/section-previews/video-grid-5.png",
        tags: ["video", "grid", "free"]
      },
      {
        id: "faq-1",
        title: "Frequently Asked Questions",
        description: "Expandable FAQ section with accordion functionality.",
        preview: "/section-previews/faq-1.png",
        tags: ["faq", "free"]
      }
    ],
    themes: themes || []
  });
};

export default function Index() {
  const { sections, themes } = useLoaderData();
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchValue, setSearchValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [activePopoverId, setActivePopoverId] = useState(null);
  const [selectedSections, setSelectedSections] = useState([]);

  const handleTabChange = (selectedTabIndex) => {
    setSelectedTab(selectedTabIndex);
  };

  const handleSearch = (value) => {
    setSearchValue(value);
  };

  const handleAddToMySection = (section) => {
    setSelectedSections([...selectedSections, section]);
  };

  const handleAddToTheme = async (sectionId, themeId) => {
    setLoading(true);
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
      
      // Success feedback
      setActivePopoverId(null);
    } catch (error) {
      console.error('Error installing section:', error);
      // Error feedback
    } finally {
      setLoading(false);
    }
  };

  const togglePopover = (id) => {
    setActivePopoverId(activePopoverId === id ? null : id);
  };

  const tabs = [
    {
      id: "explore",
      content: "Explore Sections",
      icon: SearchIcon
    },
    {
      id: "mySections",
      content: "My Sections",
      icon: StarFilledIcon
    },
  ];

  const categoryFilters = [
    { label: "Popular", icon: StarFilledIcon },
    { label: "Trending", icon: FlameIcon },
    { label: "Newest", icon: StarFilledIcon },
    { label: "Free", icon: DiamondIcon },
    { label: "Features", icon: DiamondIcon },
    { label: "Testimonial", icon: ChatIcon },
    { label: "Hero", icon: ImageIcon },
    { label: "Video", icon: PlayIcon },
    { label: "FAQ", icon: QuestionIcon },
  ];

  const filteredSections = searchValue 
    ? sections.filter(section => 
        section.title.toLowerCase().includes(searchValue.toLowerCase()) ||
        section.description.toLowerCase().includes(searchValue.toLowerCase()) ||
        section.tags.some(tag => tag.toLowerCase().includes(searchValue.toLowerCase()))
      )
    : sections;

  return (
    <Page title="">
      <div className="section-store-container">
        <div className="section-store-header">
          <div className="logo-container">
            <div className="logo-icon">
              <img 
                src="/icon.svg" 
                alt="Section Store Logo" 
                width={40} 
                height={40}
              />
            </div>
            <Text variant="headingXl" as="h1">Section Store</Text>
          </div>

          <div className="theme-selector">
            <select className="theme-dropdown">
              <option>Demo 15-4-2025 (Live)</option>
              {themes.map(theme => (
                <option key={theme.id} value={theme.id}>
                  {theme.name} {theme.role === 'main' ? '(Live)' : ''}
                </option>
              ))}
            </select>

            <Button primary>Use Theme</Button>
          </div>
        </div>

        <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange} />

        <div className="search-container">
          <div className="search-field">
            <TextField
              placeholder="Search for sections"
              value={searchValue}
              onChange={handleSearch}
              prefix={<Icon source={SearchIcon} />}
              clearButton
              onClearButtonClick={() => setSearchValue("")}
            />
          </div>
        </div>

        <div className="category-filters">
          {categoryFilters.map((filter, index) => (
            <div 
              key={index} 
              className={`category-filter-item ${index === 0 ? 'active' : ''}`}
            >
              <div className="filter-icon">
                <Icon source={filter.icon} />
              </div>
              <span>{filter.label}</span>
            </div>
          ))}
        </div>

        {selectedTab === 0 ? (
          <div className="sections-grid">
            {filteredSections.map((section) => (
              <motion.div
                key={section.id}
                className="section-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card padding="0">
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
                            onClick={() => togglePopover(section.id)}
                            primary
                            loading={loading && activePopoverId === section.id}
                            fullWidth
                          >
                            Add to Theme
                          </Button>
                        }
                        onClose={() => setActivePopoverId(null)}
                      >
                        <div className="popover-header">
                          <Text variant="headingMd">Select Theme</Text>
                        </div>
                        <ActionList
                          items={themes.map((theme) => ({
                            content: theme.name + (theme.role === 'main' ? ' (Live)' : ''),
                            onAction: () => handleAddToTheme(section.id, theme.id)
                          }))}
                        />
                      </Popover>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="my-sections-container">
            {selectedSections.length > 0 ? (
              <div className="sections-grid">
                {selectedSections.map((section) => (
                  <motion.div
                    key={section.id}
                    className="section-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card padding="0">
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
                        
                        <div className="section-actions">
                          <Popover
                            active={activePopoverId === `my-${section.id}`}
                            activator={
                              <Button
                                onClick={() => togglePopover(`my-${section.id}`)}
                                primary
                                loading={loading && activePopoverId === `my-${section.id}`}
                                fullWidth
                              >
                                Add to Theme
                              </Button>
                            }
                            onClose={() => setActivePopoverId(null)}
                          >
                            <div className="popover-header">
                              <Text variant="headingMd">Select Theme</Text>
                            </div>
                            <ActionList
                              items={themes.map((theme) => ({
                                content: theme.name + (theme.role === 'main' ? ' (Live)' : ''),
                                onAction: () => handleAddToTheme(section.id, theme.id)
                              }))}
                            />
                          </Popover>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-container">
                  <Text variant="headingMd" as="h2">My Sections</Text>
                  <Text variant="bodyMd" as="p" color="subdued">
                    The sections you own will show here.
                  </Text>
                  
                  <div className="empty-state-action">
                    <Card>
                      <Card.Section>
                        <Text variant="headingMd" as="h3">Theme editor</Text>
                        <Text variant="bodyMd" as="p">
                          You can add and edit sections on any theme in your store. After adding section to theme, customize it from theme editor.
                        </Text>
                      </Card.Section>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .section-store-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .section-store-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .theme-selector {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .theme-dropdown {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .search-container {
          margin: 20px 0;
        }

        .search-field {
          max-width: 100%;
        }

        .category-filters {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          overflow-x: auto;
          padding-bottom: 8px;
        }

        .category-filter-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          padding: 8px 16px;
          border-radius: 8px;
          transition: background-color 0.2s;
        }

        .category-filter-item:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }

        .category-filter-item.active {
          background-color: rgba(0, 0, 0, 0.08);
        }

        .filter-icon {
          color: #5c5f62;
        }

        .sections-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          margin-top: 24px;
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
          border-radius: 8px 8px 0 0;
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
          margin-bottom: 16px;
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
          margin-top: 8px;
        }

        .popover-header {
          padding: 12px 16px;
          border-bottom: 1px solid #ddd;
        }

        .empty-state {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
        }

        .empty-state-container {
          max-width: 600px;
          width: 100%;
        }

        .empty-state-action {
          margin-top: 20px;
        }
      `}</style>
    </Page>
  );
} 