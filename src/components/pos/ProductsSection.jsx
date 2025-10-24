"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Package,
  Search,
  RefreshCw,
  FolderTree,
  Tag,
  Plus,
  Edit,
  Trash2,
  Percent,
} from "lucide-react";
import { productsService, categoriesService } from "@/lib/firebase/firestore";
import { discountsService } from "@/lib/firebase/discountsService";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";

export default function ProductsSection() {
  const { user } = useAuthStore();
  const [activeMenu, setActiveMenu] = useState("products");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [discountFormData, setDiscountFormData] = useState({
    name: "",
    type: "percentage",
    value: "",
    minPurchase: "",
    validFrom: "",
    validTo: "",
    isActive: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productData, categoryData, discountData] = await Promise.all([
        productsService.getAll({ orderBy: ["name", "asc"] }),
        categoriesService.getAll(),
        discountsService.getAll(),
      ]);
      setProducts(productData);
      setCategories(categoryData.filter((cat) => !cat.deletedAt));
      setDiscounts(discountData);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;

    return products.filter(
      (product) =>
        product.name?.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query) ||
        product.barcode?.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categories;

    return categories.filter((cat) => cat.name?.toLowerCase().includes(query));
  }, [categories, searchQuery]);

  const getCategoryProductCount = (categoryName) => {
    return products.filter((p) => p.category === categoryName).length;
  };

  // Discount handlers
  const handleAddDiscount = () => {
    setEditingDiscount(null);
    setDiscountFormData({
      name: "",
      type: "percentage",
      value: "",
      minPurchase: "",
      validFrom: "",
      validTo: "",
      isActive: true,
    });
    setIsDiscountModalOpen(true);
  };

  const handleEditDiscount = (discount) => {
    setEditingDiscount(discount);
    setDiscountFormData({
      name: discount.name || "",
      type: discount.type || "percentage",
      value: discount.value || "",
      minPurchase: discount.minPurchase || "",
      validFrom: discount.validFrom
        ? new Date(
            discount.validFrom.toDate
              ? discount.validFrom.toDate()
              : discount.validFrom
          )
            .toISOString()
            .split("T")[0]
        : "",
      validTo: discount.validTo
        ? new Date(
            discount.validTo.toDate
              ? discount.validTo.toDate()
              : discount.validTo
          )
            .toISOString()
            .split("T")[0]
        : "",
      isActive: discount.isActive !== undefined ? discount.isActive : true,
    });
    setIsDiscountModalOpen(true);
  };

  const handleDeleteDiscount = async (id) => {
    if (!confirm("Are you sure you want to delete this discount?")) return;
    try {
      await discountsService.delete(id);
      toast.success("Discount deleted");
      loadData();
    } catch (error) {
      console.error("Error deleting discount:", error);
      toast.error("Failed to delete discount");
    }
  };

  const handleSubmitDiscount = async (e) => {
    e.preventDefault();
    try {
      const discountData = {
        name: discountFormData.name,
        type: discountFormData.type,
        value: parseFloat(discountFormData.value),
        minPurchase: discountFormData.minPurchase
          ? parseFloat(discountFormData.minPurchase)
          : 0,
        validFrom: discountFormData.validFrom
          ? new Date(discountFormData.validFrom)
          : null,
        validTo: discountFormData.validTo
          ? new Date(discountFormData.validTo)
          : null,
        isActive: discountFormData.isActive,
      };

      if (editingDiscount) {
        await discountsService.update(
          editingDiscount.id,
          discountData,
          user?.id || null,
          user?.name || null
        );
        toast.success("Discount updated");
      } else {
        await discountsService.create(
          discountData,
          user?.id || null,
          user?.name || null
        );
        toast.success("Discount created");
      }

      setIsDiscountModalOpen(false);
      loadData();
    } catch (error) {
      console.error("Error saving discount:", error);
      toast.error("Failed to save discount");
    }
  };

  const filteredDiscounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return discounts;

    return discounts.filter((d) => d.name?.toLowerCase().includes(query));
  }, [discounts, searchQuery]);

  const getProductDisplay = (product) => {
    if (product.image_url) {
      return (
        <img
          src={product.image_url}
          alt={product.name}
          className="w-12 h-12 object-cover rounded"
        />
      );
    } else if (product.color) {
      return (
        <div
          className="w-12 h-12 rounded"
          style={{ backgroundColor: product.color }}
        />
      );
    } else {
      return (
        <div className="w-12 h-12 rounded bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 flex items-center justify-center">
          <span className="text-white font-semibold text-lg">
            {product.name?.charAt(0).toUpperCase()}
          </span>
        </div>
      );
    }
  };

  const menuItems = [
    { id: "products", label: "Products", icon: Package },
    { id: "categories", label: "Categories", icon: FolderTree },
    { id: "discounts", label: "Discounts", icon: Tag },
  ];

  return (
    <div className="flex h-full gap-6 p-6">
      {/* Left Sidebar Menu - 30% */}
      <div className="w-[30%] flex-shrink-0">
        <Card className="h-full p-6">
          <h2 className="text-2xl font-bold mb-6">Management</h2>
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveMenu(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left",
                    activeMenu === item.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </Card>
      </div>

      {/* Right Content Area - 70% */}
      <div className="w-[70%] flex flex-col gap-4">
        {/* Header with Search, Add and Refresh */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
            <Input
              placeholder={`Search ${activeMenu}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          {activeMenu === "discounts" && (
            <Button size="lg" onClick={handleAddDiscount}>
              <Plus className="h-5 w-5 mr-2" />
              Add Discount
            </Button>
          )}
          <Button
            size="lg"
            variant="outline"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw
              className={cn("h-5 w-5 mr-2", loading && "animate-spin")}
            />
            Refresh
          </Button>
        </div>

        {/* Content List */}
        <Card className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Package className="h-16 w-16 text-neutral-300 mx-auto mb-4 animate-pulse" />
                  <p className="text-neutral-500">Loading...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* PRODUCTS LIST */}
                {activeMenu === "products" && (
                  <>
                    {filteredProducts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Package className="h-16 w-16 text-neutral-300 mb-4" />
                        <p className="text-neutral-500 text-lg">
                          No products found
                        </p>
                      </div>
                    ) : (
                      filteredProducts.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center gap-4 p-4 border rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                        >
                          {/* Image/Color */}
                          {getProductDisplay(product)}

                          {/* Product Info */}
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">
                              {product.name}
                            </h3>
                            <p className="text-sm text-neutral-500">
                              {product.sku && `SKU: ${product.sku}`}
                              {product.sku && product.category && " • "}
                              {product.category}
                            </p>
                          </div>

                          {/* Price */}
                          <div className="text-xl font-bold text-green-600">
                            {formatCurrency(product.price || 0)}
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}

                {/* CATEGORIES LIST */}
                {activeMenu === "categories" && (
                  <>
                    {filteredCategories.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <FolderTree className="h-16 w-16 text-neutral-300 mb-4" />
                        <p className="text-neutral-500 text-lg">
                          No categories found
                        </p>
                      </div>
                    ) : (
                      filteredCategories.map((category) => (
                        <div
                          key={category.id}
                          className="flex items-center gap-4 p-4 border rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                        >
                          {/* Category Info */}
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">
                              {category.name}
                            </h3>
                            <p className="text-sm text-neutral-500">
                              {getCategoryProductCount(category.name)} products
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}

                {/* DISCOUNTS LIST */}
                {activeMenu === "discounts" && (
                  <>
                    {filteredDiscounts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Tag className="h-16 w-16 text-neutral-300 mb-4" />
                        <p className="text-neutral-500 text-lg">
                          No discounts found
                        </p>
                        <Button className="mt-4" onClick={handleAddDiscount}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add your first discount
                        </Button>
                      </div>
                    ) : (
                      filteredDiscounts.map((discount) => {
                        const now = new Date();
                        const validFrom = discount.validFrom?.toDate
                          ? discount.validFrom.toDate()
                          : discount.validFrom
                          ? new Date(discount.validFrom)
                          : null;
                        const validTo = discount.validTo?.toDate
                          ? discount.validTo.toDate()
                          : discount.validTo
                          ? new Date(discount.validTo)
                          : null;
                        const isExpired = validTo && now > validTo;
                        const isUpcoming = validFrom && now < validFrom;

                        return (
                          <div
                            key={discount.id}
                            className="flex items-center gap-4 p-4 border rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                          >
                            {/* Icon */}
                            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                              {discount.type === "percentage" ? (
                                <Percent className="h-6 w-6 text-primary" />
                              ) : (
                                <Tag className="h-6 w-6 text-primary" />
                              )}
                            </div>

                            {/* Discount Info */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg">
                                  {discount.name}
                                </h3>
                                {!discount.isActive && (
                                  <Badge variant="secondary">Inactive</Badge>
                                )}
                                {isExpired && (
                                  <Badge variant="destructive">Expired</Badge>
                                )}
                                {isUpcoming && (
                                  <Badge variant="outline">Upcoming</Badge>
                                )}
                              </div>
                              <p className="text-sm text-neutral-500">
                                {discount.type === "percentage"
                                  ? `${discount.value}% off`
                                  : `${formatCurrency(discount.value)} off`}
                                {discount.minPurchase > 0 &&
                                  ` • Min purchase: ${formatCurrency(
                                    discount.minPurchase
                                  )}`}
                              </p>
                              {(validFrom || validTo) && (
                                <p className="text-xs text-neutral-400 mt-1">
                                  {validFrom &&
                                    `From ${validFrom.toLocaleDateString()}`}
                                  {validFrom && validTo && " - "}
                                  {validTo &&
                                    `To ${validTo.toLocaleDateString()}`}
                                </p>
                              )}
                            </div>

                            {/* Value Display */}
                            <div className="text-right">
                              <div className="text-xl font-bold text-green-600">
                                {discount.type === "percentage"
                                  ? `${discount.value}%`
                                  : formatCurrency(discount.value)}
                              </div>
                              <div className="text-xs text-neutral-500">
                                {discount.type === "percentage"
                                  ? "Percentage"
                                  : "Fixed Amount"}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditDiscount(discount)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  handleDeleteDiscount(discount.id)
                                }
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Discount Modal */}
      <Dialog open={isDiscountModalOpen} onOpenChange={setIsDiscountModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingDiscount ? "Edit Discount" : "Add New Discount"}
            </DialogTitle>
            <DialogDescription>
              {editingDiscount
                ? "Update discount information"
                : "Create a new discount"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitDiscount} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Discount Name *
              </label>
              <Input
                placeholder="e.g., Summer Sale, Black Friday"
                value={discountFormData.name}
                onChange={(e) =>
                  setDiscountFormData({
                    ...discountFormData,
                    name: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Discount Type *
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={discountFormData.type}
                  onChange={(e) =>
                    setDiscountFormData({
                      ...discountFormData,
                      type: e.target.value,
                    })
                  }
                  required
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (฿)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Value *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={
                    discountFormData.type === "percentage" ? "10" : "100"
                  }
                  value={discountFormData.value}
                  onChange={(e) =>
                    setDiscountFormData({
                      ...discountFormData,
                      value: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Minimum Purchase (฿)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0 = No minimum"
                value={discountFormData.minPurchase}
                onChange={(e) =>
                  setDiscountFormData({
                    ...discountFormData,
                    minPurchase: e.target.value,
                  })
                }
              />
              <p className="text-xs text-neutral-500 mt-1">
                Leave empty or 0 for no minimum purchase requirement
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Valid From
                </label>
                <Input
                  type="date"
                  value={discountFormData.validFrom}
                  onChange={(e) =>
                    setDiscountFormData({
                      ...discountFormData,
                      validFrom: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Valid To
                </label>
                <Input
                  type="date"
                  value={discountFormData.validTo}
                  onChange={(e) =>
                    setDiscountFormData({
                      ...discountFormData,
                      validTo: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={discountFormData.isActive}
                onChange={(e) =>
                  setDiscountFormData({
                    ...discountFormData,
                    isActive: e.target.checked,
                  })
                }
                className="w-4 h-4"
              />
              <label htmlFor="isActive" className="text-sm font-medium">
                Active (discount is available for use)
              </label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDiscountModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                {editingDiscount ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
