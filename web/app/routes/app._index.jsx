import { useEffect } from "react";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Layout, Card, ResourceList } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return json({
    sections: [
      {
        id: "todo-list",
        title: "Todo List Section",
        description: "A customizable todo list section for your store",
        preview: "/section-previews/todo-list/preview.png"
      }
    ]
  });
};

export default function Index() {
  const { sections } = useLoaderData();

  useEffect(() => {
    // Initialize any app bridge features here
  }, []);

  return (
    <Page title="Section Store">
      <Layout>
        <Layout.Section>
          <Card>
            <ResourceList
              items={sections}
              renderItem={(section) => (
                <ResourceList.Item
                  id={section.id}
                  media={
                    <img 
                      src={section.preview}
                      alt={section.title}
                      style={{ width: 100, height: 100, objectFit: "cover" }}
                    />
                  }
                >
                  <h3>{section.title}</h3>
                  <p>{section.description}</p>
                </ResourceList.Item>
              )}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
} 