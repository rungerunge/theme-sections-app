import { useCallback } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticatedFetch } from "@shopify/app-bridge-utils";

/**
 * A hook that returns an authenticated fetch function.
 * @returns {Function} The authenticated fetch function.
 */
export function useAuthenticatedFetch() {
  const app = useAppBridge();

  return useCallback(
    async (uri, options = {}) => {
      const response = await authenticatedFetch(app)(uri, options);
      return response;
    },
    [app]
  );
} 