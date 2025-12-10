"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Receipt,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { DateRangePicker, EmployeeFilter } from "@/components/reports";
import { receiptsService } from "@/lib/firebase/firestore";
import { format, subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";

export default function ReceiptsReportPage() {
  const [receipts, setReceipts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [timeRange, setTimeRange] = useState({
    fromHour: "00:00",
    toHour: "23:59",
    isAllDay: true,
  });
  const [selectedPaymentType, setSelectedPaymentType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchData();
  }, []); // Only fetch once on mount

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch receipts
      const allReceipts = await receiptsService.getAll();
      console.log("🔥 Total receipts from DB:", allReceipts.length);

      // Fetch employees
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);
      const usersData = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEmployees(
        usersData.filter((u) => u.role === "cashier" || u.role === "admin")
      );

      // Sort by date descending - DON'T filter by date here, do it in useMemo
      const sortedReceipts = [...allReceipts].sort((a, b) => {
        let dateA, dateB;

        // Handle multiple date field variations for receipt A
        if (a.receiptDate?.toDate) {
          dateA = a.receiptDate.toDate().getTime();
        } else if (a.receiptDate) {
          dateA = new Date(a.receiptDate).getTime();
        } else if (a.created_at?.toDate) {
          dateA = a.created_at.toDate().getTime();
        } else if (a.created_at) {
          dateA = new Date(a.created_at).getTime();
        } else if (a.createdAt?.toDate) {
          dateA = a.createdAt.toDate().getTime();
        } else if (a.createdAt) {
          dateA = new Date(a.createdAt).getTime();
        } else if (a.date) {
          dateA = new Date(a.date).getTime();
        } else {
          dateA = 0;
        }

        // Handle multiple date field variations for receipt B
        if (b.receiptDate?.toDate) {
          dateB = b.receiptDate.toDate().getTime();
        } else if (b.receiptDate) {
          dateB = new Date(b.receiptDate).getTime();
        } else if (b.created_at?.toDate) {
          dateB = b.created_at.toDate().getTime();
        } else if (b.created_at) {
          dateB = new Date(b.created_at).getTime();
        } else if (b.createdAt?.toDate) {
          dateB = b.createdAt.toDate().getTime();
        } else if (b.createdAt) {
          dateB = new Date(b.createdAt).getTime();
        } else if (b.date) {
          dateB = new Date(b.date).getTime();
        } else {
          dateB = 0;
        }

        return dateB - dateA;
      });

      setReceipts(sortedReceipts);
      console.log("📝 Set receipts state:", sortedReceipts.length);
      console.log("📅 Date range:", { from: dateRange.from, to: dateRange.to });
      if (sortedReceipts.length > 0) {
        console.log("First receipt sample:", sortedReceipts[0]);
      }
    } catch (error) {
      console.error("Error fetching receipts:", error);
      toast.error("Failed to load receipts data");
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const filteredReceipts = useMemo(() => {
    console.log("🔍 Filtering receipts:", {
      totalReceipts: receipts.length,
      selectedStatus,
      searchTerm,
      selectedEmployees: selectedEmployees.length,
      dateRange,
    });

    const filtered = receipts.filter((receipt) => {
      // Date range filter - handle multiple date field variations
      let receiptDate;
      if (receipt.receiptDate?.toDate) {
        receiptDate = receipt.receiptDate.toDate();
      } else if (receipt.receiptDate) {
        receiptDate = new Date(receipt.receiptDate);
      } else if (receipt.created_at?.toDate) {
        receiptDate = receipt.created_at.toDate();
      } else if (receipt.created_at) {
        receiptDate = new Date(receipt.created_at);
      } else if (receipt.createdAt?.toDate) {
        receiptDate = receipt.createdAt.toDate();
      } else if (receipt.createdAt) {
        receiptDate = new Date(receipt.createdAt);
      } else if (receipt.date) {
        receiptDate = new Date(receipt.date);
      } else {
        return false; // No valid date field found
      }

      // Check if date is valid
      if (isNaN(receiptDate.getTime())) {
        return false;
      }

      const receiptTimestamp = receiptDate.getTime();
      const startTimestamp = startOfDay(dateRange.from).getTime();
      const endTimestamp = endOfDay(dateRange.to).getTime();

      if (
        receiptTimestamp < startTimestamp ||
        receiptTimestamp > endTimestamp
      ) {
        return false;
      }

      // Time filter
      if (!timeRange.isAllDay) {
        const receiptHour = receiptDate.getHours();
        const receiptMinutes = receiptDate.getMinutes();
        const receiptTime = receiptHour * 60 + receiptMinutes;

        const [fromH, fromM] = timeRange.fromHour.split(":").map(Number);
        const [toH, toM] = timeRange.toHour.split(":").map(Number);
        const fromTime = fromH * 60 + fromM;
        const toTime = toH * 60 + toM;

        if (receiptTime < fromTime || receiptTime > toTime) {
          return false;
        }
      }

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const receiptNumber = (
          receipt.receiptNumber ||
          receipt.loyverse_id ||
          receipt.id ||
          ""
        ).toLowerCase();
        const customerName = (
          receipt.customerName ||
          receipt.customer?.name ||
          ""
        ).toLowerCase();
        if (!receiptNumber.includes(search) && !customerName.includes(search)) {
          return false;
        }
      }

      // Employee filter
      if (selectedEmployees.length > 0) {
        const employeeId = receipt.employeeId || receipt.employee_id;
        if (!selectedEmployees.includes(employeeId)) {
          return false;
        }
      }

      // Payment type filter
      if (selectedPaymentType !== "all") {
        const payments = receipt.payments || [];
        const hasPaymentType = payments.some((p) =>
          (p.type || p.payment_type_id || "")
            .toLowerCase()
            .includes(selectedPaymentType.toLowerCase())
        );
        if (!hasPaymentType) {
          return false;
        }
      }

      // Status filter
      if (selectedStatus !== "all") {
        const totalMoney = receipt.totalMoney || receipt.total_money || 0;
        const isRefunded =
          receipt.refund || receipt.isRefunded || totalMoney < 0;
        if (selectedStatus === "completed" && isRefunded) return false;
        if (selectedStatus === "refunded" && !isRefunded) return false;
      }

      return true;
    });

    console.log("✅ Filtered results:", filtered.length);
    return filtered;
  }, [
    receipts,
    searchTerm,
    selectedEmployees,
    selectedPaymentType,
    selectedStatus,
    timeRange,
    dateRange,
  ]);

  // Calculate summary metrics
  const metrics = useMemo(() => {
    const totalReceipts = filteredReceipts.length;
    const totalSales = filteredReceipts.reduce((sum, r) => {
      const amount = r.totalMoney || r.total_money || 0;
      return sum + (amount > 0 ? amount : 0);
    }, 0);
    const totalRefunds = filteredReceipts.reduce((sum, r) => {
      const amount = r.totalMoney || r.total_money || 0;
      return sum + (amount < 0 ? Math.abs(amount) : 0);
    }, 0);
    const avgTransaction = totalReceipts > 0 ? totalSales / totalReceipts : 0;

    return {
      totalReceipts,
      totalSales,
      totalRefunds,
      avgTransaction,
    };
  }, [filteredReceipts]);

  // Pagination
  const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage);
  const paginatedReceipts = filteredReceipts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get payment type string
  const getPaymentTypeString = (receipt) => {
    const payments = receipt.payments || [];
    if (payments.length === 0) return "N/A";
    return payments
      .map((p) => p.type || p.payment_type_id || "Unknown")
      .join(", ");
  };

  // Get employee name
  const getEmployeeName = (receipt) => {
    const employeeId =
      receipt.employeeId ||
      receipt.employee_id ||
      receipt.cashierId ||
      receipt.cashier_id ||
      receipt.created_by;

    const employee = employees.find((e) => e.id === employeeId);
    const employeeName =
      employee?.name ||
      employee?.displayName ||
      employee?.email?.split("@")[0] ||
      receipt.employeeName ||
      receipt.employee_name ||
      receipt.cashierName ||
      receipt.cashier_name;

    return employeeName || "—";
  };

  // Format receipt date
  const formatReceiptDate = (receipt) => {
    try {
      let date;
      if (receipt.receiptDate?.toDate) {
        date = receipt.receiptDate.toDate();
      } else if (receipt.receiptDate) {
        date = new Date(receipt.receiptDate);
      } else if (receipt.created_at?.toDate) {
        date = receipt.created_at.toDate();
      } else if (receipt.created_at) {
        date = new Date(receipt.created_at);
      } else if (receipt.createdAt?.toDate) {
        date = receipt.createdAt.toDate();
      } else if (receipt.createdAt) {
        date = new Date(receipt.createdAt);
      } else if (receipt.date) {
        date = new Date(receipt.date);
      } else {
        return "N/A";
      }

      if (isNaN(date.getTime())) return "N/A";
      return format(date, "MMM dd, yyyy");
    } catch (error) {
      console.error("Date format error:", error, receipt);
      return "N/A";
    }
  };

  // Format receipt time
  const formatReceiptTime = (receipt) => {
    try {
      let date;
      if (receipt.receiptDate?.toDate) {
        date = receipt.receiptDate.toDate();
      } else if (receipt.receiptDate) {
        date = new Date(receipt.receiptDate);
      } else if (receipt.created_at?.toDate) {
        date = receipt.created_at.toDate();
      } else if (receipt.created_at) {
        date = new Date(receipt.created_at);
      } else if (receipt.createdAt?.toDate) {
        date = receipt.createdAt.toDate();
      } else if (receipt.createdAt) {
        date = new Date(receipt.createdAt);
      } else if (receipt.date) {
        date = new Date(receipt.date);
      } else {
        return "";
      }

      if (isNaN(date.getTime())) return "";
      return format(date, "hh:mm a");
    } catch (error) {
      return "";
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Receipt #",
      "Date",
      "Employee",
      "Items",
      "Payment Type",
      "Total",
      "Status",
    ];
    const rows = filteredReceipts.map((receipt) => {
      const isRefunded =
        receipt.refund || receipt.isRefunded || (receipt.totalMoney || 0) < 0;
      return [
        receipt.receiptNumber || receipt.loyverse_id || receipt.id || "",
        formatReceiptDate(receipt),
        getEmployeeName(receipt),
        (receipt.lineItems || receipt.line_items || []).length,
        getPaymentTypeString(receipt),
        (receipt.totalMoney || receipt.total_money || 0).toFixed(2),
        isRefunded ? "Refunded" : "Completed",
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `receipts_${
      dateRange?.from ? format(new Date(dateRange.from), "yyyyMMdd") : "start"
    }_${
      dateRange?.to ? format(new Date(dateRange.to), "yyyyMMdd") : "end"
    }.csv`;
    link.click();
  };

  // View receipt detail
  const viewReceiptDetail = (receipt) => {
    setSelectedReceipt(receipt);
    setShowDetailModal(true);
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setSelectedEmployees([]);
    setSelectedPaymentType("all");
    setSelectedStatus("all");
    setTimeRange({ fromHour: "00:00", toHour: "23:59", isAllDay: true });
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Receipts
          </h1>
          <div className="flex items-center gap-3">
            <EmployeeFilter
              selectedEmployees={selectedEmployees}
              onEmployeeChange={setSelectedEmployees}
            />
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              periodName="last30"
              showTimeFilter={true}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          </div>
        </div>
      </div>

      {/* Loyverse-style Filter Tabs */}
      <div className="flex gap-0 overflow-x-auto bg-white dark:bg-black">
        {/* All Receipts Tab */}
        <button
          onClick={() => setSelectedStatus("all")}
          className={`flex-1 min-w-[160px] px-6 py-4 border-b-4 transition-all ${
            selectedStatus === "all"
              ? "border-green-600 bg-green-50 dark:bg-green-950"
              : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-900"
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                selectedStatus === "all"
                  ? "bg-green-600"
                  : "bg-gray-200 dark:bg-gray-800"
              }`}
            >
              <Receipt
                className={`h-6 w-6 ${
                  selectedStatus === "all"
                    ? "text-white"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              />
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                All receipts
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {filteredReceipts.length}
              </div>
            </div>
          </div>
        </button>

        {/* Sales Tab */}
        <button
          onClick={() => setSelectedStatus("completed")}
          className={`flex-1 min-w-[160px] px-6 py-4 border-b-4 transition-all ${
            selectedStatus === "completed"
              ? "border-green-600 bg-green-50 dark:bg-green-950"
              : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-900"
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                selectedStatus === "completed"
                  ? "bg-green-600"
                  : "bg-gray-200 dark:bg-gray-800"
              }`}
            >
              <svg
                className={`h-6 w-6 ${
                  selectedStatus === "completed"
                    ? "text-white"
                    : "text-gray-600 dark:text-gray-400"
                }`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
              </svg>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Sales
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {
                  filteredReceipts.filter(
                    (r) =>
                      !r.refund && !r.isRefunded && (r.totalMoney || 0) >= 0
                  ).length
                }
              </div>
            </div>
          </div>
        </button>

        {/* Refunds Tab */}
        <button
          onClick={() => setSelectedStatus("refunded")}
          className={`flex-1 min-w-[160px] px-6 py-4 border-b-4 transition-all ${
            selectedStatus === "refunded"
              ? "border-green-600 bg-green-50 dark:bg-green-950"
              : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-900"
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                selectedStatus === "refunded"
                  ? "bg-green-600"
                  : "bg-gray-200 dark:bg-gray-800"
              }`}
            >
              <svg
                className={`h-6 w-6 ${
                  selectedStatus === "refunded"
                    ? "text-white"
                    : "text-gray-600 dark:text-gray-400"
                }`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
              </svg>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Refunds
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {
                  filteredReceipts.filter(
                    (r) => r.refund || r.isRefunded || (r.totalMoney || 0) < 0
                  ).length
                }
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Loyverse-style Table with Search and Export */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black overflow-hidden">
        {/* Table Header with Search and Export */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by receipt no. or customer"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Receipt no.
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Date
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Employee
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Customer
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Type
                    </th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedReceipts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center px-6 py-12 text-gray-500"
                      >
                        No receipts found
                      </td>
                    </tr>
                  ) : (
                    paginatedReceipts.map((receipt) => {
                      const isRefunded =
                        receipt.refund ||
                        receipt.isRefunded ||
                        (receipt.totalMoney || 0) < 0;
                      const total =
                        receipt.totalMoney || receipt.total_money || 0;
                      const customerName =
                        receipt.customerName ||
                        receipt.customer_name ||
                        receipt.clientName ||
                        receipt.client_name ||
                        receipt.customer?.name ||
                        receipt.customer?.customerName ||
                        receipt.loyverse_customer_name ||
                        "—";

                      return (
                        <tr
                          key={receipt.id}
                          onClick={() => viewReceiptDetail(receipt)}
                          className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors"
                        >
                          <td className="px-6 py-3 text-sm text-gray-900 dark:text-white">
                            {receipt.receiptNumber ||
                              receipt.receipt_number ||
                              (
                                receipt.loyverse_id ||
                                receipt.id ||
                                ""
                              ).substring(0, 10)}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400">
                            <div>{formatReceiptDate(receipt)}</div>
                            <div className="text-xs text-gray-500">
                              {formatReceiptTime(receipt)}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {getEmployeeName(receipt)}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {customerName}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {isRefunded ? "Refund" : "Sale"}
                          </td>
                          <td className="px-6 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                            ฿
                            {Math.abs(total).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Loyverse-style Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>Page:</span>
                    <Input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={currentPage}
                      onChange={(e) => {
                        const page = parseInt(e.target.value);
                        if (page >= 1 && page <= totalPages) {
                          setCurrentPage(page);
                        }
                      }}
                      className="w-16 h-8 text-center"
                    />
                    <span>of {totalPages}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>Rows per page:</span>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => {
                        setItemsPerPage(parseInt(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Receipt Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Receipt Detail
            </DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-4">
              {/* Receipt Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Receipt #:</span>
                  <p className="font-mono">
                    {selectedReceipt.receiptNumber ||
                      selectedReceipt.loyverse_id ||
                      selectedReceipt.id}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p>{formatReceiptDate(selectedReceipt)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Employee:</span>
                  <p>{getEmployeeName(selectedReceipt)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Payment:</span>
                  <p>{getPaymentTypeString(selectedReceipt)}</p>
                </div>
                {(selectedReceipt.customerName ||
                  selectedReceipt.customer?.name) && (
                  <div>
                    <span className="text-muted-foreground">Customer:</span>
                    <p>
                      {selectedReceipt.customerName ||
                        selectedReceipt.customer?.name}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p>
                    <Badge
                      variant={
                        selectedReceipt.refund ||
                        selectedReceipt.isRefunded ||
                        (selectedReceipt.totalMoney || 0) < 0
                          ? "destructive"
                          : "default"
                      }
                    >
                      {selectedReceipt.refund ||
                      selectedReceipt.isRefunded ||
                      (selectedReceipt.totalMoney || 0) < 0
                        ? "Refunded"
                        : "Completed"}
                    </Badge>
                  </p>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h4 className="font-medium mb-2">Items</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left p-2">Item</th>
                        <th className="text-center p-2">Qty</th>
                        <th className="text-right p-2">Price</th>
                        <th className="text-right p-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        selectedReceipt.lineItems ||
                        selectedReceipt.line_items ||
                        []
                      ).map((item, index) => (
                        <tr key={index} className="border-b last:border-0">
                          <td className="p-2">
                            {item.itemName || item.item_name || "Unknown Item"}
                            {item.variantName || item.variant_name ? (
                              <span className="text-muted-foreground text-xs block">
                                {item.variantName || item.variant_name}
                              </span>
                            ) : null}
                          </td>
                          <td className="p-2 text-center">
                            {item.quantity || 1}
                          </td>
                          <td className="p-2 text-right">
                            ฿
                            {(
                              (item.price || item.gross_total_money || 0) /
                              (item.quantity || 1)
                            ).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="p-2 text-right">
                            ฿
                            {(
                              item.price ||
                              item.gross_total_money ||
                              0
                            ).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                {(selectedReceipt.totalDiscount ||
                  selectedReceipt.total_discount ||
                  0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Discount:</span>
                    <span className="text-red-600">
                      -฿
                      {(
                        selectedReceipt.totalDiscount ||
                        selectedReceipt.total_discount ||
                        0
                      ).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
                {(selectedReceipt.totalTax || selectedReceipt.total_tax || 0) >
                  0 && (
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <span>
                      ฿
                      {(
                        selectedReceipt.totalTax ||
                        selectedReceipt.total_tax ||
                        0
                      ).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span
                    className={
                      (selectedReceipt.totalMoney || 0) < 0
                        ? "text-red-600"
                        : ""
                    }
                  >
                    {(selectedReceipt.totalMoney || 0) < 0 ? "-" : ""}฿
                    {Math.abs(
                      selectedReceipt.totalMoney ||
                        selectedReceipt.total_money ||
                        0
                    ).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              {/* Payments */}
              {(selectedReceipt.payments || []).length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Payment Details</h4>
                  <div className="space-y-2">
                    {selectedReceipt.payments.map((payment, index) => (
                      <div
                        key={index}
                        className="flex justify-between text-sm bg-muted/50 p-2 rounded"
                      >
                        <span>
                          {payment.type || payment.payment_type_id || "Payment"}
                        </span>
                        <span>
                          ฿
                          {(
                            payment.amount ||
                            payment.money_amount ||
                            0
                          ).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Note */}
              {(selectedReceipt.note || selectedReceipt.order_note) && (
                <div>
                  <h4 className="font-medium mb-2">Note</h4>
                  <p className="text-sm bg-muted/50 p-2 rounded">
                    {selectedReceipt.note || selectedReceipt.order_note}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
