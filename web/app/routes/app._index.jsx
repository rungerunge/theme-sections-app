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
  Spinner,
  LegacyStack,
  Tag,
  ButtonGroup,
  BlockStack,
  InlineStack
} from "@shopify/polaris";
import { ImageMajor } from '@shopify/polaris-icons';
import { useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";

// Load data from the server - this happens on the server, never in the browser
export async function loader({ request }) {
  // This automatically handles authentication
  const { admin } = await authenticate.admin(request);
  
  try {
    // Get themes to populate the select dropdown
    const themesResponse = await admin.rest.get({
      path: 'themes',
    });
    
    // Get the active theme as the default
    const themes = themesResponse.data;
    const activeTheme = themes.find(theme => theme.role === 'main') || (themes.length > 0 ? themes[0] : null);
    
    return json({
      themes: themes,
      activeThemeId: activeTheme ? activeTheme.id.toString() : '',
      error: null
    });
  } catch (error) {
    console.error("Error in loader:", error);
    return json({
      themes: [],
      activeThemeId: '',
      error: error.message
    });
  }
}

export default function Index() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [themes, setThemes] = useState([]);
  const [selectedThemeId, setSelectedThemeId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [loadingThemes, setLoadingThemes] = useState(true);
  
  // Fetch themes on component mount
  useEffect(() => {
    const fetchThemes = async () => {
      try {
        setLoadingThemes(true);
        const response = await fetch("/api/themes");
        if (response.ok) {
          const data = await response.json();
          setThemes(data.themes || []);
          
          // Set default selected theme to the main/active theme
          const activeTheme = data.themes?.find(theme => theme.role === 'main');
          if (activeTheme) {
            setSelectedThemeId(activeTheme.id.toString());
          } else if (data.themes?.length > 0) {
            // Fallback to first theme if no active theme
            setSelectedThemeId(data.themes[0].id.toString());
          }
        } else {
          const errorData = await response.json();
          setError(errorData.error || "Failed to load themes");
        }
      } catch (err) {
        console.error("Error fetching themes:", err);
        setError("Failed to load themes. Please refresh the page.");
      } finally {
        setLoadingThemes(false);
      }
    };
    
    fetchThemes();
  }, []);

  // Our available sections
  const sections = [
    {
      id: "featured-collection",
      title: "Featured Collection",
      description: "Display a collection of products in a grid layout. Perfect for showcasing your best products on any page.",
      previewUrl: "/section-previews/featured-collection.png",
      tags: ["Products", "Featured", "Grid"]
    },
    {
      id: "hero-banner",
      title: "Hero Banner",
      description: "A full-width banner with text overlay and call-to-action button. Great for announcing promotions or new collections.",
      previewUrl: "/section-previews/hero-banner.png",
      tags: ["Banner", "Hero", "Marketing"]
    },
    {
      id: "test-section",
      title: "Test Section",
      description: "A simple test section with configurable heading and content. Use this to experiment with the section capabilities.",
      previewUrl: "/section-previews/test-section.png",
      tags: ["Test", "Simple", "Configurable"]
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
      console.error("Installation error:", err);
      setError(err.message || "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loadingThemes) {
    return (
      <Page title="Section Store">
        <Layout>
          <Layout.Section>
            <LegacyCard sectioned>
              <LegacyCard.Section>
                <div style={{ padding: "16px" }}>
                  <Text as="p" fontWeight="bold">Loading themes...</Text>
                  <div style={{ textAlign: "center", margin: "40px 0" }}>
                    <Spinner accessibilityLabel="Loading themes" size="large" />
                  </div>
                </div>
              </LegacyCard.Section>
            </LegacyCard>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

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
          <BlockStack gap="4">
            <Text variant="headingLg" as="h2">
              Browse Available Sections
            </Text>
            <Text variant="bodyMd" as="p">
              Add custom sections to your Shopify theme with one click. Select a section to preview and install.
            </Text>
          </BlockStack>
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
                    <BlockStack gap="2">
                      <Text variant="headingMd" as="h3">
                        {section.title}
                      </Text>
                      <Text variant="bodyMd" as="p" color="subdued">
                        {section.description}
                      </Text>
                      <LegacyStack spacing="tight">
                        {section.tags && section.tags.map(tag => (
                          <Tag key={tag}>{tag}</Tag>
                        ))}
                      </LegacyStack>
                    </BlockStack>
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
              
              <BlockStack gap="4">
                <Text variant="headingMd" as="h3">
                  {selectedSection.title}
                </Text>
                <Text variant="bodyMd" as="p">
                  {selectedSection.description}
                </Text>
              </BlockStack>
              
              <Select
                label="Select theme"
                options={themes.map(theme => ({ 
                  label: `${theme.name}${theme.role === 'main' ? ' (active)' : ''}`, 
                  value: theme.id.toString() 
                }))}
                value={selectedThemeId}
                onChange={setSelectedThemeId}
                helpText="Choose which theme to install this section to"
                disabled={themes.length === 0}
              />
              
              {themes.length === 0 && (
                <Banner status="warning">
                  No themes found. Please make sure you have at least one theme installed in your store.
                </Banner>
              )}
            </LegacyStack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
} 