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
 * - GET /api/mobile?action=get-items - Get ALL products/items with category info (including out-of-stock items)
 * - GET /api/mobile?action=get-categories - Get all categories
 * - GET /api/mobile?action=get-expenses - Get all expenses with optional filters
 * - GET /api/mobile?action=get-expense&id={expenseId} - Get single expense by ID
 * - GET /api/mobile?action=get-expense-categories - Get all expense categories
 * - GET /api/mobile?action=get-expense-category&id={categoryId} - Get single expense category by ID
 * - POST /api/mobile?action=create-expense-category - Create a new expense category
 * - POST /api/mobile?action=edit-expense-category - Update an expense category
 * - POST /api/mobile?action=delete-expense-category - Delete an expense category
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
  suppliersService,
  expensesService,
  expenseCategoriesService,
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
async function getStock(products, categories = null) {
  // Load categories if not provided
  if (!categories) {
    categories = await categoriesService.getAll();
  }

  // Create category lookup map
  const categoryMap = new Map();
  categoryMap.set("uncategorized", { name: "Uncategorized", image: "" });
  categories.forEach((cat) => {
    categoryMap.set(cat.id, {
      name: cat.name || "Unknown Category",
      image: cat.image || "",
    });
  });

  // Build stock data from products with inventory info
  // First, resolve costs from stock history for products with cost = 0
  const productsWithResolvedCosts = await Promise.all(
    products.map(async (product) => {
      let resolvedCost = product.cost || 0;

      // If cost is 0, try to get it from stock history
      if (resolvedCost === 0) {
        try {
          const history = await stockHistoryService.getProductHistory(
            product.id
          );
          // Find the most recent cost entry in stock history
          const costEntry = history
            .filter((entry) => entry.notes && entry.notes.includes("cost:"))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

          if (costEntry) {
            const costMatch = costEntry.notes.match(
              /cost:\s*\$?(\d+(?:\.\d{2})?)/i
            );
            if (costMatch) {
              resolvedCost = parseFloat(costMatch[1]);
            }
          }
        } catch (error) {
          // If stock history lookup fails, keep cost as 0
          console.log(
            `Could not resolve cost for product ${product.id}:`,
            error.message
          );
        }
      }

      return { ...product, resolvedCost };
    })
  );

  const stockItems = productsWithResolvedCosts.map((product) => {
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

    // Resolve category using the same logic as getItems
    let categoryId =
      product.categoryId || product.category_id || product.category;
    if (!categoryId || categoryId === "") {
      categoryId = "uncategorized";
    }

    let categoryInfo = categoryMap.get(categoryId);
    if (!categoryInfo && categoryId !== "uncategorized") {
      for (const [id, info] of categoryMap.entries()) {
        if (info.name === categoryId) {
          categoryInfo = info;
          categoryId = id;
          break;
        }
      }
    }

    if (!categoryInfo) {
      categoryInfo = categoryMap.get("uncategorized");
      categoryId = "uncategorized";
    }

    return {
      product_id: product.id,
      product_name: product.name || "Unknown Product",
      sku: product.sku || product.SKU || "",
      category: categoryInfo.name,
      current_stock: totalStock,
      low_stock_threshold: lowStockThreshold,
      is_low_stock: isLowStock,
      is_out_of_stock: isOutOfStock,
      price: product.price || primaryVariant.price || 0,
      cost: product.resolvedCost || primaryVariant.cost || 0,
      stock_value:
        Math.round(
          totalStock * (product.resolvedCost || primaryVariant.cost || 0) * 100
        ) / 100,
      variants: variants.map((v) => ({
        variant_id: v.variant_id || v.id,
        variant_name: v.default_variant
          ? product.name
          : v.option_value || v.name || "Default",
        sku: v.sku || "",
        stock: v.in_stock || v.inStock || v.stock || v.quantity || 0,
        price: v.price || product.price || 0,
        cost: v.cost || product.resolvedCost || 0,
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
    // IMPORTANT: Return ALL products including out-of-stock items
    // DO NOT filter out products with zero stock - mobile app needs to see everything
    const [products, categories] = await Promise.all([
      productsService.getAll(),
      categoriesService.getAll(),
    ]);

    // Create category lookup map
    const categoryMap = new Map();
    categoryMap.set("uncategorized", { name: "Uncategorized", image: "" });
    categories.forEach((cat) => {
      categoryMap.set(cat.id, {
        name: cat.name || "Unknown Category",
        image: cat.image || "",
      });
    });

    // Debug: Log first few categories for verification
    console.log("📂 Categories loaded:", categories.length);
    console.log(
      "📂 First 5 categories:",
      Array.from(categoryMap.entries())
        .slice(0, 5)
        .map(([id, info]) => `${id}: ${info.name}`)
    );

    // Transform products to include category information
    const items = await Promise.all(
      products.map(async (product) => {
        const variants = product.variants || [];
        const primaryVariant = variants[0] || {};

        // Calculate total stock
        let totalStock = 0;
        if (variants.length > 0) {
          totalStock = variants.reduce((sum, v) => {
            return (
              sum + (v.in_stock || v.inStock || v.stock || v.quantity || 0)
            );
          }, 0);
        } else {
          totalStock =
            product.in_stock ||
            product.inStock ||
            product.stock ||
            product.quantity ||
            0;
        }

        // Get product cost - if 0, check stock movement history for last price
        let productCost = product.cost || primaryVariant.cost || 0;

        if (productCost === 0 || productCost === null) {
          try {
            // Get recent stock movements to find last cost
            const stockHistory = await stockHistoryService.getProductHistory(
              product.id,
              10
            );

            // Look for the most recent movement with cost information in notes
            for (const movement of stockHistory) {
              if (movement.notes && movement.notes.includes("Cost:")) {
                const costMatch = movement.notes.match(
                  /Cost:\s*฿?(\d+(?:\.\d+)?)/
                );
                if (costMatch && costMatch[1]) {
                  const parsedCost = parseFloat(costMatch[1]);
                  if (parsedCost > 0) {
                    productCost = parsedCost;
                    break; // Use the most recent cost found
                  }
                }
              }
            }
          } catch (error) {
            // If stock history lookup fails, keep cost as 0
            console.warn(
              `Could not get cost from stock history for product ${product.id}:`,
              error
            );
          }
        }

        // Get category information from lookup map
        // Check all possible category field names and handle both IDs and names
        let categoryId =
          product.categoryId || product.category_id || product.category;

        // Debug first 5 products
        if (products.indexOf(product) < 5) {
          console.log(`🔍 Product "${product.name}":`, {
            categoryId: product.categoryId,
            category_id: product.category_id,
            category: product.category,
            resolved: categoryId,
          });
        }

        // If categoryId is empty string or null, set to uncategorized
        if (!categoryId || categoryId === "") {
          categoryId = "uncategorized";
        }

        // Look up category info - if not found, might be a name instead of ID
        let categoryInfo = categoryMap.get(categoryId);

        // If not found by ID, try to find by name in the categories
        if (!categoryInfo && categoryId !== "uncategorized") {
          // Search for category by name
          for (const [id, info] of categoryMap.entries()) {
            if (info.name === categoryId) {
              categoryInfo = info;
              categoryId = id; // Update to use the actual ID
              break;
            }
          }
        }

        // Fall back to uncategorized if still not found
        if (!categoryInfo) {
          categoryInfo = categoryMap.get("uncategorized");
          categoryId = "uncategorized";
        }

        return {
          id: product.id,
          product_id: product.productId || product.id,
          name: product.name,
          description: product.description || "",
          sku: product.sku || product.SKU || "",

          // Category information - resolved from categories collection
          category_id: categoryId,
          category_name: categoryInfo.name,
          category_image: categoryInfo.image,

          // Pricing - use the resolved cost
          price: product.price || primaryVariant.price || 0,
          cost: productCost,

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
            cost: v.cost || productCost || 0, // Use resolved product cost for variants too
          })),

          // Timestamps
          created_at: product.createdAt?.toDate?.()
            ? product.createdAt.toDate().toISOString()
            : product.createdAt,
          updated_at: product.updatedAt?.toDate?.()
            ? product.updatedAt.toDate().toISOString()
            : product.updatedAt,
        };
      })
    );

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
async function getPurchases(filters = {}) {
  try {
    const { supplier, payment_status } = filters;

    // Build query options
    const queryOptions = {};

    // Add filters - Firestore expects where conditions as arrays
    if (supplier || payment_status) {
      queryOptions.where = [];
      if (supplier) {
        queryOptions.where.push("supplier_name", "==", supplier);
      }
      if (payment_status) {
        queryOptions.where.push("payment_status", "==", payment_status);
      }
    }

    const purchases = await purchasesService.getAll(queryOptions);

    // Format purchases for mobile app
    let formattedPurchases = purchases.map((purchase) => ({
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
      payment_status: purchase.payment_status || "unpaid",
      payment_method: purchase.payment_method || "",
      payment_due_date: purchase.payment_due_date || "",
      notes: purchase.notes || "",
      reminder_type: purchase.reminder_type || "no_reminder",
      reminder_value: purchase.reminder_value || "",
      reminder_time: purchase.reminder_time || "",
      createdAt: purchase.createdAt?.toDate?.()
        ? purchase.createdAt.toDate().toISOString()
        : new Date().toISOString(),
    }));

    // Sort: unpaid purchases first, then paid purchases
    formattedPurchases.sort((a, b) => {
      if (a.payment_status === "unpaid" && b.payment_status !== "unpaid") {
        return -1;
      }
      if (a.payment_status !== "unpaid" && b.payment_status === "unpaid") {
        return 1;
      }
      // If both have same payment status, sort by created date (newest first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

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
      payment_status: purchase.payment_status || "unpaid",
      payment_method: purchase.payment_method || "",
      payment_due_date: purchase.payment_due_date || "",
      notes: purchase.notes || "",
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
      payment_status,
      payment_method,
      payment_due_date,
      notes,
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

    // Validate payment fields
    const validPaymentStatuses = ["paid", "unpaid"];
    if (payment_status && !validPaymentStatuses.includes(payment_status)) {
      throw new Error("Payment status must be 'paid' or 'unpaid'");
    }

    const validPaymentMethods = ["cash", "card", "bank_transfer", "other"];
    if (payment_method && !validPaymentMethods.includes(payment_method)) {
      throw new Error(
        "Payment method must be 'cash', 'card', 'bank_transfer', or 'other'"
      );
    }

    // If payment status is unpaid, payment_due_date is required
    if (payment_status === "unpaid" && !payment_due_date) {
      throw new Error(
        "Payment due date is required when payment status is unpaid"
      );
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
      payment_status: payment_status || "unpaid",
      payment_method: payment_method || "",
      payment_due_date: payment_due_date || "",
      notes: notes || "",
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
      payment_status,
      payment_method,
      payment_due_date,
      notes,
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

    // Validate payment fields
    const validPaymentStatuses = ["paid", "unpaid"];
    if (
      payment_status !== undefined &&
      !validPaymentStatuses.includes(payment_status)
    ) {
      throw new Error("Payment status must be 'paid' or 'unpaid'");
    }

    const validPaymentMethods = ["cash", "card", "bank_transfer", "other"];
    if (
      payment_method !== undefined &&
      !validPaymentMethods.includes(payment_method)
    ) {
      throw new Error(
        "Payment method must be 'cash', 'card', 'bank_transfer', or 'other'"
      );
    }

    // If payment status is unpaid, payment_due_date is required
    if (payment_status === "unpaid" && !payment_due_date) {
      throw new Error(
        "Payment due date is required when payment status is unpaid"
      );
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
    if (payment_status !== undefined)
      updateData.payment_status = payment_status;
    if (payment_method !== undefined)
      updateData.payment_method = payment_method;
    if (payment_due_date !== undefined)
      updateData.payment_due_date = payment_due_date;
    if (notes !== undefined) updateData.notes = notes;
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
      payment_status: updatedPurchase.payment_status || "unpaid",
      payment_method: updatedPurchase.payment_method || "",
      payment_due_date: updatedPurchase.payment_due_date || "",
      notes: updatedPurchase.notes || "",
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
      payment_status: updatedPurchase.payment_status || "unpaid",
      payment_method: updatedPurchase.payment_method || "",
      payment_due_date: updatedPurchase.payment_due_date || "",
      notes: updatedPurchase.notes || "",
      reminder_type: updatedPurchase.reminder_type || "no_reminder",
      reminder_value: updatedPurchase.reminder_value || "",
      reminder_time: updatedPurchase.reminder_time || "",
    };
  } catch (error) {
    console.error("Error completing purchase:", error);
    throw error;
  }
}

// ==================== SUPPLIERS HELPER FUNCTIONS ====================

// Get all suppliers
async function getSuppliers() {
  try {
    const suppliers = await suppliersService.getAll({
      orderBy: ["name", "asc"],
    });

    // Format suppliers for mobile app
    const formattedSuppliers = suppliers.map((supplier) => ({
      id: supplier.id,
      name: supplier.name || "",
      contact_person: supplier.contact_person || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      notes: supplier.notes || "",
      createdAt: supplier.createdAt?.toDate?.()
        ? supplier.createdAt.toDate().toISOString()
        : new Date().toISOString(),
    }));

    return {
      suppliers: formattedSuppliers,
    };
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    throw error;
  }
}

// Get single supplier by ID
async function getSupplierById(supplierId) {
  try {
    const supplier = await suppliersService.get(supplierId);

    if (!supplier) {
      throw new Error("Supplier not found");
    }

    // Format supplier
    return {
      id: supplier.id,
      name: supplier.name || "",
      contact_person: supplier.contact_person || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      notes: supplier.notes || "",
      createdAt: supplier.createdAt?.toDate?.()
        ? supplier.createdAt.toDate().toISOString()
        : new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error fetching supplier by ID:", error);
    throw error;
  }
}

// Create new supplier
async function createSupplier(supplierData) {
  try {
    // Validate required fields
    const { name, contact_person, email, phone, address, notes } = supplierData;

    if (!name || !name.trim()) {
      throw new Error("Supplier name is required");
    }

    // Create supplier document
    const newSupplier = {
      name: name.trim(),
      contact_person: contact_person || "",
      email: email || "",
      phone: phone || "",
      address: address || "",
      notes: notes || "",
    };

    const createdSupplier = await suppliersService.create(newSupplier);

    return {
      id: createdSupplier.id,
      ...newSupplier,
    };
  } catch (error) {
    console.error("Error creating supplier:", error);
    throw error;
  }
}

// Edit existing supplier
async function editSupplier(supplierData) {
  try {
    const { id, name, contact_person, email, phone, address, notes } =
      supplierData;

    if (!id) {
      throw new Error("Supplier ID is required");
    }

    // Check if supplier exists
    const existingSupplier = await suppliersService.get(id);
    if (!existingSupplier) {
      throw new Error("Supplier not found");
    }

    // Validate fields if provided
    if (name !== undefined && !name.trim()) {
      throw new Error("Supplier name cannot be empty");
    }

    // Update supplier
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (contact_person !== undefined)
      updateData.contact_person = contact_person;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (notes !== undefined) updateData.notes = notes;

    await suppliersService.update(id, updateData);

    // Return updated supplier
    const updatedSupplier = await suppliersService.get(id);
    return {
      id: updatedSupplier.id,
      name: updatedSupplier.name || "",
      contact_person: updatedSupplier.contact_person || "",
      email: updatedSupplier.email || "",
      phone: updatedSupplier.phone || "",
      address: updatedSupplier.address || "",
      notes: updatedSupplier.notes || "",
    };
  } catch (error) {
    console.error("Error editing supplier:", error);
    throw error;
  }
}

// Delete supplier
async function deleteSupplier(supplierId) {
  try {
    if (!supplierId) {
      throw new Error("Supplier ID is required");
    }

    // Check if supplier exists
    const existingSupplier = await suppliersService.get(supplierId);
    if (!existingSupplier) {
      throw new Error("Supplier not found");
    }

    await suppliersService.delete(supplierId);

    return { success: true, message: "Supplier deleted successfully" };
  } catch (error) {
    console.error("Error deleting supplier:", error);
    throw error;
  }
}

// ==================== EXPENSES HELPER FUNCTIONS ====================

// Format expense response with all fields
function formatExpenseResponse(expense) {
  return {
    id: expense.id,
    description: expense.description || "",
    amount: expense.amount || 0,
    date: expense.date || "",
    time: expense.time || "",
    category: expense.category || "Uncategorized",
    currency: expense.currency || "USD",
    notes: expense.notes || null,
    source: expense.source || "POS",

    // Creator info
    createdBy: expense.createdBy || expense.employeeId || null,
    createdByName: expense.createdByName || expense.employeeName || "Unknown",
    createdByRole: expense.createdByRole || "employee",

    // Employee info (backward compatibility)
    employeeId: expense.employeeId || null,
    employeeName: expense.employeeName || "Unknown",

    // Approval workflow
    status: expense.status || "pending",
    approvedBy: expense.approvedBy || null,
    approvedByName: expense.approvedByName || null,
    approvedAt: expense.approvedAt || null,
    approvalNotes: expense.approvalNotes || null,

    // Timestamps
    createdAt: expense.createdAt?.toDate?.()
      ? expense.createdAt.toDate().toISOString()
      : new Date().toISOString(),
    updatedAt: expense.updatedAt?.toDate?.()
      ? expense.updatedAt.toDate().toISOString()
      : null,
  };
}

// Get all expenses
async function getExpenses(filters = {}) {
  try {
    const expenses = await expensesService.getAll({
      orderBy: ["createdAt", "desc"],
    });

    // Filter out deleted expenses by default (unless explicitly requested)
    let filteredExpenses = filters.includeDeleted
      ? expenses
      : expenses.filter((expense) => !expense.isDeleted);

    // Filter by date range if provided
    if (filters.start_date || filters.end_date) {
      filteredExpenses = filteredExpenses.filter((expense) => {
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

    // Filter by status if provided
    if (filters.status) {
      filteredExpenses = filteredExpenses.filter(
        (expense) => expense.status === filters.status
      );
    }

    // Filter by category if provided
    if (filters.category) {
      filteredExpenses = filteredExpenses.filter(
        (expense) => expense.category === filters.category
      );
    }

    // Filter by employee/user if provided
    if (filters.employeeId || filters.userId) {
      const userId = filters.employeeId || filters.userId;
      filteredExpenses = filteredExpenses.filter(
        (expense) =>
          expense.employeeId === userId || expense.createdBy === userId
      );
    }

    // NEW: Filter by source (POS or BackOffice)
    if (filters.source) {
      filteredExpenses = filteredExpenses.filter(
        (expense) => expense.source === filters.source
      );
    }

    // NEW: Filter by currency
    if (filters.currency) {
      filteredExpenses = filteredExpenses.filter(
        (expense) => (expense.currency || "USD") === filters.currency
      );
    }

    // NEW: Text search on description
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredExpenses = filteredExpenses.filter((expense) =>
        (expense.description || "").toLowerCase().includes(searchLower)
      );
    }

    // Format expenses using the helper function
    const formattedExpenses = filteredExpenses.map(formatExpenseResponse);

    // Calculate totals by currency
    const totalsByCurrency = {};
    const pendingByCurrency = {};

    formattedExpenses.forEach((expense) => {
      const curr = expense.currency;
      if (expense.status === "approved") {
        totalsByCurrency[curr] = (totalsByCurrency[curr] || 0) + expense.amount;
      }
      if (expense.status === "pending") {
        pendingByCurrency[curr] =
          (pendingByCurrency[curr] || 0) + expense.amount;
      }
    });

    // Calculate total (only approved expenses) - backward compatibility
    const totalExpense = formattedExpenses
      .filter(
        (expense) => expense.status === "approved" && expense.currency === "USD"
      )
      .reduce((sum, expense) => sum + expense.amount, 0);

    // Calculate pending total - backward compatibility
    const pendingTotal = formattedExpenses
      .filter(
        (expense) => expense.status === "pending" && expense.currency === "USD"
      )
      .reduce((sum, expense) => sum + expense.amount, 0);

    return {
      expenses: formattedExpenses,
      total: totalExpense, // USD only for backward compatibility
      pendingTotal, // USD only for backward compatibility
      totalsByCurrency, // NEW: Totals grouped by currency
      pendingByCurrency, // NEW: Pending totals grouped by currency
      count: formattedExpenses.length,
      pendingCount: formattedExpenses.filter((e) => e.status === "pending")
        .length,
      approvedCount: formattedExpenses.filter((e) => e.status === "approved")
        .length,
      deniedCount: formattedExpenses.filter((e) => e.status === "denied")
        .length,
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

    // Format expense using helper
    return formatExpenseResponse(expense);
  } catch (error) {
    console.error("Error fetching expense by ID:", error);
    throw error;
  }
}

// Create new expense
async function createExpense(expenseData) {
  try {
    // Validate required fields
    const {
      description,
      amount,
      date,
      time,
      category,
      employeeId,
      employeeName,
      currency,
      notes,
      source,
      createdBy,
      createdByName,
      createdByRole,
    } = expenseData;

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

    // Create expense document with all fields
    const newExpense = {
      description: description.trim(),
      amount,
      date,
      time,
      category: category || "Uncategorized",
      currency: currency || "USD", // NEW: Multi-currency support
      notes: notes || null, // NEW: Internal notes
      source: source || "POS", // NEW: Source tracking (POS or BackOffice)

      // Creator tracking
      createdBy: createdBy || employeeId || null, // NEW: User ID who created
      createdByName: createdByName || employeeName || "Unknown", // NEW: User name
      createdByRole: createdByRole || "employee", // NEW: User role

      // Employee info (for POS expenses)
      employeeId: employeeId || null,
      employeeName: employeeName || "Unknown",

      // Approval workflow - Auto-approve if created by admin
      status:
        createdByRole === "admin" ||
        source === "admin" ||
        source === "mobile-admin"
          ? "approved"
          : "pending",
      approvedBy:
        createdByRole === "admin" ||
        source === "admin" ||
        source === "mobile-admin"
          ? createdBy
          : null,
      approvedByName:
        createdByRole === "admin" ||
        source === "admin" ||
        source === "mobile-admin"
          ? createdByName
          : null,
      approvedAt:
        createdByRole === "admin" ||
        source === "admin" ||
        source === "mobile-admin"
          ? new Date().toISOString()
          : null,
      approvalNotes:
        createdByRole === "admin" ||
        source === "admin" ||
        source === "mobile-admin"
          ? "Auto-approved (Admin)"
          : null,
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
async function editExpense(expenseData, userRole = "employee") {
  try {
    const {
      id,
      description,
      amount,
      date,
      time,
      category,
      currency,
      notes,
      employeeName,
      editedBy,
      editedByName,
    } = expenseData;

    if (!id) {
      throw new Error("Expense ID is required");
    }

    if (!editedBy) {
      throw new Error("Editor ID is required for tracking");
    }

    // Check if expense exists
    const existingExpense = await expensesService.get(id);
    if (!existingExpense) {
      throw new Error("Expense not found");
    }

    // Check if expense is deleted
    if (existingExpense.isDeleted) {
      throw new Error("Cannot edit a deleted expense");
    }

    // Permission check: Only admins can edit denied expenses, but approved expenses can be edited by anyone
    if (existingExpense.status === "denied" && userRole !== "admin") {
      throw new Error("Cannot edit expense that has been denied");
    }

    // Validate fields if provided
    if (description !== undefined && !description.trim()) {
      throw new Error("Description cannot be empty");
    }

    if (amount !== undefined && (typeof amount !== "number" || amount < 0)) {
      throw new Error("Amount must be a non-negative number");
    }

    // Track changes for history
    const changes = {};
    const oldValues = {};
    const newValues = {};

    if (
      description !== undefined &&
      description.trim() !== existingExpense.description
    ) {
      changes.description = true;
      oldValues.description = existingExpense.description;
      newValues.description = description.trim();
    }
    if (amount !== undefined && amount !== existingExpense.amount) {
      changes.amount = true;
      oldValues.amount = existingExpense.amount;
      newValues.amount = amount;
    }
    if (date !== undefined && date !== existingExpense.date) {
      changes.date = true;
      oldValues.date = existingExpense.date;
      newValues.date = date;
    }
    if (time !== undefined && time !== existingExpense.time) {
      changes.time = true;
      oldValues.time = existingExpense.time;
      newValues.time = time;
    }
    if (category !== undefined && category !== existingExpense.category) {
      changes.category = true;
      oldValues.category = existingExpense.category;
      newValues.category = category;
    }
    if (currency !== undefined && currency !== existingExpense.currency) {
      changes.currency = true;
      oldValues.currency = existingExpense.currency;
      newValues.currency = currency;
    }
    if (notes !== undefined && notes !== existingExpense.notes) {
      changes.notes = true;
      oldValues.notes = existingExpense.notes;
      newValues.notes = notes;
    }
    if (
      employeeName !== undefined &&
      employeeName !== existingExpense.employeeName
    ) {
      changes.employeeName = true;
      oldValues.employeeName = existingExpense.employeeName;
      newValues.employeeName = employeeName;
    }

    // Only update if there are actual changes
    if (Object.keys(changes).length === 0) {
      throw new Error("No changes detected");
    }

    // Create history entry
    const historyEntry = {
      timestamp: new Date().toISOString(),
      editedBy: editedBy,
      editedByName: editedByName || "Unknown",
      changes: Object.keys(changes),
      oldValues: oldValues,
      newValues: newValues,
    };

    // Update expense
    const updateData = {
      lastEditedAt: new Date().toISOString(),
      lastEditedBy: editedBy,
      lastEditedByName: editedByName || "Unknown",
    };

    if (description !== undefined) updateData.description = description.trim();
    if (amount !== undefined) updateData.amount = amount;
    if (date !== undefined) updateData.date = date;
    if (time !== undefined) updateData.time = time;
    if (category !== undefined) updateData.category = category;
    if (currency !== undefined) updateData.currency = currency;
    if (notes !== undefined) updateData.notes = notes;
    if (employeeName !== undefined) updateData.employeeName = employeeName;

    // Add history entry to array (create array if doesn't exist)
    const editHistory = existingExpense.editHistory || [];
    editHistory.push(historyEntry);
    updateData.editHistory = editHistory;

    await expensesService.update(id, updateData);

    // Return updated expense
    const updatedExpense = await expensesService.get(id);
    return formatExpenseResponse(updatedExpense);
  } catch (error) {
    console.error("Error editing expense:", error);
    throw error;
  }
}

// Delete expense (soft delete - flag as deleted, don't remove from database)
async function deleteExpense(expenseId, deletedBy, deletedByName) {
  try {
    if (!expenseId) {
      throw new Error("Expense ID is required");
    }

    if (!deletedBy) {
      throw new Error("Deleter ID is required for tracking");
    }

    // Check if expense exists
    const existingExpense = await expensesService.get(expenseId);
    if (!existingExpense) {
      throw new Error("Expense not found");
    }

    // Check if already deleted
    if (existingExpense.isDeleted) {
      throw new Error("Expense is already deleted");
    }

    // Soft delete: flag as deleted instead of removing from database
    const deleteData = {
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: deletedBy,
      deletedByName: deletedByName || "Unknown",
      // Keep all original data for recovery if needed
    };

    await expensesService.update(expenseId, deleteData);

    return {
      success: true,
      message: "Expense marked as deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting expense:", error);
    throw error;
  }
}

// Approve expense
async function approveExpense(approvalData) {
  try {
    const { expenseId, approvedBy, approvedByName, notes } = approvalData;

    if (!expenseId) {
      throw new Error("Expense ID is required");
    }

    if (!approvedBy) {
      throw new Error("Approver ID is required");
    }

    // Check if expense exists
    const existingExpense = await expensesService.get(expenseId);
    if (!existingExpense) {
      throw new Error("Expense not found");
    }

    // Check if already approved or denied
    if (existingExpense.status !== "pending") {
      throw new Error(`Expense has already been ${existingExpense.status}`);
    }

    // Update expense with approval
    const updateData = {
      status: "approved",
      approvedBy,
      approvedByName: approvedByName || "Admin",
      approvedAt: new Date().toISOString(),
      approvalNotes: notes || null,
    };

    await expensesService.update(expenseId, updateData);

    // Return updated expense
    const updatedExpense = await expensesService.get(expenseId);
    return formatExpenseResponse(updatedExpense);
  } catch (error) {
    console.error("Error approving expense:", error);
    throw error;
  }
}

// Deny expense
async function denyExpense(denialData) {
  try {
    const { expenseId, deniedBy, deniedByName, notes } = denialData;

    if (!expenseId) {
      throw new Error("Expense ID is required");
    }

    if (!deniedBy) {
      throw new Error("Denier ID is required");
    }

    // Check if expense exists
    const existingExpense = await expensesService.get(expenseId);
    if (!existingExpense) {
      throw new Error("Expense not found");
    }

    // Check if already approved or denied
    if (existingExpense.status !== "pending") {
      throw new Error(`Expense has already been ${existingExpense.status}`);
    }

    // Update expense with denial
    const updateData = {
      status: "denied",
      approvedBy: deniedBy,
      approvedByName: deniedByName || "Admin",
      approvedAt: new Date().toISOString(),
      approvalNotes: notes || null,
    };

    await expensesService.update(expenseId, updateData);

    // Return updated expense
    const updatedExpense = await expensesService.get(expenseId);
    return formatExpenseResponse(updatedExpense);
  } catch (error) {
    console.error("Error denying expense:", error);
    throw error;
  }
}

// ==================== EXPENSE CATEGORIES HELPER FUNCTIONS ====================

// Get all expense categories
async function getExpenseCategories() {
  try {
    const categories = await expenseCategoriesService.getAll({
      orderBy: ["name", "asc"],
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description || "",
      active: category.active !== undefined ? category.active : true,
      createdAt: category.createdAt?.toDate?.()
        ? category.createdAt.toDate().toISOString()
        : category.createdAt,
      updatedAt: category.updatedAt?.toDate?.()
        ? category.updatedAt.toDate().toISOString()
        : category.updatedAt,
    }));
  } catch (error) {
    console.error("Error getting expense categories:", error);
    throw error;
  }
}

// Get expense category by ID
async function getExpenseCategoryById(categoryId) {
  try {
    if (!categoryId) {
      throw new Error("Category ID is required");
    }

    const category = await expenseCategoriesService.get(categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    return {
      id: category.id,
      name: category.name,
      description: category.description || "",
      active: category.active !== undefined ? category.active : true,
      createdAt: category.createdAt?.toDate?.()
        ? category.createdAt.toDate().toISOString()
        : category.createdAt,
      updatedAt: category.updatedAt?.toDate?.()
        ? category.updatedAt.toDate().toISOString()
        : category.updatedAt,
    };
  } catch (error) {
    console.error("Error getting expense category:", error);
    throw error;
  }
}

// Create expense category
async function createExpenseCategory(categoryData) {
  try {
    const { name, description, active } = categoryData;

    if (!name || name.trim() === "") {
      throw new Error("Category name is required");
    }

    // Check for duplicate category names
    const existingCategories = await expenseCategoriesService.getAll();
    const duplicate = existingCategories.find(
      (cat) => cat.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (duplicate) {
      throw new Error("A category with this name already exists");
    }

    const newCategory = {
      name: name.trim(),
      description: description?.trim() || "",
      active: active !== undefined ? active : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const categoryId = await expenseCategoriesService.create(newCategory);

    return {
      id: categoryId,
      ...newCategory,
      createdAt: newCategory.createdAt.toISOString(),
      updatedAt: newCategory.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error("Error creating expense category:", error);
    throw error;
  }
}

// Edit expense category
async function editExpenseCategory(categoryData) {
  try {
    const { categoryId, id, name, description, active } = categoryData;
    const categoryIdToUse = categoryId || id; // Accept both 'categoryId' and 'id'

    if (!categoryIdToUse) {
      throw new Error("Category ID is required");
    }

    // Check if category exists
    const existingCategory = await expenseCategoriesService.get(
      categoryIdToUse
    );
    if (!existingCategory) {
      throw new Error("Category not found");
    }

    // Check for duplicate names (excluding current category)
    if (name && name.trim() !== existingCategory.name) {
      const allCategories = await expenseCategoriesService.getAll();
      const duplicate = allCategories.find(
        (cat) =>
          cat.id !== categoryIdToUse &&
          cat.name.toLowerCase() === name.trim().toLowerCase() &&
          cat.active !== false // Only check active categories
      );

      if (duplicate) {
        throw new Error("A category with this name already exists");
      }
    }

    // Prepare history entry to track what changed
    const changes = {};
    const historyEntry = {
      timestamp: new Date(),
      action: "edit",
      changedBy: categoryData.changedBy || "system", // Can be passed from frontend
    };

    if (
      name !== undefined &&
      name.trim() !== "" &&
      name.trim() !== existingCategory.name
    ) {
      changes.name = {
        from: existingCategory.name,
        to: name.trim(),
      };
    }

    if (
      description !== undefined &&
      description.trim() !== existingCategory.description
    ) {
      changes.description = {
        from: existingCategory.description || "",
        to: description.trim(),
      };
    }

    if (active !== undefined && active !== existingCategory.active) {
      changes.active = {
        from:
          existingCategory.active !== undefined
            ? existingCategory.active
            : true,
        to: active,
      };
    }

    // Only proceed if there are actual changes
    if (Object.keys(changes).length === 0) {
      return {
        id: existingCategory.id,
        name: existingCategory.name,
        description: existingCategory.description || "",
        active:
          existingCategory.active !== undefined
            ? existingCategory.active
            : true,
        createdAt: existingCategory.createdAt?.toDate?.()
          ? existingCategory.createdAt.toDate().toISOString()
          : existingCategory.createdAt,
        updatedAt: existingCategory.updatedAt?.toDate?.()
          ? existingCategory.updatedAt.toDate().toISOString()
          : existingCategory.updatedAt,
      };
    }

    historyEntry.changes = changes;

    const updateData = {
      updatedAt: new Date(),
    };

    if (name !== undefined && name.trim() !== "") {
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description.trim();
    }

    if (active !== undefined) {
      updateData.active = active;
    }

    // Save history entry to Firestore subcollection
    try {
      const db = admin.firestore();
      await db
        .collection(COLLECTIONS.EXPENSE_CATEGORIES)
        .doc(categoryIdToUse)
        .collection("history")
        .add(historyEntry);
    } catch (historyError) {
      console.error("Error saving history:", historyError);
      // Continue with update even if history fails
    }

    await expenseCategoriesService.update(categoryIdToUse, updateData);

    // Return updated category
    const updatedCategory = await expenseCategoriesService.get(categoryIdToUse);
    return {
      id: updatedCategory.id,
      name: updatedCategory.name,
      description: updatedCategory.description || "",
      active:
        updatedCategory.active !== undefined ? updatedCategory.active : true,
      createdAt: updatedCategory.createdAt?.toDate?.()
        ? updatedCategory.createdAt.toDate().toISOString()
        : updatedCategory.createdAt,
      updatedAt: updatedCategory.updatedAt?.toDate?.()
        ? updatedCategory.updatedAt.toDate().toISOString()
        : updatedCategory.updatedAt,
    };
  } catch (error) {
    console.error("Error editing expense category:", error);
    throw error;
  }
}

// Delete expense category (Soft Delete - flags as inactive instead of removing)
async function deleteExpenseCategory(categoryId, deletedBy = "system") {
  try {
    if (!categoryId) {
      throw new Error("Category ID is required");
    }

    // Check if category exists
    const existingCategory = await expenseCategoriesService.get(categoryId);
    if (!existingCategory) {
      throw new Error("Category not found");
    }

    // Soft delete: Set active to false instead of actually deleting
    // This preserves data integrity for expenses using this category
    const updateData = {
      active: false,
      deletedAt: new Date(),
      deletedBy: deletedBy,
      updatedAt: new Date(),
    };

    // Save history entry for deletion
    const historyEntry = {
      timestamp: new Date(),
      action: "delete",
      changedBy: deletedBy,
      changes: {
        active: {
          from:
            existingCategory.active !== undefined
              ? existingCategory.active
              : true,
          to: false,
        },
      },
      note: "Category soft deleted - data preserved for existing expenses",
    };

    try {
      const db = admin.firestore();
      await db
        .collection(COLLECTIONS.EXPENSE_CATEGORIES)
        .doc(categoryId)
        .collection("history")
        .add(historyEntry);
    } catch (historyError) {
      console.error("Error saving deletion history:", historyError);
      // Continue with soft delete even if history fails
    }

    await expenseCategoriesService.update(categoryId, updateData);

    return {
      success: true,
      message: "Category deleted successfully (soft delete - data preserved)",
    };
  } catch (error) {
    console.error("Error deleting expense category:", error);
    throw error;
  }
}

// Get expense category history
async function getExpenseCategoryHistory(categoryId) {
  try {
    if (!categoryId) {
      throw new Error("Category ID is required");
    }

    // Check if category exists
    const existingCategory = await expenseCategoriesService.get(categoryId);
    if (!existingCategory) {
      throw new Error("Category not found");
    }

    // Get history from subcollection
    const db = admin.firestore();
    const historySnapshot = await db
      .collection(COLLECTIONS.EXPENSE_CATEGORIES)
      .doc(categoryId)
      .collection("history")
      .orderBy("timestamp", "desc")
      .get();

    const history = historySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.()
        ? doc.data().timestamp.toDate().toISOString()
        : doc.data().timestamp,
    }));

    return {
      category: {
        id: existingCategory.id,
        name: existingCategory.name,
        description: existingCategory.description || "",
        active:
          existingCategory.active !== undefined
            ? existingCategory.active
            : true,
        createdAt: existingCategory.createdAt?.toDate?.()
          ? existingCategory.createdAt.toDate().toISOString()
          : existingCategory.createdAt,
        updatedAt: existingCategory.updatedAt?.toDate?.()
          ? existingCategory.updatedAt.toDate().toISOString()
          : existingCategory.updatedAt,
        deletedAt: existingCategory.deletedAt?.toDate?.()
          ? existingCategory.deletedAt.toDate().toISOString()
          : existingCategory.deletedAt,
      },
      history: history,
    };
  } catch (error) {
    console.error("Error getting expense category history:", error);
    throw error;
  }
}

// Restore deleted expense category
async function restoreExpenseCategory(categoryId, restoredBy = "system") {
  try {
    if (!categoryId) {
      throw new Error("Category ID is required");
    }

    // Check if category exists
    const existingCategory = await expenseCategoriesService.get(categoryId);
    if (!existingCategory) {
      throw new Error("Category not found");
    }

    if (existingCategory.active !== false) {
      throw new Error("Category is not deleted");
    }

    // Restore category
    const updateData = {
      active: true,
      restoredAt: new Date(),
      restoredBy: restoredBy,
      updatedAt: new Date(),
    };

    // Save history entry for restoration
    const historyEntry = {
      timestamp: new Date(),
      action: "restore",
      changedBy: restoredBy,
      changes: {
        active: {
          from: false,
          to: true,
        },
      },
      note: "Category restored from deleted state",
    };

    try {
      const db = admin.firestore();
      await db
        .collection(COLLECTIONS.EXPENSE_CATEGORIES)
        .doc(categoryId)
        .collection("history")
        .add(historyEntry);
    } catch (historyError) {
      console.error("Error saving restoration history:", historyError);
      // Continue with restore even if history fails
    }

    await expenseCategoriesService.update(categoryId, updateData);

    const restoredCategory = await expenseCategoriesService.get(categoryId);
    return {
      id: restoredCategory.id,
      name: restoredCategory.name,
      description: restoredCategory.description || "",
      active:
        restoredCategory.active !== undefined ? restoredCategory.active : true,
      createdAt: restoredCategory.createdAt?.toDate?.()
        ? restoredCategory.createdAt.toDate().toISOString()
        : restoredCategory.createdAt,
      updatedAt: restoredCategory.updatedAt?.toDate?.()
        ? restoredCategory.updatedAt.toDate().toISOString()
        : restoredCategory.updatedAt,
    };
  } catch (error) {
    console.error("Error restoring expense category:", error);
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
      invoice_id: invoice.id, // Add invoice_id for backward compatibility
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
      status: invoice.status || "pending", // Add status field
      payment_status: invoice.payment_status || invoice.status || "pending", // Add payment_status
      created_at: invoice.createdAt?.toDate?.()
        ? invoice.createdAt.toDate().toISOString()
        : invoice.createdAt,
      updated_at: invoice.updatedAt?.toDate?.()
        ? invoice.updatedAt.toDate().toISOString()
        : invoice.updatedAt,
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
      invoice_id: invoice.id, // Add invoice_id for backward compatibility
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
      status: invoice.status || "pending", // Add status field
      payment_status: invoice.payment_status || invoice.status || "pending", // Add payment_status
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

// Update invoice status (pending, paid, cancelled)
async function updateInvoiceStatus(invoiceId, status) {
  try {
    if (!invoiceId) {
      throw new Error("Invoice ID is required");
    }

    if (!status) {
      throw new Error("Status is required");
    }

    // Validate status
    const validStatuses = ["pending", "paid", "cancelled"];
    if (!validStatuses.includes(status.toLowerCase())) {
      throw new Error(
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      );
    }

    // Check if invoice exists
    const existingInvoice = await invoicesService.get(invoiceId);
    if (!existingInvoice) {
      throw new Error("Invoice not found");
    }

    // Update status in database
    const updateData = {
      status: status.toLowerCase(),
      payment_status:
        status.toLowerCase() === "paid"
          ? "paid"
          : existingInvoice.payment_status || "pending",
      updatedAt: new Date(),
    };

    await invoicesService.update(invoiceId, updateData);

    // Get updated invoice
    const updatedInvoice = await invoicesService.get(invoiceId);

    return {
      id: updatedInvoice.id,
      invoice_id: updatedInvoice.id,
      number:
        updatedInvoice.number ||
        `INV-${updatedInvoice.id.slice(-6).toUpperCase()}`,
      customer_name:
        updatedInvoice.customer_name ||
        updatedInvoice.customerName ||
        "Unknown Customer",
      date:
        updatedInvoice.date ||
        (updatedInvoice.createdAt?.toDate?.()
          ? updatedInvoice.createdAt.toDate().toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]),
      due_date: updatedInvoice.due_date,
      items: updatedInvoice.items || [],
      total: updatedInvoice.total || 0,
      status: updatedInvoice.status || "pending",
      payment_status: updatedInvoice.payment_status || "pending",
      created_at: updatedInvoice.createdAt?.toDate?.()
        ? updatedInvoice.createdAt.toDate().toISOString()
        : updatedInvoice.createdAt,
      updated_at: updatedInvoice.updatedAt?.toDate?.()
        ? updatedInvoice.updatedAt.toDate().toISOString()
        : updatedInvoice.updatedAt,
    };
  } catch (error) {
    console.error("Error updating invoice status:", error);
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

// Authentication middleware - requires valid token (any role)
function authenticateRequest(request, requireAdmin = false) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing or invalid authorization header" };
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const user = jwtUtils.getUserFromToken(token);

  if (!user) {
    return { error: "Invalid or expired token" };
  }

  // If admin is required, check role
  if (requireAdmin && user.role !== "admin") {
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

    // Authenticate request for all other actions (employees can read data)
    const auth = authenticateRequest(request, false); // false = allow employees
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
      "get-expense-categories",
      "get-expense-category",
      "create-expense-category",
      "edit-expense-category",
      "delete-expense-category",
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
    // IMPORTANT: Return ALL products including out-of-stock items
    // DO NOT filter products - mobile app needs complete inventory data
    if (action === "stock") {
      const [products, categories] = await Promise.all([
        productsService.getAll(),
        categoriesService.getAll(),
      ]);
      const stockData = await getStock(products || [], categories);

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
    // IMPORTANT: Return ALL stock movement history for all products
    // DO NOT filter history - mobile app needs complete historical data
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
          status: searchParams.get("status"), // pending, approved, denied
          category: searchParams.get("category"),
          employeeId: searchParams.get("employeeId"),
          userId: searchParams.get("userId"), // NEW: Alternative to employeeId
          source: searchParams.get("source"), // NEW: POS or BackOffice
          currency: searchParams.get("currency"), // NEW: Filter by currency
          search: searchParams.get("search"), // NEW: Text search on description
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

    // Get all expense categories
    if (action === "get-expense-categories") {
      try {
        const categories = await getExpenseCategories();

        return Response.json(
          {
            success: true,
            action: "get-expense-categories",
            generated_at: new Date().toISOString(),
            data: categories,
          },
          { headers: corsHeaders }
        );
      } catch (error) {
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to retrieve expense categories",
          },
          { status: 200, headers: corsHeaders }
        );
      }
    }

    // Get single expense category by ID
    if (action === "get-expense-category") {
      try {
        const categoryId = searchParams.get("id");
        if (!categoryId) {
          return Response.json(
            {
              success: false,
              error: "Category ID is required",
            },
            { status: 400, headers: corsHeaders }
          );
        }

        const categoryData = await getExpenseCategoryById(categoryId);

        return Response.json(
          {
            success: true,
            action: "get-expense-category",
            generated_at: new Date().toISOString(),
            data: categoryData,
          },
          { headers: corsHeaders }
        );
      } catch (error) {
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to retrieve expense category",
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
  let requestBody = {};

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Parse request body with error handling
    try {
      const bodyText = await request.text();
      if (bodyText.trim()) {
        requestBody = JSON.parse(bodyText);
      }
    } catch (jsonError) {
      return Response.json(
        {
          success: false,
          error: "Invalid JSON in request body",
        },
        { status: 400, headers: corsHeaders }
      );
    }

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

    // Handle update-invoice-status action
    if (action === "update-invoice-status") {
      // Authenticate request
      const auth = authenticateRequest(request);
      if (auth.error) {
        return Response.json(
          { success: false, error: auth.error },
          { status: 401, headers: corsHeaders }
        );
      }

      try {
        const { invoice_id, status } = requestBody;

        if (!invoice_id) {
          return Response.json(
            {
              success: false,
              error: "invoice_id is required",
            },
            { status: 400, headers: corsHeaders }
          );
        }

        if (!status) {
          return Response.json(
            {
              success: false,
              error: "status is required (pending, paid, or cancelled)",
            },
            { status: 400, headers: corsHeaders }
          );
        }

        const updatedInvoice = await updateInvoiceStatus(invoice_id, status);

        return Response.json(
          {
            success: true,
            action: "update-invoice-status",
            data: {
              invoice: updatedInvoice,
            },
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error updating invoice status:", error);
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to update invoice status",
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

        // In development return the error message and stack to assist debugging.
        // In production do not leak internal error details.
        const isProd = process.env.NODE_ENV === "production";
        const payload = {
          success: false,
          error: isProd
            ? error.message || "Failed to complete purchase"
            : error.message || "Failed to complete purchase",
        };

        if (!isProd) {
          payload.stack = error.stack;
        }

        return Response.json(payload, { status: 500, headers: corsHeaders });
      }
    }

    // Get suppliers
    if (action === "get-suppliers") {
      // Authenticate request
      const auth = authenticateRequest(request);
      if (auth.error) {
        return Response.json(
          { success: false, error: auth.error },
          { status: 401, headers: corsHeaders }
        );
      }

      try {
        const suppliers = await getSuppliers();

        return Response.json(
          {
            success: true,
            action: "get-suppliers",
            data: suppliers,
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error fetching suppliers:", error);

        const isProd = process.env.NODE_ENV === "production";
        const payload = {
          success: false,
          error: isProd
            ? error.message || "Failed to fetch suppliers"
            : error.message || "Failed to fetch suppliers",
        };

        if (!isProd) {
          payload.stack = error.stack;
        }

        return Response.json(payload, { status: 500, headers: corsHeaders });
      }
    }

    // Get single supplier
    if (action === "get-supplier") {
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
        const supplier = await getSupplierById(id);

        return Response.json(
          {
            success: true,
            action: "get-supplier",
            data: {
              supplier: supplier,
            },
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error fetching supplier:", error);

        const isProd = process.env.NODE_ENV === "production";
        const payload = {
          success: false,
          error: isProd
            ? error.message || "Failed to fetch supplier"
            : error.message || "Failed to fetch supplier",
        };

        if (!isProd) {
          payload.stack = error.stack;
        }

        return Response.json(payload, { status: 500, headers: corsHeaders });
      }
    }

    // Create supplier
    if (action === "create-supplier") {
      // Authenticate request
      const auth = authenticateRequest(request);
      if (auth.error) {
        return Response.json(
          { success: false, error: auth.error },
          { status: 401, headers: corsHeaders }
        );
      }

      try {
        const newSupplier = await createSupplier(requestBody);

        return Response.json(
          {
            success: true,
            action: "create-supplier",
            data: {
              supplier: newSupplier,
            },
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error creating supplier:", error);

        const isProd = process.env.NODE_ENV === "production";
        const payload = {
          success: false,
          error: isProd
            ? error.message || "Failed to create supplier"
            : error.message || "Failed to create supplier",
        };

        if (!isProd) {
          payload.stack = error.stack;
        }

        return Response.json(payload, { status: 500, headers: corsHeaders });
      }
    }

    // Edit supplier
    if (action === "edit-supplier") {
      // Authenticate request
      const auth = authenticateRequest(request);
      if (auth.error) {
        return Response.json(
          { success: false, error: auth.error },
          { status: 401, headers: corsHeaders }
        );
      }

      try {
        const updatedSupplier = await editSupplier(requestBody);

        return Response.json(
          {
            success: true,
            action: "edit-supplier",
            data: {
              supplier: updatedSupplier,
            },
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error editing supplier:", error);

        const isProd = process.env.NODE_ENV === "production";
        const payload = {
          success: false,
          error: isProd
            ? error.message || "Failed to edit supplier"
            : error.message || "Failed to edit supplier",
        };

        if (!isProd) {
          payload.stack = error.stack;
        }

        return Response.json(payload, { status: 500, headers: corsHeaders });
      }
    }

    // Delete supplier
    if (action === "delete-supplier") {
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
        const result = await deleteSupplier(id);

        return Response.json(
          {
            success: true,
            action: "delete-supplier",
            data: result,
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error deleting supplier:", error);

        const isProd = process.env.NODE_ENV === "production";
        const payload = {
          success: false,
          error: isProd
            ? error.message || "Failed to delete supplier"
            : error.message || "Failed to delete supplier",
        };

        if (!isProd) {
          payload.stack = error.stack;
        }

        return Response.json(payload, { status: 500, headers: corsHeaders });
      }
    }

    // Get all purchases
    if (action === "get-purchases") {
      // Authenticate request
      const auth = authenticateRequest(request);
      if (auth.error) {
        return Response.json(
          { success: false, error: auth.error },
          { status: 401, headers: corsHeaders }
        );
      }

      try {
        // Extract filter parameters
        const { supplier, payment_status } = requestBody;
        const filters = {};
        if (supplier) filters.supplier = supplier;
        if (payment_status) filters.payment_status = payment_status;

        const purchasesData = await getPurchases(filters);

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
        console.error("Error fetching purchases:", error);

        const isProd = process.env.NODE_ENV === "production";
        const payload = {
          success: false,
          error: isProd
            ? error.message || "Failed to retrieve purchases"
            : error.message || "Failed to retrieve purchases",
        };

        if (!isProd) {
          payload.stack = error.stack;
        }

        return Response.json(payload, { status: 500, headers: corsHeaders });
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
        const { id, deletedBy, deletedByName } = requestBody;

        if (!deletedBy) {
          return Response.json(
            { success: false, error: "deletedBy is required" },
            { status: 400, headers: corsHeaders }
          );
        }

        const result = await deleteExpense(id, deletedBy, deletedByName);

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

    // Approve expense
    if (action === "approve-expense") {
      // Authenticate request
      const auth = authenticateRequest(request);
      if (auth.error) {
        return Response.json(
          { success: false, error: auth.error },
          { status: 401, headers: corsHeaders }
        );
      }

      try {
        const { expenseId, approvedBy, approvedByName, notes } = requestBody;
        const approvedExpense = await approveExpense({
          expenseId,
          approvedBy,
          approvedByName,
          notes,
        });

        return Response.json(
          {
            success: true,
            action: "approve-expense",
            data: {
              expense: approvedExpense,
            },
            message: "Expense approved successfully",
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error approving expense:", error);
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to approve expense",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Deny expense
    if (action === "deny-expense") {
      // Authenticate request
      const auth = authenticateRequest(request);
      if (auth.error) {
        return Response.json(
          { success: false, error: auth.error },
          { status: 401, headers: corsHeaders }
        );
      }

      try {
        const { expenseId, deniedBy, deniedByName, notes } = requestBody;
        const deniedExpense = await denyExpense({
          expenseId,
          deniedBy,
          deniedByName,
          notes,
        });

        return Response.json(
          {
            success: true,
            action: "deny-expense",
            data: {
              expense: deniedExpense,
            },
            message: "Expense denied successfully",
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error denying expense:", error);
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to deny expense",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Get all expense categories (POST version for consistency)
    if (action === "get-expense-categories") {
      try {
        const categories = await getExpenseCategories();

        return Response.json(
          {
            success: true,
            action: "get-expense-categories",
            generated_at: new Date().toISOString(),
            data: categories,
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error getting expense categories:", error);
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to retrieve expense categories",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Get single expense category by ID (POST version for consistency)
    if (action === "get-expense-category") {
      try {
        const { id, categoryId } = requestBody;
        const categoryIdToUse = id || categoryId;

        if (!categoryIdToUse) {
          return Response.json(
            {
              success: false,
              error: "Category ID is required",
            },
            { status: 400, headers: corsHeaders }
          );
        }

        const categoryData = await getExpenseCategoryById(categoryIdToUse);

        return Response.json(
          {
            success: true,
            action: "get-expense-category",
            generated_at: new Date().toISOString(),
            data: categoryData,
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error getting expense category:", error);
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to retrieve expense category",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Create expense category
    if (action === "create-expense-category") {
      // Authenticate request (admin only)
      const auth = authenticateRequest(request, true);
      if (auth.error) {
        return Response.json(
          { success: false, error: auth.error },
          { status: 401, headers: corsHeaders }
        );
      }

      try {
        const categoryData = requestBody;
        const result = await createExpenseCategory(categoryData);

        return Response.json(
          {
            success: true,
            action: "create-expense-category",
            message: "Expense category created successfully",
            data: result,
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error creating expense category:", error);
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to create expense category",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Edit expense category
    if (action === "edit-expense-category") {
      // Authenticate request (admin only)
      const auth = authenticateRequest(request, true);
      if (auth.error) {
        return Response.json(
          { success: false, error: auth.error },
          { status: 401, headers: corsHeaders }
        );
      }

      try {
        const categoryData = {
          ...requestBody,
          changedBy: requestBody.changedBy || auth.user?.email || "system",
        };
        const result = await editExpenseCategory(categoryData);

        return Response.json(
          {
            success: true,
            action: "edit-expense-category",
            message: "Expense category updated successfully",
            data: result,
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error editing expense category:", error);
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to edit expense category",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Delete expense category
    if (action === "delete-expense-category") {
      // Authenticate request (admin only)
      const auth = authenticateRequest(request, true);
      if (auth.error) {
        return Response.json(
          { success: false, error: auth.error },
          { status: 401, headers: corsHeaders }
        );
      }

      try {
        const { id, categoryId, deletedBy } = requestBody;
        const categoryIdToUse = id || categoryId; // Accept both 'id' and 'categoryId'

        if (!categoryIdToUse) {
          return Response.json(
            { success: false, error: "Category ID is required" },
            { status: 400, headers: corsHeaders }
          );
        }

        const result = await deleteExpenseCategory(
          categoryIdToUse,
          deletedBy || auth.user?.email || "system"
        );

        return Response.json(
          {
            success: true,
            action: "delete-expense-category",
            message: result.message,
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error deleting expense category:", error);
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to delete expense category",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Get expense category history
    if (action === "get-expense-category-history") {
      // Authenticate request (admin only)
      const auth = authenticateRequest(request, true);
      if (auth.error) {
        return Response.json(
          { success: false, error: auth.error },
          { status: 401, headers: corsHeaders }
        );
      }

      try {
        const { id, categoryId } = requestBody;
        const categoryIdToUse = id || categoryId;

        if (!categoryIdToUse) {
          return Response.json(
            { success: false, error: "Category ID is required" },
            { status: 400, headers: corsHeaders }
          );
        }

        const result = await getExpenseCategoryHistory(categoryIdToUse);

        return Response.json(
          {
            success: true,
            action: "get-expense-category-history",
            data: result,
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error getting expense category history:", error);
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to get expense category history",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Restore deleted expense category
    if (action === "restore-expense-category") {
      // Authenticate request (admin only)
      const auth = authenticateRequest(request, true);
      if (auth.error) {
        return Response.json(
          { success: false, error: auth.error },
          { status: 401, headers: corsHeaders }
        );
      }

      try {
        const { id, categoryId, restoredBy } = requestBody;
        const categoryIdToUse = id || categoryId;

        if (!categoryIdToUse) {
          return Response.json(
            { success: false, error: "Category ID is required" },
            { status: 400, headers: corsHeaders }
          );
        }

        const restoredCategory = await restoreExpenseCategory(
          categoryIdToUse,
          restoredBy || auth.user?.email || "system"
        );

        return Response.json(
          {
            success: true,
            action: "restore-expense-category",
            data: { category: restoredCategory },
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error restoring expense category:", error);
        return Response.json(
          {
            success: false,
            error: error.message || "Failed to restore expense category",
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
          "get-purchases",
          "create-purchase",
          "edit-purchase",
          "delete-purchase",
          "complete-purchase",
          "get-suppliers",
          "get-supplier",
          "create-supplier",
          "edit-supplier",
          "delete-supplier",
          "create-expense",
          "edit-expense",
          "delete-expense",
          "approve-expense",
          "deny-expense",
          "get-expense-categories",
          "get-expense-category",
          "create-expense-category",
          "edit-expense-category",
          "delete-expense-category",
          "get-expense-category-history",
          "restore-expense-category",
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
