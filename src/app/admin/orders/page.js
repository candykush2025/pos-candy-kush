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
  ShoppingCart,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  Edit2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { toast } from "sonner";

export default function AdminOrders() {
  const [receipts, setReceipts] = useState([]);
  const [employees, setEmployees] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [selectedReceiptForEdit, setSelectedReceiptForEdit] = useState(null);
  const [editedPaymentMethod, setEditedPaymentMethod] = useState("");
  const [pendingRequests, setPendingRequests] = useState([]);

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
    loadPendingRequests();
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

  const loadPendingRequests = async () => {
    try {
      const requests = await receiptsService.getEditRequests({
        orderBy: ["requestedAt", "desc"],
      });
      // Filter only pending requests
      const pending = requests.filter((r) => r.status === "pending");
      setPendingRequests(pending);
    } catch (error) {
      console.error("Error loading pending requests:", error);
    }
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

  // Handle approve payment change
  const handleApprovePaymentChange = async (receipt) => {
    if (!receipt.pendingPaymentChange) return;

    try {
      const newPaymentMethod = receipt.pendingPaymentChange.newMethod;
      const existingHistory = receipt.paymentHistory || [];

      await receiptsService.update(receipt.id, {
        payments: [
          {
            name: newPaymentMethod,
            amount: receipt.totalMoney || receipt.total_money || 0,
            type: newPaymentMethod.toLowerCase(),
          },
        ],
        paymentHistory: [
          ...existingHistory,
          {
            oldMethod: receipt.pendingPaymentChange.oldMethod,
            newMethod: newPaymentMethod,
            changedAt: new Date().toISOString(),
            changedBy: receipt.pendingPaymentChange.requestedByName,
            approvedBy: "admin",
            status: "approved",
          },
        ],
        hasPendingPaymentChange: false,
        pendingPaymentChange: null,
      });

      // Update the edit request status
      if (receipt.pendingPaymentChange.requestId) {
        await receiptsService.updateEditRequest(
          receipt.pendingPaymentChange.requestId,
          {
            status: "approved",
            approvedAt: new Date().toISOString(),
            approvedBy: "admin",
          }
        );
      }

      toast.success("Payment method change approved");
      loadReceipts();
      loadPendingRequests();
    } catch (error) {
      console.error("Error approving payment change:", error);
      toast.error("Failed to approve payment change");
    }
  };

  // Handle decline payment change
  const handleDeclinePaymentChange = async (receipt) => {
    if (!receipt.pendingPaymentChange) return;

    try {
      await receiptsService.update(receipt.id, {
        hasPendingPaymentChange: false,
        pendingPaymentChange: null,
      });

      // Update the edit request status
      if (receipt.pendingPaymentChange.requestId) {
        await receiptsService.updateEditRequest(
          receipt.pendingPaymentChange.requestId,
          {
            status: "declined",
            declinedAt: new Date().toISOString(),
            declinedBy: "admin",
          }
        );
      }

      toast.success("Payment method change declined");
      loadReceipts();
      loadPendingRequests();
    } catch (error) {
      console.error("Error declining payment change:", error);
      toast.error("Failed to decline payment change");
    }
  };

  // Handle edit payment change
  const handleEditPaymentChange = (receipt) => {
    setSelectedReceiptForEdit(receipt);
    setEditedPaymentMethod(receipt.pendingPaymentChange?.newMethod || "");
    setShowEditPaymentModal(true);
  };

  // Handle submit edited payment change
  const handleSubmitEditedPayment = async () => {
    if (!selectedReceiptForEdit || !editedPaymentMethod) return;

    try {
      const existingHistory = selectedReceiptForEdit.paymentHistory || [];

      await receiptsService.update(selectedReceiptForEdit.id, {
        payments: [
          {
            name: editedPaymentMethod,
            amount:
              selectedReceiptForEdit.totalMoney ||
              selectedReceiptForEdit.total_money ||
              0,
            type: editedPaymentMethod.toLowerCase(),
          },
        ],
        paymentHistory: [
          ...existingHistory,
          {
            oldMethod: selectedReceiptForEdit.pendingPaymentChange.oldMethod,
            newMethod: editedPaymentMethod,
            changedAt: new Date().toISOString(),
            changedBy:
              selectedReceiptForEdit.pendingPaymentChange.requestedByName,
            approvedBy: "admin",
            status: "approved_edited",
          },
        ],
        hasPendingPaymentChange: false,
        pendingPaymentChange: null,
      });

      // Update the edit request status
      if (selectedReceiptForEdit.pendingPaymentChange.requestId) {
        await receiptsService.updateEditRequest(
          selectedReceiptForEdit.pendingPaymentChange.requestId,
          {
            status: "approved",
            approvedAt: new Date().toISOString(),
            approvedBy: "admin",
            finalPaymentMethod: editedPaymentMethod,
          }
        );
      }

      toast.success("Payment method updated successfully");
      setShowEditPaymentModal(false);
      setSelectedReceiptForEdit(null);
      setEditedPaymentMethod("");
      loadReceipts();
      loadPendingRequests();
    } catch (error) {
      console.error("Error updating payment method:", error);
      toast.error("Failed to update payment method");
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
      receiptTypeFilter === "all" ||
      (r.receiptType || r.receipt_type) === receiptTypeFilter;

    // Source filter
    const sourceMatch = sourceFilter === "all" || r.source === sourceFilter;

    // Amount range filter
    const totalAmount = r.totalMoney || r.total_money || 0;
    const minAmountMatch = !minAmount || totalAmount >= parseFloat(minAmount);
    const maxAmountMatch = !maxAmount || totalAmount <= parseFloat(maxAmount);

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
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300";
      case "REFUND":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300";
      default:
        return "bg-neutral-100 dark:bg-gray-800 text-neutral-800 dark:text-neutral-300";
    }
  };

  // Calculate stats
  const totalSales = filteredReceipts
    .filter((r) => (r.receiptType || r.receipt_type) === "SALE")
    .reduce((sum, r) => sum + (r.totalMoney || r.total_money || 0), 0);
  const totalRefunds = filteredReceipts
    .filter((r) => (r.receiptType || r.receipt_type) === "REFUND")
    .reduce((sum, r) => sum + (r.totalMoney || r.total_money || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Orders & Receipts</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-2">
          View all sales and receipts from Loyverse
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Total Receipts
                </p>
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
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Total Sales
                </p>
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
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Total Refunds
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalRefunds)}
                </p>
              </div>
              <Receipt className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payment Change Requests */}
      {pendingRequests.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
              <Clock className="h-5 w-5" />
              Pending Payment Change Requests ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          Receipt ID: {request.receiptId}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Requested by {request.requestedByName} •{" "}
                          {formatDate(
                            new Date(request.requestedAt),
                            "datetime"
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                      >
                        {request.oldPaymentMethod}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                      >
                        {request.newPaymentMethod}
                      </Badge>
                      <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                        Amount:{" "}
                        {formatCurrency(
                          request.amount || request.originalAmount || 0
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={async () => {
                        // Find the receipt and approve
                        const receipt = receipts.find(
                          (r) => r.id === request.receiptId
                        );
                        if (receipt) {
                          await handleApprovePaymentChange({
                            ...receipt,
                            pendingPaymentChange: {
                              oldMethod: request.oldPaymentMethod,
                              newMethod: request.newPaymentMethod,
                              requestedByName: request.requestedByName,
                              requestId: request.id,
                            },
                          });
                        }
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={async () => {
                        // Find the receipt and decline
                        const receipt = receipts.find(
                          (r) => r.id === request.receiptId
                        );
                        if (receipt) {
                          await handleDeclinePaymentChange({
                            ...receipt,
                            pendingPaymentChange: {
                              requestId: request.id,
                            },
                          });
                        }
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => {
                        // Find the receipt and edit
                        const receipt = receipts.find(
                          (r) => r.id === request.receiptId
                        );
                        if (receipt) {
                          handleEditPaymentChange({
                            ...receipt,
                            pendingPaymentChange: {
                              oldMethod: request.oldPaymentMethod,
                              newMethod: request.newPaymentMethod,
                              requestedByName: request.requestedByName,
                              requestId: request.id,
                            },
                          });
                        }
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Date Range Selection */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Quick Date Range Tabs */}
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
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
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
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
                <div className="md:col-span-2 text-sm text-blue-700 dark:text-blue-400 bg-white dark:bg-blue-900/20 p-2 rounded border border-blue-200 dark:border-blue-800">
                  📅 Showing receipts from{" "}
                  {new Date(customStartDate).toLocaleDateString()} to{" "}
                  {new Date(customEndDate).toLocaleDateString()}
                </div>
              )}
            </div>
          )}

          {/* Date Range Info */}
          {dateRange !== "custom" && dateRange !== "all" && (
            <div className="text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-gray-800 p-3 rounded-lg">
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500" />
              <Input
                placeholder="Search by receipt ID, customer, employee, source..."
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-neutral-50 dark:bg-gray-800 rounded-lg">
              {/* Receipt Type Filter */}
              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
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
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
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
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
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
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
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
          <p className="text-neutral-500 dark:text-neutral-400">
            Loading receipts...
          </p>
        </div>
      ) : filteredReceipts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="h-12 w-12 text-neutral-400 dark:text-neutral-500 mx-auto mb-4" />
            <p className="text-neutral-500 dark:text-neutral-400">
              No receipts found
            </p>
            <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-2">
              Sync receipts from Loyverse in the Integration page
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Receipts ({filteredReceipts.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-gray-800 border-b dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Receipt ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-neutral-200 dark:divide-gray-700">
                  {paginatedReceipts.map((receipt) => (
                    <tr
                      key={receipt.id}
                      className="hover:bg-neutral-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      {/* Receipt Number */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-neutral-900 dark:text-white">
                          {receipt.id}
                        </div>
                        {receipt.receiptNumber && (
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            #{receipt.receiptNumber}
                          </div>
                        )}
                        {receipt.source && (
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            {receipt.source}
                          </div>
                        )}
                      </td>

                      {/* Date & Time */}
                      <td className="px-4 py-3">
                        <div className="text-sm text-neutral-700 dark:text-neutral-300">
                          {receipt.receiptDate
                            ? new Date(receipt.receiptDate).toLocaleDateString()
                            : receipt.createdAt?.toDate
                            ? receipt.createdAt.toDate().toLocaleDateString()
                            : "N/A"}
                        </div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          {receipt.receiptDate
                            ? new Date(receipt.receiptDate).toLocaleTimeString()
                            : receipt.createdAt?.toDate
                            ? receipt.createdAt.toDate().toLocaleTimeString()
                            : ""}
                        </div>
                      </td>

                      {/* Items */}
                      <td className="px-4 py-3">
                        <div className="max-w-xs">
                          {(receipt.lineItems || receipt.line_items) &&
                          (receipt.lineItems || receipt.line_items).length >
                            0 ? (
                            <div className="space-y-1">
                              {(receipt.lineItems || receipt.line_items)
                                .slice(0, 2)
                                .map((item, idx) => (
                                  <div key={idx} className="text-sm">
                                    <span className="font-medium text-neutral-900 dark:text-white">
                                      {item.quantity}x
                                    </span>{" "}
                                    <span className="text-neutral-700 dark:text-neutral-300">
                                      {item.item_name}
                                    </span>
                                    {item.sku && (
                                      <span className="text-xs text-neutral-400 dark:text-neutral-500 ml-1">
                                        ({item.sku})
                                      </span>
                                    )}
                                  </div>
                                ))}
                              {(receipt.lineItems || receipt.line_items)
                                .length > 2 && (
                                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                  +
                                  {(receipt.lineItems || receipt.line_items)
                                    .length - 2}{" "}
                                  more items
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-neutral-500 dark:text-neutral-400">
                              No items
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Payment Method */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {/* Current Payment Method */}
                          <div className="text-sm text-neutral-700 dark:text-neutral-300">
                            {receipt.paymentHistory &&
                            receipt.paymentHistory.length > 0 ? (
                              <div className="space-y-1">
                                {/* Old payment with strikethrough */}
                                <div className="line-through text-neutral-400 dark:text-neutral-500">
                                  {
                                    receipt.paymentHistory[
                                      receipt.paymentHistory.length - 1
                                    ].oldMethod
                                  }
                                </div>
                                {/* New payment */}
                                <div className="font-semibold text-green-600 dark:text-green-500">
                                  {receipt.payments &&
                                  receipt.payments.length > 0
                                    ? receipt.payments
                                        .map(
                                          (p) =>
                                            p.name ||
                                            p.payment_type?.name ||
                                            "Cash"
                                        )
                                        .join(", ")
                                    : "N/A"}
                                  <Badge
                                    variant="secondary"
                                    className="ml-2 text-xs bg-green-100 text-green-800"
                                  >
                                    Changed
                                  </Badge>
                                </div>
                              </div>
                            ) : receipt.hasPendingPaymentChange ? (
                              <div className="space-y-1">
                                <div>
                                  {receipt.payments &&
                                  receipt.payments.length > 0
                                    ? receipt.payments
                                        .map(
                                          (p) =>
                                            p.name ||
                                            p.payment_type?.name ||
                                            "Cash"
                                        )
                                        .join(", ")
                                    : receipt.paymentMethod ||
                                      receipt.paymentTypeName ||
                                      "N/A"}
                                </div>
                                {/* Show pending change info */}
                                {receipt.pendingPaymentChange && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <Badge
                                      variant="secondary"
                                      className="bg-yellow-100 text-yellow-800"
                                    >
                                      {receipt.pendingPaymentChange.oldMethod} →{" "}
                                      {receipt.pendingPaymentChange.newMethod}
                                    </Badge>
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 text-xs text-green-600 hover:text-green-700"
                                        onClick={() =>
                                          handleApprovePaymentChange(receipt)
                                        }
                                      >
                                        Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                                        onClick={() =>
                                          handleDeclinePaymentChange(receipt)
                                        }
                                      >
                                        Decline
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                                        onClick={() =>
                                          handleEditPaymentChange(receipt)
                                        }
                                      >
                                        Edit
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : receipt.payments &&
                              receipt.payments.length > 0 ? (
                              receipt.payments
                                .map(
                                  (p) =>
                                    p.name || p.payment_type?.name || "Cash"
                                )
                                .join(", ")
                            ) : (
                              receipt.paymentMethod ||
                              receipt.paymentTypeName ||
                              "N/A"
                            )}
                          </div>
                          {(receipt.totalDiscount || receipt.total_discount) >
                            0 && (
                            <div className="text-xs text-orange-600 dark:text-orange-400">
                              Discount:{" "}
                              {formatCurrency(
                                receipt.totalDiscount || receipt.total_discount
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Employee */}
                      <td className="px-4 py-3">
                        <div className="text-sm text-neutral-700 dark:text-neutral-300">
                          {receipt.cashierName ||
                            (receipt.employeeId
                              ? employees[receipt.employeeId]?.name ||
                                receipt.employeeId.slice(0, 8) + "..."
                              : receipt.cashierId
                              ? employees[receipt.cashierId]?.name ||
                                receipt.cashierId.slice(0, 8) + "..."
                              : "N/A")}
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="px-4 py-3 text-right">
                        <div className="text-lg font-bold text-green-600 dark:text-green-500">
                          {formatCurrency(
                            receipt.totalMoney || receipt.total_money || 0
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Badge
                            className={getReceiptTypeColor(
                              receipt.receiptType || receipt.receipt_type
                            )}
                          >
                            {receipt.receiptType ||
                              receipt.receipt_type ||
                              "SALE"}
                          </Badge>
                          {receipt.cancelledAt && (
                            <Badge variant="destructive" className="text-xs">
                              Cancelled
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredReceipts.length > itemsPerPage && (
              <div className="mt-6 px-4 pb-4 flex items-center justify-between border-t pt-4">
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
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
                            <span className="px-2 text-neutral-400">...</span>
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

      {/* Edit Payment Method Modal */}
      <Dialog
        open={showEditPaymentModal}
        onOpenChange={setShowEditPaymentModal}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payment Method</DialogTitle>
            <DialogDescription>
              Change the payment method for this receipt
            </DialogDescription>
          </DialogHeader>
          {selectedReceiptForEdit && (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Receipt ID
                  </span>
                  <span className="font-mono font-semibold">
                    {selectedReceiptForEdit.receiptNumber ||
                      selectedReceiptForEdit.id}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Amount
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(
                      selectedReceiptForEdit.totalMoney ||
                        selectedReceiptForEdit.total_money ||
                        0
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <span className="text-gray-600">Original:</span>
                  <span className="font-semibold">
                    {selectedReceiptForEdit.pendingPaymentChange?.oldMethod}
                  </span>
                  <ArrowRight className="h-4 w-4 text-blue-600" />
                  <span className="text-gray-600">Requested:</span>
                  <span className="font-semibold text-blue-600">
                    {selectedReceiptForEdit.pendingPaymentChange?.newMethod}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Select Payment Method
                </label>
                <Select
                  value={editedPaymentMethod}
                  onValueChange={setEditedPaymentMethod}
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
                <p className="text-xs text-gray-500 mt-2">
                  You can approve a different payment method than requested
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditPaymentModal(false);
                    setSelectedReceiptForEdit(null);
                    setEditedPaymentMethod("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitEditedPayment}
                  className="flex-1"
                  disabled={!editedPaymentMethod}
                >
                  Approve with Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
