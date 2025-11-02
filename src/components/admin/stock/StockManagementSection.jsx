"use client";

import { useState, useEffect } from "react";
import { productsService } from "@/lib/firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  Package,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

export default function StockManagementSection() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [hideZeroStock, setHideZeroStock] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const productsData = await productsService.getAll();
      // Only show products that track stock
      const stockTrackedProducts = productsData.filter((p) => p.trackStock);
      setProducts(stockTrackedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      product.name?.toLowerCase().includes(searchLower) ||
      product.sku?.toLowerCase().includes(searchLower) ||
      product.barcode?.toLowerCase().includes(searchLower);

    const matchesZeroFilter =
      !hideZeroStock || (product.stock && product.stock > 0);

    return matchesSearch && matchesZeroFilter;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    // Handle undefined/null values
    if (aVal === undefined || aVal === null) aVal = "";
    if (bVal === undefined || bVal === null) bVal = "";

    // Handle numeric fields
    if (
      sortField === "stock" ||
      sortField === "lowStock" ||
      sortField === "price"
    ) {
      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
    }

    if (sortDirection === "asc") {
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    } else {
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    }
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 text-neutral-400" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4 ml-1 text-primary" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1 text-primary" />
    );
  };

  const getLowStockProducts = () => {
    return sortedProducts.filter(
      (p) => p.trackStock && p.lowStock && p.stock <= p.lowStock
    );
  };

  const getOutOfStockProducts = () => {
    return sortedProducts.filter(
      (p) => p.trackStock && (!p.stock || p.stock === 0)
    );
  };

  const getStockStatus = (product) => {
    if (!product.trackStock) return null;
    if (!product.stock || product.stock === 0) {
      return { label: "Out of Stock", color: "bg-red-500" };
    }
    if (product.lowStock && product.stock <= product.lowStock) {
      return { label: "Low Stock", color: "bg-yellow-500" };
    }
    return { label: "In Stock", color: "bg-green-500" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-neutral-500">Loading stock levels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stock Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Total Products
                </p>
                <p className="text-2xl font-bold dark:text-white">
                  {sortedProducts.length}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Low Stock
                </p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">
                  {getLowStockProducts().length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Out of Stock
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-500">
                  {getOutOfStockProducts().length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search by name, SKU, or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={hideZeroStock ? "default" : "outline"}
              onClick={() => setHideZeroStock(!hideZeroStock)}
              className="whitespace-nowrap"
            >
              {hideZeroStock ? (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Show Zero Stock
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide Zero Stock
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          {sortedProducts.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
              <p className="text-neutral-500 dark:text-neutral-400">
                {searchQuery
                  ? "No products found"
                  : hideZeroStock
                  ? "No products with stock"
                  : "No products with stock tracking"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-gray-800 border-b dark:border-gray-700">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 dark:hover:bg-gray-700"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center">
                        Product Name
                        {getSortIcon("name")}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 dark:hover:bg-gray-700"
                      onClick={() => handleSort("sku")}
                    >
                      <div className="flex items-center">
                        SKU
                        {getSortIcon("sku")}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 dark:hover:bg-gray-700"
                      onClick={() => handleSort("stock")}
                    >
                      <div className="flex items-center">
                        Current Stock
                        {getSortIcon("stock")}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 dark:hover:bg-gray-700"
                      onClick={() => handleSort("lowStock")}
                    >
                      <div className="flex items-center">
                        Low Stock Level
                        {getSortIcon("lowStock")}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 dark:hover:bg-gray-700"
                      onClick={() => handleSort("price")}
                    >
                      <div className="flex items-center">
                        Price
                        {getSortIcon("price")}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-neutral-200 dark:divide-gray-700">
                  {sortedProducts.map((product) => {
                    const status = getStockStatus(product);
                    return (
                      <tr
                        key={product.id}
                        className="hover:bg-neutral-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-neutral-900 dark:text-white">
                            {product.name}
                          </div>
                          {product.barcode && (
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                              Barcode: {product.barcode}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">
                          {product.sku || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-lg font-bold text-neutral-900 dark:text-white">
                            {product.stock || 0}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">
                          {product.lowStock || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-neutral-900 dark:text-white">
                            {formatCurrency(product.price)}
                          </div>
                          {product.cost && (
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                              Cost: {formatCurrency(product.cost)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {status && (
                            <Badge
                              className={`${status.color} text-white text-xs`}
                            >
                              {status.label}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
