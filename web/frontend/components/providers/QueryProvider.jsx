import { QueryClient, QueryClientProvider } from "react-query";

export function QueryProvider({ children }) {
  const client = new QueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
} 