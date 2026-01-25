/**
 * ISY Order Duplication - Test Utilities
 * Use these functions in browser console to test the integration
 */

// Import functions (use these in your React components)
import {
  duplicateOrderToISY,
  setISYApiToken,
  clearISYApiToken,
  isISYApiConfigured,
} from "@/lib/services/orderDuplicationService";
import { getISYSyncStats, triggerISYSync } from "@/lib/services/isySyncService";

/**
 * Test 1: Check if ISY sync is configured
 */
export async function testConfiguration() {
  console.log("🧪 Testing ISY Configuration...");

  const isConfigured = isISYApiConfigured();
  console.log(`Token configured: ${isConfigured ? "✅ YES" : "❌ NO"}`);

  const apiUrl = process.env.NEXT_PUBLIC_ISY_API_URL;
  console.log(`API URL: ${apiUrl}`);

  const enabled = process.env.NEXT_PUBLIC_ISY_API_ENABLED;
  console.log(`Sync enabled: ${enabled}`);

  if (!isConfigured) {
    console.log("⚠️ Token not set. Use testSetToken() to configure.");
  }

  return { isConfigured, apiUrl, enabled };
}

/**
 * Test 2: Set test token
 */
export function testSetToken(token) {
  console.log("🧪 Setting test token...");

  if (!token) {
    console.error("❌ Please provide a token: testSetToken('your-token')");
    return false;
  }

  setISYApiToken(token);
  console.log("✅ Token set successfully");

  const isConfigured = isISYApiConfigured();
  console.log(
    `Configuration status: ${isConfigured ? "✅ Configured" : "❌ Not configured"}`,
  );

  return isConfigured;
}

/**
 * Test 3: Create mock order and test duplication
 */
export async function testOrderDuplication() {
  console.log("🧪 Testing order duplication with mock data...");

  const mockReceiptData = {
    // Order identification
    orderNumber: `TEST-${Date.now()}`,
    receipt_number: `TEST-${Date.now()}`,
    deviceId: "test-device",

    // Timestamps
    created_at: new Date().toISOString(),
    receipt_date: new Date().toISOString(),
    updated_at: new Date().toISOString(),

    // Customer
    customerId: "test-customer-123",
    customerName: "Test Customer",
    customer: {
      id: "test-customer-123",
      customerId: "test-customer-123",
      name: "Test",
      lastName: "Customer",
      fullName: "Test Customer",
      email: "test@example.com",
      phone: "555-0123",
      isNoMember: false,
      currentPoints: 100,
    },

    // Items
    line_items: [
      {
        id: "item-1",
        item_id: "product-123",
        variant_id: "variant-456",
        item_name: "Test Product",
        quantity: 2,
        price: 10.0,
        total_money: 20.0,
        gross_total_money: 20.0,
        cost: 5.0,
        cost_total: 10.0,
        sku: "TEST-SKU-001",
      },
    ],

    // Pricing
    subtotal: 20.0,
    total_discount: 0,
    total_tax: 2.0,
    total_money: 22.0,
    tip: 0,
    surcharge: 0,

    // Payment
    paymentMethod: "cash",
    paymentTypeName: "Cash",
    cashReceived: 25.0,
    change: 3.0,
    payments: [
      {
        payment_type_id: "cash",
        name: "Cash",
        type: "CASH",
        money_amount: 22.0,
        paid_at: new Date().toISOString(),
      },
    ],

    // Points
    points_used: 0,
    points_earned: 2,
    points_balance: 102,
    cashback_earned: 2,

    // Employee
    cashierId: "cashier-123",
    cashierName: "Test Cashier",
    userId: "cashier-123",

    // Status
    status: "completed",
    receipt_type: "SALE",
    source: "POS System Test",

    // Sync
    syncStatus: "pending",
    fromThisDevice: true,
  };

  const mockCashier = {
    id: "cashier-123",
    name: "Test Cashier",
  };

  console.log("📤 Sending mock order:", mockReceiptData.orderNumber);

  const result = await duplicateOrderToISY(mockReceiptData, mockCashier);

  if (result.success) {
    console.log("✅ Test order duplicated successfully!");
    console.log("ISY Order ID:", result.isyOrderId);
    return true;
  } else {
    console.error("❌ Test order duplication failed:", result.error);
    if (result.errorCode) {
      console.error("Error code:", result.errorCode);
    }
    if (result.details) {
      console.error("Details:", result.details);
    }
    return false;
  }
}

/**
 * Test 4: Check sync statistics
 */
export async function testSyncStats() {
  console.log("🧪 Checking sync statistics...");

  const stats = await getISYSyncStats();

  console.log("\n📊 Sync Statistics:");
  console.log(`  Total:     ${stats.total}`);
  console.log(`  Completed: ${stats.completed} ✅`);
  console.log(`  Pending:   ${stats.pending} ⏳`);
  console.log(`  Failed:    ${stats.failed} ❌`);

  if (stats.pending > 0) {
    console.log(`\n⚠️ There are ${stats.pending} pending duplications`);
    console.log("They will be retried automatically every 60 seconds");
  }

  if (stats.failed > 0) {
    console.log(`\n❌ There are ${stats.failed} failed duplications`);
    console.log("Check browser console logs for error details");
  }

  return stats;
}

/**
 * Test 5: Manual sync trigger
 */
export async function testManualSync() {
  console.log("🧪 Triggering manual sync...");

  try {
    await triggerISYSync();
    console.log("✅ Manual sync completed");

    // Show updated stats
    await testSyncStats();

    return true;
  } catch (error) {
    console.error("❌ Manual sync failed:", error);
    return false;
  }
}

/**
 * Test 6: Clear configuration
 */
export function testClearToken() {
  console.log("🧪 Clearing token...");

  clearISYApiToken();
  console.log("✅ Token cleared");

  const isConfigured = isISYApiConfigured();
  console.log(
    `Configuration status: ${isConfigured ? "❌ Still configured?!" : "✅ Not configured"}`,
  );

  return !isConfigured;
}

/**
 * Test 7: Full integration test
 */
export async function testFullIntegration(token = null) {
  console.log("🧪 Running full integration test...\n");

  let step = 1;

  // Step 1: Check initial configuration
  console.log(`\n${step++}. Checking configuration...`);
  const config = await testConfiguration();

  // Step 2: Set token if provided
  if (token) {
    console.log(`\n${step++}. Setting token...`);
    const tokenSet = testSetToken(token);
    if (!tokenSet) {
      console.error("❌ Failed to set token. Test aborted.");
      return false;
    }
  } else if (!config.isConfigured) {
    console.error("❌ No token configured and none provided. Test aborted.");
    console.log("Usage: testFullIntegration('your-jwt-token')");
    return false;
  }

  // Step 3: Test order duplication
  console.log(`\n${step++}. Testing order duplication...`);
  const duplicationSuccess = await testOrderDuplication();

  // Step 4: Check sync stats
  console.log(`\n${step++}. Checking sync statistics...`);
  await testSyncStats();

  // Step 5: Summary
  console.log("\n" + "=".repeat(50));
  console.log("📋 Test Summary:");
  console.log("=".repeat(50));
  console.log(`Configuration: ${config.isConfigured ? "✅" : "❌"}`);
  console.log(`Order Duplication: ${duplicationSuccess ? "✅" : "❌"}`);
  console.log("=".repeat(50));

  if (config.isConfigured && duplicationSuccess) {
    console.log("\n🎉 All tests passed! ISY integration is working correctly.");
    return true;
  } else {
    console.log("\n⚠️ Some tests failed. Check errors above for details.");
    return false;
  }
}

/**
 * Test 8: Stress test - create multiple orders
 */
export async function testBatchOrders(count = 5) {
  console.log(`🧪 Running batch test with ${count} orders...\n`);

  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (let i = 1; i <= count; i++) {
    console.log(`\n📤 Creating test order ${i}/${count}...`);

    const success = await testOrderDuplication();

    if (success) {
      results.success++;
    } else {
      results.failed++;
    }

    // Small delay between orders
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 Batch Test Results:");
  console.log("=".repeat(50));
  console.log(`Total Orders: ${count}`);
  console.log(`Successful:   ${results.success} ✅`);
  console.log(`Failed:       ${results.failed} ❌`);
  console.log("=".repeat(50));

  // Check final stats
  await testSyncStats();

  return results;
}

// Export all test functions
export const isyTests = {
  testConfiguration,
  testSetToken,
  testOrderDuplication,
  testSyncStats,
  testManualSync,
  testClearToken,
  testFullIntegration,
  testBatchOrders,
};

// Make available globally for console access
if (typeof window !== "undefined") {
  window.isyTests = isyTests;
  console.log("✅ ISY test utilities loaded. Use window.isyTests to access.");
  console.log("\nAvailable tests:");
  console.log("  - window.isyTests.testConfiguration()");
  console.log("  - window.isyTests.testSetToken('your-token')");
  console.log("  - window.isyTests.testOrderDuplication()");
  console.log("  - window.isyTests.testSyncStats()");
  console.log("  - window.isyTests.testManualSync()");
  console.log("  - window.isyTests.testFullIntegration('your-token')");
  console.log("  - window.isyTests.testBatchOrders(5)");
}

export default isyTests;
