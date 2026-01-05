/**
 * Test script to create a purchase on PRODUCTION
 * This will help diagnose the 400 error on Vercel deployment
 */

const BASE_URL = "https://pos-candy-kush.vercel.app";

async function testPurchaseCreation() {
  console.log("🧪 Testing Purchase Creation on PRODUCTION (Vercel)\n");
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

    console.log("Login Response Status:", loginResponse.status);

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.log("Login Error Response:", errorText);
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

    // Step 2: Create purchase
    console.log("\n2️⃣ Creating purchase...");

    const purchaseData = {
      supplier_name: "Test Supplier Production",
      purchase_date: "2026-01-06",
      due_date: "2026-01-15",
      items: [
        {
          product_id: "test_product_1",
          product_name: "Test Cannabis Product",
          quantity: 10,
          price: 50.0,
          total: 500.0,
        },
        {
          product_id: "test_product_2",
          product_name: "Test Accessories",
          quantity: 5,
          price: 100.0,
          total: 500.0,
        },
      ],
      total: 1000.0,
      reminder_type: "days_before",
      reminder_value: "3",
      reminder_time: "09:00",
    };

    console.log("\n📦 Purchase Data:");
    console.log(JSON.stringify(purchaseData, null, 2));

    const createResponse = await fetch(
      `${BASE_URL}/api/mobile?action=create-purchase`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(purchaseData),
      }
    );

    console.log("\n📡 Response Status:", createResponse.status);
    console.log("Response Status Text:", createResponse.statusText);
    console.log("\nResponse Headers:");
    createResponse.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });

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
      console.log("Parse error:", e.message);
    }

    if (!createResponse.ok) {
      console.log("\n❌ ERROR: Purchase creation failed!");
      console.log("Status Code:", createResponse.status);
      console.log("Status Text:", createResponse.statusText);
      console.log("Error Message:", responseData?.error || "Unknown error");
      console.log("\n🔍 Debugging Information:");
      console.log("- Check if Firebase credentials are set in Vercel environment");
      console.log("- Check Vercel function logs");
      console.log("- Verify all required fields are present");
      throw new Error(
        `Purchase creation failed: ${createResponse.status} - ${responseData?.error || responseText}`
      );
    }

    console.log("\n✅ Purchase created successfully!");
    if (responseData?.data?.purchase) {
      console.log("Purchase ID:", responseData.data.purchase.id);
      console.log("Supplier:", responseData.data.purchase.supplier_name);
      console.log("Total:", responseData.data.purchase.total);
      console.log("Status:", responseData.data.purchase.status);
    }

    // Step 3: Verify purchase was created
    console.log("\n3️⃣ Verifying purchase...");
    const purchaseId = responseData?.data?.purchase?.id;

    if (purchaseId) {
      const getResponse = await fetch(
        `${BASE_URL}/api/mobile?action=get-purchase&id=${purchaseId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (getResponse.ok) {
        const getPurchaseData = await getResponse.json();
        console.log("✅ Purchase verified in database");
        console.log(JSON.stringify(getPurchaseData, null, 2));
      } else {
        console.log("⚠️  Could not verify purchase");
        const errorText = await getResponse.text();
        console.log("Error:", errorText);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ All tests passed!");
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
console.log("Starting test at:", new Date().toISOString());
console.log("Testing against:", BASE_URL);
testPurchaseCreation();
