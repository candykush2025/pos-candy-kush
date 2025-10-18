"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ordersService,
  receiptsService,
  productsService,
  customersService,
} from "@/lib/firebase/firestore";
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    todayRevenue: 0,
    monthRevenue: 0,
    totalOrders: 0,
    monthOrders: 0,
    avgOrderValue: 0,
    totalProducts: 0,
    totalCustomers: 0,
    revenueChange: 0,
    todayChange: 0,
    ordersChange: 0,
    avgOrderValueChange: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [dailySalesData, setDailySalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [paymentMethodsData, setPaymentMethodsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadDashboardData();
  }, [selectedMonth, selectedYear]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get receipts (transactions) from Loyverse
      const receipts = await receiptsService.getAll({
        orderBy: ["createdAt", "desc"],
      });

      // Get products and customers
      const products = await productsService.getAll();
      const customers = await customersService.getAll();

      // Date calculations
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const currentMonth = new Date(selectedYear, selectedMonth, 1);
      const nextMonth = new Date(selectedYear, selectedMonth + 1, 1);
      const lastMonth = new Date(selectedYear, selectedMonth - 1, 1);
      const twoMonthsAgo = new Date(selectedYear, selectedMonth - 2, 1);

      // Get current day of month for fair comparison
      const currentDayOfMonth = now.getDate();
      // For last month comparison, use same day range (e.g., Oct 1-18 vs Sep 1-18)
      const lastMonthSameDay = new Date(
        selectedYear,
        selectedMonth - 1,
        currentDayOfMonth + 1
      );

      // Filter receipts by selected month (using receiptDate - the actual sale date)
      const monthReceipts = receipts.filter((receipt) => {
        const receiptDate = receipt.receiptDate?.toDate
          ? receipt.receiptDate.toDate()
          : new Date(receipt.receiptDate);
        return receiptDate >= currentMonth && receiptDate < nextMonth;
      });

      // Filter receipts by last month SAME DATE RANGE (for fair comparison)
      // Example: If today is Oct 18, compare Oct 1-18 with Sep 1-18
      const lastMonthReceipts = receipts.filter((receipt) => {
        const receiptDate = receipt.receiptDate?.toDate
          ? receipt.receiptDate.toDate()
          : new Date(receipt.receiptDate);
        return receiptDate >= lastMonth && receiptDate < lastMonthSameDay;
      });

      // Today's receipts
      const todayReceipts = receipts.filter((receipt) => {
        const receiptDate = receipt.receiptDate?.toDate
          ? receipt.receiptDate.toDate()
          : new Date(receipt.receiptDate);
        return receiptDate >= today;
      });

      // Yesterday's receipts (for comparison)
      const yesterdayReceipts = receipts.filter((receipt) => {
        const receiptDate = receipt.receiptDate?.toDate
          ? receipt.receiptDate.toDate()
          : new Date(receipt.receiptDate);
        const nextDay = new Date(yesterday);
        nextDay.setDate(nextDay.getDate() + 1);
        return receiptDate >= yesterday && receiptDate < nextDay;
      });

      // Calculate revenue (using camelCase field names from Firebase)
      // Note: Loyverse receipts API returns values already in Baht (not satang)
      const totalRevenue = receipts.reduce(
        (sum, receipt) => sum + (receipt.totalMoney || 0),
        0
      );
      const monthRevenue = monthReceipts.reduce(
        (sum, receipt) => sum + (receipt.totalMoney || 0),
        0
      );
      const lastMonthRevenue = lastMonthReceipts.reduce(
        (sum, receipt) => sum + (receipt.totalMoney || 0),
        0
      );
      const todayRevenue = todayReceipts.reduce(
        (sum, receipt) => sum + (receipt.totalMoney || 0),
        0
      );
      const yesterdayRevenue = yesterdayReceipts.reduce(
        (sum, receipt) => sum + (receipt.totalMoney || 0),
        0
      );

      // Calculate changes
      const revenueChange =
        lastMonthRevenue > 0
          ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
          : 0;
      const todayChange =
        yesterdayRevenue > 0
          ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
          : 0;
      const ordersChange =
        lastMonthReceipts.length > 0
          ? ((monthReceipts.length - lastMonthReceipts.length) /
              lastMonthReceipts.length) *
            100
          : 0;

      // Calculate average order value
      const avgOrderValue =
        monthReceipts.length > 0 ? monthRevenue / monthReceipts.length : 0;
      const lastMonthAvgOrderValue =
        lastMonthReceipts.length > 0
          ? lastMonthRevenue / lastMonthReceipts.length
          : 0;
      const avgOrderValueChange =
        lastMonthAvgOrderValue > 0
          ? ((avgOrderValue - lastMonthAvgOrderValue) /
              lastMonthAvgOrderValue) *
            100
          : 0;

      // Set stats
      setStats({
        totalRevenue,
        todayRevenue,
        monthRevenue,
        totalOrders: receipts.length,
        monthOrders: monthReceipts.length,
        avgOrderValue,
        totalProducts: products.length,
        totalCustomers: customers.length,
        revenueChange: Math.round(revenueChange * 10) / 10,
        todayChange: Math.round(todayChange * 10) / 10,
        ordersChange: Math.round(ordersChange * 10) / 10,
        avgOrderValueChange: Math.round(avgOrderValueChange * 10) / 10,
      });

      // Prepare daily sales data for the month (last 30 days)
      const dailySales = [];
      const daysInMonth = new Date(
        selectedYear,
        selectedMonth + 1,
        0
      ).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const dayStart = new Date(selectedYear, selectedMonth, day);
        const dayEnd = new Date(selectedYear, selectedMonth, day + 1);

        const dayReceipts = monthReceipts.filter((receipt) => {
          const receiptDate = receipt.receiptDate?.toDate
            ? receipt.receiptDate.toDate()
            : new Date(receipt.receiptDate);
          return receiptDate >= dayStart && receiptDate < dayEnd;
        });

        const dayRevenue = dayReceipts.reduce(
          (sum, receipt) => sum + (receipt.totalMoney || 0),
          0
        ); // Already in Baht

        dailySales.push({
          day: day.toString(),
          date: `${selectedMonth + 1}/${day}`,
          revenue: dayRevenue,
          orders: dayReceipts.length,
        });
      }
      setDailySalesData(dailySales);

      // Prepare monthly data for the year
      const monthlyStats = [];
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(selectedYear, month, 1);
        const monthEnd = new Date(selectedYear, month + 1, 1);

        const monthReceiptsData = receipts.filter((receipt) => {
          const receiptDate = receipt.receiptDate?.toDate
            ? receipt.receiptDate.toDate()
            : new Date(receipt.receiptDate);
          return receiptDate >= monthStart && receiptDate < monthEnd;
        });

        const monthRev = monthReceiptsData.reduce(
          (sum, receipt) => sum + (receipt.totalMoney || 0),
          0
        ); // Already in Baht

        monthlyStats.push({
          month: new Date(selectedYear, month).toLocaleString("default", {
            month: "short",
          }),
          revenue: monthRev,
          orders: monthReceiptsData.length,
        });
      }
      setMonthlyData(monthlyStats);

      // Calculate top products from receipts
      const productSales = {};
      monthReceipts.forEach((receipt) => {
        if (receipt.lineItems && Array.isArray(receipt.lineItems)) {
          receipt.lineItems.forEach((item) => {
            const itemName = item.item_name || "Unknown Product";
            if (!productSales[itemName]) {
              productSales[itemName] = { quantity: 0, revenue: 0 };
            }
            productSales[itemName].quantity += item.quantity || 0;
            productSales[itemName].revenue += item.total_money || 0; // Already in Baht
          });
        }
      });

      const topProds = Object.entries(productSales)
        .map(([name, data]) => ({
          name,
          quantity: data.quantity,
          revenue: data.revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      setTopProducts(topProds);

      // Calculate payment methods distribution
      const paymentMethods = {};
      monthReceipts.forEach((receipt) => {
        if (
          receipt.payments &&
          Array.isArray(receipt.payments) &&
          receipt.payments.length > 0
        ) {
          receipt.payments.forEach((payment) => {
            const method = payment.name || payment.type || "Unknown";
            if (!paymentMethods[method]) {
              paymentMethods[method] = 0;
            }
            paymentMethods[method] += payment.money_amount || 0; // Already in Baht
          });
        }
      });

      const paymentData = Object.entries(paymentMethods).map(
        ([name, value]) => ({
          name,
          value,
        })
      );
      setPaymentMethodsData(paymentData);

      // Recent transactions (last 10)
      setRecentTransactions(monthReceipts.slice(0, 10));

      // Debug logging (at the end after all variables are defined)
      console.log("📊 Dashboard Debug - Total receipts:", receipts.length);
      console.log("📊 Month receipts count:", monthReceipts.length);
      console.log(
        "📊 Last month receipts count (same date range):",
        lastMonthReceipts.length
      );
      console.log(
        "📊 Selected month:",
        selectedMonth + 1,
        "Year:",
        selectedYear
      );
      console.log(
        "📊 Current month date range:",
        currentMonth,
        "to",
        nextMonth
      );
      console.log(
        "📊 Last month comparison range:",
        lastMonth,
        "to",
        lastMonthSameDay
      );
      console.log("📊 Comparing day:", currentDayOfMonth);
      console.log("📊 Month revenue:", monthRevenue);
      console.log("📊 Last month revenue (same days):", lastMonthRevenue);
      console.log("📊 Revenue change %:", revenueChange);
      console.log("📊 Today revenue:", todayRevenue);
      console.log("📊 Yesterday revenue:", yesterdayRevenue);
      console.log("📊 Today receipts count:", todayReceipts.length);
      console.log("📊 Yesterday receipts count:", yesterdayReceipts.length);
      console.log("📊 Today change %:", todayChange);
      console.log("📊 Avg order value:", avgOrderValue);
      console.log("📊 Avg order value change %:", avgOrderValueChange);
      console.log("📊 Top products:", topProds);
      console.log("📊 Payment methods data:", paymentData);

      // Check date distribution
      if (receipts.length > 0) {
        const receiptDates = receipts.slice(0, 10).map((r) => ({
          num: r.receiptNumber,
          receiptDate: r.receiptDate?.toDate
            ? r.receiptDate.toDate()
            : new Date(r.receiptDate),
          createdAt: r.createdAt?.toDate
            ? r.createdAt.toDate()
            : new Date(r.createdAt),
          total: r.totalMoney,
        }));
        console.log(
          "📊 First 10 receipts (receiptDate vs createdAt):",
          receiptDates
        );

        console.log("📊 Sample receipt:", receipts[0]);
        console.log("📊 Sample receipt totalMoney:", receipts[0].totalMoney);
        console.log("📊 Sample receipt lineItems:", receipts[0].lineItems);
        if (receipts[0].lineItems && receipts[0].lineItems.length > 0) {
          console.log("📊 Sample lineItem:", receipts[0].lineItems[0]);
          console.log(
            "📊 Sample lineItem fields:",
            Object.keys(receipts[0].lineItems[0])
          );
        }
        if (receipts[0].payments && receipts[0].payments.length > 0) {
          console.log("📊 Sample payment:", receipts[0].payments[0]);
          console.log(
            "📊 Sample payment fields:",
            Object.keys(receipts[0].payments[0])
          );
        }
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

  const statCards = [
    {
      title: "Month Revenue",
      value: formatCurrency(stats.monthRevenue),
      change: stats.revenueChange,
      changeLabel: "vs last month",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100",
      subtitle: `${months[selectedMonth]} ${selectedYear}`,
    },
    {
      title: "Today's Sales",
      value: formatCurrency(stats.todayRevenue),
      change: stats.todayChange,
      changeLabel: "vs yesterday", // Compare with yesterday's sales
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      subtitle: new Date().toLocaleDateString(),
    },
    {
      title: "Month Orders",
      value: stats.monthOrders,
      change: stats.ordersChange,
      changeLabel: "vs last month",
      icon: ShoppingCart,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      subtitle: `${months[selectedMonth]} ${selectedYear}`,
    },
    {
      title: "Avg Order Value",
      value: formatCurrency(stats.avgOrderValue),
      change: stats.avgOrderValueChange,
      changeLabel: "vs last month",
      icon: CreditCard,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      subtitle: "This month",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-neutral-500">Loading sales data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-8">
      {/* Header with Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Sales Dashboard</h1>
          <p className="text-sm md:text-base text-neutral-500 dark:text-neutral-400 mt-1">
            Candy Kush POS - Sales Analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
          >
            {months.map((month, index) => (
              <option key={index} value={index}>
                {month}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
          >
            {[2024, 2025, 2026].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Key Stats Grid - Mobile Friendly (2x2 on mobile, 4 columns on desktop) */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const isPositive = stat.change ? stat.change > 0 : null;

          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="flex-1">
                  <CardTitle className="text-xs md:text-sm font-medium text-neutral-600 dark:text-neutral-300">
                    {stat.title}
                  </CardTitle>
                  {stat.subtitle && (
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                      {stat.subtitle}
                    </p>
                  )}
                </div>
                <div className={`p-2 md:p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 md:h-6 md:w-6 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl lg:text-3xl font-bold">
                  {stat.value}
                </div>
                {stat.change !== undefined && stat.change !== null && (
                  <div className="flex items-center mt-2 text-xs md:text-sm">
                    {isPositive ? (
                      <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400 mr-1" />
                    )}
                    <span
                      className={
                        isPositive
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }
                    >
                      {Math.abs(stat.change).toFixed(1)}%
                    </span>
                    <span className="text-neutral-500 dark:text-neutral-400 ml-1">
                      {stat.changeLabel || "vs last month"}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row - Mobile Stacked */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Daily Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">
              Daily Sales - {months[selectedMonth]} {selectedYear}
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Revenue per day this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailySalesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ fontSize: "12px" }}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">
              Monthly Revenue - {selectedYear}
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Revenue trend for the year
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ fontSize: "12px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products & Payment Methods - Mobile Stacked */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">
              Top Selling Products
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Best performers this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-neutral-500 dark:text-neutral-400 text-center py-8 text-sm">
                No sales data yet
              </p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between pb-3 border-b last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm md:text-base truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Qty: {product.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm md:text-base text-green-600 dark:text-green-400">
                        {formatCurrency(product.revenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">
              Payment Methods
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Distribution this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            {paymentMethodsData.length === 0 ? (
              <p className="text-neutral-500 text-center py-8 text-sm">
                No payment data yet
              </p>
            ) : (
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="h-48 md:h-56 w-full md:w-1/2">
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
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {paymentMethodsData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrency(value)}
                        contentStyle={{ fontSize: "12px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2 w-full">
                  {paymentMethodsData.map((method, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        ></div>
                        <span className="text-sm">{method.name}</span>
                      </div>
                      <span className="font-semibold text-sm">
                        {formatCurrency(method.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Latest Transactions - Mobile Friendly */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Latest Transactions
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Recent sales for {months[selectedMonth]} {selectedYear}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <p className="text-neutral-500 text-center py-8 text-sm">
              No transactions yet
            </p>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((transaction) => {
                const receiptDate = transaction.createdAt?.toDate
                  ? transaction.createdAt.toDate()
                  : new Date(transaction.createdAt);

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0 gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm md:text-base">
                        Receipt #
                        {transaction.receiptNumber ||
                          transaction.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {receiptDate.toLocaleString("default", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {transaction.lineItems && (
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate mt-1">
                          {transaction.lineItems.length} items
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm md:text-base text-green-600 dark:text-green-400">
                        {formatCurrency(transaction.totalMoney || 0)}
                      </p>
                      {transaction.payments &&
                        transaction.payments.length > 0 && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
                            {transaction.payments[0].name ||
                              transaction.payments[0].type}
                          </p>
                        )}
                    </div>
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


