/**
 * Test script to test Expense CRUD operations on localhost
 * This will help verify the expense API implementation
 */

const BASE_URL = "http://localhost:3000";

async function testExpenseCRUD() {
  console.log("🧪 Testing Expense CRUD Operations on Localhost\n");
  console.log("=" .repeat(60));

  try {
    // Step 1: Login to get token
    console.log("\n1️⃣ Logging in...");
    const loginResponse = await fetch(`${BASE_URL}/api/mobile?action=login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "admin@candykush.com",
        password: "admin123",
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(
        `Login failed: ${loginResponse.status} ${loginResponse.statusText}`
      );
    }

    const loginData = await loginResponse.json();
    console.log("✅ Login successful");
    console.log("User:", loginData.user?.email);

    if (!loginData.token) {
      throw new Error("No token received from login");
    }

    const token = loginData.token;
    console.log("Token:", token.substring(0, 30) + "...");

    // Step 2: Create expense
    console.log("\n2️⃣ Creating expense...");

    const expenseData = {
      description: "Office supplies - printer paper and ink",
      amount: 45.5,
      date: "2026-01-06",
      time: "14:30",
    };

    console.log("\n💰 Expense Data:");
    console.log(JSON.stringify(expenseData, null, 2));

    const createResponse = await fetch(
      `${BASE_URL}/api/mobile?action=create-expense`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(expenseData),
      }
    );

    console.log("\n📡 Response Status:", createResponse.status);
    console.log("Response Status Text:", createResponse.statusText);

    const responseText = await createResponse.text();
    console.log("\n📄 Response Body (Raw):");
    console.log(responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log("\n📋 Response Body (Parsed):");
      console.log(JSON.stringify(responseData, null, 2));
    } catch (e) {
      console.log("⚠️  Could not parse response as JSON");
    }

    if (!createResponse.ok) {
      console.log("\n❌ ERROR: Expense creation failed!");
      console.log("Status Code:", createResponse.status);
      console.log("Error Message:", responseData?.error || "Unknown error");
      throw new Error(
        `Expense creation failed: ${createResponse.status} - ${responseData?.error || responseText}`
      );
    }

    console.log("\n✅ Expense created successfully!");
    if (responseData?.data?.expense) {
      console.log("Expense ID:", responseData.data.expense.id);
      console.log("Description:", responseData.data.expense.description);
      console.log("Amount:", responseData.data.expense.amount);
      console.log("Date:", responseData.data.expense.date);
      console.log("Time:", responseData.data.expense.time);
    }

    const expenseId = responseData?.data?.expense?.id;

    // Step 3: Get all expenses
    console.log("\n3️⃣ Getting all expenses...");
    const getAllResponse = await fetch(
      `${BASE_URL}/api/mobile?action=get-expenses`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (getAllResponse.ok) {
      const allExpensesData = await getAllResponse.json();
      console.log("✅ Got all expenses");
      console.log("Total expenses:", allExpensesData.data?.count || 0);
      console.log("Total amount:", allExpensesData.data?.total || 0);
    } else {
      console.log("⚠️  Could not get all expenses");
    }

    // Step 4: Get single expense
    if (expenseId) {
      console.log("\n4️⃣ Getting single expense...");
      const getSingleResponse = await fetch(
        `${BASE_URL}/api/mobile?action=get-expense&id=${expenseId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (getSingleResponse.ok) {
        const singleExpenseData = await getSingleResponse.json();
        console.log("✅ Got single expense");
        console.log(JSON.stringify(singleExpenseData, null, 2));
      } else {
        console.log("⚠️  Could not get single expense");
      }
    }

    // Step 5: Edit expense
    if (expenseId) {
      console.log("\n5️⃣ Editing expense...");
      const updateData = {
        id: expenseId,
        description: "Updated office supplies - premium paper",
        amount: 60.0,
      };

      const editResponse = await fetch(
        `${BASE_URL}/api/mobile?action=edit-expense`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updateData),
        }
      );

      if (editResponse.ok) {
        const editData = await editResponse.json();
        console.log("✅ Expense updated successfully");
        console.log("New description:", editData.data?.expense?.description);
        console.log("New amount:", editData.data?.expense?.amount);
      } else {
        console.log("⚠️  Could not update expense");
        const errorText = await editResponse.text();
        console.log("Error:", errorText);
      }
    }

    // Step 6: Delete expense
    if (expenseId) {
      console.log("\n6️⃣ Deleting expense...");
      const deleteResponse = await fetch(
        `${BASE_URL}/api/mobile?action=delete-expense`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id: expenseId }),
        }
      );

      if (deleteResponse.ok) {
        const deleteData = await deleteResponse.json();
        console.log("✅ Expense deleted successfully");
        console.log("Message:", deleteData.message);
      } else {
        console.log("⚠️  Could not delete expense");
        const errorText = await deleteResponse.text();
        console.log("Error:", errorText);
      }
    }

    // Step 7: Verify deletion
    console.log("\n7️⃣ Verifying deletion...");
    const verifyResponse = await fetch(
      `${BASE_URL}/api/mobile?action=get-expenses`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      console.log("✅ Verified expenses after deletion");
      console.log("Remaining expenses:", verifyData.data?.count || 0);
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ All expense CRUD tests passed!");
  } catch (error) {
    console.log("\n" + "=".repeat(60));
    console.log("❌ TEST FAILED");
    console.error("Error:", error.message);
    console.error("\nFull error:");
    console.error(error);
    process.exit(1);
  }
}

// Run the test
console.log("Starting expense CRUD test at:", new Date().toISOString());
testExpenseCRUD();
