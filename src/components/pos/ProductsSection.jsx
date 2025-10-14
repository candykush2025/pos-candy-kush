"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Package, Search, RefreshCw, PackageSearch, Hash } from "lucide-react";
import { productsService, categoriesService } from "@/lib/firebase/firestore";
import { formatCurrency } from "@/lib/utils/format";

export default function ProductsSection() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productData, categoryData] = await Promise.all([
        productsService.getAll({ orderBy: ["name", "asc"] }),
        categoriesService.getAll(),
      ]);
      setProducts(productData);
      setCategories(categoryData);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  const categoryLookup = useMemo(() => {
    return categories.reduce((acc, category) => {
      acc[category.id] = category.name;
      return acc;
    }, {});
  }, [categories]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;

    return products.filter((product) => {
      const categoryName = categoryLookup[product.category] || product.category;
      return [product.name, product.sku, product.barcode, categoryName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [products, searchQuery, categoryLookup]);

  return (
    <div className="h-full flex flex-col p-6 overflow-auto">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            Products Management
          </h1>
          <p className="text-gray-500 mt-2">
            Browse the products synced from Loyverse and Firebase
          </p>
        </div>
        <div className="flex w-full max-w-lg items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name, SKU, barcode, or category..."
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-gray-500">
          <PackageSearch className="h-10 w-10 animate-pulse" />
          <span>Loading products...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <PackageSearch className="mx-auto mb-4 h-16 w-16 text-gray-400" />
            <h2 className="text-xl font-bold mb-2">No products found</h2>
            <p className="text-gray-500">
              Try adjusting your search or sync products from the admin portal.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => {
            const categoryName =
              categoryLookup[product.category] ||
              product.category ||
              "Unassigned";
            const lowStock =
              typeof product.stock === "number" && product.stock <= 5;

            return (
              <Card key={product.id} className="flex flex-col justify-between">
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-xl font-semibold">
                      {product.name}
                    </CardTitle>
                    <Badge variant="secondary">{categoryName}</Badge>
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(product.price || 0)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Stock</span>
                    <Badge variant={lowStock ? "destructive" : "outline"}>
                      {typeof product.stock === "number"
                        ? product.stock
                        : "N/A"}
                    </Badge>
                  </div>
                  {(product.sku || product.barcode) && (
                    <div className="flex flex-col gap-1">
                      {product.sku && (
                        <span className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-gray-400" /> SKU:{" "}
                          {product.sku}
                        </span>
                      )}
                      {product.barcode && (
                        <span className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-gray-400" /> Barcode:{" "}
                          {product.barcode}
                        </span>
                      )}
                    </div>
                  )}
                  {product.description && (
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {product.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
