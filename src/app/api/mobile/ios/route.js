import { NextResponse } from "next/server";
import { jwtUtils } from "@/lib/jwt";

// ============================================
// TEST DATA - NOT CONNECTED TO FIREBASE
// ============================================

// Mock test data storage (in-memory, resets on server restart)
let testData = {
  products: [
    {
      id: "prod_001",
      name: "Test Product 1",
      description: "Test product description",
      price: 299.99,
      cost: 150.00,
      categoryId: "cat_001",
      categoryName: "Electronics",
      stock: 50,
      trackStock: true,
      lowStockAlert: 10,
      sku: "TEST-001",
      barcode: "1234567890",
      imageUrl: null,
      color: "BLUE",
      isAvailable: true,
      source: "local",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "prod_002",
      name: "Test Product 2",
      description: "Another test product",
      price: 149.99,
      cost: 75.00,
      categoryId: "cat_002",
      categoryName: "Accessories",
      stock: 100,
      trackStock: true,
      lowStockAlert: 20,
      sku: "TEST-002",
      isAvailable: true,
      source: "local",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  categories: [
    {
      id: "cat_001",
      name: "Electronics",
      description: "Electronic devices",
      color: "#3B82F6",
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "cat_002",
      name: "Accessories",
      description: "Product accessories",
      color: "#10B981",
      active: true,
      createdAt: new Date().toISOString(),
    },
  ],
  customers: [
    {
      id: "cust_001",
      name: "John Doe",
      email: "john@example.com",
      phone: "+1234567890",
      address: "123 Test Street",
      notes: "VIP Customer",
      totalSpent: 5000.00,
      orderCount: 15,
      points: 500,
      pointList: [
        {
          id: "pt_001",
          amount: 500,
          reason: "Purchase",
          type: "earned",
          createdAt: new Date().toISOString(),
          createdBy: "admin",
        },
      ],
      source: "local",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "cust_002",
      name: "Jane Smith",
      email: "jane@example.com",
      phone: "+1234567891",
      totalSpent: 3000.00,
      orderCount: 10,
      points: 300,
      pointList: [],
      source: "local",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  receipts: [
    {
      id: "receipt_001",
      receiptNumber: "R-001",
      receiptType: "SALE",
      customerId: "cust_001",
      customerName: "John Doe",
      employeeId: "user_001",
      employeeName: "Admin User",
      lineItems: [
        {
          productId: "prod_001",
          itemName: "Test Product 1",
          quantity: 2,
          price: 299.99,
          discount: 0,
          total: 599.98,
          cost: 300.00,
        },
      ],
      subtotal: 599.98,
      discount: 0,
      tax: 42.00,
      total: 641.98,
      payments: [
        { type: "Cash", name: "Cash", amount: 641.98 },
      ],
      source: "POS",
      receiptDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  ],
  refundRequests: [
    {
      id: "refund_001",
      receiptId: "receipt_001",
      receiptNumber: "R-001",
      amount: 299.99,
      reason: "Customer changed mind",
      requestedBy: "user_002",
      requestedByName: "Cashier User",
      status: "pending",
      createdAt: new Date().toISOString(),
    },
  ],
  paymentChangeRequests: [
    {
      id: "pcr_001",
      receiptId: "receipt_001",
      receiptNumber: "R-001",
      originalPaymentType: "Cash",
      newPaymentType: "Card",
      amount: 641.98,
      reason: "Customer paid with card instead",
      requestedBy: "user_002",
      requestedByName: "Cashier User",
      status: "pending",
      createdAt: new Date().toISOString(),
    },
  ],
  expenses: [
    {
      id: "exp_001",
      category: "Office Supplies",
      amount: 150.50,
      currency: "USD",
      description: "Test office supplies purchase",
      notes: "For testing purposes",
      date: new Date().toISOString().split('T')[0],
      time: "14:30",
      status: "pending",
      source: "BackOffice",
      createdBy: "user_001",
      createdByName: "Admin User",
      createdByRole: "admin",
      createdAt: new Date().toISOString(),
    },
    {
      id: "exp_002",
      category: "Equipment",
      amount: 500.00,
      currency: "USD",
      description: "Test equipment purchase",
      date: new Date().toISOString().split('T')[0],
      time: "10:00",
      status: "approved",
      source: "BackOffice",
      createdBy: "user_002",
      createdByName: "Cashier User",
      createdByRole: "cashier",
      approvedBy: "user_001",
      approvedByName: "Admin User",
      approvedAt: new Date().toISOString(),
      approvalNotes: "Approved for testing",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
  expenseCategories: [
    {
      id: "expcat_001",
      name: "Office Supplies",
      description: "Office equipment and supplies",
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "expcat_002",
      name: "Equipment",
      description: "Business equipment",
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "expcat_003",
      name: "Travel",
      description: "Travel expenses",
      active: true,
      createdAt: new Date().toISOString(),
    },
  ],
  users: [
    {
      id: "user_001",
      email: "admin@test.com",
      name: "Admin User",
      role: "admin",
      permissions: {
        canChangePrice: true,
        canChangeStock: true,
        canAddProduct: true,
        canEditProduct: true,
        canDeleteProduct: true,
        canManageCustomers: true,
        canCreateExpenses: true,
        canApproveExpenses: true,
      },
      pin: "1234",
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "user_002",
      email: "cashier@test.com",
      name: "Cashier User",
      role: "cashier",
      permissions: {
        canChangePrice: false,
        canChangeStock: false,
        canAddProduct: false,
        canEditProduct: false,
        canDeleteProduct: false,
        canManageCustomers: true,
        canCreateExpenses: true,
        canApproveExpenses: false,
      },
      pin: "5678",
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ],
  shifts: [
    {
      id: "shift_001",
      employeeId: "user_002",
      employeeName: "Cashier User",
      status: "completed",
      startTime: new Date(Date.now() - 28800000).toISOString(),
      endTime: new Date().toISOString(),
      startingCash: 500.00,
      closingCash: 1641.98,
      expectedCash: 1641.98,
      cashVariance: 0,
      totalRevenue: 641.98,
      transactionCount: 1,
      notes: "Test shift",
      createdAt: new Date(Date.now() - 28800000).toISOString(),
    },
  ],
  cashbackRules: [
    {
      id: "cbr_001",
      name: "Electronics Cashback",
      type: "category",
      targetId: "cat_001",
      targetName: "Electronics",
      cashbackType: "percentage",
      cashbackValue: 5,
      hasMinimumOrder: true,
      minimumOrderAmount: 100,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ],
  pointUsageRules: {
    pointValue: 1,
    priceWhenUsingPoints: "member",
    earnCashbackWhenUsingPoints: false,
    maxPointUsagePercent: 100,
    minPointsToRedeem: 10,
  },
  purchaseOrders: [
    {
      id: "po_001",
      supplier: "Test Supplier Co.",
      items: [
        {
          productId: "prod_001",
          productName: "Test Product 1",
          quantity: 50,
          costPerUnit: 150.00,
          total: 7500.00,
        },
      ],
      totalCost: 7500.00,
      dueDate: new Date(Date.now() + 604800000).toISOString(),
      status: "pending",
      notes: "Test purchase order",
      createdAt: new Date().toISOString(),
    },
  ],
  stockAdjustments: [
    {
      id: "adj_001",
      productId: "prod_001",
      productName: "Test Product 1",
      type: "add",
      quantity: 10,
      reason: "Restocking",
      performedBy: "user_001",
      performedByName: "Admin User",
      createdAt: new Date().toISOString(),
    },
  ],
  settings: {
    businessName: "Test POS",
    businessAddress: "123 Test St, Test City",
    businessPhone: "+1234567890",
    businessEmail: "test@pos.com",
    baseCurrency: "USD",
    taxRate: 7.0,
    lowStockThreshold: 10,
    autoSyncEnabled: false,
    syncIntervalMinutes: 30,
    theme: {
      mode: "light",
      primaryColor: "#10B981",
      secondaryColor: "#3B82F6",
    },
  },
  exchangeRates: {
    baseCurrency: "USD",
    rates: {
      USD: 1.0,
      EUR: 0.85,
      GBP: 0.73,
      JPY: 110.0,
      THB: 33.0,
    },
    lastUpdated: new Date().toISOString(),
  },
};

// Helper to authenticate requests
async function authenticateRequest(req, requireAdmin = false) {
  const authHeader = req.headers.get("authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authorized: false, error: "Missing or invalid authorization header" };
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwtUtils.decode(token);
    
    if (!decoded || !decoded.userId) {
      return { authorized: false, error: "Invalid token" };
    }

    // Check admin requirement
    if (requireAdmin && decoded.role !== "admin") {
      return { authorized: false, error: "Admin access required" };
    }

    return { authorized: true, user: decoded };
  } catch (error) {
    return { authorized: false, error: "Token validation failed" };
  }
}

// Helper to generate unique IDs
function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// GET HANDLER
// ============================================
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  // Public health check
  if (action === "health") {
    return NextResponse.json({ 
      success: true, 
      message: "iOS API endpoint is working",
      timestamp: new Date().toISOString(),
      dataAvailable: true,
    });
  }

  // Authenticate request (not required for health check)
  const auth = await authenticateRequest(req, false);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
  }

  try {
    switch (action) {
      // ==================== PRODUCTS ====================
      case "get-products": {
        const category = searchParams.get("category");
        const search = searchParams.get("search");
        const availability = searchParams.get("availability");

        let filtered = [...testData.products];

        if (category && category !== "all") {
          filtered = filtered.filter(p => p.categoryId === category);
        }

        if (search) {
          const searchLower = search.toLowerCase();
          filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchLower) ||
            p.description?.toLowerCase().includes(searchLower) ||
            p.sku?.toLowerCase().includes(searchLower)
          );
        }

        if (availability === "available") {
          filtered = filtered.filter(p => p.isAvailable);
        } else if (availability === "unavailable") {
          filtered = filtered.filter(p => !p.isAvailable);
        }

        return NextResponse.json({ success: true, products: filtered });
      }

      case "get-product": {
        const id = searchParams.get("id");
        const product = testData.products.find(p => p.id === id);
        
        if (!product) {
          return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, product });
      }

      // ==================== CATEGORIES ====================
      case "get-categories": {
        return NextResponse.json({ success: true, categories: testData.categories });
      }

      // ==================== CUSTOMERS ====================
      case "get-customers": {
        const search = searchParams.get("search");
        const source = searchParams.get("source");

        let filtered = [...testData.customers];

        if (search) {
          const searchLower = search.toLowerCase();
          filtered = filtered.filter(c =>
            c.name.toLowerCase().includes(searchLower) ||
            c.email?.toLowerCase().includes(searchLower) ||
            c.phone?.includes(search)
          );
        }

        if (source && source !== "all") {
          filtered = filtered.filter(c => c.source === source);
        }

        return NextResponse.json({ success: true, customers: filtered });
      }

      case "get-customer": {
        const id = searchParams.get("id");
        const customer = testData.customers.find(c => c.id === id);
        
        if (!customer) {
          return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, customer });
      }

      case "get-customer-history": {
        const id = searchParams.get("id");
        const customer = testData.customers.find(c => c.id === id);
        
        if (!customer) {
          return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
        }

        const purchases = testData.receipts.filter(r => r.customerId === id);

        return NextResponse.json({ 
          success: true, 
          purchases,
          totalSpent: customer.totalSpent,
          orderCount: customer.orderCount,
        });
      }

      case "get-customer-points": {
        const id = searchParams.get("id");
        const customer = testData.customers.find(c => c.id === id);
        
        if (!customer) {
          return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
        }

        return NextResponse.json({ 
          success: true, 
          points: customer.points,
          pointList: customer.pointList || [],
        });
      }

      // ==================== RECEIPTS/ORDERS ====================
      case "get-receipts": {
        const dateRange = searchParams.get("dateRange");
        const paymentType = searchParams.get("paymentType");
        const minAmount = parseFloat(searchParams.get("minAmount") || "0");
        const maxAmount = parseFloat(searchParams.get("maxAmount") || "999999");

        let filtered = [...testData.receipts];

        // Filter by amount
        filtered = filtered.filter(r => r.total >= minAmount && r.total <= maxAmount);

        // Filter by payment type
        if (paymentType && paymentType !== "all") {
          filtered = filtered.filter(r => 
            r.payments.some(p => p.type === paymentType)
          );
        }

        const totalRevenue = filtered.reduce((sum, r) => sum + r.total, 0);

        return NextResponse.json({ 
          success: true, 
          receipts: filtered,
          totalReceipts: filtered.length,
          totalRevenue,
        });
      }

      case "get-receipt": {
        const id = searchParams.get("id");
        const receipt = testData.receipts.find(r => r.id === id);
        
        if (!receipt) {
          return NextResponse.json({ success: false, error: "Receipt not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, receipt });
      }

      // ==================== EXPENSES ====================
      case "get-expense-categories": {
        return NextResponse.json({ 
          success: true, 
          categories: testData.expenseCategories,
        });
      }

      case "get-expenses": {
        const status = searchParams.get("status");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        let filtered = [...testData.expenses];

        if (status && status !== "all") {
          filtered = filtered.filter(e => e.status === status);
        }

        return NextResponse.json({ success: true, expenses: filtered });
      }

      // ==================== USERS ====================
      case "get-users": {
        // Remove sensitive data
        const safeUsers = testData.users.map(u => {
          const { pin, ...safe } = u;
          return safe;
        });
        return NextResponse.json({ success: true, users: safeUsers });
      }

      // ==================== SHIFTS ====================
      case "get-shifts": {
        const status = searchParams.get("status");
        const employeeId = searchParams.get("employeeId");

        let filtered = [...testData.shifts];

        if (status && status !== "all") {
          filtered = filtered.filter(s => s.status === status);
        }

        if (employeeId && employeeId !== "all") {
          filtered = filtered.filter(s => s.employeeId === employeeId);
        }

        // Calculate statistics
        const statistics = {
          totalShifts: filtered.length,
          activeShifts: filtered.filter(s => s.status === "active").length,
          completedShifts: filtered.filter(s => s.status === "completed").length,
          totalRevenue: filtered.reduce((sum, s) => sum + s.totalRevenue, 0),
          totalTransactions: filtered.reduce((sum, s) => sum + s.transactionCount, 0),
        };

        return NextResponse.json({ success: true, shifts: filtered, statistics });
      }

      case "get-shift-details": {
        const id = searchParams.get("id");
        const shift = testData.shifts.find(s => s.id === id);
        
        if (!shift) {
          return NextResponse.json({ success: false, error: "Shift not found" }, { status: 404 });
        }

        // Get transactions for this shift
        const transactions = testData.receipts.filter(r => r.shiftId === id);

        return NextResponse.json({ 
          success: true, 
          shift,
          transactions,
        });
      }

      // ==================== CASHBACK ====================
      case "get-cashback-rules": {
        return NextResponse.json({ success: true, rules: testData.cashbackRules });
      }

      case "get-point-usage-rules": {
        return NextResponse.json({ success: true, rules: testData.pointUsageRules });
      }

      // ==================== STOCK ====================
      case "get-stock": {
        const lowStockOnly = searchParams.get("lowStockOnly") === "true";
        
        let filtered = [...testData.products];
        
        if (lowStockOnly) {
          filtered = filtered.filter(p => 
            p.trackStock && p.stock <= (p.lowStockAlert || 10)
          );
        }

        return NextResponse.json({ 
          success: true, 
          products: filtered,
          lowStockCount: filtered.filter(p => 
            p.trackStock && p.stock <= (p.lowStockAlert || 10)
          ).length,
        });
      }

      case "get-purchase-orders": {
        return NextResponse.json({ success: true, orders: testData.purchaseOrders });
      }

      case "get-stock-history": {
        const productId = searchParams.get("productId");
        
        let filtered = [...testData.stockAdjustments];
        
        if (productId) {
          filtered = filtered.filter(a => a.productId === productId);
        }

        return NextResponse.json({ success: true, history: filtered });
      }

      // ==================== SETTINGS ====================
      case "get-settings": {
        return NextResponse.json({ success: true, settings: testData.settings });
      }

      case "get-exchange-rates": {
        return NextResponse.json({ success: true, ...testData.exchangeRates });
      }

      // ==================== ANALYTICS ====================
      case "get-dashboard-analytics": {
        const totalRevenue = testData.receipts.reduce((sum, r) => sum + r.total, 0);
        const totalOrders = testData.receipts.length;
        const totalCustomers = testData.customers.length;
        const totalProducts = testData.products.length;

        // Top products
        const productSales = {};
        testData.receipts.forEach(receipt => {
          receipt.lineItems.forEach(item => {
            if (!productSales[item.productId]) {
              productSales[item.productId] = {
                id: item.productId,
                name: item.itemName,
                quantity: 0,
                revenue: 0,
              };
            }
            productSales[item.productId].quantity += item.quantity;
            productSales[item.productId].revenue += item.total;
          });
        });

        const topProducts = Object.values(productSales)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);

        // Top customers
        const customerSpending = testData.customers
          .sort((a, b) => b.totalSpent - a.totalSpent)
          .slice(0, 5);

        return NextResponse.json({
          success: true,
          metrics: {
            totalRevenue,
            totalOrders,
            totalCustomers,
            totalProducts,
            avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
          },
          topProducts,
          topCustomers: customerSpending,
        });
      }

      case "get-sold-items": {
        const productSales = {};
        
        testData.receipts.forEach(receipt => {
          receipt.lineItems.forEach(item => {
            if (!productSales[item.productId]) {
              productSales[item.productId] = {
                id: item.productId,
                name: item.itemName,
                quantity: 0,
                revenue: 0,
              };
            }
            productSales[item.productId].quantity += item.quantity;
            productSales[item.productId].revenue += item.total;
          });
        });

        const soldItems = Object.values(productSales);
        const totalQuantity = soldItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalRevenue = soldItems.reduce((sum, item) => sum + item.revenue, 0);

        return NextResponse.json({
          success: true,
          soldItems,
          totalQuantity,
          totalRevenue,
        });
      }

      case "get-sales-by-employee": {
        const employeeSales = {};
        
        testData.receipts.forEach(receipt => {
          if (!employeeSales[receipt.employeeId]) {
            employeeSales[receipt.employeeId] = {
              employeeId: receipt.employeeId,
              employeeName: receipt.employeeName,
              transactionCount: 0,
              totalRevenue: 0,
              avgOrderValue: 0,
            };
          }
          employeeSales[receipt.employeeId].transactionCount += 1;
          employeeSales[receipt.employeeId].totalRevenue += receipt.total;
        });

        const employeeReport = Object.values(employeeSales).map(emp => ({
          ...emp,
          avgOrderValue: emp.totalRevenue / emp.transactionCount,
        }));

        return NextResponse.json({
          success: true,
          employees: employeeReport,
          totalRevenue: employeeReport.reduce((sum, e) => sum + e.totalRevenue, 0),
        });
      }

      case "get-sales-by-category": {
        const categorySales = {};
        
        testData.receipts.forEach(receipt => {
          receipt.lineItems.forEach(item => {
            const product = testData.products.find(p => p.id === item.productId);
            const categoryId = product?.categoryId || 'uncategorized';
            const categoryName = product?.categoryName || 'Uncategorized';
            
            if (!categorySales[categoryId]) {
              categorySales[categoryId] = {
                categoryId,
                categoryName,
                itemsSold: 0,
                revenue: 0,
              };
            }
            categorySales[categoryId].itemsSold += item.quantity;
            categorySales[categoryId].revenue += item.total;
          });
        });

        const categoryReport = Object.values(categorySales);

        return NextResponse.json({
          success: true,
          categories: categoryReport,
          totalRevenue: categoryReport.reduce((sum, c) => sum + c.revenue, 0),
        });
      }

      case "get-sales-by-payment-method": {
        const paymentSales = {};
        
        testData.receipts.forEach(receipt => {
          receipt.payments.forEach(payment => {
            if (!paymentSales[payment.type]) {
              paymentSales[payment.type] = {
                paymentType: payment.type,
                transactionCount: 0,
                totalAmount: 0,
              };
            }
            paymentSales[payment.type].transactionCount += 1;
            paymentSales[payment.type].totalAmount += payment.amount;
          });
        });

        const paymentReport = Object.values(paymentSales);

        return NextResponse.json({
          success: true,
          paymentMethods: paymentReport,
          totalRevenue: paymentReport.reduce((sum, p) => sum + p.totalAmount, 0),
        });
      }

      case "get-refund-requests": {
        const status = searchParams.get("status");
        
        let filtered = [...testData.refundRequests];
        
        if (status && status !== "all") {
          filtered = filtered.filter(r => r.status === status);
        }

        return NextResponse.json({ success: true, requests: filtered });
      }

      case "get-payment-change-requests": {
        const status = searchParams.get("status");
        
        let filtered = [...testData.paymentChangeRequests];
        
        if (status && status !== "all") {
          filtered = filtered.filter(r => r.status === status);
        }

        return NextResponse.json({ success: true, requests: filtered });
      }

      case "export-data": {
        const type = searchParams.get("type"); // products, customers, receipts, expenses
        const format = searchParams.get("format") || "json"; // json or csv
        
        let data = [];
        let filename = "export";
        
        switch (type) {
          case "products":
            data = testData.products;
            filename = "products_export";
            break;
          case "customers":
            data = testData.customers;
            filename = "customers_export";
            break;
          case "receipts":
            data = testData.receipts;
            filename = "receipts_export";
            break;
          case "expenses":
            data = testData.expenses;
            filename = "expenses_export";
            break;
          default:
            return NextResponse.json({ success: false, error: "Invalid export type" }, { status: 400 });
        }

        if (format === "csv") {
          // Convert to CSV format
          if (data.length === 0) {
            return NextResponse.json({ success: false, error: "No data to export" }, { status: 400 });
          }
          
          const headers = Object.keys(data[0]).filter(key => typeof data[0][key] !== 'object');
          const csvRows = [headers.join(",")];
          
          data.forEach(item => {
            const values = headers.map(header => {
              const value = item[header];
              return typeof value === 'string' ? `"${value}"` : value;
            });
            csvRows.push(values.join(","));
          });
          
          return NextResponse.json({
            success: true,
            data: csvRows.join("\n"),
            filename: `${filename}.csv`,
            format: "csv",
          });
        }

        return NextResponse.json({
          success: true,
          data,
          filename: `${filename}.json`,
          format: "json",
        });
      }

      default:
        return NextResponse.json({ 
          success: false, 
          error: "Unknown action",
          availableActions: [
            "health",
            "get-products", "get-product", "get-categories",
            "get-customers", "get-customer", "get-customer-history", "get-customer-points",
            "get-receipts", "get-receipt",
            "get-expense-categories", "get-expenses",
            "get-users", "get-shifts", "get-shift-details",
            "get-cashback-rules", "get-point-usage-rules",
            "get-stock", "get-purchase-orders", "get-stock-history",
            "get-settings", "get-exchange-rates",
            "get-dashboard-analytics", "get-sold-items",
            "get-sales-by-employee", "get-sales-by-category", "get-sales-by-payment-method",
            "get-refund-requests", "get-payment-change-requests",
            "export-data",
          ],
        }, { status: 400 });
    }
  } catch (error) {
    console.error("iOS API GET Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Internal server error",
    }, { status: 500 });
  }
}

// ============================================
// POST HANDLER
// ============================================
export async function POST(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  // Skip authentication for login endpoint
  let auth = null;
  if (action !== "login") {
    // Authenticate request (require admin for most POST actions)
    const requireAdmin = !["create-expense"].includes(action);
    auth = await authenticateRequest(req, requireAdmin);
    
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }
  }

  try {
    const body = await req.json();

    switch (action) {
      // ==================== AUTH ====================
      case "login": {
        const { email, password, pin } = body;
        
        let user;
        if (email && password) {
          user = testData.users.find(u => u.email === email);
          // For testing, accept any password
        } else if (pin) {
          user = testData.users.find(u => u.pin === pin);
        }

        if (!user) {
          return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
        }

        // Generate JWT token
        const token = jwtUtils.encode({
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        });

        const { pin: _, ...safeUser } = user;

        return NextResponse.json({ 
          success: true, 
          token,
          user: safeUser,
        });
      }

      // ==================== PRODUCTS ====================
      case "create-product": {
        const newProduct = {
          id: generateId("prod"),
          ...body,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        testData.products.push(newProduct);
        return NextResponse.json({ success: true, product: newProduct, productId: newProduct.id });
      }

      case "update-product": {
        const { id, ...updates } = body;
        const index = testData.products.findIndex(p => p.id === id);
        
        if (index === -1) {
          return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
        }

        testData.products[index] = {
          ...testData.products[index],
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        return NextResponse.json({ success: true, product: testData.products[index] });
      }

      case "delete-product": {
        const { id } = body;
        const index = testData.products.findIndex(p => p.id === id);
        
        if (index === -1) {
          return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
        }

        testData.products.splice(index, 1);
        return NextResponse.json({ success: true, message: "Product deleted" });
      }

      // ==================== CATEGORIES ====================
      case "create-category": {
        const newCategory = {
          id: generateId("cat"),
          ...body,
          active: true,
          createdAt: new Date().toISOString(),
        };
        
        testData.categories.push(newCategory);
        return NextResponse.json({ success: true, category: newCategory, categoryId: newCategory.id });
      }

      case "update-category": {
        const { id, ...updates } = body;
        const index = testData.categories.findIndex(c => c.id === id);
        
        if (index === -1) {
          return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
        }

        testData.categories[index] = {
          ...testData.categories[index],
          ...updates,
        };

        return NextResponse.json({ success: true, category: testData.categories[index] });
      }

      case "delete-category": {
        const { id } = body;
        const index = testData.categories.findIndex(c => c.id === id);
        
        if (index === -1) {
          return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
        }

        testData.categories.splice(index, 1);
        return NextResponse.json({ success: true, message: "Category deleted" });
      }

      // ==================== CUSTOMERS ====================
      case "create-customer": {
        const newCustomer = {
          id: generateId("cust"),
          ...body,
          totalSpent: 0,
          orderCount: 0,
          points: 0,
          pointList: [],
          source: "local",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        testData.customers.push(newCustomer);
        return NextResponse.json({ success: true, customer: newCustomer, customerId: newCustomer.id });
      }

      case "update-customer": {
        const { id, ...updates } = body;
        const index = testData.customers.findIndex(c => c.id === id);
        
        if (index === -1) {
          return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
        }

        testData.customers[index] = {
          ...testData.customers[index],
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        return NextResponse.json({ success: true, customer: testData.customers[index] });
      }

      case "delete-customer": {
        const { id } = body;
        const index = testData.customers.findIndex(c => c.id === id);
        
        if (index === -1) {
          return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
        }

        testData.customers.splice(index, 1);
        return NextResponse.json({ success: true, message: "Customer deleted" });
      }

      case "adjust-customer-points": {
        const { id, amount, reason, type } = body;
        const customer = testData.customers.find(c => c.id === id);
        
        if (!customer) {
          return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
        }

        const pointTransaction = {
          id: generateId("pt"),
          amount: type === "reduce" ? -Math.abs(amount) : Math.abs(amount),
          reason,
          type: type === "add" ? "earned" : "redeemed",
          createdAt: new Date().toISOString(),
          createdBy: auth.user.userId,
        };

        customer.pointList.push(pointTransaction);
        customer.points += pointTransaction.amount;

        return NextResponse.json({ 
          success: true, 
          newBalance: customer.points,
          transaction: pointTransaction,
        });
      }

      // ==================== ORDERS/RECEIPTS ====================
      case "create-order": {
        const newReceipt = {
          id: generateId("receipt"),
          receiptNumber: `R-${testData.receipts.length + 1}`.padStart(7, '0'),
          receiptType: "SALE",
          ...body,
          receiptDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        
        testData.receipts.push(newReceipt);

        // Update customer stats if applicable
        if (newReceipt.customerId) {
          const customer = testData.customers.find(c => c.id === newReceipt.customerId);
          if (customer) {
            customer.totalSpent += newReceipt.total;
            customer.orderCount += 1;
          }
        }

        return NextResponse.json({ 
          success: true, 
          receipt: newReceipt, 
          orderId: newReceipt.id,
          receiptId: newReceipt.id,
        });
      }

      // ==================== EXPENSES ====================
      case "create-expense-category": {
        const newCategory = {
          id: generateId("expcat"),
          ...body,
          active: true,
          createdAt: new Date().toISOString(),
        };
        
        testData.expenseCategories.push(newCategory);
        return NextResponse.json({ success: true, category: newCategory, categoryId: newCategory.id });
      }

      case "update-expense-category": {
        const { id, ...updates } = body;
        const index = testData.expenseCategories.findIndex(c => c.id === id);
        
        if (index === -1) {
          return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
        }

        testData.expenseCategories[index] = {
          ...testData.expenseCategories[index],
          ...updates,
        };

        return NextResponse.json({ success: true, category: testData.expenseCategories[index] });
      }

      case "delete-expense-category": {
        const { id } = body;
        const index = testData.expenseCategories.findIndex(c => c.id === id);
        
        if (index === -1) {
          return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
        }

        testData.expenseCategories.splice(index, 1);
        return NextResponse.json({ success: true, message: "Category deleted" });
      }

      case "create-expense": {
        const newExpense = {
          id: generateId("exp"),
          ...body,
          status: body.createdByRole === "admin" && body.source === "BackOffice" ? "approved" : "pending",
          createdBy: auth.user.userId,
          createdByName: auth.user.name,
          createdByRole: auth.user.role,
          createdAt: new Date().toISOString(),
        };

        // Auto-approve if admin
        if (newExpense.status === "approved") {
          newExpense.approvedBy = auth.user.userId;
          newExpense.approvedByName = auth.user.name;
          newExpense.approvedAt = new Date().toISOString();
          newExpense.approvalNotes = "Auto-approved (Admin)";
        }
        
        testData.expenses.push(newExpense);
        return NextResponse.json({ success: true, expense: newExpense });
      }

      case "update-expense": {
        const { id, ...updates } = body;
        const index = testData.expenses.findIndex(e => e.id === id);
        
        if (index === -1) {
          return NextResponse.json({ success: false, error: "Expense not found" }, { status: 404 });
        }

        testData.expenses[index] = {
          ...testData.expenses[index],
          ...updates,
        };

        return NextResponse.json({ success: true, expense: testData.expenses[index] });
      }

      case "delete-expense": {
        const { id } = body;
        const index = testData.expenses.findIndex(e => e.id === id);
        
        if (index === -1) {
          return NextResponse.json({ success: false, error: "Expense not found" }, { status: 404 });
        }

        testData.expenses.splice(index, 1);
        return NextResponse.json({ success: true, message: "Expense deleted" });
      }

      case "approve-expense": {
        const { id, approvalNotes } = body;
        const expense = testData.expenses.find(e => e.id === id);
        
        if (!expense) {
          return NextResponse.json({ success: false, error: "Expense not found" }, { status: 404 });
        }

        expense.status = "approved";
        expense.approvedBy = auth.user.userId;
        expense.approvedByName = auth.user.name;
        expense.approvedAt = new Date().toISOString();
        expense.approvalNotes = approvalNotes;

        return NextResponse.json({ success: true, expense });
      }

      case "deny-expense": {
        const { id, approvalNotes } = body;
        const expense = testData.expenses.find(e => e.id === id);
        
        if (!expense) {
          return NextResponse.json({ success: false, error: "Expense not found" }, { status: 404 });
        }

        expense.status = "denied";
        expense.approvedBy = auth.user.userId;
        expense.approvedByName = auth.user.name;
        expense.approvedAt = new Date().toISOString();
        expense.approvalNotes = approvalNotes;

        return NextResponse.json({ success: true, expense });
      }

      // ==================== SHIFTS ====================
      case "open-shift": {
        const newShift = {
          id: generateId("shift"),
          employeeId: body.employeeId || auth.user.userId,
          employeeName: body.employeeName || auth.user.name,
          status: "active",
          startTime: new Date().toISOString(),
          startingCash: body.startingCash || 0,
          totalRevenue: 0,
          transactionCount: 0,
          createdAt: new Date().toISOString(),
        };
        
        testData.shifts.push(newShift);
        return NextResponse.json({ success: true, shift: newShift, shiftId: newShift.id });
      }

      case "close-shift": {
        const { id, closingCash, notes } = body;
        const shift = testData.shifts.find(s => s.id === id);
        
        if (!shift) {
          return NextResponse.json({ success: false, error: "Shift not found" }, { status: 404 });
        }

        shift.status = "completed";
        shift.endTime = new Date().toISOString();
        shift.closingCash = closingCash;
        shift.notes = notes;
        shift.expectedCash = shift.startingCash + shift.totalRevenue;
        shift.cashVariance = closingCash - shift.expectedCash;

        return NextResponse.json({ 
          success: true, 
          shift,
          variance: shift.cashVariance,
        });
      }

      // ==================== CASHBACK ====================
      case "create-cashback-rule": {
        const newRule = {
          id: generateId("cbr"),
          ...body,
          createdAt: new Date().toISOString(),
        };
        
        testData.cashbackRules.push(newRule);
        return NextResponse.json({ success: true, rule: newRule, ruleId: newRule.id });
      }

      case "update-cashback-rule": {
        const { id, ...updates } = body;
        const index = testData.cashbackRules.findIndex(r => r.id === id);
        
        if (index === -1) {
          return NextResponse.json({ success: false, error: "Rule not found" }, { status: 404 });
        }

        testData.cashbackRules[index] = {
          ...testData.cashbackRules[index],
          ...updates,
        };

        return NextResponse.json({ success: true, rule: testData.cashbackRules[index] });
      }

      case "delete-cashback-rule": {
        const { id } = body;
        const index = testData.cashbackRules.findIndex(r => r.id === id);
        
        if (index === -1) {
          return NextResponse.json({ success: false, error: "Rule not found" }, { status: 404 });
        }

        testData.cashbackRules.splice(index, 1);
        return NextResponse.json({ success: true, message: "Rule deleted" });
      }

      case "update-point-usage-rules": {
        testData.pointUsageRules = {
          ...testData.pointUsageRules,
          ...body,
        };

        return NextResponse.json({ success: true, rules: testData.pointUsageRules });
      }

      // ==================== STOCK ====================
      case "adjust-stock": {
        const { productId, quantity, reason, type } = body;
        const product = testData.products.find(p => p.id === productId);
        
        if (!product) {
          return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
        }

        const adjustment = {
          id: generateId("adj"),
          productId,
          productName: product.name,
          type,
          quantity: Math.abs(quantity),
          reason,
          performedBy: auth.user.userId,
          performedByName: auth.user.name,
          createdAt: new Date().toISOString(),
        };

        testData.stockAdjustments.push(adjustment);

        // Update product stock
        if (type === "add") {
          product.stock += Math.abs(quantity);
        } else {
          product.stock -= Math.abs(quantity);
        }

        return NextResponse.json({ 
          success: true, 
          newStock: product.stock,
          adjustment,
        });
      }

      case "create-purchase-order": {
        const newPO = {
          id: generateId("po"),
          ...body,
          status: "pending",
          createdAt: new Date().toISOString(),
        };
        
        testData.purchaseOrders.push(newPO);
        return NextResponse.json({ success: true, order: newPO, orderId: newPO.id });
      }

      case "update-purchase-order": {
        const { id, ...updates } = body;
        const index = testData.purchaseOrders.findIndex(po => po.id === id);
        
        if (index === -1) {
          return NextResponse.json({ success: false, error: "Purchase order not found" }, { status: 404 });
        }

        testData.purchaseOrders[index] = {
          ...testData.purchaseOrders[index],
          ...updates,
        };

        // If completing PO, update stock
        if (updates.status === "completed") {
          testData.purchaseOrders[index].completedAt = new Date().toISOString();
          
          testData.purchaseOrders[index].items.forEach(item => {
            const product = testData.products.find(p => p.id === item.productId);
            if (product) {
              product.stock += item.quantity;
            }
          });
        }

        return NextResponse.json({ success: true, order: testData.purchaseOrders[index] });
      }

      case "delete-purchase-order": {
        const { id } = body;
        const index = testData.purchaseOrders.findIndex(po => po.id === id);
        
        if (index === -1) {
          return NextResponse.json({ success: false, error: "Purchase order not found" }, { status: 404 });
        }

        testData.purchaseOrders.splice(index, 1);
        return NextResponse.json({ success: true, message: "Purchase order deleted" });
      }

      // ==================== SETTINGS ====================
      case "update-settings": {
        testData.settings = {
          ...testData.settings,
          ...body,
        };

        return NextResponse.json({ success: true, settings: testData.settings });
      }

      case "update-exchange-rates": {
        testData.exchangeRates = {
          ...testData.exchangeRates,
          ...body,
          lastUpdated: new Date().toISOString(),
        };

        return NextResponse.json({ success: true, rates: testData.exchangeRates });
      }

      case "refresh-exchange-rates": {
        // Simulate rate refresh with small random changes
        const rates = { ...testData.exchangeRates.rates };
        Object.keys(rates).forEach(currency => {
          if (currency !== testData.exchangeRates.baseCurrency) {
            const change = (Math.random() - 0.5) * 0.02; // ±1% change
            rates[currency] = rates[currency] * (1 + change);
          }
        });

        testData.exchangeRates = {
          ...testData.exchangeRates,
          rates,
          lastUpdated: new Date().toISOString(),
        };

        return NextResponse.json({ 
          success: true, 
          rates: testData.exchangeRates,
          lastUpdated: testData.exchangeRates.lastUpdated,
        });
      }

      // ==================== USERS ====================
      case "create-user": {
        const newUser = {
          id: generateId("user"),
          ...body,
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        
        testData.users.push(newUser);
        
        const { pin, ...safeUser } = newUser;
        return NextResponse.json({ success: true, user: safeUser, userId: newUser.id });
      }

      case "update-user": {
        const { id, ...updates } = body;
        const index = testData.users.findIndex(u => u.id === id);
        
        if (index === -1) {
          return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        testData.users[index] = {
          ...testData.users[index],
          ...updates,
        };

        const { pin, ...safeUser } = testData.users[index];
        return NextResponse.json({ success: true, user: safeUser });
      }

      case "delete-user": {
        const { id } = body;
        const index = testData.users.findIndex(u => u.id === id);
        
        if (index === -1) {
          return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        testData.users.splice(index, 1);
        return NextResponse.json({ success: true, message: "User deleted" });
      }

      case "reset-user-password": {
        const { id, newPassword } = body;
        const user = testData.users.find(u => u.id === id);
        
        if (!user) {
          return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        // In test mode, just acknowledge the password reset
        return NextResponse.json({ success: true, message: "Password reset successful" });
      }

      // ==================== REFUND REQUESTS ====================
      case "create-refund-request": {
        const { receiptId, amount, reason } = body;
        const receipt = testData.receipts.find(r => r.id === receiptId);
        
        if (!receipt) {
          return NextResponse.json({ success: false, error: "Receipt not found" }, { status: 404 });
        }

        const newRequest = {
          id: generateId("refund"),
          receiptId,
          receiptNumber: receipt.receiptNumber,
          amount,
          reason,
          requestedBy: auth.user.userId,
          requestedByName: auth.user.name,
          status: "pending",
          createdAt: new Date().toISOString(),
        };
        
        testData.refundRequests.push(newRequest);
        return NextResponse.json({ success: true, request: newRequest });
      }

      case "approve-refund": {
        const { id, approvalNotes } = body;
        const request = testData.refundRequests.find(r => r.id === id);
        
        if (!request) {
          return NextResponse.json({ success: false, error: "Refund request not found" }, { status: 404 });
        }

        request.status = "approved";
        request.approvedBy = auth.user.userId;
        request.approvedByName = auth.user.name;
        request.approvedAt = new Date().toISOString();
        request.approvalNotes = approvalNotes;

        // Create refund receipt
        const originalReceipt = testData.receipts.find(r => r.id === request.receiptId);
        if (originalReceipt) {
          const refundReceipt = {
            id: generateId("receipt"),
            receiptNumber: `R-REFUND-${testData.receipts.length + 1}`,
            receiptType: "REFUND",
            originalReceiptId: request.receiptId,
            originalReceiptNumber: request.receiptNumber,
            customerId: originalReceipt.customerId,
            customerName: originalReceipt.customerName,
            employeeId: auth.user.userId,
            employeeName: auth.user.name,
            lineItems: originalReceipt.lineItems,
            subtotal: -request.amount,
            discount: 0,
            tax: 0,
            total: -request.amount,
            payments: [{ type: "Refund", name: "Refund", amount: request.amount }],
            source: "BackOffice",
            receiptDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          };
          testData.receipts.push(refundReceipt);
        }

        return NextResponse.json({ success: true, request });
      }

      case "deny-refund": {
        const { id, approvalNotes } = body;
        const request = testData.refundRequests.find(r => r.id === id);
        
        if (!request) {
          return NextResponse.json({ success: false, error: "Refund request not found" }, { status: 404 });
        }

        request.status = "denied";
        request.approvedBy = auth.user.userId;
        request.approvedByName = auth.user.name;
        request.approvedAt = new Date().toISOString();
        request.approvalNotes = approvalNotes;

        return NextResponse.json({ success: true, request });
      }

      // ==================== PAYMENT CHANGE REQUESTS ====================
      case "create-payment-change-request": {
        const { receiptId, originalPaymentType, newPaymentType, amount, reason } = body;
        const receipt = testData.receipts.find(r => r.id === receiptId);
        
        if (!receipt) {
          return NextResponse.json({ success: false, error: "Receipt not found" }, { status: 404 });
        }

        const newRequest = {
          id: generateId("pcr"),
          receiptId,
          receiptNumber: receipt.receiptNumber,
          originalPaymentType,
          newPaymentType,
          amount,
          reason,
          requestedBy: auth.user.userId,
          requestedByName: auth.user.name,
          status: "pending",
          createdAt: new Date().toISOString(),
        };
        
        testData.paymentChangeRequests.push(newRequest);
        return NextResponse.json({ success: true, request: newRequest });
      }

      case "approve-payment-change": {
        const { id, approvalNotes } = body;
        const request = testData.paymentChangeRequests.find(r => r.id === id);
        
        if (!request) {
          return NextResponse.json({ success: false, error: "Payment change request not found" }, { status: 404 });
        }

        request.status = "approved";
        request.approvedBy = auth.user.userId;
        request.approvedByName = auth.user.name;
        request.approvedAt = new Date().toISOString();
        request.approvalNotes = approvalNotes;

        // Update receipt payment type
        const receipt = testData.receipts.find(r => r.id === request.receiptId);
        if (receipt) {
          receipt.payments = receipt.payments.map(p => 
            p.type === request.originalPaymentType 
              ? { ...p, type: request.newPaymentType, name: request.newPaymentType }
              : p
          );
        }

        return NextResponse.json({ success: true, request });
      }

      case "deny-payment-change": {
        const { id, approvalNotes } = body;
        const request = testData.paymentChangeRequests.find(r => r.id === id);
        
        if (!request) {
          return NextResponse.json({ success: false, error: "Payment change request not found" }, { status: 404 });
        }

        request.status = "denied";
        request.approvedBy = auth.user.userId;
        request.approvedByName = auth.user.name;
        request.approvedAt = new Date().toISOString();
        request.approvalNotes = approvalNotes;

        return NextResponse.json({ success: true, request });
      }

      // ==================== RESET TEST DATA ====================
      case "reset-test-data": {
        // Only allow admin to reset
        if (auth.user.role !== "admin") {
          return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
        }

        // Reset to initial test data (you can expand this)
        testData = {
          ...testData,
          // Keep structure but could reset specific collections
        };

        return NextResponse.json({ 
          success: true, 
          message: "Test data reset successfully",
        });
      }

      default:
        return NextResponse.json({ 
          success: false, 
          error: "Unknown action",
          availableActions: [
            "login",
            "create-product", "update-product", "delete-product",
            "create-category", "update-category", "delete-category",
            "create-customer", "update-customer", "delete-customer", "adjust-customer-points",
            "create-order",
            "create-expense-category", "update-expense-category", "delete-expense-category",
            "create-expense", "update-expense", "delete-expense", "approve-expense", "deny-expense",
            "open-shift", "close-shift",
            "create-cashback-rule", "update-cashback-rule", "delete-cashback-rule", "update-point-usage-rules",
            "adjust-stock", "create-purchase-order", "update-purchase-order", "delete-purchase-order",
            "update-settings", "update-exchange-rates", "refresh-exchange-rates",
            "create-user", "update-user", "delete-user", "reset-user-password",
            "create-refund-request", "approve-refund", "deny-refund",
            "create-payment-change-request", "approve-payment-change", "deny-payment-change",
            "reset-test-data",
          ],
        }, { status: 400 });
    }
  } catch (error) {
    console.error("iOS API POST Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Internal server error",
    }, { status: 500 });
  }
}

// ============================================
// PUT HANDLER (Alternative to POST for updates)
// ============================================
export async function PUT(req) {
  // Redirect to POST handler
  return POST(req);
}

// ============================================
// DELETE HANDLER
// ============================================
export async function DELETE(req) {
  // Redirect to POST handler
  return POST(req);
}
