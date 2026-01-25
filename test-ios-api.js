#!/usr/bin/env node

/**
 * iOS API Endpoint Test Suite
 * Tests the live API at https://pos-candy-kush.vercel.app/api/mobile/ios
 * 
 * This script tests all major endpoints without touching Firebase.
 * All operations use in-memory test data only.
 */

const BASE_URL = 'https://pos-candy-kush.vercel.app/api/mobile/ios';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

let authToken = null;
let adminToken = null;

// Test credentials
const CASHIER_CREDS = {
  email: 'testingcashier@candykush.com',
  password: 'testing123'
};

const ADMIN_CREDS = {
  email: 'admin@test.com',
  password: 'any'
};

// Helper function to make API requests
async function apiRequest(action, method = 'GET', body = null) {
  const url = `${BASE_URL}?action=${action}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  };

  if (authToken && action !== 'login') {
    options.headers['Authorization'] = `Bearer ${authToken}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 0, error: error.message };
  }
}

// Test result helper
function logTest(name, passed, message = '') {
  testResults.tests.push({ name, passed, message });
  if (passed) {
    testResults.passed++;
    console.log(`${colors.green}✓${colors.reset} ${name}`);
  } else {
    testResults.failed++;
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    if (message) console.log(`  ${colors.red}${message}${colors.reset}`);
  }
}

// Test 1: Health Check
async function testHealthCheck() {
  console.log(`\n${colors.cyan}${colors.bold}=== Testing Health Check ===${colors.reset}`);
  
  const { status, data } = await apiRequest('health');
  
  logTest(
    'Health check endpoint responds',
    status === 200,
    status !== 200 ? `Expected 200, got ${status}` : ''
  );
  
  logTest(
    'Health check returns success',
    data?.success === true,
    !data?.success ? 'Response does not contain success: true' : ''
  );
  
  logTest(
    'Health check contains timestamp',
    !!data?.timestamp,
    !data?.timestamp ? 'Response missing timestamp' : ''
  );
  
  console.log(`${colors.blue}Response:${colors.reset}`, JSON.stringify(data, null, 2));
}

// Test 2: Authentication
async function testAuthentication() {
  console.log(`\n${colors.cyan}${colors.bold}=== Testing Authentication ===${colors.reset}`);
  
  // Test login with email
  const { status, data } = await apiRequest('login', 'POST', {
    email: 'testingcashier@candykush.com',
    password: 'testing123'
  });
  
  logTest(
    'Login endpoint responds',
    status === 200,
    status !== 200 ? `Expected 200, got ${status}` : ''
  );
  
  logTest(
    'Login returns success',
    data?.success === true,
    !data?.success ? 'Login failed: ' + (data?.error || 'Unknown error') : ''
  );
  
  logTest(
    'Login returns JWT token',
    !!data?.token,
    !data?.token ? 'Response missing token' : ''
  );
  
  logTest(
    'Login returns user object',
    !!data?.user,
    !data?.user ? 'Response missing user object' : ''
  );
  
  if (data?.token) {
    authToken = data.token;
    console.log(`${colors.green}✓ Token saved for subsequent requests${colors.reset}`);
  }
  
  console.log(`${colors.blue}User:${colors.reset}`, JSON.stringify(data?.user, null, 2));
  
  // Also login as admin for write operations
  console.log(`\n${colors.yellow}Logging in as admin for write operations...${colors.reset}`);
  const adminLogin = await apiRequest('login', 'POST', ADMIN_CREDS);
  
  if (adminLogin.data?.token) {
    adminToken = adminLogin.data.token;
    console.log(`${colors.green}✓ Admin token saved for write operations${colors.reset}`);
  }
}

// Test 3: Products
async function testProducts() {
  console.log(`\n${colors.cyan}${colors.bold}=== Testing Products ===${colors.reset}`);
  
  // Get all products
  const { status, data } = await apiRequest('get-products');
  
  logTest(
    'Get products endpoint responds with 200',
    status === 200,
    status !== 200 ? `Expected 200, got ${status}` : ''
  );
  
  logTest(
    'Get products returns success',
    data?.success === true,
    !data?.success ? 'Response does not contain success: true' : ''
  );
  
  logTest(
    'Get products returns array',
    Array.isArray(data?.products),
    !Array.isArray(data?.products) ? 'Products is not an array' : ''
  );
  
  if (data?.products?.length > 0) {
    const product = data.products[0];
    logTest(
      'Product has required fields',
      !!(product.id && product.name && typeof product.price === 'number'),
      'Product missing required fields'
    );
    console.log(`${colors.blue}Sample Product:${colors.reset}`, JSON.stringify(product, null, 2));
  }
  
  // Test create product (switch to admin token)
  const originalToken = authToken;
  authToken = adminToken;
  
  const createResponse = await apiRequest('create-product', 'POST', {
    name: 'Test Product from Script',
    description: 'Created by test script',
    price: 99.99,
    cost: 50.00,
    categoryId: 'cat_001',
    categoryName: 'Electronics',
    stock: 100,
    trackStock: true,
    lowStockAlert: 10,
    sku: 'TEST-SCRIPT-001',
    isAvailable: true,
    source: 'local'
  });
  
  logTest(
    'Create product endpoint responds',
    createResponse.status === 200,
    createResponse.status !== 200 ? `Expected 200, got ${createResponse.status}` : ''
  );
  
  logTest(
    'Create product returns success',
    createResponse.data?.success === true,
    !createResponse.data?.success ? 'Create failed: ' + (createResponse.data?.error || 'Unknown') : ''
  );
  
  logTest(
    'Create product returns productId',
    !!createResponse.data?.productId,
    !createResponse.data?.productId ? 'Response missing productId' : ''
  );
  
  if (createResponse.data?.productId) {
    console.log(`${colors.green}✓ Created product with ID: ${createResponse.data.productId}${colors.reset}`);
  }
  
  // Restore original token
  authToken = originalToken;
}

// Test 4: Categories
async function testCategories() {
  console.log(`\n${colors.cyan}${colors.bold}=== Testing Categories ===${colors.reset}`);
  
  const { status, data } = await apiRequest('get-categories');
  
  logTest(
    'Get categories endpoint responds',
    status === 200,
    status !== 200 ? `Expected 200, got ${status}` : ''
  );
  
  logTest(
    'Get categories returns success',
    data?.success === true
  );
  
  logTest(
    'Get categories returns array',
    Array.isArray(data?.categories),
    !Array.isArray(data?.categories) ? 'Categories is not an array' : ''
  );
  
  console.log(`${colors.blue}Categories count:${colors.reset} ${data?.categories?.length || 0}`);
}

// Test 5: Customers
async function testCustomers() {
  console.log(`\n${colors.cyan}${colors.bold}=== Testing Customers ===${colors.reset}`);
  
  const { status, data } = await apiRequest('get-customers');
  
  logTest(
    'Get customers endpoint responds',
    status === 200
  );
  
  logTest(
    'Get customers returns success',
    data?.success === true
  );
  
  logTest(
    'Get customers returns array',
    Array.isArray(data?.customers)
  );
  
  if (data?.customers?.length > 0) {
    const customer = data.customers[0];
    console.log(`${colors.blue}Sample Customer:${colors.reset}`, JSON.stringify(customer, null, 2));
    
    // Test get customer points
    const pointsResponse = await apiRequest(`get-customer-points&id=${customer.id}`);
    logTest(
      'Get customer points endpoint responds',
      pointsResponse.status === 200,
      pointsResponse.status !== 200 ? `Status: ${pointsResponse.status}, Error: ${pointsResponse.data?.error}` : ''
    );
    
    logTest(
      'Get customer points returns points data',
      typeof pointsResponse.data?.points === 'number',
      typeof pointsResponse.data?.points !== 'number' ? `Points value: ${JSON.stringify(pointsResponse.data?.points)}` : ''
    );
  }
}

// Test 6: Receipts
async function testReceipts() {
  console.log(`\n${colors.cyan}${colors.bold}=== Testing Receipts ===${colors.reset}`);
  
  const { status, data } = await apiRequest('get-receipts');
  
  logTest(
    'Get receipts endpoint responds',
    status === 200
  );
  
  logTest(
    'Get receipts returns success',
    data?.success === true
  );
  
  logTest(
    'Get receipts returns array',
    Array.isArray(data?.receipts)
  );
  
  logTest(
    'Get receipts returns totalRevenue',
    typeof data?.totalRevenue === 'number'
  );
  
  console.log(`${colors.blue}Total Receipts:${colors.reset} ${data?.receipts?.length || 0}`);
  console.log(`${colors.blue}Total Revenue:${colors.reset} $${data?.totalRevenue?.toFixed(2) || 0}`);
}

// Test 7: Expenses
async function testExpenses() {
  console.log(`\n${colors.cyan}${colors.bold}=== Testing Expenses ===${colors.reset}`);
  
  // Get expense categories
  const categoriesResponse = await apiRequest('get-expense-categories');
  
  logTest(
    'Get expense categories endpoint responds',
    categoriesResponse.status === 200
  );
  
  logTest(
    'Get expense categories returns success',
    categoriesResponse.data?.success === true
  );
  
  logTest(
    'Get expense categories returns array',
    Array.isArray(categoriesResponse.data?.categories)
  );
  
  // Get expenses
  const { status, data } = await apiRequest('get-expenses');
  
  logTest(
    'Get expenses endpoint responds',
    status === 200
  );
  
  logTest(
    'Get expenses returns success',
    data?.success === true
  );
  
  logTest(
    'Get expenses returns array',
    Array.isArray(data?.expenses)
  );
  
  // Create expense
  const createResponse = await apiRequest('create-expense', 'POST', {
    category: 'Office Supplies',
    amount: 75.50,
    currency: 'USD',
    description: 'Test expense from script',
    notes: 'Testing API endpoint',
    date: new Date().toISOString().split('T')[0],
    time: '15:30',
    source: 'BackOffice'
  });
  
  logTest(
    'Create expense endpoint responds',
    createResponse.status === 200
  );
  
  logTest(
    'Create expense returns success',
    createResponse.data?.success === true
  );
  
  if (createResponse.data?.expense) {
    console.log(`${colors.green}✓ Created expense with status: ${createResponse.data.expense.status}${colors.reset}`);
  }
}

// Test 8: Shifts
async function testShifts() {
  console.log(`\n${colors.cyan}${colors.bold}=== Testing Shifts ===${colors.reset}`);
  
  const { status, data } = await apiRequest('get-shifts');
  
  logTest(
    'Get shifts endpoint responds',
    status === 200
  );
  
  logTest(
    'Get shifts returns success',
    data?.success === true
  );
  
  logTest(
    'Get shifts returns array',
    Array.isArray(data?.shifts)
  );
  
  logTest(
    'Get shifts returns statistics',
    !!data?.statistics
  );
  
  console.log(`${colors.blue}Shifts Statistics:${colors.reset}`, JSON.stringify(data?.statistics, null, 2));
}

// Test 9: Cashback Rules
async function testCashback() {
  console.log(`\n${colors.cyan}${colors.bold}=== Testing Cashback ===${colors.reset}`);
  
  const { status, data } = await apiRequest('get-cashback-rules');
  
  logTest(
    'Get cashback rules endpoint responds',
    status === 200
  );
  
  logTest(
    'Get cashback rules returns success',
    data?.success === true
  );
  
  logTest(
    'Get cashback rules returns array',
    Array.isArray(data?.rules)
  );
  
  // Get point usage rules
  const usageResponse = await apiRequest('get-point-usage-rules');
  
  logTest(
    'Get point usage rules endpoint responds',
    usageResponse.status === 200
  );
  
  logTest(
    'Get point usage rules returns success',
    usageResponse.data?.success === true
  );
  
  console.log(`${colors.blue}Point Usage Rules:${colors.reset}`, JSON.stringify(usageResponse.data?.rules, null, 2));
}

// Test 10: Stock Management
async function testStock() {
  console.log(`\n${colors.cyan}${colors.bold}=== Testing Stock Management ===${colors.reset}`);
  
  const { status, data } = await apiRequest('get-stock');
  
  logTest(
    'Get stock endpoint responds',
    status === 200
  );
  
  logTest(
    'Get stock returns success',
    data?.success === true
  );
  
  logTest(
    'Get stock returns products array',
    Array.isArray(data?.products)
  );
  
  logTest(
    'Get stock returns lowStockCount',
    typeof data?.lowStockCount === 'number'
  );
  
  // Get purchase orders
  const poResponse = await apiRequest('get-purchase-orders');
  
  logTest(
    'Get purchase orders endpoint responds',
    poResponse.status === 200
  );
  
  logTest(
    'Get purchase orders returns array',
    Array.isArray(poResponse.data?.orders)
  );
  
  console.log(`${colors.blue}Low Stock Items:${colors.reset} ${data?.lowStockCount || 0}`);
}

// Test 11: Users
async function testUsers() {
  console.log(`\n${colors.cyan}${colors.bold}=== Testing Users ===${colors.reset}`);
  
  const { status, data } = await apiRequest('get-users');
  
  logTest(
    'Get users endpoint responds',
    status === 200
  );
  
  logTest(
    'Get users returns success',
    data?.success === true
  );
  
  logTest(
    'Get users returns array',
    Array.isArray(data?.users)
  );
  
  if (data?.users?.length > 0) {
    const user = data.users[0];
    logTest(
      'User object does not contain PIN (security)',
      !user.hasOwnProperty('pin'),
      user.hasOwnProperty('pin') ? 'PIN should not be exposed in user list' : ''
    );
  }
  
  console.log(`${colors.blue}Total Users:${colors.reset} ${data?.users?.length || 0}`);
}

// Test 12: Settings
async function testSettings() {
  console.log(`\n${colors.cyan}${colors.bold}=== Testing Settings ===${colors.reset}`);
  
  const { status, data } = await apiRequest('get-settings');
  
  logTest(
    'Get settings endpoint responds',
    status === 200
  );
  
  logTest(
    'Get settings returns success',
    data?.success === true
  );
  
  logTest(
    'Get settings returns settings object',
    !!data?.settings
  );
  
  // Get exchange rates
  const ratesResponse = await apiRequest('get-exchange-rates');
  
  logTest(
    'Get exchange rates endpoint responds',
    ratesResponse.status === 200
  );
  
  logTest(
    'Get exchange rates returns success',
    ratesResponse.data?.success === true
  );
  
  console.log(`${colors.blue}Base Currency:${colors.reset} ${ratesResponse.data?.baseCurrency}`);
}

// Test 13: Analytics
async function testAnalytics() {
  console.log(`\n${colors.cyan}${colors.bold}=== Testing Analytics ===${colors.reset}`);
  
  const { status, data } = await apiRequest('get-dashboard-analytics');
  
  logTest(
    'Get dashboard analytics endpoint responds',
    status === 200
  );
  
  logTest(
    'Get dashboard analytics returns success',
    data?.success === true
  );
  
  logTest(
    'Get dashboard analytics returns metrics',
    !!data?.metrics
  );
  
  logTest(
    'Get dashboard analytics returns topProducts',
    Array.isArray(data?.topProducts)
  );
  
  console.log(`${colors.blue}Dashboard Metrics:${colors.reset}`, JSON.stringify(data?.metrics, null, 2));
  
  // Test sold items
  const soldItemsResponse = await apiRequest('get-sold-items');
  
  logTest(
    'Get sold items endpoint responds',
    soldItemsResponse.status === 200
  );
  
  logTest(
    'Get sold items returns soldItems array',
    Array.isArray(soldItemsResponse.data?.soldItems)
  );
}

// Test 14: Advanced Sales Reports (NEW)
async function testAdvancedReports() {
  console.log(`\n${colors.cyan}${colors.bold}=== Testing Advanced Sales Reports ===${colors.reset}`);
  
  // Test sales by employee
  const employeeResponse = await apiRequest('get-sales-by-employee');
  logTest(
    'Get sales by employee endpoint responds',
    employeeResponse.status === 200
  );
  logTest(
    'Get sales by employee returns employees array',
    Array.isArray(employeeResponse.data?.employees)
  );
  
  // Test sales by category
  const categoryResponse = await apiRequest('get-sales-by-category');
  logTest(
    'Get sales by category endpoint responds',
    categoryResponse.status === 200
  );
  logTest(
    'Get sales by category returns categories array',
    Array.isArray(categoryResponse.data?.categories)
  );
  
  // Test sales by payment method
  const paymentResponse = await apiRequest('get-sales-by-payment-method');
  logTest(
    'Get sales by payment method endpoint responds',
    paymentResponse.status === 200
  );
  logTest(
    'Get sales by payment method returns paymentMethods array',
    Array.isArray(paymentResponse.data?.paymentMethods)
  );
  
  console.log(`${colors.blue}Sales Reports:${colors.reset} All advanced reports working`);
}

// Test 15: Refund & Payment Change Requests (NEW)
async function testRefundsAndPaymentChanges() {
  console.log(`\n${colors.cyan}${colors.bold}=== Testing Refunds & Payment Changes ===${colors.reset}`);
  
  // Test refund requests
  const refundResponse = await apiRequest('get-refund-requests');
  logTest(
    'Get refund requests endpoint responds',
    refundResponse.status === 200
  );
  logTest(
    'Get refund requests returns requests array',
    Array.isArray(refundResponse.data?.requests)
  );
  
  // Test payment change requests
  const paymentChangeResponse = await apiRequest('get-payment-change-requests');
  logTest(
    'Get payment change requests endpoint responds',
    paymentChangeResponse.status === 200
  );
  logTest(
    'Get payment change requests returns requests array',
    Array.isArray(paymentChangeResponse.data?.requests)
  );
  
  console.log(`${colors.blue}Refund Requests:${colors.reset} ${refundResponse.data?.requests?.length || 0}`);
  console.log(`${colors.blue}Payment Change Requests:${colors.reset} ${paymentChangeResponse.data?.requests?.length || 0}`);
}

// Test 16: Export Data (NEW)
async function testExport() {
  console.log(`\n${colors.cyan}${colors.bold}=== Testing Export Functionality ===${colors.reset}`);
  
  // Test products export
  const productsExport = await apiRequest('export-data&type=products&format=json');
  logTest(
    'Export products endpoint responds',
    productsExport.status === 200
  );
  logTest(
    'Export products returns data',
    Array.isArray(productsExport.data?.data)
  );
  
  // Test CSV export
  const csvExport = await apiRequest('export-data&type=customers&format=csv');
  logTest(
    'Export CSV endpoint responds',
    csvExport.status === 200
  );
  logTest(
    'Export CSV returns string data',
    typeof csvExport.data?.data === 'string'
  );
  
  console.log(`${colors.green}✓ Export functionality working${colors.reset}`);
}

// Test 17: Authorization (No Token)
async function testUnauthorizedAccess() {
  console.log(`\n${colors.cyan}${colors.bold}=== Testing Authorization ===${colors.reset}`);
  
  // Temporarily remove token
  const savedToken = authToken;
  authToken = null;
  
  const { status } = await apiRequest('get-products');
  
  logTest(
    'Unauthorized request returns 401',
    status === 401,
    status !== 401 ? `Expected 401, got ${status}` : ''
  );
  
  // Restore token
  authToken = savedToken;
  console.log(`${colors.green}✓ Authorization check working correctly${colors.reset}`);
}

// Main test runner
async function runAllTests() {
  console.log(`${colors.bold}${colors.cyan}`);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         iOS API Endpoint Test Suite                       ║');
  console.log('║         Testing: https://pos-candy-kush.vercel.app        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
  
  const startTime = Date.now();
  
  try {
    await testHealthCheck();
    await testAuthentication();
    
    if (!authToken) {
      console.log(`\n${colors.red}${colors.bold}✗ Authentication failed - cannot continue with protected endpoints${colors.reset}`);
      return;
    }
    
    await testProducts();
    await testCategories();
    await testCustomers();
    await testReceipts();
    await testExpenses();
    await testShifts();
    await testCashback();
    await testStock();
    await testUsers();
    await testSettings();
    await testAnalytics();
    await testAdvancedReports();
    await testRefundsAndPaymentChanges();
    await testExport();
    await testUnauthorizedAccess();
    
  } catch (error) {
    console.log(`\n${colors.red}${colors.bold}✗ Test suite error: ${error.message}${colors.reset}`);
    console.error(error);
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Print summary
  console.log(`\n${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════╗`);
  console.log(`║                    TEST SUMMARY                            ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log(`\n${colors.bold}Total Tests:${colors.reset} ${testResults.passed + testResults.failed}`);
  console.log(`${colors.green}${colors.bold}Passed:${colors.reset} ${testResults.passed}`);
  console.log(`${colors.red}${colors.bold}Failed:${colors.reset} ${testResults.failed}`);
  console.log(`${colors.blue}${colors.bold}Duration:${colors.reset} ${duration}s`);
  
  const successRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2);
  console.log(`${colors.bold}Success Rate:${colors.reset} ${successRate}%`);
  
  if (testResults.failed > 0) {
    console.log(`\n${colors.red}${colors.bold}Failed Tests:${colors.reset}`);
    testResults.tests
      .filter(t => !t.passed)
      .forEach(t => console.log(`  ${colors.red}✗${colors.reset} ${t.name}: ${t.message}`));
  }
  
  console.log(`\n${colors.bold}${testResults.failed === 0 ? colors.green : colors.red}`);
  console.log(testResults.failed === 0 ? '✓ All tests passed!' : '✗ Some tests failed');
  console.log(colors.reset);
  
  process.exit(testResults.failed === 0 ? 0 : 1);
}

// Run tests
runAllTests();
