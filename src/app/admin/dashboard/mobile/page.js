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
  const [topCustomers, setTopCustomers] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [dailySalesData, setDailySalesData] = useState([]);
  const [hourlySalesData, setHourlySalesData] = useState([]);
  const [paymentMethodsData, setPaymentMethodsData] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [customersMap, setCustomersMap] = useState({});

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
    { value: "thisWeek", label: "This Week" },
    { value: "thisMonth", label: "This Month" },
    { value: "thisYear", label: "This Year" },
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
            // Category filter for items
            if (selectedCategory !== "all") {
              const itemId = item.item_id || item.itemId || item.id;
              const itemCategoryId = productCategoryMap[itemId];
              if (itemCategoryId !== selectedCategory) return;
            }
            const name = item.item_name || item.name || "Unknown";
            if (!productSales[name])
              productSales[name] = { quantity: 0, revenue: 0 };
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
      case "thisWeek":
        return type === "revenue" ? "Week Revenue" : "Week Orders";
      case "thisYear":
        return type === "revenue" ? "Year Revenue" : "Year Orders";
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
                    setSelectedDateRange(option.value);
                    if (option.value !== "thisMonth") {
                      setShowDatePicker(false);
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
            Revenue this month
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
                  contentStyle={{ fontSize: 18 }}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
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
            Today's sales by hour
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

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Top Products</CardTitle>
          <CardDescription className="text-xl">
            Best sellers this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <p className="text-neutral-500 text-center py-10 text-2xl">
              No sales data
            </p>
          ) : (
            <div className="space-y-6">
              {topProducts.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between pb-5 border-b last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-2xl text-neutral-900 dark:text-white truncate">
                      {product.name}
                    </p>
                    <p className="text-xl text-neutral-500">
                      Qty: {product.quantity}
                    </p>
                  </div>
                  <p className="font-bold text-2xl text-green-600 dark:text-green-400">
                    {formatCurrency(product.revenue)}
                  </p>
                </div>
              ))}
            </div>
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
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={90}
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

      {/* Low Stock Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            Low Stock Alerts
          </CardTitle>
          <CardDescription className="text-xl">
            Products running low
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lowStockProducts.length === 0 ? (
            <div className="text-center py-10">
              <Package className="h-16 w-16 mx-auto text-neutral-300 mb-4" />
              <p className="text-neutral-500 text-2xl">
                All products well stocked!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {lowStockProducts.map((product, index) => (
                <div
                  key={product.id || index}
                  className="flex items-center justify-between pb-5 border-b last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-2xl text-neutral-900 dark:text-white truncate">
                      {product.name}
                    </p>
                    {product.sku && (
                      <p className="text-xl text-neutral-500">
                        SKU: {product.sku}
                      </p>
                    )}
                  </div>
                  <p
                    className={`font-bold text-2xl ${
                      product.stock <= 3
                        ? "text-red-600"
                        : product.stock <= 5
                        ? "text-amber-600"
                        : "text-neutral-600"
                    }`}
                  >
                    {product.stock || 0} left
                  </p>
                </div>
              ))}
            </div>
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
            <div className="space-y-6">
              {recentTransactions.map((tx) => {
                const txDate =
                  tx.createdAt?.toDate?.() || new Date(tx.createdAt);
                const total = tx.total || tx.totalAmount || tx.total_money || 0;
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between pb-5 border-b last:border-0"
                  >
                    <div>
                      <p className="font-bold text-2xl text-neutral-900 dark:text-white">
                        {getCustomerName(
                          tx.customerId || tx.customer_id,
                          tx.customerName || tx.customer_name
                        )}
                      </p>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
