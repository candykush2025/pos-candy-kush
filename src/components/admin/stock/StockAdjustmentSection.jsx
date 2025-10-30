"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ClipboardList, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { stockAdjustmentsService } from "@/lib/firebase/stockAdjustmentsService";
import { productsService } from "@/lib/firebase/firestore";
import { stockHistoryService } from "@/lib/firebase/stockHistoryService";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";

export default function StockAdjustmentSection() {
  const { user } = useAuthStore();
  const [adjustments, setAdjustments] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchProduct, setSearchProduct] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [formData, setFormData] = useState({
    type: "add", // add or decrease
    quantity: "",
    reason: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [adjs, prods] = await Promise.all([
        stockAdjustmentsService.getAll(),
        productsService.getAll({ orderBy: ["name", "asc"] }),
      ]);
      setAdjustments(adjs);
      setProducts(prods.filter((p) => p.trackStock));
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const selectProduct = (product) => {
    setSelectedProduct(product);
    setSearchProduct("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedProduct) {
      toast.error("Please select a product");
      return;
    }

    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (!formData.reason.trim()) {
      toast.error("Please provide a reason for adjustment");
      return;
    }

    try {
      const quantity =
        formData.type === "add"
          ? parseInt(formData.quantity)
          : -parseInt(formData.quantity);
      const previousStock = selectedProduct.stock || 0;
      const newStock = previousStock + quantity;

      if (newStock < 0) {
        toast.error("Stock cannot be negative");
        return;
      }

      // Update product stock
      await productsService.update(selectedProduct.id, { stock: newStock });

      // Create adjustment record
      await stockAdjustmentsService.create({
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productSku: selectedProduct.sku,
        type: formData.type,
        quantity: parseInt(formData.quantity),
        previousStock,
        newStock,
        reason: formData.reason,
        userId: user?.uid || "",
        userName: user?.displayName || user?.email || "",
      });

      // Log stock history
      await stockHistoryService.logStockMovement({
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productSku: selectedProduct.sku,
        type: "adjustment",
        quantity,
        previousStock,
        newStock,
        reason: formData.reason,
        userId: user?.uid || "",
        userName: user?.displayName || user?.email || "",
      });

      toast.success("Stock adjusted successfully");
      setIsModalOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error("Error adjusting stock:", error);
      toast.error("Failed to adjust stock");
    }
  };

  const resetForm = () => {
    setFormData({ type: "add", quantity: "", reason: "" });
    setSelectedProduct(null);
    setSearchProduct("");
  };

  const filteredProducts = products.filter(
    (p) =>
      searchProduct &&
      (p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchProduct.toLowerCase()))
  );

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Stock Adjustments</h2>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Adjustment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Stock Adjustment</DialogTitle>
                  <DialogDescription>
                    Manually adjust stock levels with a reason
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Select Product *
                    </label>
                    {selectedProduct ? (
                      <div className="border rounded-lg p-3 flex justify-between items-center">
                        <div>
                          <p className="font-medium">{selectedProduct.name}</p>
                          <p className="text-sm text-neutral-500">
                            Current Stock: {selectedProduct.stock || 0}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedProduct(null)}
                        >
                          Change
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Input
                          value={searchProduct}
                          onChange={(e) => setSearchProduct(e.target.value)}
                          placeholder="Search products..."
                        />
                        {searchProduct && filteredProducts.length > 0 && (
                          <div className="mt-2 border rounded-lg max-h-40 overflow-y-auto">
                            {filteredProducts.slice(0, 10).map((product) => (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => selectProduct(product)}
                                className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                              >
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-neutral-500">
                                  Stock: {product.stock || 0} - {product.sku}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Adjustment Type *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, type: "add" })
                        }
                        className={`p-3 border-2 rounded-lg flex items-center justify-center gap-2 ${
                          formData.type === "add"
                            ? "border-green-500 bg-green-50 dark:bg-green-950"
                            : "border-gray-300"
                        }`}
                      >
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Add Stock</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, type: "decrease" })
                        }
                        className={`p-3 border-2 rounded-lg flex items-center justify-center gap-2 ${
                          formData.type === "decrease"
                            ? "border-red-500 bg-red-50 dark:bg-red-950"
                            : "border-gray-300"
                        }`}
                      >
                        <TrendingDown className="h-5 w-5 text-red-600" />
                        <span className="font-medium">Decrease Stock</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Quantity *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity: e.target.value })
                      }
                      placeholder="Enter quantity"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Reason *
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900"
                      value={formData.reason}
                      onChange={(e) =>
                        setFormData({ ...formData, reason: e.target.value })
                      }
                      placeholder="Reason for adjustment (e.g., Damaged goods, Found in warehouse, etc.)"
                      rows={3}
                      required
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
                      Adjust Stock
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : adjustments.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No Stock Adjustments
              </h3>
              <p className="text-neutral-500">
                Manual stock adjustments will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {adjustments.map((adj) => (
                <div
                  key={adj.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-full ${
                        adj.type === "add"
                          ? "bg-green-100 dark:bg-green-900"
                          : "bg-red-100 dark:bg-red-900"
                      }`}
                    >
                      {adj.type === "add" ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{adj.productName}</h4>
                      <p className="text-sm text-neutral-500 mb-2">
                        {adj.type === "add" ? "Added" : "Decreased"}{" "}
                        {adj.quantity} units
                      </p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Stock: {adj.previousStock} → {adj.newStock}
                      </p>
                      <p className="text-sm text-neutral-500 mt-1">
                        Reason: {adj.reason}
                      </p>
                      <p className="text-xs text-neutral-400 mt-2">
                        {adj.createdAt?.toDate
                          ? adj.createdAt.toDate().toLocaleString()
                          : "N/A"}
                        {adj.userName && ` • by ${adj.userName}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
