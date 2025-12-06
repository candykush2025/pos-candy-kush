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
  categoriesService,
} from "@/lib/firebase/firestore";
import {
  ArrowLeft,
  Calendar,
  Tag,
  ChevronDown,
  Search,
  Package,
  TrendingUp,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function SoldItemsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  const [allSoldProducts, setAllSoldProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Date range
  const [selectedDateRange, setSelectedDateRange] = useState("thisMonth");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCustomPeriodModal, setShowCustomPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState([null, null]);
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [selectedDateRangeLabel, setSelectedDateRangeLabel] =
    useState("This Month");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Search
  const [searchQuery, setSearchQuery] = useState("");

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

  // Auth check
  useEffect(() => {
    if (!user && !isAuthenticated) {
      router.push("/login");
    }
  }, [user, isAuthenticated, router]);

  // Load data when filters change
  useEffect(() => {
    loadSoldItems();
  }, [
    selectedDateRange,
    selectedMonth,
    selectedYear,
    customStartDate,
    customEndDate,
  ]);

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

  const loadSoldItems = async () => {
    setLoading(true);
    try {
      const receipts = await receiptsService.getAll();
      const products = await productsService.getAll();

      // Build product-to-category map
      const productCategoryMap = {};
      products.forEach((p) => {
        if (p.id) productCategoryMap[p.id] = p.categoryId || p.category_id;
        if (p.loyverseId)
          productCategoryMap[p.loyverseId] = p.categoryId || p.category_id;
      });

      const { startDate, endDate } = getDateRange();
      const productSales = {};

      receipts.forEach((receipt) => {
        const receiptDate =
          receipt.createdAt?.toDate?.() || new Date(receipt.createdAt);
        if (!receiptDate || isNaN(receiptDate.getTime())) return;

        // Date filter
        if (receiptDate < startDate || receiptDate > endDate) return;

        // Process items
        const items =
          receipt.lineItems || receipt.line_items || receipt.items || [];
        items.forEach((item) => {
          const itemId = item.item_id || item.itemId || item.id;
          const itemCategoryId = productCategoryMap[itemId];
          const name = item.item_name || item.name || "Unknown";

          if (!productSales[name]) {
            productSales[name] = {
              quantity: 0,
              revenue: 0,
              categoryId: itemCategoryId,
              transactions: 0,
            };
          }
          productSales[name].quantity += item.quantity || 1;
          productSales[name].revenue +=
            item.total_money ||
            item.total ||
            item.price * (item.quantity || 1) ||
            0;
          productSales[name].transactions++;
        });
      });

      const soldProducts = Object.entries(productSales)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue);

      setAllSoldProducts(soldProducts);
    } catch (error) {
      console.error("Error loading sold items:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter products
  const filteredProducts = allSoldProducts.filter((product) => {
    // Category filter
    if (selectedCategory !== "all" && product.categoryId !== selectedCategory) {
      return false;
    }
    // Search filter
    if (
      searchQuery &&
      !product.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Calculate totals
  const totalItems = filteredProducts.reduce((sum, p) => sum + p.quantity, 0);
  const totalRevenue = filteredProducts.reduce((sum, p) => sum + p.revenue, 0);

  const getDateLabel = () => {
    if (
      selectedDateRange === "customPeriod" &&
      customStartDate &&
      customEndDate
    ) {
      return selectedDateRangeLabel;
    }
    if (selectedDateRange === "thisMonth") {
      return `${months[selectedMonth]} ${selectedYear}`;
    }
    return (
      dateRangeOptions.find((o) => o.value === selectedDateRange)?.label ||
      "This Month"
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-2xl text-neutral-600 dark:text-neutral-400">
            Loading Sold Items...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={() => router.back()}
          className="h-14 w-14 p-0"
        >
          <ArrowLeft className="h-7 w-7" />
        </Button>
        <div>
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-white">
            Sold Items
          </h1>
          <p className="text-xl text-neutral-500 dark:text-neutral-400">
            {getDateLabel()}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-neutral-400" />
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-14 pl-14 pr-12 text-xl rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 transform -translate-y-1/2"
          >
            <X className="h-6 w-6 text-neutral-400" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        {/* Date Range Filter */}
        <div className="relative">
          <Button
            onClick={() => setShowDatePicker(!showDatePicker)}
            variant="outline"
            className="w-full h-14 text-xl font-bold justify-between"
          >
            <span className="flex items-center">
              <Calendar className="h-6 w-6 mr-3" />
              {getDateLabel()}
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

              {/* Month/Year selector */}
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

        {/* Category Filter */}
        <div className="relative">
          <Button
            onClick={() => setShowCategoryPicker(!showCategoryPicker)}
            variant="outline"
            className="w-full h-14 text-xl font-bold justify-between"
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
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                <Package className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="text-lg text-neutral-500">Total Items</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {totalItems}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <p className="text-lg text-neutral-500">Total Revenue</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(totalRevenue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Count */}
      <p className="text-xl text-neutral-500">
        Showing {filteredProducts.length} of {allSoldProducts.length} products
      </p>

      {/* Products List */}
      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="h-16 w-16 mx-auto text-neutral-300 mb-4" />
            <p className="text-2xl text-neutral-500">No products found</p>
            <p className="text-lg text-neutral-400 mt-2">
              Try adjusting your filters
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredProducts.map((product, index) => {
            const categoryName = categories.find(
              (c) => c.id === product.categoryId
            )?.name;
            return (
              <Card key={index}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xl text-neutral-900 dark:text-white truncate">
                        {product.name}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-lg text-neutral-500">
                          Qty: {product.quantity}
                        </span>
                        <span className="text-lg text-neutral-500">
                          • {product.transactions} sales
                        </span>
                      </div>
                      {categoryName && (
                        <span className="inline-block mt-2 text-sm bg-neutral-200 dark:bg-neutral-700 px-3 py-1 rounded-lg">
                          {categoryName}
                        </span>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-bold text-2xl text-green-600 dark:text-green-400">
                        {formatCurrency(product.revenue)}
                      </p>
                      <p className="text-sm text-neutral-500 mt-1">
                        Avg:{" "}
                        {formatCurrency(product.revenue / product.quantity)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
              onChange={(update) => setDateRange(update)}
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
                  setSelectedDateRangeLabel(
                    `${formattedStart} - ${formattedEnd}`
                  );
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
