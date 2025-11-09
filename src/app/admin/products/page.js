"use client";

import { useState, useEffect } from "react";
import { productsService, categoriesService } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dbService } from "@/lib/db/dbService";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  FolderTree,
  Tag,
  Percent,
  Download,
  RefreshCw,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function ItemListTab() {
  const [activeMenu, setActiveMenu] = useState("products");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isFetchingFromKiosk, setIsFetchingFromKiosk] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    stock: "",
    barcode: "",
    sku: "",
    category: "",
    description: "",
    color: "#3b82f6",
    discountType: "percentage",
    discountValue: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        productsService.getAll({ orderBy: ["name", "asc"] }),
        categoriesService.getAll(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData.filter((cat) => !cat.deletedAt));
      // TODO: Load discounts from your discount service when ready
      setDiscounts([]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleFetchFromKiosk = async () => {
    try {
      setIsFetchingFromKiosk(true);
      toast.info("Fetching products from Kiosk...");

      // Fetch products from kiosk API
      const kioskUrl = "https://candy-kush-kiosk.vercel.app/api/products";
      const response = await fetch(kioskUrl);

      if (!response.ok) {
        throw new Error(`Kiosk API error: ${response.status}`);
      }

      const result = await response.json();
      console.log("🏪 Kiosk API Response:", result);

      if (!result.success || !result.data) {
        throw new Error("Invalid response from Kiosk API");
      }

      const kioskProducts = result.data.products || [];
      console.log("🏪 Fetched products from Kiosk:", kioskProducts);
      console.log("🏪 Number of products:", kioskProducts.length);

      // Transform kiosk product data to POS format
      const transformedProducts = kioskProducts.map((kioskProduct) => ({
        // Basic Info
        id: kioskProduct.id || `kiosk_${Date.now()}_${Math.random()}`,
        name: kioskProduct.name || "",
        description: kioskProduct.description || "",

        // Category
        categoryId: kioskProduct.categoryId || null,
        categoryName: kioskProduct.categoryName || "",

        // Pricing
        price: kioskProduct.price || kioskProduct.thbPrice || 0,
        memberPrice: kioskProduct.memberPrice || null,
        cost: kioskProduct.cost || 0,

        // Stock
        stock: kioskProduct.stock || 0,
        inStock: kioskProduct.stock || 0,
        stockUnit: kioskProduct.stockUnit || "piece",
        minStock: kioskProduct.minStock || 0,
        lowStock: kioskProduct.minStock || 5,
        trackStock: true,

        // SKU/Barcode
        sku: kioskProduct.sku || kioskProduct.id || "",
        barcode: kioskProduct.barcode || "",

        // Images
        image: kioskProduct.image || null,
        imageUrl: kioskProduct.image || null,
        images: kioskProduct.images || [],

        // Product Details
        thcPercentage: kioskProduct.thcPercentage || null,
        cbdPercentage: kioskProduct.cbdPercentage || null,
        strain: kioskProduct.strain || null,
        effects: kioskProduct.effects || [],
        flavors: kioskProduct.flavors || [],

        // Status
        isActive: kioskProduct.isActive !== false,
        isFeatured: kioskProduct.isFeatured || false,

        // Source tracking - mark as from Kiosk
        source: "kiosk",

        // Loyverse IDs
        loyverseId: kioskProduct.loyverseId || null,
        loyverseVariantId: kioskProduct.loyverseVariantId || null,

        // Metadata
        createdAt: kioskProduct.createdAt || new Date().toISOString(),
        updatedAt: kioskProduct.updatedAt || new Date().toISOString(),
      }));

      // Save to Firebase (create or update)
      const savePromises = transformedProducts.map(async (product) => {
        try {
          // Check if product already exists
          const existing = await productsService.get(product.id);

          if (existing) {
            // Update existing product
            await productsService.update(product.id, product);
            console.log(`✅ Updated product: ${product.name}`);
          } else {
            // Create new product
            await productsService.create(product);
            console.log(`✅ Created product: ${product.name}`);
          }
        } catch (error) {
          console.error(`❌ Error saving product ${product.name}:`, error);
          throw error;
        }
      });

      await Promise.all(savePromises);
      console.log("💾 All Kiosk products saved to Firebase");

      // Fetch ALL products from Firebase (not just kiosk)
      const allProducts = await productsService.getAll({
        orderBy: ["name", "asc"],
      });
      console.log("📊 Total products in Firebase:", allProducts.length);

      // Sync all products to IndexedDB
      await dbService.upsertProducts(allProducts);

      // Update UI with all products (mixed data)
      setProducts(allProducts);

      toast.success(
        `Successfully imported ${transformedProducts.length} products from Kiosk. Showing all ${allProducts.length} products.`
      );
    } catch (error) {
      console.error("Error fetching products from Kiosk:", error);
      toast.error(`Failed to fetch from Kiosk: ${error.message}`);
    } finally {
      setIsFetchingFromKiosk(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const productData = {
        name: formData.name,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        barcode: formData.barcode,
        sku: formData.sku,
        category: formData.category,
        description: formData.description,
        source: editingProduct?.source || "local", // Mark locally created products
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
      // reload products
      await loadData();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Failed to save product");
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price?.toString() || "",
      stock: product.stock?.toString() || "",
      barcode: product.barcode || "",
      sku: product.sku || "",
      category: product.category || "",
      description: product.description || "",
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
      price: "",
      stock: "",
      barcode: "",
      sku: "",
      category: "",
      description: "",
    });
    setEditingProduct(null);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.includes(searchQuery) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-neutral-500 mt-2">Manage your product inventory</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleFetchFromKiosk}
            disabled={isFetchingFromKiosk}
          >
            <Download
              className={`mr-2 h-4 w-4 ${
                isFetchingFromKiosk ? "animate-bounce" : ""
              }`}
            />
            {isFetchingFromKiosk ? "Importing..." : "Import from Kiosk"}
          </Button>
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
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Product Name*</label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Price*</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Stock*</label>
                    <Input
                      type="number"
                      value={formData.stock}
                      onChange={(e) =>
                        setFormData({ ...formData, stock: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Barcode</label>
                    <Input
                      value={formData.barcode}
                      onChange={(e) =>
                        setFormData({ ...formData, barcode: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">SKU</label>
                    <Input
                      value={formData.sku}
                      onChange={(e) =>
                        setFormData({ ...formData, sku: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-md"
                    rows={3}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingProduct ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search products by name, barcode, or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
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
        <Card>
          <CardHeader>
            <CardTitle>All Products ({filteredProducts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      {/* Product image or color */}
                      <div className="flex-shrink-0">
                        {product.imageUrl ||
                        product.image ||
                        product.image_url ||
                        (Array.isArray(product.images) &&
                          product.images[0]?.url) ? (
                          <img
                            src={
                              product.imageUrl ||
                              product.image ||
                              product.image_url ||
                              (Array.isArray(product.images) &&
                                product.images[0]?.url)
                            }
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : product.color ? (
                          <div
                            className="w-10 h-10 rounded"
                            style={{ backgroundColor: product.color }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center">
                            <span className="text-sm font-semibold text-gray-700">
                              {product.name?.charAt(0)?.toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>

                      <h3 className="font-semibold text-lg">{product.name}</h3>
                      {product.category && (
                        <Badge variant="secondary">{product.category}</Badge>
                      )}
                      {product.source && (
                        <Badge
                          variant={
                            product.source === "loyverse"
                              ? "secondary"
                              : product.source === "kiosk"
                              ? "default"
                              : "outline"
                          }
                          className={
                            product.source === "kiosk"
                              ? "text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                              : product.source === "local"
                              ? "text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100"
                              : "text-xs"
                          }
                        >
                          {product.source}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-neutral-500">
                      {product.sku && <span>SKU: {product.sku}</span>}
                      {product.barcode && (
                        <span>Barcode: {product.barcode}</span>
                      )}
                      <span>Stock: {product.stock}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(product.price)}
                    </span>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Categories Management Component
function CategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "#3b82f6",
  });

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    filterCategories();
  }, [searchQuery, categories]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const cats = await dbService.getCategories();
      setCategories(cats);
      setFilteredCategories(cats);
    } catch (error) {
      console.error("Error loading categories:", error);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const filterCategories = () => {
    if (!searchQuery) {
      setFilteredCategories(categories);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = categories.filter((cat) =>
      cat.name.toLowerCase().includes(query)
    );
    setFilteredCategories(filtered);
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setFormData({ name: "", color: "#3b82f6" });
    setIsModalOpen(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      color: category.color || "#3b82f6",
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (category) => {
    if (!confirm(`Delete category "${category.name}"?`)) return;

    try {
      // Check if category has products
      const products = await dbService.getProducts();
      const hasProducts = products.some((p) => p.categoryId === category.id);

      if (hasProducts) {
        toast.error(
          "Cannot delete category with products. Remove products first."
        );
        return;
      }

      await dbService.deleteCategory(category.id);
      toast.success("Category deleted successfully");
      loadCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      const categoryData = {
        name: formData.name.trim(),
        color: formData.color,
        updatedAt: new Date().toISOString(),
      };

      if (editingCategory) {
        // Update existing
        await dbService.updateCategory(editingCategory.id, categoryData);
        toast.success("Category updated successfully");
      } else {
        // Create new
        categoryData.id = `cat_${Date.now()}`;
        categoryData.createdAt = new Date().toISOString();
        categoryData.source = "local";

        await dbService.upsertCategories([categoryData]);
        toast.success("Category created successfully");
      }

      setIsModalOpen(false);
      loadCategories();
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Failed to save category");
    }
  };

  const colors = [
    "#3b82f6", // Blue
    "#ef4444", // Red
    "#10b981", // Green
    "#f59e0b", // Orange
    "#8b5cf6", // Purple
    "#ec4899", // Pink
    "#06b6d4", // Cyan
    "#84cc16", // Lime
  ];

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-neutral-500">Loading categories...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <FolderTree className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-500">
              {searchQuery ? "No categories found" : "No categories yet"}
            </p>
            {!searchQuery && (
              <Button onClick={handleAdd} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Category
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCategories.map((category) => (
            <Card
              key={category.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="h-12 w-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: category.color || "#808080" }}
                  >
                    <FolderTree className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(category)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-2">{category.name}</h3>
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  {category.source && (
                    <Badge variant="secondary" className="text-xs">
                      {category.source}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Category Form Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Add New Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update category information"
                : "Create a new product category"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Category Name *
              </label>
              <Input
                placeholder="e.g., Electronics, Clothing, Food"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Color</label>
              <div className="grid grid-cols-8 gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-10 w-10 rounded-lg border-2 transition-all ${
                      formData.color === color
                        ? "border-neutral-900 dark:border-white scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
                className="mt-2"
              />
            </div>

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
                {editingCategory ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Main Admin Products Page with Tabs
export default function AdminProducts() {
  const [activeTab, setActiveTab] = useState("items");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Products & Categories</h1>
        <p className="text-neutral-500 mt-2">
          Manage your inventory and product categories
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="items" className="gap-2">
            <Package className="h-4 w-4" />
            Item List
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <FolderTree className="h-4 w-4" />
            Categories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <ItemListTab />
        </TabsContent>

        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
