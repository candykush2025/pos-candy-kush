"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
  getDocument,
  setDocument,
  COLLECTIONS,
} from "@/lib/firebase/firestore";
import { loyverseService } from "@/lib/api/loyverse";
import { toast } from "sonner";
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
  ChevronDown,
  ChevronUp,
  Monitor,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
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

const resolveMoneyValue = (value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === "object") {
    if (typeof value.amount === "number") return value.amount;
    if (typeof value.value === "number") return value.value;
    if (typeof value.total === "number") return value.total;
    if (typeof value.unit === "number") return value.unit;
  }
  return 0;
};

export default function MobileDashboardPage() {
  const router = useRouter();
  
  // Redirect to desktop on large screens
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth >= 1024) {
        router.replace("/admin/dashboard");
      }
    };
    
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, [router]);

  // Custom Tooltip for charts
  const CustomTooltip = ({ active, payload, label, formatter }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 shadow-lg">
          <p className="font-medium text-base">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.name}: ${formatter ? formatter(entry.value) : entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

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
    grossProfit: 0,
    grossProfitMargin: 0,
    totalCost: 0,
    avgItemsPerTransaction: 0,
    newCustomers: 0,
    repeatCustomers: 0,
    repeatCustomerRate: 0,
  });
  
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [dailySalesData, setDailySalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [hourlySalesData, setHourlySalesData] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [paymentMethodsData, setPaymentMethodsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [useDateRange, setUseDateRange] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    return date.toISOString().split("T")[0];
  });
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState([null, null]);
  const [selectedDateRangeLabel, setSelectedDateRangeLabel] = useState("This Month");
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    stats: true,
    dailySales: true,
    monthlySales: false,
    hourlyPeak: false,
    topProducts: true,
    payments: false,
    lowStock: false,
    topCustomers: false,
    transactions: false,
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const isLoadingProgrammatically = useRef(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (isLoadingProgrammatically.current) {
      isLoadingProgrammatically.current = false;
      return;
    }
    if (categories.length > 0) {
      loadDashboardData();
    }
  }, [selectedMonth, selectedYear, selectedCategory, categories, useDateRange, startDate, endDate]);

  const loadCategories = async () => {
    try {
      const data = await categoriesService.getAll();
      setCategories(data);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const getReceiptDate = (receipt) => {
    let receiptDate;
    if (receipt.receipt_date) {
      receiptDate = receipt.receipt_date?.toDate ? receipt.receipt_date.toDate() : new Date(receipt.receipt_date);
    } else if (receipt.receiptDate) {
      receiptDate = receipt.receiptDate?.toDate ? receipt.receiptDate.toDate() : new Date(receipt.receiptDate);
    } else {
      const fallbackDate = receipt.created_at || receipt.createdAt;
      receiptDate = fallbackDate?.toDate ? fallbackDate.toDate() : new Date(fallbackDate);
    }
    return receiptDate;
  };

  const getReceiptTotal = (receipt) => {
    return receipt.totalMoney || receipt.total_money || 0;
  };

  const handleDateRangeSelect = (rangeType, label) => {
    const now = new Date();
    let start, end;

    switch (rangeType) {
      case "today":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case "thisWeek":
        const dayOfWeek = now.getDay();
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 6, 23, 59, 59, 999);
        break;
      case "thisMonth":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case "thisYear":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      default:
        return;
    }

    const startDateStr = start.toISOString().split("T")[0];
    const endDateStr = end.toISOString().split("T")[0];

    setStartDate(startDateStr);
    setEndDate(endDateStr);
    setUseDateRange(true);
    setSelectedDateRangeLabel(label);

    const duration = end.getTime() - start.getTime();
    const previousEnd = new Date(start.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - duration);

    const customDateRange = {
      selected: { start, end },
      previous: { start: previousStart, end: previousEnd },
    };

    isLoadingProgrammatically.current = true;
    loadDashboardData(customDateRange);
  };

  const loadDashboardData = async (customDateRange = null) => {
    try {
      setLoading(true);

      let receipts = await receiptsService.getAll({ orderBy: ["createdAt", "desc"] });
      const products = await productsService.getAll();
      const customers = await customersService.getAll();

      // Filter by category
      if (selectedCategory !== "all") {
        const itemCategoryMap = {};
        products.forEach((product) => {
          const catId = product.categoryId || product.category_id;
          if (product.id && catId) {
            itemCategoryMap[product.id] = catId;
          }
        });

        receipts = receipts.filter((receipt) => {
          const items = receipt.lineItems || receipt.line_items || [];
          if (items && Array.isArray(items) && items.length > 0) {
            return items.some((item) => itemCategoryMap[item.item_id] === selectedCategory);
          }
          return false;
        });
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let selectedDateRange;
      let previousPeriodRange;

      if (customDateRange) {
        selectedDateRange = customDateRange.selected;
        previousPeriodRange = customDateRange.previous;
      } else if (useDateRange) {
        const start = new Date(startDate + "T00:00:00.000Z");
        const end = new Date(endDate + "T23:59:59.999Z");
        selectedDateRange = { start, end };
        const duration = end.getTime() - start.getTime();
        const previousEnd = new Date(start.getTime() - 1);
        const previousStart = new Date(previousEnd.getTime() - duration);
        previousPeriodRange = { start: previousStart, end: previousEnd };
      } else {
        const currentMonth = new Date(selectedYear, selectedMonth, 1);
        const nextMonth = new Date(selectedYear, selectedMonth + 1, 1);
        const lastMonth = new Date(selectedYear, selectedMonth - 1, 1);
        selectedDateRange = { start: currentMonth, end: nextMonth };
        const currentDayOfMonth = now.getDate();
        const lastMonthSameDay = new Date(selectedYear, selectedMonth - 1, currentDayOfMonth + 1);
        previousPeriodRange = { start: lastMonth, end: lastMonthSameDay };
      }

      const monthReceipts = receipts.filter((receipt) => {
        const receiptDate = getReceiptDate(receipt);
        if (!receiptDate || isNaN(receiptDate.getTime())) return false;
        return receiptDate >= selectedDateRange.start && receiptDate < selectedDateRange.end;
      });

      const lastMonthReceipts = receipts.filter((receipt) => {
        const receiptDate = getReceiptDate(receipt);
        if (!receiptDate || isNaN(receiptDate.getTime())) return false;
        return receiptDate >= previousPeriodRange.start && receiptDate < previousPeriodRange.end;
      });

      const todayReceipts = receipts.filter((receipt) => {
        const receiptDate = getReceiptDate(receipt);
        if (!receiptDate || isNaN(receiptDate.getTime())) return false;
        return receiptDate >= today;
      });

      const yesterdayReceipts = receipts.filter((receipt) => {
        const receiptDate = getReceiptDate(receipt);
        if (!receiptDate || isNaN(receiptDate.getTime())) return false;
        const nextDay = new Date(yesterday);
        nextDay.setDate(nextDay.getDate() + 1);
        return receiptDate >= yesterday && receiptDate < nextDay;
      });

      const totalRevenue = receipts.reduce((sum, receipt) => sum + getReceiptTotal(receipt), 0);
      const monthRevenue = monthReceipts.reduce((sum, receipt) => sum + getReceiptTotal(receipt), 0);
      const lastMonthRevenue = lastMonthReceipts.reduce((sum, receipt) => sum + getReceiptTotal(receipt), 0);
      const todayRevenue = todayReceipts.reduce((sum, receipt) => sum + getReceiptTotal(receipt), 0);
      const yesterdayRevenue = yesterdayReceipts.reduce((sum, receipt) => sum + getReceiptTotal(receipt), 0);

      const revenueChange = lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
      const todayChange = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;
      const ordersChange = lastMonthReceipts.length > 0 ? ((monthReceipts.length - lastMonthReceipts.length) / lastMonthReceipts.length) * 100 : 0;

      const avgOrderValue = monthReceipts.length > 0 ? monthRevenue / monthReceipts.length : 0;
      const lastMonthAvgOrderValue = lastMonthReceipts.length > 0 ? lastMonthRevenue / lastMonthReceipts.length : 0;
      const avgOrderValueChange = lastMonthAvgOrderValue > 0 ? ((avgOrderValue - lastMonthAvgOrderValue) / lastMonthAvgOrderValue) * 100 : 0;

      // Gross profit
      const productCostMap = {};
      products.forEach((product) => {
        if (product.id) {
          productCostMap[product.id] = product.cost || product.purchaseCost || 0;
        }
      });

      let totalCost = 0;
      monthReceipts.forEach((receipt) => {
        const items = receipt.lineItems || receipt.line_items || [];
        if (items && Array.isArray(items)) {
          items.forEach((item) => {
            const cost = productCostMap[item.item_id] || 0;
            totalCost += cost * (item.quantity || 1);
          });
        }
      });

      const grossProfit = monthRevenue - totalCost;
      const grossProfitMargin = monthRevenue > 0 ? (grossProfit / monthRevenue) * 100 : 0;

      // Avg items per transaction
      let totalItems = 0;
      monthReceipts.forEach((receipt) => {
        const items = receipt.lineItems || receipt.line_items || [];
        if (items && Array.isArray(items)) {
          items.forEach((item) => {
            totalItems += item.quantity || 1;
          });
        }
      });
      const avgItemsPerTransaction = monthReceipts.length > 0 ? totalItems / monthReceipts.length : 0;

      // Customer insights
      const customerTransactionMap = {};
      receipts.forEach((receipt) => {
        const customerId = receipt.customerId || receipt.customer_id;
        if (customerId) {
          if (!customerTransactionMap[customerId]) {
            customerTransactionMap[customerId] = { count: 0, total: 0, firstPurchase: null };
          }
          customerTransactionMap[customerId].count++;
          customerTransactionMap[customerId].total += getReceiptTotal(receipt);
          const receiptDate = getReceiptDate(receipt);
          if (!customerTransactionMap[customerId].firstPurchase || receiptDate < customerTransactionMap[customerId].firstPurchase) {
            customerTransactionMap[customerId].firstPurchase = receiptDate;
          }
        }
      });

      let newCustomerCount = 0;
      let repeatCustomerCount = 0;
      const monthCustomerSet = new Set();

      monthReceipts.forEach((receipt) => {
        const customerId = receipt.customerId || receipt.customer_id;
        if (customerId) monthCustomerSet.add(customerId);
      });

      monthCustomerSet.forEach((customerId) => {
        const customerData = customerTransactionMap[customerId];
        if (customerData) {
          if (customerData.firstPurchase >= selectedDateRange.start && customerData.firstPurchase < selectedDateRange.end) {
            newCustomerCount++;
          }
          if (customerData.count > 1) repeatCustomerCount++;
        }
      });

      const repeatCustomerRate = monthCustomerSet.size > 0 ? (repeatCustomerCount / monthCustomerSet.size) * 100 : 0;

      // Hourly sales
      const hourlySales = Array(24).fill(null).map((_, hour) => ({
        hour,
        label: hour === 0 ? '12AM' : hour < 12 ? `${hour}AM` : hour === 12 ? '12PM' : `${hour - 12}PM`,
        revenue: 0,
        orders: 0,
      }));

      monthReceipts.forEach((receipt) => {
        const receiptDate = getReceiptDate(receipt);
        if (receiptDate && !isNaN(receiptDate.getTime())) {
          const hour = receiptDate.getHours();
          hourlySales[hour].revenue += getReceiptTotal(receipt);
          hourlySales[hour].orders++;
        }
      });

      setHourlySalesData(hourlySales);

      // Low stock
      const lowStock = products
        .filter((product) => {
          const stock = product.stock ?? product.inStock ?? 0;
          return product.trackStock && stock < 10;
        })
        .sort((a, b) => (a.stock ?? a.inStock ?? 0) - (b.stock ?? b.inStock ?? 0))
        .slice(0, 10)
        .map((product) => ({
          id: product.id,
          name: product.name || product.item_name,
          stock: product.stock ?? product.inStock ?? 0,
          sku: product.sku || '',
          price: product.price || 0,
        }));

      setLowStockProducts(lowStock);

      // Top customers
      const topCustomersList = Object.entries(customerTransactionMap)
        .map(([customerId, data]) => {
          const customer = customers.find((c) => 
            c.id === customerId || c.customerId === customerId || c.customer_id === customerId || c.loyverseId === customerId
          );
          
          let customerName = "Walk-in Customer";
          if (customer) {
            customerName = customer.name || customer.customer_name ||
              (customer.first_name && customer.last_name ? `${customer.first_name} ${customer.last_name}`.trim() : customer.first_name || customer.last_name) ||
              customer.email?.split('@')[0] || customer.phone || `Customer #${customerId.slice(-6)}`;
          } else {
            customerName = `Customer #${customerId.slice(-6)}`;
          }
            
          return {
            id: customerId,
            name: customerName,
            email: customer?.email || "",
            phone: customer?.phone || "",
            totalSpent: data.total,
            orderCount: data.count,
            isUnknown: !customer,
          };
        })
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5);

      setTopCustomers(topCustomersList);

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
        grossProfit,
        grossProfitMargin: Math.round(grossProfitMargin * 10) / 10,
        totalCost,
        avgItemsPerTransaction: Math.round(avgItemsPerTransaction * 10) / 10,
        newCustomers: newCustomerCount,
        repeatCustomers: repeatCustomerCount,
        repeatCustomerRate: Math.round(repeatCustomerRate * 10) / 10,
      });

      // Daily sales
      const dailySales = [];
      if (useDateRange) {
        const startDateObj = selectedDateRange.start;
        const endDateObj = selectedDateRange.end;
        const daysDiff = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24));

        for (let i = 0; i <= daysDiff; i++) {
          const currentDay = new Date(startDateObj);
          currentDay.setDate(startDateObj.getDate() + i);
          const nextDay = new Date(currentDay);
          nextDay.setDate(currentDay.getDate() + 1);

          const dayReceipts = monthReceipts.filter((receipt) => {
            const receiptDate = getReceiptDate(receipt);
            if (!receiptDate || isNaN(receiptDate.getTime())) return false;
            return receiptDate >= currentDay && receiptDate < nextDay;
          });

          const dayRevenue = dayReceipts.reduce((sum, receipt) => sum + getReceiptTotal(receipt), 0);

          dailySales.push({
            day: currentDay.getDate().toString(),
            date: currentDay.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            revenue: dayRevenue,
            orders: dayReceipts.length,
          });
        }
      } else {
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
          const dayStart = new Date(selectedYear, selectedMonth, day);
          const dayEnd = new Date(selectedYear, selectedMonth, day + 1);

          const dayReceipts = monthReceipts.filter((receipt) => {
            const receiptDate = getReceiptDate(receipt);
            if (!receiptDate || isNaN(receiptDate.getTime())) return false;
            return receiptDate >= dayStart && receiptDate < dayEnd;
          });

          const dayRevenue = dayReceipts.reduce((sum, receipt) => sum + getReceiptTotal(receipt), 0);

          dailySales.push({
            day: day.toString(),
            date: `${selectedMonth + 1}/${day}`,
            revenue: dayRevenue,
            orders: dayReceipts.length,
          });
        }
      }

      setDailySalesData(dailySales);

      // Monthly data
      const monthlyStats = [];
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(selectedYear, month, 1);
        const monthEnd = new Date(selectedYear, month + 1, 1);

        const monthReceiptsData = receipts.filter((receipt) => {
          const receiptDate = getReceiptDate(receipt);
          if (!receiptDate || isNaN(receiptDate.getTime())) return false;
          return receiptDate >= monthStart && receiptDate < monthEnd;
        });

        const monthRev = monthReceiptsData.reduce((sum, receipt) => sum + getReceiptTotal(receipt), 0);

        monthlyStats.push({
          month: new Date(selectedYear, month).toLocaleString("default", { month: "short" }),
          revenue: monthRev,
          orders: monthReceiptsData.length,
        });
      }
      setMonthlyData(monthlyStats);

      // Top products
      const productSales = {};
      monthReceipts.forEach((receipt) => {
        const items = receipt.lineItems || receipt.line_items || [];
        if (items && Array.isArray(items)) {
          items.forEach((item) => {
            const itemName = item.item_name || "Unknown Product";
            if (!productSales[itemName]) {
              productSales[itemName] = { quantity: 0, revenue: 0 };
            }
            productSales[itemName].quantity += item.quantity || 0;
            productSales[itemName].revenue += item.total_money || 0;
          });
        }
      });

      const topProds = Object.entries(productSales)
        .map(([name, data]) => ({ name, quantity: data.quantity, revenue: data.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      setTopProducts(topProds);

      // Payment methods
      const paymentMethods = {};
      const paymentTransactionCounts = {};
      const receiptsByPaymentMethod = {};

      monthReceipts.forEach((receipt) => {
        if (receipt.payments && Array.isArray(receipt.payments) && receipt.payments.length > 0) {
          const methodsInReceipt = new Set();
          receipt.payments.forEach((payment) => {
            const method = payment.name || payment.type || "Unknown";
            if (!paymentMethods[method]) {
              paymentMethods[method] = 0;
              paymentTransactionCounts[method] = 0;
              receiptsByPaymentMethod[method] = new Set();
            }
            paymentMethods[method] += payment.money_amount || payment.amount || 0;
            methodsInReceipt.add(method);
          });
          methodsInReceipt.forEach((method) => {
            receiptsByPaymentMethod[method].add(receipt.id || receipt.createdAt);
          });
        }
      });

      Object.keys(receiptsByPaymentMethod).forEach((method) => {
        paymentTransactionCounts[method] = receiptsByPaymentMethod[method].size;
      });

      const paymentData = Object.entries(paymentMethods).map(([name, value]) => ({
        name,
        value,
        transactions: paymentTransactionCounts[name] || 0,
      }));

      setPaymentMethodsData(paymentData);

      // Recent transactions
      const allRecentTransactions = receipts
        .sort((a, b) => {
          const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return bDate - aDate;
        })
        .slice(0, 10);

      setRecentTransactions(allRecentTransactions);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    try {
      setIsRefreshing(true);
      await loadDashboardData();
      toast.success("Dashboard refreshed");
    } catch (error) {
      console.error("Error refreshing:", error);
      toast.error("Failed to refresh");
    } finally {
      setIsRefreshing(false);
    }
  };

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

  // Mobile stat cards config
  const statCards = [
    {
      title: "Period Revenue",
      value: formatCurrency(stats.monthRevenue),
      change: stats.revenueChange,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Gross Profit",
      value: formatCurrency(stats.grossProfit),
      change: stats.grossProfitMargin,
      icon: Percent,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
      isPercent: true,
    },
    {
      title: "Today's Sales",
      value: formatCurrency(stats.todayRevenue),
      change: stats.todayChange,
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Orders",
      value: stats.monthOrders,
      change: stats.ordersChange,
      icon: ShoppingCart,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Avg Order",
      value: formatCurrency(stats.avgOrderValue),
      change: stats.avgOrderValueChange,
      icon: CreditCard,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Customers",
      value: stats.newCustomers + stats.repeatCustomers,
      change: stats.repeatCustomerRate,
      icon: Users,
      color: "text-pink-600",
      bgColor: "bg-pink-100",
      isPercent: true,
    },
  ];

  // Collapsible section component
  const CollapsibleSection = ({ title, icon: Icon, sectionKey, children, badge }) => (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <button
        onClick={() => toggleSection(sectionKey)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-6 w-6 text-neutral-600 dark:text-neutral-400" />}
          <span className="text-lg font-semibold">{title}</span>
          {badge && (
            <span className="px-2 py-0.5 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {expandedSections[sectionKey] ? (
          <ChevronUp className="h-6 w-6 text-neutral-400" />
        ) : (
          <ChevronDown className="h-6 w-6 text-neutral-400" />
        )}
      </button>
      {expandedSections[sectionKey] && (
        <div className="px-4 pb-4 border-t border-neutral-100 dark:border-neutral-800 pt-4">
          {children}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 pb-24">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-neutral-200 dark:bg-neutral-800 rounded-xl w-3/4"></div>
          <div className="h-10 bg-neutral-200 dark:bg-neutral-800 rounded-xl"></div>
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-28 bg-neutral-200 dark:bg-neutral-800 rounded-2xl"></div>
            ))}
          </div>
          <div className="h-64 bg-neutral-200 dark:bg-neutral-800 rounded-2xl"></div>
          <div className="h-48 bg-neutral-200 dark:bg-neutral-800 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-neutral-500">{selectedDateRangeLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/admin/dashboard")}
              className="text-xs"
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="px-4 py-3 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {[
            { key: "today", label: "Today" },
            { key: "thisWeek", label: "This Week" },
            { key: "thisMonth", label: "This Month" },
            { key: "thisYear", label: "This Year" },
          ].map((range) => (
            <button
              key={range.key}
              onClick={() => handleDateRangeSelect(range.key, range.label)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedDateRangeLabel === range.label
                  ? "bg-green-600 text-white"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
        
        {/* Category Filter */}
        <div className="mt-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-3 text-base border border-neutral-200 dark:border-neutral-700 rounded-xl bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Stats Grid */}
        <CollapsibleSection title="Key Metrics" icon={TrendingUp} sectionKey="stats">
          <div className="grid grid-cols-2 gap-3">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              const isPositive = stat.isPercent ? true : (stat.change > 0);
              return (
                <div
                  key={index}
                  className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">{stat.title}</span>
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold mb-1">{stat.value}</p>
                  <div className="flex items-center text-sm">
                    {stat.isPercent ? (
                      <Percent className="h-4 w-4 text-blue-500 mr-1" />
                    ) : isPositive ? (
                      <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className={stat.isPercent ? "text-blue-600" : isPositive ? "text-green-600" : "text-red-600"}>
                      {Math.abs(stat.change).toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>

        {/* Daily Sales Chart */}
        <CollapsibleSection title="Daily Sales" icon={Calendar} sectionKey="dailySales">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip formatter={(value) => formatCurrency(value)} />} />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CollapsibleSection>

        {/* Monthly Revenue */}
        <CollapsibleSection title="Monthly Revenue" icon={TrendingUp} sectionKey="monthlySales">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip formatter={(value) => formatCurrency(value)} />} />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CollapsibleSection>

        {/* Peak Hours */}
        <CollapsibleSection title="Peak Hours" icon={Clock} sectionKey="hourlyPeak">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlySalesData}>
                <defs>
                  <linearGradient id="colorRevenueMobile" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 8 }} interval={2} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip formatter={(value) => formatCurrency(value)} />} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenueMobile)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {/* Peak Hour Summary */}
          {hourlySalesData.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {(() => {
                const peakHour = hourlySalesData.reduce((max, h) => h.revenue > max.revenue ? h : max, hourlySalesData[0]);
                const totalOrders = hourlySalesData.reduce((sum, h) => sum + h.orders, 0);
                return (
                  <>
                    <div className="bg-neutral-100 dark:bg-neutral-800 rounded-xl p-3 text-center">
                      <p className="text-xs text-neutral-500">Peak Hour</p>
                      <p className="text-xl font-bold text-green-600">{peakHour?.label || '-'}</p>
                      <p className="text-xs text-neutral-400">{formatCurrency(peakHour?.revenue || 0)}</p>
                    </div>
                    <div className="bg-neutral-100 dark:bg-neutral-800 rounded-xl p-3 text-center">
                      <p className="text-xs text-neutral-500">Total Orders</p>
                      <p className="text-xl font-bold text-blue-600">{totalOrders}</p>
                      <p className="text-xs text-neutral-400">in period</p>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </CollapsibleSection>

        {/* Top Products */}
        <CollapsibleSection title="Top Products" icon={Package} sectionKey="topProducts" badge={topProducts.length}>
          {topProducts.length === 0 ? (
            <p className="text-center text-neutral-500 py-8">No sales data yet</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium truncate">{product.name}</p>
                    <p className="text-sm text-neutral-500">Qty: {product.quantity}</p>
                  </div>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(product.revenue)}</p>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Payment Methods */}
        <CollapsibleSection title="Payment Methods" icon={CreditCard} sectionKey="payments">
          {paymentMethodsData.length === 0 ? (
            <p className="text-center text-neutral-500 py-8">No payment data yet</p>
          ) : (
            <>
              <div className="h-48 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentMethodsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {paymentMethodsData.map((method, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="text-base">{method.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(method.value)}</p>
                      <p className="text-xs text-neutral-500">{method.transactions} txns</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CollapsibleSection>

        {/* Low Stock Alerts */}
        <CollapsibleSection title="Low Stock Alerts" icon={AlertTriangle} sectionKey="lowStock" badge={lowStockProducts.length > 0 ? lowStockProducts.length : null}>
          {lowStockProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-neutral-300 mb-2" />
              <p className="text-neutral-500">All products are well stocked!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockProducts.map((product, index) => (
                <div key={product.id || index} className="flex items-center justify-between py-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium truncate">{product.name}</p>
                    {product.sku && <p className="text-sm text-neutral-500">SKU: {product.sku}</p>}
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${product.stock <= 3 ? 'text-red-600' : product.stock <= 5 ? 'text-amber-600' : 'text-neutral-600'}`}>
                      {product.stock} left
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Top Customers */}
        <CollapsibleSection title="Top Customers" icon={Crown} sectionKey="topCustomers">
          {topCustomers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-neutral-300 mb-2" />
              <p className="text-neutral-500">No customer data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((customer, index) => (
                <div key={customer.id || index} className="flex items-center gap-3 py-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? "bg-amber-500" : index === 1 ? "bg-neutral-400" : index === 2 ? "bg-amber-700" : "bg-neutral-300"
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-base font-medium truncate ${customer.isUnknown ? 'italic text-neutral-500' : ''}`}>
                      {customer.name}
                    </p>
                    <p className="text-sm text-neutral-500">{customer.orderCount} orders</p>
                  </div>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(customer.totalSpent)}</p>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Recent Transactions */}
        <CollapsibleSection title="Recent Transactions" icon={ShoppingCart} sectionKey="transactions">
          {recentTransactions.length === 0 ? (
            <p className="text-center text-neutral-500 py-8">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((transaction) => {
                const receiptDate = transaction.createdAt?.toDate
                  ? transaction.createdAt.toDate()
                  : new Date(transaction.createdAt);

                return (
                  <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium">
                        Receipt #{transaction.receiptNumber || transaction.id?.slice(0, 8)}
                      </p>
                      <p className="text-sm text-neutral-500">
                        {receiptDate.toLocaleString("default", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(resolveMoneyValue(transaction.total_money ?? transaction.totalMoney ?? transaction.total ?? 0))}
                      </p>
                      {transaction.payments && transaction.payments.length > 0 && (
                        <p className="text-xs text-neutral-500 capitalize">
                          {transaction.payments[0].name || transaction.payments[0].type}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
}
