/**
 * Fresh Data Utilities
 * CRITICAL: These utilities ensure you ALWAYS get the latest data from Firebase
 * NO OLD CACHED DATA - Everything is fetched from server
 */

import { queryClient } from "@/lib/query-client";

/**
 * Force refresh all queries to get latest data from server
 * Use this when you need to ensure all data is up-to-date
 */
export const refreshAllData = async () => {
  console.log("🔄 Forcing refresh of ALL data from server...");

  const startTime = performance.now();

  try {
    // Invalidate all queries (marks them as stale)
    await queryClient.invalidateQueries();

    // Refetch all active queries
    await queryClient.refetchQueries({
      type: "active",
    });

    const endTime = performance.now();
    console.log(
      `✅ All data refreshed from server in ${(endTime - startTime).toFixed(2)}ms`,
    );
  } catch (error) {
    console.error("❌ Failed to refresh all data:", error);
    throw error;
  }
};

/**
 * Force refresh specific query by key
 * Use this when you need to update specific data
 */
export const refreshQuery = async (queryKey) => {
  console.log(`🔄 Forcing refresh of "${queryKey}" from server...`);

  try {
    await queryClient.invalidateQueries({ queryKey: [queryKey] });
    await queryClient.refetchQueries({ queryKey: [queryKey] });

    console.log(`✅ "${queryKey}" refreshed from server`);
  } catch (error) {
    console.error(`❌ Failed to refresh "${queryKey}":`, error);
    throw error;
  }
};

/**
 * Force refresh products data
 */
export const refreshProducts = () => refreshQuery("products");

/**
 * Force refresh customers data
 */
export const refreshCustomers = () => refreshQuery("customers");

/**
 * Force refresh categories data
 */
export const refreshCategories = () => refreshQuery("categories");

/**
 * Force refresh cashback rules
 */
export const refreshCashbackRules = () => refreshQuery("cashback-rules");

/**
 * Clear all cached data completely
 * This removes everything from the cache
 */
export const clearAllCache = () => {
  console.log("🗑️ Clearing ALL cached data...");
  queryClient.clear();
  console.log("✅ Cache cleared");
};

/**
 * Get cache statistics for debugging
 */
export const getCacheStats = () => {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();

  const stats = {
    totalQueries: queries.length,
    activeQueries: queries.filter((q) => q.state.status === "success").length,
    stalQueries: queries.filter(
      (q) => q.state.status === "success" && q.isStale(),
    ).length,
    errorQueries: queries.filter((q) => q.state.status === "error").length,
    queries: queries.map((q) => ({
      key: q.queryKey,
      status: q.state.status,
      isStale: q.isStale(),
      dataUpdatedAt: q.state.dataUpdatedAt
        ? new Date(q.state.dataUpdatedAt).toLocaleString()
        : null,
      isFetching: q.state.isFetching,
    })),
  };

  return stats;
};

/**
 * Log cache stats to console
 */
export const logCacheStats = () => {
  const stats = getCacheStats();
  console.log("📊 Cache Statistics:", stats);
  return stats;
};

/**
 * Monitor query updates in real-time (for debugging)
 */
export const startQueryMonitoring = () => {
  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (event.type === "added") {
      console.log("➕ Query added:", event.query.queryKey);
    }
    if (event.type === "removed") {
      console.log("➖ Query removed:", event.query.queryKey);
    }
    if (event.type === "updated") {
      if (event.action.type === "success") {
        console.log("✅ Query updated:", event.query.queryKey);
      }
      if (event.action.type === "error") {
        console.error(
          "❌ Query error:",
          event.query.queryKey,
          event.action.error,
        );
      }
      if (event.action.type === "fetch") {
        console.log("🔄 Query fetching:", event.query.queryKey);
      }
    }
  });

  console.log("👀 Query monitoring started");
  return unsubscribe;
};

/**
 * Hook version for React components
 */
export const useFreshData = () => {
  return {
    refreshAll: refreshAllData,
    refreshQuery,
    refreshProducts,
    refreshCustomers,
    refreshCategories,
    refreshCashbackRules,
    clearCache: clearAllCache,
    getCacheStats,
    logCacheStats,
  };
};

export default {
  refreshAllData,
  refreshQuery,
  refreshProducts,
  refreshCustomers,
  refreshCategories,
  refreshCashbackRules,
  clearAllCache,
  getCacheStats,
  logCacheStats,
  startQueryMonitoring,
};
