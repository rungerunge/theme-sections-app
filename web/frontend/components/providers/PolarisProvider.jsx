import { AppProvider } from "@shopify/polaris";
import { useNavigate } from "@shopify/app-bridge-react";
import translations from "@shopify/polaris/locales/en.json";
import "@shopify/polaris/build/esm/styles.css";

export function PolarisProvider({ children }) {
  return (
    <AppProvider i18n={translations}>
      {children}
    </AppProvider>
  );
} 