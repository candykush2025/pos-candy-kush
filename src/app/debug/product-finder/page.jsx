"use client";

import { useState, useMemo } from "react";
import { productsService, categoriesService } from "@/lib/firebase/firestore";
import { stockHistoryService } from "@/lib/firebase/stockHistoryService";

export default function ProductFinderPage() {
  // Only allow in non-production
  if (process.env.NODE_ENV === "production") {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">
          Product & Category Finder (disabled)
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          This debug page is disabled in production.
        </p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState("products"); // "products" or "categories"
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedIds, setExpandedIds] = useState([]);

  const normalizeQuery = (q) => q?.trim().replace(/^#/, "") || "";

  const handleSearch = async () => {
    const q = normalizeQuery(query);
    if (!q) return;

    setLoading(true);
    setError(null);
    try {
      const found = {};

      if (activeTab === "products") {
        // Try as Firestore document id
        try {
          const doc = await productsService.get(q);
          if (doc) found[doc._firestoreId] = doc;
        } catch (docErr) {
          console.error(
            "Error fetching by Firestore ID:",
            docErr?.message || docErr
          );
        }

        // Also search by SKU field
        try {
          const bySku = await productsService.getAll({
            where: ["sku", "==", q],
          });
          bySku.forEach((p) => (found[p._firestoreId] = p));
        } catch (skuErr) {
          console.error("Error searching by SKU:", skuErr);
        }

        // Also search by name (case-insensitive partial match)
        try {
          const allProducts = await productsService.getAll();
          allProducts.forEach((p) => {
            if (
              p.name &&
              String(p.name).toLowerCase().includes(q.toLowerCase())
            ) {
              found[p._firestoreId] = p;
            }
          });
        } catch (nameErr) {
          console.error("Error searching by name:", nameErr);
        }

        // Process found products with additional data
        const processedResults = await Promise.all(
          Object.values(found).map(async (product) => {
            // Get stock history for cost resolution
            let stockHistory = [];
            let resolvedCost = product.cost || 0;

            try {
              stockHistory = await stockHistoryService.getProductHistory(
                product._firestoreId,
                5
              ); // Last 5 movements

              // Resolve cost from stock history if needed
              if (resolvedCost === 0 && stockHistory.length > 0) {
                const costEntry = stockHistory
                  .filter(
                    (entry) => entry.notes && entry.notes.includes("cost:")
                  )
                  .sort(
                    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
                  )[0];

                if (costEntry) {
                  const costMatch = costEntry.notes.match(
                    /cost:\s*\$?(\d+(?:\.\d{2})?)/i
                  );
                  if (costMatch) {
                    resolvedCost = parseFloat(costMatch[1]);
                  }
                }
              }
            } catch (historyError) {
              console.log(
                `Could not fetch stock history for ${product.name}:`,
                historyError.message
              );
            }

            // Calculate current stock
            const variants = product.variants || [];
            let totalStock = 0;
            if (variants.length > 0) {
              totalStock = variants.reduce((sum, v) => {
                return (
                  sum + (v.in_stock || v.inStock || v.stock || v.quantity || 0)
                );
              }, 0);
            } else {
              totalStock =
                product.in_stock ||
                product.inStock ||
                product.stock ||
                product.quantity ||
                product.inventory_level ||
                0;
            }

            return {
              ...product,
              resolvedCost,
              totalStock,
              stockHistory,
              isLowStock:
                totalStock <= (product.low_stock_threshold || 10) &&
                totalStock > 0,
              isOutOfStock: totalStock <= 0,
            };
          })
        );

        setResults(processedResults);
      } else if (activeTab === "categories") {
        // Category search logic
        // Try as Firestore document id
        try {
          const doc = await categoriesService.get(q);
          if (doc) found[doc._firestoreId] = doc;
        } catch (docErr) {
          console.error(
            "Error fetching category by Firestore ID:",
            docErr?.message || docErr
          );
        }

        // Also search by name (case-insensitive partial match)
        try {
          const allCategories = await categoriesService.getAll();
          allCategories.forEach((category) => {
            if (
              category.name &&
              String(category.name).toLowerCase().includes(q.toLowerCase())
            ) {
              found[category._firestoreId] = category;
            }
          });
        } catch (nameErr) {
          console.error("Error searching categories by name:", nameErr);
        }

        // Process found categories
        const processedResults = Object.values(found).map((category) => ({
          ...category,
          productCount: 0, // We'll calculate this if needed
        }));

        setResults(processedResults);
      }

      if (Object.keys(found).length === 0) {
        setError(`No ${activeTab.slice(0, -1)}ies found for that search term.`);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
        Product & Category Finder (Debug)
      </h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Search products by Firebase ID, SKU, or name; or categories by ID or
        name.
      </p>

      {/* Tab Navigation */}
      <div className="mt-4 flex border-b border-gray-300 dark:border-gray-600">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === "products"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
          onClick={() => {
            setActiveTab("products");
            setResults([]);
            setError(null);
            setQuery("");
          }}
        >
          Products
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === "categories"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
          onClick={() => {
            setActiveTab("categories");
            setResults([]);
            setError(null);
            setQuery("");
          }}
        >
          Categories
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className="border px-3 py-2 rounded w-80 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={
            activeTab === "products"
              ? "Enter product ID, SKU, or name"
              : "Enter category ID or name"
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button
          className="btn btn-primary px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? "Searching..." : "Search"}
        </button>
        {activeTab === "products" && (
          <button
            className="px-3 py-2 border rounded text-sm text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={() => setQuery("vsQEA0TCA2CWrsxNN3vn")}
          >
            Load example ID
          </button>
        )}
      </div>

      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Tip: Search by Firebase document ID or name. Click a row to view
        detailed JSON data.
      </div>

      {error && (
        <div className="mt-4 text-red-600 dark:text-red-400">
          Error: {error}
        </div>
      )}

      {/* Search Results Table */}
      {results.length > 0 && (
        <div className="mt-4">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Found {results.length} {activeTab.slice(0, -1)}
            {results.length > 1 ? "ies" : "y"}.
          </div>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  {activeTab === "products" ? (
                    <>
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-white">
                        Product Name
                      </th>
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-white">
                        SKU
                      </th>
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right text-gray-900 dark:text-white">
                        Price
                      </th>
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right text-gray-900 dark:text-white">
                        Cost
                      </th>
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right text-gray-900 dark:text-white">
                        Stock
                      </th>
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-white">
                        Status
                      </th>
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-white">
                        Firebase ID
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-white">
                        Category Name
                      </th>
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-white">
                        Description
                      </th>
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-white">
                        Color
                      </th>
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-white">
                        Icon
                      </th>
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-white">
                        Firebase ID
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {results.map((item) => (
                  <>
                    <tr
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900 cursor-pointer"
                      onClick={() => {
                        const isExpanded = expandedIds.includes(
                          item._firestoreId
                        );
                        setExpandedIds((prev) =>
                          isExpanded
                            ? prev.filter((id) => id !== item._firestoreId)
                            : [...prev, item._firestoreId]
                        );
                      }}
                    >
                      {activeTab === "products" ? (
                        <>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-white">
                            {item.name || "Unnamed Product"}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-white">
                            {item.sku || "N/A"}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right text-gray-900 dark:text-white">
                            ฿{Number(item.price || 0).toFixed(2)}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right text-gray-900 dark:text-white">
                            ฿{Number(item.resolvedCost || 0).toFixed(2)}
                            {item.resolvedCost !== (item.cost || 0) && (
                              <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">
                                (resolved)
                              </span>
                            )}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right text-gray-900 dark:text-white">
                            {item.totalStock}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-white">
                            {item.isOutOfStock ? (
                              <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-xs">
                                Out of Stock
                              </span>
                            ) : item.isLowStock ? (
                              <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded text-xs">
                                Low Stock
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                                In Stock
                              </span>
                            )}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 max-w-xs truncate text-gray-900 dark:text-white">
                            {item._firestoreId}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-white">
                            {item.name || "Unnamed Category"}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-white">
                            {item.description || "N/A"}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-white">
                            {item.color || "N/A"}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-white">
                            {item.icon || "N/A"}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 max-w-xs truncate text-gray-900 dark:text-white">
                            {item._firestoreId}
                          </td>
                        </>
                      )}
                    </tr>

                    {expandedIds.includes(item._firestoreId) && (
                      <tr>
                        <td
                          colSpan={activeTab === "products" ? 7 : 5}
                          className="border border-gray-300 dark:border-gray-600 px-4 py-4 bg-gray-50 dark:bg-gray-800"
                        >
                          <div className="text-sm">
                            <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">
                              Full{" "}
                              {activeTab === "products"
                                ? "Product"
                                : "Category"}{" "}
                              Data:
                            </h4>
                            <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs overflow-x-auto text-gray-900 dark:text-white">
                              {JSON.stringify(item, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6">
        {results.length === 0 && !loading && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            No results
          </div>
        )}
      </div>
    </div>
  );
}
