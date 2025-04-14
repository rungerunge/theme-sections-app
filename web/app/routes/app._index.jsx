import { useState } from "react";
import {
  Page,
  Layout,
  Card,
  ResourceList,
  ResourceItem,
  Text,
  Button,
  Banner,
} from "@shopify/polaris";

export default function Index() {
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const sections = [
    {
      id: "featured-collection",
      title: "Featured Collection",
      description: "Display a collection of products in a grid layout",
      previewUrl: "/section-previews/featured-collection.png",
    },
    {
      id: "hero-banner",
      title: "Hero Banner",
      description: "A full-width banner with text overlay and call-to-action",
      previewUrl: "/section-previews/hero-banner.png",
    },
  ];

  const handleInstallSection = async (sectionId) => {
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/sections/install", {
        method: "POST",
        body: JSON.stringify({ sectionId }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to install section");
      }

      setSuccessMessage(`Successfully installed ${sectionId} section!`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Page title="Theme Sections">
      <Layout>
        {error && (
          <Layout.Section>
            <Banner status="critical">{error}</Banner>
          </Layout.Section>
        )}
        {successMessage && (
          <Layout.Section>
            <Banner status="success">{successMessage}</Banner>
          </Layout.Section>
        )}
        <Layout.Section>
          <Card>
            <ResourceList
              items={sections}
              renderItem={(section) => (
                <ResourceItem
                  id={section.id}
                  media={
                    <img
                      src={section.previewUrl}
                      alt={section.title}
                      style={{ width: "100%", maxWidth: "200px" }}
                    />
                  }
                >
                  <Text variant="headingMd" as="h3">
                    {section.title}
                  </Text>
                  <Text variant="bodyMd" as="p">
                    {section.description}
                  </Text>
                  <div style={{ marginTop: "1rem" }}>
                    <Button
                      primary
                      onClick={() => handleInstallSection(section.id)}
                    >
                      Install Section
                    </Button>
                  </div>
                </ResourceItem>
              )}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
} 