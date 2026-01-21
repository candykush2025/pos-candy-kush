"use client";

import { useState, useEffect } from "react";
import { receiptsService } from "@/lib/firebase/firestore";
import { loyverseService } from "@/lib/api/loyverse";
import { shiftsService } from "@/lib/firebase/shiftsService";
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
  DialogFooter,
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
  X,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  Edit2,
  Calendar,
  Loader2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { toast } from "sonner";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

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
  const [pendingRefundRequests, setPendingRefundRequests] = useState([]);
  const [processingRequestId, setProcessingRequestId] = useState(null); // Track which request is being processed
  const [editPaymentLoading, setEditPaymentLoading] = useState(false); // Loading state for edit payment

  // Filter states
  const [dateRange, setDateRange] = useState("today"); // today, yesterday, this_week, last_week, this_month, last_month, custom, all
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [receiptTypeFilter, setReceiptTypeFilter] = useState("all"); // all, SALE, REFUND
  const [sourceFilter, setSourceFilter] = useState("all"); // all, point of sale, etc.
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("all"); // all, Cash, Card, Transfer, Crypto
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  // Date picker modal state
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [tempDateRange, setTempDateRange] = useState([null, null]);

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
          0,
        );
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
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
          0,
        );
        endDate = new Date(
          yesterday.getFullYear(),
          yesterday.getMonth(),
          yesterday.getDate(),
          23,
          59,
          59,
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
          0,
        );
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
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
          0,
        );
        endDate = new Date(
          lastWeekEnd.getFullYear(),
          lastWeekEnd.getMonth(),
          lastWeekEnd.getDate(),
          23,
          59,
          59,
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
          59,
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
          0,
        ).getDate();
        endDate = new Date(
          lastMonthYear,
          actualLastMonth,
          lastDayOfLastMonth,
          23,
          59,
          59,
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
          0,
        );
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
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
          `No receipts found for the selected date range. Total receipts available: ${data.length}`,
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
      // Split pending requests by type
      const paymentChangePending = pending.filter((r) => r.type !== "refund");
      const refundPending = pending.filter((r) => r.type === "refund");
      setPendingRequests(paymentChangePending);
      setPendingRefundRequests(refundPending);
    } catch (error) {
      console.error("Error loading pending requests:", error);
    }
  };

  // Approve refund request
  const handleApproveRefund = async (request) => {
    if (!request) return;
    try {
      const receiptId = request.receiptId;
      const actualReceipt = await receiptsService.get(receiptId);
      if (!actualReceipt) {
        toast.error("Receipt not found");
        return;
      }

      // Mark the receipt as refunded
      const existingHistory = actualReceipt.paymentHistory || [];
      await receiptsService.update(receiptId, {
        isRefunded: true,
        refund: true,
        refundAmount: request.amount || request.originalAmount || 0,
        refundApprovedBy: "admin",
        refundedAt: new Date().toISOString(),
        paymentHistory: [
          ...existingHistory,
          {
            type: "refund",
            amount: request.amount || request.originalAmount || 0,
            requestedBy: request.requestedByName,
            approvedBy: "admin",
            refundedAt: new Date().toISOString(),
            status: "refunded",
          },
        ],
      });

      // Update the edit request status
      if (request.id) {
        await receiptsService.updateEditRequest(request.id, {
          status: "refunded",
          refundedAt: new Date().toISOString(),
          refundedBy: "admin",
        });
      }

      toast.success("Refund approved");
      loadReceipts();
      loadPendingRequests();
    } catch (error) {
      console.error("Error approving refund:", error);
      toast.error("Failed to approve refund");
    }
  };

  // Decline refund request
  const handleDeclineRefund = async (request) => {
    if (!request) return;
    try {
      if (request.id) {
        await receiptsService.updateEditRequest(request.id, {
          status: "declined",
          declinedAt: new Date().toISOString(),
          declinedBy: "admin",
        });
      }
      toast.success("Refund request declined");
      loadPendingRequests();
    } catch (error) {
      console.error("Error declining refund request:", error);
      toast.error("Failed to decline refund request");
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
  const handleApprovePaymentChange = async (receipt, request = null) => {
    // If no pendingPaymentChange on receipt, use the request data directly
    const changeData = receipt?.pendingPaymentChange || request;
    if (!changeData) return;

    try {
      const newPaymentMethod =
        changeData.newMethod || changeData.newPaymentMethod;
      const receiptId = receipt?.id || request?.receiptId;

      // Fetch the actual receipt to get the latest data
      const actualReceipt = await receiptsService.get(receiptId);
      if (!actualReceipt) {
        toast.error("Receipt not found");
        return;
      }

      const existingHistory = actualReceipt.paymentHistory || [];

      await receiptsService.update(receiptId, {
        payments: [
          {
            name: newPaymentMethod,
            amount: actualReceipt.totalMoney || actualReceipt.total_money || 0,
            type: newPaymentMethod.toLowerCase(),
          },
        ],
        paymentHistory: [
          ...existingHistory,
          {
            oldMethod: changeData.oldMethod || changeData.oldPaymentMethod,
            newMethod: newPaymentMethod,
            changedAt: new Date().toISOString(),
            changedBy: changeData.requestedByName,
            approvedBy: "admin",
            status: "approved",
          },
        ],
        hasPendingPaymentChange: false,
        pendingPaymentChange: null,
      });

      // Update the edit request status
      const requestId = changeData.requestId || request?.id;
      if (requestId) {
        await receiptsService.updateEditRequest(requestId, {
          status: "approved",
          approvedAt: new Date().toISOString(),
          approvedBy: "admin",
        });
      }

      // Find and recalculate the shift that contains this receipt
      try {
        const orderNumber =
          actualReceipt.orderNumber ||
          actualReceipt.receipt_number ||
          actualReceipt.order;
        if (orderNumber) {
          console.log(`Looking for shift containing order: ${orderNumber}`);

          // Get all shifts (or filter by date range if needed for performance)
          const receiptDate =
            actualReceipt.receipt_date?.toDate?.() ||
            (actualReceipt.receipt_date
              ? new Date(actualReceipt.receipt_date)
              : null) ||
            actualReceipt.createdAt?.toDate?.() ||
            (actualReceipt.createdAt
              ? new Date(actualReceipt.createdAt)
              : null) ||
            new Date();

          // Search for shifts around the receipt date (±7 days for safety)
          const startDate = new Date(receiptDate);
          startDate.setDate(startDate.getDate() - 7);
          const endDate = new Date(receiptDate);
          endDate.setDate(endDate.getDate() + 7);

          const shifts = await shiftsService.getByDateRange(startDate, endDate);

          // Find the shift that contains this transaction
          const matchingShift = shifts.find(
            (shift) =>
              shift.transactions && shift.transactions.includes(orderNumber),
          );

          if (matchingShift) {
            console.log(`Found shift ${matchingShift.id}, recalculating...`);
            await shiftsService.recalculateShift(matchingShift.id);
            console.log(`Shift ${matchingShift.id} recalculated successfully`);
            toast.success(
              "Payment method change approved and shift recalculated",
            );
          } else {
            console.log(`No shift found containing order ${orderNumber}`);
            toast.success("Payment method change approved");
          }
        } else {
          toast.success("Payment method change approved");
        }
      } catch (shiftError) {
        console.error("Error recalculating shift:", shiftError);
        // Don't fail the approval if shift recalculation fails
        toast.success(
          "Payment method change approved (shift recalculation pending)",
        );
      }

      loadReceipts();
      loadPendingRequests();
    } catch (error) {
      console.error("Error approving payment change:", error);
      toast.error("Failed to approve payment change");
    }
  };

  // Handle decline payment change
  const handleDeclinePaymentChange = async (receipt, request = null) => {
    const changeData = receipt?.pendingPaymentChange || request;
    if (!changeData) return;

    try {
      const receiptId = receipt?.id || request?.receiptId;

      await receiptsService.update(receiptId, {
        hasPendingPaymentChange: false,
        pendingPaymentChange: null,
      });

      // Update the edit request status
      const requestId = changeData.requestId || request?.id;
      if (requestId) {
        await receiptsService.updateEditRequest(requestId, {
          status: "declined",
          declinedAt: new Date().toISOString(),
          declinedBy: "admin",
        });
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
    if (editPaymentLoading) return; // Prevent double-click

    try {
      setEditPaymentLoading(true);
      // Fetch the actual receipt to get the latest data
      const actualReceipt = await receiptsService.get(
        selectedReceiptForEdit.id,
      );
      if (!actualReceipt) {
        toast.error("Receipt not found");
        return;
      }

      const existingHistory = actualReceipt.paymentHistory || [];
      const pendingChange = selectedReceiptForEdit.pendingPaymentChange;

      await receiptsService.update(selectedReceiptForEdit.id, {
        payments: [
          {
            name: editedPaymentMethod,
            amount: actualReceipt.totalMoney || actualReceipt.total_money || 0,
            type: editedPaymentMethod.toLowerCase(),
          },
        ],
        paymentHistory: [
          ...existingHistory,
          {
            oldMethod: pendingChange?.oldMethod || "Unknown",
            newMethod: editedPaymentMethod,
            changedAt: new Date().toISOString(),
            changedBy: pendingChange?.requestedByName || "Unknown",
            approvedBy: "admin",
            status: "approved_edited",
          },
        ],
        hasPendingPaymentChange: false,
        pendingPaymentChange: null,
      });

      // Update the edit request status
      if (pendingChange?.requestId) {
        await receiptsService.updateEditRequest(pendingChange.requestId, {
          status: "approved",
          approvedAt: new Date().toISOString(),
          approvedBy: "admin",
          finalPaymentMethod: editedPaymentMethod,
        });
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
    } finally {
      setEditPaymentLoading(false);
    }
  };

  // Load unique employee IDs from visible receipts
  useEffect(() => {
    const visibleReceipts = paginatedReceipts || [];
    const uniqueEmployeeIds = [
      ...new Set(
        visibleReceipts
          .map((r) => r.employeeId)
          .filter((id) => id && !employees[id]),
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

    // Determine effective receipt type (treat receipts flagged as refunded as REFUND)
    const effectiveType = (() => {
      const total = r.totalMoney || r.total_money || 0;
      const baseType = (r.receiptType || r.receipt_type || "")
        .toString()
        .toUpperCase();
      const isRefundFlag = r.refund || r.isRefunded || total < 0;
      if (isRefundFlag) return "REFUND";
      if (baseType) return baseType;
      return "SALE";
    })();

    // Receipt type filter: support selecting REFUND even if receipt_type === 'SALE' but flagged as refund
    const typeMatch =
      receiptTypeFilter === "all" || effectiveType === receiptTypeFilter;

    // Source filter
    const sourceMatch = sourceFilter === "all" || r.source === sourceFilter;

    // Payment type filter
    const getPaymentMethod = (receipt) => {
      if (receipt.payments && receipt.payments.length > 0) {
        return (
          receipt.payments[0].name ||
          receipt.payments[0].payment_type?.name ||
          "Cash"
        );
      }
      return receipt.paymentMethod || receipt.paymentTypeName || "Cash";
    };
    const receiptPaymentMethod = getPaymentMethod(r);

    // Normalize payment method for comparison (handle Transfer/Bank Transfer variations)
    const normalizePaymentMethod = (method) => {
      const lowerMethod = method.toLowerCase();
      if (lowerMethod.includes("transfer") || lowerMethod.includes("bank")) {
        return "transfer";
      }
      return lowerMethod;
    };

    const paymentMatch =
      paymentTypeFilter === "all" ||
      normalizePaymentMethod(receiptPaymentMethod) ===
        normalizePaymentMethod(paymentTypeFilter);

    // Amount range filter
    const totalAmount = r.totalMoney || r.total_money || 0;
    const minAmountMatch = !minAmount || totalAmount >= parseFloat(minAmount);
    const maxAmountMatch = !maxAmount || totalAmount <= parseFloat(maxAmount);

    return (
      searchMatch &&
      typeMatch &&
      sourceMatch &&
      paymentMatch &&
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
  }, [
    searchQuery,
    receiptTypeFilter,
    sourceFilter,
    paymentTypeFilter,
    minAmount,
    maxAmount,
  ]);

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

  const getEffectiveReceiptType = (r) => {
    const total = r.totalMoney || r.total_money || 0;
    if (r.refund || r.isRefunded || total < 0) return "REFUND";
    const baseType = (r.receiptType || r.receipt_type || "")
      .toString()
      .toUpperCase();
    return baseType || "SALE";
  };

  // Helper to detect refunded receipts
  const isRefundReceipt = (r) => {
    const total = r.totalMoney || r.total_money || 0;
    return (
      r.refund ||
      r.isRefunded ||
      total < 0 ||
      (r.receiptType || r.receipt_type) === "REFUND"
    );
  };

  // Calculate stats
  const totalSales = filteredReceipts
    .filter(
      (r) =>
        !isRefundReceipt(r) &&
        (r.receiptType || r.receipt_type || "").toUpperCase() === "SALE",
    )
    .reduce((sum, r) => sum + (r.totalMoney || r.total_money || 0), 0);
  const totalRefunds = filteredReceipts
    .filter((r) => isRefundReceipt(r))
    .reduce((sum, r) => sum + Math.abs(r.totalMoney || r.total_money || 0), 0);

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
                            "datetime",
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
                          request.amount || request.originalAmount || 0,
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      disabled={processingRequestId === request.id}
                      onClick={async () => {
                        setProcessingRequestId(request.id);
                        try {
                          await handleApprovePaymentChange(null, request);
                        } finally {
                          setProcessingRequestId(null);
                        }
                      }}
                    >
                      {processingRequestId === request.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-1" />
                      )}
                      {processingRequestId === request.id
                        ? "Processing..."
                        : "Approve"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={processingRequestId === request.id}
                      onClick={async () => {
                        setProcessingRequestId(request.id);
                        try {
                          await handleDeclinePaymentChange(null, request);
                        } finally {
                          setProcessingRequestId(null);
                        }
                      }}
                    >
                      {processingRequestId === request.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-1" />
                      )}
                      {processingRequestId === request.id
                        ? "Processing..."
                        : "Decline"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      disabled={processingRequestId === request.id}
                      onClick={() => {
                        // For edit, we need the receipt for the amount display
                        handleEditPaymentChange({
                          id: request.receiptId,
                          receiptNumber: request.receiptNumber,
                          totalMoney:
                            request.amount || request.originalAmount || 0,
                          pendingPaymentChange: {
                            oldMethod: request.oldPaymentMethod,
                            newMethod: request.newPaymentMethod,
                            requestedByName: request.requestedByName,
                            requestId: request.id,
                          },
                        });
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

      {/* Pending Refund Requests */}
      {pendingRefundRequests.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-300">
              <Clock className="h-5 w-5" />
              Pending Refund Requests ({pendingRefundRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRefundRequests.map((request) => (
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
                            "datetime",
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                        Amount:{" "}
                        {formatCurrency(
                          request.amount || request.originalAmount || 0,
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      disabled={processingRequestId === request.id}
                      onClick={async () => {
                        setProcessingRequestId(request.id);
                        try {
                          await handleApproveRefund(request);
                        } finally {
                          setProcessingRequestId(null);
                        }
                      }}
                    >
                      {processingRequestId === request.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-1" />
                      )}
                      {processingRequestId === request.id
                        ? "Processing..."
                        : "Approve"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={processingRequestId === request.id}
                      onClick={async () => {
                        setProcessingRequestId(request.id);
                        try {
                          await handleDeclineRefund(request);
                        } finally {
                          setProcessingRequestId(null);
                        }
                      }}
                    >
                      {processingRequestId === request.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-1" />
                      )}
                      {processingRequestId === request.id
                        ? "Processing..."
                        : "Decline"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unified Search & Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Search Bar Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500" />
              <Input
                placeholder="Search by receipt ID, customer, employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Quick Date Range Dropdown for Mobile / Tabs for Desktop */}
            <div className="hidden lg:block">
              <Tabs
                value={dateRange}
                onValueChange={(value) => {
                  if (value === "custom") {
                    // Open date picker modal immediately
                    setTempDateRange([
                      customStartDate ? new Date(customStartDate) : null,
                      customEndDate ? new Date(customEndDate) : null,
                    ]);
                    setShowDatePickerModal(true);
                  } else {
                    setDateRange(value);
                    // Clear custom dates when switching to other options
                    setCustomStartDate("");
                    setCustomEndDate("");
                  }
                }}
                className="w-auto"
              >
                <TabsList className="grid grid-cols-8 h-9">
                  <TabsTrigger value="today" className="text-xs px-2">
                    Today
                  </TabsTrigger>
                  <TabsTrigger value="yesterday" className="text-xs px-2">
                    Yesterday
                  </TabsTrigger>
                  <TabsTrigger value="this_week" className="text-xs px-2">
                    This Week
                  </TabsTrigger>
                  <TabsTrigger value="last_week" className="text-xs px-2">
                    Last Week
                  </TabsTrigger>
                  <TabsTrigger value="this_month" className="text-xs px-2">
                    This Month
                  </TabsTrigger>
                  <TabsTrigger value="last_month" className="text-xs px-2">
                    Last Month
                  </TabsTrigger>
                  <TabsTrigger
                    value="custom"
                    className="text-xs px-2"
                    onClick={() => {
                      // Always open modal when clicking custom tab (even if already selected)
                      if (dateRange === "custom") {
                        setTempDateRange([
                          customStartDate ? new Date(customStartDate) : null,
                          customEndDate ? new Date(customEndDate) : null,
                        ]);
                        setShowDatePickerModal(true);
                      }
                    }}
                  >
                    {dateRange === "custom" &&
                    customStartDate &&
                    customEndDate ? (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {customStartDate === customEndDate ? (
                          // Single day selected
                          new Date(customStartDate).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                            },
                          )
                        ) : (
                          // Date range selected
                          <>
                            {new Date(customStartDate).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                              },
                            )}
                            {" - "}
                            {new Date(customEndDate).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </>
                        )}
                      </span>
                    ) : (
                      "Custom"
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="all" className="text-xs px-2">
                    All
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Mobile Date Range Select */}
            <div className="lg:hidden flex gap-2">
              <select
                value={dateRange}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "custom") {
                    setTempDateRange([
                      customStartDate ? new Date(customStartDate) : null,
                      customEndDate ? new Date(customEndDate) : null,
                    ]);
                    setShowDatePickerModal(true);
                  } else {
                    setDateRange(value);
                    setCustomStartDate("");
                    setCustomEndDate("");
                  }
                }}
                className="w-full sm:w-auto px-3 py-2 border rounded-md text-sm bg-background"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="this_week">This Week</option>
                <option value="last_week">Last Week</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="custom">
                  {dateRange === "custom" && customStartDate && customEndDate
                    ? `${new Date(customStartDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })} - ${new Date(customEndDate).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" },
                      )}`
                    : "Custom Range"}
                </option>
                <option value="all">All Time</option>
              </select>
              {/* Edit button for custom date on mobile */}
              {dateRange === "custom" && customStartDate && customEndDate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTempDateRange([
                      new Date(customStartDate),
                      new Date(customEndDate),
                    ]);
                    setShowDatePickerModal(true);
                  }}
                  className="px-2"
                >
                  <Calendar className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Filter Pills Row */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Receipt Type */}
            <select
              value={receiptTypeFilter}
              onChange={(e) => setReceiptTypeFilter(e.target.value)}
              className={`px-3 py-1.5 border rounded-full text-sm transition-colors ${
                receiptTypeFilter !== "all"
                  ? "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300"
                  : "bg-background hover:bg-neutral-100 dark:hover:bg-gray-800"
              }`}
            >
              <option value="all">All Types</option>
              <option value="SALE">🛒 Sale</option>
              <option value="REFUND">↩️ Refund</option>
            </select>

            {/* Payment Type */}
            <select
              value={paymentTypeFilter}
              onChange={(e) => setPaymentTypeFilter(e.target.value)}
              className={`px-3 py-1.5 border rounded-full text-sm transition-colors ${
                paymentTypeFilter !== "all"
                  ? "bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300"
                  : "bg-background hover:bg-neutral-100 dark:hover:bg-gray-800"
              }`}
            >
              <option value="all">All Payments</option>
              <option value="Cash">💵 Cash</option>
              <option value="Card">💳 Card</option>
              <option value="Transfer">🏦 Transfer</option>
              <option value="Crypto">₿ Crypto</option>
            </select>

            {/* Source */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className={`px-3 py-1.5 border rounded-full text-sm transition-colors ${
                sourceFilter !== "all"
                  ? "bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-300"
                  : "bg-background hover:bg-neutral-100 dark:hover:bg-gray-800"
              }`}
            >
              <option value="all">All Sources</option>
              {uniqueSources.map((source) => (
                <option key={source} value={source}>
                  📍 {source}
                </option>
              ))}
            </select>

            {/* Amount Range */}
            <div className="flex items-center gap-1 px-2 py-1 border rounded-full bg-background">
              <span className="text-xs text-neutral-500">฿</span>
              <Input
                type="number"
                placeholder="Min"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="w-16 h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent"
              />
              <span className="text-neutral-400">-</span>
              <Input
                type="number"
                placeholder="Max"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="w-16 h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent"
              />
            </div>

            {/* Clear Filters - only show when filters are active */}
            {(receiptTypeFilter !== "all" ||
              sourceFilter !== "all" ||
              paymentTypeFilter !== "all" ||
              minAmount ||
              maxAmount ||
              searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setReceiptTypeFilter("all");
                  setSourceFilter("all");
                  setPaymentTypeFilter("all");
                  setMinAmount("");
                  setMaxAmount("");
                  setSearchQuery("");
                }}
                className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}

            {/* Results Count */}
            <div className="ml-auto text-sm text-neutral-500 dark:text-neutral-400">
              {filteredReceipts.length} receipt
              {filteredReceipts.length !== 1 ? "s" : ""}
              {dateRange !== "all" && dateRange !== "custom" && (
                <span className="hidden sm:inline">
                  {" "}
                  •{" "}
                  {dateRange === "today"
                    ? "Today"
                    : dateRange === "yesterday"
                      ? "Yesterday"
                      : dateRange.replace("_", " ")}
                </span>
              )}
            </div>
          </div>
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
                                            "Cash",
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
                                            "Cash",
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
                                    p.name || p.payment_type?.name || "Cash",
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
                                receipt.totalDiscount || receipt.total_discount,
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
                            receipt.totalMoney || receipt.total_money || 0,
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Badge
                            className={getReceiptTypeColor(
                              getEffectiveReceiptType(receipt),
                            )}
                          >
                            {getEffectiveReceiptType(receipt)}
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
                          Math.abs(page - currentPage) <= 1,
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
                        0,
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
                  disabled={editPaymentLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitEditedPayment}
                  className="flex-1"
                  disabled={!editedPaymentMethod || editPaymentLoading}
                >
                  {editPaymentLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    "Approve with Changes"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Date Range Picker Modal */}
      <Dialog open={showDatePickerModal} onOpenChange={setShowDatePickerModal}>
        <DialogContent className="sm:max-w-sm p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-center">Select Date Range</DialogTitle>
            <DialogDescription className="text-center text-sm">
              Click a date twice for single day, or select start & end
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center px-0">
            <DatePicker
              selectsRange={true}
              startDate={tempDateRange[0]}
              endDate={tempDateRange[1]}
              onChange={(update) => {
                const [start, end] = update;
                // If user clicks the same date as start (and no end yet), set both to same date
                if (
                  start &&
                  !end &&
                  tempDateRange[0] &&
                  start.toDateString() === tempDateRange[0].toDateString() &&
                  !tempDateRange[1]
                ) {
                  // Double click on same date - set as single day range
                  setTempDateRange([start, start]);
                } else {
                  setTempDateRange(update);
                }
              }}
              maxDate={new Date()}
              inline
              monthsShown={1}
            />
          </div>
          {tempDateRange[0] && tempDateRange[1] && (
            <div className="text-center text-sm text-blue-600 dark:text-blue-400 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              📅{" "}
              {tempDateRange[0].toDateString() ===
              tempDateRange[1].toDateString() ? (
                // Single day
                tempDateRange[0].toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              ) : (
                // Date range
                <>
                  {tempDateRange[0].toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                  {" → "}
                  {tempDateRange[1].toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </>
              )}
            </div>
          )}
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDatePickerModal(false);
                setTempDateRange([null, null]);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              disabled={!tempDateRange[0] || !tempDateRange[1]}
              onClick={() => {
                if (tempDateRange[0] && tempDateRange[1]) {
                  // Use local date format to avoid timezone issues
                  const formatLocalDate = (date) => {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, "0");
                    const day = String(date.getDate()).padStart(2, "0");
                    return `${year}-${month}-${day}`;
                  };
                  setCustomStartDate(formatLocalDate(tempDateRange[0]));
                  setCustomEndDate(formatLocalDate(tempDateRange[1]));
                  setDateRange("custom"); // Set dateRange to custom so the tab shows the dates
                  setShowDatePickerModal(false);
                }
              }}
              className="flex-1"
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
