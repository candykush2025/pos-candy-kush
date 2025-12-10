"use client";

import { useState, useMemo } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { subDays, format, startOfDay, endOfDay } from "date-fns";
import { Button } from "@/components/ui/button";

import { DateRangePicker, EmployeeFilter } from "@/components/reports";
import { useReportData } from "@/hooks/useReportData";

export default function SalesByCategoryPage() {
  // Use optimized hooks with caching
  const {
    receipts,
    categories,
    products,
    isLoading: loading,
    isFetching,
    refetch,
  } = useReportData();

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

  // Create product to category mapping
  const productCategoryMap = useMemo(() => {
    const map = new Map();
    products.forEach((product) => {
      const categoryId =
        product.category_id ||
        product.categoryId ||
        product.category ||
        "uncategorized";
      map.set(product.id, categoryId);
      // Also map by name for fallback
      if (product.name) {
        map.set(product.name, categoryId);
      }
    });
    return map;
  }, [products]);

  // Create category name mapping
  const categoryNameMap = useMemo(() => {
    const map = new Map();
    map.set("uncategorized", "Uncategorized");
    categories.forEach((cat) => {
      map.set(cat.id, cat.name || "Unknown Category");
    });
    return map;
  }, [categories]);

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

      // Exclude refunds
      if (receipt.receiptType === "REFUND") {
        return false;
      }

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

  // Aggregate sales by category
  const categorySales = useMemo(() => {
    const categoryMap = new Map();

    filteredReceipts.forEach((receipt) => {
      const lineItems = receipt.lineItems || receipt.line_items || [];
      lineItems.forEach((item) => {
        const itemId = item.item_id || item.itemId || item.id;
        const itemName = item.item_name || item.itemName || item.name;

        // Try to get category from item first, then from product mapping
        let categoryId = item.category_id || item.categoryId || item.category;
        if (!categoryId && itemId) {
          categoryId = productCategoryMap.get(itemId);
        }
        if (!categoryId && itemName) {
          categoryId = productCategoryMap.get(itemName);
        }
        categoryId = categoryId || "uncategorized";

        const categoryName =
          categoryNameMap.get(categoryId) || categoryId || "Uncategorized";
        const quantity = item.quantity || 1;
        const price = item.price || item.item_price || 0;
        const lineTotal =
          item.line_total ||
          item.lineTotal ||
          item.total_money ||
          price * quantity;
        const cost = item.cost || item.item_cost || 0;
        const costTotal = cost * quantity;

        if (categoryMap.has(categoryId)) {
          const existing = categoryMap.get(categoryId);
          existing.quantity += quantity;
          existing.revenue += lineTotal;
          existing.cost += costTotal;
          existing.itemCount += 1;
        } else {
          categoryMap.set(categoryId, {
            id: categoryId,
            name: categoryName,
            quantity: quantity,
            revenue: lineTotal,
            cost: costTotal,
            itemCount: 1,
          });
        }
      });
    });

    // Calculate totals for percentages
    const totalRevenue = Array.from(categoryMap.values()).reduce(
      (sum, cat) => sum + cat.revenue,
      0
    );

    // Calculate profit, margin, and percentage
    const categoriesArray = Array.from(categoryMap.values()).map((cat) => ({
      ...cat,
      profit: cat.revenue - cat.cost,
      margin:
        cat.revenue > 0 ? ((cat.revenue - cat.cost) / cat.revenue) * 100 : 0,
      percentage: totalRevenue > 0 ? (cat.revenue / totalRevenue) * 100 : 0,
    }));

    return categoriesArray.sort((a, b) => b.revenue - a.revenue);
  }, [filteredReceipts, productCategoryMap, categoryNameMap]);

  // Previous period category sales
  const previousCategorySales = useMemo(() => {
    const categoryMap = new Map();

    previousPeriodReceipts.forEach((receipt) => {
      const lineItems = receipt.lineItems || receipt.line_items || [];
      lineItems.forEach((item) => {
        const itemId = item.item_id || item.itemId || item.id;
        const itemName = item.item_name || item.itemName || item.name;

        let categoryId = item.category_id || item.categoryId || item.category;
        if (!categoryId && itemId) {
          categoryId = productCategoryMap.get(itemId);
        }
        if (!categoryId && itemName) {
          categoryId = productCategoryMap.get(itemName);
        }
        categoryId = categoryId || "uncategorized";

        const quantity = item.quantity || 1;
        const price = item.price || item.item_price || 0;
        const lineTotal =
          item.line_total ||
          item.lineTotal ||
          item.total_money ||
          price * quantity;

        if (categoryMap.has(categoryId)) {
          const existing = categoryMap.get(categoryId);
          existing.quantity += quantity;
          existing.revenue += lineTotal;
        } else {
          categoryMap.set(categoryId, {
            id: categoryId,
            quantity: quantity,
            revenue: lineTotal,
          });
        }
      });
    });

    return categoryMap;
  }, [previousPeriodReceipts, productCategoryMap]);

  // Table columns
  const tableColumns = [
    {
      key: "name",
      label: "Category",
      sortable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: "quantity",
      label: "Items Sold",
      format: "number",
      align: "right",
      sortable: true,
    },
    {
      key: "revenue",
      label: "Revenue",
      format: "currency",
      align: "right",
      sortable: true,
    },
    {
      key: "percentage",
      label: "% of Sales",
      format: "percent",
      align: "right",
      sortable: true,
      render: (value) => (
        <div className="flex items-center justify-end gap-2">
          <div className="w-16 bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${Math.min(value, 100)}%` }}
            />
          </div>
          <span>{value.toFixed(1)}%</span>
        </div>
      ),
    },
    {
      key: "cost",
      label: "Cost",
      format: "currency",
      align: "right",
      sortable: true,
    },
    {
      key: "profit",
      label: "Profit",
      format: "currency",
      align: "right",
      sortable: true,
    },
    {
      key: "margin",
      label: "Margin",
      format: "percent",
      align: "right",
      sortable: true,
      render: (value) => (
        <span
          className={
            value >= 30
              ? "text-green-600"
              : value >= 15
              ? "text-yellow-600"
              : "text-red-600"
          }
        >
          {value.toFixed(1)}%
        </span>
      ),
    },
  ];

  // Sorting
  const [sortConfig, setSortConfig] = useState({
    key: "revenue",
    order: "desc",
  });

  const sortedTableData = useMemo(() => {
    return [...categorySales].sort((a, b) => {
      if (typeof a[sortConfig.key] === "string") {
        return sortConfig.order === "asc"
          ? a[sortConfig.key].localeCompare(b[sortConfig.key])
          : b[sortConfig.key].localeCompare(a[sortConfig.key]);
      }
      return sortConfig.order === "asc"
        ? a[sortConfig.key] - b[sortConfig.key]
        : b[sortConfig.key] - a[sortConfig.key];
    });
  }, [categorySales, sortConfig]);

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

  // Export to CSV function
  const exportToCSV = () => {
    const headers = tableColumns.map((col) => col.label).join(",");
    const rows = sortedTableData.map((row) =>
      tableColumns
        .map((col) => {
          let value = row[col.key];
          if (col.format === "currency" && typeof value === "number") {
            value = value.toFixed(2);
          } else if (col.format === "percent" && typeof value === "number") {
            value = value.toFixed(1) + "%";
          } else if (col.format === "number" && typeof value === "number") {
            value = value.toFixed(0);
          }
          return `"${value}"`;
        })
        .join(",")
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-by-category-${format(
      dateRange.from,
      "yyyy-MM-dd"
    )}-${format(dateRange.to, "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Sales by Category
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

      {/* Loyverse-Style Split Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow">
        {/* Export Button */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <button
            onClick={exportToCSV}
            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md transition-colors"
          >
            Export
          </button>
        </div>

        {/* Split Table Layout */}
        <div className="flex">
          {/* Fixed Left Column - Category Names */}
          <div className="flex-shrink-0" style={{ width: "20%" }}>
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700">
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Category
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                {sortedTableData.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-700"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {row.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Scrollable Right Columns - Data */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700">
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">
                    Items sold
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">
                    Net sales
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">
                    Cost of goods
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">
                    Gross profit
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                {sortedTableData.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-700"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-neutral-900 dark:text-neutral-100">
                      {row.quantity.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-neutral-900 dark:text-neutral-100">
                      ฿
                      {row.revenue.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-neutral-900 dark:text-neutral-100">
                      ฿
                      {row.cost.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-neutral-900 dark:text-neutral-100">
                      ฿
                      {row.profit.toLocaleString("en-US", {
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
      </div>
    </div>
  );
}
