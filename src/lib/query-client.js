import { QueryClient } from "@tanstack/react-query";

/**
 * React Query Client Configuration
 * IMPORTANT: Configured to ALWAYS fetch fresh data from server
 * No caching of old data - always gets latest from Firebase
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // CRITICAL: Always fetch fresh data - NO STALE DATA
      staleTime: 0, // Data is immediately stale - always refetch
      gcTime: 0, // Don't keep data in cache - always fresh
      refetchOnMount: true, // Always refetch when component mounts
      refetchOnWindowFocus: true, // Refetch when window regains focus
      refetchOnReconnect: true, // Refetch when reconnecting to internet

      // Retry configuration for reliability
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 2 times for network/server errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        console.error("Mutation error:", error);
      },
    },
  },
});

/**
 * Clear all cached data and force fresh fetch
 */
export const forceFreshData = () => {
  queryClient.invalidateQueries();
  queryClient.refetchQueries();
};

/**
 * Get query status for debugging
 */
export const getQueryStatus = (queryKey) => {
  const query = queryClient.getQueryState(queryKey);
  return {
    status: query?.status,
    dataUpdatedAt: query?.dataUpdatedAt,
    error: query?.error,
    isFetching: query?.isFetching,
  };
};
