import { useEffect, useState } from "react";
import {
  Card,
  Page,
  Layout,
  TextContainer,
  Image,
  Stack,
  Heading,
  Select,
  Button,
  ButtonGroup,
  CalloutCard,
  Banner,
  Text,
  Frame,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useAuthenticatedFetch } from "../hooks";

export default function HomePage() {
  const fetch = useAuthenticatedFetch();
  const [themes, setThemes] = useState([]);
  const [selectedThemeId, setSelectedThemeId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [installResult, setInstallResult] = useState(null);
  const [sections, setSections] = useState([
    {
      id: "test-section",
      title: "Test Section",
      description: "A simple test section with configurable heading and content.",
      tags: ["Test", "Simple", "Configurable"],
      image: "/section-previews/test-section.png",
      fallbackImage: "https://burst.shopifycdn.com/photos/flatlay-iron-skillet-with-meat-vegetables.jpg?width=500"
    }
  ]);

  // Fetch themes on component mount
  useEffect(() => {
    fetchThemes();
  }, []);

  async function fetchThemes() {
    try {
      const response = await fetch("/api/themes");
      const data = await response.json();
      
      if (data.success && data.themes) {
        setThemes(data.themes);
        
        // Auto-select the active theme
        const activeTheme = data.themes.find(theme => theme.role === "main");
        if (activeTheme) {
          setSelectedThemeId(activeTheme.id.toString());
        }
      } else {
        console.error("Error fetching themes:", data.error || "Unknown error");
      }
    } catch (error) {
      console.error("Error fetching themes:", error);
    }
  }

  async function handleInstall(sectionId) {
    setIsLoading(true);
    setInstallResult(null);
    
    try {
      const response = await fetch("/api/sections/install", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sectionId,
          themeId: selectedThemeId,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setInstallResult({
          status: "success",
          message: `Successfully installed ${sectionId} to theme "${data.themeName}"`,
        });
      } else {
        setInstallResult({
          status: "error",
          message: data.error || data.message || "Unknown error",
        });
      }
    } catch (error) {
      setInstallResult({
        status: "error",
        message: error.message || "An error occurred during installation",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const themeOptions = themes.map(theme => ({
    label: theme.name + (theme.role === "main" ? " (Current theme)" : ""),
    value: theme.id.toString(),
  }));

  return (
    <Frame>
      <Page>
        <TitleBar title="Section Store" />
        <Layout>
          <Layout.Section>
            <CalloutCard
              title="Install custom sections to your theme"
              illustration="https://cdn.shopify.com/s/assets/admin/checkout/settings-customizecart-705f57c725ac05be5a34ec20c05b94298cb8afd10aac7bd9c7ad02030f48cfa0.svg"
              primaryAction={{
                content: "Learn more about theme sections",
                url: "https://shopify.dev/themes/architecture/sections",
                external: true
              }}
            >
              <p>
                Add custom functionality to your theme with pre-built sections.
                Select a theme below and click "Install" on any section to add it.
              </p>
            </CalloutCard>
          </Layout.Section>
          
          <Layout.Section>
            <Card>
              <Card.Section>
                <Stack>
                  <Stack.Item fill>
                    <Heading>Select Theme</Heading>
                  </Stack.Item>
                  <Stack.Item>
                    <Select
                      label=""
                      options={themeOptions}
                      onChange={setSelectedThemeId}
                      value={selectedThemeId}
                      disabled={themeOptions.length === 0}
                    />
                  </Stack.Item>
                </Stack>
              </Card.Section>
              
              {installResult && (
                <Card.Section>
                  <Banner
                    title={installResult.status === "success" ? "Success" : "Error"}
                    status={installResult.status === "success" ? "success" : "critical"}
                    onDismiss={() => setInstallResult(null)}
                  >
                    <p>{installResult.message}</p>
                  </Banner>
                </Card.Section>
              )}
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Heading>Available Sections</Heading>
          </Layout.Section>

          {sections.map(section => (
            <Layout.Section key={section.id} oneHalf>
              <Card>
                <Card.Section>
                  <div style={{ height: "200px", display: "flex", justifyContent: "center", alignItems: "center", background: "#f6f6f7", borderRadius: "8px", overflow: "hidden" }}>
                    <img 
                      src={section.image} 
                      alt={section.title}
                      onError={(e) => { e.target.onerror = null; e.target.src = section.fallbackImage; }}
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "cover" }}
                    />
                  </div>
                </Card.Section>
                <Card.Section>
                  <Heading>{section.title}</Heading>
                  <TextContainer>
                    <p>{section.description}</p>
                    <Stack spacing="tight">
                      {section.tags.map(tag => (
                        <span key={tag} style={{ 
                          display: "inline-block", 
                          background: "#f6f6f7", 
                          padding: "4px 8px", 
                          borderRadius: "4px", 
                          fontSize: "12px",
                          marginRight: "4px",
                          marginBottom: "4px"
                        }}>
                          {tag}
                        </span>
                      ))}
                    </Stack>
                  </TextContainer>
                </Card.Section>
                <Card.Section>
                  <Button 
                    primary 
                    fullWidth 
                    onClick={() => handleInstall(section.id)} 
                    loading={isLoading}
                    disabled={!selectedThemeId || isLoading}
                  >
                    {isLoading ? "Installing..." : "Install Section"}
                  </Button>
                </Card.Section>
              </Card>
            </Layout.Section>
          ))}
        </Layout>
      </Page>
    </Frame>
  );
} 