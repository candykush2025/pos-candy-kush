"use client";

import { useState, useMemo } from "react";
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

export function normalizePaymentType(type) {
  if (!type && type !== 0) return "Other";
  const lowerType = String(type).toLowerCase();
  if (lowerType.includes("cash")) return "Cash";
  if (
    lowerType.includes("card") ||
    lowerType.includes("credit") ||
    lowerType.includes("debit")
  )
    return "Card";
  if (
    lowerType.includes("transfer") ||
    lowerType.includes("bank") ||
    lowerType.includes("custom")
  )
    return "Bank Transfer";
  if (
    lowerType.includes("crypto") ||
    lowerType.includes("bitcoin") ||
    lowerType.includes("usdt")
  )
    return "Crypto";
  if (lowerType.includes("promptpay") || lowerType.includes("qr"))
    return "PromptPay/QR";
  if (lowerType.includes("other")) return "Other";
  // Return capitalized version of original
  return String(type).charAt(0).toUpperCase() + String(type).slice(1);
}

export function ensureDefaultPaymentTypes(paymentMap) {
  const requiredTypes = ["Cash", "Card", "Bank Transfer", "Crypto"];
  for (const t of requiredTypes) {
    if (!paymentMap.has(t)) {
      paymentMap.set(t, {
        id: t,
        name: t,
        paymentAmount: 0,
        paymentTransactions: 0,
        refundAmount: 0,
        refundTransactions: 0,
      });
    }
  }
}

export default function SalesByPaymentPage() {
  // Use optimized hook with caching
  const {
    data: receipts = [],
    isLoading: loading,
    isFetching,
    refetch,
  } = useReceipts();

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

  // Filter receipts by date range, time range, and employees
  const filteredReceipts = useMemo(() => {
    return receipts.filter((receipt) => {
      const receiptDate = getReceiptDate(receipt);

      // Date filter
      if (
        receiptDate < startOfDay(dateRange.from) ||
        receiptDate > endOfDay(dateRange.to)
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

      // Employee filter - check all possible employee ID fields
      if (selectedEmployees.length > 0) {
        const employeeId =
          receipt.employeeId ||
          receipt.employee_id ||
          receipt.userId ||
          receipt.user_id ||
          receipt.cashierId ||
          receipt.cashier_id ||
          receipt.processedBy;
        if (!employeeId || !selectedEmployees.includes(employeeId)) {
          return false;
        }
      }

      return true;
    });
  }, [receipts, dateRange, timeRange, selectedEmployees]);

  // Aggregate sales by payment type with refunds
  const paymentSales = useMemo(() => {
    const paymentMap = new Map();

    filteredReceipts.forEach((receipt) => {
      const isRefund =
        receipt.refund === true || receipt.receiptType === "refund";
      const payments = receipt.payments || [];

      if (payments.length === 0) {
        // If no payments array, use receipt-level payment info
        const paymentType =
          receipt.paymentMethod ||
          receipt.payment_method ||
          receipt.paymentType ||
          "Other";
        const amount =
          receipt.totalMoney || receipt.total_money || receipt.total || 0;

        const normalizedType = normalizePaymentType(paymentType);

        if (paymentMap.has(normalizedType)) {
          const existing = paymentMap.get(normalizedType);
          if (isRefund) {
            existing.refundAmount += Math.abs(amount);
            existing.refundTransactions += 1;
          } else {
            existing.paymentAmount += amount;
            existing.paymentTransactions += 1;
          }
        } else {
          paymentMap.set(normalizedType, {
            id: normalizedType,
            name: normalizedType,
            paymentAmount: isRefund ? 0 : amount,
            paymentTransactions: isRefund ? 0 : 1,
            refundAmount: isRefund ? Math.abs(amount) : 0,
            refundTransactions: isRefund ? 1 : 0,
          });
        }
      } else {
        // Process each payment in the payments array
        payments.forEach((payment) => {
          // Prefer descriptive name fields first (name, paymentTypeName)
          const paymentType =
            payment.payment_type_name ||
            payment.paymentTypeName ||
            payment.name ||
            payment.type ||
            "Other";
          const amount =
            payment.money_amount ||
            payment.paid_money ||
            payment.paidMoney ||
            payment.amount ||
            0;

          const normalizedType = normalizePaymentType(paymentType);

          if (paymentMap.has(normalizedType)) {
            const existing = paymentMap.get(normalizedType);
            if (isRefund) {
              existing.refundAmount += Math.abs(amount);
              existing.refundTransactions += 1;
            } else {
              existing.paymentAmount += amount;
              existing.paymentTransactions += 1;
            }
          } else {
            paymentMap.set(normalizedType, {
              id: normalizedType,
              name: normalizedType,
              paymentAmount: isRefund ? 0 : amount,
              paymentTransactions: isRefund ? 0 : 1,
              refundAmount: isRefund ? Math.abs(amount) : 0,
              refundTransactions: isRefund ? 1 : 0,
            });
          }
        });
      }
    });

    // Ensure the report always contains the 4 main payment types
    ensureDefaultPaymentTypes(paymentMap);

    // Calculate net amounts
    const paymentsArray = Array.from(paymentMap.values()).map((payment) => ({
      ...payment,
      netAmount: payment.paymentAmount - payment.refundAmount,
    }));

    return paymentsArray.sort((a, b) => b.paymentAmount - a.paymentAmount);
  }, [filteredReceipts]);

  // Use exported normalizePaymentType declared above

  // Calculate totals for the Total row
  const totals = useMemo(() => {
    return paymentSales.reduce(
      (acc, payment) => ({
        paymentTransactions:
          acc.paymentTransactions + payment.paymentTransactions,
        paymentAmount: acc.paymentAmount + payment.paymentAmount,
        refundTransactions: acc.refundTransactions + payment.refundTransactions,
        refundAmount: acc.refundAmount + payment.refundAmount,
        netAmount: acc.netAmount + payment.netAmount,
      }),
      {
        paymentTransactions: 0,
        paymentAmount: 0,
        refundTransactions: 0,
        refundAmount: 0,
        netAmount: 0,
      }
    );
  }, [paymentSales]);

  // Table columns - matching Loyverse structure
  const tableColumns = [
    {
      key: "name",
      label: "Payment type",
      sortable: true,
    },
    {
      key: "paymentTransactions",
      label: "Payment transactions",
      format: "number",
      align: "right",
      sortable: true,
    },
    {
      key: "paymentAmount",
      label: "Payment amount",
      format: "currency",
      align: "right",
      sortable: true,
    },
    {
      key: "refundTransactions",
      label: "Refund transactions",
      format: "number",
      align: "right",
      sortable: true,
    },
    {
      key: "refundAmount",
      label: "Refund amount",
      format: "currency",
      align: "right",
      sortable: true,
    },
    {
      key: "netAmount",
      label: "Net amount",
      format: "currency",
      align: "right",
      sortable: true,
    },
  ];

  // Sorting
  const [sortConfig, setSortConfig] = useState({
    key: "netAmount",
    order: "desc",
  });

  const sortedTableData = useMemo(() => {
    return [...paymentSales].sort((a, b) => {
      if (typeof a[sortConfig.key] === "string") {
        return sortConfig.order === "asc"
          ? a[sortConfig.key].localeCompare(b[sortConfig.key])
          : b[sortConfig.key].localeCompare(a[sortConfig.key]);
      }
      return sortConfig.order === "asc"
        ? a[sortConfig.key] - b[sortConfig.key]
        : b[sortConfig.key] - a[sortConfig.key];
    });
  }, [paymentSales, sortConfig]);

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
          Sales by Payment Type
        </h1>
        <div className="flex flex-wrap items-center gap-3">
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

      {/* Data Table with Total Row */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden">
        <ReportDataTable
          columns={tableColumns}
          data={sortedTableData}
          onSort={handleSort}
          sortBy={sortConfig.key}
          sortOrder={sortConfig.order}
          exportFilename={`sales-by-payment-${
            dateRange?.from
              ? format(new Date(dateRange.from), "yyyy-MM-dd")
              : "start"
          }-${
            dateRange?.to ? format(new Date(dateRange.to), "yyyy-MM-dd") : "end"
          }`}
        />

        {/* Total Row */}
        <div className="border-t-2 border-neutral-900 dark:border-neutral-100">
          <div className="grid grid-cols-6 gap-4 px-6 py-3 bg-neutral-50 dark:bg-neutral-900">
            <div className="font-bold text-neutral-900 dark:text-neutral-100">
              Total
            </div>
            <div className="text-right font-bold text-neutral-900 dark:text-neutral-100">
              {totals.paymentTransactions.toLocaleString()}
            </div>
            <div className="text-right font-bold text-neutral-900 dark:text-neutral-100">
              ฿{totals.paymentAmount.toFixed(2)}
            </div>
            <div className="text-right font-bold text-neutral-900 dark:text-neutral-100">
              {totals.refundTransactions.toLocaleString()}
            </div>
            <div className="text-right font-bold text-neutral-900 dark:text-neutral-100">
              ฿{totals.refundAmount.toFixed(2)}
            </div>
            <div className="text-right font-bold text-neutral-900 dark:text-neutral-100">
              ฿{totals.netAmount.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
