"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DateRangePicker,
  ReportDataTable,
  EmployeeFilter,
} from "@/components/reports";
import { useReceipts } from "@/hooks/useReportData";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { db } from "@/lib/firebase/config";
import { collection, getDocs } from "firebase/firestore";

export default function DiscountsReportPage() {
  // Use optimized hook for receipts
  const {
    data: receipts = [],
    isLoading: receiptsLoading,
    isFetching,
    refetch,
  } = useReceipts();

  const [discounts, setDiscounts] = useState([]);
  const [discountsLoading, setDiscountsLoading] = useState(true);

  const loading = receiptsLoading || discountsLoading;

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

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      setDiscountsLoading(true);
      // Fetch all discounts from discounts collection
      const discountsRef = collection(db, "discounts");
      const discountsSnapshot = await getDocs(discountsRef);
      const discountsData = discountsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDiscounts(discountsData || []);
    } catch (error) {
      console.error("Error fetching discounts:", error);
      toast.error("Failed to load discount data");
    } finally {
      setDiscountsLoading(false);
    }
  };

  // Filter receipts by date range, time range, and employees
  const filteredReceipts = useMemo(() => {
    const startTimestamp = startOfDay(dateRange.from).getTime();
    const endTimestamp = endOfDay(dateRange.to).getTime();

    return receipts
      .filter((receipt) => {
        // Get receipt date with multiple fallbacks
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

        // Date filter
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

        // Only keep receipts with discounts
        const totalDiscount =
          receipt.totalDiscount || receipt.total_discount || 0;
        const lineItems = receipt.lineItems || receipt.line_items || [];
        const hasItemDiscounts = lineItems.some(
          (item) =>
            (item.discount || item.discount_amount || item.totalDiscount || 0) >
            0
        );

        return totalDiscount > 0 || hasItemDiscounts;
      })
      .sort((a, b) => {
        const dateA = a.receiptDate?.toDate?.()
          ? a.receiptDate.toDate().getTime()
          : new Date(a.receiptDate).getTime();
        const dateB = b.receiptDate?.toDate?.()
          ? b.receiptDate.toDate().getTime()
          : new Date(b.receiptDate).getTime();
        return dateB - dateA;
      });
  }, [receipts, dateRange, timeRange, selectedEmployees]);

  // Calculate discount usage from filtered receipts
  const discountUsage = useMemo(() => {
    // Create a map to track discount usage
    const usageMap = new Map();

    // Initialize all discounts with zero usage
    discounts.forEach((discount) => {
      usageMap.set(discount.name, {
        name: discount.name,
        count: 0,
        amount: 0,
      });
    });

    // Count discount usage in filtered receipts
    filteredReceipts.forEach((receipt) => {
      const discountName =
        receipt.discountName || receipt.discount_name || null;
      const discountAmount =
        receipt.totalDiscount || receipt.total_discount || 0;

      if (discountAmount > 0) {
        // If there's a discount name, track it
        if (discountName) {
          if (usageMap.has(discountName)) {
            const current = usageMap.get(discountName);
            current.count += 1;
            current.amount += discountAmount;
          } else {
            // Discount used but not in discounts collection (legacy discount)
            usageMap.set(discountName, {
              name: discountName,
              count: 1,
              amount: discountAmount,
            });
          }
        } else {
          // Manual discount by cashier (no discount name)
          const manualKey = "Manual Discount (Cashier)";
          if (usageMap.has(manualKey)) {
            const current = usageMap.get(manualKey);
            current.count += 1;
            current.amount += discountAmount;
          } else {
            usageMap.set(manualKey, {
              name: manualKey,
              count: 1,
              amount: discountAmount,
            });
          }
        }
      }

      // Also check line items for item-level discounts
      const lineItems = receipt.lineItems || receipt.line_items || [];
      lineItems.forEach((item) => {
        const itemDiscountName = item.discountName || item.discount_name;
        const itemDiscountAmount =
          item.discount || item.discount_amount || item.totalDiscount || 0;

        if (itemDiscountAmount > 0) {
          if (itemDiscountName) {
            // Named discount on item
            if (usageMap.has(itemDiscountName)) {
              const current = usageMap.get(itemDiscountName);
              current.count += 1;
              current.amount += itemDiscountAmount;
            } else {
              usageMap.set(itemDiscountName, {
                name: itemDiscountName,
                count: 1,
                amount: itemDiscountAmount,
              });
            }
          } else {
            // Manual discount on item by cashier
            const manualKey = "Manual Discount (Cashier)";
            if (usageMap.has(manualKey)) {
              const current = usageMap.get(manualKey);
              current.count += 1;
              current.amount += itemDiscountAmount;
            } else {
              usageMap.set(manualKey, {
                name: manualKey,
                count: 1,
                amount: itemDiscountAmount,
              });
            }
          }
        }
      });
    });

    // Convert to array and sort by amount (descending)
    return Array.from(usageMap.values()).sort((a, b) => b.amount - a.amount);
  }, [discounts, filteredReceipts]);

  // Simple table columns - Loyverse style (3 columns only)
  const simpleColumns = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      className: "text-left",
    },
    {
      key: "count",
      label: "Discounts applied",
      sortable: true,
      className: "text-right",
    },
    {
      key: "amount",
      label: "Amount discounted",
      sortable: true,
      format: (value) =>
        `฿${value.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      className: "text-right font-semibold",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Discounts
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

      {/* Simple Loyverse-style Table */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <ReportDataTable
          columns={simpleColumns}
          data={discountUsage}
          defaultSort={{ key: "amount", direction: "desc" }}
          exportFilename={`discounts-${format(
            dateRange.from,
            "yyyy-MM-dd"
          )}-${format(dateRange.to, "yyyy-MM-dd")}`}
        />
      </div>
    </div>
  );
}
