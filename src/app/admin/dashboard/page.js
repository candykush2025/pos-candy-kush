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
  TrendingDown,
  Calendar,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Tag,
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
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  // Default automatic sync to disabled in admin dashboard
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncIntervalMinutes, setSyncIntervalMinutes] = useState(30);
  const [isSyncing, setIsSyncing] = useState(false);

  // Auto-sync check on dashboard mount
  useEffect(() => {
    checkAndAutoSync();
  }, []);

  const checkAndAutoSync = async () => {
    try {
      // Load sync settings
      const settings = await getDocument(COLLECTIONS.SETTINGS, "sync_settings");
      // Default to disabled if the setting is missing
      const autoSyncEnabledSetting = settings?.autoSyncEnabled ?? false;
      const intervalMinutes = settings?.syncIntervalMinutes ?? 30;

      setAutoSyncEnabled(autoSyncEnabledSetting);
      setSyncIntervalMinutes(intervalMinutes);

      if (!autoSyncEnabledSetting) {
        console.log("⏭️ Auto-sync is disabled");
        return;
      }

      // Check last sync time
      const history = await getDocument(
        COLLECTIONS.SYNC_HISTORY,
        "latest_sync"
      );

      if (!history || !history.timestamp) {
        console.log("ℹ️ No sync history found, running first sync...");
        toast.info("Running initial data sync from Loyverse...");
        await performAutoSync();
        return;
      }

      const lastSyncTime = new Date(history.timestamp);
      const now = new Date();
      const minutesSinceSync = (now - lastSyncTime) / (1000 * 60);

      console.log(
        `⏱️ Dashboard: Time since last sync: ${minutesSinceSync.toFixed(
          1
        )} minutes (interval: ${intervalMinutes} minutes)`
      );

      if (minutesSinceSync >= intervalMinutes) {
        console.log(
          `🔄 Dashboard: Auto-sync triggered - ${minutesSinceSync.toFixed(
            1
          )} minutes since last sync`
        );
        toast.info("Auto-syncing data from Loyverse...", { duration: 2000 });
        await performAutoSync();
      }
    } catch (error) {
      console.error("Error checking auto-sync:", error);
    }
  };

  const performAutoSync = async () => {
    if (isSyncing) {
      console.log("⏭️ Sync already in progress");
      return;
    }

    try {
      setIsSyncing(true);

      // Sync categories first (needed for products)
      console.log("🔄 Syncing categories...");
      const categoriesResponse = await loyverseService.getAllCategories({
        show_deleted: false,
      });

      const categoriesData = categoriesResponse.categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        color: cat.color || "#808080",
        createdAt: cat.created_at,
        updatedAt: cat.updated_at,
        deletedAt: cat.deleted_at,
        source: "loyverse",
      }));

      // Save categories
      for (const cat of categoriesData) {
        await setDocument(COLLECTIONS.CATEGORIES, cat.id, cat);
      }

      console.log(`✅ Synced ${categoriesData.length} categories`);

      // Sync products/items
      console.log("🔄 Syncing products...");
      const itemsResponse = await loyverseService.getAllItems({
        show_deleted: false,
      });

      const items = itemsResponse.items.map((item) => {
        const primaryVariant = item.variants?.[0] || {};
        return {
          id: item.id,
          handle: item.handle || "",
          name: item.item_name || "",
          description: item.description || "",
          referenceId: item.reference_id || "",
          categoryId: item.category_id || null,
          trackStock: item.track_stock || false,
          soldByWeight: item.sold_by_weight || false,
          isComposite: item.is_composite || false,
          useProduction: item.use_production || false,
          form: item.form || null,
          color: item.color || null,
          imageUrl: item.image_url || null,
          option1Name: item.option1_name || null,
          option2Name: item.option2_name || null,
          option3Name: item.option3_name || null,
          variantId: primaryVariant.variant_id || null,
          sku: primaryVariant.sku || "",
          barcode: primaryVariant.barcode || "",
          price: parseFloat(primaryVariant.default_price || 0),
          cost: parseFloat(primaryVariant.cost || 0),
          purchaseCost: parseFloat(primaryVariant.purchase_cost || 0),
          pricingType: primaryVariant.default_pricing_type || "FIXED",
          stock: primaryVariant.stores?.[0]?.stock_quantity || 0,
          availableForSale:
            primaryVariant.stores?.[0]?.available_for_sale !== false,
          variants: item.variants || [],
          primarySupplierId: item.primary_supplier_id || null,
          taxIds: item.tax_ids || [],
          modifiersIds: item.modifiers_ids || [],
          components: item.components || [],
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          deletedAt: item.deleted_at || null,
          source: "loyverse",
        };
      });

      // Save products (preserve stock data if exists)
      let productsUpdated = 0;
      for (const item of items) {
        const existing = await getDocument(COLLECTIONS.PRODUCTS, item.id);
        let itemToSave = { ...item };

        // Preserve manually synced stock data
        if (
          existing &&
          existing.lastInventorySync &&
          (existing.stock > 0 ||
            existing.inStock > 0 ||
            existing.inventoryLevels)
        ) {
          if (existing.stock !== undefined && existing.stock !== null)
            itemToSave.stock = existing.stock;
          if (existing.inStock !== undefined && existing.inStock !== null)
            itemToSave.inStock = existing.inStock;
          if (
            existing.inventoryLevels !== undefined &&
            existing.inventoryLevels !== null
          )
            itemToSave.inventoryLevels = existing.inventoryLevels;
          if (
            existing.lastInventorySync !== undefined &&
            existing.lastInventorySync !== null
          )
            itemToSave.lastInventorySync = existing.lastInventorySync;
        }

        await setDocument(COLLECTIONS.PRODUCTS, item.id, itemToSave);
        productsUpdated++;
      }

      console.log(`✅ Synced ${productsUpdated} products`);

      // Quick sync receipts (only fetch new receipts since last sync)
      console.log("🔄 Quick syncing receipts...");
      let receiptsCount = 0;

      try {
        // Get last receipt sync timestamp
        const lastReceiptSync = await getDocument(
          COLLECTIONS.SYNC_HISTORY,
          "latest_receipt_sync"
        );

        let created_at_min = null;
        if (lastReceiptSync && lastReceiptSync.timestamp) {
          created_at_min = lastReceiptSync.timestamp;
          console.log(
            `⚡ Quick sync: Fetching receipts created after ${created_at_min}`
          );
        } else {
          console.log(
            "ℹ️ No previous receipt sync found, fetching recent receipts"
          );
        }

        const allReceipts = [];
        let cursor = null;
        let hasMore = true;

        while (hasMore) {
          const requestParams = {
            limit: 250,
            cursor: cursor,
          };

          // Add created_at_min for quick sync
          if (created_at_min) {
            requestParams.created_at_min = created_at_min;
          }

          const response = await loyverseService.getReceipts(requestParams);
          const receipts = response.receipts || [];
          allReceipts.push(...receipts);

          cursor = response.cursor;
          hasMore = !!cursor;
        }

        console.log(`📥 Fetched ${allReceipts.length} receipts`);

        // Save receipts to Firestore
        const syncTimestamp = new Date().toISOString();
        let newCount = 0;
        let updatedCount = 0;

        for (const receipt of allReceipts) {
          const existing = await getDocument(
            COLLECTIONS.RECEIPTS,
            receipt.receipt_number
          );

          const receiptData = {
            id: receipt.receipt_number,
            receiptNumber: receipt.receipt_number,
            receiptType: receipt.receipt_type || "SALE",
            refundFor: receipt.refund_for || null,
            order: receipt.order || null,
            receiptDate: receipt.receipt_date,
            createdAt: receipt.created_at,
            updatedAt: receipt.updated_at,
            totalMoney: parseFloat(receipt.total_money || 0),
            totalTax: parseFloat(receipt.total_tax || 0),
            pointsEarned: receipt.points_earned || 0,
            pointsDeducted: receipt.points_deducted || 0,
            note: receipt.note || "",
            lineItems: receipt.line_items || [],
            payments: receipt.payments || [],
            customerId: receipt.customer_id || null,
            employeeId: receipt.employee_id || null,
            storeId: receipt.store_id || null,
            source: "loyverse",
            syncedAt: syncTimestamp,
          };

          await setDocument(
            COLLECTIONS.RECEIPTS,
            receipt.receipt_number,
            receiptData
          );

          if (existing) {
            updatedCount++;
          } else {
            newCount++;
          }
        }

        receiptsCount = allReceipts.length;
        console.log(
          `✅ Quick synced ${receiptsCount} receipts (${newCount} new, ${updatedCount} updated)`
        );

        // Save latest receipt sync timestamp
        await setDocument(COLLECTIONS.SYNC_HISTORY, "latest_receipt_sync", {
          timestamp: syncTimestamp,
          count: allReceipts.length,
          newCount,
          updatedCount,
          syncType: "quick",
          source: "dashboard_auto",
        });
      } catch (receiptError) {
        console.error("❌ Receipt quick sync failed:", receiptError);
        // Don't fail entire auto-sync if receipts fail
      }

      // Update last sync timestamp
      await setDocument(COLLECTIONS.SYNC_HISTORY, "latest_sync", {
        timestamp: new Date().toISOString(),
        type: "auto",
        source: "dashboard",
        categoriesCount: categoriesData.length,
        productsCount: productsUpdated,
        receiptsCount,
      });

      toast.success("Auto-sync completed successfully", { duration: 3000 });

      // Reload categories and dashboard data after sync
      await loadCategories();
    } catch (error) {
      console.error("❌ Auto-sync failed:", error);
      toast.error("Auto-sync failed: " + error.message, { duration: 5000 });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (categories.length > 0) {
      loadDashboardData();
    }
  }, [selectedMonth, selectedYear, selectedCategory, categories]);

  const loadCategories = async () => {
    try {
      const data = await categoriesService.getAll();
      setCategories(data);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get receipts (transactions) from Loyverse
      let receipts = await receiptsService.getAll({
        orderBy: ["createdAt", "desc"],
      });

      // Get products and customers first (needed for category filtering)
      const products = await productsService.getAll();
      const customers = await customersService.getAll();

      // Debug: Check receipt structure before filtering
      if (receipts.length > 0 && receipts[0].lineItems) {
        console.log("🔍 Sample receipt lineItem:", receipts[0].lineItems[0]);
        console.log(
          "🔍 Available fields:",
          Object.keys(receipts[0].lineItems[0])
        );
      }

      // Filter by category if selected
      if (selectedCategory !== "all") {
        console.log("🔍 Filtering by category:", selectedCategory);
        console.log("🔍 Total products:", products.length);
        const originalCount = receipts.length;

        // Create a map of item_id -> categoryId for quick lookup
        const itemCategoryMap = {};
        products.forEach((product) => {
          if (product.id && product.categoryId) {
            itemCategoryMap[product.id] = product.categoryId;
          }
        });

        console.log(
          "🔍 Item category map size:",
          Object.keys(itemCategoryMap).length
        );

        receipts = receipts.filter((receipt) => {
          if (receipt.lineItems && Array.isArray(receipt.lineItems)) {
            const hasCategory = receipt.lineItems.some((item) => {
              // Get category from product using item_id
              const itemCategory = itemCategoryMap[item.item_id];
              const matches = itemCategory === selectedCategory;
              return matches;
            });
            return hasCategory;
          }
          return false;
        });

        console.log(
          `🔍 Filtered from ${originalCount} to ${receipts.length} receipts`
        );
      }

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
      <div className="space-y-4 md:space-y-6 pb-20 md:pb-8 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-64"></div>
            <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-48"></div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="h-10 bg-neutral-200 dark:bg-neutral-800 rounded w-full sm:w-40"></div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="h-10 bg-neutral-200 dark:bg-neutral-800 rounded flex-1 sm:w-32"></div>
              <div className="h-10 bg-neutral-200 dark:bg-neutral-800 rounded flex-1 sm:w-24"></div>
            </div>
          </div>
        </div>

        {/* Stats Cards Skeleton - 2x2 on mobile, 4 on desktop */}
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-24"></div>
                  <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-16"></div>
                </div>
                <div className="w-10 h-10 bg-neutral-200 dark:bg-neutral-800 rounded-lg"></div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-32"></div>
                <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-28"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Skeleton - Stacked on mobile */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <div className="h-6 bg-neutral-200 dark:bg-neutral-800 rounded w-48"></div>
                <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-36"></div>
              </CardHeader>
              <CardContent>
                <div className="h-64 md:h-80 bg-neutral-100 dark:bg-neutral-900 rounded-lg flex items-end justify-around p-4 gap-2">
                  {[40, 60, 45, 70, 55, 80, 65].map((height, idx) => (
                    <div
                      key={idx}
                      className="bg-neutral-200 dark:bg-neutral-800 rounded-t w-full animate-pulse"
                      style={{
                        height: `${height}%`,
                        animationDelay: `${idx * 0.1}s`,
                      }}
                    ></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom Row Skeleton - 3 sections */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <div className="h-6 bg-neutral-200 dark:bg-neutral-800 rounded w-40"></div>
                <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-32"></div>
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-full"></div>
                      <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4"></div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading indicator at bottom */}
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
            <span className="text-sm font-medium">Loading sales data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-8 animate-in fade-in duration-500">
      {/* Header with Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-in slide-in-from-top duration-300">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Sales Dashboard</h1>
          <p className="text-sm md:text-base text-neutral-500 dark:text-neutral-400 mt-1">
            Candy Kush POS - Sales Analytics
            {selectedCategory !== "all" && (
              <span className="inline-flex items-center ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                <Tag className="h-3 w-3 mr-1" />
                {categories.find((c) => c.id === selectedCategory)?.name}
              </span>
            )}
            {isSyncing && (
              <span className="inline-flex items-center ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 animate-pulse">
                <svg
                  className="animate-spin h-3 w-3 mr-1"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Syncing...
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Category Filter - Full width on mobile */}
          <div className="relative w-full sm:w-auto">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full sm:w-auto pl-10 pr-3 py-2 border rounded-lg text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-white appearance-none cursor-pointer sm:min-w-[180px]"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Month & Year Row - 50/50 on mobile, inline on desktop */}
          <div className="flex gap-2 w-full sm:w-auto">
            {/* Month Selector */}
            <div className="relative flex-1 sm:flex-initial">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-white appearance-none cursor-pointer"
              >
                {months.map((month, index) => (
                  <option key={index} value={index}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Selector */}
            <div className="flex-1 sm:flex-initial">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-white appearance-none cursor-pointer"
              >
                {[2024, 2025, 2026].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Key Stats Grid - Mobile Friendly (2x2 on mobile, 4 columns on desktop) */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4 animate-in slide-in-from-bottom duration-500">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const isPositive = stat.change ? stat.change > 0 : null;

          return (
            <Card
              key={index}
              className="hover:shadow-lg transition-all hover:scale-105 duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
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
      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2 animate-in slide-in-from-left duration-700">
        {/* Daily Sales Chart */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
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
        <Card className="hover:shadow-lg transition-shadow duration-300">
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
      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2 animate-in slide-in-from-right duration-700">
        {/* Top Products */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
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
                    className="flex items-center justify-between pb-3 border-b last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 -mx-4 px-4 rounded-lg transition-all duration-200 cursor-pointer hover:scale-102"
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
        <Card className="hover:shadow-lg transition-shadow duration-300">
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
      <Card className="hover:shadow-lg transition-shadow duration-300 animate-in slide-in-from-bottom animation-duration-700">
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
                    className="flex items-center justify-between border-b pb-3 last:border-0 gap-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 -mx-4 px-4 rounded-lg transition-all duration-200 cursor-pointer"
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
