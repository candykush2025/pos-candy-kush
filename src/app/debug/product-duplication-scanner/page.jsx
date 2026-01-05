"use client";

import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { productsService } from "@/lib/firebase/firestore";
import { useProducts } from "@/hooks/useReportData";
import { format, isValid } from "date-fns";
import { QUERY_KEYS } from "@/lib/cache/queryClient";
import { reportsCacheDB } from "@/lib/cache/reportsCacheDB";

// Helper function to safely parse dates
function safeParseDate(dateValue) {
  if (!dateValue) return null;

  try {
    // Handle Firestore Timestamp objects
    if (dateValue?.toDate && typeof dateValue.toDate === "function") {
      const parsed = dateValue.toDate();
      return isValid(parsed) ? parsed : null;
    }

    // Handle already Date objects
    if (dateValue instanceof Date) {
      return isValid(dateValue) ? dateValue : null;
    }

    // Handle Firestore Timestamp-like objects with seconds and nanoseconds
    if (dateValue?.seconds !== undefined) {
      const parsed = new Date(dateValue.seconds * 1000);
      return isValid(parsed) ? parsed : null;
    }

    // Handle string/number dates
    const parsed = new Date(dateValue);
    return isValid(parsed) && !isNaN(parsed.getTime()) ? parsed : null;
  } catch (error) {
    console.log("Error parsing date:", dateValue, typeof dateValue, error);
    return null;
  }
}

// Helper function to get creation date from product
function getProductCreationDate(product) {
  const possibleFields = [
    "createdAt",
    "created_at",
    "date",
    "created",
    "timestamp",
    "updatedAt",
    "updated_at",
  ];

  for (const field of possibleFields) {
    const dateValue = product[field];
    if (dateValue) {
      console.log(
        `Trying field "${field}" for product "${product.name}":`,
        dateValue,
        typeof dateValue
      );
      const parsed = safeParseDate(dateValue);
      if (parsed) {
        console.log(
          `✅ Found valid date in field "${field}" for product "${product.name}":`,
          parsed
        );
        return parsed;
      } else {
        console.log(
          `❌ Failed to parse field "${field}" for product "${product.name}"`
        );
      }
    }
  }

  console.warn(
    `⚠️ No valid creation date found for product "${product.name}" (ID: ${
      product._firestoreId || product.id
    }). Available fields:`,
    Object.keys(product)
  );
  return null;
}

// Helper function to safely format dates - tries multiple possible date fields
function safeFormatDate(product, formatString = "yyyy-MM-dd HH:mm:ss") {
  // Try different possible date field names
  const possibleFields = [
    "createdAt",
    "created_at",
    "date",
    "created",
    "timestamp",
    "updatedAt",
    "updated_at",
  ];

  for (const field of possibleFields) {
    const dateValue = product[field];
    if (dateValue) {
      const parsed = safeParseDate(dateValue);
      if (parsed) {
        try {
          return format(parsed, formatString);
        } catch (error) {
          console.log(
            `Error formatting date for field ${field}:`,
            parsed,
            error
          );
          continue;
        }
      }
    }
  }

  // If no valid date found, show available fields in the UI for debugging
  const allFields = Object.keys(product);
  const datelikeFields = allFields.filter(
    (key) =>
      key.toLowerCase().includes("date") ||
      key.toLowerCase().includes("time") ||
      key.toLowerCase().includes("created") ||
      key.toLowerCase().includes("updated")
  );

  if (datelikeFields.length > 0) {
    return `N/A (has: ${datelikeFields.join(", ")})`;
  }

  return "N/A (no date fields)";
}

// Function to find duplicate products
function findDuplicateProducts(products) {
  const duplicates = {
    byName: new Map(),
    bySKU: new Map(),
    byBarcode: new Map(),
  };

  products.forEach((product) => {
    const name = product.name?.trim().toLowerCase();
    const sku = product.sku?.trim().toLowerCase();
    const barcode = product.barcode?.trim().toLowerCase();

    // Group by name
    if (name) {
      if (!duplicates.byName.has(name)) {
        duplicates.byName.set(name, []);
      }
      duplicates.byName.get(name).push(product);
    }

    // Group by SKU
    if (sku) {
      if (!duplicates.bySKU.has(sku)) {
        duplicates.bySKU.set(sku, []);
      }
      duplicates.bySKU.get(sku).push(product);
    }

    // Group by barcode
    if (barcode) {
      if (!duplicates.byBarcode.has(barcode)) {
        duplicates.byBarcode.set(barcode, []);
      }
      duplicates.byBarcode.get(barcode).push(product);
    }
  });

  // Filter to only show groups with more than 1 product
  const result = {
    byName: Array.from(duplicates.byName.entries())
      .filter(([_, products]) => products.length > 1)
      .map(([name, products]) => ({
        key: name,
        type: "name",
        displayName: products[0].name, // Keep original casing
        products: products.sort((a, b) => {
          const aDate = getProductCreationDate(a);
          const bDate = getProductCreationDate(b);

          // Sort null dates to the end
          if (!aDate && !bDate) return 0;
          if (!aDate) return 1;
          if (!bDate) return -1;

          return aDate - bDate; // Sort by creation date ascending
        }),
      })),
    bySKU: Array.from(duplicates.bySKU.entries())
      .filter(([_, products]) => products.length > 1)
      .map(([sku, products]) => ({
        key: sku,
        type: "sku",
        displayName: products[0].sku, // Keep original casing
        products: products.sort((a, b) => {
          const aDate = getProductCreationDate(a);
          const bDate = getProductCreationDate(b);

          // Sort null dates to the end
          if (!aDate && !bDate) return 0;
          if (!aDate) return 1;
          if (!bDate) return -1;

          return aDate - bDate;
        }),
      })),
    byBarcode: Array.from(duplicates.byBarcode.entries())
      .filter(([_, products]) => products.length > 1)
      .map(([barcode, products]) => ({
        key: barcode,
        type: "barcode",
        displayName: products[0].barcode, // Keep original casing
        products: products.sort((a, b) => {
          const aDate = getProductCreationDate(a);
          const bDate = getProductCreationDate(b);

          // Sort null dates to the end
          if (!aDate && !bDate) return 0;
          if (!aDate) return 1;
          if (!bDate) return -1;

          return aDate - bDate;
        }),
      })),
  };

  return result;
}

export default function ProductDuplicationScannerPage() {
  // Only allow in non-production
  if (process.env.NODE_ENV === "production") {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">
          Product Duplication Scanner (disabled)
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          This debug page is disabled in production.
        </p>
      </div>
    );
  }

  const {
    data: products = [],
    isLoading: productsLoading,
    refetch,
  } = useProducts();
  const queryClient = useQueryClient();

  const [deletingId, setDeletingId] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState([]);
  const [filterType, setFilterType] = useState("all"); // all, name, sku, barcode
  const [error, setError] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);

  // Find duplicates
  const duplicates = useMemo(() => {
    if (!products.length) return { byName: [], bySKU: [], byBarcode: [] };
    return findDuplicateProducts(products);
  }, [products]);

  // Combine all duplicates for display
  const allDuplicates = useMemo(() => {
    const all = [
      ...duplicates.byName.map((group) => ({ ...group, category: "Name" })),
      ...duplicates.bySKU.map((group) => ({ ...group, category: "SKU" })),
      ...duplicates.byBarcode.map((group) => ({
        ...group,
        category: "Barcode",
      })),
    ];

    // Filter by type if specified
    if (filterType === "all") return all;
    return all.filter((group) => group.type === filterType);
  }, [duplicates, filterType]);

  const handleDelete = async (firestoreId) => {
    if (!firestoreId) {
      alert("Invalid product ID");
      return;
    }

    console.log("Attempting to delete product:", firestoreId);

    if (
      !confirm(
        `Delete product (ID: ${firestoreId}) from Firestore? This cannot be undone.`
      )
    ) {
      console.log("Delete cancelled by user");
      return;
    }

    setDeletingId(firestoreId);
    setError(null);

    try {
      console.log("Calling productsService.delete...");
      await productsService.delete(firestoreId);
      console.log("✅ Product deleted successfully from Firestore");

      // Clear the IndexedDB cache
      console.log("Clearing IndexedDB products cache...");
      await reportsCacheDB.clearProductsCache();

      // Invalidate React Query cache
      console.log("Invalidating React Query cache...");
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PRODUCTS_ALL,
      });

      // Force immediate refetch
      console.log("Forcing refetch...");
      await refetch();

      console.log("✅ All caches cleared and data refetched");
      alert("Product deleted successfully!");
    } catch (err) {
      console.error("❌ Error deleting product:", err);
      const errorMsg = err?.message || String(err);
      setError(`Failed to delete product: ${errorMsg}`);
      alert(`Error deleting product: ${errorMsg}`);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleGroupExpansion = (groupKey) => {
    setExpandedGroups((prev) =>
      prev.includes(groupKey)
        ? prev.filter((key) => key !== groupKey)
        : [...prev, groupKey]
    );
  };

  const handleSelectProduct = (productId) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAllInGroup = (group, checked) => {
    const productIds = group.products.map((p) => p._firestoreId || p.id);
    if (checked) {
      setSelectedProducts((prev) => [...new Set([...prev, ...productIds])]);
    } else {
      setSelectedProducts((prev) =>
        prev.filter((id) => !productIds.includes(id))
      );
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedProducts.length === 0) {
      alert("No products selected");
      return;
    }

    if (
      !confirm(
        `Delete ${selectedProducts.length} selected product${
          selectedProducts.length > 1 ? "s" : ""
        } from Firestore? This cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingId("multiple");
    setError(null);

    let successCount = 0;
    let errorCount = 0;

    try {
      console.log("🗑️ Deleting multiple products:", selectedProducts);

      for (const productId of selectedProducts) {
        try {
          console.log(`Deleting product ${productId}...`);
          await productsService.delete(productId);
          console.log(`✅ Product ${productId} deleted successfully`);
          successCount++;
        } catch (err) {
          console.error(`❌ Failed to delete product ${productId}:`, err);
          errorCount++;
        }
      }

      console.log(`✅ Deleted ${successCount} products, ${errorCount} failed`);

      // Clear the IndexedDB cache
      console.log("Clearing IndexedDB products cache...");
      await reportsCacheDB.clearProductsCache();

      // Invalidate React Query cache
      console.log("Invalidating React Query cache...");
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PRODUCTS_ALL,
      });

      // Force immediate refetch
      console.log("Forcing refetch...");
      await refetch();

      console.log("✅ All caches cleared and data refetched");

      // Clear selection
      setSelectedProducts([]);

      if (errorCount === 0) {
        alert(
          `Successfully deleted ${successCount} product${
            successCount > 1 ? "s" : ""
          }!`
        );
      } else {
        alert(
          `Deleted ${successCount} product${
            successCount > 1 ? "s" : ""
          }, but ${errorCount} failed. Check console for details.`
        );
      }
    } catch (err) {
      console.error("❌ Error in bulk delete:", err);
      const errorMsg = err?.message || String(err);
      setError(`Failed to delete products: ${errorMsg}`);
      alert(`Error deleting products: ${errorMsg}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
        Product Duplication Scanner (Debug)
      </h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Scan for duplicate products by name, SKU, or barcode and view creation
        dates.
      </p>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
          <div className="text-red-600 dark:text-red-400 font-semibold">
            Error:
          </div>
          <div className="text-red-600 dark:text-red-400 text-sm mt-1">
            {error}
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <div className="mt-4 flex gap-4 items-center">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Filter by duplication type:
        </label>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border px-3 py-2 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          <option value="name">Name</option>
          <option value="sku">SKU</option>
          <option value="barcode">Barcode</option>
        </select>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {products.length}
          </div>
          <div className="text-sm text-blue-600 dark:text-blue-400">
            Total Products
          </div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {duplicates.byName.length}
          </div>
          <div className="text-sm text-red-600 dark:text-red-400">
            Name Duplicates
          </div>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {duplicates.bySKU.length}
          </div>
          <div className="text-sm text-orange-600 dark:text-orange-400">
            SKU Duplicates
          </div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {duplicates.byBarcode.length}
          </div>
          <div className="text-sm text-purple-600 dark:text-purple-400">
            Barcode Duplicates
          </div>
        </div>
      </div>

      {/* Loading State */}
      {productsLoading ? (
        <div className="mt-8 text-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Loading products...
          </div>
        </div>
      ) : (
        <>
          {/* Bulk Actions */}
          {allDuplicates.length > 0 && (
            <div className="mt-6 flex items-center gap-4">
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={
                  selectedProducts.length === 0 || deletingId === "multiple"
                }
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {deletingId === "multiple" ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>🗑️ Delete Selected ({selectedProducts.length})</>
                )}
              </button>
              {selectedProducts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedProducts([])}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors"
                >
                  Clear Selection
                </button>
              )}
            </div>
          )}

          {/* Results */}
          {allDuplicates.length === 0 ? (
            <div className="mt-8 text-center">
              <div className="text-lg text-green-600 dark:text-green-400 font-semibold">
                ✅ No duplicate products found!
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                All products appear to be unique based on name, SKU, and
                barcode.
              </div>
            </div>
          ) : (
            <div className="mt-8">
              <div className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                Found {allDuplicates.length} duplicate group
                {allDuplicates.length > 1 ? "s" : ""}.
              </div>

              <div className="space-y-4">
                {allDuplicates.map((group, groupIndex) => (
                  <div
                    key={`${group.type}-${group.key}`}
                    className="border border-gray-300 dark:border-gray-600 rounded-lg"
                  >
                    {/* Group Header */}
                    <div
                      className="bg-gray-100 dark:bg-gray-800 p-4 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 rounded-t-lg"
                      onClick={() =>
                        toggleGroupExpansion(`${group.type}-${group.key}`)
                      }
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {group.category}: {group.displayName}
                          </span>
                          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                            ({group.products.length} duplicates)
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {expandedGroups.includes(`${group.type}-${group.key}`)
                            ? "▼"
                            : "▶"}
                        </div>
                      </div>
                    </div>

                    {/* Group Details */}
                    {expandedGroups.includes(`${group.type}-${group.key}`) && (
                      <div className="p-4 bg-white dark:bg-gray-900">
                        <div className="overflow-x-auto">
                          <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                            <thead>
                              <tr className="bg-gray-50 dark:bg-gray-800">
                                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-white">
                                  <input
                                    type="checkbox"
                                    checked={group.products.every((p) =>
                                      selectedProducts.includes(
                                        p._firestoreId || p.id
                                      )
                                    )}
                                    onChange={(e) =>
                                      handleSelectAllInGroup(
                                        group,
                                        e.target.checked
                                      )
                                    }
                                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                                  />
                                </th>
                                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-white">
                                  Product Name
                                </th>
                                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-white">
                                  SKU
                                </th>
                                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-white">
                                  Barcode
                                </th>
                                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-white">
                                  Created Date
                                </th>
                                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right text-gray-900 dark:text-white">
                                  Price
                                </th>
                                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right text-gray-900 dark:text-white">
                                  Stock
                                </th>
                                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-white">
                                  Firestore ID
                                </th>
                                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-white">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.products.map((product, index) => (
                                <tr
                                  key={product._firestoreId || product.id}
                                  className="hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-white">
                                    <input
                                      type="checkbox"
                                      checked={selectedProducts.includes(
                                        product._firestoreId || product.id
                                      )}
                                      onChange={() =>
                                        handleSelectProduct(
                                          product._firestoreId || product.id
                                        )
                                      }
                                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                                    />
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-white">
                                    {product.name || "N/A"}
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-white">
                                    {product.sku || "N/A"}
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-white">
                                    {product.barcode || "N/A"}
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-white">
                                    {safeFormatDate(product)}
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right text-gray-900 dark:text-white">
                                    ฿{Number(product.price || 0).toFixed(2)}
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right text-gray-900 dark:text-white">
                                    {product.stock || 0}
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 max-w-xs truncate text-gray-900 dark:text-white">
                                    {product._firestoreId || product.id}
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-white">
                                    <button
                                      type="button"
                                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const productId =
                                          product._firestoreId || product.id;
                                        console.log(
                                          "Delete button clicked for:",
                                          productId,
                                          product.name
                                        );
                                        handleDelete(productId);
                                      }}
                                      disabled={
                                        deletingId ===
                                        (product._firestoreId || product.id)
                                      }
                                    >
                                      {deletingId ===
                                      (product._firestoreId || product.id)
                                        ? "Deleting..."
                                        : "Delete"}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Raw JSON for first product in group */}
                        <div className="mt-4">
                          <details className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                            <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                              View raw JSON (first product)
                            </summary>
                            <pre className="mt-2 text-xs overflow-auto max-h-60 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white p-2 rounded">
                              {JSON.stringify(group.products[0], null, 2)}
                            </pre>
                          </details>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
