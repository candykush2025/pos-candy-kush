"use client";

import { useProducts, useCustomers, useCategories } from "@/hooks/useFirebaseServices";
import { refreshAllData, logCacheStats } from "@/lib/fresh-data";
import { useState } from "react";

/**
 * Example Component: Optimized Data Loading
 * 
 * This component demonstrates:
 * 1. Using optimized hooks that ALWAYS fetch latest data
 * 2. Manual refresh capabilities
 * 3. Performance monitoring
 * 4. Loading states and error handling
 */
export default function OptimizedDataExample() {
  const [refreshing, setRefreshing] = useState(false);

  // ALWAYS gets latest products from server (no cache)
  const {
    data: products,
    isLoading: productsLoading,
    error: productsError,
    refetch: refetchProducts,
    isFetching: productsFetching,
  } = useProducts();

  // ALWAYS gets latest customers from server (no cache)
  const {
    data: customers,
    isLoading: customersLoading,
    error: customersError,
    refetch: refetchCustomers,
    isFetching: customersFetching,
  } = useCustomers();

  // ALWAYS gets latest categories from server (no cache)
  const {
    data: categories,
    isLoading: categoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
    isFetching: categoriesFetching,
  } = useCategories();

  // Force refresh all data from server
  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      console.log("🔄 Manually refreshing all data...");
      await refreshAllData();
      console.log("✅ All data refreshed!");
    } catch (error) {
      console.error("❌ Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Show cache statistics in console
  const handleShowStats = () => {
    logCacheStats();
  };

  const isLoading = productsLoading || customersLoading || categoriesLoading;
  const isFetching = productsFetching || customersFetching || categoriesFetching;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Optimized Firebase Data Loading</h1>
        <div className="flex gap-2">
          <button
            onClick={handleRefreshAll}
            disabled={refreshing || isFetching}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {refreshing || isFetching ? "Refreshing..." : "🔄 Refresh All"}
          </button>
          <button
            onClick={handleShowStats}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            📊 Show Stats
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          ⏳ Loading latest data from server...
        </div>
      )}

      {/* Fetching Indicator (when refetching in background) */}
      {!isLoading && isFetching && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
          🔄 Fetching fresh data from server...
        </div>
      )}

      {/* Products Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            Products {productsFetching && <span className="text-sm text-gray-500">(updating...)</span>}
          </h2>
          <button
            onClick={() => refetchProducts()}
            className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            🔄 Refresh
          </button>
        </div>
        
        {productsError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            ❌ Error loading products: {productsError.message}
          </div>
        )}

        {products && (
          <div>
            <p className="text-lg mb-2">
              Total: <strong>{products.length}</strong> products
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ✅ Data fetched directly from server (no cache)
            </p>
          </div>
        )}
      </div>

      {/* Customers Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            Customers {customersFetching && <span className="text-sm text-gray-500">(updating...)</span>}
          </h2>
          <button
            onClick={() => refetchCustomers()}
            className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            🔄 Refresh
          </button>
        </div>

        {customersError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            ❌ Error loading customers: {customersError.message}
          </div>
        )}

        {customers && (
          <div>
            <p className="text-lg mb-2">
              Total: <strong>{customers.length}</strong> customers
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ✅ Data fetched directly from server (no cache)
            </p>
          </div>
        )}
      </div>

      {/* Categories Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            Categories {categoriesFetching && <span className="text-sm text-gray-500">(updating...)</span>}
          </h2>
          <button
            onClick={() => refetchCategories()}
            className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            🔄 Refresh
          </button>
        </div>

        {categoriesError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            ❌ Error loading categories: {categoriesError.message}
          </div>
        )}

        {categories && (
          <div>
            <p className="text-lg mb-2">
              Total: <strong>{categories.length}</strong> categories
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ✅ Data fetched directly from server (no cache)
            </p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 p-6 rounded-lg">
        <h3 className="font-semibold mb-2">💡 How This Works</h3>
        <ul className="space-y-2 text-sm">
          <li>✅ <strong>Always Fresh Data:</strong> Every query fetches from Firebase server (no old cache)</li>
          <li>✅ <strong>Auto Refresh:</strong> Data refreshes when you refocus the window</li>
          <li>✅ <strong>Network Aware:</strong> Automatically refetches when internet reconnects</li>
          <li>✅ <strong>Fast Loading:</strong> Optimized with bundle splitting and lazy loading</li>
          <li>✅ <strong>Performance Tracking:</strong> Check console for timing metrics</li>
        </ul>
      </div>

      {/* Performance Tips */}
      <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 p-6 rounded-lg">
        <h3 className="font-semibold mb-2">⚡ Performance Tips</h3>
        <ul className="space-y-2 text-sm">
          <li>• Open browser console to see detailed performance metrics</li>
          <li>• Click "Show Stats" to see React Query cache statistics</li>
          <li>• Each section can be refreshed individually for faster updates</li>
          <li>• Data loads in parallel for maximum speed</li>
        </ul>
      </div>
    </div>
  );
}
