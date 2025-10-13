"use client";

import { useState, useEffect } from "react";
import { useCartStore } from "@/store/useCartStore";
import { useTicketStore } from "@/store/useTicketStore";
import { useAuthStore } from "@/store/useAuthStore";
import { productsService, customersService } from "@/lib/firebase/firestore";
import { dbService } from "@/lib/db/dbService";
import db from "@/lib/db/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Save,
  CreditCard,
  Grid,
  List,
  Printer,
  Banknote,
  Wallet,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { toast } from "sonner";

export default function SalesPage() {
  const { user } = useAuthStore();
  const {
    items,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    getSubtotal,
    getDiscountAmount,
    getTotal,
    getItemCount,
    getCartData,
    customer: cartCustomer,
    setCustomer: setCartCustomer,
  } = useCartStore();

  const { createTicket } = useTicketStore();

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [isLoading, setIsLoading] = useState(true);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Receipt modal state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  // Customer selection state (modals only - actual customer is in cart store)
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCustomerSelectModal, setShowCustomerSelectModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");

  // Load products and customers
  useEffect(() => {
    loadProducts();
    loadCustomers();
  }, []);

  // Filter products based on search
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredProducts(products);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = products.filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          p.barcode?.includes(query) ||
          p.sku?.toLowerCase().includes(query)
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);

      // Load products from Firebase
      const productsData = await productsService.getAll();

      setProducts(productsData);
      setFilteredProducts(productsData);

      // Sync to IndexedDB for offline access
      if (productsData.length > 0) {
        await dbService.upsertProducts(productsData);
      }
    } catch (error) {
      console.error(
        "Failed to load products from Firebase, trying IndexedDB:",
        error
      );

      // Fallback to IndexedDB if Firebase fails (offline mode)
      try {
        const productsData = await dbService.getProducts();
        setProducts(productsData);
        setFilteredProducts(productsData);
        toast.info("Loading products from offline storage");
      } catch (dbError) {
        console.error("Failed to load products:", dbError);
        toast.error("Failed to load products");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const customersData = await customersService.getAll({
        orderBy: ["name", "asc"],
      });
      setCustomers(customersData);
    } catch (error) {
      console.error("Error loading customers:", error);
    }
  };

  const handleAddToCart = (product) => {
    if (product.stock <= 0) {
      toast.error("Product out of stock");
      return;
    }
    addItem(product, 1);
    toast.success(`Added ${product.name} to cart`);
  };

  const handleSaveTicket = () => {
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    // Open customer selection modal
    setShowCustomerModal(true);
  };

  const handleConfirmSaveTicket = async (customer) => {
    const cartData = getCartData();
    const ticketId = createTicket(cartData, user.id);

    // Save to IndexedDB with customer info
    await dbService.createTicket(
      {
        ticketNumber: `T${Date.now()}`,
        userId: user.id,
        customerId: customer?.id || null,
        customerName: customer?.name || null,
        status: "parked",
        total: cartData.total,
      },
      items
    );

    clearCart();
    setShowCustomerModal(false);
    toast.success(
      customer
        ? `Ticket saved for ${customer.name}`
        : "Ticket saved successfully"
    );
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    // Open payment modal
    setShowPaymentModal(true);
    setPaymentMethod("cash");
    setCashReceived("");
  };

  const handleCompletePayment = async () => {
    if (paymentMethod === "cash" && !cashReceived) {
      toast.error("Please enter cash received");
      return;
    }

    const total = getTotal();
    const cashAmount = parseFloat(cashReceived) || 0;

    if (paymentMethod === "cash" && cashAmount < total) {
      toast.error("Insufficient cash received");
      return;
    }

    try {
      setIsProcessing(true);
      const cartData = getCartData();
      const { ordersService } = await import("@/lib/firebase/firestore");
      const { generateOrderNumber } = await import("@/lib/utils/format");

      // Create order in Firebase
      const orderData = {
        orderNumber: generateOrderNumber(),
        items: items.map((item) => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          total: item.total,
        })),
        subtotal: cartData.subtotal,
        discount: cartData.discountAmount,
        total: cartData.total,
        userId: user.id,
        customerId: cartCustomer?.id || null,
        customerName: cartCustomer?.name || null,
        status: "completed",
        paymentMethod,
        cashReceived: paymentMethod === "cash" ? cashAmount : total,
        change: paymentMethod === "cash" ? cashAmount - total : 0,
      };

      await ordersService.create(orderData);

      // Update customer stats if customer is selected
      if (cartCustomer) {
        try {
          await customersService.update(cartCustomer.id, {
            visits: (cartCustomer.visits || 0) + 1,
            lastVisit: new Date(),
            points: (cartCustomer.points || 0) + Math.floor(total), // Add 1 point per dollar
          });
        } catch (error) {
          console.error("Error updating customer stats:", error);
        }
      }

      // Also save to IndexedDB for local cache (already in Firebase, no need for sync queue)
      try {
        await db.transaction("rw", db.orders, db.orderItems, async () => {
          const localOrderId = await db.orders.add({
            orderNumber: orderData.orderNumber,
            status: "completed",
            total: orderData.total,
            userId: user.id,
            customerId: orderData.customerId,
            paymentMethod,
            createdAt: new Date().toISOString(),
            syncStatus: "synced", // Already synced to Firebase
          });

          const orderItemsWithOrderId = items.map((item) => ({
            ...item,
            orderId: localOrderId,
          }));

          await db.orderItems.bulkAdd(orderItemsWithOrderId);
        });
      } catch (error) {
        console.error("Error saving to IndexedDB:", error);
        // Don't fail the checkout if IndexedDB fails
      }

      // Store completed order and show receipt modal
      setCompletedOrder(orderData);
      setShowPaymentModal(false);
      setShowReceiptModal(true);
      toast.success("Payment completed successfully!");
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to complete order");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!completedOrder) return;

    // Generate receipt HTML for thermal printer (58mm)
    const receiptHTML = generateThermalReceipt(completedOrder);

    // Open in new window
    const printWindow = window.open("", "_blank", "width=300,height=600");
    if (!printWindow) {
      toast.error("Please allow pop-ups to print receipt");
      return;
    }

    printWindow.document.write(receiptHTML);
    printWindow.document.close();

    // Auto print after content loads
    printWindow.onload = () => {
      printWindow.print();

      // Listen for after print event
      printWindow.onafterprint = () => {
        printWindow.close();
        // Start new transaction after printing
        handleNewTransaction();
      };

      // Fallback: close after delay if onafterprint doesn't fire
      setTimeout(() => {
        if (!printWindow.closed) {
          printWindow.close();
          handleNewTransaction();
        }
      }, 2000);
    };
  };

  const handleNewTransaction = () => {
    setShowReceiptModal(false);
    setCompletedOrder(null);
    clearCart(); // This will also clear the customer in cart store
    setCashReceived("");
    setPaymentMethod("cash");
    toast.success("Ready for new transaction");
  };

  const calculateChange = () => {
    const total = getTotal();
    const cashAmount = parseFloat(cashReceived) || 0;
    return Math.max(0, cashAmount - total);
  };

  const quickCashAmounts = [20, 50, 100, 200];

  // Generate thermal receipt HTML (58mm width)
  const generateThermalReceipt = (order) => {
    const receiptDate = new Date().toLocaleString();

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt - ${order.orderNumber}</title>
        <style>
          @media print {
            @page {
              size: 58mm auto;
              margin: 0;
            }
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            width: 58mm;
            font-family: 'Courier New', monospace;
            font-size: 10px;
            padding: 5mm;
            background: white;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .store-name {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .order-info {
            margin: 10px 0;
            font-size: 9px;
          }
          .items {
            margin: 10px 0;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 10px 0;
          }
          .item {
            margin: 5px 0;
          }
          .item-name {
            font-weight: bold;
          }
          .item-detail {
            display: flex;
            justify-content: space-between;
            font-size: 9px;
          }
          .totals {
            margin: 10px 0;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .total-row.grand {
            font-size: 12px;
            font-weight: bold;
            border-top: 1px solid #000;
            padding-top: 5px;
            margin-top: 5px;
          }
          .payment-info {
            margin: 10px 0;
            border-top: 1px dashed #000;
            padding-top: 10px;
          }
          .footer {
            text-align: center;
            margin-top: 15px;
            border-top: 1px dashed #000;
            padding-top: 10px;
            font-size: 9px;
          }
          .change-highlight {
            background: #000;
            color: #fff;
            padding: 5px;
            text-align: center;
            font-size: 11px;
            font-weight: bold;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="store-name">CANDY KUSH POS</div>
          <div>Thank you for your purchase!</div>
        </div>

        <div class="order-info">
          <div>Order: ${order.orderNumber}</div>
          <div>Date: ${receiptDate}</div>
          <div>Cashier: ${user?.name || "Staff"}</div>
        </div>

        <div class="items">
          ${order.items
            .map(
              (item) => `
            <div class="item">
              <div class="item-name">${item.name}</div>
              <div class="item-detail">
                <span>${item.quantity} x ${formatCurrency(item.price)}</span>
                <span>${formatCurrency(item.total)}</span>
              </div>
            </div>
          `
            )
            .join("")}
        </div>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(order.subtotal)}</span>
          </div>
          ${
            order.discount > 0
              ? `
            <div class="total-row">
              <span>Discount:</span>
              <span>-${formatCurrency(order.discount)}</span>
            </div>
          `
              : ""
          }
          <div class="total-row grand">
            <span>TOTAL:</span>
            <span>${formatCurrency(order.total)}</span>
          </div>
        </div>

        <div class="payment-info">
          <div class="total-row">
            <span>Payment Method:</span>
            <span>${order.paymentMethod.toUpperCase()}</span>
          </div>
          ${
            order.paymentMethod === "cash"
              ? `
            <div class="total-row">
              <span>Cash Received:</span>
              <span>${formatCurrency(order.cashReceived)}</span>
            </div>
            ${
              order.change > 0
                ? `
              <div class="change-highlight">
                CHANGE: ${formatCurrency(order.change)}
              </div>
            `
                : ""
            }
          `
              : ""
          }
        </div>

        <div class="footer">
          <div>Thank you for your business!</div>
          <div>Please come again</div>
        </div>

        <script>
          // Auto print on load
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex">
      {/* Products Section */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        {/* Search Bar */}
        <div className="flex items-center space-x-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search products by name, barcode, or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>
          <div className="flex space-x-1">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className="h-12 w-12"
            >
              <Grid className="h-5 w-5" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
              className="h-12 w-12"
            >
              <List className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Loading products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No products found</p>
            </div>
          ) : (
            <div
              className={`grid gap-4 ${
                viewMode === "grid"
                  ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                  : "grid-cols-1"
              }`}
            >
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleAddToCart(product)}
                >
                  <div className="flex flex-col h-full">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-500 mb-2">
                        {product.category}
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(product.price)}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <Badge
                        variant={product.stock > 10 ? "default" : "destructive"}
                      >
                        Stock: {product.stock}
                      </Badge>
                      <Plus className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-96 bg-white border-l flex flex-col">
        {/* Cart Header */}
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-6 w-6" />
              <h2 className="text-xl font-bold">Cart</h2>
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {getItemCount()} items
            </Badge>
          </div>

          {/* Customer Selection */}
          <div className="flex items-center gap-2">
            {cartCustomer ? (
              <div className="flex-1 flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      {cartCustomer.name}
                    </p>
                    <p className="text-xs text-green-600">
                      {cartCustomer.customerCode}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCartCustomer(null)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCustomerSelectModal(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <ShoppingCart className="h-16 w-16 mb-2" />
              <p>Cart is empty</p>
            </div>
          ) : (
            items.map((item) => (
              <Card key={item.id} className="p-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(item.price)} each
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="h-8 w-8"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center font-semibold">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="h-8 w-8"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="font-bold text-lg">
                    {formatCurrency(item.total)}
                  </p>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Cart Summary */}
        <div className="border-t p-4 space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(getSubtotal())}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Discount</span>
              <span className="text-red-600">
                -{formatCurrency(getDiscountAmount())}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span>{formatCurrency(getTotal())}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              className="w-full h-12 text-lg"
              onClick={handleCheckout}
              disabled={items.length === 0}
            >
              <CreditCard className="mr-2 h-5 w-5" />
              Checkout
            </Button>
            <Button
              variant="outline"
              className="w-full h-12"
              onClick={handleSaveTicket}
              disabled={items.length === 0}
            >
              <Save className="mr-2 h-5 w-5" />
              Save Ticket
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={clearCart}
              disabled={items.length === 0}
            >
              Clear Cart
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>
              Select payment method and complete the transaction
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Total Amount */}
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Total Amount
              </div>
              <div className="text-3xl font-bold">
                {formatCurrency(getTotal())}
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={paymentMethod === "cash" ? "default" : "outline"}
                  className="h-20 flex flex-col"
                  onClick={() => setPaymentMethod("cash")}
                >
                  <Banknote className="h-6 w-6 mb-1" />
                  Cash
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === "card" ? "default" : "outline"}
                  className="h-20 flex flex-col"
                  onClick={() => setPaymentMethod("card")}
                >
                  <CreditCard className="h-6 w-6 mb-1" />
                  Card
                </Button>
              </div>
            </div>

            {/* Cash Payment Details */}
            {paymentMethod === "cash" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cash Received</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="text-2xl h-14 text-right"
                    step="0.01"
                    min="0"
                  />
                </div>

                {/* Quick Cash Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {quickCashAmounts.map((amount) => (
                    <Button
                      key={amount}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCashReceived(amount.toString())}
                    >
                      ${amount}
                    </Button>
                  ))}
                </div>

                {/* Change Calculation */}
                {cashReceived && parseFloat(cashReceived) >= getTotal() && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                    <div className="text-sm text-green-700 dark:text-green-400 mb-1">
                      Change
                    </div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                      {formatCurrency(calculateChange())}
                    </div>
                  </div>
                )}

                {cashReceived && parseFloat(cashReceived) < getTotal() && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg">
                    <div className="text-sm text-red-700 dark:text-red-400">
                      Insufficient amount. Need{" "}
                      {formatCurrency(getTotal() - parseFloat(cashReceived))}{" "}
                      more.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Card Payment Note */}
            {paymentMethod === "card" && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                <div className="text-sm text-blue-700 dark:text-blue-400">
                  Process card payment using your card terminal
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowPaymentModal(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleCompletePayment}
              disabled={
                isProcessing ||
                (paymentMethod === "cash" &&
                  (!cashReceived || parseFloat(cashReceived) < getTotal()))
              }
            >
              {isProcessing ? "Processing..." : "Complete Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Payment Successful</DialogTitle>
            <DialogDescription>
              Order {completedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          {completedOrder && (
            <div className="space-y-4 py-4">
              {/* Payment Summary */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-green-800 dark:text-green-200">
                      Payment Completed
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">
                      {completedOrder.paymentMethod === "cash"
                        ? "Cash Payment"
                        : "Card Payment"}
                    </div>
                  </div>
                </div>

                <Separator className="my-3" />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Total Amount:
                    </span>
                    <span className="font-bold text-lg">
                      {formatCurrency(completedOrder.total)}
                    </span>
                  </div>

                  {completedOrder.paymentMethod === "cash" && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Cash Received:
                        </span>
                        <span className="font-medium">
                          {formatCurrency(completedOrder.cashReceived)}
                        </span>
                      </div>
                      {completedOrder.change > 0 && (
                        <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 p-3 rounded mt-2">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-yellow-800 dark:text-yellow-200">
                              Change to Return:
                            </span>
                            <span className="font-bold text-xl text-yellow-800 dark:text-yellow-200">
                              {formatCurrency(completedOrder.change)}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Order Items Summary */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg max-h-48 overflow-y-auto">
                <div className="text-sm font-semibold mb-2">
                  Order Items ({completedOrder.items.length})
                </div>
                <div className="space-y-1">
                  {completedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span>{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              className="w-full h-12 text-lg"
              onClick={handlePrintReceipt}
            >
              <Printer className="h-5 w-5 mr-2" />
              Print Receipt
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleNewTransaction}
            >
              New Transaction
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Selection Modal */}
      <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Customer for Ticket</DialogTitle>
            <DialogDescription>
              Choose an existing customer or save without customer
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search customers by name, email, or phone..."
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Customer List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {customers
                .filter((c) => {
                  if (!customerSearchQuery) return true;
                  const query = customerSearchQuery.toLowerCase();
                  return (
                    c.name?.toLowerCase().includes(query) ||
                    c.email?.toLowerCase().includes(query) ||
                    c.phone?.includes(query) ||
                    c.customerCode?.toLowerCase().includes(query)
                  );
                })
                .map((customer) => (
                  <div
                    key={customer.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      cartCustomer?.id === customer.id
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                        : "border-gray-200 hover:border-green-300 hover:bg-gray-50"
                    }`}
                    onClick={() => setCartCustomer(customer)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-semibold">{customer.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {customer.customerCode}
                          </Badge>
                        </div>
                        <div className="mt-1 text-sm text-gray-600 space-y-0.5">
                          {customer.email && <div>📧 {customer.email}</div>}
                          {customer.phone && <div>📱 {customer.phone}</div>}
                        </div>
                      </div>
                      {cartCustomer?.id === customer.id && (
                        <div className="text-green-600 font-semibold">
                          ✓ Selected
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleConfirmSaveTicket(null)}
              >
                Save Without Customer
              </Button>
              <Button
                className="flex-1"
                onClick={() => handleConfirmSaveTicket(cartCustomer)}
                disabled={!cartCustomer}
              >
                Save with Selected Customer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Selection Modal for Cart */}
      <Dialog
        open={showCustomerSelectModal}
        onOpenChange={setShowCustomerSelectModal}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Customer to Cart</DialogTitle>
            <DialogDescription>
              Link this sale to a customer for purchase history tracking
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search customers by name, email, or phone..."
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Customer List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {customers
                .filter((c) => {
                  if (!customerSearchQuery) return true;
                  const query = customerSearchQuery.toLowerCase();
                  return (
                    c.name?.toLowerCase().includes(query) ||
                    c.email?.toLowerCase().includes(query) ||
                    c.phone?.includes(query) ||
                    c.customerCode?.toLowerCase().includes(query)
                  );
                })
                .map((customer) => (
                  <div
                    key={customer.id}
                    className="p-4 border rounded-lg cursor-pointer transition-colors hover:border-green-300 hover:bg-gray-50"
                    onClick={() => {
                      setCartCustomer(customer);
                      setShowCustomerSelectModal(false);
                      setCustomerSearchQuery("");
                      toast.success(`Customer ${customer.name} added to cart`);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-semibold">{customer.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {customer.customerCode}
                          </Badge>
                        </div>
                        <div className="mt-1 text-sm text-gray-600 space-y-0.5">
                          {customer.email && <div>📧 {customer.email}</div>}
                          {customer.phone && <div>📱 {customer.phone}</div>}
                        </div>
                        {/* Customer Stats */}
                        <div className="mt-2 flex gap-3 text-xs">
                          <span className="text-green-600 font-medium">
                            {customer.points || 0} pts
                          </span>
                          <span className="text-blue-600 font-medium">
                            {customer.visits || 0} visits
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {customers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <User className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No customers found</p>
                <p className="text-sm">Go to Customers page to add customers</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
