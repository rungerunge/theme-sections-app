import { useEffect, useState } from "react";
import {
  Page,
  Layout,
  Card,
  Button,
  ResourceList,
  ResourceItem,
  Text,
  Banner,
  Loading,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";

export async function loader({ request }) {
  await authenticate.admin(request);
  return json({ ok: true });
}

export default function Index() {
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load available sections
    fetch('/api/sections')
      .then(res => res.json())
      .then(data => {
        setSections(data.sections || []);
        setIsLoading(false);
      })
      .catch(err => {
        setError("Failed to load sections");
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <Page title="Theme Sections">
      <Layout>
        {error && (
          <Layout.Section>
            <Banner status="critical">{error}</Banner>
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