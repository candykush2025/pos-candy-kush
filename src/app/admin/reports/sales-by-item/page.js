"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  subDays,
  format,
  startOfDay,
  endOfDay,
  isSameDay,
  differenceInDays,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
} from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  DateRangePicker,
  SalesBarChart,
  SalesLineChart,
  SalesPieChart,
  ReportDataTable,
  EmployeeFilter,
} from "@/components/reports";
import { receiptsService, productsService } from "@/lib/firebase/firestore";

export default function SalesByItemPage() {
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState([]);
  const [products, setProducts] = useState([]);
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
  const [chartType, setChartType] = useState("bar"); // bar, line, pie
  const [groupBy, setGroupBy] = useState("day"); // hour, day, week, month, quarter, year

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [receiptsData, productsData] = await Promise.all([
        receiptsService.getAll({ orderBy: ["createdAt", "desc"] }),
        productsService.getAll(),
      ]);
      setReceipts(receiptsData || []);
      setProducts(productsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load sales data");
    } finally {
      setLoading(false);
    }
  };

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

  // Aggregate sales by item (START FROM PRODUCTS, then match sales data)
  const itemSales = useMemo(() => {
    console.log(`📦 Starting with ${products.length} products`);

    // Step 1: Initialize from products (ensures correct categories)
    const itemMap = new Map(); // Product ID -> sales data
    const nameLookup = new Map(); // Normalized name -> Product ID (for lookup only)

    products.forEach((product) => {
      const productId = product.id;
      const productName = product.name || "Unknown Product";
      const category =
        product.categoryName ||
        product.category ||
        product.category_name ||
        "Uncategorized";
      const sku = product.sku || product.SKU || "";

      // Add to main itemMap with product ID as key
      itemMap.set(productId, {
        id: productId,
        name: productName,
        sku: sku,
        category: category,
        itemsSold: 0,
        grossSales: 0,
        itemsRefunded: 0,
        refunds: 0,
        discounts: 0,
        netSales: 0,
        costOfGoods: 0,
        grossProfit: 0,
        margin: 0,
        taxes: 0,
      });

      // Add to name lookup map (points to product ID, not the object)
      const normalizedName = productName.toLowerCase().trim();
      if (!nameLookup.has(normalizedName)) {
        nameLookup.set(normalizedName, productId);
      }
    });

    console.log(`📋 Initialized ${itemMap.size} items from products`);

    // Step 2: Aggregate sales from receipts
    let matchedItems = 0;
    let unmatchedItems = 0;

    filteredReceipts.forEach((receipt) => {
      const lineItems = receipt.lineItems || receipt.line_items || [];
      lineItems.forEach((item) => {
        const itemId = item.item_id || item.itemId || item.id || item.productId;
        const itemName =
          item.item_name || item.itemName || item.name || "Unknown Item";
        const quantity = item.quantity || 1;
        const price = item.price || item.item_price || 0;
        const lineTotal =
          item.line_total ||
          item.lineTotal ||
          item.total_money ||
          price * quantity;
        const cost = item.cost || item.item_cost || 0;
        const costTotal = cost * quantity;

        // PRIORITIZE matching by name (more reliable than ID for old receipts)
        const normalizedName = itemName.toLowerCase().trim();
        const productId = nameLookup.get(normalizedName);
        let productEntry = null;

        if (productId) {
          // Found by name - most reliable
          productEntry = itemMap.get(productId);
        } else if (itemId) {
          // Fallback: try by ID if name didn't match
          productEntry = itemMap.get(itemId);
        }

        if (productEntry) {
          // Found matching product - aggregate sales
          productEntry.itemsSold += quantity;
          productEntry.grossSales += lineTotal;
          productEntry.netSales += lineTotal;
          productEntry.costOfGoods += costTotal;
          matchedItems++;
        } else {
          // Product not found - create entry with "Uncategorized"
          console.warn(`⚠️ Receipt item not found in products:`, {
            itemId,
            itemName,
            normalizedName,
            receiptId: receipt.id,
            nameLookupHasIt: nameLookup.has(normalizedName),
            availableNames: Array.from(nameLookup.keys()).filter(
              (name) => name.includes("hulk") || name.includes("600")
            ),
          });

          const newKey = itemId || itemName;
          if (!itemMap.has(newKey)) {
            itemMap.set(newKey, {
              id: itemId || itemName,
              name: itemName,
              sku: item.sku || item.SKU || "",
              category: "Uncategorized",
              itemsSold: quantity,
              grossSales: lineTotal,
              itemsRefunded: 0,
              refunds: 0,
              discounts: 0,
              netSales: lineTotal,
              costOfGoods: costTotal,
              grossProfit: lineTotal - costTotal,
              margin:
                lineTotal > 0 ? ((lineTotal - costTotal) / lineTotal) * 100 : 0,
              taxes: 0,
            });
          }
          unmatchedItems++;
        }
      });
    });

    console.log(`✅ Matched ${matchedItems} receipt items to products`);
    console.log(`⚠️ ${unmatchedItems} receipt items not found in products`);

    // Step 3: Calculate final metrics and filter out products with no sales
    const items = Array.from(itemMap.values())
      .filter((item) => item.itemsSold > 0) // Only show items that were sold
      .map((item) => ({
        ...item,
        grossProfit: item.netSales - item.costOfGoods,
        margin:
          item.netSales > 0
            ? ((item.netSales - item.costOfGoods) / item.netSales) * 100
            : 0,
      }));

    console.log(`📊 Final report: ${items.length} items with sales`);
    return items.sort((a, b) => b.netSales - a.netSales);
  }, [filteredReceipts, products]);

  // Previous period item sales for comparison
  const previousItemSales = useMemo(() => {
    const itemMap = new Map();

    previousPeriodReceipts.forEach((receipt) => {
      const lineItems = receipt.lineItems || receipt.line_items || [];
      lineItems.forEach((item) => {
        const itemId = item.item_id || item.itemId || item.id || item.item_name;
        const quantity = item.quantity || 1;
        const price = item.price || item.item_price || 0;
        const lineTotal =
          item.line_total ||
          item.lineTotal ||
          item.total_money ||
          price * quantity;

        if (itemMap.has(itemId)) {
          const existing = itemMap.get(itemId);
          existing.quantity += quantity;
          existing.revenue += lineTotal;
        } else {
          itemMap.set(itemId, {
            id: itemId,
            quantity: quantity,
            revenue: lineTotal,
          });
        }
      });
    });

    return itemMap;
  }, [previousPeriodReceipts]);

  // Calculate summary metrics (using Loyverse field names)
  const metrics = useMemo(() => {
    const totalItemsSold = itemSales.reduce(
      (sum, item) => sum + item.itemsSold,
      0
    );
    const totalNetSales = itemSales.reduce(
      (sum, item) => sum + item.netSales,
      0
    );
    const totalGrossProfit = itemSales.reduce(
      (sum, item) => sum + item.grossProfit,
      0
    );
    const uniqueItems = itemSales.length;

    // Previous period
    let prevTotalItemsSold = 0;
    let prevTotalRevenue = 0;
    previousItemSales.forEach((item) => {
      prevTotalItemsSold += item.quantity;
      prevTotalRevenue += item.revenue;
    });

    return {
      totalItemsSold: { current: totalItemsSold, previous: prevTotalItemsSold },
      totalNetSales: { current: totalNetSales, previous: prevTotalRevenue },
      totalGrossProfit: { current: totalGrossProfit, previous: 0 },
      uniqueItems: { current: uniqueItems, previous: previousItemSales.size },
      averagePerItem: {
        current: uniqueItems > 0 ? totalNetSales / uniqueItems : 0,
        previous:
          previousItemSales.size > 0
            ? prevTotalRevenue / previousItemSales.size
            : 0,
      },
    };
  }, [itemSales, previousItemSales]);

  // Top 5 items for the sidebar with colors (Loyverse style)
  const top5Items = useMemo(() => {
    const colors = ["#78909c", "#9ccc65", "#42a5f5", "#ec407a", "#ffee58"];
    return itemSales.slice(0, 5).map((item, index) => ({
      ...item,
      color: colors[index % colors.length],
    }));
  }, [itemSales]);

  // Calculate available grouping options based on date range
  const groupingOptions = useMemo(() => {
    const daysDiff = differenceInDays(dateRange.to, dateRange.from);

    const options = [
      { value: "hour", label: "Hours", enabled: daysDiff <= 7 },
      { value: "day", label: "Days", enabled: true },
      { value: "week", label: "Weeks", enabled: daysDiff >= 7 },
      { value: "month", label: "Months", enabled: daysDiff >= 30 },
      { value: "quarter", label: "Quarters", enabled: daysDiff >= 90 },
      { value: "year", label: "Years", enabled: daysDiff >= 365 },
    ];

    return options;
  }, [dateRange]);

  // Auto-adjust groupBy when date range changes
  useEffect(() => {
    const enabledOption = groupingOptions.find(
      (opt) => opt.value === groupBy && opt.enabled
    );
    if (!enabledOption) {
      // Default to first enabled option
      const firstEnabled = groupingOptions.find((opt) => opt.enabled);
      if (firstEnabled) {
        setGroupBy(firstEnabled.value);
      }
    }
  }, [groupingOptions, groupBy]);

  // Chart data for stacked bar chart (top 5 items by hour/day)
  const chartData = useMemo(() => {
    const colors = ["#78909c", "#9ccc65", "#42a5f5", "#ec407a", "#ffee58"];
    const top5Names = top5Items.map((item) => item.name);

    // Group by time period
    const timeGroups = new Map();

    filteredReceipts.forEach((receipt) => {
      const receiptDate = getReceiptDate(receipt);
      let timeKey;
      let displayLabel;

      switch (groupBy) {
        case "hour":
          const hour = receiptDate.getHours();
          timeKey = hour;
          const ampm = hour >= 12 ? "PM" : "AM";
          const displayHour = hour % 12 || 12;
          displayLabel = `${displayHour
            .toString()
            .padStart(2, "0")}:00 ${ampm}`;
          break;
        case "day":
          timeKey = format(receiptDate, "yyyy-MM-dd");
          displayLabel = format(receiptDate, "MMM dd");
          break;
        case "week":
          const weekStart = startOfWeek(receiptDate);
          timeKey = format(weekStart, "yyyy-MM-dd");
          displayLabel = `Week of ${format(weekStart, "MMM dd")}`;
          break;
        case "month":
          const monthStart = startOfMonth(receiptDate);
          timeKey = format(monthStart, "yyyy-MM");
          displayLabel = format(monthStart, "MMM yyyy");
          break;
        case "quarter":
          const quarterStart = startOfQuarter(receiptDate);
          timeKey = format(quarterStart, "yyyy-Q");
          displayLabel = `Q${
            Math.floor(quarterStart.getMonth() / 3) + 1
          } ${quarterStart.getFullYear()}`;
          break;
        case "year":
          const yearStart = startOfYear(receiptDate);
          timeKey = format(yearStart, "yyyy");
          displayLabel = format(yearStart, "yyyy");
          break;
        default:
          timeKey = format(receiptDate, "yyyy-MM-dd");
          displayLabel = format(receiptDate, "MMM dd");
      }

      if (!timeGroups.has(timeKey)) {
        timeGroups.set(timeKey, {
          timeKey,
          displayLabel,
          items: {},
        });
      }

      const group = timeGroups.get(timeKey);
      const lineItems = receipt.lineItems || receipt.line_items || [];

      lineItems.forEach((item) => {
        const itemName =
          item.item_name || item.itemName || item.name || "Unknown Item";
        const price = item.price || item.item_price || 0;
        const quantity = item.quantity || 1;
        const lineTotal =
          item.line_total ||
          item.lineTotal ||
          item.total_money ||
          price * quantity;

        if (top5Names.includes(itemName)) {
          group.items[itemName] = (group.items[itemName] || 0) + lineTotal;
        }
      });
    });

    // Convert to array and sort
    let result = Array.from(timeGroups.values());

    if (groupBy === "hour") {
      // Sort by hour
      result.sort((a, b) => a.timeKey - b.timeKey);
      // Fill in missing hours
      const filledResult = [];
      for (let hour = 0; hour < 24; hour++) {
        const existing = result.find((r) => r.timeKey === hour);
        const ampm = hour >= 12 ? "PM" : "AM";
        const displayHour = hour % 12 || 12;
        const displayLabel = `${displayHour
          .toString()
          .padStart(2, "0")}:00 ${ampm}`;
        filledResult.push(
          existing || { timeKey: hour, displayLabel, items: {} }
        );
      }
      result = filledResult;
    } else {
      result.sort((a, b) => a.timeKey.localeCompare(b.timeKey));
    }

    // Transform for chart
    return result.map((group) => {
      const chartPoint = { name: group.displayLabel };
      top5Items.forEach((item, index) => {
        chartPoint[item.name] = group.items[item.name] || 0;
        chartPoint[`${item.name}Color`] = colors[index];
      });
      return chartPoint;
    });
  }, [filteredReceipts, top5Items, groupBy]);

  // Top 10 items for bar chart
  const topItemsChartData = useMemo(() => {
    return itemSales.slice(0, 10).map((item) => ({
      name:
        item.name.length > 20 ? item.name.substring(0, 20) + "..." : item.name,
      value: item.revenue,
      fullName: item.name,
    }));
  }, [itemSales]);

  // Table columns (Loyverse style - matching exactly)
  const tableColumns = [
    {
      key: "name",
      label: "Item",
      sortable: true,
      render: (value) => (
        <span className="font-medium text-neutral-900 dark:text-neutral-100">
          {value}
        </span>
      ),
    },
    {
      key: "sku",
      label: "SKU",
      sortable: true,
      hidden: true, // Optional column (hidden by default like Loyverse)
    },
    {
      key: "category",
      label: "Category",
      sortable: true,
    },
    {
      key: "itemsSold",
      label: "Items sold",
      format: "number",
      align: "right",
      sortable: true,
    },
    {
      key: "grossSales",
      label: "Gross sales",
      format: "currency",
      align: "right",
      sortable: true,
      hidden: true, // Optional column (hidden by default)
    },
    {
      key: "itemsRefunded",
      label: "Items refunded",
      format: "number",
      align: "right",
      sortable: true,
      hidden: true, // Optional column (hidden by default)
    },
    {
      key: "refunds",
      label: "Refunds",
      format: "currency",
      align: "right",
      sortable: true,
      hidden: true, // Optional column (hidden by default)
    },
    {
      key: "discounts",
      label: "Discounts",
      format: "currency",
      align: "right",
      sortable: true,
      hidden: true, // Optional column (hidden by default)
    },
    {
      key: "netSales",
      label: "Net sales",
      format: "currency",
      align: "right",
      sortable: true,
    },
    {
      key: "costOfGoods",
      label: "Cost of goods",
      format: "currency",
      align: "right",
      sortable: true,
    },
    {
      key: "grossProfit",
      label: "Gross profit",
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
      hidden: true, // Optional column (hidden by default)
      render: (value) => (
        <span
          className={
            value >= 30
              ? "text-green-600 dark:text-green-400"
              : value >= 15
              ? "text-yellow-600 dark:text-yellow-400"
              : "text-red-600 dark:text-red-400"
          }
        >
          {value.toFixed(1)}%
        </span>
      ),
    },
    {
      key: "taxes",
      label: "Taxes",
      format: "currency",
      align: "right",
      sortable: true,
      hidden: true, // Optional column (hidden by default)
    },
  ];

  // Sorting (default by Net sales descending, like Loyverse)
  const [sortConfig, setSortConfig] = useState({
    key: "netSales",
    order: "desc",
  });

  const sortedTableData = useMemo(() => {
    return [...itemSales].sort((a, b) => {
      if (typeof a[sortConfig.key] === "string") {
        return sortConfig.order === "asc"
          ? a[sortConfig.key].localeCompare(b[sortConfig.key])
          : b[sortConfig.key].localeCompare(a[sortConfig.key]);
      }
      return sortConfig.order === "asc"
        ? a[sortConfig.key] - b[sortConfig.key]
        : b[sortConfig.key] - a[sortConfig.key];
    });
  }, [itemSales, sortConfig]);

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
          Sales by Item
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

      {/* Top 5 Items + Chart Grid (Loyverse style - Cleaner, Less Boxy) */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Top 5 Items Sidebar */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Top 5 items
              </h3>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                Net sales
              </span>
            </div>
            <div className="space-y-3">
              {top5Items.length === 0 ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">
                  No sales data
                </p>
              ) : (
                top5Items.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span
                        className="text-sm text-neutral-700 dark:text-neutral-300 truncate"
                        title={item.name}
                      >
                        {item.name.length > 25
                          ? item.name.substring(0, 25) + "..."
                          : item.name}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                      ฿
                      {item.netSales.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sales by Item Chart */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Sales by item chart
              </h3>
              <div className="flex items-center gap-3">
                {/* Chart Type Selector */}
                <Select value={chartType} onValueChange={setChartType}>
                  <SelectTrigger className="w-[110px] h-9">
                    <SelectValue placeholder="Chart type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="line">Line</SelectItem>
                    <SelectItem value="pie">Pie</SelectItem>
                  </SelectContent>
                </Select>

                {/* Grouping Selector (only for bar and line charts) */}
                {chartType !== "pie" && (
                  <Select value={groupBy} onValueChange={setGroupBy}>
                    <SelectTrigger className="w-[110px] h-9">
                      <SelectValue placeholder="Group by" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupingOptions.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          disabled={!option.enabled}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div className="mt-2">
              {chartData.length > 0 && top5Items.length > 0 ? (
                <>
                  {chartType === "bar" && (
                    <SalesBarChart
                      data={chartData}
                      dataKeys={top5Items.map((item) => item.name)}
                      colors={top5Items.map((item) => item.color)}
                      xAxisKey="name"
                      height={300}
                      stacked={true}
                      layout="horizontal"
                      formatTooltip={(value) =>
                        `฿${value.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}`
                      }
                    />
                  )}
                  {chartType === "line" && (
                    <SalesLineChart
                      data={chartData}
                      dataKeys={top5Items.map((item) => item.name)}
                      colors={top5Items.map((item) => item.color)}
                      xAxisKey="name"
                      height={300}
                      formatTooltip={(value) =>
                        `฿${value.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}`
                      }
                    />
                  )}
                  {chartType === "pie" && (
                    <SalesPieChart
                      data={top5Items.map((item) => ({
                        name: item.name,
                        value: item.netSales,
                        color: item.color,
                      }))}
                      height={300}
                      formatTooltip={(value) =>
                        `฿${value.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}`
                      }
                    />
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-neutral-500 dark:text-neutral-400">
                  No sales data for the selected period
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <ReportDataTable
        columns={tableColumns}
        data={sortedTableData}
        onSort={handleSort}
        sortBy={sortConfig.key}
        sortOrder={sortConfig.order}
        exportFilename={`sales-by-item-${format(
          dateRange.from,
          "yyyy-MM-dd"
        )}-${format(dateRange.to, "yyyy-MM-dd")}`}
      />
    </div>
  );
}
