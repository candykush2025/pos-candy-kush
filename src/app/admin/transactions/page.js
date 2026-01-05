"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  receiptsService,
  customersService,
  productsService,
} from "@/lib/firebase/firestore";
import {
  ArrowLeft,
  Search,
  Calendar,
  Receipt,
  User,
  Clock,
  ShoppingCart,
  CreditCard,
  X,
  ChevronRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function TransactionsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [customersMap, setCustomersMap] = useState({});
  const [productsMap, setProductsMap] = useState({});

  // Date filter
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const [selectedDateFilter, setSelectedDateFilter] = useState("all");

  // Receipt detail modal
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    if (!user && !isAuthenticated) {
      router.push("/login");
      return;
    }
    loadData();
  }, [user, isAuthenticated, router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [receipts, customers, products] = await Promise.all([
        receiptsService.getAll(),
        customersService.getAll(),
        productsService.getAll(),
      ]);

      // Build customers map
      const custMap = {};
      customers.forEach((c) => {
        if (c.id) custMap[c.id] = c.name || c.fullName || "Unknown";
        if (c.customerId)
          custMap[c.customerId] = c.name || c.fullName || "Unknown";
        if (c.loyverseId)
          custMap[c.loyverseId] = c.name || c.fullName || "Unknown";
      });
      setCustomersMap(custMap);

      // Build products map
      const prodMap = {};
      products.forEach((p) => {
        if (p.id) prodMap[p.id] = p;
        if (p.loyverseId) prodMap[p.loyverseId] = p;
      });
      setProductsMap(prodMap);

      // Sort by date descending
      const sorted = receipts.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return dateB - dateA;
      });

      setTransactions(sorted);
      setFilteredTransactions(sorted);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCustomerName = (customerId, customerName) => {
    if (
      customerName &&
      customerName !== "Guest" &&
      customerName !== "Anonymous" &&
      customerName !== "Walk-in Customer"
    ) {
      return customerName;
    }
    if (customerId && customersMap[customerId]) {
      return customersMap[customerId];
    }
    if (customerId) {
      const shortId =
        customerId.length > 8
          ? customerId.slice(-6).toUpperCase()
          : customerId.toUpperCase();
      return `#${shortId}`;
    }
    return "Walk-in";
  };

  const getReceiptId = (receipt) => {
    return (
      receipt.receiptNumber ||
      receipt.receipt_number ||
      (receipt.id ? `#${receipt.id.slice(-6).toUpperCase()}` : "N/A")
    );
  };

  // Check if customer is a member (not walk-in)
  const getMemberName = (customerId, customerName) => {
    // Check if it's a named customer
    if (
      customerName &&
      customerName !== "Guest" &&
      customerName !== "Anonymous" &&
      customerName !== "Walk-in Customer" &&
      customerName !== "Walk-in"
    ) {
      return customerName;
    }
    // Check if customer exists in our customers map
    if (customerId && customersMap[customerId]) {
      return customersMap[customerId];
    }
    return null; // Not a member
  };

  // Apply date filter preset
  const applyDateFilter = (filterType) => {
    setSelectedDateFilter(filterType);
    const now = new Date();
    let start, end;

    switch (filterType) {
      case "today":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59
        );
        break;
      case "yesterday":
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        start = new Date(
          yesterday.getFullYear(),
          yesterday.getMonth(),
          yesterday.getDate()
        );
        end = new Date(
          yesterday.getFullYear(),
          yesterday.getMonth(),
          yesterday.getDate(),
          23,
          59,
          59
        );
        break;
      case "thisMonth":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case "lastMonth":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case "custom":
        setShowDatePicker(true);
        return;
      case "all":
      default:
        setDateRange([null, null]);
        return;
    }

    setDateRange([start, end]);
  };

  // Filter transactions
  useEffect(() => {
    let filtered = [...transactions];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((tx) => {
        const receiptId = getReceiptId(tx).toLowerCase();
        const customerName = getCustomerName(
          tx.customerId || tx.customer_id,
          tx.customerName || tx.customer_name
        ).toLowerCase();
        return receiptId.includes(query) || customerName.includes(query);
      });
    }

    // Date filter
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      filtered = filtered.filter((tx) => {
        const txDate = tx.createdAt?.toDate?.() || new Date(tx.createdAt);
        return txDate >= start && txDate <= end;
      });
    }

    setFilteredTransactions(filtered);
  }, [searchQuery, startDate, endDate, transactions]);

  const handleReceiptClick = (receipt) => {
    setSelectedReceipt(receipt);
    setShowReceiptModal(true);
  };

  const clearDateFilter = () => {
    setDateRange([null, null]);
    setSelectedDateFilter("all");
  };

  const getProductName = (item) => {
    const itemId = item.item_id || item.itemId || item.id;
    if (productsMap[itemId]) {
      return (
        productsMap[itemId].name ||
        item.item_name ||
        item.name ||
        "Unknown Item"
      );
    }
    return item.item_name || item.name || "Unknown Item";
  };

  const getPaymentMethod = (receipt) => {
    if (receipt.payments && receipt.payments.length > 0) {
      return receipt.payments.map((p) => p.name || p.type || "Cash").join(", ");
    }
    return receipt.paymentMethod || receipt.payment_method || "Cash";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500 mx-auto"></div>
          <p className="mt-6 text-2xl text-neutral-600">
            Loading transactions...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900 pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-neutral-800 shadow-sm p-4">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-12 w-12"
          >
            <ArrowLeft className="h-7 w-7" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
              Transactions
            </h1>
            <p className="text-lg text-neutral-500">
              {filteredTransactions.length} transactions
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by receipt ID or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-14 pl-14 pr-4 text-xl rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Date Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={selectedDateFilter === "all" ? "default" : "outline"}
            onClick={() => applyDateFilter("all")}
            className={`h-11 px-4 text-base ${
              selectedDateFilter === "all"
                ? "bg-green-600 hover:bg-green-700"
                : ""
            }`}
          >
            All
          </Button>
          <Button
            variant={selectedDateFilter === "today" ? "default" : "outline"}
            onClick={() => applyDateFilter("today")}
            className={`h-11 px-4 text-base ${
              selectedDateFilter === "today"
                ? "bg-green-600 hover:bg-green-700"
                : ""
            }`}
          >
            Today
          </Button>
          <Button
            variant={selectedDateFilter === "yesterday" ? "default" : "outline"}
            onClick={() => applyDateFilter("yesterday")}
            className={`h-11 px-4 text-base ${
              selectedDateFilter === "yesterday"
                ? "bg-green-600 hover:bg-green-700"
                : ""
            }`}
          >
            Yesterday
          </Button>
          <Button
            variant={selectedDateFilter === "thisMonth" ? "default" : "outline"}
            onClick={() => applyDateFilter("thisMonth")}
            className={`h-11 px-4 text-base ${
              selectedDateFilter === "thisMonth"
                ? "bg-green-600 hover:bg-green-700"
                : ""
            }`}
          >
            This Month
          </Button>
          <Button
            variant={selectedDateFilter === "lastMonth" ? "default" : "outline"}
            onClick={() => applyDateFilter("lastMonth")}
            className={`h-11 px-4 text-base ${
              selectedDateFilter === "lastMonth"
                ? "bg-green-600 hover:bg-green-700"
                : ""
            }`}
          >
            Last Month
          </Button>
          <Button
            variant={selectedDateFilter === "custom" ? "default" : "outline"}
            onClick={() => applyDateFilter("custom")}
            className={`h-11 px-4 text-base flex items-center gap-2 ${
              selectedDateFilter === "custom"
                ? "bg-green-600 hover:bg-green-700"
                : ""
            }`}
          >
            <Calendar className="h-4 w-4" />
            {selectedDateFilter === "custom" && startDate && endDate
              ? `${startDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })} - ${endDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}`
              : "Custom"}
          </Button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="p-4 space-y-3">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-20">
            <Receipt className="h-20 w-20 mx-auto text-neutral-300 mb-4" />
            <p className="text-2xl text-neutral-500">No transactions found</p>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const txDate = tx.createdAt?.toDate?.() || new Date(tx.createdAt);
            const total = tx.total || tx.totalAmount || tx.total_money || 0;
            const receiptId = getReceiptId(tx);
            const memberName = getMemberName(
              tx.customerId || tx.customer_id,
              tx.customerName || tx.customer_name
            );

            return (
              <Card
                key={tx.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleReceiptClick(tx)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-bold text-xl text-neutral-900 dark:text-white">
                        {receiptId}
                      </p>
                      {memberName && (
                        <p className="text-lg text-green-600 dark:text-green-400 flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {memberName}
                        </p>
                      )}
                      <p className="text-lg text-neutral-500">
                        {txDate.toLocaleString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-2xl text-green-600 dark:text-green-400">
                        {formatCurrency(total)}
                      </p>
                      <ChevronRight className="h-6 w-6 text-neutral-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Date Picker Modal */}
      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent className="sm:max-w-sm p-4">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold">
              Select Date Range
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            <DatePicker
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              onChange={(update) => setDateRange(update)}
              inline
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                clearDateFilter();
                setShowDatePicker(false);
              }}
              className="flex-1 h-12 text-lg"
            >
              Clear
            </Button>
            <Button
              onClick={() => {
                if (startDate && endDate) {
                  setSelectedDateFilter("custom");
                }
                setShowDatePicker(false);
              }}
              className="flex-1 h-12 text-lg bg-green-600 hover:bg-green-700"
            >
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Detail Modal */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0">
          {selectedReceipt && (
            <>
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="text-center">
                  <p className="text-lg font-mono text-neutral-500">
                    {getReceiptId(selectedReceipt)}
                  </p>
                  <p className="text-4xl font-bold text-green-600 mt-2">
                    {formatCurrency(
                      selectedReceipt.total ||
                        selectedReceipt.totalAmount ||
                        selectedReceipt.total_money ||
                        0
                    )}
                  </p>
                </DialogTitle>
              </DialogHeader>

              <div className="p-6 space-y-6">
                {/* Customer & Date Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-neutral-500 mb-1">
                      <User className="h-5 w-5" />
                      <span className="text-sm">Customer</span>
                    </div>
                    <p className="font-bold text-lg text-neutral-900 dark:text-white">
                      {getCustomerName(
                        selectedReceipt.customerId ||
                          selectedReceipt.customer_id,
                        selectedReceipt.customerName ||
                          selectedReceipt.customer_name
                      )}
                    </p>
                  </div>
                  <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-neutral-500 mb-1">
                      <Clock className="h-5 w-5" />
                      <span className="text-sm">Date & Time</span>
                    </div>
                    <p className="font-bold text-lg text-neutral-900 dark:text-white">
                      {(
                        selectedReceipt.createdAt?.toDate?.() ||
                        new Date(selectedReceipt.createdAt)
                      ).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-neutral-500 mb-1">
                    <CreditCard className="h-5 w-5" />
                    <span className="text-sm">Payment Method</span>
                  </div>
                  <p className="font-bold text-lg text-neutral-900 dark:text-white">
                    {getPaymentMethod(selectedReceipt)}
                  </p>
                </div>

                {/* Items */}
                <div>
                  <div className="flex items-center gap-2 text-neutral-500 mb-3">
                    <ShoppingCart className="h-5 w-5" />
                    <span className="text-sm font-medium">Items</span>
                  </div>
                  <div className="space-y-3">
                    {(
                      selectedReceipt.lineItems ||
                      selectedReceipt.line_items ||
                      selectedReceipt.items ||
                      []
                    ).map((item, idx) => {
                      const quantity = item.quantity || 1;
                      const price =
                        item.price ||
                        item.unit_price ||
                        item.total_money / quantity ||
                        0;
                      const total =
                        item.total_money || item.total || price * quantity || 0;

                      return (
                        <div
                          key={idx}
                          className="flex items-start justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl"
                        >
                          <div className="flex-1">
                            <p className="font-bold text-neutral-900 dark:text-white">
                              {getProductName(item)}
                            </p>
                            <p className="text-sm text-neutral-500">
                              {quantity} × {formatCurrency(price)}
                            </p>
                          </div>
                          <p className="font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(total)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Summary */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-lg">
                    <span className="text-neutral-500">Subtotal</span>
                    <span className="font-medium">
                      {formatCurrency(
                        selectedReceipt.subtotal ||
                          selectedReceipt.total ||
                          selectedReceipt.totalAmount ||
                          0
                      )}
                    </span>
                  </div>
                  {selectedReceipt.discount > 0 && (
                    <div className="flex justify-between text-lg">
                      <span className="text-neutral-500">Discount</span>
                      <span className="font-medium text-red-500">
                        -{formatCurrency(selectedReceipt.discount)}
                      </span>
                    </div>
                  )}
                  {selectedReceipt.tax > 0 && (
                    <div className="flex justify-between text-lg">
                      <span className="text-neutral-500">Tax</span>
                      <span className="font-medium">
                        {formatCurrency(selectedReceipt.tax)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold pt-2 border-t">
                    <span>Total</span>
                    <span className="text-green-600">
                      {formatCurrency(
                        selectedReceipt.total ||
                          selectedReceipt.totalAmount ||
                          selectedReceipt.total_money ||
                          0
                      )}
                    </span>
                  </div>
                </div>

                {/* Close Button */}
                <Button
                  onClick={() => setShowReceiptModal(false)}
                  className="w-full h-14 text-xl bg-neutral-800 hover:bg-neutral-900"
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
