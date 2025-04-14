import React from 'react';
import { Page, Layout, Card } from '@shopify/polaris';
import { SectionList } from '../components/SectionList';

export default function Index() {
  return (
    <Page title="OkayScale Sections">
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <p>Welcome to OkayScale Sections! Browse and add sections to your theme.</p>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <SectionList />
        </Layout.Section>
      </Layout>
    </Page>
  );
} 