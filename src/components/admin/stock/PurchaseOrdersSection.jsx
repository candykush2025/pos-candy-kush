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
import { ShoppingCart, Plus, Check, X, Package } from "lucide-react";
import { purchaseOrdersService } from "@/lib/firebase/purchaseOrdersService";
import { productsService } from "@/lib/firebase/firestore";
import { stockHistoryService } from "@/lib/firebase/stockHistoryService";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";

export default function PurchaseOrdersSection() {
  const { user } = useAuthStore();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchProduct, setSearchProduct] = useState("");

  const [formData, setFormData] = useState({
    supplier: "",
    notes: "",
    items: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pos, prods] = await Promise.all([
        purchaseOrdersService.getAll(),
        productsService.getAll({ orderBy: ["name", "asc"] }),
      ]);
      setPurchaseOrders(pos);
      setProducts(prods.filter((p) => p.trackStock));
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const addProductToOrder = (product) => {
    const exists = selectedProducts.find((p) => p.id === product.id);
    if (exists) {
      toast.error("Product already added");
      return;
    }

    setSelectedProducts([
      ...selectedProducts,
      {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantity: 0,
        currentStock: product.stock || 0,
      },
    ]);
    setSearchProduct("");
  };

  const updateProductQuantity = (productId, quantity) => {
    setSelectedProducts(
      selectedProducts.map((p) =>
        p.productId === productId
          ? { ...p, quantity: parseInt(quantity) || 0 }
          : p
      )
    );
  };

  const removeProduct = (productId) => {
    setSelectedProducts(
      selectedProducts.filter((p) => p.productId !== productId)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedProducts.length === 0) {
      toast.error("Please add at least one product");
      return;
    }

    if (selectedProducts.some((p) => p.quantity <= 0)) {
      toast.error("All products must have quantity greater than 0");
      return;
    }

    try {
      const poData = {
        supplier: formData.supplier,
        notes: formData.notes,
        items: selectedProducts,
        userId: user?.uid || "",
        userName: user?.displayName || user?.email || "",
        totalItems: selectedProducts.length,
        totalQuantity: selectedProducts.reduce((sum, p) => sum + p.quantity, 0),
      };

      await purchaseOrdersService.create(poData);
      toast.success("Purchase order created successfully");
      setIsModalOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error("Error creating purchase order:", error);
      toast.error("Failed to create purchase order");
    }
  };

  const handleReceivePO = async (po) => {
    if (!confirm("Mark this purchase order as received and update stock?"))
      return;

    try {
      // Update each product's stock
      for (const item of po.items) {
        const product = await productsService.getById(item.productId);
        if (product && product.trackStock) {
          const previousStock = product.stock || 0;
          const newStock = previousStock + item.quantity;

          // Update product stock
          await productsService.update(item.productId, { stock: newStock });

          // Log stock history
          await stockHistoryService.logStockMovement({
            productId: item.productId,
            productName: item.productName,
            productSku: item.productSku,
            type: "purchase_order",
            quantity: item.quantity,
            previousStock,
            newStock,
            reason: `Purchase Order from ${po.supplier}`,
            referenceId: po.id,
            userId: user?.uid || "",
            userName: user?.displayName || user?.email || "",
          });
        }
      }

      // Mark PO as received
      await purchaseOrdersService.markAsReceived(po.id);
      toast.success("Purchase order received and stock updated");
      loadData();
    } catch (error) {
      console.error("Error receiving purchase order:", error);
      toast.error("Failed to receive purchase order");
    }
  };

  const resetForm = () => {
    setFormData({ supplier: "", notes: "", items: [] });
    setSelectedProducts([]);
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
            <h2 className="text-xl font-semibold">Purchase Orders</h2>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Purchase Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Purchase Order</DialogTitle>
                  <DialogDescription>
                    Create a purchase order to receive stock
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Supplier *
                    </label>
                    <Input
                      value={formData.supplier}
                      onChange={(e) =>
                        setFormData({ ...formData, supplier: e.target.value })
                      }
                      placeholder="Supplier name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Notes
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="Additional notes..."
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Add Products *
                    </label>
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
                            onClick={() => addProductToOrder(product)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            {product.name} - {product.sku}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedProducts.length > 0 && (
                    <div className="border rounded-lg p-4 space-y-3">
                      <h4 className="font-semibold">Selected Products</h4>
                      {selectedProducts.map((item) => (
                        <div
                          key={item.productId}
                          className="flex items-center gap-3 border-b pb-3 last:border-0"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-sm text-neutral-500">
                              Current Stock: {item.currentStock}
                            </p>
                          </div>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateProductQuantity(
                                item.productId,
                                e.target.value
                              )
                            }
                            className="w-24"
                            placeholder="Qty"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProduct(item.productId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

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
                      Create Purchase Order
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
          ) : purchaseOrders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Purchase Orders</h3>
              <p className="text-neutral-500">
                Create your first purchase order to receive stock
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {purchaseOrders.map((po) => (
                <div
                  key={po.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold">{po.supplier}</h4>
                      <p className="text-sm text-neutral-500">
                        {po.totalItems} items • {po.totalQuantity} total
                        quantity
                      </p>
                    </div>
                    <Badge
                      className={
                        po.status === "received"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {po.status}
                    </Badge>
                  </div>

                  <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                    {po.createdAt?.toDate
                      ? po.createdAt.toDate().toLocaleString()
                      : "N/A"}
                  </div>

                  {po.status === "pending" && (
                    <Button
                      size="sm"
                      onClick={() => handleReceivePO(po)}
                      className="w-full"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Mark as Received
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
