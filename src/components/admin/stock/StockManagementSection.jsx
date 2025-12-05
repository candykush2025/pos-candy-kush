"use client";

import { useState, useEffect } from "react";
import { productsService, categoriesService } from "@/lib/firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Package,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Filter,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

export default function StockManagementSection() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [stockFilter, setStockFilter] = useState("all"); // all, in-stock, low-stock, out-of-stock
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [hideZeroStock, setHideZeroStock] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        productsService.getAll(),
        categoriesService.getAll(),
      ]);
      // Only show products that track stock
      const stockTrackedProducts = productsData.filter((p) => p.trackStock);
      setProducts(stockTrackedProducts);
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error fetching data:", error);
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

    // Category filter
    const matchesCategory =
      selectedCategory === "all" || product.categoryId === selectedCategory;

    // Product filter (specific product selection)
    const matchesProduct =
      selectedProduct === "all" || product.id === selectedProduct;

    // Stock status filter
    let matchesStockFilter = true;
    if (stockFilter === "in-stock") {
      matchesStockFilter = product.stock && product.stock > 0 && 
        (!product.lowStock || product.stock > product.lowStock);
    } else if (stockFilter === "low-stock") {
      matchesStockFilter = product.lowStock && product.stock <= product.lowStock && product.stock > 0;
    } else if (stockFilter === "out-of-stock") {
      matchesStockFilter = !product.stock || product.stock === 0;
    }

    return matchesSearch && matchesZeroFilter && matchesCategory && matchesProduct && matchesStockFilter;
  });

  // Get products for the product dropdown (filtered by category if selected)
  const productsForDropdown = selectedCategory === "all" 
    ? products 
    : products.filter(p => p.categoryId === selectedCategory);

  // Get category name helper
  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "Uncategorized";
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedProduct("all");
    setStockFilter("all");
    setHideZeroStock(false);
  };

  const hasActiveFilters = searchQuery || selectedCategory !== "all" || selectedProduct !== "all" || stockFilter !== "all" || hideZeroStock;

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
          <div className="space-y-4">
            {/* Search Row */}
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

            {/* Filter Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Category Filter */}
              <div className="flex-1">
                <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">
                  Filter by Category
                </label>
                <Select
                  value={selectedCategory}
                  onValueChange={(value) => {
                    setSelectedCategory(value);
                    setSelectedProduct("all"); // Reset product when category changes
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Product Filter */}
              <div className="flex-1">
                <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">
                  Filter by Product
                </label>
                <Select
                  value={selectedProduct}
                  onValueChange={setSelectedProduct}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {productsForDropdown.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Stock Status Filter */}
              <div className="flex-1">
                <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">
                  Stock Status
                </label>
                <Select
                  value={stockFilter}
                  onValueChange={setStockFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="in-stock">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        In Stock
                      </span>
                    </SelectItem>
                    <SelectItem value="low-stock">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        Low Stock
                      </span>
                    </SelectItem>
                    <SelectItem value="out-of-stock">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        Out of Stock
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters & Clear */}
            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-2 border-t dark:border-gray-700">
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter className="h-4 w-4 text-neutral-500" />
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    Showing {sortedProducts.length} of {products.length} products
                  </span>
                  {selectedCategory !== "all" && (
                    <Badge variant="secondary" className="text-xs">
                      Category: {getCategoryName(selectedCategory)}
                    </Badge>
                  )}
                  {selectedProduct !== "all" && (
                    <Badge variant="secondary" className="text-xs">
                      Product: {products.find(p => p.id === selectedProduct)?.name}
                    </Badge>
                  )}
                  {stockFilter !== "all" && (
                    <Badge variant="secondary" className="text-xs">
                      Status: {stockFilter.replace("-", " ")}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              </div>
            )}
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Category
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
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">
                            {getCategoryName(product.categoryId)}
                          </Badge>
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
