/**
 * Mobile API Endpoint
 * Comprehensive API for Android/iOS mobile apps
 *
 * Endpoints:
 * - POST /api/mobile?action=login - User authentication (returns JWT)
 * - GET /api/mobile?action=sales-summary - Sales summary with metrics
 * - GET /api/mobile?action=sales-by-item - Sales breakdown by item/product
 * - GET /api/mobile?action=sales-by-category - Sales breakdown by category
 * - GET /api/mobile?action=sales-by-employee - Sales breakdown by employee
 * - GET /api/mobile?action=stock - Current inventory stock levels
 * - GET /api/mobile?action=stock-history - Complete stock movement history
 * - GET /api/mobile?action=get-items - Get all products/items with category info
 * - GET /api/mobile?action=get-categories - Get all categories
 *
 * Authentication: All endpoints except login require JWT token in Authorization header
 * Filter Parameters (for all sales endpoints):
 * - period: today | this_week | this_month | this_year | custom
 * - start_date: ISO 8601 date (required if period=custom)
 * - end_date: ISO 8601 date (required if period=custom)
 * - employee_ids: Comma-separated employee IDs (optional)
 */

import {
  receiptsService,
  productsService,
  categoriesService,
  invoicesService,
  purchasesService,
  expensesService,
  getDocuments,
} from "@/lib/firebase/firestore";
import { stockHistoryService } from "@/lib/firebase/stockHistoryService";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { jwtUtils } from "@/lib/jwt";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  subDays,
  eachDayOfInterval,
  format,
} from "date-fns";

// CORS headers for mobile apps
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "no-cache, no-store, must-revalidate",
};

// Helper: Get date range based on period
function getDateRange(period, startDate, endDate) {
  const now = new Date();

  switch (period) {
    case "today":
      return {
        from: startOfDay(now),
        to: endOfDay(now),
      };
    case "this_week":
      return {
        from: startOfWeek(now, { weekStartsOn: 1 }), // Monday
        to: endOfDay(now),
      };
    case "this_month":
      return {
        from: startOfMonth(now),
        to: endOfDay(now),
      };
    case "this_year":
      return {
        from: startOfYear(now),
        to: endOfDay(now),
      };
    case "custom":
      if (!startDate || !endDate) {
        throw new Error(
          "start_date and end_date are required for custom period"
        );
      }
      return {
        from: startOfDay(new Date(startDate)),
        to: endOfDay(new Date(endDate)),
      };
    default:
      // Default to last 30 days
      return {
        from: startOfDay(subDays(now, 30)),
        to: endOfDay(now),
      };
  }
}

// Helper: Get receipt date from various field formats
function getReceiptDate(receipt) {
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
}

// Helper: Get receipt total
function getReceiptTotal(receipt) {
  return receipt.totalMoney || receipt.total_money || receipt.total || 0;
}

// Helper: Get receipt discount
function getReceiptDiscount(receipt) {
  return (
    receipt.totalDiscount || receipt.total_discount || receipt.discount || 0
  );
}

// Helper: Get receipt tax
function getReceiptTax(receipt) {
  return receipt.totalTax || receipt.total_tax || receipt.tax || 0;
}

// Helper: Filter receipts by date range and employees
function filterReceipts(receipts, dateRange, employeeIds = []) {
  return receipts.filter((receipt) => {
    const receiptDate = getReceiptDate(receipt);

    // Date range filter
    if (receiptDate < dateRange.from || receiptDate > dateRange.to) {
      return false;
    }

    // Employee filter - check all possible employee ID fields
    if (employeeIds.length > 0) {
      const employeeId =
        receipt.employeeId ||
        receipt.employee_id ||
        receipt.userId ||
        receipt.user_id ||
        receipt.cashierId ||
        receipt.cashier_id ||
        receipt.processedBy;
      if (!employeeId || !employeeIds.includes(employeeId)) {
        return false;
      }
    }

    return true;
  });
}

// Helper: Group receipts by day
function groupReceiptsByDay(receipts, dateRange) {
  // Get all dates in the range
  const daysInRange = eachDayOfInterval({
    start: dateRange.from,
    end: dateRange.to,
  });

  // Create a map for each day
  const dayMap = new Map();
  daysInRange.forEach((day) => {
    const dateKey = format(day, "yyyy-MM-dd");
    dayMap.set(dateKey, {
      date: dateKey,
      receipts: [],
    });
  });

  // Group receipts by day
  receipts.forEach((receipt) => {
    const receiptDate = getReceiptDate(receipt);
    const dateKey = format(receiptDate, "yyyy-MM-dd");
    if (dayMap.has(dateKey)) {
      dayMap.get(dateKey).receipts.push(receipt);
    }
  });

  return Array.from(dayMap.values());
}

// Calculate Sales Summary - Day by Day
async function getSalesSummary(receipts, dateRange) {
  const groupedByDay = groupReceiptsByDay(receipts, dateRange);

  // Calculate metrics for each day
  const dailyData = groupedByDay.map((dayData) => {
    const dayReceipts = dayData.receipts;
    const salesReceipts = dayReceipts.filter((r) => r.receiptType !== "REFUND");
    const refundReceipts = dayReceipts.filter(
      (r) => r.receiptType === "REFUND"
    );

    const grossSales = salesReceipts.reduce(
      (sum, r) => sum + getReceiptTotal(r),
      0
    );
    const refunds = refundReceipts.reduce(
      (sum, r) => sum + Math.abs(getReceiptTotal(r)),
      0
    );
    const discounts = dayReceipts.reduce(
      (sum, r) => sum + getReceiptDiscount(r),
      0
    );
    const taxes = dayReceipts.reduce((sum, r) => sum + getReceiptTax(r), 0);
    const netSales = grossSales - refunds - discounts;

    // Calculate cost of goods
    let costOfGoods = 0;
    dayReceipts.forEach((receipt) => {
      const lineItems = receipt.lineItems || receipt.line_items || [];
      lineItems.forEach((item) => {
        const cost = item.cost || item.item_cost || 0;
        const qty = item.quantity || 1;
        costOfGoods += cost * qty;
      });
    });

    const grossProfit = netSales - costOfGoods;
    const profitMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

    // Transaction counts
    const transactionCount = salesReceipts.length;
    const refundCount = refundReceipts.length;
    const averageTransaction =
      transactionCount > 0 ? grossSales / transactionCount : 0;

    // Items sold
    const itemsSold = salesReceipts.reduce((sum, receipt) => {
      const lineItems = receipt.lineItems || receipt.line_items || [];
      return (
        sum +
        lineItems.reduce((itemSum, item) => itemSum + (item.quantity || 1), 0)
      );
    }, 0);

    return {
      date: dayData.date,
      metrics: {
        gross_sales: Math.round(grossSales * 100) / 100,
        refunds: Math.round(refunds * 100) / 100,
        discounts: Math.round(discounts * 100) / 100,
        taxes: Math.round(taxes * 100) / 100,
        net_sales: Math.round(netSales * 100) / 100,
        cost_of_goods: Math.round(costOfGoods * 100) / 100,
        gross_profit: Math.round(grossProfit * 100) / 100,
        profit_margin: Math.round(profitMargin * 100) / 100,
      },
      transactions: {
        total_count: transactionCount,
        refund_count: refundCount,
        average_value: Math.round(averageTransaction * 100) / 100,
        items_sold: itemsSold,
      },
      receipts: dayReceipts.map((receipt) => ({
        receipt_id: receipt.id,
        receipt_number: receipt.receiptNumber || receipt.receipt_number,
        receipt_type: receipt.receiptType || receipt.receipt_type,
        total: Math.round(getReceiptTotal(receipt) * 100) / 100,
        discount: Math.round(getReceiptDiscount(receipt) * 100) / 100,
        tax: Math.round(getReceiptTax(receipt) * 100) / 100,
        employee_id:
          receipt.employeeId ||
          receipt.employee_id ||
          receipt.userId ||
          receipt.user_id,
        employee_name:
          receipt.employeeName || receipt.cashierName || receipt.userName,
        timestamp: getReceiptDate(receipt).toISOString(),
        line_items: (receipt.lineItems || receipt.line_items || []).map(
          (item) => ({
            item_id: item.item_id || item.itemId || item.id,
            item_name: item.item_name || item.itemName || item.name,
            quantity: item.quantity || 1,
            price: item.price || item.item_price || 0,
            total: item.line_total || item.lineTotal || item.total_money || 0,
            cost: item.cost || item.item_cost || 0,
            discount: item.discount || item.line_discount || 0,
          })
        ),
      })),
    };
  });

  return {
    period: {
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString(),
    },
    daily_data: dailyData,
  };
}

// Calculate Sales by Item - Day by Day
async function getSalesByItem(receipts, products, dateRange) {
  const groupedByDay = groupReceiptsByDay(receipts, dateRange);

  // Create product lookup map
  const productMap = new Map();
  products.forEach((product) => {
    productMap.set(product.id, {
      name: product.name || "Unknown Product",
      category:
        product.categoryName ||
        product.category ||
        product.category_name ||
        "Uncategorized",
      sku: product.sku || product.SKU || "",
    });
  });

  // Calculate for each day
  const dailyData = groupedByDay.map((dayData) => {
    const dayReceipts = dayData.receipts.filter(
      (r) => r.receiptType !== "REFUND"
    );
    const itemSalesMap = new Map();

    dayReceipts.forEach((receipt) => {
      const lineItems = receipt.lineItems || receipt.line_items || [];
      lineItems.forEach((item) => {
        const itemId =
          item.item_id || item.itemId || item.id || item.productId || "unknown";
        const itemName =
          item.item_name ||
          item.itemName ||
          item.name ||
          productMap.get(itemId)?.name ||
          "Unknown Item";
        const category =
          item.category ||
          item.categoryName ||
          productMap.get(itemId)?.category ||
          "Uncategorized";
        const sku = item.sku || productMap.get(itemId)?.sku || "";

        const quantity = item.quantity || 1;
        const price = item.price || item.item_price || 0;
        const lineTotal =
          item.line_total ||
          item.lineTotal ||
          item.total_money ||
          price * quantity;
        const cost = item.cost || item.item_cost || 0;
        const costTotal = cost * quantity;
        const discount = item.discount || item.line_discount || 0;

        if (itemSalesMap.has(itemId)) {
          const existing = itemSalesMap.get(itemId);
          existing.quantity_sold += quantity;
          existing.gross_sales += lineTotal;
          existing.cost_of_goods += costTotal;
          existing.discounts += discount;
          existing.transaction_count += 1;
        } else {
          itemSalesMap.set(itemId, {
            item_id: itemId,
            item_name: itemName,
            category: category,
            sku: sku,
            quantity_sold: quantity,
            gross_sales: lineTotal,
            cost_of_goods: costTotal,
            discounts: discount,
            transaction_count: 1,
          });
        }
      });
    });

    // Convert to array and calculate net sales/profit
    const items = Array.from(itemSalesMap.values()).map((item) => ({
      ...item,
      gross_sales: Math.round(item.gross_sales * 100) / 100,
      net_sales: Math.round((item.gross_sales - item.discounts) * 100) / 100,
      cost_of_goods: Math.round(item.cost_of_goods * 100) / 100,
      discounts: Math.round(item.discounts * 100) / 100,
      gross_profit:
        Math.round(
          (item.gross_sales - item.discounts - item.cost_of_goods) * 100
        ) / 100,
      profit_margin:
        item.gross_sales > 0
          ? Math.round(
              ((item.gross_sales - item.discounts - item.cost_of_goods) /
                item.gross_sales) *
                10000
            ) / 100
          : 0,
      average_price:
        item.quantity_sold > 0
          ? Math.round((item.gross_sales / item.quantity_sold) * 100) / 100
          : 0,
    }));

    // Sort by gross sales descending
    items.sort((a, b) => b.gross_sales - a.gross_sales);

    return {
      date: dayData.date,
      items: items,
    };
  });

  return {
    period: {
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString(),
    },
    daily_data: dailyData,
  };
}

// Calculate Sales by Category - Day by Day
async function getSalesByCategory(receipts, products, categories, dateRange) {
  const groupedByDay = groupReceiptsByDay(receipts, dateRange);

  // Create category name lookup
  const categoryNameMap = new Map();
  categoryNameMap.set("uncategorized", "Uncategorized");
  categories.forEach((cat) => {
    categoryNameMap.set(cat.id, cat.name || "Unknown Category");
  });

  // Create product to category mapping
  const productCategoryMap = new Map();
  products.forEach((product) => {
    const categoryId =
      product.category_id ||
      product.categoryId ||
      product.category ||
      "uncategorized";
    productCategoryMap.set(product.id, categoryId);
    if (product.name) {
      productCategoryMap.set(product.name, categoryId);
    }
  });

  // Calculate for each day
  const dailyData = groupedByDay.map((dayData) => {
    const dayReceipts = dayData.receipts.filter(
      (r) => r.receiptType !== "REFUND"
    );
    const categorySalesMap = new Map();

    dayReceipts.forEach((receipt) => {
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
        const discount = item.discount || item.line_discount || 0;

        if (categorySalesMap.has(categoryId)) {
          const existing = categorySalesMap.get(categoryId);
          existing.quantity_sold += quantity;
          existing.gross_sales += lineTotal;
          existing.cost_of_goods += costTotal;
          existing.discounts += discount;
          existing.item_count += 1;
        } else {
          categorySalesMap.set(categoryId, {
            category_id: categoryId,
            category_name: categoryName,
            quantity_sold: quantity,
            gross_sales: lineTotal,
            cost_of_goods: costTotal,
            discounts: discount,
            item_count: 1,
          });
        }
      });
    });

    // Calculate totals for percentages
    const totalRevenue = Array.from(categorySalesMap.values()).reduce(
      (sum, cat) => sum + cat.gross_sales,
      0
    );

    // Convert to array and add percentages
    const categoriesList = Array.from(categorySalesMap.values()).map((cat) => ({
      ...cat,
      gross_sales: Math.round(cat.gross_sales * 100) / 100,
      net_sales: Math.round((cat.gross_sales - cat.discounts) * 100) / 100,
      cost_of_goods: Math.round(cat.cost_of_goods * 100) / 100,
      discounts: Math.round(cat.discounts * 100) / 100,
      gross_profit:
        Math.round(
          (cat.gross_sales - cat.discounts - cat.cost_of_goods) * 100
        ) / 100,
      percentage_of_sales:
        totalRevenue > 0
          ? Math.round((cat.gross_sales / totalRevenue) * 10000) / 100
          : 0,
    }));

    // Sort by gross sales descending
    categoriesList.sort((a, b) => b.gross_sales - a.gross_sales);

    return {
      date: dayData.date,
      categories: categoriesList,
    };
  });

  return {
    period: {
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString(),
    },
    daily_data: dailyData,
  };
}

// Calculate Sales by Employee - Day by Day
async function getSalesByEmployee(receipts, users, dateRange) {
  const groupedByDay = groupReceiptsByDay(receipts, dateRange);

  // Create user name lookup
  const userNameMap = new Map();
  userNameMap.set("unknown", "Unknown Employee");
  users.forEach((user) => {
    userNameMap.set(user.id, user.name || user.email || "Unknown");
    if (user.email) {
      userNameMap.set(user.email, user.name || user.email);
    }
  });

  // Calculate for each day
  const dailyData = groupedByDay.map((dayData) => {
    const employeeSalesMap = new Map();

    dayData.receipts.forEach((receipt) => {
      const employeeId =
        receipt.employee_id ||
        receipt.employeeId ||
        receipt.cashier_id ||
        receipt.cashierId ||
        receipt.userId ||
        receipt.user_id ||
        receipt.processedBy ||
        "unknown";

      let employeeName = userNameMap.get(employeeId);
      if (!employeeName) {
        employeeName =
          receipt.employeeName ||
          receipt.cashierName ||
          receipt.userName ||
          "Unknown Employee";
      }

      const isRefund =
        receipt.receiptType === "REFUND" || receipt.receipt_type === "REFUND";
      const total = getReceiptTotal(receipt);
      const discount = getReceiptDiscount(receipt);
      const itemCount = (receipt.lineItems || receipt.line_items || []).reduce(
        (sum, item) => sum + (item.quantity || 1),
        0
      );

      if (employeeSalesMap.has(employeeId)) {
        const existing = employeeSalesMap.get(employeeId);
        if (isRefund) {
          existing.refunds += Math.abs(total);
          existing.refund_count += 1;
        } else {
          existing.gross_sales += total;
          existing.transaction_count += 1;
          existing.items_sold += itemCount;
        }
        existing.discounts += discount;
      } else {
        employeeSalesMap.set(employeeId, {
          employee_id: employeeId,
          employee_name: employeeName,
          gross_sales: isRefund ? 0 : total,
          refunds: isRefund ? Math.abs(total) : 0,
          discounts: discount,
          transaction_count: isRefund ? 0 : 1,
          refund_count: isRefund ? 1 : 0,
          items_sold: isRefund ? 0 : itemCount,
        });
      }
    });

    // Convert to array and calculate net sales
    const employees = Array.from(employeeSalesMap.values()).map((emp) => ({
      ...emp,
      gross_sales: Math.round(emp.gross_sales * 100) / 100,
      refunds: Math.round(emp.refunds * 100) / 100,
      discounts: Math.round(emp.discounts * 100) / 100,
      net_sales:
        Math.round((emp.gross_sales - emp.refunds - emp.discounts) * 100) / 100,
      average_transaction:
        emp.transaction_count > 0
          ? Math.round((emp.gross_sales / emp.transaction_count) * 100) / 100
          : 0,
    }));

    // Sort by gross sales descending
    employees.sort((a, b) => b.gross_sales - a.gross_sales);

    return {
      date: dayData.date,
      employees: employees,
    };
  });

  return {
    period: {
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString(),
    },
    daily_data: dailyData,
  };
}

// Get Current Stock Levels
async function getStock(products) {
  // Build stock data from products with inventory info
  const stockItems = products.map((product) => {
    // Get variants for stock info
    const variants = product.variants || [];
    const primaryVariant = variants[0] || {};

    // Calculate total stock across all variants
    let totalStock = 0;
    let lowStockThreshold =
      product.low_stock_threshold || product.lowStockThreshold || 10;

    if (variants.length > 0) {
      totalStock = variants.reduce((sum, v) => {
        return sum + (v.in_stock || v.inStock || v.stock || v.quantity || 0);
      }, 0);
    } else {
      totalStock =
        product.in_stock ||
        product.inStock ||
        product.stock ||
        product.quantity ||
        product.inventory_level ||
        0;
    }

    const isLowStock = totalStock <= lowStockThreshold && totalStock > 0;
    const isOutOfStock = totalStock <= 0;

    return {
      product_id: product.id,
      product_name: product.name || "Unknown Product",
      sku: product.sku || product.SKU || "",
      category:
        product.categoryName ||
        product.category ||
        product.category_name ||
        "Uncategorized",
      current_stock: totalStock,
      low_stock_threshold: lowStockThreshold,
      is_low_stock: isLowStock,
      is_out_of_stock: isOutOfStock,
      price: product.price || primaryVariant.price || 0,
      cost: product.cost || primaryVariant.cost || 0,
      stock_value:
        Math.round(
          totalStock * (product.cost || primaryVariant.cost || 0) * 100
        ) / 100,
      variants: variants.map((v) => ({
        variant_id: v.variant_id || v.id,
        variant_name: v.default_variant
          ? product.name
          : v.option_value || v.name || "Default",
        sku: v.sku || "",
        stock: v.in_stock || v.inStock || v.stock || v.quantity || 0,
        price: v.price || product.price || 0,
        cost: v.cost || product.cost || 0,
      })),
    };
  });

  // Sort by stock level (low stock first)
  stockItems.sort((a, b) => {
    // Out of stock first, then low stock, then by name
    if (a.is_out_of_stock && !b.is_out_of_stock) return -1;
    if (!a.is_out_of_stock && b.is_out_of_stock) return 1;
    if (a.is_low_stock && !b.is_low_stock) return -1;
    if (!a.is_low_stock && b.is_low_stock) return 1;
    return a.current_stock - b.current_stock;
  });

  // Calculate summary
  const summary = {
    total_products: stockItems.length,
    out_of_stock_count: stockItems.filter((s) => s.is_out_of_stock).length,
    low_stock_count: stockItems.filter((s) => s.is_low_stock).length,
    in_stock_count: stockItems.filter(
      (s) => !s.is_out_of_stock && !s.is_low_stock
    ).length,
    total_stock_value:
      Math.round(stockItems.reduce((sum, s) => sum + s.stock_value, 0) * 100) /
      100,
    total_units: stockItems.reduce((sum, s) => sum + s.current_stock, 0),
  };

  return {
    items: stockItems,
    summary,
    // Convenience lists
    out_of_stock: stockItems.filter((s) => s.is_out_of_stock),
    low_stock: stockItems.filter((s) => s.is_low_stock),
  };
}

// Get stock history for mobile app
async function getStockHistory(limit = 1000) {
  try {
    const { history } = await stockHistoryService.getAllHistory(limit);

    // Group by product for easier mobile processing
    const productHistory = {};

    history.forEach((entry) => {
      const productId = entry.productId;
      if (!productHistory[productId]) {
        productHistory[productId] = {
          product_id: productId,
          product_name: entry.productName,
          product_sku: entry.productSku,
          movements: [],
        };
      }

      productHistory[productId].movements.push({
        id: entry.id,
        type: entry.type, // 'initial', 'sale', 'purchase_order', 'adjustment'
        quantity: entry.quantity,
        previous_stock: entry.previousStock,
        new_stock: entry.newStock,
        reason: entry.reason,
        reference_id: entry.referenceId,
        user_id: entry.userId,
        user_name: entry.userName,
        timestamp: entry.createdAt?.toDate?.()
          ? entry.createdAt.toDate().toISOString()
          : entry.createdAt,
      });
    });

    // Convert to array and sort movements by timestamp desc
    const products = Object.values(productHistory).map((product) => ({
      ...product,
      movements: product.movements.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      ),
    }));

    return {
      products,
      total_movements: history.length,
      generated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error fetching stock history:", error);
    throw error;
  }
}

// ==================== ITEMS/PRODUCTS HELPER FUNCTIONS ====================

// Get all items/products with categories
async function getItems() {
  try {
    const products = await productsService.getAll();

    // Transform products to include category information
    const items = products.map((product) => {
      const variants = product.variants || [];
      const primaryVariant = variants[0] || {};

      // Calculate total stock
      let totalStock = 0;
      if (variants.length > 0) {
        totalStock = variants.reduce((sum, v) => {
          return sum + (v.in_stock || v.inStock || v.stock || v.quantity || 0);
        }, 0);
      } else {
        totalStock =
          product.in_stock ||
          product.inStock ||
          product.stock ||
          product.quantity ||
          0;
      }

      return {
        id: product.id,
        product_id: product.productId || product.id,
        name: product.name,
        description: product.description || "",
        sku: product.sku || product.SKU || "",

        // Category information
        category_id: product.categoryId || "",
        category_name:
          product.categoryName || product.category || "Uncategorized",
        category_image: product.categoryImage || "",

        // Pricing
        price: product.price || primaryVariant.price || 0,
        cost: product.cost || primaryVariant.cost || 0,

        // Stock
        stock: totalStock,
        track_stock: product.track_stock || product.trackStock || true,
        low_stock_threshold:
          product.low_stock_threshold || product.lowStockThreshold || 10,

        // Status
        is_active: product.isActive !== undefined ? product.isActive : true,
        available_for_sale:
          product.availableForSale !== undefined
            ? product.availableForSale
            : true,

        // Variants
        variants: variants.map((v) => ({
          variant_id: v.variant_id || v.id,
          variant_name: v.default_variant
            ? product.name
            : v.option_value || v.name || "Default",
          sku: v.sku || "",
          stock: v.in_stock || v.inStock || v.stock || v.quantity || 0,
          price: v.price || product.price || 0,
          cost: v.cost || product.cost || 0,
        })),

        // Timestamps
        created_at: product.createdAt?.toDate?.()
          ? product.createdAt.toDate().toISOString()
          : product.createdAt,
        updated_at: product.updatedAt?.toDate?.()
          ? product.updatedAt.toDate().toISOString()
          : product.updatedAt,
      };
    });

    return {
      items,
      total_count: items.length,
      generated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error fetching items:", error);
    throw error;
  }
}

// Get all categories
async function getCategories() {
  try {
    const categories = await categoriesService.getAll();

    // Transform categories to consistent format
    const categoryList = categories.map((category) => ({
      id: category.id,
      category_id: category.categoryId || category.id,
      name: category.name,
      description: category.description || "",
      image: category.image || "",
      color: category.color || "",
      icon: category.icon || "",
      is_active: category.isActive !== undefined ? category.isActive : true,
      sort_order: category.sortOrder || 0,
      created_at: category.createdAt?.toDate?.()
        ? category.createdAt.toDate().toISOString()
        : category.createdAt,
      updated_at: category.updatedAt?.toDate?.()
        ? category.updatedAt.toDate().toISOString()
        : category.updatedAt,
    }));

    // Sort by sort_order
    categoryList.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    return {
      categories: categoryList,
      total_count: categoryList.length,
      generated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
}

// ==================== PURCHASES HELPER FUNCTIONS ====================

// Get all purchases
async function getPurchases() {
  try {
    const purchases = await purchasesService.getAll({
      orderBy: ["createdAt", "desc"],
    });

    // Format purchases for mobile app
    const formattedPurchases = purchases.map((purchase) => ({
      id: purchase.id,
      supplier_name: purchase.supplier_name || "",
      purchase_date: purchase.purchase_date || "",
      due_date: purchase.due_date || "",
      items: (purchase.items || []).map((item) => ({
        product_id: item.product_id || "",
        product_name: item.product_name || "",
        quantity: item.quantity || 0,
        price: item.price || 0,
        total: item.total || 0,
      })),
      total: purchase.total || 0,
      status: purchase.status || "pending",
      reminder_type: purchase.reminder_type || "no_reminder",
      reminder_value: purchase.reminder_value || "",
      reminder_time: purchase.reminder_time || "",
      createdAt: purchase.createdAt?.toDate?.()
        ? purchase.createdAt.toDate().toISOString()
        : new Date().toISOString(),
    }));

    return {
      purchases: formattedPurchases,
    };
  } catch (error) {
    console.error("Error fetching purchases:", error);
    throw error;
  }
}

// Get single purchase by ID
async function getPurchaseById(purchaseId) {
  try {
    const purchase = await purchasesService.get(purchaseId);

    if (!purchase) {
      throw new Error("Purchase not found");
    }

    // Format purchase
    return {
      id: purchase.id,
      supplier_name: purchase.supplier_name || "",
      purchase_date: purchase.purchase_date || "",
      due_date: purchase.due_date || "",
      items: (purchase.items || []).map((item) => ({
        product_id: item.product_id || "",
        product_name: item.product_name || "",
        quantity: item.quantity || 0,
        price: item.price || 0,
        total: item.total || 0,
      })),
      total: purchase.total || 0,
      status: purchase.status || "pending",
      reminder_type: purchase.reminder_type || "no_reminder",
      reminder_value: purchase.reminder_value || "",
      reminder_time: purchase.reminder_time || "",
      createdAt: purchase.createdAt?.toDate?.()
        ? purchase.createdAt.toDate().toISOString()
        : new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error fetching purchase by ID:", error);
    throw error;
  }
}

// Create new purchase
async function createPurchase(purchaseData) {
  try {
    // Validate required fields
    const {
      supplier_name,
      purchase_date,
      due_date,
      items,
      total,
      reminder_type,
      reminder_value,
      reminder_time,
    } = purchaseData;

    if (!supplier_name || !supplier_name.trim()) {
      throw new Error("Supplier name is required");
    }

    if (!purchase_date) {
      throw new Error("Purchase date is required");
    }

    if (!due_date) {
      throw new Error("Due date is required");
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("At least one item is required");
    }

    if (typeof total !== "number" || total < 0) {
      throw new Error("Total must be a non-negative number");
    }

    // Create purchase document
    const newPurchase = {
      supplier_name: supplier_name.trim(),
      purchase_date,
      due_date,
      items: items.map((item) => ({
        product_id: item.product_id || "",
        product_name: item.product_name || "",
        quantity: item.quantity || 0,
        price: item.price || 0,
        total: item.total || item.quantity * item.price || 0,
      })),
      total,
      status: "pending",
      reminder_type: reminder_type || "no_reminder",
      reminder_value: reminder_value || "",
      reminder_time: reminder_time || "",
    };

    const createdPurchase = await purchasesService.create(newPurchase);

    return {
      id: createdPurchase.id,
      ...newPurchase,
    };
  } catch (error) {
    console.error("Error creating purchase:", error);
    throw error;
  }
}

// Edit existing purchase
async function editPurchase(purchaseData) {
  try {
    const {
      id,
      supplier_name,
      purchase_date,
      due_date,
      items,
      total,
      status,
      reminder_type,
      reminder_value,
      reminder_time,
    } = purchaseData;

    if (!id) {
      throw new Error("Purchase ID is required");
    }

    // Check if purchase exists
    const existingPurchase = await purchasesService.get(id);
    if (!existingPurchase) {
      throw new Error("Purchase not found");
    }

    // Validate fields if provided
    if (supplier_name !== undefined && !supplier_name.trim()) {
      throw new Error("Supplier name cannot be empty");
    }

    if (items !== undefined && (!Array.isArray(items) || items.length === 0)) {
      throw new Error("At least one item is required");
    }

    if (total !== undefined && (typeof total !== "number" || total < 0)) {
      throw new Error("Total must be a non-negative number");
    }

    // Update purchase
    const updateData = {};
    if (supplier_name !== undefined)
      updateData.supplier_name = supplier_name.trim();
    if (purchase_date !== undefined) updateData.purchase_date = purchase_date;
    if (due_date !== undefined) updateData.due_date = due_date;
    if (items !== undefined) {
      updateData.items = items.map((item) => ({
        product_id: item.product_id || "",
        product_name: item.product_name || "",
        quantity: item.quantity || 0,
        price: item.price || 0,
        total: item.total || item.quantity * item.price || 0,
      }));
    }
    if (total !== undefined) updateData.total = total;
    if (status !== undefined) updateData.status = status;
    if (reminder_type !== undefined) updateData.reminder_type = reminder_type;
    if (reminder_value !== undefined)
      updateData.reminder_value = reminder_value;
    if (reminder_time !== undefined) updateData.reminder_time = reminder_time;

    await purchasesService.update(id, updateData);

    // Return updated purchase
    const updatedPurchase = await purchasesService.get(id);
    return {
      id: updatedPurchase.id,
      supplier_name: updatedPurchase.supplier_name || "",
      purchase_date: updatedPurchase.purchase_date || "",
      due_date: updatedPurchase.due_date || "",
      items: (updatedPurchase.items || []).map((item) => ({
        product_id: item.product_id || "",
        product_name: item.product_name || "",
        quantity: item.quantity || 0,
        price: item.price || 0,
        total: item.total || 0,
      })),
      total: updatedPurchase.total || 0,
      status: updatedPurchase.status || "pending",
      reminder_type: updatedPurchase.reminder_type || "no_reminder",
      reminder_value: updatedPurchase.reminder_value || "",
      reminder_time: updatedPurchase.reminder_time || "",
    };
  } catch (error) {
    console.error("Error editing purchase:", error);
    throw error;
  }
}

// Delete purchase
async function deletePurchase(purchaseId) {
  try {
    if (!purchaseId) {
      throw new Error("Purchase ID is required");
    }

    // Check if purchase exists
    const existingPurchase = await purchasesService.get(purchaseId);
    if (!existingPurchase) {
      throw new Error("Purchase not found");
    }

    await purchasesService.delete(purchaseId);

    return { success: true, message: "Purchase deleted successfully" };
  } catch (error) {
    console.error("Error deleting purchase:", error);
    throw error;
  }
}

// Complete purchase (mark as completed)
async function completePurchase(purchaseId) {
  try {
    if (!purchaseId) {
      throw new Error("Purchase ID is required");
    }

    // Check if purchase exists
    const existingPurchase = await purchasesService.get(purchaseId);
    if (!existingPurchase) {
      throw new Error("Purchase not found");
    }

    // Update status to completed
    await purchasesService.update(purchaseId, { status: "completed" });

    // Return updated purchase
    const updatedPurchase = await purchasesService.get(purchaseId);
    return {
      id: updatedPurchase.id,
      supplier_name: updatedPurchase.supplier_name || "",
      purchase_date: updatedPurchase.purchase_date || "",
      due_date: updatedPurchase.due_date || "",
      items: (updatedPurchase.items || []).map((item) => ({
        product_id: item.product_id || "",
        product_name: item.product_name || "",
        quantity: item.quantity || 0,
        price: item.price || 0,
        total: item.total || 0,
      })),
      total: updatedPurchase.total || 0,
      status: updatedPurchase.status || "completed",
      reminder_type: updatedPurchase.reminder_type || "no_reminder",
      reminder_value: updatedPurchase.reminder_value || "",
      reminder_time: updatedPurchase.reminder_time || "",
    };
  } catch (error) {
    console.error("Error completing purchase:", error);
    throw error;
  }
}

// ==================== EXPENSES HELPER FUNCTIONS ====================

// Get all expenses
async function getExpenses(filters = {}) {
  try {
    const expenses = await expensesService.getAll({
      orderBy: ["createdAt", "desc"],
    });

    // Filter by date range if provided
    let filteredExpenses = expenses;
    if (filters.start_date || filters.end_date) {
      filteredExpenses = expenses.filter((expense) => {
        const expenseDate = new Date(expense.date);
        if (filters.start_date && expenseDate < new Date(filters.start_date)) {
          return false;
        }
        if (filters.end_date && expenseDate > new Date(filters.end_date)) {
          return false;
        }
        return true;
      });
    }

    // Format expenses for mobile app
    const formattedExpenses = filteredExpenses.map((expense) => ({
      id: expense.id,
      description: expense.description || "",
      amount: expense.amount || 0,
      date: expense.date || "",
      time: expense.time || "",
      createdAt: expense.createdAt?.toDate?.()
        ? expense.createdAt.toDate().toISOString()
        : new Date().toISOString(),
    }));

    // Calculate total
    const totalExpense = formattedExpenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );

    return {
      expenses: formattedExpenses,
      total: totalExpense,
      count: formattedExpenses.length,
    };
  } catch (error) {
    console.error("Error fetching expenses:", error);
    throw error;
  }
}

// Get single expense by ID
async function getExpenseById(expenseId) {
  try {
    const expense = await expensesService.get(expenseId);

    if (!expense) {
      throw new Error("Expense not found");
    }

    // Format expense
    return {
      id: expense.id,
      description: expense.description || "",
      amount: expense.amount || 0,
      date: expense.date || "",
      time: expense.time || "",
      createdAt: expense.createdAt?.toDate?.()
        ? expense.createdAt.toDate().toISOString()
        : new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error fetching expense by ID:", error);
    throw error;
  }
}

// Create new expense
async function createExpense(expenseData) {
  try {
    // Validate required fields
    const { description, amount, date, time } = expenseData;

    if (!description || !description.trim()) {
      throw new Error("Description is required");
    }

    if (typeof amount !== "number" || amount < 0) {
      throw new Error("Amount must be a non-negative number");
    }

    if (!date) {
      throw new Error("Date is required");
    }

    if (!time) {
      throw new Error("Time is required");
    }

    // Create expense document
    const newExpense = {
      description: description.trim(),
      amount,
      date,
      time,
    };

    const createdExpense = await expensesService.create(newExpense);

    return {
      id: createdExpense.id,
      ...newExpense,
    };
  } catch (error) {
    console.error("Error creating expense:", error);
    throw error;
  }
}

// Edit existing expense
async function editExpense(expenseData) {
  try {
    const { id, description, amount, date, time } = expenseData;

    if (!id) {
      throw new Error("Expense ID is required");
    }

    // Check if expense exists
    const existingExpense = await expensesService.get(id);
    if (!existingExpense) {
      throw new Error("Expense not found");
    }

    // Validate fields if provided
    if (description !== undefined && !description.trim()) {
      throw new Error("Description cannot be empty");
    }

    if (amount !== undefined && (typeof amount !== "number" || amount < 0)) {
      throw new Error("Amount must be a non-negative number");
    }

    // Update expense
    const updateData = {};
    if (description !== undefined) updateData.description = description.trim();
    if (amount !== undefined) updateData.amount = amount;
    if (date !== undefined) updateData.date = date;
    if (time !== undefined) updateData.time = time;

    await expensesService.update(id, updateData);

    // Return updated expense
    const updatedExpense = await expensesService.get(id);
    return {
      id: updatedExpense.id,
      description: updatedExpense.description || "",
      amount: updatedExpense.amount || 0,
      date: updatedExpense.date || "",
      time: updatedExpense.time || "",
    };
  } catch (error) {
    console.error("Error editing expense:", error);
    throw error;
  }
}

// Delete expense
async function deleteExpense(expenseId) {
  try {
    if (!expenseId) {
      throw new Error("Expense ID is required");
    }

    // Check if expense exists
    const existingExpense = await expensesService.get(expenseId);
    if (!existingExpense) {
      throw new Error("Expense not found");
    }

    await expensesService.delete(expenseId);

    return { success: true, message: "Expense deleted successfully" };
  } catch (error) {
    console.error("Error deleting expense:", error);
    throw error;
  }
}

// ==================== INVOICES HELPER FUNCTIONS ====================

// Get Invoices for mobile app
async function getInvoices() {
  try {
    const invoices = await invoicesService.getAll({
      orderBy: ["createdAt", "desc"],
    });

    // Format invoices for mobile app
    const formattedInvoices = invoices.map((invoice) => ({
      id: invoice.id,
      number: invoice.number || `INV-${invoice.id.slice(-6).toUpperCase()}`,
      date:
        invoice.date ||
        (invoice.createdAt?.toDate?.()
          ? invoice.createdAt.toDate().toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]),
      due_date: invoice.due_date,
      customer_name:
        invoice.customer_name || invoice.customerName || "Unknown Customer",
      items: (invoice.items || []).map((item) => ({
        product_id: item.product_id || item.productId,
        product_name: item.product_name || item.productName || item.name,
        quantity: item.quantity || 1,
        price: item.price || 0,
        total: item.total || item.quantity * item.price || 0,
      })),
      total:
        invoice.total ||
        (invoice.items || []).reduce(
          (sum, item) => sum + (item.total || item.quantity * item.price || 0),
          0
        ),
    }));

    return {
      invoices: formattedInvoices,
    };
  } catch (error) {
    console.error("Error fetching invoices:", error);
    throw error;
  }
}

// Get single invoice by ID for mobile app
async function getInvoiceById(invoiceId) {
  try {
    const invoice = await invoicesService.get(invoiceId);

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    // Format invoice for mobile app
    const formattedInvoice = {
      id: invoice.id,
      number: invoice.number || `INV-${invoice.id.slice(-6).toUpperCase()}`,
      date:
        invoice.date ||
        (invoice.createdAt?.toDate?.()
          ? invoice.createdAt.toDate().toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]),
      due_date: invoice.due_date,
      customer_name:
        invoice.customer_name || invoice.customerName || "Unknown Customer",
      items: (invoice.items || []).map((item) => ({
        product_id: item.product_id || item.productId,
        product_name: item.product_name || item.productName || item.name,
        quantity: item.quantity || 1,
        price: item.price || 0,
        total: item.total || item.quantity * item.price || 0,
      })),
      total:
        invoice.total ||
        (invoice.items || []).reduce(
          (sum, item) => sum + (item.total || item.quantity * item.price || 0),
          0
        ),
      created_at: invoice.createdAt?.toDate?.()
        ? invoice.createdAt.toDate().toISOString()
        : invoice.createdAt,
      updated_at: invoice.updatedAt?.toDate?.()
        ? invoice.updatedAt.toDate().toISOString()
        : invoice.updatedAt,
    };

    return {
      invoice: formattedInvoice,
    };
  } catch (error) {
    console.error("Error fetching invoice by ID:", error);
    throw error;
  }
}

// Generate unique invoice number
async function generateInvoiceNumber() {
  try {
    // Get current year
    const year = new Date().getFullYear();

    // Get all invoices to find the highest number for this year
    const invoices = await invoicesService.getAll({
      orderBy: ["createdAt", "desc"],
    });

    // Find the highest number for this year
    let maxNumber = 0;
    for (const invoice of invoices) {
      if (invoice.number && invoice.number.startsWith(`INV-${year}-`)) {
        const numberPart = invoice.number.split("-")[2];
        const num = parseInt(numberPart, 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    }

    // Generate next number
    const nextNumber = maxNumber + 1;
    return `INV-${year}-${nextNumber.toString().padStart(3, "0")}`;
  } catch (error) {
    console.error("Error generating invoice number:", error);
    // Fallback: use timestamp-based number
    const timestamp = Date.now();
    return `INV-${new Date().getFullYear()}-${timestamp.toString().slice(-6)}`;
  }
}

// Validate and create invoice
async function createInvoice(invoiceData) {
  try {
    // Validate required fields
    const { customer_name, date, due_date, items, total } = invoiceData;

    if (!customer_name || !customer_name.trim()) {
      throw new Error("Customer name is required");
    }

    if (!date) {
      throw new Error("Date is required");
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("At least one item is required");
    }

    if (typeof total !== "number" || total < 0) {
      throw new Error("Total must be a non-negative number");
    }

    // Validate date format and ensure it's not in the future
    const invoiceDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    if (isNaN(invoiceDate.getTime())) {
      throw new Error("Invalid date format. Use YYYY-MM-DD");
    }

    if (invoiceDate > today) {
      throw new Error("Invoice date cannot be in the future");
    }

    // Validate due_date if provided (optional field)
    let validatedDueDate = null;
    if (due_date) {
      const dueDateObj = new Date(due_date);
      if (isNaN(dueDateObj.getTime())) {
        throw new Error("Invalid due_date format. Use YYYY-MM-DD");
      }
      if (dueDateObj <= invoiceDate) {
        throw new Error("Due date must be after the invoice date");
      }
      validatedDueDate = due_date;
    }

    // Validate items
    let calculatedTotal = 0;
    for (const item of items) {
      if (!item.product_id || !item.product_name) {
        throw new Error("Each item must have product_id and product_name");
      }

      if (typeof item.quantity !== "number" || item.quantity <= 0) {
        throw new Error("Item quantity must be a positive number");
      }

      if (typeof item.price !== "number" || item.price < 0) {
        throw new Error("Item price must be a non-negative number");
      }

      const itemTotal = item.quantity * item.price;
      if (Math.abs(item.total - itemTotal) > 0.01) {
        // Allow small rounding differences
        throw new Error("Item total does not match quantity × price");
      }

      calculatedTotal += itemTotal;
    }

    // Validate total matches calculated total
    if (Math.abs(total - calculatedTotal) > 0.01) {
      throw new Error("Invoice total does not match sum of item totals");
    }

    // Check if products exist (optional - for stock validation)
    // Note: We're not deducting stock for now as per the API docs

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Create invoice data
    const invoiceToCreate = {
      number: invoiceNumber,
      customer_name: customer_name.trim(),
      date: date,
      due_date: validatedDueDate,
      items: items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      })),
      total: total,
      created_by: "mobile-api", // Could be enhanced to use actual user
    };

    // Save to database
    const createdInvoice = await invoicesService.create(invoiceToCreate);

    return {
      id: createdInvoice.id,
      number: invoiceNumber,
      customer_name: customer_name.trim(),
      date: date,
      due_date: validatedDueDate,
      items: invoiceToCreate.items,
      total: total,
      created_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error creating invoice:", error);
    throw error;
  }
}

// Validate and edit invoice
async function editInvoice(invoiceData) {
  try {
    const { id } = invoiceData;

    if (!id) {
      throw new Error("Invoice ID is required for editing");
    }

    // Check if invoice exists
    const existingInvoice = await invoicesService.get(id);
    if (!existingInvoice) {
      throw new Error("Invoice not found");
    }

    const { customer_name, date, due_date, items, total } = invoiceData;

    // Validate required fields
    if (!customer_name || !customer_name.trim()) {
      throw new Error("Customer name is required");
    }

    if (!date) {
      throw new Error("Date is required");
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("At least one item is required");
    }

    if (typeof total !== "number" || total < 0) {
      throw new Error("Total must be a non-negative number");
    }

    // Validate date format and ensure it's not in the future
    const invoiceDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    if (isNaN(invoiceDate.getTime())) {
      throw new Error("Invalid date format. Use YYYY-MM-DD");
    }

    if (invoiceDate > today) {
      throw new Error("Invoice date cannot be in the future");
    }

    // Validate due_date if provided (optional field)
    let validatedDueDate = null;
    if (due_date) {
      const dueDateObj = new Date(due_date);
      if (isNaN(dueDateObj.getTime())) {
        throw new Error("Invalid due_date format. Use YYYY-MM-DD");
      }
      if (dueDateObj <= invoiceDate) {
        throw new Error("Due date must be after the invoice date");
      }
      validatedDueDate = due_date;
    }

    // Validate items
    let calculatedTotal = 0;
    for (const item of items) {
      if (!item.product_id || !item.product_name) {
        throw new Error("Each item must have product_id and product_name");
      }

      if (typeof item.quantity !== "number" || item.quantity <= 0) {
        throw new Error("Item quantity must be a positive number");
      }

      if (typeof item.price !== "number" || item.price < 0) {
        throw new Error("Item price must be a non-negative number");
      }

      const itemTotal = item.quantity * item.price;
      if (Math.abs(item.total - itemTotal) > 0.01) {
        // Allow small rounding differences
        throw new Error("Item total does not match quantity × price");
      }

      calculatedTotal += itemTotal;
    }

    // Validate total matches calculated total
    if (Math.abs(total - calculatedTotal) > 0.01) {
      throw new Error("Invoice total does not match sum of item totals");
    }

    // Prepare update data
    const updateData = {
      customer_name: customer_name.trim(),
      date: date,
      due_date: validatedDueDate,
      items: items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      })),
      total: total,
      updatedAt: new Date(),
    };

    // Update in database
    await invoicesService.update(id, updateData);

    // Get updated invoice
    const updatedInvoice = await invoicesService.get(id);

    return {
      id: updatedInvoice.id,
      number: updatedInvoice.number,
      customer_name: updatedInvoice.customer_name,
      date: updatedInvoice.date,
      due_date: updatedInvoice.due_date,
      items: updatedInvoice.items,
      total: updatedInvoice.total,
      created_at: updatedInvoice.createdAt?.toDate?.()
        ? updatedInvoice.createdAt.toDate().toISOString()
        : updatedInvoice.createdAt,
      updated_at: updatedInvoice.updatedAt?.toDate?.()
        ? updatedInvoice.updatedAt.toDate().toISOString()
        : updatedInvoice.updatedAt,
    };
  } catch (error) {
    console.error("Error editing invoice:", error);
    throw error;
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// Authentication middleware
function authenticateRequest(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing or invalid authorization header" };
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const user = jwtUtils.getUserFromToken(token);

  if (!user) {
    return { error: "Invalid or expired token" };
  }

  if (user.role !== "admin") {
    return { error: "Admin access required" };
  }

  return { user };
}

// Login function
async function handleLogin(email, password) {
  try {
    // Authenticate with Firebase
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const firebaseUser = userCredential.user;

    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
    if (!userDoc.exists()) {
      throw new Error("User data not found");
    }

    const userData = userDoc.data();

    // Create JWT token with admin role (1 month expiration)
    const token = jwtUtils.encodeAdmin({
      id: firebaseUser.uid,
      email: firebaseUser.email,
      name: userData.name || firebaseUser.displayName,
      permissions: userData.permissions || [],
    });

    return {
      success: true,
      user: {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: userData.name || firebaseUser.displayName,
        role: "admin",
      },
      token,
      expires_in: 30 * 24 * 60 * 60, // 30 days in seconds
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      error: "Invalid email or password",
    };
  }
}

// GET handler - Main API endpoint
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Handle login action (no auth required)
    if (action === "login") {
      return Response.json(
        { success: false, error: "Login requires POST method" },
        { status: 405, headers: corsHeaders }
      );
    }

    // Authenticate request for all other actions
    const auth = authenticateRequest(request);
    if (auth.error) {
      return Response.json(
        { success: false, error: auth.error },
        { status: 401, headers: corsHeaders }
      );
    }

    const period = searchParams.get("period") || "last_30_days";
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const employeeIdsParam = searchParams.get("employee_ids");
    const employeeIds = employeeIdsParam ? employeeIdsParam.split(",") : [];

    // Validate action
    const validActions = [
      "sales-summary",
      "sales-by-item",
      "sales-by-category",
      "sales-by-employee",
      "stock",
      "stock-history",
      "get-invoices",
      "get-invoice",
      "get-purchases",
      "get-purchase",
      "get-expenses",
      "get-expense",
      "get-items",
      "get-categories",
    ];
    if (!action || !validActions.includes(action)) {
      return Response.json(
        {
          success: false,
          error: "Invalid or missing action parameter",
          valid_actions: validActions,
          post_only_actions: ["edit-product-cost"],
          usage: {
            endpoint: "/api/mobile",
            get_parameters: {
              action: "Required. One of: " + validActions.join(", "),
              period:
                "Optional. One of: today, this_week, this_month, this_year, custom, last_30_days (default)",
              start_date:
                "Required if period=custom. ISO 8601 date format (YYYY-MM-DD)",
              end_date:
                "Required if period=custom. ISO 8601 date format (YYYY-MM-DD)",
              employee_ids:
                "Optional. Comma-separated list of employee IDs to filter by",
            },
            post_parameters: {
              action: "Required. One of: login, edit-product-cost",
              email: "Required for login. User email address",
              password: "Required for login. User password",
              productId: "Required for edit-product-cost. Product ID to update",
              cost: "Required for edit-product-cost. New cost value (number, non-negative)",
            },
          },
        },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // Get date range
    let dateRange;
    try {
      dateRange = getDateRange(period, startDate, endDate);
    } catch (error) {
      return Response.json(
        {
          success: false,
          error: error.message,
        },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // Handle stock action (doesn't need date range)
    if (action === "stock") {
      const products = await productsService.getAll();
      const stockData = await getStock(products || []);

      return Response.json(
        {
          success: true,
          action: "stock",
          generated_at: new Date().toISOString(),
          data: stockData,
        },
        { headers: corsHeaders }
      );
    }

    // Handle stock-history action (doesn't need date range)
    if (action === "stock-history") {
      const stockHistoryData = await getStockHistory();

      return Response.json(
        {
          success: true,
          action: "stock-history",
          generated_at: new Date().toISOString(),
          data: stockHistoryData,
        },
        { headers: corsHeaders }
      );
    }

    // Handle get-items action (get all products/items with categories)
    if (action === "get-items") {
      try {
        const itemsData = await getItems();

        return Response.json(
          {
            success: true,
            action: "get-items",
            generated_at: new Date().toISOString(),
            data: itemsData,
          },
          { headers: corsHeaders }
        );
      } catch (error) {
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to retrieve items",
          },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Handle get-categories action (get all categories)
    if (action === "get-categories") {
      try {
        const categoriesData = await getCategories();

        return Response.json(
          {
            success: true,
            action: "get-categories",
            generated_at: new Date().toISOString(),
            data: categoriesData,
          },
          { headers: corsHeaders }
        );
      } catch (error) {
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to retrieve categories",
          },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Handle get-invoices action (doesn't need date range)
    if (action === "get-invoices") {
      try {
        const invoicesData = await getInvoices();

        return Response.json(
          {
            success: true,
            action: "get-invoices",
            generated_at: new Date().toISOString(),
            data: invoicesData,
          },
          { headers: corsHeaders }
        );
      } catch (error) {
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to retrieve invoices",
          },
          { status: 200, headers: corsHeaders }
        );
      }
    }

    // Handle get-invoice action (get single invoice by ID)
    if (action === "get-invoice") {
      const invoiceId = searchParams.get("id");
      if (!invoiceId) {
        return Response.json(
          {
            success: false,
            error: "Invoice ID is required for get-invoice action",
          },
          { status: 400, headers: corsHeaders }
        );
      }

      try {
        const invoiceData = await getInvoiceById(invoiceId);

        return Response.json(
          {
            success: true,
            action: "get-invoice",
            generated_at: new Date().toISOString(),
            data: invoiceData,
          },
          { headers: corsHeaders }
        );
      } catch (error) {
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to retrieve invoice",
          },
          { status: 200, headers: corsHeaders }
        );
      }
    }

    // Get all purchases
    if (action === "get-purchases") {
      try {
        const purchasesData = await getPurchases();

        return Response.json(
          {
            success: true,
            action: "get-purchases",
            generated_at: new Date().toISOString(),
            data: purchasesData,
          },
          { headers: corsHeaders }
        );
      } catch (error) {
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to retrieve purchases",
          },
          { status: 200, headers: corsHeaders }
        );
      }
    }

    // Get single purchase by ID
    if (action === "get-purchase") {
      try {
        const purchaseId = searchParams.get("id");
        if (!purchaseId) {
          return Response.json(
            {
              success: false,
              error: "Purchase ID is required",
            },
            { status: 400, headers: corsHeaders }
          );
        }

        const purchaseData = await getPurchaseById(purchaseId);

        return Response.json(
          {
            success: true,
            action: "get-purchase",
            generated_at: new Date().toISOString(),
            data: purchaseData,
          },
          { headers: corsHeaders }
        );
      } catch (error) {
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to retrieve purchase",
          },
          { status: 200, headers: corsHeaders }
        );
      }
    }

    // Get all expenses
    if (action === "get-expenses") {
      try {
        const filters = {
          start_date: searchParams.get("start_date"),
          end_date: searchParams.get("end_date"),
        };

        const expensesData = await getExpenses(filters);

        return Response.json(
          {
            success: true,
            action: "get-expenses",
            generated_at: new Date().toISOString(),
            data: expensesData,
          },
          { headers: corsHeaders }
        );
      } catch (error) {
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to retrieve expenses",
          },
          { status: 200, headers: corsHeaders }
        );
      }
    }

    // Get single expense by ID
    if (action === "get-expense") {
      try {
        const expenseId = searchParams.get("id");
        if (!expenseId) {
          return Response.json(
            {
              success: false,
              error: "Expense ID is required",
            },
            { status: 400, headers: corsHeaders }
          );
        }

        const expenseData = await getExpenseById(expenseId);

        return Response.json(
          {
            success: true,
            action: "get-expense",
            generated_at: new Date().toISOString(),
            data: expenseData,
          },
          { headers: corsHeaders }
        );
      } catch (error) {
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to retrieve expense",
          },
          { status: 200, headers: corsHeaders }
        );
      }
    }

    // Load data for sales reports
    const [receipts, products, categories, users] = await Promise.all([
      receiptsService.getAll({ orderBy: ["createdAt", "desc"] }),
      productsService.getAll(),
      categoriesService.getAll(),
      getDocuments("users"),
    ]);

    // Filter receipts by date range and employees
    const filteredReceipts = filterReceipts(
      receipts || [],
      dateRange,
      employeeIds
    );

    let data;

    switch (action) {
      case "sales-summary":
        data = await getSalesSummary(filteredReceipts, dateRange);
        break;

      case "sales-by-item":
        data = await getSalesByItem(
          filteredReceipts,
          products || [],
          dateRange
        );
        break;

      case "sales-by-category":
        data = await getSalesByCategory(
          filteredReceipts,
          products || [],
          categories || [],
          dateRange
        );
        break;

      case "sales-by-employee":
        data = await getSalesByEmployee(
          filteredReceipts,
          users || [],
          dateRange
        );
        break;

      default:
        return Response.json(
          {
            success: false,
            error: "Unknown action",
          },
          {
            status: 400,
            headers: corsHeaders,
          }
        );
    }

    return Response.json(
      {
        success: true,
        action,
        period: period,
        filters: {
          date_range: {
            from: dateRange.from.toISOString(),
            to: dateRange.to.toISOString(),
          },
          employee_ids: employeeIds.length > 0 ? employeeIds : null,
        },
        generated_at: new Date().toISOString(),
        data,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Mobile API Error:", error);
    return Response.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}

// POST handler - Login and edit operations
export async function POST(request) {
  try {
    const requestBody = await request.json();
    const { action } = requestBody;

    // Handle login action
    if (action === "login") {
      const { email, password } = requestBody;
      // Validate required fields
      if (!email || !password) {
        return Response.json(
          { success: false, error: "Email and password are required" },
          { status: 400, headers: corsHeaders }
        );
      }

      // Attempt login
      const result = await handleLogin(email, password);

      if (!result.success) {
        return Response.json(result, { status: 401, headers: corsHeaders });
      }

      return Response.json(result, { status: 200, headers: corsHeaders });
    }

    // Handle edit-product-cost action
    if (action === "edit-product-cost") {
      // Authenticate request
      const auth = authenticateRequest(request);
      if (auth.error) {
        return Response.json(
          { success: false, error: auth.error },
          { status: 401, headers: corsHeaders }
        );
      }

      const { productId, cost } = requestBody;

      // Validate required fields
      if (!productId || cost === undefined || cost === null) {
        return Response.json(
          {
            success: false,
            error: "productId and cost are required",
            required_fields: ["productId", "cost"],
          },
          { status: 400, headers: corsHeaders }
        );
      }

      // Validate cost is a number and non-negative
      const numericCost = parseFloat(cost);
      if (isNaN(numericCost) || numericCost < 0) {
        return Response.json(
          { success: false, error: "Cost must be a non-negative number" },
          { status: 400, headers: corsHeaders }
        );
      }

      try {
        // Update product cost in Firestore
        await productsService.update(productId, {
          cost: numericCost,
          updatedAt: new Date(),
        });

        return Response.json(
          {
            success: true,
            action: "edit-product-cost",
            product_id: productId,
            new_cost: numericCost,
            updated_at: new Date().toISOString(),
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error updating product cost:", error);
        return Response.json(
          {
            success: false,
            error: "Failed to update product cost",
            details: error.message,
          },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Handle create-invoice action
    if (action === "create-invoice") {
      // Authenticate request
      const auth = authenticateRequest(request);
      if (auth.error) {
        return Response.json(
          { success: false, error: auth.error },
          { status: 401, headers: corsHeaders }
        );
      }

      try {
        const createdInvoice = await createInvoice(requestBody);

        return Response.json(
          {
            success: true,
            action: "create-invoice",
            data: {
              invoice: createdInvoice,
            },
          },
          { status: 201, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error creating invoice:", error);
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to create invoice",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Handle edit-invoice action
    if (action === "edit-invoice") {
      // Authenticate request
      const auth = authenticateRequest(request);
      if (auth.error) {
        return Response.json(
          { success: false, error: auth.error },
          { status: 401, headers: corsHeaders }
        );
      }

      try {
        const editedInvoice = await editInvoice(requestBody);

        return Response.json(
          {
            success: true,
            action: "edit-invoice",
            data: {
              invoice: editedInvoice,
            },
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error editing invoice:", error);
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to edit invoice",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Create purchase
    if (action === "create-purchase") {
      // Authenticate request
      const auth = authenticateRequest(request);
      if (auth.error) {
        return Response.json(
          { success: false, error: auth.error },
          { status: 401, headers: corsHeaders }
        );
      }

      try {
        const newPurchase = await createPurchase(requestBody);

        return Response.json(
          {
            success: true,
            action: "create-purchase",
            data: {
              purchase: newPurchase,
            },
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error creating purchase:", error);
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to create purchase",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Edit purchase
    if (action === "edit-purchase") {
      // Authenticate request
      const auth = authenticateRequest(request);
      if (auth.error) {
        return Response.json(
          { success: false, error: auth.error },
          { status: 401, headers: corsHeaders }
        );
      }

      try {
        const editedPurchase = await editPurchase(requestBody);

        return Response.json(
          {
            success: true,
            action: "edit-purchase",
            data: {
              purchase: editedPurchase,
            },
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error editing purchase:", error);
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to edit purchase",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Delete purchase
    if (action === "delete-purchase") {
      // Authenticate request
      const auth = authenticateRequest(request);
      if (auth.error) {
        return Response.json(
          { success: false, error: auth.error },
          { status: 401, headers: corsHeaders }
        );
      }

      try {
        const { id } = requestBody;
        const result = await deletePurchase(id);

        return Response.json(
          {
            success: true,
            action: "delete-purchase",
            message: result.message,
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error deleting purchase:", error);
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to delete purchase",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Complete purchase
    if (action === "complete-purchase") {
      // Authenticate request
      const auth = authenticateRequest(request);
      if (auth.error) {
        return Response.json(
          { success: false, error: auth.error },
          { status: 401, headers: corsHeaders }
        );
      }

      try {
        const { id } = requestBody;
        const completedPurchase = await completePurchase(id);

        return Response.json(
          {
            success: true,
            action: "complete-purchase",
            data: {
              purchase: completedPurchase,
            },
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error completing purchase:", error);
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to complete purchase",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Create expense
    if (action === "create-expense") {
      // Authenticate request
      const auth = authenticateRequest(request);
      if (auth.error) {
        return Response.json(
          { success: false, error: auth.error },
          { status: 401, headers: corsHeaders }
        );
      }

      try {
        const newExpense = await createExpense(requestBody);

        return Response.json(
          {
            success: true,
            action: "create-expense",
            data: {
              expense: newExpense,
            },
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error creating expense:", error);
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to create expense",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Edit expense
    if (action === "edit-expense") {
      // Authenticate request
      const auth = authenticateRequest(request);
      if (auth.error) {
        return Response.json(
          { success: false, error: auth.error },
          { status: 401, headers: corsHeaders }
        );
      }

      try {
        const editedExpense = await editExpense(requestBody);

        return Response.json(
          {
            success: true,
            action: "edit-expense",
            data: {
              expense: editedExpense,
            },
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error editing expense:", error);
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to edit expense",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Delete expense
    if (action === "delete-expense") {
      // Authenticate request
      const auth = authenticateRequest(request);
      if (auth.error) {
        return Response.json(
          { success: false, error: auth.error },
          { status: 401, headers: corsHeaders }
        );
      }

      try {
        const { id } = requestBody;
        const result = await deleteExpense(id);

        return Response.json(
          {
            success: true,
            action: "delete-expense",
            message: result.message,
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error deleting expense:", error);
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to delete expense",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Invalid action for POST
    return Response.json(
      {
        success: false,
        error: "Invalid action for POST method",
        valid_post_actions: [
          "login",
          "edit-product-cost",
          "create-invoice",
          "edit-invoice",
          "create-purchase",
          "edit-purchase",
          "delete-purchase",
          "complete-purchase",
          "create-expense",
          "edit-expense",
          "delete-expense",
        ],
      },
      { status: 400, headers: corsHeaders }
    );
  } catch (error) {
    console.error("POST error:", error);
    return Response.json(
      {
        success: false,
        error: "Internal server error",
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}

/**
 * DELETE /api/mobile
 * Handle DELETE requests for invoices, purchases, and expenses
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (!action) {
      return Response.json(
        {
          success: false,
          error: "Action parameter is required",
          valid_actions: [
            "delete-invoice",
            "delete-purchase",
            "delete-expense",
          ],
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Authenticate request
    const auth = authenticateRequest(request);
    if (auth.error) {
      return Response.json(
        { success: false, error: auth.error },
        { status: 401, headers: corsHeaders }
      );
    }

    // Delete invoice
    if (action === "delete-invoice") {
      try {
        const invoiceId = searchParams.get("id");
        if (!invoiceId) {
          return Response.json(
            {
              success: false,
              error: "Invoice ID is required",
            },
            { status: 400, headers: corsHeaders }
          );
        }

        // Check if invoice exists
        const existingInvoice = await invoicesService.get(invoiceId);
        if (!existingInvoice) {
          return Response.json(
            {
              success: false,
              error: "Invoice not found",
            },
            { status: 404, headers: corsHeaders }
          );
        }

        // Delete invoice
        await invoicesService.delete(invoiceId);

        return Response.json(
          {
            success: true,
            action: "delete-invoice",
            message: "Invoice deleted successfully",
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error deleting invoice:", error);
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to delete invoice",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Delete purchase
    if (action === "delete-purchase") {
      try {
        const purchaseId = searchParams.get("id");
        if (!purchaseId) {
          return Response.json(
            {
              success: false,
              error: "Purchase ID is required",
            },
            { status: 400, headers: corsHeaders }
          );
        }

        const result = await deletePurchase(purchaseId);

        return Response.json(
          {
            success: true,
            action: "delete-purchase",
            message: result.message,
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error deleting purchase:", error);
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to delete purchase",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Delete expense
    if (action === "delete-expense") {
      try {
        const expenseId = searchParams.get("id");
        if (!expenseId) {
          return Response.json(
            {
              success: false,
              error: "Expense ID is required",
            },
            { status: 400, headers: corsHeaders }
          );
        }

        const result = await deleteExpense(expenseId);

        return Response.json(
          {
            success: true,
            action: "delete-expense",
            message: result.message,
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error deleting expense:", error);
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to delete expense",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Invalid action for DELETE
    return Response.json(
      {
        success: false,
        error: "Invalid action for DELETE method",
        valid_delete_actions: [
          "delete-invoice",
          "delete-purchase",
          "delete-expense",
        ],
      },
      { status: 400, headers: corsHeaders }
    );
  } catch (error) {
    console.error("DELETE error:", error);
    return Response.json(
      {
        success: false,
        error: "Internal server error",
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
