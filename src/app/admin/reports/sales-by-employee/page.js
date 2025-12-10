"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { subDays, format, startOfDay, endOfDay } from "date-fns";
import { Button } from "@/components/ui/button";

import {
  DateRangePicker,
  ReportDataTable,
  EmployeeFilter,
} from "@/components/reports";
import { useReceipts } from "@/hooks/useReportData";
import { getDocuments } from "@/lib/firebase/firestore";

export default function SalesByEmployeePage() {
  // Use optimized hook for receipts
  const {
    data: receipts = [],
    isLoading: receiptsLoading,
    isFetching,
    refetch,
  } = useReceipts();
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const loading = receiptsLoading || usersLoading;

  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [timeRange, setTimeRange] = useState({
    fromHour: "00:00",
    toHour: "23:59",
    isAllDay: true,
  });

  // Load users data (not cached yet)
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const usersData = await getDocuments("users");
      setUsers(usersData || []);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users data");
    } finally {
      setUsersLoading(false);
    }
  };

  // Create user name mapping
  const userNameMap = useMemo(() => {
    const map = new Map();
    map.set("unknown", "Unknown Employee");
    users.forEach((user) => {
      map.set(user.id, user.name || user.email || "Unknown");
      if (user.email) {
        map.set(user.email, user.name || user.email);
      }
    });
    return map;
  }, [users]);

  // Helper to get receipt date
  const getReceiptDate = (receipt) => {
    if (receipt.receipt_date) {
      return receipt.receipt_date?.toDate
        ? receipt.receipt_date.toDate()
        : new Date(receipt.receipt_date);
    } else if (receipt.receiptDate) {
      return receipt.receiptDate?.toDate
        ? receipt.receiptDate.toDate()
        : new Date(receipt.receiptDate);
    } else {
      const fallbackDate = receipt.created_at || receipt.createdAt;
      return fallbackDate?.toDate
        ? fallbackDate.toDate()
        : new Date(fallbackDate);
    }
  };

  // Helper to get receipt total
  const getReceiptTotal = (receipt) => {
    return receipt.totalMoney || receipt.total_money || receipt.total || 0;
  };

  // Helper to get receipt discount
  const getReceiptDiscount = (receipt) => {
    return (
      receipt.totalDiscount || receipt.total_discount || receipt.discount || 0
    );
  };

  // Filter receipts by date range, employee and time
  const filteredReceipts = useMemo(() => {
    return receipts.filter((receipt) => {
      const receiptDate = getReceiptDate(receipt);

      // Date range filter
      if (
        receiptDate < startOfDay(dateRange.from) ||
        receiptDate > endOfDay(dateRange.to)
      ) {
        return false;
      }

      // Include both sales and refunds (no exclusion)
      // Refunds will be tracked separately in the aggregation

      // Employee filter
      if (selectedEmployees.length > 0) {
        const employeeId = receipt.employeeId || receipt.employee_id;
        if (!selectedEmployees.includes(employeeId)) {
          return false;
        }
      }

      // Time filter
      if (!timeRange.isAllDay) {
        const hours = receiptDate.getHours();
        const minutes = receiptDate.getMinutes();
        const receiptTimeMinutes = hours * 60 + minutes;

        const [fromH, fromM] = timeRange.fromHour.split(":").map(Number);
        const [toH, toM] = timeRange.toHour.split(":").map(Number);
        const fromMinutes = fromH * 60 + fromM;
        const toMinutes = toH * 60 + toM;

        if (
          receiptTimeMinutes < fromMinutes ||
          receiptTimeMinutes > toMinutes
        ) {
          return false;
        }
      }

      return true;
    });
  }, [receipts, dateRange, selectedEmployees, timeRange]);

  // Calculate previous period
  const previousPeriodReceipts = useMemo(() => {
    const daysDiff = Math.ceil(
      (dateRange.to - dateRange.from) / (1000 * 60 * 60 * 24)
    );
    const previousFrom = subDays(dateRange.from, daysDiff);
    const previousTo = subDays(dateRange.to, daysDiff);

    return receipts.filter((receipt) => {
      const receiptDate = getReceiptDate(receipt);
      return (
        receiptDate >= startOfDay(previousFrom) &&
        receiptDate <= endOfDay(previousTo) &&
        receipt.receiptType !== "REFUND"
      );
    });
  }, [receipts, dateRange]);

  // Aggregate sales by employee
  const employeeSales = useMemo(() => {
    const employeeMap = new Map();

    filteredReceipts.forEach((receipt) => {
      // Get employee ID from various possible fields
      const employeeId =
        receipt.employee_id ||
        receipt.employeeId ||
        receipt.cashier_id ||
        receipt.cashierId ||
        receipt.userId ||
        receipt.user_id ||
        receipt.processedBy ||
        "unknown";

      // Get employee name
      let employeeName = userNameMap.get(employeeId);
      if (!employeeName) {
        employeeName =
          receipt.employeeName ||
          receipt.cashierName ||
          receipt.userName ||
          "Unknown Employee";
      }

      const isRefund =
        receipt.receiptType === "REFUND" || receipt.receipt_type === "REFUND";
      const total = getReceiptTotal(receipt);
      const discount = getReceiptDiscount(receipt);
      const itemCount = (receipt.lineItems || receipt.line_items || []).reduce(
        (sum, item) => sum + (item.quantity || 1),
        0
      );

      if (employeeMap.has(employeeId)) {
        const existing = employeeMap.get(employeeId);
        if (isRefund) {
          existing.refunds += Math.abs(total);
        } else {
          existing.grossSales += total;
          existing.transactions += 1;
          existing.itemsSold += itemCount;
        }
        existing.discounts += discount;
      } else {
        employeeMap.set(employeeId, {
          id: employeeId,
          name: employeeName,
          grossSales: isRefund ? 0 : total,
          refunds: isRefund ? Math.abs(total) : 0,
          discounts: discount,
          transactions: isRefund ? 0 : 1,
          itemsSold: itemCount,
          customersSignedUp: 0, // TODO: Implement customer signup tracking
        });
      }
    });

    // Calculate net sales and average sale
    const employeesArray = Array.from(employeeMap.values()).map((emp) => ({
      ...emp,
      netSales: emp.grossSales - emp.refunds - emp.discounts,
      averageSale:
        emp.transactions > 0
          ? (emp.grossSales - emp.refunds - emp.discounts) / emp.transactions
          : 0,
    }));

    return employeesArray.sort((a, b) => b.netSales - a.netSales);
  }, [filteredReceipts, userNameMap]);

  // Previous period employee sales
  const previousEmployeeSales = useMemo(() => {
    const employeeMap = new Map();

    previousPeriodReceipts.forEach((receipt) => {
      const employeeId =
        receipt.employee_id ||
        receipt.employeeId ||
        receipt.cashier_id ||
        receipt.cashierId ||
        receipt.userId ||
        receipt.user_id ||
        receipt.processedBy ||
        "unknown";

      const revenue = getReceiptTotal(receipt);

      if (employeeMap.has(employeeId)) {
        const existing = employeeMap.get(employeeId);
        existing.revenue += revenue;
        existing.transactions += 1;
      } else {
        employeeMap.set(employeeId, {
          id: employeeId,
          revenue: revenue,
          transactions: 1,
        });
      }
    });

    return employeeMap;
  }, [previousPeriodReceipts]);

  // Calculate percentage for each employee
  const employeeSalesWithPercentage = useMemo(() => {
    const totalRevenue = employeeSales.reduce(
      (sum, emp) => sum + emp.revenue,
      0
    );
    return employeeSales.map((emp) => ({
      ...emp,
      percentage: totalRevenue > 0 ? (emp.revenue / totalRevenue) * 100 : 0,
    }));
  }, [employeeSales]);

  // Table columns - Loyverse Style
  const tableColumns = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: "grossSales",
      label: "Gross sales",
      format: "currency",
      align: "right",
      sortable: true,
    },
    {
      key: "refunds",
      label: "Refunds",
      format: "currency",
      align: "right",
      sortable: true,
    },
    {
      key: "discounts",
      label: "Discounts",
      format: "currency",
      align: "right",
      sortable: true,
    },
    {
      key: "netSales",
      label: "Net sales",
      format: "currency",
      align: "right",
      sortable: true,
    },
    {
      key: "transactions",
      label: "Receipts",
      format: "number",
      align: "right",
      sortable: true,
    },
    {
      key: "averageSale",
      label: "Average sale",
      format: "currency",
      align: "right",
      sortable: true,
    },
    {
      key: "customersSignedUp",
      label: "Customers signed up",
      format: "number",
      align: "right",
      sortable: true,
    },
  ];

  // Sorting
  const [sortConfig, setSortConfig] = useState({
    key: "netSales",
    order: "desc",
  });

  const sortedTableData = useMemo(() => {
    return [...employeeSalesWithPercentage].sort((a, b) => {
      if (typeof a[sortConfig.key] === "string") {
        return sortConfig.order === "asc"
          ? a[sortConfig.key].localeCompare(b[sortConfig.key])
          : b[sortConfig.key].localeCompare(a[sortConfig.key]);
      }
      return sortConfig.order === "asc"
        ? a[sortConfig.key] - b[sortConfig.key]
        : b[sortConfig.key] - a[sortConfig.key];
    });
  }, [employeeSalesWithPercentage, sortConfig]);

  const handleSort = (key, order) => {
    setSortConfig({ key, order });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Sales by Employee
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <EmployeeFilter
            selectedEmployees={selectedEmployees}
            onEmployeesChange={setSelectedEmployees}
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

      {/* Data Table - Loyverse Style (No Metrics, No Charts) */}
      <ReportDataTable
        columns={tableColumns}
        data={sortedTableData}
        onSort={handleSort}
        sortBy={sortConfig.key}
        sortOrder={sortConfig.order}
        exportFilename={`sales-by-employee-${format(
          dateRange.from,
          "yyyy-MM-dd"
        )}-${format(dateRange.to, "yyyy-MM-dd")}`}
      />
    </div>
  );
}
