"use client";

import { useState, useEffect } from "react";
import { productsService, categoriesService } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { toast } from "sonner";

export default function ItemListPage() {
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
    color: "",
    imageUrl: "",
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
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
        sku: formData.sku || "",
        barcode: formData.barcode || "",
        price: parseFloat(formData.price) || 0,
        cost: parseFloat(formData.cost) || 0,
        purchaseCost: parseFloat(formData.cost) || 0,
        pricingType: "FIXED",

        // Stock
        stock: parseInt(formData.stock) || 0,
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
        await productsService.update(editingProduct.id, productData);
        toast.success("Product updated successfully");
      } else {
        await productsService.create(productData);
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

  const resetForm = () => {
    setFormData({
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
      color: "",
      imageUrl: "",
    });
    setEditingProduct(null);
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
                <div className="w-48 h-48 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {selectedProduct.imageUrl ? (
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-16 w-16 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">
                    {selectedProduct.name}
                  </h2>
                  {selectedProduct.description && (
                    <p className="text-gray-600 mb-3">
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
                  <label className="text-sm font-medium text-gray-500">
                    Handle
                  </label>
                  <p className="text-sm">{selectedProduct.handle || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Reference ID
                  </label>
                  <p className="text-sm">
                    {selectedProduct.referenceId || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    SKU
                  </label>
                  <p className="text-sm">{selectedProduct.sku || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Barcode
                  </label>
                  <p className="text-sm">{selectedProduct.barcode || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Price
                  </label>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(selectedProduct.price)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Cost
                  </label>
                  <p className="text-lg font-semibold">
                    {formatCurrency(selectedProduct.cost || 0)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Stock
                  </label>
                  <p className="text-sm">{selectedProduct.stock}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Pricing Type
                  </label>
                  <p className="text-sm">
                    {selectedProduct.pricingType || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Form
                  </label>
                  <p className="text-sm">{selectedProduct.form || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
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
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm">Track Stock</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedProduct.soldByWeight ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm">Sold by Weight</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedProduct.isComposite ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
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
                                <label className="text-xs text-gray-500">
                                  SKU
                                </label>
                                <p className="font-medium">
                                  {variant.sku || "N/A"}
                                </p>
                              </div>
                              <div>
                                <label className="text-xs text-gray-500">
                                  Barcode
                                </label>
                                <p className="font-medium">
                                  {variant.barcode || "N/A"}
                                </p>
                              </div>
                              <div>
                                <label className="text-xs text-gray-500">
                                  Price
                                </label>
                                <p className="font-medium text-green-600">
                                  {formatCurrency(variant.default_price || 0)}
                                </p>
                              </div>
                              <div>
                                <label className="text-xs text-gray-500">
                                  Cost
                                </label>
                                <p className="font-medium">
                                  {formatCurrency(variant.cost || 0)}
                                </p>
                              </div>
                            </div>
                            {variant.stores && variant.stores.length > 0 && (
                              <div className="mt-2 pt-2 border-t">
                                <label className="text-xs text-gray-500 mb-1 block">
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
              <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Product Items</h1>
          <p className="text-gray-500 mt-2">Manage your product inventory</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Edit Product" : "Add New Product"}
              </DialogTitle>
              <DialogDescription>
                {editingProduct
                  ? "Update product information"
                  : "Create a new product"}
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={handleSubmit}
              className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
            >
              {/* Basic Information */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Item Name*</label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Hybrid King"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Handle</label>
                  <Input
                    value={formData.handle}
                    onChange={(e) =>
                      setFormData({ ...formData, handle: e.target.value })
                    }
                    placeholder="e.g., hybrid-king"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reference ID</label>
                  <Input
                    value={formData.referenceId}
                    onChange={(e) =>
                      setFormData({ ...formData, referenceId: e.target.value })
                    }
                    placeholder="Optional reference"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md"
                  rows={2}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Product description..."
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.categoryId}
                  onChange={(e) =>
                    setFormData({ ...formData, categoryId: e.target.value })
                  }
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Variant Info */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-3">Variant Details</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">SKU</label>
                    <Input
                      value={formData.sku}
                      onChange={(e) =>
                        setFormData({ ...formData, sku: e.target.value })
                      }
                      placeholder="e.g., 10018"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Barcode</label>
                    <Input
                      value={formData.barcode}
                      onChange={(e) =>
                        setFormData({ ...formData, barcode: e.target.value })
                      }
                      placeholder="Product barcode"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Price*</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cost</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) =>
                        setFormData({ ...formData, cost: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Stock</label>
                    <Input
                      type="number"
                      value={formData.stock}
                      onChange={(e) =>
                        setFormData({ ...formData, stock: e.target.value })
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Visual & Properties */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-3">
                  Visual & Properties
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Form</label>
                    <select
                      className="w-full px-3 py-2 border rounded-md"
                      value={formData.form}
                      onChange={(e) =>
                        setFormData({ ...formData, form: e.target.value })
                      }
                    >
                      <option value="">Select form</option>
                      <option value="SQUARE">Square</option>
                      <option value="CIRCLE">Circle</option>
                      <option value="RECTANGLE">Rectangle</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Color</label>
                    <select
                      className="w-full px-3 py-2 border rounded-md"
                      value={formData.color}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value })
                      }
                    >
                      <option value="">Select color</option>
                      <option value="RED">Red</option>
                      <option value="BLUE">Blue</option>
                      <option value="GREEN">Green</option>
                      <option value="YELLOW">Yellow</option>
                      <option value="PURPLE">Purple</option>
                      <option value="ORANGE">Orange</option>
                      <option value="GREY">Grey</option>
                      <option value="BLACK">Black</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <label className="text-sm font-medium">Image URL</label>
                  <Input
                    value={formData.imageUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, imageUrl: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Flags */}
              <div className="border-t pt-4 space-y-3">
                <h4 className="text-sm font-semibold">Options</h4>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="trackStock"
                    checked={formData.trackStock}
                    onChange={(e) =>
                      setFormData({ ...formData, trackStock: e.target.checked })
                    }
                    className="rounded"
                  />
                  <label htmlFor="trackStock" className="text-sm">
                    Track Stock
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="soldByWeight"
                    checked={formData.soldByWeight}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        soldByWeight: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <label htmlFor="soldByWeight" className="text-sm">
                    Sold by Weight
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="availableForSale"
                    checked={formData.availableForSale}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        availableForSale: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <label htmlFor="availableForSale" className="text-sm">
                    Available for Sale
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t sticky bottom-0 bg-white">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingProduct ? "Update Item" : "Create Item"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, SKU, barcode, or handle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Compact Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  Filters:
                </span>
              </div>

              {/* Category Filter */}
              <select
                className="px-3 py-1.5 text-sm border rounded-md bg-white"
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
                className="px-3 py-1.5 text-sm border rounded-md bg-white"
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
              >
                <option value="all">All Sources</option>
                <option value="loyverse">Loyverse</option>
                <option value="manual">Manual</option>
              </select>

              {/* Availability Filter */}
              <select
                className="px-3 py-1.5 text-sm border rounded-md bg-white"
                value={selectedAvailability}
                onChange={(e) => setSelectedAvailability(e.target.value)}
              >
                <option value="all">All Availability</option>
                <option value="available">Available for Sale</option>
                <option value="unavailable">Not Available</option>
              </select>

              {/* Track Stock Filter */}
              <select
                className="px-3 py-1.5 text-sm border rounded-md bg-white"
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

              <span className="text-sm text-gray-500 ml-auto">
                {filteredProducts.length} items
              </span>
            </div>
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
            <p className="text-gray-500">No products found</p>
            <Button className="mt-4" onClick={() => setIsModalOpen(true)}>
              Add your first product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredProducts.map((product) => (
            <Card
              key={product.id}
              className="overflow-hidden hover:shadow-md transition-shadow"
            >
              <CardContent className="p-0">
                <div className="flex">
                  {/* Product Image */}
                  <div className="w-40 h-40 bg-gray-50 flex-shrink-0 flex items-center justify-center border-r overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-contain p-2"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "";
                          e.target.style.display = "none";
                          const fallback =
                            e.target.parentElement.querySelector(
                              ".fallback-icon"
                            );
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className={`fallback-icon ${
                        product.imageUrl ? "hidden" : "flex"
                      } items-center justify-center w-full h-full bg-gradient-to-br from-gray-50 to-gray-100`}
                    >
                      <ImageIcon className="h-16 w-16 text-gray-300" />
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 p-5 flex flex-col">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg leading-tight truncate pr-2">
                          {product.name}
                        </h3>
                        {product.handle && (
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            @{product.handle}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-1 ml-3 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                          onClick={() => setSelectedProduct(product)}
                          title="View Details"
                        >
                          <Package className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-amber-50 hover:text-amber-600"
                          onClick={() => handleEdit(product)}
                          title="Edit Product"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-red-50 text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(product.id)}
                          title="Delete Product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {product.categoryId && (
                        <Badge
                          variant="secondary"
                          className="text-xs font-medium"
                          style={{
                            backgroundColor: product.color
                              ? `${product.color}20`
                              : undefined,
                            color: product.color || undefined,
                          }}
                        >
                          {getCategoryName(product.categoryId)}
                        </Badge>
                      )}
                      <Badge
                        variant={
                          product.availableForSale ? "default" : "secondary"
                        }
                        className="text-xs font-medium"
                      >
                        {product.availableForSale ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Available
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Unavailable
                          </>
                        )}
                      </Badge>
                      {product.source && (
                        <Badge
                          variant="outline"
                          className="text-xs font-medium capitalize"
                        >
                          {product.source}
                        </Badge>
                      )}
                      {product.isComposite && (
                        <Badge
                          variant="outline"
                          className="text-xs font-medium"
                        >
                          <Layers className="h-3 w-3 mr-1" />
                          Composite
                        </Badge>
                      )}
                      {product.form && (
                        <Badge
                          variant="outline"
                          className="text-xs font-medium"
                        >
                          {product.form}
                        </Badge>
                      )}
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-3">
                      <div className="flex items-center text-gray-600 min-w-0">
                        <Tag className="h-3.5 w-3.5 mr-2 flex-shrink-0 text-gray-400" />
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          SKU:
                        </span>
                        <span className="ml-1.5 font-medium text-gray-900 truncate">
                          {product.sku || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center text-gray-600 min-w-0">
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          Barcode:
                        </span>
                        <span className="ml-1.5 font-medium text-gray-900 truncate">
                          {product.barcode || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <span className="text-xs text-gray-500">Stock:</span>
                        <span className="ml-1.5 font-medium text-gray-900">
                          {product.stock}
                        </span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <span className="text-xs text-gray-500">Variants:</span>
                        <span className="ml-1.5 font-medium text-gray-900">
                          {product.variants?.length || 1}
                        </span>
                      </div>
                    </div>

                    {/* Price - Push to bottom */}
                    <div className="mt-auto pt-3 border-t flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-green-600">
                          {formatCurrency(product.price)}
                        </span>
                        {product.cost > 0 && (
                          <span className="text-xs text-gray-500">
                            Cost: {formatCurrency(product.cost)}
                          </span>
                        )}
                      </div>
                      {product.pricingType && (
                        <Badge
                          variant="outline"
                          className="text-xs font-medium"
                        >
                          {product.pricingType}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
