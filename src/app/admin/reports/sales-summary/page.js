"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  ChevronDown,
  BarChart2,
  LineChart as LineChartIcon,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  subDays,
  format,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  eachHourOfInterval,
  parseISO,
  isSameDay,
} from "date-fns";

import {
  DateRangePicker,
  MetricCard,
  MetricsRow,
  SalesAreaChart,
  SalesBarChart,
  ReportDataTable,
  EmployeeFilter,
} from "@/components/reports";
import { useReceipts } from "@/hooks/useReportData";

const GROUP_BY_OPTIONS = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];

const CHART_TYPE_OPTIONS = [
  { label: "Area", value: "area", icon: LineChartIcon },
  { label: "Bar", value: "bar", icon: BarChart2 },
];

export default function SalesSummaryPage() {
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
  const [groupBy, setGroupBy] = useState("day");
  const [chartType, setChartType] = useState("area");
  const [activeMetric, setActiveMetric] = useState("grossSales");
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

  // Helper to get receipt tax
  const getReceiptTax = (receipt) => {
    return receipt.totalTax || receipt.total_tax || receipt.tax || 0;
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

  // Calculate previous period receipts for comparison
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
        receiptDate <= endOfDay(previousTo)
      );
    });
  }, [receipts, dateRange]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const currentGrossSales = filteredReceipts
      .filter((r) => r.receiptType !== "REFUND")
      .reduce((sum, r) => sum + getReceiptTotal(r), 0);

    const currentRefunds = filteredReceipts
      .filter((r) => r.receiptType === "REFUND")
      .reduce((sum, r) => sum + Math.abs(getReceiptTotal(r)), 0);

    const currentDiscounts = filteredReceipts.reduce(
      (sum, r) => sum + getReceiptDiscount(r),
      0
    );

    const currentNetSales =
      currentGrossSales - currentRefunds - currentDiscounts;

    // Calculate cost of goods (if available)
    const currentCostOfGoods = filteredReceipts.reduce((sum, receipt) => {
      const lineItems = receipt.lineItems || receipt.line_items || [];
      return (
        sum +
        lineItems.reduce((itemSum, item) => {
          const cost = item.cost || item.item_cost || 0;
          const qty = item.quantity || 1;
          return itemSum + cost * qty;
        }, 0)
      );
    }, 0);

    const currentGrossProfit = currentNetSales - currentCostOfGoods;
    const currentMargin =
      currentNetSales > 0 ? (currentGrossProfit / currentNetSales) * 100 : 0;

    // Previous period calculations
    const prevGrossSales = previousPeriodReceipts
      .filter((r) => r.receiptType !== "REFUND")
      .reduce((sum, r) => sum + getReceiptTotal(r), 0);

    const prevRefunds = previousPeriodReceipts
      .filter((r) => r.receiptType === "REFUND")
      .reduce((sum, r) => sum + Math.abs(getReceiptTotal(r)), 0);

    const prevDiscounts = previousPeriodReceipts.reduce(
      (sum, r) => sum + getReceiptDiscount(r),
      0
    );

    const prevNetSales = prevGrossSales - prevRefunds - prevDiscounts;

    const prevCostOfGoods = previousPeriodReceipts.reduce((sum, receipt) => {
      const lineItems = receipt.lineItems || receipt.line_items || [];
      return (
        sum +
        lineItems.reduce((itemSum, item) => {
          const cost = item.cost || item.item_cost || 0;
          const qty = item.quantity || 1;
          return itemSum + cost * qty;
        }, 0)
      );
    }, 0);

    const prevGrossProfit = prevNetSales - prevCostOfGoods;

    return {
      grossSales: { current: currentGrossSales, previous: prevGrossSales },
      refunds: { current: currentRefunds, previous: prevRefunds },
      discounts: { current: currentDiscounts, previous: prevDiscounts },
      netSales: { current: currentNetSales, previous: prevNetSales },
      grossProfit: { current: currentGrossProfit, previous: prevGrossProfit },
      margin: { current: currentMargin, previous: 0 },
      costOfGoods: { current: currentCostOfGoods, previous: prevCostOfGoods },
    };
  }, [filteredReceipts, previousPeriodReceipts]);

  // Prepare chart data grouped by day/week/month OR by hour for single day
  const chartData = useMemo(() => {
    // Check if it's a single day view
    const isSingleDay = isSameDay(dateRange.from, dateRange.to);

    if (isSingleDay) {
      // Generate hourly data for single day
      const hours = eachHourOfInterval({
        start: startOfDay(dateRange.from),
        end: endOfDay(dateRange.from),
      });

      return hours.map((hour) => {
        const hourEnd = new Date(hour);
        hourEnd.setMinutes(59, 59, 999);

        const hourReceipts = filteredReceipts.filter((receipt) => {
          const receiptDate = getReceiptDate(receipt);
          return receiptDate >= hour && receiptDate <= hourEnd;
        });

        const grossSales = hourReceipts
          .filter((r) => r.receiptType !== "REFUND")
          .reduce((sum, r) => sum + getReceiptTotal(r), 0);

        const refunds = hourReceipts
          .filter((r) => r.receiptType === "REFUND")
          .reduce((sum, r) => sum + Math.abs(getReceiptTotal(r)), 0);

        const discounts = hourReceipts.reduce(
          (sum, r) => sum + getReceiptDiscount(r),
          0
        );

        const netSales = grossSales - refunds - discounts;

        const costOfGoods = hourReceipts.reduce((sum, receipt) => {
          const lineItems = receipt.lineItems || receipt.line_items || [];
          return (
            sum +
            lineItems.reduce((itemSum, item) => {
              const cost = item.cost || item.item_cost || 0;
              const qty = item.quantity || 1;
              return itemSum + cost * qty;
            }, 0)
          );
        }, 0);

        const grossProfit = netSales - costOfGoods;

        return {
          date: format(hour, "hh:mm a"),
          fullDate: hour,
          grossSales,
          refunds,
          discounts,
          netSales,
          grossProfit,
          costOfGoods,
        };
      });
    }

    // Multi-day view - group by day
    const days = eachDayOfInterval({
      start: dateRange.from,
      end: dateRange.to,
    });

    return days.map((day) => {
      const dayReceipts = filteredReceipts.filter((receipt) => {
        const receiptDate = getReceiptDate(receipt);
        return receiptDate >= startOfDay(day) && receiptDate <= endOfDay(day);
      });

      const grossSales = dayReceipts
        .filter((r) => r.receiptType !== "REFUND")
        .reduce((sum, r) => sum + getReceiptTotal(r), 0);

      const refunds = dayReceipts
        .filter((r) => r.receiptType === "REFUND")
        .reduce((sum, r) => sum + Math.abs(getReceiptTotal(r)), 0);

      const discounts = dayReceipts.reduce(
        (sum, r) => sum + getReceiptDiscount(r),
        0
      );

      const netSales = grossSales - refunds - discounts;

      const costOfGoods = dayReceipts.reduce((sum, receipt) => {
        const lineItems = receipt.lineItems || receipt.line_items || [];
        return (
          sum +
          lineItems.reduce((itemSum, item) => {
            const cost = item.cost || item.item_cost || 0;
            const qty = item.quantity || 1;
            return itemSum + cost * qty;
          }, 0)
        );
      }, 0);

      const grossProfit = netSales - costOfGoods;

      return {
        date: format(day, "MMM dd"),
        fullDate: day,
        grossSales,
        refunds,
        discounts,
        netSales,
        grossProfit,
        costOfGoods,
      };
    });
  }, [filteredReceipts, dateRange]);

  // Get the data key for the active metric
  const getActiveMetricKey = () => {
    switch (activeMetric) {
      case "grossSales":
        return "grossSales";
      case "refunds":
        return "refunds";
      case "discounts":
        return "discounts";
      case "netSales":
        return "netSales";
      case "grossProfit":
        return "grossProfit";
      default:
        return "grossSales";
    }
  };

  // Check if single day for table header
  const isSingleDayView = isSameDay(dateRange.from, dateRange.to);

  // Table columns
  const tableColumns = [
    { key: "date", label: isSingleDayView ? "Time" : "Date", sortable: true },
    {
      key: "grossSales",
      label: "Gross Sales",
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
      label: "Net Sales",
      format: "currency",
      align: "right",
      sortable: true,
    },
    {
      key: "costOfGoods",
      label: "Cost of Goods",
      format: "currency",
      align: "right",
      sortable: true,
    },
    {
      key: "grossProfit",
      label: "Gross Profit",
      format: "currency",
      align: "right",
      sortable: true,
    },
  ];

  // Sorted table data
  const [sortConfig, setSortConfig] = useState({ key: "date", order: "desc" });

  const sortedTableData = useMemo(() => {
    const sorted = [...chartData].sort((a, b) => {
      if (sortConfig.key === "date") {
        return sortConfig.order === "asc"
          ? a.fullDate - b.fullDate
          : b.fullDate - a.fullDate;
      }
      return sortConfig.order === "asc"
        ? a[sortConfig.key] - b[sortConfig.key]
        : b[sortConfig.key] - a[sortConfig.key];
    });
    return sorted;
  }, [chartData, sortConfig]);

  const handleSort = (key, order) => {
    setSortConfig({ key, order });
  };

  // Get metric label
  const getMetricLabel = () => {
    switch (activeMetric) {
      case "grossSales":
        return "Gross Sales";
      case "refunds":
        return "Refunds";
      case "discounts":
        return "Discounts";
      case "netSales":
        return "Net Sales";
      case "grossProfit":
        return "Gross Profit";
      default:
        return "Gross Sales";
    }
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
          Sales Summary
          {isFetching && !loading && (
            <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="h-4 w-4 inline animate-spin" /> Updating...
            </span>
          )}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              toast.success("Data refreshed");
            }}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
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

      {/* Metrics Cards */}
      <MetricsRow>
        <MetricCard
          title="Gross Sales"
          value={metrics.grossSales.current}
          previousValue={metrics.grossSales.previous}
          tooltip="The sum of all sales before discounts and refunds"
          isActive={activeMetric === "grossSales"}
          onClick={() => setActiveMetric("grossSales")}
        />
        <MetricCard
          title="Refunds"
          value={metrics.refunds.current}
          previousValue={metrics.refunds.previous}
          tooltip="The sum of all returned items' prices before discounts"
          isActive={activeMetric === "refunds"}
          onClick={() => setActiveMetric("refunds")}
        />
        <MetricCard
          title="Discounts"
          value={metrics.discounts.current}
          previousValue={metrics.discounts.previous}
          tooltip="The sum of discounts on sales minus discounts on refunds"
          isActive={activeMetric === "discounts"}
          onClick={() => setActiveMetric("discounts")}
        />
        <MetricCard
          title="Net Sales"
          value={metrics.netSales.current}
          previousValue={metrics.netSales.previous}
          tooltip="Gross sales minus discounts and refunds"
          isActive={activeMetric === "netSales"}
          onClick={() => setActiveMetric("netSales")}
        />
        <MetricCard
          title="Gross Profit"
          value={metrics.grossProfit.current}
          previousValue={metrics.grossProfit.previous}
          tooltip="Net sales minus cost of goods"
          isActive={activeMetric === "grossProfit"}
          onClick={() => setActiveMetric("grossProfit")}
        />
      </MetricsRow>

      {/* Chart Controls */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">
            {getMetricLabel()}
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Group By Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  Group by:{" "}
                  {GROUP_BY_OPTIONS.find((o) => o.value === groupBy)?.label}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {GROUP_BY_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setGroupBy(option.value)}
                    className={
                      groupBy === option.value
                        ? "bg-green-100 dark:bg-green-900/30"
                        : ""
                    }
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Chart Type Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  {CHART_TYPE_OPTIONS.find((o) => o.value === chartType)?.label}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {CHART_TYPE_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setChartType(option.value)}
                    className={
                      chartType === option.value
                        ? "bg-green-100 dark:bg-green-900/30"
                        : ""
                    }
                  >
                    <option.icon className="h-4 w-4 mr-2" />
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {chartType === "area" ? (
            <SalesAreaChart
              data={chartData}
              dataKey={getActiveMetricKey()}
              xAxisKey="date"
              height={350}
            />
          ) : (
            <SalesBarChart
              data={chartData}
              dataKey={getActiveMetricKey()}
              xAxisKey="date"
              height={350}
              layout="horizontal"
            />
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      <ReportDataTable
        columns={tableColumns}
        data={sortedTableData}
        onSort={handleSort}
        sortBy={sortConfig.key}
        sortOrder={sortConfig.order}
        exportFilename={`sales-summary-${format(
          dateRange.from,
          "yyyy-MM-dd"
        )}-${format(dateRange.to, "yyyy-MM-dd")}`}
      />
    </div>
  );
}
