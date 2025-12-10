/**
 * Mobile API Endpoint
 * Comprehensive API for Android/iOS mobile apps
 *
 * Endpoints:
 * - GET /api/mobile?action=sales-summary - Sales summary with metrics
 * - GET /api/mobile?action=sales-by-item - Sales breakdown by item/product
 * - GET /api/mobile?action=sales-by-category - Sales breakdown by category
 * - GET /api/mobile?action=sales-by-employee - Sales breakdown by employee
 * - GET /api/mobile?action=stock - Current inventory stock levels
 *
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
  getDocuments,
} from "@/lib/firebase/firestore";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  subDays,
} from "date-fns";

// CORS headers for mobile apps
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

    // Employee filter
    if (employeeIds.length > 0) {
      const employeeId = receipt.employeeId || receipt.employee_id;
      if (!employeeIds.includes(employeeId)) {
        return false;
      }
    }

    return true;
  });
}

// Calculate Sales Summary
async function getSalesSummary(receipts, dateRange) {
  const filteredReceipts = receipts;

  // Current period metrics
  const salesReceipts = filteredReceipts.filter(
    (r) => r.receiptType !== "REFUND"
  );
  const refundReceipts = filteredReceipts.filter(
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
  const discounts = filteredReceipts.reduce(
    (sum, r) => sum + getReceiptDiscount(r),
    0
  );
  const taxes = filteredReceipts.reduce((sum, r) => sum + getReceiptTax(r), 0);
  const netSales = grossSales - refunds - discounts;

  // Calculate cost of goods and profit
  let costOfGoods = 0;
  filteredReceipts.forEach((receipt) => {
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
    period: {
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString(),
    },
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
  };
}

// Calculate Sales by Item
async function getSalesByItem(receipts, products) {
  const filteredReceipts = receipts.filter((r) => r.receiptType !== "REFUND");

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

  // Aggregate sales by item
  const itemSalesMap = new Map();

  filteredReceipts.forEach((receipt) => {
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

  // Calculate totals
  const totals = items.reduce(
    (acc, item) => ({
      total_quantity: acc.total_quantity + item.quantity_sold,
      total_gross_sales: acc.total_gross_sales + item.gross_sales,
      total_net_sales: acc.total_net_sales + item.net_sales,
      total_cost: acc.total_cost + item.cost_of_goods,
      total_profit: acc.total_profit + item.gross_profit,
    }),
    {
      total_quantity: 0,
      total_gross_sales: 0,
      total_net_sales: 0,
      total_cost: 0,
      total_profit: 0,
    }
  );

  return {
    items,
    totals: {
      ...totals,
      total_gross_sales: Math.round(totals.total_gross_sales * 100) / 100,
      total_net_sales: Math.round(totals.total_net_sales * 100) / 100,
      total_cost: Math.round(totals.total_cost * 100) / 100,
      total_profit: Math.round(totals.total_profit * 100) / 100,
      item_count: items.length,
    },
  };
}

// Calculate Sales by Category
async function getSalesByCategory(receipts, products, categories) {
  const filteredReceipts = receipts.filter((r) => r.receiptType !== "REFUND");

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

  // Aggregate sales by category
  const categorySalesMap = new Map();

  filteredReceipts.forEach((receipt) => {
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
      Math.round((cat.gross_sales - cat.discounts - cat.cost_of_goods) * 100) /
      100,
    percentage_of_sales:
      totalRevenue > 0
        ? Math.round((cat.gross_sales / totalRevenue) * 10000) / 100
        : 0,
  }));

  // Sort by gross sales descending
  categoriesList.sort((a, b) => b.gross_sales - a.gross_sales);

  return {
    categories: categoriesList,
    totals: {
      total_categories: categoriesList.length,
      total_gross_sales: Math.round(totalRevenue * 100) / 100,
      total_items_sold: categoriesList.reduce(
        (sum, cat) => sum + cat.quantity_sold,
        0
      ),
    },
  };
}

// Calculate Sales by Employee
async function getSalesByEmployee(receipts, users) {
  // Create user name lookup
  const userNameMap = new Map();
  userNameMap.set("unknown", "Unknown Employee");
  users.forEach((user) => {
    userNameMap.set(user.id, user.name || user.email || "Unknown");
    if (user.email) {
      userNameMap.set(user.email, user.name || user.email);
    }
  });

  // Aggregate sales by employee
  const employeeSalesMap = new Map();

  receipts.forEach((receipt) => {
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

  // Calculate totals
  const totals = employees.reduce(
    (acc, emp) => ({
      total_gross_sales: acc.total_gross_sales + emp.gross_sales,
      total_net_sales: acc.total_net_sales + emp.net_sales,
      total_transactions: acc.total_transactions + emp.transaction_count,
      total_items_sold: acc.total_items_sold + emp.items_sold,
    }),
    {
      total_gross_sales: 0,
      total_net_sales: 0,
      total_transactions: 0,
      total_items_sold: 0,
    }
  );

  return {
    employees,
    totals: {
      ...totals,
      total_gross_sales: Math.round(totals.total_gross_sales * 100) / 100,
      total_net_sales: Math.round(totals.total_net_sales * 100) / 100,
      employee_count: employees.length,
    },
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

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// GET handler - Main API endpoint
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
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
    ];
    if (!action || !validActions.includes(action)) {
      return Response.json(
        {
          success: false,
          error: "Invalid or missing action parameter",
          valid_actions: validActions,
          usage: {
            endpoint: "/api/mobile",
            parameters: {
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
        data = await getSalesByItem(filteredReceipts, products || []);
        data.period = {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString(),
        };
        break;

      case "sales-by-category":
        data = await getSalesByCategory(
          filteredReceipts,
          products || [],
          categories || []
        );
        data.period = {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString(),
        };
        break;

      case "sales-by-employee":
        data = await getSalesByEmployee(filteredReceipts, users || []);
        data.period = {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString(),
        };
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
