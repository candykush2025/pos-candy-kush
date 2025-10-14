"use client";

import { useState, useEffect } from "react";
import { receiptsService } from "@/lib/firebase/firestore";
import { loyverseService } from "@/lib/api/loyverse";
import { Timestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  ShoppingCart,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { toast } from "sonner";

export default function AdminOrders() {
  const [receipts, setReceipts] = useState([]);
  const [employees, setEmployees] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Filter states
  const [dateRange, setDateRange] = useState("today"); // today, yesterday, this_week, last_week, this_month, last_month, custom, all
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [receiptTypeFilter, setReceiptTypeFilter] = useState("all"); // all, SALE, REFUND
  const [sourceFilter, setSourceFilter] = useState("all"); // all, point of sale, etc.
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadReceipts();
    loadEmployees();
  }, [dateRange, customStartDate, customEndDate]); // Reload when date range changes

  const getDateRangeFilter = () => {
    const now = new Date();
    let startDate, endDate;

    switch (dateRange) {
      case "today":
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0
        );
        endDate = new Date(
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
        startDate = new Date(
          yesterday.getFullYear(),
          yesterday.getMonth(),
          yesterday.getDate(),
          0,
          0,
          0
        );
        endDate = new Date(
          yesterday.getFullYear(),
          yesterday.getMonth(),
          yesterday.getDate(),
          23,
          59,
          59
        );
        break;
      case "this_week":
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Sunday
        startDate = new Date(
          weekStart.getFullYear(),
          weekStart.getMonth(),
          weekStart.getDate(),
          0,
          0,
          0
        );
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59
        );
        break;
      case "last_week":
        const lastWeekEnd = new Date(now);
        lastWeekEnd.setDate(now.getDate() - now.getDay() - 1); // Last Saturday
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6); // Last Sunday
        startDate = new Date(
          lastWeekStart.getFullYear(),
          lastWeekStart.getMonth(),
          lastWeekStart.getDate(),
          0,
          0,
          0
        );
        endDate = new Date(
          lastWeekEnd.getFullYear(),
          lastWeekEnd.getMonth(),
          lastWeekEnd.getDate(),
          23,
          59,
          59
        );
        break;
      case "this_month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59
        );
        break;
      case "last_month":
        const lastMonth = now.getMonth() - 1;
        const lastMonthYear =
          lastMonth < 0 ? now.getFullYear() - 1 : now.getFullYear();
        const actualLastMonth = lastMonth < 0 ? 11 : lastMonth;
        startDate = new Date(lastMonthYear, actualLastMonth, 1, 0, 0, 0);
        const lastDayOfLastMonth = new Date(
          lastMonthYear,
          actualLastMonth + 1,
          0
        ).getDate();
        endDate = new Date(
          lastMonthYear,
          actualLastMonth,
          lastDayOfLastMonth,
          23,
          59,
          59
        );
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate + "T00:00:00");
          endDate = new Date(customEndDate + "T23:59:59");
        } else {
          return { start: null, end: null };
        }
        break;
      case "all":
        return { start: null, end: null };
      default:
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0
        );
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59
        );
    }

    return {
      start: startDate ? Timestamp.fromDate(startDate) : null,
      end: endDate ? Timestamp.fromDate(endDate) : null,
    };
  };

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const dateFilter = getDateRangeFilter();

      // Load all receipts (client-side filtering for date range)
      // Firebase has limitations with complex queries, so we'll filter in memory
      const data = await receiptsService.getAll({
        orderBy: ["createdAt", "desc"],
      });

      // Filter by date range if specified
      let filteredData = data;
      if (dateFilter.start || dateFilter.end) {
        filteredData = data.filter((receipt) => {
          // Use receiptDate field (the actual transaction date) instead of createdAt
          let receiptDate;
          if (receipt.receiptDate) {
            // receiptDate is an ISO string from Loyverse
            receiptDate = new Date(receipt.receiptDate);
          } else if (receipt.createdAt?.toDate) {
            // Fallback to createdAt if receiptDate doesn't exist
            receiptDate = receipt.createdAt.toDate();
          } else if (receipt.createdAt) {
            receiptDate = new Date(receipt.createdAt);
          } else {
            return false; // Skip receipts without dates
          }

          if (dateFilter.start && dateFilter.end) {
            const startDate = dateFilter.start.toDate();
            const endDate = dateFilter.end.toDate();
            const inRange = receiptDate >= startDate && receiptDate <= endDate;

            // Debug logging
            if (!inRange && dateRange === "today") {
              console.log("Filtered out:", {
                receiptNumber: receipt.receiptNumber,
                receiptDate: receiptDate.toISOString(),
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
              });
            }

            return inRange;
          } else if (dateFilter.start) {
            const startDate = dateFilter.start.toDate();
            return receiptDate >= startDate;
          } else if (dateFilter.end) {
            const endDate = dateFilter.end.toDate();
            return receiptDate <= endDate;
          }
          return true;
        });
      }

      setReceipts(filteredData);
      console.log(
        `📦 Loaded receipts (${dateRange}):`,
        filteredData.length,
        `out of ${data.length} total`
      );

      // Show warning if no results
      if (filteredData.length === 0 && data.length > 0) {
        toast.info(
          `No receipts found for the selected date range. Total receipts available: ${data.length}`
        );
      }
    } catch (error) {
      console.error("Error loading receipts:", error);
      toast.error("Failed to load receipts");
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    // This will be called after receipts are loaded
    // We'll fetch employees on-demand when needed
  };

  // Fetch employee details on-demand
  const fetchEmployeeDetails = async (employeeId) => {
    if (!employeeId || employees[employeeId]) {
      return; // Already loaded or no ID
    }

    try {
      const employee = await loyverseService.getEmployee(employeeId);
      setEmployees((prev) => ({
        ...prev,
        [employeeId]: employee,
      }));
    } catch (error) {
      console.error(`Error loading employee ${employeeId}:`, error);
      // Set a placeholder to avoid repeated failed requests
      setEmployees((prev) => ({
        ...prev,
        [employeeId]: { name: null },
      }));
    }
  };

  // Load unique employee IDs from visible receipts
  useEffect(() => {
    const visibleReceipts = paginatedReceipts || [];
    const uniqueEmployeeIds = [
      ...new Set(
        visibleReceipts
          .map((r) => r.employeeId)
          .filter((id) => id && !employees[id])
      ),
    ];

    uniqueEmployeeIds.forEach((employeeId) => {
      fetchEmployeeDetails(employeeId);
    });
  }, [receipts, currentPage]);

  // Complex filtering logic
  const filteredReceipts = receipts.filter((r) => {
    // Search filter (receipt number, customer ID, employee ID, source)
    const searchMatch =
      !searchQuery ||
      r.receiptNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.customerId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.source?.toLowerCase().includes(searchQuery.toLowerCase());

    // Receipt type filter
    const typeMatch =
      receiptTypeFilter === "all" || r.receiptType === receiptTypeFilter;

    // Source filter
    const sourceMatch = sourceFilter === "all" || r.source === sourceFilter;

    // Amount range filter
    const minAmountMatch = !minAmount || r.totalMoney >= parseFloat(minAmount);
    const maxAmountMatch = !maxAmount || r.totalMoney <= parseFloat(maxAmount);

    return (
      searchMatch &&
      typeMatch &&
      sourceMatch &&
      minAmountMatch &&
      maxAmountMatch
    );
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReceipts = filteredReceipts.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, receiptTypeFilter, sourceFilter, minAmount, maxAmount]);

  // Get unique sources for filter dropdown
  const uniqueSources = [
    ...new Set(receipts.map((r) => r.source).filter(Boolean)),
  ];

  const getReceiptTypeColor = (type) => {
    switch (type?.toUpperCase()) {
      case "SALE":
        return "bg-green-100 text-green-800";
      case "REFUND":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Calculate stats
  const totalSales = filteredReceipts
    .filter((r) => r.receiptType === "SALE")
    .reduce((sum, r) => sum + (r.totalMoney || 0), 0);
  const totalRefunds = filteredReceipts
    .filter((r) => r.receiptType === "REFUND")
    .reduce((sum, r) => sum + (r.totalMoney || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Orders & Receipts</h1>
        <p className="text-gray-500 mt-2">
          View all sales and receipts from Loyverse
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Receipts</p>
                <p className="text-2xl font-bold">{filteredReceipts.length}</p>
              </div>
              <Receipt className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Sales</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalSales)}
                </p>
              </div>
              <ShoppingCart className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Refunds</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalRefunds)}
                </p>
              </div>
              <Receipt className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Range Selection */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Quick Date Range Tabs */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Quick Date Range
            </label>
            <Tabs
              value={dateRange}
              onValueChange={setDateRange}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="yesterday">Yesterday</TabsTrigger>
                <TabsTrigger value="this_week">This Week</TabsTrigger>
                <TabsTrigger value="last_week">Last Week</TabsTrigger>
                <TabsTrigger value="this_month">This Month</TabsTrigger>
                <TabsTrigger value="last_month">Last Month</TabsTrigger>
                <TabsTrigger value="custom">Custom</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Custom Date Range Picker */}
          {dateRange === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  max={customEndDate || new Date().toISOString().split("T")[0]}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  End Date
                </label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  min={customStartDate}
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full"
                />
              </div>
              {customStartDate && customEndDate && (
                <div className="md:col-span-2 text-sm text-blue-700 bg-white p-2 rounded border border-blue-200">
                  📅 Showing receipts from{" "}
                  {new Date(customStartDate).toLocaleDateString()} to{" "}
                  {new Date(customEndDate).toLocaleDateString()}
                </div>
              )}
            </div>
          )}

          {/* Date Range Info */}
          {dateRange !== "custom" && dateRange !== "all" && (
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              📅 <strong>Showing:</strong>{" "}
              {dateRange === "today"
                ? "Today's receipts"
                : dateRange === "yesterday"
                ? "Yesterday's receipts"
                : dateRange === "this_week"
                ? "This week's receipts (Sunday - Today)"
                : dateRange === "last_week"
                ? "Last week's receipts (Sunday - Saturday)"
                : dateRange === "this_month"
                ? "This month's receipts"
                : dateRange === "last_month"
                ? "Last month's receipts"
                : ""}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by receipt #, customer, employee, source..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              {/* Receipt Type Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Receipt Type
                </label>
                <select
                  value={receiptTypeFilter}
                  onChange={(e) => setReceiptTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="SALE">Sale</option>
                  <option value="REFUND">Refund</option>
                </select>
              </div>

              {/* Source Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Source
                </label>
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">All Sources</option>
                  {uniqueSources.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>

              {/* Min Amount */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Min Amount (฿)
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="text-sm"
                />
              </div>

              {/* Max Amount */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Max Amount (฿)
                </label>
                <Input
                  type="number"
                  placeholder="∞"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="text-sm"
                />
              </div>

              {/* Clear Filters */}
              <div className="md:col-span-4 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReceiptTypeFilter("all");
                    setSourceFilter("all");
                    setMinAmount("");
                    setMaxAmount("");
                    setSearchQuery("");
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear All Filters
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipts List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading receipts...</p>
        </div>
      ) : filteredReceipts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No receipts found</p>
            <p className="text-sm text-gray-400 mt-2">
              Sync receipts from Loyverse in the Integration page
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Receipts ({filteredReceipts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paginatedReceipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          Receipt #{receipt.receiptNumber}
                        </h3>
                        <Badge
                          className={getReceiptTypeColor(receipt.receiptType)}
                        >
                          {receipt.receiptType || "SALE"}
                        </Badge>
                        {receipt.cancelledAt && (
                          <Badge variant="destructive">Cancelled</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {receipt.receiptDate
                          ? new Date(receipt.receiptDate).toLocaleString()
                          : "N/A"}
                      </p>
                      {receipt.source && (
                        <p className="text-xs text-gray-400">
                          Source: {receipt.source}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(receipt.totalMoney || 0)}
                      </p>
                      {receipt.totalDiscount > 0 && (
                        <p className="text-sm text-orange-600">
                          Discount: {formatCurrency(receipt.totalDiscount)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Line Items */}
                  {receipt.lineItems && receipt.lineItems.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Items ({receipt.lineItems.length}):
                      </p>
                      <div className="space-y-2">
                        {receipt.lineItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between text-sm bg-gray-50 p-2 rounded"
                          >
                            <div className="flex-1">
                              <span className="text-gray-900 font-medium">
                                {item.quantity}x {item.item_name}
                              </span>
                              {item.variant_name && (
                                <span className="text-gray-500 ml-2">
                                  ({item.variant_name})
                                </span>
                              )}
                              {item.sku && (
                                <span className="text-xs text-gray-400 ml-2">
                                  SKU: {item.sku}
                                </span>
                              )}
                            </div>
                            <span className="text-gray-900 font-medium">
                              {formatCurrency(item.total_money || 0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Receipt Details */}
                  <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm text-gray-600">
                    <div className="flex gap-4">
                      {receipt.payments && receipt.payments.length > 0 && (
                        <span>
                          Payment:{" "}
                          {receipt.payments
                            .map(
                              (p) => p.name || p.payment_type?.name || "Cash"
                            )
                            .join(", ")}
                        </span>
                      )}
                      {receipt.employeeId && (
                        <span>
                          Employee:{" "}
                          {employees[receipt.employeeId]?.name ||
                            receipt.employeeId.slice(0, 8) + "..."}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4">
                      {receipt.storeId && (
                        <span className="text-xs">
                          Store: {receipt.storeId}
                        </span>
                      )}
                      {receipt.receiptDate && (
                        <span>
                          {new Date(receipt.receiptDate).toLocaleString()}
                        </span>
                      )}
                      {!receipt.receiptDate && receipt.createdAt && (
                        <span>
                          {receipt.createdAt?.toDate
                            ? receipt.createdAt.toDate().toLocaleString()
                            : new Date(receipt.createdAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {filteredReceipts.length > itemsPerPage && (
              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to{" "}
                  {Math.min(endIndex, filteredReceipts.length)} of{" "}
                  {filteredReceipts.length} receipts
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (page) =>
                          page === 1 ||
                          page === totalPages ||
                          Math.abs(page - currentPage) <= 1
                      )
                      .map((page, idx, arr) => (
                        <div key={page} className="flex items-center">
                          {idx > 0 && arr[idx - 1] !== page - 1 && (
                            <span className="px-2 text-gray-400">...</span>
                          )}
                          <Button
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="min-w-[2.5rem]"
                          >
                            {page}
                          </Button>
                        </div>
                      ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
