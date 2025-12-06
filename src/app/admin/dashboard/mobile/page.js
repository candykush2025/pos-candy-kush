"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  receiptsService,
  productsService,
  customersService,
  categoriesService,
} from "@/lib/firebase/firestore";
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  Calendar,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Percent,
  Clock,
  AlertTriangle,
  Crown,
  Tag,
  ChevronDown,
  List,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function MobileDashboardPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  const [stats, setStats] = useState({
    totalRevenue: 0,
    todayRevenue: 0,
    monthRevenue: 0,
    totalOrders: 0,
    monthOrders: 0,
    avgOrderValue: 0,
    totalCustomers: 0,
    grossProfit: 0,
    grossProfitMargin: 0,
    totalCost: 0,
    newCustomers: 0,
    repeatCustomers: 0,
    repeatCustomerRate: 0,
    revenueChange: 0,
    todayChange: 0,
    ordersChange: 0,
  });

  const [topProducts, setTopProducts] = useState([]);
  const [allSoldProducts, setAllSoldProducts] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [dailySalesData, setDailySalesData] = useState([]);
  const [hourlySalesData, setHourlySalesData] = useState([]);
  const [paymentMethodsData, setPaymentMethodsData] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [customersMap, setCustomersMap] = useState({});
  const [allReceipts, setAllReceipts] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null); // For peak hours day selection

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters - same as desktop
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDateRange, setSelectedDateRange] = useState("thisMonth");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Custom date range picker
  const [showCustomPeriodModal, setShowCustomPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState([null, null]);
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [selectedDateRangeLabel, setSelectedDateRangeLabel] =
    useState("This Month");

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dateRangeOptions = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "thisWeek", label: "This Week" },
    { value: "thisMonth", label: "This Month" },
    { value: "thisYear", label: "This Year" },
    { value: "customPeriod", label: "Custom Period" },
  ];

  // Redirect to desktop on larger screens
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth >= 1024) {
        router.push("/admin/dashboard");
      }
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, [router]);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await categoriesService.getAll();
        setCategories(data || []);
      } catch (error) {
        console.error("Error loading categories:", error);
      }
    };
    loadCategories();
  }, []);

  // Load customers for name resolution
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const customers = await customersService.getAll();
        const map = {};
        customers.forEach((c) => {
          if (c.id) map[c.id] = c.name || c.fullName || "Unknown";
          if (c.customerId)
            map[c.customerId] = c.name || c.fullName || "Unknown";
          if (c.loyverseId)
            map[c.loyverseId] = c.name || c.fullName || "Unknown";
        });
        setCustomersMap(map);
      } catch (error) {
        console.error("Error loading customers:", error);
      }
    };
    loadCustomers();
  }, []);

  const getCustomerName = (customerId, customerName) => {
    if (
      customerName &&
      customerName !== "Guest" &&
      customerName !== "Anonymous" &&
      customerName !== "Walk-in Customer"
    ) {
      return customerName;
    }
    if (customerId && customersMap[customerId]) {
      return customersMap[customerId];
    }
    if (customerId) {
      const shortId =
        customerId.length > 8
          ? customerId.slice(-6).toUpperCase()
          : customerId.toUpperCase();
      return `#${shortId}`;
    }
    return "Walk-in";
  };

  // Get Order ID from receipt
  const getOrderId = (receipt) => {
    return (
      receipt.receiptNumber ||
      receipt.receipt_number ||
      (receipt.id ? `#${receipt.id.slice(-6).toUpperCase()}` : "N/A")
    );
  };

  // Get member name if customer is not walk-in
  const getMemberName = (customerId, customerName) => {
    if (
      customerName &&
      customerName !== "Guest" &&
      customerName !== "Anonymous" &&
      customerName !== "Walk-in Customer" &&
      customerName !== "Walk-in"
    ) {
      return customerName;
    }
    if (customerId && customersMap[customerId]) {
      return customersMap[customerId];
    }
    return null;
  };

  // Calculate hourly sales for a specific day
  const calculateHourlySalesForDay = (dayNumber) => {
    const hourlySales = Array(24)
      .fill(null)
      .map(() => ({ revenue: 0, orders: 0 }));

    const { startDate } = getDateRange();
    const targetDate = new Date(startDate);
    targetDate.setDate(startDate.getDate() + dayNumber - 1);

    allReceipts.forEach((receipt) => {
      const receiptDate =
        receipt.createdAt?.toDate?.() || new Date(receipt.createdAt);
      if (!receiptDate || isNaN(receiptDate.getTime())) return;

      // Check if receipt is from the target day
      if (
        receiptDate.getFullYear() === targetDate.getFullYear() &&
        receiptDate.getMonth() === targetDate.getMonth() &&
        receiptDate.getDate() === targetDate.getDate()
      ) {
        const total =
          receipt.total || receipt.totalAmount || receipt.total_money || 0;
        const hour = receiptDate.getHours();
        hourlySales[hour].revenue += total;
        hourlySales[hour].orders++;
      }
    });

    return hourlySales.map((data, hour) => ({
      label: `${hour}:00`,
      revenue: data.revenue,
      orders: data.orders,
    }));
  };

  // Handle click on daily sales bar
  const handleDayClick = (data) => {
    if (data && data.day) {
      const dayNumber = parseInt(data.day);
      setSelectedDay(dayNumber);
      const hourlyData = calculateHourlySalesForDay(dayNumber);
      setHourlySalesData(hourlyData);
    }
  };

  // Get selected day date string for Peak Hours title
  const getSelectedDayDateString = () => {
    if (!selectedDay) return "Today's sales by hour";
    const { startDate } = getDateRange();
    const targetDate = new Date(startDate);
    targetDate.setDate(startDate.getDate() + selectedDay - 1);
    return targetDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Format day number to full date for tooltip
  const formatDayToFullDate = (dayNumber) => {
    const { startDate } = getDateRange();
    const targetDate = new Date(startDate);
    targetDate.setDate(startDate.getDate() + parseInt(dayNumber) - 1);
    return targetDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Load dashboard data
  useEffect(() => {
    if (!user && !isAuthenticated) {
      router.push("/login");
      return;
    }
    loadDashboardData();
  }, [
    user,
    isAuthenticated,
    router,
    selectedCategory,
    selectedDateRange,
    selectedMonth,
    selectedYear,
    customStartDate,
    customEndDate,
  ]);

  // Get date range based on selection
  const getDateRange = () => {
    const now = new Date();
    let startDate, endDate;

    switch (selectedDateRange) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
          yesterday.getDate()
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
      case "thisWeek":
        const dayOfWeek = now.getDay();
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - dayOfWeek
        );
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + (6 - dayOfWeek),
          23,
          59,
          59
        );
        break;
      case "thisYear":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      case "customPeriod":
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59);
        } else {
          // Default to this month if no custom range selected
          startDate = new Date(selectedYear, selectedMonth, 1);
          endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
        }
        break;
      case "thisMonth":
      default:
        startDate = new Date(selectedYear, selectedMonth, 1);
        endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
        break;
    }
    return { startDate, endDate };
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const receipts = await receiptsService.getAll();
      const products = await productsService.getAll();
      const customers = await customersService.getAll();

      // Store receipts for later use (peak hours by day)
      setAllReceipts(receipts);
      setSelectedDay(null); // Reset selected day when data reloads

      // Build product-to-category map
      const productCategoryMap = {};
      products.forEach((p) => {
        if (p.id) productCategoryMap[p.id] = p.categoryId || p.category_id;
        if (p.loyverseId)
          productCategoryMap[p.loyverseId] = p.categoryId || p.category_id;
      });

      const { startDate, endDate } = getDateRange();
      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      // Calculate comparison period
      const periodDays = Math.ceil(
        (endDate - startDate) / (1000 * 60 * 60 * 24)
      );
      const comparisonStart = new Date(
        startDate.getTime() - periodDays * 24 * 60 * 60 * 1000
      );
      const comparisonEnd = new Date(startDate.getTime() - 1);

      let todayRevenue = 0,
        periodRevenue = 0,
        lastPeriodRevenue = 0;
      let todayOrders = 0,
        periodOrders = 0,
        lastPeriodOrders = 0;
      let totalCost = 0,
        grossProfit = 0;
      const productSales = {};
      const customerSales = {};
      const dailySales = {};
      const hourlySales = Array(24)
        .fill(null)
        .map(() => ({ revenue: 0, orders: 0 }));
      const paymentMethods = {};

      receipts.forEach((receipt) => {
        const receiptDate =
          receipt.createdAt?.toDate?.() || new Date(receipt.createdAt);
        if (!receiptDate || isNaN(receiptDate.getTime())) return;

        // Category filter
        if (selectedCategory !== "all") {
          const items =
            receipt.lineItems || receipt.line_items || receipt.items || [];
          const hasMatchingItem = items.some((item) => {
            const itemId = item.item_id || item.itemId || item.id;
            const itemCategoryId = productCategoryMap[itemId];
            return itemCategoryId === selectedCategory;
          });
          if (!hasMatchingItem) return;
        }

        const total =
          receipt.total || receipt.totalAmount || receipt.total_money || 0;
        const cost = receipt.totalCost || 0;

        // Current period
        if (receiptDate >= startDate && receiptDate <= endDate) {
          periodRevenue += total;
          periodOrders++;
          totalCost += cost;
          grossProfit += total - cost;

          // Daily sales
          const dayKey = receiptDate.getDate();
          if (!dailySales[dayKey])
            dailySales[dayKey] = { revenue: 0, orders: 0 };
          dailySales[dayKey].revenue += total;
          dailySales[dayKey].orders++;
        }

        // Comparison period
        if (receiptDate >= comparisonStart && receiptDate <= comparisonEnd) {
          lastPeriodRevenue += total;
          lastPeriodOrders++;
        }

        // Today
        if (receiptDate >= todayStart) {
          todayRevenue += total;
          todayOrders++;

          // Hourly data
          const hour = receiptDate.getHours();
          hourlySales[hour].revenue += total;
          hourlySales[hour].orders++;
        }

        // Product sales (only for current period)
        if (receiptDate >= startDate && receiptDate <= endDate) {
          const items =
            receipt.lineItems || receipt.line_items || receipt.items || [];
          items.forEach((item) => {
            const itemId = item.item_id || item.itemId || item.id;
            const itemCategoryId = productCategoryMap[itemId];

            // Category filter for items
            if (selectedCategory !== "all") {
              if (itemCategoryId !== selectedCategory) return;
            }
            const name = item.item_name || item.name || "Unknown";
            if (!productSales[name])
              productSales[name] = {
                quantity: 0,
                revenue: 0,
                categoryId: itemCategoryId,
              };
            productSales[name].quantity += item.quantity || 1;
            productSales[name].revenue +=
              item.total_money ||
              item.total ||
              item.price * (item.quantity || 1) ||
              0;
          });

          // Customer sales
          const custId = receipt.customerId || receipt.customer_id;
          if (custId) {
            if (!customerSales[custId]) {
              customerSales[custId] = {
                total: 0,
                orders: 0,
                name: receipt.customerName || receipt.customer_name,
              };
            }
            customerSales[custId].total += total;
            customerSales[custId].orders++;
          }

          // Payment methods
          if (receipt.payments && Array.isArray(receipt.payments)) {
            receipt.payments.forEach((p) => {
              const method = p.name || p.type || "Cash";
              if (!paymentMethods[method]) paymentMethods[method] = 0;
              paymentMethods[method] += p.money_amount || p.amount || 0;
            });
          } else {
            const method = receipt.paymentMethod || "Cash";
            if (!paymentMethods[method]) paymentMethods[method] = 0;
            paymentMethods[method] += total;
          }
        }
      });

      // Calculate changes
      const revenueChange =
        lastPeriodRevenue > 0
          ? ((periodRevenue - lastPeriodRevenue) / lastPeriodRevenue) * 100
          : 0;
      const ordersChange =
        lastPeriodOrders > 0
          ? ((periodOrders - lastPeriodOrders) / lastPeriodOrders) * 100
          : 0;
      const grossProfitMargin =
        periodRevenue > 0 ? (grossProfit / periodRevenue) * 100 : 0;

      setStats({
        totalRevenue: periodRevenue,
        todayRevenue,
        monthRevenue: periodRevenue,
        totalOrders: receipts.length,
        monthOrders: periodOrders,
        avgOrderValue: periodOrders > 0 ? periodRevenue / periodOrders : 0,
        totalCustomers: customers.length,
        grossProfit,
        grossProfitMargin,
        totalCost,
        newCustomers: 0,
        repeatCustomers: Object.keys(customerSales).length,
        repeatCustomerRate: 0,
        revenueChange,
        todayChange: 0,
        ordersChange,
      });

      // Top products
      setTopProducts(
        Object.entries(productSales)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
      );

      // All sold products (for detailed view)
      setAllSoldProducts(
        Object.entries(productSales)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
      );

      // Top customers
      setTopCustomers(
        Object.entries(customerSales)
          .map(([id, data]) => ({ id, ...data }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5)
      );

      // Daily sales chart - use selected date range
      const daysInPeriod = Math.ceil(
        (endDate - startDate) / (1000 * 60 * 60 * 24)
      );
      const dailyChartData = [];
      for (let d = 1; d <= Math.min(daysInPeriod, 31); d++) {
        dailyChartData.push({
          day: d.toString(),
          revenue: dailySales[d]?.revenue || 0,
        });
      }
      setDailySalesData(dailyChartData);

      // Hourly chart
      const hourlyChartData = hourlySales.map((data, hour) => ({
        label: `${hour}:00`,
        revenue: data.revenue,
        orders: data.orders,
      }));
      setHourlySalesData(hourlyChartData);

      // Payment methods
      const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
      setPaymentMethodsData(
        Object.entries(paymentMethods).map(([name, value], i) => ({
          name,
          value,
          color: COLORS[i % COLORS.length],
        }))
      );

      // Low stock
      setLowStockProducts(
        products
          .filter(
            (p) => (p.stock || p.quantity || 0) <= (p.lowStockThreshold || 10)
          )
          .slice(0, 5)
      );

      // Recent transactions
      setRecentTransactions(
        [...receipts]
          .sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
            const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
            return dateB - dateA;
          })
          .slice(0, 5)
      );
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

  // Dynamic titles based on date range
  const getPeriodTitle = (type) => {
    switch (selectedDateRange) {
      case "today":
        return type === "revenue" ? "Today Revenue" : "Today Orders";
      case "yesterday":
        return type === "revenue" ? "Yesterday Revenue" : "Yesterday Orders";
      case "thisWeek":
        return type === "revenue" ? "Week Revenue" : "Week Orders";
      case "thisYear":
        return type === "revenue" ? "Year Revenue" : "Year Orders";
      case "customPeriod":
        return type === "revenue" ? "Period Revenue" : "Period Orders";
      case "thisMonth":
      default:
        return type === "revenue" ? "Month Revenue" : "Month Orders";
    }
  };

  const statCards = [
    {
      title: getPeriodTitle("revenue"),
      value: formatCurrency(stats.monthRevenue),
      change: stats.revenueChange,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
    {
      title: "Gross Profit",
      value: formatCurrency(stats.grossProfit),
      change: stats.grossProfitMargin,
      icon: Percent,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      isPercentage: true,
    },
    {
      title: "Today's Sales",
      value: formatCurrency(stats.todayRevenue),
      change: stats.todayChange,
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: getPeriodTitle("orders"),
      value: stats.monthOrders,
      change: stats.ordersChange,
      icon: ShoppingCart,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      title: "Avg Order",
      value: formatCurrency(stats.avgOrderValue),
      icon: CreditCard,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
    },
    {
      title: "Customers",
      value: stats.totalCustomers,
      icon: Users,
      color: "text-pink-600",
      bgColor: "bg-pink-100 dark:bg-pink-900/30",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-2xl text-neutral-600 dark:text-neutral-400">
            Loading Dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-bold text-neutral-900 dark:text-white">
            Sales Dashboard
          </h1>
          <p className="text-2xl text-neutral-500 dark:text-neutral-400 mt-2">
            Analytics Overview
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          size="lg"
          className="h-16 px-6 text-xl"
        >
          <RefreshCw
            className={`h-7 w-7 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Filters Section */}
      <div className="flex flex-col gap-4">
        {/* Category Filter */}
        <div className="relative">
          <Button
            onClick={() => setShowCategoryPicker(!showCategoryPicker)}
            variant="outline"
            className="w-full h-16 text-xl font-bold justify-between"
          >
            <span className="flex items-center">
              <Tag className="h-6 w-6 mr-3" />
              {selectedCategory === "all"
                ? "All Categories"
                : categories.find((c) => c.id === selectedCategory)?.name ||
                  "Select Category"}
            </span>
            <ChevronDown
              className={`h-6 w-6 transition-transform ${
                showCategoryPicker ? "rotate-180" : ""
              }`}
            />
          </Button>
          {showCategoryPicker && (
            <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded-xl shadow-lg max-h-64 overflow-y-auto">
              <button
                onClick={() => {
                  setSelectedCategory("all");
                  setShowCategoryPicker(false);
                }}
                className={`w-full px-6 py-4 text-left text-xl font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-700 ${
                  selectedCategory === "all"
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                    : ""
                }`}
              >
                All Categories
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setShowCategoryPicker(false);
                  }}
                  className={`w-full px-6 py-4 text-left text-xl font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-700 ${
                    selectedCategory === category.id
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      : ""
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date Range Filter */}
        <div className="relative">
          <Button
            onClick={() => setShowDatePicker(!showDatePicker)}
            variant="outline"
            className="w-full h-16 text-xl font-bold justify-between"
          >
            <span className="flex items-center">
              <Calendar className="h-6 w-6 mr-3" />
              {dateRangeOptions.find((o) => o.value === selectedDateRange)
                ?.label || "This Month"}
              {selectedDateRange === "thisMonth" &&
                ` - ${months[selectedMonth]} ${selectedYear}`}
              {selectedDateRange === "customPeriod" &&
                customStartDate &&
                customEndDate &&
                ` - ${selectedDateRangeLabel}`}
            </span>
            <ChevronDown
              className={`h-6 w-6 transition-transform ${
                showDatePicker ? "rotate-180" : ""
              }`}
            />
          </Button>
          {showDatePicker && (
            <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded-xl shadow-lg max-h-80 overflow-y-auto">
              {dateRangeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    if (option.value === "customPeriod") {
                      setShowDatePicker(false);
                      setShowCustomPeriodModal(true);
                    } else {
                      setSelectedDateRange(option.value);
                      if (option.value !== "thisMonth") {
                        setShowDatePicker(false);
                      }
                    }
                  }}
                  className={`w-full px-6 py-4 text-left text-xl font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-700 ${
                    selectedDateRange === option.value
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      : ""
                  }`}
                >
                  {option.label}
                </button>
              ))}

              {/* Month/Year selector when "This Month" is selected */}
              {selectedDateRange === "thisMonth" && (
                <div className="border-t dark:border-neutral-700 p-4">
                  <p className="text-lg font-bold text-neutral-600 dark:text-neutral-400 mb-3">
                    Select Month & Year
                  </p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {months.map((month, index) => (
                      <button
                        key={month}
                        onClick={() => setSelectedMonth(index)}
                        className={`px-3 py-3 text-lg font-semibold rounded-lg ${
                          selectedMonth === index
                            ? "bg-green-600 text-white"
                            : "bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600"
                        }`}
                      >
                        {month.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {[selectedYear - 1, selectedYear, selectedYear + 1].map(
                      (year) => (
                        <button
                          key={year}
                          onClick={() => setSelectedYear(year)}
                          className={`flex-1 px-3 py-3 text-lg font-semibold rounded-lg ${
                            selectedYear === year
                              ? "bg-green-600 text-white"
                              : "bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600"
                          }`}
                        >
                          {year}
                        </button>
                      )
                    )}
                  </div>
                  <Button
                    onClick={() => setShowDatePicker(false)}
                    className="w-full mt-4 h-12 text-lg font-bold bg-green-600 hover:bg-green-700"
                  >
                    Apply
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards - 2x3 Grid */}
      <div className="grid grid-cols-2 gap-5">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const isPositive = stat.isPercentage ? true : stat.change > 0;

          return (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xl font-bold text-neutral-600 dark:text-neutral-300">
                  {stat.title}
                </CardTitle>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <Icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-neutral-900 dark:text-white">
                  {stat.value}
                </div>
                {stat.change !== undefined && stat.change !== 0 && (
                  <div className="flex items-center mt-2 text-xl">
                    {stat.isPercentage ? (
                      <Percent className="h-6 w-6 text-blue-600 mr-1" />
                    ) : isPositive ? (
                      <ArrowUpRight className="h-6 w-6 text-green-600 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-6 w-6 text-red-600 mr-1" />
                    )}
                    <span
                      className={
                        stat.isPercentage
                          ? "text-blue-600"
                          : isPositive
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {Math.abs(stat.change).toFixed(1)}%
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Daily Sales Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Daily Sales</CardTitle>
          <CardDescription className="text-xl">
            Tap a bar to see hourly sales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 16 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 16 }}
                  tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={(label) => formatDayToFullDate(label)}
                  contentStyle={{ fontSize: 18 }}
                />
                <Bar
                  dataKey="revenue"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={handleDayClick}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Peak Hours Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center gap-3">
            <Clock className="h-8 w-8" />
            Peak Hours
          </CardTitle>
          <CardDescription className="text-xl">
            {getSelectedDayDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlySalesData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 14 }} interval={2} />
                <YAxis
                  tick={{ fontSize: 16 }}
                  tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ fontSize: 18 }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* All Sold Items - Preview */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="text-3xl font-bold flex items-center gap-3">
              <List className="h-8 w-8" />
              Sold Items
            </CardTitle>
            <CardDescription className="text-xl">
              {allSoldProducts.length} products sold
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
              <p className="text-lg text-neutral-600 dark:text-neutral-400">
                Total Items
              </p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {Math.round(
                  allSoldProducts.reduce((sum, p) => sum + p.quantity, 0)
                )}
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
              <p className="text-lg text-neutral-600 dark:text-neutral-400">
                Total Revenue
              </p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(
                  allSoldProducts.reduce((sum, p) => sum + p.revenue, 0)
                )}
              </p>
            </div>
          </div>

          {/* Products List - Max 3 items */}
          {allSoldProducts.length === 0 ? (
            <p className="text-neutral-500 text-center py-10 text-2xl">
              No products sold
            </p>
          ) : (
            <>
              <div className="space-y-4">
                {allSoldProducts.slice(0, 3).map((product, index) => {
                  const categoryName = categories.find(
                    (c) => c.id === product.categoryId
                  )?.name;
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xl text-neutral-900 dark:text-white truncate">
                          {product.name}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-lg text-neutral-500">
                            Qty:{" "}
                            {Number.isInteger(product.quantity)
                              ? product.quantity
                              : product.quantity.toFixed(2)}
                          </span>
                          {categoryName && (
                            <span className="text-sm bg-neutral-200 dark:bg-neutral-700 px-2 py-1 rounded-lg">
                              {categoryName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-xl text-green-600 dark:text-green-400">
                          {formatCurrency(product.revenue)}
                        </p>
                        <p className="text-sm text-neutral-500">
                          Avg:{" "}
                          {formatCurrency(product.revenue / product.quantity)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* View All Button */}
              {allSoldProducts.length > 3 && (
                <div className="mt-6 text-center">
                  <Button
                    onClick={() => router.push("/admin/sold-items")}
                    variant="outline"
                    className="h-14 px-8 text-xl font-bold"
                  >
                    View All {allSoldProducts.length} Items
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Payment Methods</CardTitle>
          <CardDescription className="text-xl">
            Distribution this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentMethodsData.length === 0 ? (
            <p className="text-neutral-500 text-center py-10 text-2xl">
              No payment data
            </p>
          ) : (
            <>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodsData}
                      cx="50%"
                      cy="45%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      dataKey="value"
                    >
                      {paymentMethodsData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ fontSize: 18 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4 mt-5">
                {paymentMethodsData.map((method, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      ></div>
                      <span className="text-2xl">{method.name}</span>
                    </div>
                    <span className="font-bold text-2xl">
                      {formatCurrency(method.value)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Top Customers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center gap-3">
            <Crown className="h-8 w-8 text-amber-500" />
            Top Customers
          </CardTitle>
          <CardDescription className="text-xl">
            Highest spending
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topCustomers.length === 0 ? (
            <div className="text-center py-10">
              <Users className="h-16 w-16 mx-auto text-neutral-300 mb-4" />
              <p className="text-neutral-500 text-2xl">No customer data</p>
            </div>
          ) : (
            <div className="space-y-6">
              {topCustomers.map((customer, index) => (
                <div
                  key={customer.id || index}
                  className="flex items-center justify-between pb-5 border-b last:border-0"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl font-bold ${
                        index === 0
                          ? "bg-yellow-500"
                          : index === 1
                          ? "bg-gray-400"
                          : index === 2
                          ? "bg-amber-600"
                          : "bg-gray-300"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-bold text-2xl text-neutral-900 dark:text-white">
                        {getCustomerName(customer.id, customer.name)}
                      </p>
                      <p className="text-xl text-neutral-500">
                        {customer.orders} orders
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-2xl text-green-600 dark:text-green-400">
                    {formatCurrency(customer.total)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">
            Recent Transactions
          </CardTitle>
          <CardDescription className="text-xl">Latest sales</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <p className="text-neutral-500 text-center py-10 text-2xl">
              No transactions
            </p>
          ) : (
            <>
              <div className="space-y-6">
                {recentTransactions.slice(0, 5).map((tx) => {
                  const txDate =
                    tx.createdAt?.toDate?.() || new Date(tx.createdAt);
                  const total = tx.total || tx.totalAmount || tx.total_money || 0;
                  const orderId = getOrderId(tx);
                  const memberName = getMemberName(
                    tx.customerId || tx.customer_id,
                    tx.customerName || tx.customer_name
                  );
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between pb-5 border-b last:border-0"
                    >
                      <div>
                        <p className="font-bold text-2xl text-neutral-900 dark:text-white">
                          {orderId}
                        </p>
                        {memberName && (
                          <p className="text-lg text-green-600 dark:text-green-400">
                            {memberName}
                          </p>
                        )}
                        <p className="text-xl text-neutral-500">
                          {txDate.toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <p className="font-bold text-2xl text-green-600 dark:text-green-400">
                        {formatCurrency(total)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Show More Button */}
              <div className="mt-6 text-center">
                <Button
                  onClick={() => router.push("/admin/transactions")}
                  variant="outline"
                  className="h-14 px-8 text-xl font-bold"
                >
                  View All Transactions
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Custom Period Modal */}
      <Dialog
        open={showCustomPeriodModal}
        onOpenChange={setShowCustomPeriodModal}
      >
        <DialogContent className="sm:max-w-sm p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-center text-2xl font-bold">
              Select Date Range
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center px-0">
            <DatePicker
              selectsRange={true}
              startDate={dateRange[0]}
              endDate={dateRange[1]}
              onChange={(update) => {
                setDateRange(update);
              }}
              inline
            />
          </div>
          <DialogFooter className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1 h-14 text-lg"
              onClick={() => {
                setShowCustomPeriodModal(false);
                setDateRange([null, null]);
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-14 text-lg bg-green-600 hover:bg-green-700"
              disabled={!dateRange[0] || !dateRange[1]}
              onClick={() => {
                if (dateRange[0] && dateRange[1]) {
                  setCustomStartDate(dateRange[0]);
                  setCustomEndDate(dateRange[1]);
                  setSelectedDateRange("customPeriod");
                  const formattedStart = dateRange[0].toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                    }
                  );
                  const formattedEnd = dateRange[1].toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }
                  );
                  const label = `${formattedStart} - ${formattedEnd}`;
                  setSelectedDateRangeLabel(label);
                  setShowCustomPeriodModal(false);
                  setDateRange([null, null]);
                }
              }}
            >
              Apply Range
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
