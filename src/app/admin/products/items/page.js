"use client";

import { useState, useEffect } from "react";
import { productsService, categoriesService } from "@/lib/firebase/firestore";
import { stockHistoryService } from "@/lib/firebase/stockHistoryService";
import { loyverseService } from "@/lib/api/loyverse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Tag,
  Layers,
  Filter,
  RefreshCw,
  X,
  Palette,
  Upload,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

export default function ItemListPage() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");
  const [selectedAvailability, setSelectedAvailability] = useState("all");
  const [selectedTrackStock, setSelectedTrackStock] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [syncingInventory, setSyncingInventory] = useState(false);
  const [showQuickAddCategory, setShowQuickAddCategory] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState("");
  const [isQuickAddingCategory, setIsQuickAddingCategory] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    handle: "",
    description: "",
    referenceId: "",
    categoryId: "",
    sku: "",
    barcode: "",
    price: "",
    cost: "",
    stock: "",
    trackStock: false,
    soldByWeight: false,
    availableForSale: true,
    form: "",
    color: "GREY",
    imageUrl: "",
    representationType: "color",
    image: null,
    imagePreview: null,
  });

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productsService.getAll({
        orderBy: ["name", "asc"],
      });
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await categoriesService.getAll();
      setCategories(data);

      // Create default categories if none exist
      if (data.length === 0) {
        const defaultCategories = [
          { name: "Flower" },
          { name: "Pre-Rolls" },
          { name: "Edibles" },
          { name: "Concentrates" },
          { name: "Accessories" },
        ];

        for (const cat of defaultCategories) {
          await categoriesService.create(cat);
        }

        loadCategories();
      }
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const syncInventoryFromLoyverse = async () => {
    try {
      setSyncingInventory(true);
      toast.info("🔄 Syncing inventory from Loyverse...");

      let successCount = 0;
      let skipCount = 0;

      // Process products in batches
      const batchSize = 10;
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);

        const batchPromises = batch.map(async (product) => {
          try {
            if (!product.variantId && !product.variant_id) {
              console.warn(`Product ${product.name} has no variantId`);
              skipCount++;
              return product;
            }

            const variantId = product.variantId || product.variant_id;

            // Fetch inventory for specific variant
            const response = await loyverseService.getInventory({
              variant_ids: variantId,
            });

            // Calculate total stock across all stores
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

            // Update product in Firebase
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

        // Small delay between batches
        if (i + batchSize < products.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      if (successCount > 0) {
        toast.success(
          `✅ Synced inventory for ${successCount} products${
            skipCount > 0 ? ` (${skipCount} skipped - no variant ID)` : ""
          }`
        );
      } else if (skipCount > 0) {
        toast.warning(
          `⚠️ ${skipCount} products skipped - missing variant IDs. Please sync products from Loyverse first.`
        );
      } else {
        toast.error("Failed to sync inventory");
      }
    } catch (error) {
      console.error("Error syncing inventory:", error);
      toast.error("Failed to sync inventory: " + error.message);
    } finally {
      setSyncingInventory(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Generate SKU if empty
      const finalSKU = formData.sku || generateNextSKU();

      // Match Loyverse data structure
      const productData = {
        // Basic info
        name: formData.name,
        handle:
          formData.handle || formData.name.toLowerCase().replace(/\s+/g, "-"),
        description: formData.description || "",
        referenceId: formData.referenceId || "",

        // Category
        categoryId: formData.categoryId || null,

        // Variant data (primary)
        sku: finalSKU,
        barcode: formData.barcode || "",
        price: parseFloat(formData.price) || 0,
        cost: parseFloat(formData.cost) || 0,
        purchaseCost: parseFloat(formData.cost) || 0,
        pricingType: "FIXED",

        // Stock
        stock: parseInt(formData.stock) || 0,
        lowStock: formData.trackStock ? parseInt(formData.lowStock) || 0 : null,
        trackStock: formData.trackStock,
        soldByWeight: formData.soldByWeight,
        availableForSale: formData.availableForSale,

        // Visual
        form: formData.form || null,
        color: formData.color || null,
        imageUrl: formData.imageUrl || null,

        // Flags
        isComposite: false,
        useProduction: false,

        // IDs
        primarySupplierId: null,
        taxIds: [],
        modifiersIds: [],
        components: [],
        variants: [],

        // Options
        option1Name: null,
        option2Name: null,
        option3Name: null,

        // Source
        source: "manual",

        // Timestamps
        createdAt: editingProduct?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      if (editingProduct) {
        // Check if stock changed when editing
        const oldStock = editingProduct.stock || 0;
        const newStock = productData.stock;
        const stockChanged = oldStock !== newStock;

        await productsService.update(editingProduct.id, productData);

        // Log stock change in history if trackStock is enabled and stock changed
        if (productData.trackStock && stockChanged) {
          const stockDifference = newStock - oldStock;
          try {
            await stockHistoryService.logStockMovement({
              productId: editingProduct.id,
              productName: productData.name,
              productSku: finalSKU,
              type: "adjustment",
              quantity: stockDifference,
              previousStock: oldStock,
              newStock: newStock,
              reason:
                stockDifference > 0
                  ? `Stock increased by ${stockDifference} via product edit`
                  : `Stock decreased by ${Math.abs(
                      stockDifference
                    )} via product edit`,
              userId: user?.uid || "",
              userName: user?.displayName || user?.email || "",
            });
            console.log("Stock change logged in history");
          } catch (stockError) {
            console.error("Error logging stock change:", stockError);
          }
        }

        toast.success("Product updated successfully");
      } else {
        const newProduct = await productsService.create(productData);
        console.log("New product created:", newProduct);

        // Log initial stock in history if trackStock is enabled
        if (
          newProduct &&
          newProduct.id &&
          productData.trackStock &&
          productData.stock > 0
        ) {
          console.log("Logging stock history for new product...");
          try {
            await stockHistoryService.logStockMovement({
              productId: newProduct.id,
              productName: productData.name,
              productSku: finalSKU,
              type: "initial",
              quantity: productData.stock,
              previousStock: 0,
              newStock: productData.stock,
              reason: "Initial stock on product creation",
              userId: user?.uid || "",
              userName: user?.displayName || user?.email || "",
            });
            console.log("Stock history logged successfully");
          } catch (stockError) {
            console.error("Error logging stock history:", stockError);
          }
        } else {
          console.log("Stock history not logged:", {
            hasProduct: !!newProduct,
            hasId: !!newProduct?.id,
            trackStock: productData.trackStock,
            stock: productData.stock,
          });
        }

        toast.success("Product created successfully");
      }

      setIsModalOpen(false);
      resetForm();
      loadProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Failed to save product");
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || "",
      handle: product.handle || "",
      description: product.description || "",
      referenceId: product.referenceId || "",
      categoryId: product.categoryId || "",
      sku: product.sku || "",
      barcode: product.barcode || "",
      price: product.price?.toString() || "",
      cost: product.cost?.toString() || "",
      stock: product.stock?.toString() || "",
      lowStock: product.lowStock?.toString() || "",
      trackStock: product.trackStock || false,
      soldByWeight: product.soldByWeight || false,
      availableForSale: product.availableForSale !== false,
      form: product.form || "",
      color: product.color || "",
      imageUrl: product.imageUrl || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      await productsService.delete(id);
      toast.success("Product deleted successfully");
      loadProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) {
      toast.error("No products selected");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete ${selectedProducts.length} product(s)?`
      )
    )
      return;

    try {
      await Promise.all(
        selectedProducts.map((id) => productsService.delete(id))
      );
      toast.success(
        `${selectedProducts.length} product(s) deleted successfully`
      );
      setSelectedProducts([]);
      loadProducts();
    } catch (error) {
      console.error("Error deleting products:", error);
      toast.error("Failed to delete products");
    }
  };

  const toggleProductSelection = (productId) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map((p) => p.id));
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

      const newCategory = await categoriesService.create(categoryData);
      toast.success(`Category "${quickCategoryName}" created`);

      // Reload categories
      await loadCategories();

      // Set the new category as selected
      setFormData({
        ...formData,
        categoryId: newCategory.id,
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
      setFormData({
        ...formData,
        image: file,
        imagePreview: reader.result,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setFormData({
      ...formData,
      image: null,
      imagePreview: null,
    });
  };

  const generateNextSKU = () => {
    // Get all numeric SKUs from products
    const numericSKUs = products
      .map((p) => p.sku)
      .filter((sku) => sku && /^\d+$/.test(sku)) // Only numeric SKUs
      .map((sku) => parseInt(sku, 10))
      .filter((num) => !isNaN(num));

    if (numericSKUs.length === 0) {
      // No numeric SKUs exist, start with 10001
      return "10001";
    }

    // Find the highest SKU and add 1
    const maxSKU = Math.max(...numericSKUs);
    return String(maxSKU + 1);
  };

  const resetForm = () => {
    const nextSKU = generateNextSKU();

    setFormData({
      name: "",
      handle: "",
      description: "",
      referenceId: "",
      categoryId: "",
      sku: nextSKU,
      barcode: "",
      price: "",
      cost: "",
      stock: "",
      trackStock: false,
      soldByWeight: false,
      availableForSale: true,
      form: "",
      color: "GREY",
      imageUrl: "",
      representationType: "color",
      image: null,
      imagePreview: null,
    });
    setEditingProduct(null);
    setShowQuickAddCategory(false);
    setQuickCategoryName("");
  };

  const filteredProducts = products.filter((p) => {
    // Search filter
    const matchesSearch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.includes(searchQuery) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.handle?.toLowerCase().includes(searchQuery.toLowerCase());

    // Category filter
    const matchesCategory =
      selectedCategory === "all" ||
      p.categoryId === selectedCategory ||
      (!p.categoryId && selectedCategory === "uncategorized");

    // Source filter
    const matchesSource =
      selectedSource === "all" || p.source === selectedSource;

    // Availability filter
    const matchesAvailability =
      selectedAvailability === "all" ||
      (selectedAvailability === "available" && p.availableForSale) ||
      (selectedAvailability === "unavailable" && !p.availableForSale);

    // Track Stock filter
    const matchesTrackStock =
      selectedTrackStock === "all" ||
      (selectedTrackStock === "tracked" && p.trackStock) ||
      (selectedTrackStock === "untracked" && !p.trackStock);

    return (
      matchesSearch &&
      matchesCategory &&
      matchesSource &&
      matchesAvailability &&
      matchesTrackStock
    );
  });

  // Get category name by ID
  const getCategoryName = (categoryId) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || "Uncategorized";
  };

  return (
    <div className="space-y-6">
      {/* Product Detail Modal */}
      <Dialog
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>
              Complete information about this product
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-6">
              {/* Image & Basic Info */}
              <div className="flex gap-6">
                <div className="w-48 h-48 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {selectedProduct.imageUrl ? (
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-16 w-16 text-neutral-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">
                    {selectedProduct.name}
                  </h2>
                  {selectedProduct.description && (
                    <p className="text-neutral-600 dark:text-neutral-400 mb-3">
                      {selectedProduct.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.categoryId && (
                      <Badge variant="secondary">
                        {getCategoryName(selectedProduct.categoryId)}
                      </Badge>
                    )}
                    <Badge
                      variant={
                        selectedProduct.availableForSale
                          ? "default"
                          : "secondary"
                      }
                    >
                      {selectedProduct.availableForSale
                        ? "Available"
                        : "Unavailable"}
                    </Badge>
                    {selectedProduct.source && (
                      <Badge variant="outline">{selectedProduct.source}</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-neutral-500">
                    Handle
                  </label>
                  <p className="text-sm">{selectedProduct.handle || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-500">
                    Reference ID
                  </label>
                  <p className="text-sm">
                    {selectedProduct.referenceId || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-500">
                    SKU
                  </label>
                  <p className="text-sm">{selectedProduct.sku || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-500">
                    Barcode
                  </label>
                  <p className="text-sm">{selectedProduct.barcode || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-500">
                    Price
                  </label>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(selectedProduct.price)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-500">
                    Cost
                  </label>
                  <p className="text-lg font-semibold">
                    {formatCurrency(selectedProduct.cost || 0)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-500">
                    Stock
                  </label>
                  <p className="text-sm">{selectedProduct.stock}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-500">
                    Low Stock Alert
                  </label>
                  <p className="text-sm">{selectedProduct.lowStock || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-500">
                    Pricing Type
                  </label>
                  <p className="text-sm">
                    {selectedProduct.pricingType || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-500">
                    Form
                  </label>
                  <p className="text-sm">{selectedProduct.form || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-500">
                    Color
                  </label>
                  <div className="flex items-center gap-2">
                    {selectedProduct.color && (
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: selectedProduct.color }}
                      />
                    )}
                    <p className="text-sm">{selectedProduct.color || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Flags */}
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  {selectedProduct.trackStock ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-neutral-400" />
                  )}
                  <span className="text-sm">Track Stock</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedProduct.soldByWeight ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-neutral-400" />
                  )}
                  <span className="text-sm">Sold by Weight</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedProduct.isComposite ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-neutral-400" />
                  )}
                  <span className="text-sm">Composite</span>
                </div>
              </div>

              {/* Variants */}
              {selectedProduct.variants &&
                selectedProduct.variants.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">
                      Variants ({selectedProduct.variants.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedProduct.variants.map((variant, idx) => (
                        <Card key={variant.variant_id || idx}>
                          <CardContent className="p-3">
                            <div className="grid grid-cols-4 gap-3 text-sm">
                              <div>
                                <label className="text-xs text-neutral-500">
                                  SKU
                                </label>
                                <p className="font-medium">
                                  {variant.sku || "N/A"}
                                </p>
                              </div>
                              <div>
                                <label className="text-xs text-neutral-500">
                                  Barcode
                                </label>
                                <p className="font-medium">
                                  {variant.barcode || "N/A"}
                                </p>
                              </div>
                              <div>
                                <label className="text-xs text-neutral-500">
                                  Price
                                </label>
                                <p className="font-medium text-green-600">
                                  {formatCurrency(variant.default_price || 0)}
                                </p>
                              </div>
                              <div>
                                <label className="text-xs text-neutral-500">
                                  Cost
                                </label>
                                <p className="font-medium">
                                  {formatCurrency(variant.cost || 0)}
                                </p>
                              </div>
                            </div>
                            {variant.stores && variant.stores.length > 0 && (
                              <div className="mt-2 pt-2 border-t">
                                <label className="text-xs text-neutral-500 mb-1 block">
                                  Store Availability
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  {variant.stores.map((store, sidx) => (
                                    <Badge
                                      key={sidx}
                                      variant={
                                        store.available_for_sale
                                          ? "default"
                                          : "secondary"
                                      }
                                      className="text-xs"
                                    >
                                      {store.available_for_sale
                                        ? "Available"
                                        : "Unavailable"}{" "}
                                      - {formatCurrency(store.price || 0)}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 text-xs text-neutral-500">
                <div>
                  <label className="font-medium">Created At</label>
                  <p>
                    {selectedProduct.createdAt
                      ? new Date(
                          selectedProduct.createdAt.seconds * 1000
                        ).toLocaleString()
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <label className="font-medium">Updated At</label>
                  <p>
                    {selectedProduct.updatedAt
                      ? new Date(
                          selectedProduct.updatedAt.seconds * 1000
                        ).toLocaleString()
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl lg:text-3xl font-bold">Product Management</h1>
          <p className="text-neutral-500 mt-1 lg:mt-2 text-sm lg:text-base hidden sm:block">
            Manage your product inventory and information
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="flex-shrink-0">
                <Plus className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Add Product</span>
              </Button>
            </DialogTrigger>
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
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Product Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Product Name *
                  </label>
                  <Input
                    placeholder="e.g., Coffee, T-Shirt, Laptop"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
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
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Cost / Buy Price (฿)
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
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      {formData.trackStock
                        ? "Enter cost in Track Stock section below"
                        : "Your purchase cost per product"}
                    </p>
                  </div>
                </div>

                {/* SKU and Barcode */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      SKU
                    </label>
                    <Input
                      placeholder="Auto-generated"
                      value={formData.sku}
                      onChange={(e) =>
                        setFormData({ ...formData, sku: e.target.value })
                      }
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      Auto-generated if left empty
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Barcode
                    </label>
                    <Input
                      placeholder="Scan or enter barcode"
                      value={formData.barcode}
                      onChange={(e) =>
                        setFormData({ ...formData, barcode: e.target.value })
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
                        checked={formData.trackStock}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            trackStock: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-gray-700 dark:peer-checked:after:border-gray-700 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 dark:after:bg-gray-300 after:border-gray-600 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Stock Fields - Show only when Track Stock is ON */}
                  {formData.trackStock && (
                    <div className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            In Stock *
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
                            value={formData.lowStock || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                lowStock: e.target.value,
                              })
                            }
                            required={formData.trackStock}
                          />
                          <p className="text-xs text-neutral-500 mt-1">
                            Alert when stock falls below this number
                          </p>
                        </div>
                      </div>

                      {/* Cost per product when tracking stock */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Purchase Cost per Unit (฿) *
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
                        />
                        <p className="text-xs text-neutral-500 mt-1">
                          Enter the buy price for this stock batch
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
                          setFormData({
                            ...formData,
                            representationType: "color",
                          })
                        }
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 p-3 border-2 rounded-lg transition-all",
                          formData.representationType === "color"
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
                          setFormData({
                            ...formData,
                            representationType: "image",
                          })
                        }
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 p-3 border-2 rounded-lg transition-all",
                          formData.representationType === "image"
                            ? "border-primary bg-primary/5"
                            : "border-neutral-200 hover:border-neutral-300"
                        )}
                      >
                        <ImageIcon className="h-5 w-5" />
                        <span className="font-medium">Image</span>
                      </button>
                    </div>

                    {/* Color Picker */}
                    {formData.representationType === "color" && (
                      <div className="grid grid-cols-4 gap-3">
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
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    {editingProduct ? "Update Product" : "Create Product"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Desktop Filters */}
            <div className="hidden lg:flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-neutral-500" />
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Filters:
                </span>
              </div>

              {/* Category Filter */}
              <select
                className="px-3 py-1.5 text-sm border rounded-md bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
                <option value="uncategorized">Uncategorized</option>
              </select>

              {/* Source Filter */}
              <select
                className="px-3 py-1.5 text-sm border rounded-md bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
              >
                <option value="all">All Sources</option>
                <option value="loyverse">Loyverse</option>
                <option value="manual">Manual</option>
              </select>

              {/* Availability Filter */}
              <select
                className="px-3 py-1.5 text-sm border rounded-md bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                value={selectedAvailability}
                onChange={(e) => setSelectedAvailability(e.target.value)}
              >
                <option value="all">All Availability</option>
                <option value="available">Available for Sale</option>
                <option value="unavailable">Not Available</option>
              </select>

              {/* Track Stock Filter */}
              <select
                className="px-3 py-1.5 text-sm border rounded-md bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                value={selectedTrackStock}
                onChange={(e) => setSelectedTrackStock(e.target.value)}
              >
                <option value="all">All Stock Tracking</option>
                <option value="tracked">Track Stock: Yes</option>
                <option value="untracked">Track Stock: No</option>
              </select>

              {/* Clear Filters */}
              {(selectedCategory !== "all" ||
                selectedSource !== "all" ||
                selectedAvailability !== "all" ||
                selectedTrackStock !== "all" ||
                searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory("all");
                    setSelectedSource("all");
                    setSelectedAvailability("all");
                    setSelectedTrackStock("all");
                    setSearchQuery("");
                  }}
                  className="text-xs"
                >
                  Clear Filters
                </Button>
              )}

              <span className="text-sm text-neutral-500 ml-auto">
                {filteredProducts.length} items
              </span>
            </div>

            {/* Mobile Filters - Stacked */}
            <div className="lg:hidden space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-neutral-500" />
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Filters
                  </span>
                </div>
                <span className="text-sm text-neutral-500">
                  {filteredProducts.length} items
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Category Filter */}
                <select
                  className="px-3 py-2.5 text-sm border rounded-lg bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-white font-medium"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                  <option value="uncategorized">Uncategorized</option>
                </select>

                {/* Availability Filter */}
                <select
                  className="px-3 py-2.5 text-sm border rounded-lg bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-white font-medium"
                  value={selectedAvailability}
                  onChange={(e) => setSelectedAvailability(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>

              {/* Clear Filters Button - Mobile */}
              {(selectedCategory !== "all" ||
                selectedSource !== "all" ||
                selectedAvailability !== "all" ||
                selectedTrackStock !== "all" ||
                searchQuery) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory("all");
                    setSelectedSource("all");
                    setSelectedAvailability("all");
                    setSelectedTrackStock("all");
                    setSearchQuery("");
                  }}
                  className="w-full"
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-neutral-500">Loading products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-500">No products found</p>
            <Button className="mt-4" onClick={() => setIsModalOpen(true)}>
              Add your first product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop View - Table */}
          <div className="hidden lg:block">
            {/* Bulk Actions */}
            {selectedProducts.length > 0 && (
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedProducts.length} product(s) selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            )}

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-neutral-50 dark:bg-neutral-800 border-b dark:border-neutral-700">
                      <tr>
                        <th className="text-left p-4 font-semibold text-sm w-12">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-neutral-300 cursor-pointer"
                            checked={
                              selectedProducts.length ===
                                filteredProducts.length &&
                              filteredProducts.length > 0
                            }
                            onChange={toggleSelectAll}
                          />
                        </th>
                        <th className="text-left p-4 font-semibold text-sm">
                          Item Name
                        </th>
                        <th className="text-left p-4 font-semibold text-sm">
                          Category
                        </th>
                        <th className="text-right p-4 font-semibold text-sm">
                          Price
                        </th>
                        <th className="text-right p-4 font-semibold text-sm">
                          Cost
                        </th>
                        <th className="text-right p-4 font-semibold text-sm">
                          Margin
                        </th>
                        <th className="text-center p-4 font-semibold text-sm">
                          In Stock
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-neutral-700">
                      {filteredProducts.map((product) => {
                        const margin =
                          product.cost > 0
                            ? (
                                ((product.price - product.cost) /
                                  product.price) *
                                100
                              ).toFixed(1)
                            : "0";

                        return (
                          <tr
                            key={product.id}
                            className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                          >
                            {/* Checkbox */}
                            <td className="p-4">
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-neutral-300 cursor-pointer"
                                checked={selectedProducts.includes(product.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleProductSelection(product.id);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>

                            {/* Item Name */}
                            <td
                              className="p-4 cursor-pointer"
                              onClick={() => handleEdit(product)}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-12 h-12 rounded flex items-center justify-center flex-shrink-0 overflow-hidden"
                                  style={{
                                    backgroundColor: product.imageUrl
                                      ? "transparent"
                                      : product.color || "#e5e7eb",
                                  }}
                                >
                                  {product.imageUrl ? (
                                    <img
                                      src={product.imageUrl}
                                      alt={product.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div
                                      className="w-full h-full flex items-center justify-center text-white font-bold text-lg"
                                      style={{
                                        backgroundColor:
                                          product.color || "#9ca3af",
                                      }}
                                    >
                                      {product.name.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                                    {product.name}
                                  </div>
                                  {product.sku && (
                                    <div className="text-xs text-neutral-500 truncate">
                                      SKU: {product.sku}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Category */}
                            <td
                              className="p-4 cursor-pointer"
                              onClick={() => handleEdit(product)}
                            >
                              <Badge
                                variant="secondary"
                                className="text-xs"
                                style={{
                                  backgroundColor: product.color
                                    ? `${product.color}20`
                                    : undefined,
                                  color: product.color || undefined,
                                }}
                              >
                                {getCategoryName(product.categoryId)}
                              </Badge>
                            </td>

                            {/* Price */}
                            <td
                              className="p-4 text-right cursor-pointer"
                              onClick={() => handleEdit(product)}
                            >
                              <div className="font-bold text-green-600">
                                {formatCurrency(product.price)}
                              </div>
                            </td>

                            {/* Cost */}
                            <td
                              className="p-4 text-right cursor-pointer"
                              onClick={() => handleEdit(product)}
                            >
                              <div className="font-medium text-neutral-700 dark:text-neutral-300">
                                {formatCurrency(product.cost || 0)}
                              </div>
                            </td>

                            {/* Margin */}
                            <td
                              className="p-4 text-right cursor-pointer"
                              onClick={() => handleEdit(product)}
                            >
                              <div
                                className={`font-semibold ${
                                  parseFloat(margin) > 50
                                    ? "text-green-600"
                                    : parseFloat(margin) > 30
                                    ? "text-blue-600"
                                    : "text-neutral-600"
                                }`}
                              >
                                {margin}%
                              </div>
                            </td>

                            {/* In Stock */}
                            <td
                              className="p-4 text-center cursor-pointer"
                              onClick={() => handleEdit(product)}
                            >
                              <div className="flex items-center justify-center gap-2">
                                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                                  {product.stock || 0}
                                </span>
                                {product.trackStock &&
                                  product.lowStock &&
                                  product.stock <= product.lowStock && (
                                    <Badge
                                      variant="destructive"
                                      className="text-xs"
                                    >
                                      Low
                                    </Badge>
                                  )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile View - Compact Expandable Cards */}
          <div className="lg:hidden space-y-3">
            {filteredProducts.map((product) => {
              const isExpanded = expandedProductId === product.id;
              return (
                <Card
                  key={product.id}
                  className="overflow-hidden border-2 dark:border-neutral-800 transition-all"
                  onClick={() =>
                    setExpandedProductId(isExpanded ? null : product.id)
                  }
                >
                  <CardContent className="p-4">
                    {/* Collapsed View - Essential Info Only */}
                    <div className="flex gap-3">
                      {/* Thumbnail */}
                      <div className="w-20 h-20 bg-neutral-50 dark:bg-neutral-800 flex-shrink-0 rounded-lg flex items-center justify-center overflow-hidden">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-neutral-400" />
                        )}
                      </div>

                      {/* Main Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base leading-tight mb-1 line-clamp-2">
                          {product.name}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl font-bold text-green-600">
                            {formatCurrency(product.price)}
                          </span>
                          <Badge
                            variant={
                              product.availableForSale ? "default" : "secondary"
                            }
                            className="text-xs"
                          >
                            {product.availableForSale ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-neutral-500">
                          <span>Stock: {product.stock}</span>
                          <span>•</span>
                          <span className="truncate">
                            {getCategoryName(product.categoryId)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded View - Full Details */}
                    {isExpanded && (
                      <div
                        className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Description */}
                        {product.description && (
                          <div>
                            <h4 className="text-xs font-semibold text-neutral-500 mb-1">
                              Description
                            </h4>
                            <p className="text-sm text-neutral-700 dark:text-neutral-300">
                              {product.description}
                            </p>
                          </div>
                        )}

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
                            <div className="text-xs text-neutral-500 mb-1">
                              SKU
                            </div>
                            <div className="font-semibold text-sm">
                              {product.sku || "N/A"}
                            </div>
                          </div>
                          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
                            <div className="text-xs text-neutral-500 mb-1">
                              Barcode
                            </div>
                            <div className="font-semibold text-sm">
                              {product.barcode || "N/A"}
                            </div>
                          </div>
                          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
                            <div className="text-xs text-neutral-500 mb-1">
                              Cost
                            </div>
                            <div className="font-semibold text-sm text-amber-600">
                              {formatCurrency(product.cost)}
                            </div>
                          </div>
                          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
                            <div className="text-xs text-neutral-500 mb-1">
                              Variants
                            </div>
                            <div className="font-semibold text-sm">
                              {product.variants?.length || 1}
                            </div>
                          </div>
                        </div>

                        {/* All Badges */}
                        <div className="flex flex-wrap gap-2">
                          {product.categoryId && (
                            <Badge variant="secondary" className="text-xs">
                              {getCategoryName(product.categoryId)}
                            </Badge>
                          )}
                          {product.source && (
                            <Badge variant="outline" className="text-xs">
                              {product.source}
                            </Badge>
                          )}
                          {product.isComposite && (
                            <Badge variant="outline" className="text-xs">
                              <Layers className="h-3 w-3 mr-1" />
                              Composite
                            </Badge>
                          )}
                          {product.form && (
                            <Badge variant="outline" className="text-xs">
                              {product.form}
                            </Badge>
                          )}
                          {product.trackStock && (
                            <Badge variant="outline" className="text-xs">
                              Track Stock
                            </Badge>
                          )}
                          {product.soldByWeight && (
                            <Badge variant="outline" className="text-xs">
                              Sold by Weight
                            </Badge>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => setSelectedProduct(product)}
                          >
                            <Package className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="w-full"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
