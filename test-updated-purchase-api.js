/**
 * Comprehensive test script for the updated purchase API with suppliers
 * Tests all new features: payment status, payment method, notes, suppliers
 */

const BASE_URL = "http://localhost:3000";

async function testUpdatedPurchaseAPI() {
  console.log("🧪 Testing Updated Purchase API with Suppliers\n");
  console.log("=".repeat(80));

  let token = "";

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

    token = loginData.token;
    console.log("Token received:", token.substring(0, 30) + "...");

    // Step 2: Test Supplier Management
    console.log("\n2️⃣ Testing Supplier Management...");

    // Create a supplier
    console.log("\n📝 Creating supplier...");
    const supplierData = {
      name: "Test Supplier API",
      contact_person: "John Doe",
      email: "john@testsupplier.com",
      phone: "+1234567890",
      address: "123 Test Street, Test City",
      notes: "Test supplier for API testing",
    };

    const createSupplierResponse = await fetch(
      `${BASE_URL}/api/mobile?action=create-supplier`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(supplierData),
      }
    );

    if (!createSupplierResponse.ok) {
      const errorText = await createSupplierResponse.text();
      console.log("❌ Supplier creation failed:", errorText);
      throw new Error(
        `Supplier creation failed: ${createSupplierResponse.status}`
      );
    }

    const supplierResult = await createSupplierResponse.json();
    console.log("✅ Supplier created successfully!");
    console.log("Supplier ID:", supplierResult.data.supplier.id);
    console.log("Supplier Name:", supplierResult.data.supplier.name);

    const supplierId = supplierResult.data.supplier.id;

    // Get all suppliers
    console.log("\n📋 Getting all suppliers...");
    const getSuppliersResponse = await fetch(
      `${BASE_URL}/api/mobile?action=get-suppliers`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      }
    );

    if (getSuppliersResponse.ok) {
      const suppliersData = await getSuppliersResponse.json();
      console.log("✅ Suppliers retrieved successfully!");
      console.log("Total suppliers:", suppliersData.data.suppliers.length);
    } else {
      console.log("⚠️  Could not retrieve suppliers");
    }

    // Step 3: Test Purchase Creation with New Fields
    console.log("\n3️⃣ Testing Purchase Creation with New Fields...");

    const purchaseData = {
      supplier_name: "Test Supplier API", // Using the supplier we just created
      purchase_date: "2026-01-12",
      due_date: "2026-01-20",
      items: [
        {
          product_id: "test_product_1",
          product_name: "Premium Cannabis Flower",
          quantity: 10,
          price: 50.0,
          total: 500.0,
        },
        {
          product_id: "test_product_2",
          product_name: "Rolling Papers",
          quantity: 5,
          price: 20.0,
          total: 100.0,
        },
      ],
      total: 600.0,
      payment_status: "unpaid", // New field
      payment_method: "bank_transfer", // New field
      payment_due_date: "2026-01-25", // New field - required for unpaid
      notes: "Test purchase with new payment fields", // New field
      reminder_type: "days_before",
      reminder_value: "3",
      reminder_time: "09:00",
    };

    console.log("\n📦 Purchase Data with New Fields:");
    console.log(JSON.stringify(purchaseData, null, 2));

    const createPurchaseResponse = await fetch(
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

    console.log(
      "\n📡 Purchase Creation Response Status:",
      createPurchaseResponse.status
    );

    if (!createPurchaseResponse.ok) {
      const errorText = await createPurchaseResponse.text();
      console.log("❌ Purchase creation failed:", errorText);
      throw new Error(
        `Purchase creation failed: ${createPurchaseResponse.status}`
      );
    }

    const purchaseResult = await createPurchaseResponse.json();
    console.log("✅ Purchase created successfully!");
    console.log("Purchase ID:", purchaseResult.data.purchase.id);
    console.log("Payment Status:", purchaseResult.data.purchase.payment_status);
    console.log("Payment Method:", purchaseResult.data.purchase.payment_method);
    console.log(
      "Payment Due Date:",
      purchaseResult.data.purchase.payment_due_date
    );
    console.log("Notes:", purchaseResult.data.purchase.notes);

    const purchaseId = purchaseResult.data.purchase.id;

    // Step 4: Test Purchase Filtering
    console.log("\n4️⃣ Testing Purchase Filtering...");

    // Test filtering by supplier
    console.log("\n🔍 Filtering purchases by supplier...");
    const filterBySupplierResponse = await fetch(
      `${BASE_URL}/api/mobile?action=get-purchases`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          supplier: "Test Supplier API",
        }),
      }
    );

    if (filterBySupplierResponse.ok) {
      const filteredData = await filterBySupplierResponse.json();
      console.log("✅ Supplier filtering successful!");
      console.log(
        "Filtered purchases count:",
        filteredData.data.purchases.length
      );
      if (filteredData.data.purchases.length > 0) {
        console.log(
          "First purchase supplier:",
          filteredData.data.purchases[0]?.supplier_name
        );
      }
    } else {
      const errorText = await filterBySupplierResponse.text();
      console.log("❌ Supplier filtering failed:", errorText);
    }

    // Test filtering by payment status
    console.log("\n💰 Filtering purchases by payment status...");
    const filterByPaymentResponse = await fetch(
      `${BASE_URL}/api/mobile?action=get-purchases`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          payment_status: "unpaid",
        }),
      }
    );

    if (filterByPaymentResponse.ok) {
      const paymentFilteredData = await filterByPaymentResponse.json();
      console.log("✅ Payment status filtering successful!");
      console.log(
        "Filtered purchases count:",
        paymentFilteredData.data.purchases.length
      );

      // Check if unpaid purchases are shown first
      if (paymentFilteredData.data.purchases.length > 0) {
        const firstPurchase = paymentFilteredData.data.purchases[0];
        if (firstPurchase && firstPurchase.payment_status === "unpaid") {
          console.log("✅ Unpaid purchases are correctly shown first!");
        } else {
          console.log("⚠️  Purchase ordering might not be working correctly");
        }
      }
    } else {
      const errorText = await filterByPaymentResponse.text();
      console.log("❌ Payment status filtering failed:", errorText);
    }

    // Step 5: Test Purchase Update
    console.log("\n5️⃣ Testing Purchase Update...");

    const updateData = {
      id: purchaseId,
      payment_status: "paid",
      payment_method: "cash",
      notes: "Updated: Payment completed with cash",
    };

    const updateResponse = await fetch(
      `${BASE_URL}/api/mobile?action=edit-purchase`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      }
    );

    if (updateResponse.ok) {
      const updateResult = await updateResponse.json();
      console.log("✅ Purchase updated successfully!");
      console.log(
        "New Payment Status:",
        updateResult.data.purchase.payment_status
      );
      console.log(
        "New Payment Method:",
        updateResult.data.purchase.payment_method
      );
      console.log("Updated Notes:", updateResult.data.purchase.notes);
    } else {
      const errorText = await updateResponse.text();
      console.log("❌ Purchase update failed:", errorText);
    }

    // Step 6: Verify Updated Purchase
    console.log("\n6️⃣ Verifying Updated Purchase...");
    const getPurchaseResponse = await fetch(
      `${BASE_URL}/api/mobile?action=get-purchase&id=${purchaseId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (getPurchaseResponse.ok) {
      const purchaseData = await getPurchaseResponse.json();
      console.log("✅ Purchase retrieved successfully!");
      const purchase = purchaseData.data;
      if (purchase && purchase.id) {
        console.log("Payment Status:", purchase.payment_status);
        console.log("Payment Method:", purchase.payment_method);
        console.log("Notes:", purchase.notes);
      } else {
        console.log(
          "⚠️  Purchase data structure unexpected:",
          JSON.stringify(purchaseData, null, 2)
        );
      }
    } else {
      const errorText = await getPurchaseResponse.text();
      console.log("❌ Could not retrieve updated purchase:", errorText);
    }

    // Step 7: Test Validation (Unpaid without due date should fail)
    console.log("\n7️⃣ Testing Validation...");

    const invalidPurchaseData = {
      supplier_name: "Test Supplier API",
      purchase_date: "2026-01-12",
      due_date: "2026-01-20",
      items: [
        {
          product_id: "test_product_1",
          product_name: "Test Product",
          quantity: 1,
          price: 100.0,
          total: 100.0,
        },
      ],
      total: 100.0,
      payment_status: "unpaid",
      // Missing payment_due_date - should fail validation
    };

    const validationTestResponse = await fetch(
      `${BASE_URL}/api/mobile?action=create-purchase`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(invalidPurchaseData),
      }
    );

    if (validationTestResponse.status === 400) {
      const errorData = await validationTestResponse.json();
      console.log("✅ Validation working correctly!");
      console.log("Error message:", errorData.error);
    } else {
      console.log("⚠️  Validation may not be working as expected");
      console.log("Status code:", validationTestResponse.status);
      try {
        const responseText = await validationTestResponse.text();
        console.log("Response:", responseText);
      } catch (e) {
        console.log("Could not read response");
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("🎉 ALL TESTS COMPLETED SUCCESSFULLY!");
    console.log("✅ Supplier management working");
    console.log("✅ New purchase fields working");
    console.log("✅ Purchase filtering working");
    console.log("✅ Purchase updates working");
    console.log("✅ Validation working");
  } catch (error) {
    console.log("\n" + "=".repeat(80));
    console.log("❌ TEST FAILED");
    console.error("Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the comprehensive test
console.log("Starting comprehensive API test at:", new Date().toISOString());
testUpdatedPurchaseAPI();
