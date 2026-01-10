#!/usr/bin/env node

/**
 * Test script for Expense Management System
 * Tests the complete expense workflow with approval
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

console.log("🧪 Testing Expense Management System");
console.log("=" .repeat(50));
console.log(`Base URL: ${BASE_URL}`);
console.log("=" .repeat(50));

async function testExpenseWorkflow() {
  let testExpenseId = null;

  try {
    // Step 1: Create an expense (cashier submission)
    console.log("\n📝 Step 1: Creating expense...");
    const createData = {
      description: "Test expense - Office supplies",
      amount: 75.5,
      date: new Date().toISOString().split("T")[0],
      time: new Date().toTimeString().split(" ")[0].slice(0, 5),
      category: "Office Supplies",
      employeeId: "test_cashier_001",
      employeeName: "Test Cashier",
    };

    const createResponse = await fetch(
      `${BASE_URL}/api/mobile?action=create-expense`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createData),
      }
    );

    const createResult = await createResponse.json();
    console.log("Create Response:", JSON.stringify(createResult, null, 2));

    if (createResult.success) {
      testExpenseId = createResult.data.expense.id;
      console.log("✅ Expense created successfully");
      console.log(`   ID: ${testExpenseId}`);
      console.log(`   Status: ${createResult.data.expense.status}`);
    } else {
      console.log("❌ Failed to create expense:", createResult.error);
      return;
    }

    // Step 2: Get all expenses
    console.log("\n📋 Step 2: Fetching all expenses...");
    const getAllResponse = await fetch(
      `${BASE_URL}/api/mobile?action=get-expenses`
    );
    const getAllResult = await getAllResponse.json();

    if (getAllResult.success) {
      console.log("✅ Expenses fetched successfully");
      console.log(`   Total count: ${getAllResult.data.count}`);
      console.log(`   Pending: ${getAllResult.data.pendingCount}`);
      console.log(`   Approved: ${getAllResult.data.approvedCount}`);
      console.log(`   Denied: ${getAllResult.data.deniedCount}`);
    } else {
      console.log("❌ Failed to fetch expenses");
    }

    // Step 3: Get single expense
    console.log("\n🔍 Step 3: Fetching single expense...");
    const getOneResponse = await fetch(
      `${BASE_URL}/api/mobile?action=get-expense&id=${testExpenseId}`
    );
    const getOneResult = await getOneResponse.json();

    if (getOneResult.success) {
      console.log("✅ Single expense fetched");
      console.log("   Expense Details:");
      console.log(`   - Description: ${getOneResult.data.description}`);
      console.log(`   - Amount: $${getOneResult.data.amount}`);
      console.log(`   - Status: ${getOneResult.data.status}`);
      console.log(`   - Category: ${getOneResult.data.category}`);
      console.log(`   - Employee: ${getOneResult.data.employeeName}`);
    } else {
      console.log("❌ Failed to fetch single expense");
    }

    // Step 4: Filter by status (pending)
    console.log("\n🔎 Step 4: Filtering pending expenses...");
    const filterResponse = await fetch(
      `${BASE_URL}/api/mobile?action=get-expenses&status=pending`
    );
    const filterResult = await filterResponse.json();

    if (filterResult.success) {
      console.log("✅ Filtered expenses");
      console.log(`   Pending expenses: ${filterResult.data.count}`);
    } else {
      console.log("❌ Failed to filter expenses");
    }

    // Step 5: Approve the expense
    console.log("\n✅ Step 5: Approving expense...");
    const approveData = {
      expenseId: testExpenseId,
      approvedBy: "admin_001",
      approvedByName: "Test Manager",
      notes: "Approved for testing purposes",
    };

    const approveResponse = await fetch(
      `${BASE_URL}/api/mobile?action=approve-expense`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(approveData),
      }
    );

    const approveResult = await approveResponse.json();
    console.log("Approve Response:", JSON.stringify(approveResult, null, 2));

    if (approveResult.success) {
      console.log("✅ Expense approved successfully");
      console.log(`   Status: ${approveResult.data.expense.status}`);
      console.log(`   Approved by: ${approveResult.data.expense.approvedByName}`);
      console.log(`   Notes: ${approveResult.data.expense.approvalNotes}`);
    } else {
      console.log("❌ Failed to approve expense:", approveResult.error);
    }

    // Step 6: Verify the expense was approved
    console.log("\n🔍 Step 6: Verifying approval...");
    const verifyResponse = await fetch(
      `${BASE_URL}/api/mobile?action=get-expense&id=${testExpenseId}`
    );
    const verifyResult = await verifyResponse.json();

    if (verifyResult.success && verifyResult.data.status === "approved") {
      console.log("✅ Approval verified");
      console.log(`   Status: ${verifyResult.data.status}`);
    } else {
      console.log("❌ Approval verification failed");
    }

    // Step 7: Test denial workflow with a new expense
    console.log("\n❌ Step 7: Testing denial workflow...");
    const createData2 = {
      description: "Test expense - To be denied",
      amount: 100.0,
      date: new Date().toISOString().split("T")[0],
      time: new Date().toTimeString().split(" ")[0].slice(0, 5),
      category: "General",
      employeeId: "test_cashier_002",
      employeeName: "Another Cashier",
    };

    const createResponse2 = await fetch(
      `${BASE_URL}/api/mobile?action=create-expense`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createData2),
      }
    );

    const createResult2 = await createResponse2.json();

    if (createResult2.success) {
      const denyExpenseId = createResult2.data.expense.id;
      console.log(`   Created expense to deny: ${denyExpenseId}`);

      // Deny it
      const denyData = {
        expenseId: denyExpenseId,
        deniedBy: "admin_001",
        deniedByName: "Test Manager",
        notes: "Exceeds budget limit",
      };

      const denyResponse = await fetch(
        `${BASE_URL}/api/mobile?action=deny-expense`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(denyData),
        }
      );

      const denyResult = await denyResponse.json();

      if (denyResult.success) {
        console.log("✅ Expense denied successfully");
        console.log(`   Status: ${denyResult.data.expense.status}`);
        console.log(`   Notes: ${denyResult.data.expense.approvalNotes}`);
      } else {
        console.log("❌ Failed to deny expense:", denyResult.error);
      }
    }

    // Step 8: Final summary
    console.log("\n📊 Step 8: Final summary...");
    const summaryResponse = await fetch(
      `${BASE_URL}/api/mobile?action=get-expenses`
    );
    const summaryResult = await summaryResponse.json();

    if (summaryResult.success) {
      console.log("✅ Test completed successfully!");
      console.log("\n📈 Summary Statistics:");
      console.log(`   Total expenses: ${summaryResult.data.count}`);
      console.log(`   Pending: ${summaryResult.data.pendingCount}`);
      console.log(`   Approved: ${summaryResult.data.approvedCount}`);
      console.log(`   Denied: ${summaryResult.data.deniedCount}`);
      console.log(
        `   Total approved amount: $${summaryResult.data.total.toFixed(2)}`
      );
      console.log(
        `   Total pending amount: $${summaryResult.data.pendingTotal.toFixed(2)}`
      );
    }

    console.log("\n" + "=".repeat(50));
    console.log("🎉 All tests passed!");
    console.log("=".repeat(50));
  } catch (error) {
    console.error("\n❌ Test failed with error:");
    console.error(error);
    process.exit(1);
  }
}

// Run the tests
console.log("\n🚀 Starting tests...\n");
testExpenseWorkflow();
