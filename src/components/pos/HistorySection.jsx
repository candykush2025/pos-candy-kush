"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { receiptsService } from "@/lib/firebase/firestore";
import { dbService } from "@/lib/db/dbService";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  History,
  Calendar,
  DollarSign,
  ShoppingBag,
  Receipt,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  WifiOff,
  AlertCircle,
  RotateCcw,
  Edit2,
  Trash2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/format";

const getReceiptDate = (receipt) => {
  if (!receipt) return null;
  if (receipt._receiptDate) return receipt._receiptDate;
  if (receipt.receiptDate) return new Date(receipt.receiptDate);
  if (receipt.createdAt?.toDate) return receipt.createdAt.toDate();
  if (receipt.createdAt) return new Date(receipt.createdAt);
  return null;
};

const resolveMoneyValue = (value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === "object") {
    if (typeof value.amount === "number") return value.amount;
    if (typeof value.value === "number") return value.value;
    if (typeof value.total === "number") return value.total;
    if (typeof value.unit === "number") return value.unit;

    const nested = [
      value.amount_money,
      value.total_money,
      value.money,
      value.unit_money,
    ];

    for (const candidate of nested) {
      if (candidate && candidate !== value) {
        const resolved = resolveMoneyValue(candidate);
        if (resolved) return resolved;
      }
    }
  }
  return 0;
};

const normalizeLineItems = (items = []) => {
  return items.map((item, index) => {
    const rawQuantity =
      item._quantity ??
      item.quantity ??
      item.qty ??
      item.count ??
      item.quantity_sold ??
      item.quantitySold ??
      0;
    const quantity = Number(rawQuantity) || 0;

    const totalCandidates = [
      item._total,
      item.total,
      item.total_money,
      item.totalMoney,
      item.item_total,
      item.gross_total,
      item.net_total,
      item.amount,
      item.amount_money,
      item.line_total,
      item.price_total,
    ];
    let total = 0;
    for (const candidate of totalCandidates) {
      const resolved = resolveMoneyValue(candidate);
      if (resolved) {
        total = resolved;
        break;
      }
    }

    const unitCandidates = [
      item._unitPrice,
      item.price,
      item.unit_price,
      item.price_money,
      item.priceMoney,
      item.item_price,
      item.selling_price,
    ];
    let unitPrice = 0;
    for (const candidate of unitCandidates) {
      const resolved = resolveMoneyValue(candidate);
      if (resolved) {
        unitPrice = resolved;
        break;
      }
    }

    if (!unitPrice && quantity) {
      unitPrice = total / quantity;
    }
    if (!total && unitPrice) {
      total = unitPrice * quantity;
    }

    const name =
      item._name ||
      item.name ||
      item.item_name ||
      item.product_name ||
      item.productName ||
      item.title ||
      (item.item && (item.item.name || item.item.item_name));
    const variant =
      item._variant ||
      item.variant ||
      item.variant_name ||
      item.variantName ||
      (item.variant && (item.variant.name || item.variant.variant_name));
    const sku =
      item._sku ||
      item.sku ||
      item.item_sku ||
      item.itemSku ||
      (item.item && (item.item.sku || item.item.item_sku));

    return {
      ...item,
      _lineId:
        item.id ||
        item.line_item_id ||
        item.lineItemId ||
        item.item_id ||
        item.itemId ||
        sku ||
        `line-${index}`,
      _name: name || "Item",
      _variant: variant || null,
      _sku: sku || null,
      _quantity: quantity,
      _unitPrice: unitPrice,
      _total: total,
    };
  });
};

const buildSearchPool = (receipt) => {
  const payments = receipt.payments?.map(
    (payment) => payment.name || payment.payment_type?.name
  );

  const lineItemTokens = (receipt.lineItems || []).flatMap((item) => [
    item._name,
    item._variant,
    item._sku,
  ]);

  return [
    receipt.receiptNumber,
    receipt.orderNumber,
    receipt.customerName,
    receipt.customerId,
    receipt.employeeName,
    receipt.employeeId,
    receipt.cashierName,
    receipt.cashierId,
    receipt.source,
    receipt.location?.name,
    ...(payments || []),
    ...lineItemTokens,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
};

const getCustomerLabel = (receipt) => {
  if (receipt.customerName) return receipt.customerName;
  if (receipt.customerId)
    return `Customer ${receipt.customerId.slice(0, 6)}...`;
  return "Walk-in Customer";
};

const getPaymentSummary = (receipt) => {
  if (!receipt?.payments || receipt.payments.length === 0) return "Unknown";
  return receipt.payments
    .map((payment) => payment.name || payment.payment_type?.name || "Cash")
    .join(", ");
};

const getSyncStatusBadge = (receipt) => {
  const syncStatus = receipt.syncStatus || receipt.sync_status;
  const fromThisDevice = receipt.fromThisDevice;

  // If no sync status, it's from Loyverse
  if (!syncStatus) {
    return {
      variant: "secondary",
      icon: Receipt,
      text: "From Loyverse",
      className:
        "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    };
  }

  switch (syncStatus) {
    case "synced":
      return {
        variant: "default",
        icon: CheckCircle,
        text: fromThisDevice ? "Synced ✓" : "Synced",
        className:
          "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
      };
    case "pending":
      return {
        variant: "secondary",
        icon: Clock,
        text: "Pending",
        className:
          "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
      };
    case "offline":
      return {
        variant: "outline",
        icon: WifiOff,
        text: "Offline",
        className:
          "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
      };
    case "failed":
      return {
        variant: "destructive",
        icon: XCircle,
        text: "Failed",
        className:
          "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
      };
    default:
      return {
        variant: "outline",
        icon: AlertCircle,
        text: "Unknown",
        className:
          "bg-gray-100 text-gray-600 dark:text-gray-300 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
      };
  }
};

const getLineItemQuantity = (item) => {
  if (typeof item?._quantity === "number" && !Number.isNaN(item._quantity)) {
    return item._quantity;
  }
  const fallback =
    item?.quantity ??
    item?.qty ??
    item?.count ??
    item?.quantitySold ??
    item?.quantity_sold ??
    0;
  const parsed = Number(fallback);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getLineItemTotal = (item) => {
  if (typeof item?._total === "number" && !Number.isNaN(item._total)) {
    return item._total;
  }
  const candidates = [
    item?.total,
    item?.total_money,
    item?.totalMoney,
    item?.amount,
    item?.amount_money,
    item?.line_total,
  ];
  for (const candidate of candidates) {
    const resolved = resolveMoneyValue(candidate);
    if (resolved) return resolved;
  }
  const quantity = getLineItemQuantity(item);
  const unit = getLineItemUnitPrice(item);
  return unit * quantity;
};

const getLineItemUnitPrice = (item) => {
  if (typeof item?._unitPrice === "number" && !Number.isNaN(item._unitPrice)) {
    return item._unitPrice;
  }
  const candidates = [
    item?.price,
    item?.unit_price,
    item?.price_money,
    item?.priceMoney,
    item?.item_price,
  ];
  for (const candidate of candidates) {
    const resolved = resolveMoneyValue(candidate);
    if (resolved) return resolved;
  }
  const quantity = getLineItemQuantity(item);
  if (!quantity) return 0;
  const totalCandidates = [
    item?._total,
    item?.total,
    item?.total_money,
    item?.totalMoney,
  ];
  for (const candidate of totalCandidates) {
    const total = resolveMoneyValue(candidate);
    if (total) return total / Math.max(quantity, 1);
  }
  return 0;
};

const getLineItemName = (item) => {
  const name =
    item?._name ||
    item?.name ||
    item?.item_name ||
    item?.product_name ||
    item?.productName ||
    item?.title;
  const variant = item?._variant || item?.variant_name || item?.variantName;
  if (name && variant) return `${name} (${variant})`;
  return name || variant || "Item";
};

const getLineItemSku = (item) => {
  return item?._sku || item?.sku || item?.item_sku || item?.itemSku || null;
};

const resolveEmployeeName = (employee) => {
  if (!employee) return null;
  if (employee.name) return employee.name;
  if (employee.display_name) return employee.display_name;

  const primary =
    employee.full_name ||
    [
      employee.first_name || employee.firstName || employee.given_name,
      employee.last_name || employee.lastName || employee.family_name,
    ]
      .filter(Boolean)
      .join(" ");

  return primary || null;
};

export default function HistorySection({ cashier: _cashier }) {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [displayCount, setDisplayCount] = useState(20); // Lazy loading
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showChangePaymentModal, setShowChangePaymentModal] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState("");
  const [submittingChangeRequest, setSubmittingChangeRequest] = useState(false);
  const [submittingRefundRequest, setSubmittingRefundRequest] = useState(false);

  const PAGE_SIZE = 20;
  const scrollContainerRef = useRef(null);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    loadReceipts();
  }, [isOnline]);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      let allReceipts = [];

      // Always try to fetch Firebase receipts if online
      if (isOnline) {
        try {
          const firebaseData = await receiptsService.getAll({
            orderBy: ["createdAt", "desc"],
            limit: 50, // Load only 50 receipts initially
          });
          allReceipts = [...firebaseData];
        } catch (error) {
          console.warn("Failed to fetch Firebase receipts:", error);
        }
      }

      // Fetch local offline transactions from IndexedDB
      try {
        const localOrders = await dbService.getOrders({
          // Get all orders, we'll filter and sort them later
        });

        // Convert local orders to receipt-like format
        const localReceipts = localOrders.map((order) => ({
          ...order,
          // Map order fields to receipt fields for consistency
          receiptNumber: order.orderNumber || order.id,
          orderNumber: order.orderNumber || order.id,
          customerName: order.customerName,
          customerId: order.customerId,
          employeeName: order.employeeName || order.cashierName,
          employeeId: order.employeeId || order.cashierId,
          cashierName: order.cashierName,
          cashierId: order.cashierId,
          source: "local",
          syncStatus: order.syncStatus || "offline",
          fromThisDevice: true,
          // Convert order items to line items
          lineItems: order.items || [],
          payments: order.payments || [],
          totalMoney: order.total || order.totalMoney || 0,
          createdAt: order.createdAt,
          receiptDate: order.createdAt,
          // Add any other fields that might be needed
        }));

        // Only add local receipts if they don't exist in Firebase receipts
        // Deduplicate by orderNumber or receiptNumber
        const firebaseOrderNumbers = new Set(
          allReceipts.map((r) => r.receiptNumber || r.orderNumber || r.id)
        );

        const uniqueLocalReceipts = localReceipts.filter((localReceipt) => {
          const localOrderNum =
            localReceipt.orderNumber ||
            localReceipt.receiptNumber ||
            localReceipt.id;
          return !firebaseOrderNumbers.has(localOrderNum);
        });

        allReceipts = [...allReceipts, ...uniqueLocalReceipts];
      } catch (error) {
        console.warn("Failed to fetch local orders:", error);
      }

      const normalized = allReceipts
        .map((receipt) => {
          const receiptDate = getReceiptDate(receipt);
          const lineItems = normalizeLineItems(
            receipt.lineItems ||
              receipt.line_items ||
              receipt.items ||
              receipt.receiptItems ||
              receipt.receipt_items ||
              []
          );

          const enrichedReceipt = {
            ...receipt,
            lineItems,
            totalMoney:
              receipt.totalMoney || receipt.total_money || receipt.total || 0,
            _receiptDate: receiptDate,
          };

          return {
            ...enrichedReceipt,
            _searchPool: buildSearchPool(enrichedReceipt),
          };
        })
        .sort((a, b) => {
          const dateA = a._receiptDate ? a._receiptDate.getTime() : 0;
          const dateB = b._receiptDate ? b._receiptDate.getTime() : 0;
          return dateB - dateA;
        });

      setReceipts(normalized);

      // Auto-select first receipt
      if (normalized.length > 0 && !selectedReceipt) {
        setSelectedReceipt(normalized[0]);
      }
    } catch (error) {
      console.error("Error loading receipts:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReceipts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return receipts;

    return receipts.filter((receipt) => {
      if (!receipt._searchPool) return false;
      return receipt._searchPool.some((field) => field.includes(query));
    });
  }, [receipts, searchQuery]);

  // Reset display count when search changes
  useEffect(() => {
    setDisplayCount(20);
  }, [searchQuery]);

  // Lazy loaded receipts
  const displayedReceipts = useMemo(() => {
    return filteredReceipts.slice(0, displayCount);
  }, [filteredReceipts, displayCount]);

  // Group receipts by date
  const groupedReceipts = useMemo(() => {
    const groups = [];
    let currentDate = null;

    displayedReceipts.forEach((receipt) => {
      const receiptDate = receipt._receiptDate;
      if (!receiptDate) return;

      const dateStr = formatDate(receiptDate, "date"); // Format: "17 November 2025"

      if (dateStr !== currentDate) {
        currentDate = dateStr;
        groups.push({ type: "header", date: dateStr });
      }

      groups.push({ type: "receipt", data: receipt });
    });

    return groups;
  }, [displayedReceipts]);

  // Handle infinite scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;

      // Load more when scrolled to 80% of the content
      if (scrollTop + clientHeight >= scrollHeight * 0.8) {
        if (displayCount < filteredReceipts.length) {
          setDisplayCount((prev) =>
            Math.min(prev + 20, filteredReceipts.length)
          );
        }
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [displayCount, filteredReceipts.length]);

  const handleViewDetails = (receipt) => {
    setSelectedReceipt(receipt);
    setShowDetailsModal(true);
  };

  const getCashierLabel = (receipt) => {
    if (receipt.employeeName) return receipt.employeeName;
    if (receipt.cashierName) return receipt.cashierName;
    if (receipt.employee) {
      const nameFromEmbedded =
        receipt.employee.name || resolveEmployeeName(receipt.employee);
      if (nameFromEmbedded) return nameFromEmbedded;
    }
    return "Unknown";
  };

  const getTimestampLabel = (receipt) => {
    const date = receipt._receiptDate || getReceiptDate(receipt);
    return date ? formatDate(date, "datetime") : "Unknown date";
  };

  const getPaymentIcon = (receipt) => {
    const payment = receipt.payments?.[0];
    const paymentType = payment?.type || payment?.name || "cash";
    const type = paymentType.toLowerCase();

    if (
      type.includes("card") ||
      type.includes("credit") ||
      type.includes("debit")
    ) {
      return "💳";
    }
    if (
      type.includes("crypto") ||
      type.includes("bitcoin") ||
      type.includes("btc")
    ) {
      return "₿";
    }
    if (type.includes("transfer") || type.includes("bank")) {
      return "🏦";
    }
    return "💵"; // Cash default
  };

  const handleRefundRequest = async () => {
    if (!selectedReceipt) return;

    try {
      setSubmittingRefundRequest(true);
      const editRequest = {
        receiptId: selectedReceipt.id,
        receiptNumber:
          selectedReceipt.receiptNumber || selectedReceipt.id || "Unknown",
        type: "refund",
        requestedBy: _cashier?.id || "unknown",
        requestedByName: _cashier?.name || "Unknown Cashier",
        requestedAt: new Date().toISOString(),
        status: "pending",
        originalAmount: resolveMoneyValue(
          selectedReceipt.totalMoney ??
            selectedReceipt.total_money ??
            selectedReceipt.total ??
            selectedReceipt._total ??
            0
        ),
        originalPaymentMethod: getPaymentSummary(selectedReceipt),
      };

      // Save to a new collection for admin review
      await receiptsService.createEditRequest(editRequest);

      alert("Refund request submitted for admin approval");
      setShowRefundModal(false);
    } catch (error) {
      console.error("Error submitting refund request:", error);
      alert("Failed to submit refund request");
    } finally {
      setSubmittingRefundRequest(false);
    }
  };

  const handleChangePaymentRequest = async () => {
    if (!selectedReceipt || !newPaymentMethod) return;

    try {
      setSubmittingChangeRequest(true);
      const oldPaymentMethod = getPaymentSummary(selectedReceipt);

      const editRequest = {
        receiptId: selectedReceipt.id,
        receiptNumber:
          selectedReceipt.receiptNumber || selectedReceipt.id || "Unknown",
        type: "payment_change",
        requestedBy: _cashier?.id || "unknown",
        requestedByName: _cashier?.name || "Unknown Cashier",
        requestedAt: new Date().toISOString(),
        status: "pending",
        oldPaymentMethod,
        newPaymentMethod,
        amount: resolveMoneyValue(
          selectedReceipt.totalMoney ??
            selectedReceipt.total_money ??
            selectedReceipt.total ??
            selectedReceipt._total ??
            0
        ),
      };

      // Save to a new collection for admin review
      const requestDoc = await receiptsService.createEditRequest(editRequest);

      // Mark the receipt as having a pending change with full details
      await receiptsService.update(selectedReceipt.id, {
        hasPendingPaymentChange: true,
        pendingPaymentChange: {
          oldMethod: oldPaymentMethod,
          newMethod: newPaymentMethod,
          requestedBy: _cashier?.id || "unknown",
          requestedByName: _cashier?.name || "Unknown Cashier",
          requestedAt: new Date().toISOString(),
          requestId: requestDoc.id, // Store the request ID for later reference
        },
      });

      alert(
        "Payment change request submitted for admin approval. The receipt will be updated after admin approval."
      );
      setShowChangePaymentModal(false);
      setNewPaymentMethod("");

      // Reload receipts to show the pending badge
      loadReceipts();
    } catch (error) {
      console.error("Error submitting payment change request:", error);
      alert("Failed to submit payment change request");
    } finally {
      setSubmittingChangeRequest(false);
    }
  };

  return (
    <div className="h-full flex overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* 2 Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Receipt List (30%) */}
        <div className="w-[30%] border-r bg-white dark:bg-gray-900 flex flex-col">
          {/* Search Bar */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search receipts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Receipt List */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-auto scrollbar-hide"
          >
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-gray-500 dark:text-gray-400">Loading...</p>
              </div>
            ) : filteredReceipts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 px-4">
                <Receipt className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  No receipts found
                </p>
              </div>
            ) : (
              <div>
                {groupedReceipts.map((item, index) => {
                  if (item.type === "header") {
                    return (
                      <div
                        key={`header-${item.date}`}
                        className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700"
                      >
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {item.date}
                        </p>
                      </div>
                    );
                  }

                  const receipt = item.data;
                  return (
                    <div
                      key={receipt.id}
                      onClick={() => handleViewDetails(receipt)}
                      className={`p-4 border-b cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        selectedReceipt?.id === receipt.id
                          ? "bg-primary/10 border-l-4 border-l-primary"
                          : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Payment Icon */}
                        <div className="text-3xl">
                          {getPaymentIcon(receipt)}
                        </div>

                        {/* Amount and Time */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {formatCurrency(
                              resolveMoneyValue(
                                receipt.totalMoney ?? receipt.total ?? 0
                              )
                            )}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {receipt._receiptDate
                              ? formatDate(receipt._receiptDate, "time")
                              : "Unknown time"}
                          </p>
                        </div>

                        {/* Receipt ID */}
                        <div className="text-right">
                          <p className="text-sm font-mono font-semibold text-gray-700 dark:text-gray-300">
                            #{receipt.receiptNumber || receipt.id?.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Loading more indicator */}
                {displayCount < filteredReceipts.length && (
                  <div className="p-4 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Loading more...
                    </p>
                  </div>
                )}

                {/* End of list indicator */}
                {displayCount >= filteredReceipts.length &&
                  filteredReceipts.length > 0 && (
                    <div className="p-4 text-center">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {filteredReceipts.length} receipt
                        {filteredReceipts.length !== 1 ? "s" : ""} loaded
                      </p>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Receipt Details (70%) */}
        <div className="w-[70%] bg-white dark:bg-gray-900 flex flex-col overflow-auto">
          {!selectedReceipt ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Select a receipt to view details
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-8">
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Action Buttons - Top Right */}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRefundModal(true)}
                    className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                    Refund
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowChangePaymentModal(true)}
                    className="flex items-center gap-2"
                  >
                    <Edit2 className="h-4 w-4" />
                    Change Payment
                  </Button>
                </div>

                {/* Total Amount - Center */}
                <div className="text-center py-6">
                  <p className="text-5xl font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(
                      resolveMoneyValue(
                        selectedReceipt.totalMoney ?? selectedReceipt.total ?? 0
                      )
                    )}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 mt-2">Total</p>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200 dark:border-gray-700"></div>

                {/* Employee */}
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Employee
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-1">
                    {getCashierLabel(selectedReceipt)}
                  </p>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200 dark:border-gray-700"></div>

                {/* Items */}
                <div className="space-y-3">
                  {selectedReceipt.lineItems &&
                    selectedReceipt.lineItems.length > 0 &&
                    selectedReceipt.lineItems.map((item, idx) => {
                      const quantity = getLineItemQuantity(item);
                      const unitPrice = getLineItemUnitPrice(item);
                      const total = getLineItemTotal(item);
                      const name = getLineItemName(item);

                      return (
                        <div
                          key={`${item._lineId || idx}-${idx}`}
                          className="flex items-start justify-between gap-4"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {quantity} x {formatCurrency(unitPrice)}
                            </p>
                          </div>
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {formatCurrency(total)}
                          </p>
                        </div>
                      );
                    })}
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200 dark:border-gray-700"></div>

                {/* Payment Method */}
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Payment Method
                  </p>
                  <div className="mt-1 space-y-2">
                    {selectedReceipt.paymentHistory &&
                    selectedReceipt.paymentHistory.length > 0 ? (
                      <div className="space-y-1">
                        {/* Old payment with strikethrough */}
                        <div className="flex items-center gap-2">
                          <p className="text-lg line-through text-gray-400 dark:text-gray-500">
                            {
                              selectedReceipt.paymentHistory[
                                selectedReceipt.paymentHistory.length - 1
                              ].oldMethod
                            }
                          </p>
                        </div>
                        {/* New payment */}
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-semibold text-green-600 dark:text-green-500">
                            {getPaymentSummary(selectedReceipt)}
                          </p>
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          >
                            Changed
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Changed by{" "}
                          {
                            selectedReceipt.paymentHistory[
                              selectedReceipt.paymentHistory.length - 1
                            ].changedBy
                          }
                        </p>
                      </div>
                    ) : selectedReceipt.hasPendingPaymentChange ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {getPaymentSummary(selectedReceipt)}
                          </p>
                          <Badge
                            variant="secondary"
                            className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            Change Pending
                          </Badge>
                        </div>
                        {selectedReceipt.pendingPaymentChange && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Requested change to:{" "}
                            {selectedReceipt.pendingPaymentChange.newMethod}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {getPaymentSummary(selectedReceipt)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200 dark:border-gray-700"></div>

                {/* Date and Receipt ID */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Date
                    </p>
                    <p className="text-base font-medium text-gray-900 dark:text-gray-100 mt-1">
                      {getTimestampLabel(selectedReceipt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Receipt ID
                    </p>
                    <p className="text-base font-mono font-semibold text-gray-900 dark:text-gray-100 mt-1">
                      #{selectedReceipt.receiptNumber || selectedReceipt.id}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Refund Modal */}
      <Dialog open={showRefundModal} onOpenChange={setShowRefundModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Refund</DialogTitle>
            <DialogDescription>
              Submit a refund request for this receipt. Admin approval required.
            </DialogDescription>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Receipt #
                    </span>
                    <span className="font-mono font-semibold">
                      {selectedReceipt.receiptNumber || selectedReceipt.id}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Amount
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(
                        resolveMoneyValue(
                          selectedReceipt.totalMoney ??
                            selectedReceipt.total ??
                            0
                        )
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Payment Method
                    </span>
                    <span className="font-semibold">
                      {getPaymentSummary(selectedReceipt)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowRefundModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRefundRequest}
                  className="flex-1"
                  variant="destructive"
                  disabled={submittingRefundRequest}
                >
                  {submittingRefundRequest ? (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Refund Request"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Payment Modal */}
      <Dialog
        open={showChangePaymentModal}
        onOpenChange={setShowChangePaymentModal}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Payment Method</DialogTitle>
            <DialogDescription>
              Request to change the payment method. Admin approval required.
            </DialogDescription>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Receipt #
                    </span>
                    <span className="font-mono font-semibold">
                      {selectedReceipt.receiptNumber || selectedReceipt.id}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Amount
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(
                        resolveMoneyValue(
                          selectedReceipt.totalMoney ??
                            selectedReceipt.total ??
                            0
                        )
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Current Payment
                    </span>
                    <span className="font-semibold">
                      {getPaymentSummary(selectedReceipt)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  New Payment Method
                </label>
                <Select
                  value={newPaymentMethod}
                  onValueChange={setNewPaymentMethod}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Crypto">Crypto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowChangePaymentModal(false);
                    setNewPaymentMethod("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleChangePaymentRequest}
                  className="flex-1"
                  disabled={!newPaymentMethod || submittingChangeRequest}
                >
                  {submittingChangeRequest ? (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Change Request"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
