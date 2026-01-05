"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  X,
  ChevronDown,
  Check,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { productsService, categoriesService } from "@/lib/firebase/firestore";
import { discountsService } from "@/lib/firebase/discountsService";
import { stockHistoryService } from "@/lib/firebase/stockHistoryService";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import {
  canAddProduct,
  canEditProduct,
  canDeleteProduct,
} from "@/lib/services/userPermissionsService";

export default function ProductsSection({ cashier }) {
  // Use cashier prop if provided (POS mode), otherwise fall back to useAuthStore (admin mode)
  const { user: authUser } = useAuthStore();
  const user = cashier || authUser;
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState("products");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
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

  // Category modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
  });

  // Form submission loading states
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [isSubmittingDiscount, setIsSubmittingDiscount] = useState(false);

  // Delete confirmation modal states
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    type: null, // 'product', 'discount', 'category'
    item: null,
    loading: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isCategoryDropdownOpen) {
        const dropdown = event.target.closest(".relative.min-w-\\[200px\\]");
        if (!dropdown) {
          setIsCategoryDropdownOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCategoryDropdownOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productData, categoryData, discountData, stockMap] =
        await Promise.all([
          productsService.getAll({ orderBy: ["name", "asc"] }),
          categoriesService.getAll(),
          discountsService.getAll(),
          stockHistoryService.getLatestStockForAllProducts(),
        ]);

      // Enrich products with current stock from stock history (batch loaded)
      const enrichedProducts = productData.map((product) => ({
        ...product,
        stock: stockMap.get(product.id) ?? product.stock ?? 0,
      }));

      setProducts(enrichedProducts);
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

    let filtered = products;

    // Filter by category (comparing by ID first, then by name)
    if (selectedCategory !== "all") {
      filtered = filtered.filter((product) => {
        // Match by ID first
        if (product.categoryId === selectedCategory) return true;
        // Match by name
        const category = categories.find((c) => c.id === selectedCategory);
        if (category) {
          const productCategoryName =
            product.categoryName ||
            product.category ||
            product.categoryLabel ||
            product.category_name;
          return productCategoryName === category.name;
        }
        return false;
      });
    }

    // Filter by search query
    if (query) {
      filtered = filtered.filter(
        (product) =>
          product.name?.toLowerCase().includes(query) ||
          product.sku?.toLowerCase().includes(query) ||
          product.barcode?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [products, searchQuery, selectedCategory]);

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categories;

    return categories.filter((cat) => cat.name?.toLowerCase().includes(query));
  }, [categories, searchQuery]);

  const getCategoryProductCount = (categoryId) => {
    // Match by ID first, then by name
    const category = categories.find((c) => c.id === categoryId);
    return products.filter((p) => {
      // Match by ID first
      if (p.categoryId === categoryId) return true;
      // Match by name if category found
      if (category) {
        const productCategoryName =
          p.categoryName || p.category || p.categoryLabel || p.category_name;
        return productCategoryName === category.name;
      }
      return false;
    }).length;
  };

  const getCategoryName = (categoryId, categoryName = null) => {
    if (!categoryId && !categoryName) return "Uncategorized";

    // Try to find by ID first
    let category = categories.find((c) => c.id === categoryId);

    // If not found by ID, try matching by name
    if (!category && categoryName) {
      category = categories.find((c) => c.name === categoryName);
    }

    return category?.name || categoryName || "Uncategorized";
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

  const handleDeleteDiscount = async (discount) => {
    setDeleteModal({
      open: true,
      type: "discount",
      item: discount,
      loading: false,
    });
  };

  const handleDeleteDiscountConfirm = async () => {
    if (!deleteModal.item) return;
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await discountsService.delete(deleteModal.item.id);
      toast.success("Discount deleted");
      setDeleteModal({ open: false, type: null, item: null, loading: false });
      loadData();
    } catch (error) {
      console.error("Error deleting discount:", error);
      toast.error("Failed to delete discount");
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleSubmitDiscount = async (e) => {
    e.preventDefault();
    if (isSubmittingDiscount) return; // Prevent double submission

    setIsSubmittingDiscount(true);
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
    } finally {
      setIsSubmittingDiscount(false);
    }
  };

  const filteredDiscounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return discounts;

    return discounts.filter((d) => d.name?.toLowerCase().includes(query));
  }, [discounts, searchQuery]);

  // Product handlers
  const generateNextSKU = () => {
    if (products.length === 0) return "10001";
    const skuNumbers = products
      .map((p) => parseInt(p.sku))
      .filter((num) => !isNaN(num));
    const maxSKU = Math.max(...skuNumbers, 10000);
    return (maxSKU + 1).toString();
  };

  const handleAddProduct = () => {
    if (!canAddProduct(user)) {
      toast.error("You don't have permission to add products");
      return;
    }
    router.push("/sales/products/new");
  };

  const handleEditProduct = (product) => {
    if (!canEditProduct(user)) {
      toast.error("You don't have permission to edit products");
      return;
    }
    router.push(`/sales/products/new?edit=${product.id}`);
  };

  const handleDeleteProduct = async (product) => {
    if (!canDeleteProduct(user)) {
      toast.error("You don't have permission to delete products");
      return;
    }
    setDeleteModal({
      open: true,
      type: "product",
      item: product,
      loading: false,
    });
  };

  const handleDeleteProductConfirm = async () => {
    if (!deleteModal.item) return;
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await productsService.delete(deleteModal.item.id);
      toast.success("Product deleted");
      setDeleteModal({ open: false, type: null, item: null, loading: false });
      loadData();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Category handlers
  const handleAddCategory = () => {
    setEditingCategory(null);
    setCategoryFormData({ name: "" });
    setIsCategoryModalOpen(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryFormData({ name: category.name || "" });
    setIsCategoryModalOpen(true);
  };

  const handleDeleteCategory = async (category) => {
    setDeleteModal({
      open: true,
      type: "category",
      item: category,
      loading: false,
    });
  };

  const handleDeleteCategoryConfirm = async () => {
    if (!deleteModal.item) return;
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await categoriesService.delete(deleteModal.item.id);
      toast.success("Category deleted");
      setDeleteModal({ open: false, type: null, item: null, loading: false });
      loadData();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleSubmitCategory = async (e) => {
    e.preventDefault();
    if (isSubmittingCategory) return; // Prevent double submission

    setIsSubmittingCategory(true);
    try {
      const categoryData = {
        name: categoryFormData.name.trim(),
      };

      if (editingCategory) {
        await categoriesService.update(editingCategory.id, categoryData);
        toast.success("Category updated");
      } else {
        await categoriesService.create(categoryData);
        toast.success("Category created");
      }

      setIsCategoryModalOpen(false);
      await loadData();
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Failed to save category");
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const getProductDisplay = (product) => {
    // Prefer common image fields: imageUrl, image, image_url, thumbnailUrl, thumbnail, images[0].url
    const imageUrl =
      product.imageUrl ||
      product.image ||
      product.image_url ||
      product.thumbnailUrl ||
      product.thumbnail ||
      (Array.isArray(product.images) && product.images[0]?.url) ||
      null;

    if (imageUrl) {
      return (
        <img
          src={imageUrl}
          alt={product.name}
          className="w-12 h-12 object-cover rounded"
        />
      );
    }

    if (product.color) {
      return (
        <div
          className="w-12 h-12 rounded"
          style={{ backgroundColor: product.color }}
        />
      );
    }

    return (
      <div className="w-12 h-12 rounded bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 flex items-center justify-center">
        <span className="text-white font-semibold text-lg">
          {product.name?.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  };

  const menuItems = [
    { id: "products", label: "Products", icon: Package },
    { id: "categories", label: "Categories", icon: FolderTree },
    { id: "discounts", label: "Discounts", icon: Tag },
  ];

  return (
    <div className="flex h-full gap-6 p-6 bg-gray-50 dark:bg-gray-950">
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
        {/* Header with Category Filter, Search, Add and Refresh */}
        <div className="flex items-center gap-3">
          {/* Category Filter Dropdown - First */}
          {activeMenu === "products" && (
            <div className="relative min-w-[200px]">
              {/* Custom Dropdown Button */}
              <button
                onClick={() =>
                  setIsCategoryDropdownOpen(!isCategoryDropdownOpen)
                }
                className="w-full h-12 pl-10 pr-10 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-medium text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-600 flex items-center justify-between"
              >
                <FolderTree className="absolute left-3 h-4 w-4 text-neutral-400" />
                <span className="flex-1 text-left">
                  {selectedCategory === "all"
                    ? "All Categories"
                    : getCategoryName(selectedCategory)}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-neutral-400 transition-transform ${
                    isCategoryDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isCategoryDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
                  {/* All Categories Option */}
                  <button
                    onClick={() => {
                      setSelectedCategory("all");
                      setIsCategoryDropdownOpen(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors flex items-center justify-between"
                  >
                    <span className="text-neutral-900 dark:text-neutral-100">
                      All Categories
                    </span>
                    {selectedCategory === "all" && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>

                  {/* Category Options */}
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category.id);
                        setIsCategoryDropdownOpen(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors flex items-center justify-between"
                    >
                      <span className="text-neutral-900 dark:text-neutral-100">
                        {category.name}
                      </span>
                      {selectedCategory === category.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search Bar - Second */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
            <Input
              placeholder={`Search ${activeMenu}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>

          {/* Add Button */}
          {activeMenu === "products" && canAddProduct(user) && (
            <Button size="lg" onClick={handleAddProduct}>
              <Plus className="h-5 w-5 mr-2" />
              Add Product
            </Button>
          )}
          {activeMenu === "categories" && (
            <Button size="lg" onClick={handleAddCategory}>
              <Plus className="h-5 w-5 mr-2" />
              Add Category
            </Button>
          )}
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
                      filteredProducts.map((product) => {
                        return (
                          <div
                            key={product.id}
                            onClick={() =>
                              canEditProduct(user) && handleEditProduct(product)
                            }
                            className={cn(
                              "flex items-center gap-4 p-4 transition-colors",
                              canEditProduct(user)
                                ? "hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer"
                                : "cursor-default"
                            )}
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
                                {product.sku &&
                                  (product.categoryId ||
                                    product.categoryName) &&
                                  " • "}
                                {getCategoryName(
                                  product.categoryId,
                                  product.categoryName
                                )}
                              </p>
                              {product.trackStock && (
                                <p className="text-xs text-neutral-400 mt-1">
                                  Stock: {product.stock || 0}
                                  {product.lowStock &&
                                    ` (Low: ${product.lowStock})`}
                                </p>
                              )}
                            </div>

                            {/* Price */}
                            <div className="text-right">
                              <div className="text-xl font-bold text-green-600">
                                {formatCurrency(product.price || 0)}
                              </div>
                              {product.memberPrice &&
                                product.memberPrice !== product.price && (
                                  <div className="text-sm text-orange-600 font-medium">
                                    Member:{" "}
                                    {formatCurrency(product.memberPrice)}
                                  </div>
                                )}
                            </div>
                          </div>
                        );
                      })
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
                          {/* Category Icon */}
                          <div className="flex-shrink-0">
                            <FolderTree className="h-10 w-10 text-primary" />
                          </div>

                          {/* Category Info */}
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">
                              {category.name}
                            </h3>
                            <p className="text-sm text-neutral-500">
                              {getCategoryProductCount(category.id)} products
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditCategory(category)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteCategory(category)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
                                onClick={() => handleDeleteDiscount(discount)}
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
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
                disabled={isSubmittingDiscount}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmittingDiscount}
              >
                {isSubmittingDiscount
                  ? "Saving..."
                  : editingDiscount
                  ? "Update"
                  : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Category Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Add New Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update category information"
                : "Create a new category for your products"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitCategory} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Category Name *
              </label>
              <Input
                placeholder="e.g., Electronics, Clothing, Food"
                value={categoryFormData.name}
                onChange={(e) =>
                  setCategoryFormData({
                    ...categoryFormData,
                    name: e.target.value,
                  })
                }
                required
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCategoryModalOpen(false)}
                className="flex-1"
                disabled={isSubmittingCategory}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmittingCategory}
              >
                {isSubmittingCategory
                  ? "Saving..."
                  : editingCategory
                  ? "Update Category"
                  : "Create Category"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION MODAL */}
      <Dialog
        open={deleteModal.open}
        onOpenChange={(open) => {
          if (!open && !deleteModal.loading) {
            setDeleteModal({
              open: false,
              type: null,
              item: null,
              loading: false,
            });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {deleteModal.type}
              {deleteModal.item?.name ? ` "${deleteModal.item.name}"` : ""}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() =>
                setDeleteModal({
                  open: false,
                  type: null,
                  item: null,
                  loading: false,
                })
              }
              disabled={deleteModal.loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteModal.type === "product") {
                  handleDeleteProductConfirm();
                } else if (deleteModal.type === "discount") {
                  handleDeleteDiscountConfirm();
                } else if (deleteModal.type === "category") {
                  handleDeleteCategoryConfirm();
                }
              }}
              disabled={deleteModal.loading}
            >
              {deleteModal.loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
