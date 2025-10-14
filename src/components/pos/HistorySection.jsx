"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { receiptsService } from "@/lib/firebase/firestore";
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
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { loyverseService } from "@/lib/api/loyverse";

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
          "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
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
  const [employees, setEmployees] = useState({});

  const PAGE_SIZE = 10;
  const pendingEmployeesRef = useRef(new Set());

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const data = await receiptsService.getAll({
        orderBy: ["createdAt", "desc"],
      });

      const normalized = data
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
            totalMoney: receipt.totalMoney || receipt.total_money || receipt.total || 0,
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

  const totalPages = Math.ceil(filteredReceipts.length / PAGE_SIZE) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, receipts.length]);

  useEffect(() => {
    const bounded = Math.min(Math.max(currentPage, 1), totalPages);
    if (bounded !== currentPage) {
      setCurrentPage(bounded);
    }
  }, [currentPage, totalPages]);

  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedReceipts = filteredReceipts.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );
  const showingFrom = filteredReceipts.length === 0 ? 0 : startIndex + 1;
  const showingTo = Math.min(
    startIndex + paginatedReceipts.length,
    filteredReceipts.length
  );

  useEffect(() => {
    const receiptsNeedingEmployees = paginatedReceipts
      .map((receipt) => receipt.employeeId)
      .filter((employeeId) => {
        if (!employeeId) return false;
        if (employees[employeeId]) return false;
        return !pendingEmployeesRef.current.has(employeeId);
      });

    if (receiptsNeedingEmployees.length === 0) {
      return undefined;
    }

    let cancelled = false;

    const loadEmployees = async () => {
      for (const employeeId of receiptsNeedingEmployees) {
        pendingEmployeesRef.current.add(employeeId);
        try {
          const employee = await loyverseService.getEmployee(employeeId);
          if (!cancelled && employee) {
            setEmployees((prev) => ({
              ...prev,
              [employeeId]: employee,
            }));
          }
        } catch (error) {
          console.error(`Error loading employee ${employeeId}:`, error);
          if (!cancelled) {
            setEmployees((prev) => ({
              ...prev,
              [employeeId]: { name: null },
            }));
          }
        } finally {
          pendingEmployeesRef.current.delete(employeeId);
        }
      }
    };

    loadEmployees();

    return () => {
      cancelled = true;
    };
  }, [paginatedReceipts, employees]);

  const handleViewDetails = (receipt) => {
    setSelectedReceipt(receipt);
    setShowDetailsModal(true);
  };

  const getCashierLabel = (receipt) => {
    if (receipt.employeeName) return receipt.employeeName;
    if (receipt.employee) {
      const nameFromEmbedded =
        receipt.employee.name || resolveEmployeeName(receipt.employee);
      if (nameFromEmbedded) return nameFromEmbedded;
    }
    if (receipt.employeeId) {
      const cached = employees[receipt.employeeId];
      const resolved = resolveEmployeeName(cached);
      if (resolved) return resolved;
      return `Employee ${receipt.employeeId.slice(0, 6)}...`;
    }
    return "Unknown";
  };

  const getTimestampLabel = (receipt) => {
    const date = receipt._receiptDate || getReceiptDate(receipt);
    return date ? formatDate(date, "datetime") : "Unknown date";
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <History className="h-8 w-8 text-primary" />
          Order History
        </h1>
        <p className="text-gray-500 mt-2">View all completed transactions</p>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by receipt number, customer, employee, or source..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Loading receipts...</p>
        </div>
      ) : filteredReceipts.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No receipts found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {paginatedReceipts.map((receipt) => (
            <Card
              key={receipt.id}
              className="gap-4 rounded-lg border border-gray-200/80 py-4 shadow-sm transition-colors hover:border-primary/40"
            >
              <CardHeader className="gap-1 px-5 pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      #{receipt.receiptNumber || receipt.id?.slice(0, 8)}
                    </CardTitle>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      {receipt.source || "Loyverse"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {getTimestampLabel(receipt)}
                    </p>
                    <p className="text-xl font-semibold text-emerald-600">
                      {formatCurrency(
                        resolveMoneyValue(
                          receipt.totalMoney ?? receipt.total ?? 0
                        )
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {receipt.receiptType && (
                    <Badge
                      variant="outline"
                      className="w-fit text-xs uppercase tracking-wide"
                    >
                      {receipt.receiptType}
                    </Badge>
                  )}
                  {(() => {
                    const syncBadge = getSyncStatusBadge(receipt);
                    const SyncIcon = syncBadge.icon;
                    return (
                      <Badge
                        variant={syncBadge.variant}
                        className={`w-fit text-xs font-medium ${syncBadge.className}`}
                      >
                        <SyncIcon className="mr-1 h-3 w-3" />
                        {syncBadge.text}
                      </Badge>
                    );
                  })()}
                  {receipt.fromThisDevice && (
                    <Badge
                      variant="secondary"
                      className="w-fit text-xs font-medium bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800"
                    >
                      This Device
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-3 pt-2">
                <div className="grid gap-3 text-sm text-gray-600 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <span className="text-xs uppercase text-gray-400">
                      Customer
                    </span>
                    <p className="font-medium text-gray-900">
                      {getCustomerLabel(receipt)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs uppercase text-gray-400">
                      Items
                    </span>
                    <p className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-gray-400" />
                      {receipt.lineItems?.length || 0} lines
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs uppercase text-gray-400">
                      Payments
                    </span>
                    <p className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      {getPaymentSummary(receipt)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs uppercase text-gray-400">
                      Cashier
                    </span>
                    <p className="font-medium text-gray-900">
                      {getCashierLabel(receipt)}
                    </p>
                  </div>
                  {receipt.location?.name && (
                    <div className="space-y-1">
                      <span className="text-xs uppercase text-gray-400">
                        Location
                      </span>
                      <p>{receipt.location.name}</p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="px-5 pt-0">
                <div className="flex w-full items-center gap-3">
                  <span className="text-xs text-gray-400">
                    {receipt.receiptType?.toUpperCase() === "REFUND"
                      ? "Refund receipt"
                      : "Completed transaction"}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-primary"
                    onClick={() => handleViewDetails(receipt)}
                  >
                    View Details
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}

          {filteredReceipts.length > PAGE_SIZE && (
            <div className="flex flex-col gap-4 border-t pt-4 md:flex-row md:items-center md:justify-between">
              <span className="text-sm text-gray-500">
                Showing {showingFrom}-{showingTo} of {filteredReceipts.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  disabled={safePage === 1}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                </Button>
                <span className="text-sm font-medium text-gray-600">
                  Page {safePage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={safePage >= totalPages}
                >
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
            <DialogDescription>
              Receipt #{selectedReceipt?.receiptNumber || selectedReceipt?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-4">
              {/* Sync Status Section */}
              <div className="rounded-lg border p-3">
                <h3 className="mb-2 font-semibold">Sync Status</h3>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const syncBadge = getSyncStatusBadge(selectedReceipt);
                    const SyncIcon = syncBadge.icon;
                    return (
                      <Badge
                        variant={syncBadge.variant}
                        className={`font-medium ${syncBadge.className}`}
                      >
                        <SyncIcon className="mr-1 h-3 w-3" />
                        {syncBadge.text}
                      </Badge>
                    );
                  })()}
                  {selectedReceipt.fromThisDevice && (
                    <Badge
                      variant="secondary"
                      className="font-medium bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800"
                    >
                      Created on This Device
                    </Badge>
                  )}
                  {selectedReceipt.loyverseReceiptNumber && (
                    <Badge
                      variant="outline"
                      className="font-medium bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
                    >
                      Loyverse #{selectedReceipt.loyverseReceiptNumber}
                    </Badge>
                  )}
                </div>
                {selectedReceipt.syncError && (
                  <div className="mt-2 rounded bg-red-50 p-2 text-sm text-red-700">
                    <strong>Sync Error:</strong> {selectedReceipt.syncError}
                  </div>
                )}
                {selectedReceipt.syncedAt && (
                  <p className="mt-2 text-xs text-gray-500">
                    Synced: {formatDate(new Date(selectedReceipt.syncedAt))}
                  </p>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-2">Customer</h3>
                <p>{getCustomerLabel(selectedReceipt)}</p>
              </div>

              {selectedReceipt.lineItems &&
                selectedReceipt.lineItems.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Items</h3>
                    <div className="space-y-2">
                      {selectedReceipt.lineItems.map((item, idx) => {
                        const quantity = getLineItemQuantity(item);
                        const unitPrice = getLineItemUnitPrice(item);
                        const total = getLineItemTotal(item);
                        const name = getLineItemName(item);
                        const sku = getLineItemSku(item);

                        return (
                          <div
                            key={`${
                              item._lineId || item.id || item.sku || idx
                            }-${idx}`}
                            className="flex items-start justify-between gap-4 rounded-md bg-gray-50 px-3 py-2 text-sm"
                          >
                            <div className="flex-1 space-y-1">
                              <p className="font-medium text-gray-800">
                                {name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {quantity} x {formatCurrency(unitPrice)}
                              </p>
                              {sku && (
                                <p className="text-xs text-gray-400">
                                  SKU: {sku}
                                </p>
                              )}
                            </div>
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(total)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              <div className="space-y-2 border-t pt-4">
                {typeof selectedReceipt.subtotal === "number" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">
                      {formatCurrency(selectedReceipt.subtotal)}
                    </span>
                  </div>
                )}
                {typeof selectedReceipt.discount === "number" &&
                  selectedReceipt.discount > 0 && (
                    <div className="flex justify-between text-sm text-orange-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(selectedReceipt.discount)}</span>
                    </div>
                  )}
                {typeof selectedReceipt.tax === "number" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium">
                      {formatCurrency(selectedReceipt.tax)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>
                    {formatCurrency(
                      resolveMoneyValue(
                        selectedReceipt.totalMoney ?? selectedReceipt.total ?? 0
                      )
                    )}
                  </span>
                </div>
              </div>

              {selectedReceipt.payments && (
                <div className="border-t pt-4 space-y-2">
                  <h3 className="font-semibold">Payments</h3>
                  <div className="space-y-2 text-sm">
                    {selectedReceipt.payments.length === 0 && (
                      <p className="text-gray-500">Unknown</p>
                    )}
                    {selectedReceipt.payments.map((payment, idx) => (
                      <div
                        key={`${
                          payment.id || payment.name || "payment"
                        }-${idx}`}
                        className="flex justify-between"
                      >
                        <span>
                          {payment.name || payment.payment_type?.name || "Cash"}
                        </span>
                        <span>
                          {formatCurrency(
                            resolveMoneyValue(
                              payment.amount_money ??
                                payment.amount ??
                                payment.total ??
                                0
                            )
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Date</span>
                  <span>
                    {getReceiptDate(selectedReceipt)
                      ? formatDate(getReceiptDate(selectedReceipt), "datetime")
                      : "Unknown"}
                  </span>
                </div>
                {selectedReceipt.employeeName && (
                  <div className="flex justify-between">
                    <span>Cashier</span>
                    <span className="font-medium">
                      {selectedReceipt.employeeName}
                    </span>
                  </div>
                )}
                {selectedReceipt.location?.name && (
                  <div className="flex justify-between">
                    <span>Location</span>
                    <span>{selectedReceipt.location.name}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
