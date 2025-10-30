"use client";

import { useState, useEffect } from "react";
import { productsService } from "@/lib/firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Package, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

export default function StockManagementSection() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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
    return (
      product.name?.toLowerCase().includes(searchLower) ||
      product.sku?.toLowerCase().includes(searchLower) ||
      product.barcode?.toLowerCase().includes(searchLower)
    );
  });

  const getLowStockProducts = () => {
    return filteredProducts.filter(
      (p) => p.trackStock && p.lowStock && p.stock <= p.lowStock
    );
  };

  const getOutOfStockProducts = () => {
    return filteredProducts.filter(
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
                <p className="text-sm text-neutral-500">Total Products</p>
                <p className="text-2xl font-bold">{filteredProducts.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-600">
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
                <p className="text-sm text-neutral-500">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">
                  {getOutOfStockProducts().length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
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
      <div className="space-y-3">
        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
              <p className="text-neutral-500">
                {searchQuery
                  ? "No products found"
                  : "No products with stock tracking"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredProducts.map((product) => {
            const status = getStockStatus(product);
            return (
              <Card
                key={product.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">
                          {product.name}
                        </h3>
                        {status && (
                          <Badge
                            className={`${status.color} text-white text-xs`}
                          >
                            {status.label}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-4 text-sm text-neutral-500">
                        {product.sku && <span>SKU: {product.sku}</span>}
                        {product.barcode && (
                          <span>Barcode: {product.barcode}</span>
                        )}
                      </div>
                    </div>

                    {/* Stock Info */}
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {product.stock || 0}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {product.lowStock && `Low: ${product.lowStock}`}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right min-w-[100px]">
                      <div className="font-semibold">
                        {formatCurrency(product.price)}
                      </div>
                      {product.cost && (
                        <div className="text-xs text-neutral-500">
                          Cost: {formatCurrency(product.cost)}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
