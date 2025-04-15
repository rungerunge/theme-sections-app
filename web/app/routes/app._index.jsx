import { useState, useEffect } from "react";
import {
  Page,
  Layout,
  Card,
  LegacyCard,
  Grid,
  Text,
  Button,
  Banner,
  Modal,
  Select,
  Thumbnail,
  Box,
  SkeletonBodyText,
  LegacyStack,
  Tag,
  ButtonGroup
} from "@shopify/polaris";
import { ImageMajor } from '@shopify/polaris-icons';

export default function Index() {
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [themes, setThemes] = useState([]);
  const [selectedThemeId, setSelectedThemeId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  
  // Fetch themes on component mount
  useEffect(() => {
    const fetchThemes = async () => {
      try {
        const response = await fetch("/api/themes");
        if (response.ok) {
          const data = await response.json();
          setThemes(data.themes);
          // Set default selected theme to the main/active theme
          const activeTheme = data.themes.find(theme => theme.role === 'main');
          if (activeTheme) {
            setSelectedThemeId(activeTheme.id.toString());
          }
        }
      } catch (err) {
        console.error("Error fetching themes:", err);
      }
    };
    
    fetchThemes();
  }, []);

  const sections = [
    {
      id: "featured-collection",
      title: "Featured Collection",
      description: "Display a collection of products in a grid layout",
      previewUrl: "/section-previews/featured-collection.png",
      tags: ["Products", "Featured"]
    },
    {
      id: "hero-banner",
      title: "Hero Banner",
      description: "A full-width banner with text overlay and call-to-action",
      previewUrl: "/section-previews/hero-banner.png",
      tags: ["Banner", "Hero"]
    },
    {
      id: "test-section",
      title: "Test Section",
      description: "A simple test section for development purposes",
      previewUrl: "/section-previews/test-section.png",
      tags: ["Test", "Development"]
    }
  ];

  const handleOpenModal = (section) => {
    setSelectedSection(section);
    setModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedSection(null);
  };

  const handleInstallSection = async () => {
    if (!selectedSection || !selectedThemeId) return;
    
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/sections/install", {
        method: "POST",
        body: JSON.stringify({ 
          sectionId: selectedSection.id,
          themeId: selectedThemeId
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to install section");
      }

      setSuccessMessage(`Successfully installed ${selectedSection.title} section to your theme!`);
      handleCloseModal();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page title="Section Store">
      <Layout>
        {error && (
          <Layout.Section>
            <Banner status="critical" onDismiss={() => setError("")}>
              {error}
            </Banner>
          </Layout.Section>
        )}
        {successMessage && (
          <Layout.Section>
            <Banner status="success" onDismiss={() => setSuccessMessage("")}>
              {successMessage}
            </Banner>
          </Layout.Section>
        )}
        
        <Layout.Section>
          <Text variant="headingLg" as="h2">
            Browse Available Sections
          </Text>
          <Box paddingBlock="4">
            <Text variant="bodyMd" as="p">
              Add custom sections to your Shopify theme with one click. Select a section to preview and install.
            </Text>
          </Box>
        </Layout.Section>

        <Layout.Section>
          <Grid>
            {sections.map((section) => (
              <Grid.Cell key={section.id} columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 3 }}>
                <LegacyCard sectioned>
                  <LegacyCard.Section>
                    <div style={{ position: 'relative' }}>
                      {section.previewUrl ? (
                        <img
                          src={section.previewUrl}
                          alt={section.title}
                          style={{ 
                            width: "100%", 
                            borderRadius: "8px",
                            aspectRatio: "16/9",
                            objectFit: "cover"
                          }}
                        />
                      ) : (
                        <div style={{ 
                          backgroundColor: "#f6f6f7", 
                          borderRadius: "8px", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center",
                          aspectRatio: "16/9"
                        }}>
                          <ImageMajor color="base" />
                        </div>
                      )}
                    </div>
                  </LegacyCard.Section>
                  
                  <LegacyCard.Section>
                    <Text variant="headingMd" as="h3">
                      {section.title}
                    </Text>
                    <Box paddingBlockStart="2" paddingBlockEnd="2">
                      <Text variant="bodyMd" as="p" color="subdued">
                        {section.description}
                      </Text>
                    </Box>
                    <LegacyStack spacing="tight">
                      {section.tags && section.tags.map(tag => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </LegacyStack>
                  </LegacyCard.Section>
                  
                  <LegacyCard.Section>
                    <Button 
                      fullWidth 
                      primary 
                      onClick={() => handleOpenModal(section)}
                    >
                      Preview & Install
                    </Button>
                  </LegacyCard.Section>
                </LegacyCard>
              </Grid.Cell>
            ))}
          </Grid>
        </Layout.Section>
      </Layout>

      {selectedSection && (
        <Modal
          open={modalOpen}
          onClose={handleCloseModal}
          title={`Install ${selectedSection.title}`}
          primaryAction={{
            content: "Install Section",
            onAction: handleInstallSection,
            loading: loading
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: handleCloseModal,
            },
          ]}
        >
          <Modal.Section>
            <LegacyStack vertical spacing="loose">
              <div style={{ textAlign: "center" }}>
                {selectedSection.previewUrl ? (
                  <img
                    src={selectedSection.previewUrl}
                    alt={selectedSection.title}
                    style={{ 
                      maxWidth: "100%", 
                      borderRadius: "8px",
                      maxHeight: "300px",
                      objectFit: "contain"
                    }}
                  />
                ) : (
                  <div style={{ 
                    backgroundColor: "#f6f6f7", 
                    borderRadius: "8px", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    height: "300px"
                  }}>
                    <ImageMajor color="base" size="large" />
                  </div>
                )}
              </div>
              
              <div>
                <Text variant="headingMd" as="h3">
                  {selectedSection.title}
                </Text>
                <Text variant="bodyMd" as="p">
                  {selectedSection.description}
                </Text>
              </div>
              
              <Select
                label="Select theme"
                options={themes.map(theme => ({ 
                  label: `${theme.name}${theme.role === 'main' ? ' (active)' : ''}`, 
                  value: theme.id.toString() 
                }))}
                value={selectedThemeId}
                onChange={setSelectedThemeId}
                helpText="Choose which theme to install this section to"
              />
            </LegacyStack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
} 