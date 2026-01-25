"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/lib/query-client";
import { useEffect } from "react";

/**
 * Optimized Query Provider with Performance Monitoring
 * IMPORTANT: Configured to ALWAYS fetch fresh data (no old cached data)
 */
export function OptimizedQueryProvider({ children }) {
  useEffect(() => {
    // Log when the query client is ready
    console.log("🚀 Optimized Query Provider initialized");
    console.log("📊 Query Client Config:", {
      staleTime: 0, // Always fetch fresh data
      gcTime: 0, // Don't keep old data
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    });

    // Monitor query cache
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "success") {
        console.log(
          `✅ Query "${event.query.queryKey.join("-")}" updated successfully`,
        );
      }
      if (event.type === "updated" && event.action.type === "error") {
        console.error(
          `❌ Query "${event.query.queryKey.join("-")}" failed:`,
          event.action.error,
        );
      }
    });

    // Cleanup
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* React Query DevTools (only in development) */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
