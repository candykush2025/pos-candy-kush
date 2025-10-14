"use client";

import React, { useState, useEffect } from "react";
import { productsService } from "@/lib/firebase/firestore";
import { loyverseService } from "@/lib/api/loyverse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Search,
  Package,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  Database,
  ChevronDown,
  ChevronRight,
  Store,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { toast } from "sonner";

export default function StockManagementPage() {
  const [products, setProducts] = useState([]);
  const [inventoryLevels, setInventoryLevels] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productsService.getAll({
        orderBy: ["name", "asc"],
      });

      // Filter products with trackStock = true
      const trackedProducts = data.filter((p) => p.trackStock === true);
      setProducts(trackedProducts);

      console.log("📦 Loaded tracked stock products:", trackedProducts.length);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const syncInventory = async () => {
    try {
      setSyncing(true);
      toast.info("🔄 Syncing inventory levels from Loyverse...");

      let successCount = 0;
      let failCount = 0;

      // Process products in batches to avoid overwhelming the API
      const batchSize = 10;
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);

        const batchPromises = batch.map(async (product) => {
          try {
            if (!product.variantId) {
              console.warn(`Product ${product.name} has no variantId`);
              return product;
            }

            // Fetch inventory for specific variant
            const response = await loyverseService.getInventory({
              variant_ids: product.variantId,
            });

            console.log(`📊 Inventory for ${product.name}:`, response);

            // Calculate total stock across all stores for this variant
            let totalStock = 0;
            const inventoryData = [];

            if (
              response.inventory_levels &&
              response.inventory_levels.length > 0
            ) {
              response.inventory_levels.forEach((level) => {
                totalStock += level.in_stock || 0;
                inventoryData.push({
                  store_id: level.store_id,
                  in_stock: level.in_stock || 0,
                  updated_at: level.updated_at,
                });
              });
            }

            // Update product in Firebase with inventory data
            await productsService.update(product.id, {
              stock: totalStock,
              inStock: totalStock,
              inventoryLevels: inventoryData,
              lastInventorySync: new Date().toISOString(),
            });

            successCount++;
            return {
              ...product,
              stock: totalStock,
              inStock: totalStock,
              inventoryLevels: inventoryData,
            };
          } catch (error) {
            console.error(
              `Failed to sync inventory for ${product.name}:`,
              error
            );
            failCount++;
            return product;
          }
        });

        const batchResults = await Promise.all(batchPromises);

        // Update state with batch results
        setProducts((prevProducts) => {
          const updatedProducts = [...prevProducts];
          batchResults.forEach((updatedProduct, idx) => {
            const originalIndex = i + idx;
            if (originalIndex < updatedProducts.length) {
              updatedProducts[originalIndex] = updatedProduct;
            }
          });
          return updatedProducts;
        });

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < products.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      setLastSyncTime(new Date());

      if (successCount > 0) {
        toast.success(
          `✅ Synced inventory for ${successCount} items${
            failCount > 0 ? ` (${failCount} failed)` : ""
          }`
        );
      } else {
        toast.error("❌ Failed to sync any inventory");
      }
    } catch (error) {
      console.error("Inventory sync failed:", error);
      toast.error(`❌ Sync failed: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.includes(searchQuery)
  );

  // Calculate stats
  const totalProducts = filteredProducts.length;
  const lowStock = filteredProducts.filter((p) => (p.stock || 0) <= 10).length;
  const outOfStock = filteredProducts.filter(
    (p) => (p.stock || 0) === 0
  ).length;
  const totalValue = filteredProducts.reduce(
    (sum, p) => sum + (p.price || 0) * (p.stock || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stock Management</h1>
          <p className="text-gray-500 mt-2">
            Track inventory levels for stock-tracked items
          </p>
        </div>
        <Button onClick={syncInventory} disabled={syncing}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`}
          />
          {syncing ? "Syncing..." : "Sync from Loyverse"}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Items</p>
                <p className="text-2xl font-bold">{totalProducts}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Low Stock</p>
                <p className="text-2xl font-bold text-orange-600">{lowStock}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{outOfStock}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Value</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalValue)}
                </p>
              </div>
              <Database className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last Sync Info */}
      {lastSyncTime && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span>Last synced: {lastSyncTime.toLocaleString()}</span>
        </div>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, SKU, or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No tracked stock items found</p>
            <p className="text-sm text-gray-400 mt-2">
              Items with "Track Stock" enabled will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Stock Items ({filteredProducts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">
                      Product
                    </th>
                    <th className="text-left py-3 px-4 font-semibold">SKU</th>
                    <th className="text-left py-3 px-4 font-semibold">
                      Barcode
                    </th>
                    <th className="text-right py-3 px-4 font-semibold">
                      Stock Qty
                    </th>
                    <th className="text-right py-3 px-4 font-semibold">
                      Price
                    </th>
                    <th className="text-right py-3 px-4 font-semibold">
                      Value
                    </th>
                    <th className="text-center py-3 px-4 font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const stock = product.stock || 0;
                    const value = stock * (product.price || 0);
                    let stockStatus = "in-stock";
                    let stockBadge = "In Stock";
                    let badgeVariant = "default";

                    if (stock === 0) {
                      stockStatus = "out-of-stock";
                      stockBadge = "Out of Stock";
                      badgeVariant = "destructive";
                    } else if (stock <= 10) {
                      stockStatus = "low-stock";
                      stockBadge = "Low Stock";
                      badgeVariant = "secondary";
                    }

                    const hasInventoryDetails =
                      product.inventoryLevels &&
                      product.inventoryLevels.length > 0;
                    const isExpanded = expandedRows[product.id];

                    return (
                      <React.Fragment key={product.id}>
                        <tr className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {hasInventoryDetails && (
                                <button
                                  onClick={() =>
                                    setExpandedRows((prev) => ({
                                      ...prev,
                                      [product.id]: !prev[product.id],
                                    }))
                                  }
                                  className="p-1 hover:bg-gray-200 rounded"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                              {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="w-10 h-10 object-cover rounded"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                  <Package className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{product.name}</p>
                                {product.handle && (
                                  <p className="text-xs text-gray-500">
                                    @{product.handle}
                                  </p>
                                )}
                                {product.variantId && (
                                  <p className="text-xs text-gray-400">
                                    Variant: {product.variantId.slice(0, 8)}...
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {product.sku || "N/A"}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {product.barcode || "N/A"}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-semibold ${
                              stock === 0
                                ? "text-red-600"
                                : stock <= 10
                                ? "text-orange-600"
                                : "text-gray-900"
                            }`}
                          >
                            {stock}
                          </td>
                          <td className="py-3 px-4 text-right text-sm">
                            {formatCurrency(product.price || 0)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium">
                            {formatCurrency(value)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={badgeVariant} className="text-xs">
                              {stockBadge}
                            </Badge>
                          </td>
                        </tr>

                        {/* Expanded Row - Store Details */}
                        {isExpanded && hasInventoryDetails && (
                          <tr className="bg-gray-50">
                            <td colSpan="7" className="py-4 px-8">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 mb-3">
                                  <Store className="h-4 w-4 text-gray-600" />
                                  <h4 className="font-semibold text-sm">
                                    Store Inventory Levels
                                  </h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {product.inventoryLevels.map((level, idx) => (
                                    <div
                                      key={idx}
                                      className="bg-white p-3 rounded-lg border"
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-gray-500">
                                          Store ID
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          {level.store_id.slice(0, 8)}...
                                        </Badge>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">
                                          In Stock
                                        </span>
                                        <span
                                          className={`text-lg font-bold ${
                                            level.in_stock === 0
                                              ? "text-red-600"
                                              : level.in_stock <= 10
                                              ? "text-orange-600"
                                              : "text-green-600"
                                          }`}
                                        >
                                          {level.in_stock}
                                        </span>
                                      </div>
                                      {level.updated_at && (
                                        <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                                          Updated:{" "}
                                          {new Date(
                                            level.updated_at
                                          ).toLocaleString()}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
