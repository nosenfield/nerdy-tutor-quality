"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * Dashboard Layout with TanStack Query Provider
 * 
 * Wraps all dashboard pages with QueryClientProvider for data fetching.
 * QueryClient is created once and reused across renders.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Create QueryClient once and reuse it
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
            retry: 2,
            retryDelay: 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

