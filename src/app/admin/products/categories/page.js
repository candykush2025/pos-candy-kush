"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, FolderTree } from "lucide-react";
import { toast } from "sonner";
import { dbService } from "@/lib/db/dbService";
import { categoriesService, productsService } from "@/lib/firebase/firestore";

export default function CategoriesPage() {
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
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    filterCategories();
  }, [searchQuery, categories]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      // Always load categories from Firebase (admin must see live data)
      let cats = [];
      try {
        cats = await categoriesService.getAll();
        console.log(`Loaded ${cats.length} categories from Firebase`);
      } catch (err) {
        console.warn(
          "Failed to load categories from Firebase, falling back to local IndexedDB:",
          err
        );
        cats = await dbService.getCategories();
      }

      setCategories(cats.filter((c) => !c.deletedAt));
      setFilteredCategories(cats.filter((c) => !c.deletedAt));

      // Sync categories to IndexedDB for offline use
      try {
        if (cats && cats.length > 0) {
          await dbService.upsertCategories(cats);
          console.log("✅ Synced categories to IndexedDB");
        }
      } catch (err) {
        console.warn("Failed to upsert categories into IndexedDB:", err);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  // Selection helpers for bulk actions
  const toggleCategorySelection = (categoryId) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleSelectAllCategories = () => {
    if (selectedCategories.length === filteredCategories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(filteredCategories.map((c) => c.id));
    }
  };

  const handleBulkDeleteCategories = async () => {
    if (selectedCategories.length === 0) {
      toast.error("No categories selected");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete ${selectedCategories.length} category(s)?`
      )
    )
      return;

    setIsDeletingBulk(true);
    const failed = [];

    for (let i = 0; i < selectedCategories.length; i++) {
      const catId = selectedCategories[i];
      try {
        // Check products in category (check by ID and name)
        let hasProducts = false;
        try {
          const prods = await productsService.getAll({
            where: ["categoryId", "==", catId],
          });
          hasProducts = prods && prods.length > 0;
        } catch (err) {
          const localProds = await dbService.getProducts();
          const category = categories.find((c) => c.id === catId);
          hasProducts = localProds.some((p) => {
            // Match by ID first
            if (p.categoryId === catId) return true;
            // Match by name if category exists
            if (category) {
              const productCategoryName =
                p.categoryName ||
                p.category ||
                p.categoryLabel ||
                p.category_name;
              return productCategoryName === category.name;
            }
            return false;
          });
        }

        if (hasProducts) {
          failed.push({ id: catId, reason: "has_products" });
          continue;
        }

        try {
          await categoriesService.delete(catId);
        } catch (err) {
          // ignore - may not exist remotely
          console.warn(
            `Failed to delete category ${catId} from Firebase:`,
            err
          );
        }

        try {
          await dbService.deleteCategory(catId);
        } catch (err) {
          console.warn(
            `Failed to delete category ${catId} from IndexedDB:`,
            err
          );
        }
      } catch (err) {
        failed.push({ id: catId, reason: err.message });
      }
    }

    setIsDeletingBulk(false);
    if (failed.length > 0) {
      toast.error(
        `Failed to delete ${failed.length} categories. Remove products from those categories first.`
      );
    } else {
      toast.success(`Deleted ${selectedCategories.length} categories`);
    }

    setSelectedCategories([]);
    await loadCategories();
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
      // Check if category has products in Firebase or local (check by ID and name)
      let hasProducts = false;
      try {
        const prods = await productsService.getAll({
          where: ["categoryId", "==", category.id],
        });
        hasProducts = prods && prods.length > 0;
      } catch (err) {
        console.warn(
          "Failed to query products from Firebase, checking local IndexedDB:",
          err
        );
        const localProds = await dbService.getProducts();
        hasProducts = localProds.some((p) => {
          // Match by ID first
          if (p.categoryId === category.id) return true;
          // Match by name
          const productCategoryName =
            p.categoryName || p.category || p.categoryLabel || p.category_name;
          return productCategoryName === category.name;
        });
      }

      if (hasProducts) {
        toast.error(
          "Cannot delete category with products. Remove products first."
        );
        return;
      }

      // Delete from Firebase first
      try {
        await categoriesService.delete(category.id);
        console.log(`Deleted category ${category.id} from Firebase`);
      } catch (err) {
        console.warn(
          "Failed to delete category from Firebase, attempting local delete:",
          err
        );
      }

      // Ensure local IndexedDB is cleaned
      try {
        await dbService.deleteCategory(category.id);
        console.log(`Deleted category ${category.id} from IndexedDB`);
      } catch (err) {
        console.warn("Failed to delete category from IndexedDB:", err);
      }

      toast.success("Category deleted successfully");
      await loadCategories();
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
        // Update existing in Firebase
        try {
          await categoriesService.update(editingCategory.id, categoryData);
          console.log(`Updated category ${editingCategory.id} in Firebase`);
        } catch (err) {
          console.warn(
            "Failed to update category in Firebase, updating local only:",
            err
          );
          await dbService.updateCategory(editingCategory.id, categoryData);
        }
        toast.success("Category updated successfully");
      } else {
        // Create new in Firebase
        try {
          const created = await categoriesService.create(categoryData);
          // categoriesService.create returns { id, ...data }
          // Upsert into local DB
          await dbService.upsertCategories([created]);
          console.log(
            `Created category ${created.id} in Firebase and synced locally`
          );
        } catch (err) {
          console.warn(
            "Failed to create category in Firebase, creating local only:",
            err
          );
          categoryData.id = `cat_${Date.now()}`;
          categoryData.createdAt = new Date().toISOString();
          categoryData.source = "local";
          await dbService.upsertCategories([categoryData]);
        }
        toast.success("Category created successfully");
      }

      setIsModalOpen(false);
      await loadCategories();
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-neutral-500 mt-2">Manage product categories</p>
        </div>
      </div>

      {/* Search & Add Button */}
      <div className="flex items-center justify-between gap-4">
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
        <>
          {/* Bulk Actions */}
          {selectedCategories.length > 0 && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedCategories.length} category(s) selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDeleteCategories}
                disabled={isDeletingBulk}
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
                      <th className="text-left p-4 font-semibold text-sm">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-neutral-300 cursor-pointer"
                          checked={
                            selectedCategories.length ===
                              filteredCategories.length &&
                            filteredCategories.length > 0
                          }
                          onChange={toggleSelectAllCategories}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </th>
                      <th className="text-left p-4 font-semibold text-sm">
                        Name
                      </th>
                      <th className="text-left p-4 font-semibold text-sm">
                        Color
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-neutral-700">
                    {filteredCategories.map((category) => (
                      <tr
                        key={category.id}
                        className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                        onClick={() => handleEdit(category)}
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-neutral-300 cursor-pointer"
                            checked={selectedCategories.includes(category.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleCategorySelection(category.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="p-4 align-middle">
                          <div className="font-semibold">{category.name}</div>
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-8 w-8 rounded border"
                              style={{
                                backgroundColor: category.color || "#808080",
                              }}
                            />
                            <div className="text-sm text-neutral-500">
                              {category.color || "#808080"}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
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
