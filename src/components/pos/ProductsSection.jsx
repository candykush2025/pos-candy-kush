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
  Upload,
  X,
  ImageIcon,
  Palette,
} from "lucide-react";
import { productsService, categoriesService } from "@/lib/firebase/firestore";
import { discountsService } from "@/lib/firebase/discountsService";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";

const PRODUCT_COLORS = [
  { value: "GREY", label: "Grey", hex: "#9CA3AF" },
  { value: "RED", label: "Red", hex: "#EF4444" },
  { value: "PINK", label: "Pink", hex: "#EC4899" },
  { value: "ORANGE", label: "Orange", hex: "#F97316" },
  { value: "YELLOW", label: "Yellow", hex: "#EAB308" },
  { value: "GREEN", label: "Green", hex: "#22C55E" },
  { value: "BLUE", label: "Blue", hex: "#3B82F6" },
  { value: "PURPLE", label: "Purple", hex: "#A855F7" },
];

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

  // Product modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productFormData, setProductFormData] = useState({
    name: "",
    category: "",
    soldBy: "each",
    price: "",
    cost: "",
    sku: "",
    barcode: "",
    trackStock: false,
    inStock: "",
    lowStock: "",
    representationType: "color",
    color: "GREY",
    image: null,
    imagePreview: null,
  });

  // Category modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
  });

  // Quick add category in product modal
  const [showQuickAddCategory, setShowQuickAddCategory] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState("");
  const [isQuickAddingCategory, setIsQuickAddingCategory] = useState(false);

  // Form submission loading states
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [isSubmittingDiscount, setIsSubmittingDiscount] = useState(false);

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
    setEditingProduct(null);
    setProductFormData({
      name: "",
      category: categories[0]?.name || "",
      soldBy: "each",
      price: "",
      cost: "",
      sku: generateNextSKU(),
      barcode: "",
      trackStock: false,
      inStock: "",
      lowStock: "",
      representationType: "color",
      color: "GREY",
      image: null,
      imagePreview: null,
    });
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductFormData({
      name: product.name || "",
      category: product.category || "",
      soldBy: product.soldBy || "each",
      price: product.price || "",
      cost: product.cost || "",
      sku: product.sku || "",
      barcode: product.barcode || "",
      trackStock: product.trackStock || false,
      inStock: product.inStock || "",
      lowStock: product.lowStock || "",
      representationType: product.image ? "image" : "color",
      color: product.color || "GREY",
      image: null,
      imagePreview: product.image || null,
    });
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await productsService.delete(id);
      toast.success("Product deleted");
      loadData();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setProductFormData({
        ...productFormData,
        image: file,
        imagePreview: reader.result,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setProductFormData({
      ...productFormData,
      image: null,
      imagePreview: null,
    });
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    if (isSubmittingProduct) return; // Prevent double submission

    setIsSubmittingProduct(true);
    try {
      const productData = {
        name: productFormData.name,
        category: productFormData.category,
        soldBy: productFormData.soldBy,
        price: parseFloat(productFormData.price),
        cost: productFormData.cost ? parseFloat(productFormData.cost) : 0,
        sku: productFormData.sku,
        barcode: productFormData.barcode,
        trackStock: productFormData.trackStock,
        inStock: productFormData.trackStock
          ? parseFloat(productFormData.inStock) || 0
          : null,
        lowStock: productFormData.trackStock
          ? parseFloat(productFormData.lowStock) || 0
          : null,
        color:
          productFormData.representationType === "color"
            ? productFormData.color
            : null,
        image:
          productFormData.representationType === "image"
            ? productFormData.imagePreview
            : null,
      };

      if (editingProduct) {
        await productsService.update(editingProduct.id, productData);
        toast.success("Product updated");
      } else {
        await productsService.create(productData);

        // Add to stock movement if tracking stock
        if (productFormData.trackStock && productFormData.inStock > 0) {
          const stockMovement = {
            productId: productData.sku,
            productName: productData.name,
            type: "purchase",
            quantity: parseFloat(productFormData.inStock),
            from: 0,
            to: parseFloat(productFormData.inStock),
            note: "Initial stock from POS",
            cashierId: user?.id || null,
            cashierName: user?.name || "System",
            createdAt: new Date(),
          };
          // TODO: Add to stock movement collection
          console.log("Stock movement:", stockMovement);
        }

        toast.success("Product created");
      }

      setIsProductModalOpen(false);
      loadData();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Failed to save product");
    } finally {
      setIsSubmittingProduct(false);
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

  const handleDeleteCategory = async (id) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await categoriesService.delete(id);
      toast.success("Category deleted");
      loadData();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
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

  // Quick add category from product modal
  const handleQuickAddCategory = async () => {
    if (!quickCategoryName.trim()) {
      toast.error("Please enter category name");
      return;
    }

    if (isQuickAddingCategory) return; // Prevent double submission

    setIsQuickAddingCategory(true);
    try {
      const categoryData = {
        name: quickCategoryName.trim(),
      };

      await categoriesService.create(categoryData);
      toast.success(`Category "${quickCategoryName}" created`);

      // Reload categories
      await loadData();

      // Set the new category as selected
      setProductFormData({
        ...productFormData,
        category: quickCategoryName.trim(),
      });

      // Reset and hide quick add
      setQuickCategoryName("");
      setShowQuickAddCategory(false);
    } catch (error) {
      console.error("Error creating category:", error);
      toast.error("Failed to create category");
    } finally {
      setIsQuickAddingCategory(false);
    }
  };

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
          {activeMenu === "products" && (
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
                            {product.trackStock && (
                              <p className="text-xs text-neutral-400 mt-1">
                                Stock: {product.inStock || 0}
                                {product.lowStock &&
                                  ` (Low: ${product.lowStock})`}
                              </p>
                            )}
                          </div>

                          {/* Price */}
                          <div className="text-xl font-bold text-green-600">
                            {formatCurrency(product.price || 0)}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditProduct(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteProduct(product.id)}
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
                              {getCategoryProductCount(category.name)} products
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
                              onClick={() => handleDeleteCategory(category.id)}
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

      {/* Product Modal */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? "Update product information"
                : "Create a new product for your POS"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitProduct} className="space-y-4">
            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Product Name *
              </label>
              <Input
                placeholder="e.g., Coffee, T-Shirt, Laptop"
                value={productFormData.name}
                onChange={(e) =>
                  setProductFormData({
                    ...productFormData,
                    name: e.target.value,
                  })
                }
                required
              />
            </div>

            {/* Category and Sold By */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Category *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md mb-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  value={productFormData.category}
                  onChange={(e) =>
                    setProductFormData({
                      ...productFormData,
                      category: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>

                {/* Quick Add Category */}
                {!showQuickAddCategory ? (
                  <button
                    type="button"
                    onClick={() => setShowQuickAddCategory(true)}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add new category
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Category name"
                      value={quickCategoryName}
                      onChange={(e) => setQuickCategoryName(e.target.value)}
                      className="flex-1"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleQuickAddCategory();
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleQuickAddCategory}
                      disabled={
                        !quickCategoryName.trim() || isQuickAddingCategory
                      }
                    >
                      {isQuickAddingCategory ? "Adding..." : "Add"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowQuickAddCategory(false);
                        setQuickCategoryName("");
                      }}
                      disabled={isQuickAddingCategory}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Sold By *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  value={productFormData.soldBy}
                  onChange={(e) =>
                    setProductFormData({
                      ...productFormData,
                      soldBy: e.target.value,
                    })
                  }
                  required
                >
                  <option value="each">Each</option>
                  <option value="weight">Weight (kg)</option>
                </select>
              </div>
            </div>

            {/* Price and Cost */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Price (฿) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={productFormData.price}
                  onChange={(e) =>
                    setProductFormData({
                      ...productFormData,
                      price: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Cost (฿)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={productFormData.cost}
                  onChange={(e) =>
                    setProductFormData({
                      ...productFormData,
                      cost: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* SKU and Barcode */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">SKU *</label>
                <Input
                  placeholder="10001"
                  value={productFormData.sku}
                  onChange={(e) =>
                    setProductFormData({
                      ...productFormData,
                      sku: e.target.value,
                    })
                  }
                  required
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Auto-generated: {generateNextSKU()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Barcode
                </label>
                <Input
                  placeholder="Scan or enter barcode"
                  value={productFormData.barcode}
                  onChange={(e) =>
                    setProductFormData({
                      ...productFormData,
                      barcode: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* Track Stock Toggle */}
            <div className="border rounded-lg p-4 bg-neutral-50 dark:bg-neutral-900">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">Track Stock</h3>
                  <p className="text-sm text-neutral-500">
                    Enable inventory tracking for this product
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productFormData.trackStock}
                    onChange={(e) =>
                      setProductFormData({
                        ...productFormData,
                        trackStock: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-gray-700 dark:peer-checked:after:border-gray-700 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 dark:after:bg-gray-300 after:border-gray-600 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Stock Fields - Show only when Track Stock is ON */}
              {productFormData.trackStock && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      In Stock *
                    </label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="0"
                      value={productFormData.inStock}
                      onChange={(e) =>
                        setProductFormData({
                          ...productFormData,
                          inStock: e.target.value,
                        })
                      }
                      required={productFormData.trackStock}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Low Stock Alert *
                    </label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="5"
                      value={productFormData.lowStock}
                      onChange={(e) =>
                        setProductFormData({
                          ...productFormData,
                          lowStock: e.target.value,
                        })
                      }
                      required={productFormData.trackStock}
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      Alert when stock falls below this number
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Representation Type - Color or Image */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Product Display</h3>
              <div className="space-y-4">
                {/* Color or Image Selection */}
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      setProductFormData({
                        ...productFormData,
                        representationType: "color",
                      })
                    }
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 p-3 border-2 rounded-lg transition-all",
                      productFormData.representationType === "color"
                        ? "border-primary bg-primary/5"
                        : "border-neutral-200 hover:border-neutral-300"
                    )}
                  >
                    <Palette className="h-5 w-5" />
                    <span className="font-medium">Color</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setProductFormData({
                        ...productFormData,
                        representationType: "image",
                      })
                    }
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 p-3 border-2 rounded-lg transition-all",
                      productFormData.representationType === "image"
                        ? "border-primary bg-primary/5"
                        : "border-neutral-200 hover:border-neutral-300"
                    )}
                  >
                    <ImageIcon className="h-5 w-5" />
                    <span className="font-medium">Image</span>
                  </button>
                </div>

                {/* Color Picker */}
                {productFormData.representationType === "color" && (
                  <div className="grid grid-cols-4 gap-3">
                    {PRODUCT_COLORS.map((colorOption) => (
                      <button
                        key={colorOption.value}
                        type="button"
                        onClick={() =>
                          setProductFormData({
                            ...productFormData,
                            color: colorOption.value,
                          })
                        }
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 border-2 rounded-lg transition-all hover:scale-105",
                          productFormData.color === colorOption.value
                            ? "border-primary"
                            : "border-neutral-200"
                        )}
                      >
                        <div
                          className="w-12 h-12 rounded-full"
                          style={{ backgroundColor: colorOption.hex }}
                        />
                        <span className="text-xs font-medium">
                          {colorOption.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Image Upload */}
                {productFormData.representationType === "image" && (
                  <div>
                    {productFormData.imagePreview ? (
                      <div className="relative">
                        <img
                          src={productFormData.imagePreview}
                          alt="Product preview"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <div className="absolute top-2 right-2 flex gap-2">
                          <label className="cursor-pointer bg-gray-100 dark:bg-gray-800 p-2 rounded-full shadow-lg hover:bg-gray-200 dark:hover:bg-gray-700">
                            <Edit className="h-4 w-4 text-gray-300 dark:text-gray-300" />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full shadow-lg hover:bg-red-100 dark:hover:bg-red-900 text-red-400"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:border-primary hover:bg-gray-800 dark:hover:bg-gray-800 transition-all">
                        <Upload className="h-12 w-12 text-gray-500 dark:text-gray-500 mb-2" />
                        <span className="text-sm text-gray-400 dark:text-gray-400">
                          Click to upload product image
                        </span>
                        <span className="text-xs text-neutral-400 mt-1">
                          Max 5MB (JPG, PNG, GIF)
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsProductModalOpen(false)}
                className="flex-1"
                disabled={isSubmittingProduct}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmittingProduct}
              >
                {isSubmittingProduct
                  ? "Saving..."
                  : editingProduct
                  ? "Update Product"
                  : "Create Product"}
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
    </div>
  );
}
