"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { receiptsService, customersService } from "@/lib/firebase/firestore";
import {
  ArrowLeft,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Calendar,
  Package,
  Crown,
  Clock,
  Receipt,
  User,
  Phone,
  Mail,
  MapPin,
  Percent,
  CreditCard,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import {
  AreaChart,
  Area,
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

export default function CustomerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    firstOrderDate: null,
    lastOrderDate: null,
    totalItems: 0,
    favoriteProducts: [],
    monthlySpending: [],
    paymentMethods: [],
    ordersByDay: [],
    rank: 0,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    loadCustomerData();
  }, [id, isAuthenticated]);

  const loadCustomerData = async () => {
    try {
      setLoading(true);

      // Load all receipts
      const allReceipts = await receiptsService.getAll();

      // Filter orders for this customer
      const customerOrders = allReceipts.filter(
        (receipt) => receipt.customerId === id || receipt.customer_id === id
      );

      if (customerOrders.length === 0) {
        setCustomer(null);
        setLoading(false);
        return;
      }

      // Try to load customer info from customers collection
      let customerData = null;
      try {
        customerData = await customersService.getById(id);
      } catch (error) {
        // Customer not in customers collection, build from receipts
        const firstReceipt = customerOrders[0];
        customerData = {
          id: id,
          name: firstReceipt.customerName || firstReceipt.customer_name,
          firstName: firstReceipt.customerName || firstReceipt.customer_name,
          email: firstReceipt.customerEmail || firstReceipt.customer_email,
          phone: firstReceipt.customerPhone || firstReceipt.customer_phone,
          address:
            firstReceipt.customerAddress || firstReceipt.customer_address,
        };
      }

      setCustomer(customerData);
      setOrders(
        customerOrders.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return dateB - dateA;
        })
      );

      // Calculate statistics
      calculateStats(customerOrders, allReceipts, customerData);
    } catch (error) {
      console.error("Error loading customer data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (customerOrders, allReceipts, customerData) => {
    // Basic stats
    const totalSpent = customerOrders.reduce((sum, order) => {
      const total = order.total || order.totalAmount || order.total_money || 0;
      return sum + total;
    }, 0);

    const totalOrders = customerOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

    // Dates
    const dates = customerOrders.map(
      (order) => order.createdAt?.toDate?.() || new Date(order.createdAt)
    );
    const firstOrderDate =
      dates.length > 0 ? new Date(Math.min(...dates)) : null;
    const lastOrderDate =
      dates.length > 0 ? new Date(Math.max(...dates)) : null;

    // Total items purchased
    const totalItems = customerOrders.reduce((sum, order) => {
      const items = order.line_items || order.items || [];
      return (
        sum + items.reduce((itemSum, item) => itemSum + (item.quantity || 1), 0)
      );
    }, 0);

    // Favorite products
    const productCount = {};
    customerOrders.forEach((order) => {
      const items = order.line_items || order.items || [];
      items.forEach((item) => {
        const productName = item.item_name || item.name || "Unknown";
        if (!productCount[productName]) {
          productCount[productName] = {
            name: productName,
            quantity: 0,
            revenue: 0,
          };
        }
        productCount[productName].quantity += item.quantity || 1;
        productCount[productName].revenue +=
          (item.quantity || 1) * (item.price || 0);
      });
    });
    const favoriteProducts = Object.values(productCount)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Monthly spending
    const monthlyData = {};
    customerOrders.forEach((order) => {
      const date = order.createdAt?.toDate?.() || new Date(order.createdAt);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      const total = order.total || order.totalAmount || order.total_money || 0;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, spending: 0, orders: 0 };
      }
      monthlyData[monthKey].spending += total;
      monthlyData[monthKey].orders++;
    });
    const monthlySpending = Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);

    // Payment methods
    const paymentMethods = {};
    customerOrders.forEach((order) => {
      if (order.payments && Array.isArray(order.payments)) {
        order.payments.forEach((p) => {
          const method = p.name || p.type || "Cash";
          if (!paymentMethods[method]) paymentMethods[method] = 0;
          paymentMethods[method] += p.money_amount || p.amount || 0;
        });
      } else {
        const method = order.paymentMethod || "Cash";
        const total =
          order.total || order.totalAmount || order.total_money || 0;
        if (!paymentMethods[method]) paymentMethods[method] = 0;
        paymentMethods[method] += total;
      }
    });
    const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
    const paymentMethodsData = Object.entries(paymentMethods).map(
      ([name, value], i) => ({
        name,
        value,
        color: COLORS[i % COLORS.length],
      })
    );

    // Orders by day of week
    const dayCount = Array(7).fill(0);
    customerOrders.forEach((order) => {
      const date = order.createdAt?.toDate?.() || new Date(order.createdAt);
      dayCount[date.getDay()]++;
    });
    const ordersByDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
      (day, i) => ({
        day,
        orders: dayCount[i],
      })
    );

    // Calculate rank
    const customerSales = {};
    allReceipts.forEach((receipt) => {
      const custId = receipt.customerId || receipt.customer_id;
      if (custId) {
        if (!customerSales[custId]) {
          customerSales[custId] = { total: 0 };
        }
        const total =
          receipt.total || receipt.totalAmount || receipt.total_money || 0;
        customerSales[custId].total += total;
      }
    });
    const allCustomers = Object.entries(customerSales)
      .map(([custId, data]) => ({ id: custId, ...data }))
      .sort((a, b) => b.total - a.total);
    const rank = allCustomers.findIndex((c) => c.id === id) + 1;

    setStats({
      totalSpent,
      totalOrders,
      avgOrderValue,
      firstOrderDate,
      lastOrderDate,
      totalItems,
      favoriteProducts,
      monthlySpending,
      paymentMethods: paymentMethodsData,
      ordersByDay,
      rank,
      totalCustomers: allCustomers.length,
    });
  };

  const getOrderId = (order) => {
    return (
      order.receipt_number ||
      order.receiptNumber ||
      order.order_number ||
      order.id?.slice(0, 8) ||
      "N/A"
    );
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatMonthYear = (monthKey) => {
    const [year, month] = monthKey.split("-");
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-2xl text-neutral-600 dark:text-neutral-400">
            Loading Customer Data...
          </p>
        </div>
      </div>
    );
  }

  if (!customer && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <User className="h-20 w-20 mx-auto text-neutral-300 mb-4" />
          <p className="text-2xl text-neutral-600 dark:text-neutral-400 mb-4">
            Customer not found
          </p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const customerName =
    customer?.name || customer?.firstName
      ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim()
      : "Walk-in Customer";

  return (
    <div className="container mx-auto p-4 pb-28 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          onClick={() => router.back()}
          variant="outline"
          size="lg"
          className="h-14 px-6 text-lg"
        >
          <ArrowLeft className="mr-2 h-6 w-6" />
          Back
        </Button>
      </div>

      {/* Customer Info Card */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
              {customerName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-neutral-900 dark:text-white">
                  {customerName}
                </h1>
                {stats.rank <= 3 && (
                  <Crown
                    className={`h-8 w-8 ${
                      stats.rank === 1
                        ? "text-yellow-500"
                        : stats.rank === 2
                        ? "text-gray-400"
                        : "text-amber-600"
                    }`}
                  />
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-lg text-neutral-600 dark:text-neutral-400">
                {customer?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    {customer.email}
                  </div>
                )}
                {customer?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    {customer.phone}
                  </div>
                )}
                {customer?.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {customer.address}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  Rank #{stats.rank} of {stats.totalCustomers}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Total Spent</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(stats.totalSpent)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <ShoppingCart className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Total Orders</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.totalOrders}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Avg Order</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(stats.avgOrderValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Package className="h-8 w-8 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Items Bought</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {stats.totalItems}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-green-600" />
              <div>
                <p className="text-sm text-neutral-500">First Order</p>
                <p className="text-xl font-bold">
                  {formatDate(stats.firstOrderDate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-blue-600" />
              <div>
                <p className="text-sm text-neutral-500">Last Order</p>
                <p className="text-xl font-bold">
                  {formatDate(stats.lastOrderDate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Spending Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-green-600" />
              Monthly Spending Trend
            </CardTitle>
            <CardDescription>Last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats.monthlySpending}>
                <defs>
                  <linearGradient
                    id="colorSpending"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonthYear}
                  fontSize={12}
                />
                <YAxis fontSize={12} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={formatMonthYear}
                />
                <Area
                  type="monotone"
                  dataKey="spending"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorSpending)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Methods Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-blue-600" />
              Payment Methods
            </CardTitle>
            <CardDescription>Preferred payment types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.paymentMethods}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) =>
                      `${entry.name}: ${formatCurrency(entry.value)}`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Day Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-6 w-6 text-purple-600" />
              Orders by Day of Week
            </CardTitle>
            <CardDescription>Shopping patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.ordersByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="orders" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Favorite Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6 text-orange-600" />
              Top 5 Favorite Products
            </CardTitle>
            <CardDescription>Most purchased items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.favoriteProducts.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{product.name}</p>
                      <p className="text-sm text-neutral-500">
                        {product.quantity} units •{" "}
                        {formatCurrency(product.revenue)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Order History
          </CardTitle>
          <CardDescription>All {orders.length} orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {orders.map((order) => {
              const orderDate =
                order.createdAt?.toDate?.() || new Date(order.createdAt);
              const total =
                order.total || order.totalAmount || order.total_money || 0;
              const orderId = getOrderId(order);
              const items = order.line_items || order.items || [];
              const itemCount = items.reduce(
                (sum, item) => sum + (item.quantity || 1),
                0
              );

              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-bold text-xl text-neutral-900 dark:text-white">
                        {orderId}
                      </p>
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm rounded-full">
                        {itemCount} items
                      </span>
                    </div>
                    <p className="text-sm text-neutral-500">
                      {orderDate.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
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
        </CardContent>
      </Card>
    </div>
  );
}
