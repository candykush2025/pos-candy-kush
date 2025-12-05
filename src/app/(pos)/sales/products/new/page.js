"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { productsService, categoriesService } from "@/lib/firebase/firestore";
import { stockHistoryService } from "@/lib/firebase/stockHistoryService";
import { dbService } from "@/lib/db/dbService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/store/useAuthStore";
import {
  ArrowLeft,
  Plus,
  Image as ImageIcon,
  X,
  Palette,
  Upload,
  Edit,
  Loader2,
  Save,
  CheckCircle,
  Search,
  Minus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

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

export default function POSNewProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { user } = useAuthStore();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(!!editId);
  const [showQuickAddCategory, setShowQuickAddCategory] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState("");
  const [isQuickAddingCategory, setIsQuickAddingCategory] = useState(false);
  const [nextSku, setNextSku] = useState("");

  // Stock reduction states
  const [allProducts, setAllProducts] = useState([]);
  const [stockReductionSearch, setStockReductionSearch] = useState("");
  const [showStockReductionPicker, setShowStockReductionPicker] =
    useState(false);

  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    sku: "",
    barcode: "",
    price: "",
    memberPrice: "",
    cost: "",
    stock: "",
    lowStock: "5",
    trackStock: false,
    soldByWeight: false,
    color: "GREY",
    representationType: "color",
    image: null,
    imagePreview: null,
    stockReductions: [],
    reduceOwnStock: true,
  });

  // Load categories on mount
  useEffect(() => {
    loadCategories();
    loadAllProducts();
    generateNextSku();
  }, []);

  // Load product if editing
  useEffect(() => {
    if (editId) {
      loadProduct(editId);
    }
  }, [editId]);

  const loadCategories = async () => {
    try {
      const data = await categoriesService.getAll();
      setCategories(data);
    } catch (error) {
      console.error("Error loading categories:", error);
      toast.error("Failed to load categories");
    }
  };

  const loadAllProducts = async () => {
    try {
      const data = await productsService.getAll();
      setAllProducts(data);
    } catch (error) {
      console.error("Error loading products for stock reduction:", error);
    }
  };

  const loadProduct = async (id) => {
    try {
      setLoadingProduct(true);
      const product = await productsService.get(id);
      if (product) {
        setFormData({
          name: product.name || "",
          categoryId: product.categoryId || "",
          sku: product.sku || "",
          barcode: product.barcode || "",
          price: product.price?.toString() || "",
          memberPrice: product.memberPrice?.toString() || "",
          cost: product.cost?.toString() || "",
          stock: product.stock?.toString() || "",
          lowStock: product.lowStock?.toString() || "5",
          trackStock: product.trackStock || false,
          soldByWeight: product.soldByWeight || false,
          color: product.color || "GREY",
          representationType: product.imageUrl ? "image" : "color",
          image: null,
          imagePreview: product.imageUrl || null,
          stockReductions: product.stockReductions || [],
          reduceOwnStock: product.reduceOwnStock !== false, // Default true
        });
      } else {
        toast.error("Product not found");
        router.push("/sales?tab=products");
      }
    } catch (error) {
      console.error("Error loading product:", error);
      toast.error("Failed to load product");
      router.push("/sales?tab=products");
    } finally {
      setLoadingProduct(false);
    }
  };

  const generateNextSku = async () => {
    try {
      const products = await productsService.getAll();
      const skus = products
        .map((p) => parseInt(p.sku))
        .filter((sku) => !isNaN(sku));
      const maxSku = skus.length > 0 ? Math.max(...skus) : 10000;
      const newSku = (maxSku + 1).toString();
      setNextSku(newSku);
      if (!editId) {
        setFormData((prev) => ({ ...prev, sku: newSku }));
      }
    } catch (error) {
      console.error("Error generating SKU:", error);
      setNextSku("10001");
      if (!editId) {
        setFormData((prev) => ({ ...prev, sku: "10001" }));
      }
    }
  };

  const handleQuickAddCategory = async () => {
    if (!quickCategoryName.trim()) return;

    setIsQuickAddingCategory(true);
    try {
      const newCategory = await categoriesService.create({
        name: quickCategoryName.trim(),
        color: "GREY",
      });

      setCategories((prev) => [...prev, newCategory]);
      setFormData((prev) => ({ ...prev, categoryId: newCategory.id }));
      setQuickCategoryName("");
      setShowQuickAddCategory(false);
      toast.success(`Category "${quickCategoryName}" created!`);
    } catch (error) {
      console.error("Error creating category:", error);
      toast.error("Failed to create category");
    } finally {
      setIsQuickAddingCategory(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          image: file,
          imagePreview: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({
      ...prev,
      image: null,
      imagePreview: null,
    }));
  };

  // Stock reduction helpers
  const addStockReduction = (product) => {
    // Don't add if already in list or is current product
    if (
      formData.stockReductions.some((r) => r.productId === product.id) ||
      product.id === editId
    ) {
      return;
    }
    setFormData((prev) => ({
      ...prev,
      stockReductions: [
        ...prev.stockReductions,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
        },
      ],
    }));
    setStockReductionSearch("");
    setShowStockReductionPicker(false);
  };

  const updateStockReductionQuantity = (productId, quantity) => {
    setFormData((prev) => ({
      ...prev,
      stockReductions: prev.stockReductions.map((r) =>
        r.productId === productId
          ? { ...r, quantity: Math.max(1, quantity) }
          : r
      ),
    }));
  };

  const removeStockReduction = (productId) => {
    setFormData((prev) => ({
      ...prev,
      stockReductions: prev.stockReductions.filter(
        (r) => r.productId !== productId
      ),
    }));
  };

  // Filter products for stock reduction picker
  const filteredStockProducts = allProducts.filter((p) => {
    if (p.id === editId) return false; // Exclude current product
    if (!p.trackStock) return false; // Only show products with stock tracking
    if (formData.stockReductions.some((r) => r.productId === p.id))
      return false; // Exclude already added
    if (!stockReductionSearch) return true;
    return p.name.toLowerCase().includes(stockReductionSearch.toLowerCase());
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare product data
      const productData = {
        name: formData.name.trim(),
        handle: formData.name.toLowerCase().replace(/\s+/g, "-"),
        categoryId: formData.categoryId,
        sku: formData.sku || nextSku,
        barcode: formData.barcode,
        price: parseFloat(formData.price) || 0,
        memberPrice: formData.memberPrice
          ? parseFloat(formData.memberPrice)
          : null,
        cost: parseFloat(formData.cost) || 0,
        stock: formData.trackStock ? parseInt(formData.stock) || 0 : 0,
        lowStock: formData.trackStock ? parseInt(formData.lowStock) || 5 : 5,
        trackStock: formData.trackStock,
        soldByWeight: formData.soldByWeight,
        availableForSale: true,
        color: formData.color,
        representationType: formData.representationType,
        imageUrl: formData.imagePreview || "",
        source: "pos",
        updatedAt: new Date().toISOString(),
        stockReductions: formData.trackStock ? formData.stockReductions : [],
        reduceOwnStock: formData.trackStock ? formData.reduceOwnStock : true,
      };

      if (editId) {
        // Update existing product
        await productsService.update(editId, productData);

        // Log stock change if tracking stock
        if (formData.trackStock) {
          const oldProduct = await productsService.get(editId);
          const oldStock = oldProduct?.stock || 0;
          const newStock = parseInt(formData.stock) || 0;

          // Only log if stock changed and new stock >= 1
          if (oldStock !== newStock && newStock >= 1) {
            await stockHistoryService.logStockMovement({
              productId: editId,
              productName: productData.name,
              sku: productData.sku || null,
              type: "adjustment",
              quantity: newStock - oldStock,
              previousStock: oldStock,
              newStock: newStock,
              reason: "Stock adjusted via POS product edit",
              referenceId: null,
              referenceType: "product_edit",
              userId: user?.id || null,
              userName: user?.name || "Cashier",
              notes: `Cost: ฿${parseFloat(formData.cost) || 0}`,
            });
          }
        }

        // Update IndexedDB
        await dbService.upsertProducts([{ id: editId, ...productData }]);

        toast.success("Product updated successfully!");
      } else {
        // Create new product
        productData.createdAt = new Date().toISOString();
        const newProduct = await productsService.create(productData);

        // Log initial stock if tracking and stock >= 1
        if (formData.trackStock && parseInt(formData.stock) >= 1) {
          await stockHistoryService.logStockMovement({
            productId: newProduct.id,
            productName: productData.name,
            sku: productData.sku || null,
            type: "initial",
            quantity: parseInt(formData.stock),
            previousStock: 0,
            newStock: parseInt(formData.stock),
            reason: "Initial stock on product creation (POS)",
            referenceId: null,
            referenceType: "product_create",
            userId: user?.id || null,
            userName: user?.name || "Cashier",
            notes: `Cost: ฿${parseFloat(formData.cost) || 0}`,
          });
        }

        // Add to IndexedDB
        await dbService.upsertProducts([{ id: newProduct.id, ...productData }]);

        toast.success("Product created successfully!");
      }

      // Redirect back to products tab
      router.push("/sales?tab=products");
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error(
        editId ? "Failed to update product" : "Failed to create product"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loadingProduct) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-gray-500 dark:text-gray-400">Loading product...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-6 pb-10">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          <Link href="/sales?tab=products">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 bg-white dark:bg-gray-800 shadow-sm"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {editId ? "Edit Product" : "Add New Product"}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {editId
                ? "Update product information"
                : "Create a new product for your POS"}
            </p>
          </div>
        </div>

        {/* Main Form Card */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g., Coffee, T-Shirt, Laptop"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="text-lg bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* Category and Sold By */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md mb-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value })
                    }
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
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
                        className="flex-1 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
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
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Sold By <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    value={formData.soldByWeight ? "weight" : "each"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        soldByWeight: e.target.value === "weight",
                      })
                    }
                    required
                  >
                    <option value="each">Each</option>
                    <option value="weight">Weight (kg)</option>
                  </select>
                </div>
              </div>

              {/* Price Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Price (฿) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    required
                    className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Member Price (฿)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.memberPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, memberPrice: e.target.value })
                    }
                    className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Cost (฿)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.cost}
                    onChange={(e) =>
                      setFormData({ ...formData, cost: e.target.value })
                    }
                    disabled={formData.trackStock}
                    className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                  />
                  {formData.trackStock && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Enter cost in Track Stock section below
                    </p>
                  )}
                </div>
              </div>

              {/* SKU and Barcode */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    SKU <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="10001"
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                    required
                    className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                  />
                  {!editId && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Auto-generated: {nextSku}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Barcode
                  </label>
                  <Input
                    placeholder="Scan or enter barcode"
                    value={formData.barcode}
                    onChange={(e) =>
                      setFormData({ ...formData, barcode: e.target.value })
                    }
                    className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              {/* Track Stock Section */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      Track Stock
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Enable inventory tracking for this product
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.trackStock}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          trackStock: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Stock Fields - Show only when Track Stock is ON */}
                {formData.trackStock && (
                  <div className="space-y-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                          In Stock <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          placeholder="0"
                          value={formData.stock}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              stock: e.target.value,
                            })
                          }
                          required={formData.trackStock}
                          className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                          Low Stock Alert{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          placeholder="5"
                          value={formData.lowStock}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              lowStock: e.target.value,
                            })
                          }
                          required={formData.trackStock}
                          className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Alert when stock falls below this number
                        </p>
                      </div>
                    </div>

                    {/* Cost per product when tracking stock */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Purchase Cost per Unit (฿){" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.cost}
                        onChange={(e) =>
                          setFormData({ ...formData, cost: e.target.value })
                        }
                        required={formData.trackStock}
                        className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Enter the buy price for this stock batch
                      </p>
                    </div>

                    {/* Stock Reduction Section */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                            Reduce Stock From Other Products
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            When this product is sold, automatically reduce
                            stock from selected products
                          </p>
                        </div>
                      </div>

                      {/* Stock Reduction Picker */}
                      {showStockReductionPicker ? (
                        <div className="space-y-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              type="text"
                              placeholder="Search products with stock tracking..."
                              value={stockReductionSearch}
                              onChange={(e) =>
                                setStockReductionSearch(e.target.value)
                              }
                              className="pl-9 bg-white dark:bg-gray-800"
                              autoFocus
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                            {filteredStockProducts.length === 0 ? (
                              <p className="p-3 text-sm text-gray-500 text-center">
                                No products found
                              </p>
                            ) : (
                              filteredStockProducts
                                .slice(0, 10)
                                .map((product) => (
                                  <button
                                    key={product.id}
                                    type="button"
                                    onClick={() => addStockReduction(product)}
                                    className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex justify-between items-center"
                                  >
                                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                      {product.name}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      Stock: {product.stock ?? 0}
                                    </span>
                                  </button>
                                ))
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowStockReductionPicker(false);
                              setStockReductionSearch("");
                            }}
                            className="w-full"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      ) : formData.stockReductions.length > 0 ? (
                        <div className="space-y-3">
                          {/* List of configured reductions */}
                          <div className="space-y-2">
                            {formData.stockReductions.map((reduction) => (
                              <div
                                key={reduction.productId}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                              >
                                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                  {reduction.productName}
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateStockReductionQuantity(
                                        reduction.productId,
                                        reduction.quantity - 1
                                      )
                                    }
                                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <span className="w-8 text-center font-medium">
                                    {reduction.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateStockReductionQuantity(
                                        reduction.productId,
                                        reduction.quantity + 1
                                      )
                                    }
                                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeStockReduction(reduction.productId)
                                    }
                                    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 ml-2"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Add more button */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowStockReductionPicker(true)}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Another Product
                          </Button>

                          {/* Reduce Own Stock Checkbox */}
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.reduceOwnStock}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    reduceOwnStock: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div>
                                <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                  Also reduce this product's own stock
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {formData.reduceOwnStock
                                    ? "This product's stock will be reduced along with the selected products above"
                                    : "Only the selected products above will have their stock reduced (recipe mode)"}
                                </p>
                              </div>
                            </label>
                          </div>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowStockReductionPicker(true)}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Product to Reduce Stock
                        </Button>
                      )}

                      {formData.stockReductions.length === 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                          No stock reductions configured. This product's own
                          stock will be reduced when sold (default behavior).
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Product Display Section */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">
                  Product Display
                </h3>
                <div className="space-y-4">
                  {/* Color or Image Selection */}
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          representationType: "color",
                        })
                      }
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 p-3 border-2 rounded-lg transition-all",
                        formData.representationType === "color"
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                      )}
                    >
                      <Palette className="h-5 w-5" />
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        Color
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          representationType: "image",
                        })
                      }
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 p-3 border-2 rounded-lg transition-all",
                        formData.representationType === "image"
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                      )}
                    >
                      <ImageIcon className="h-5 w-5" />
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        Image
                      </span>
                    </button>
                  </div>

                  {/* Color Choices */}
                  {formData.representationType === "color" && (
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                      {PRODUCT_COLORS.map((colorOption) => (
                        <button
                          key={colorOption.value}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              color: colorOption.value,
                            })
                          }
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 border-2 rounded-lg transition-all hover:scale-105",
                            formData.color === colorOption.value
                              ? "border-primary"
                              : "border-gray-200 dark:border-gray-600"
                          )}
                        >
                          <div
                            className="w-12 h-12 rounded-full"
                            style={{ backgroundColor: colorOption.hex }}
                          />
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {colorOption.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Image Upload */}
                  {formData.representationType === "image" && (
                    <div>
                      {formData.imagePreview ? (
                        <div className="relative">
                          <img
                            src={formData.imagePreview}
                            alt="Product preview"
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          <div className="absolute top-2 right-2 flex gap-2">
                            <label className="cursor-pointer bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                              <Edit className="h-4 w-4 text-gray-600 dark:text-gray-300" />
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
                              className="bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg hover:bg-red-100 dark:hover:bg-red-900 text-red-500"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                          <Upload className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-2" />
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            Click to upload product image
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
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
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Link href="/sales?tab=products" className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editId ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      {editId ? (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Update Product
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Create Product
                        </>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
