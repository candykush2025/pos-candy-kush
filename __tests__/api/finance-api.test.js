/**
 * Finance API Integration Tests
 * Tests for Purchasing and Expense endpoints
 */

const request = require("supertest");

// Base URL for API testing
const BASE_URL = "http://localhost:3000";

// Test credentials
const TEST_USER = {
  email: "admin@candykush.com",
  password: "admin123",
};

// Test data
let authToken = "";
let testPurchaseId = "";
let testExpenseId = "";

describe("Finance API - Authentication", () => {
  test("POST /api/mobile?action=login - Admin login", async () => {
    const response = await request(BASE_URL)
      .post("/api/mobile?action=login")
      .send(TEST_USER)
      .expect(200);

    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("token");
    expect(response.body).toHaveProperty("user");
    expect(response.body.user).toHaveProperty("role", "admin");

    // Save token for subsequent tests
    authToken = response.body.token;
  });

  test("GET /api/mobile?action=get-purchases - Without auth should fail", async () => {
    const response = await request(BASE_URL)
      .get("/api/mobile?action=get-purchases")
      .expect(401);

    expect(response.body).toHaveProperty("success", false);
    expect(response.body).toHaveProperty("error");
  });
});

describe("Finance API - Purchases", () => {
  test("POST /api/mobile?action=create-purchase - Create new purchase", async () => {
    const purchaseData = {
      supplier_name: "Test Supplier Co.",
      purchase_date: "2025-12-20",
      due_date: "2025-12-27",
      items: [
        {
          product_id: "test_product_1",
          product_name: "Test Product 1",
          quantity: 10,
          price: 50,
          total: 500,
        },
        {
          product_id: "test_product_2",
          product_name: "Test Product 2",
          quantity: 5,
          price: 100,
          total: 500,
        },
      ],
      total: 1000,
      reminder_type: "days_before",
      reminder_value: "3",
      reminder_time: "09:00",
    };

    const response = await request(BASE_URL)
      .post("/api/mobile?action=create-purchase")
      .set("Authorization", `Bearer ${authToken}`)
      .send(purchaseData)
      .expect(200);

    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("action", "create-purchase");
    expect(response.body.data).toHaveProperty("purchase");
    expect(response.body.data.purchase).toHaveProperty("id");
    expect(response.body.data.purchase.supplier_name).toBe("Test Supplier Co.");
    expect(response.body.data.purchase.total).toBe(1000);
    expect(response.body.data.purchase.status).toBe("pending");
    expect(response.body.data.purchase.items).toHaveLength(2);

    // Save purchase ID for subsequent tests
    testPurchaseId = response.body.data.purchase.id;
  });

  test("POST /api/mobile?action=create-purchase - Missing required fields should fail", async () => {
    const invalidData = {
      supplier_name: "Test Supplier",
      // Missing purchase_date, due_date, items, total
    };

    const response = await request(BASE_URL)
      .post("/api/mobile?action=create-purchase")
      .set("Authorization", `Bearer ${authToken}`)
      .send(invalidData)
      .expect(400);

    expect(response.body).toHaveProperty("success", false);
    expect(response.body).toHaveProperty("error");
  });

  test("GET /api/mobile?action=get-purchases - Get all purchases", async () => {
    const response = await request(BASE_URL)
      .get("/api/mobile?action=get-purchases")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("action", "get-purchases");
    expect(response.body.data).toHaveProperty("purchases");
    expect(Array.isArray(response.body.data.purchases)).toBe(true);
    expect(response.body.data.purchases.length).toBeGreaterThan(0);

    // Verify the purchase we just created is in the list
    const createdPurchase = response.body.data.purchases.find(
      (p) => p.id === testPurchaseId
    );
    expect(createdPurchase).toBeDefined();
    expect(createdPurchase.supplier_name).toBe("Test Supplier Co.");
  });

  test("GET /api/mobile?action=get-purchase - Get single purchase by ID", async () => {
    const response = await request(BASE_URL)
      .get(`/api/mobile?action=get-purchase&id=${testPurchaseId}`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("action", "get-purchase");
    expect(response.body.data).toHaveProperty("id", testPurchaseId);
    expect(response.body.data).toHaveProperty(
      "supplier_name",
      "Test Supplier Co."
    );
    expect(response.body.data).toHaveProperty("status", "pending");
    expect(response.body.data.items).toHaveLength(2);
  });

  test("GET /api/mobile?action=get-purchase - Invalid ID should fail", async () => {
    const response = await request(BASE_URL)
      .get("/api/mobile?action=get-purchase&id=nonexistent_id")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty("success", false);
    expect(response.body).toHaveProperty("error");
  });

  test("POST /api/mobile?action=edit-purchase - Update purchase", async () => {
    const updateData = {
      id: testPurchaseId,
      supplier_name: "Updated Supplier Name",
      total: 1200,
      items: [
        {
          product_id: "test_product_1",
          product_name: "Updated Product",
          quantity: 12,
          price: 100,
          total: 1200,
        },
      ],
    };

    const response = await request(BASE_URL)
      .post("/api/mobile?action=edit-purchase")
      .set("Authorization", `Bearer ${authToken}`)
      .send(updateData)
      .expect(200);

    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("action", "edit-purchase");
    expect(response.body.data.purchase).toHaveProperty("id", testPurchaseId);
    expect(response.body.data.purchase.supplier_name).toBe(
      "Updated Supplier Name"
    );
    expect(response.body.data.purchase.total).toBe(1200);
  });

  test("POST /api/mobile?action=complete-purchase - Mark purchase as completed", async () => {
    const response = await request(BASE_URL)
      .post("/api/mobile?action=complete-purchase")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ id: testPurchaseId })
      .expect(200);

    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("action", "complete-purchase");
    expect(response.body.data.purchase).toHaveProperty("status", "completed");
  });

  test("POST /api/mobile?action=delete-purchase - Delete purchase", async () => {
    const response = await request(BASE_URL)
      .post("/api/mobile?action=delete-purchase")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ id: testPurchaseId })
      .expect(200);

    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("action", "delete-purchase");
    expect(response.body).toHaveProperty("message");
  });

  test("DELETE /api/mobile?action=delete-purchase - Delete purchase using DELETE method", async () => {
    // First create a new purchase to delete
    const purchaseData = {
      supplier_name: "Supplier to Delete",
      purchase_date: "2025-12-20",
      due_date: "2025-12-27",
      items: [
        {
          product_id: "test_product",
          product_name: "Test Product",
          quantity: 1,
          price: 100,
          total: 100,
        },
      ],
      total: 100,
      reminder_type: "no_reminder",
    };

    const createResponse = await request(BASE_URL)
      .post("/api/mobile?action=create-purchase")
      .set("Authorization", `Bearer ${authToken}`)
      .send(purchaseData)
      .expect(200);

    const purchaseIdToDelete = createResponse.body.data.purchase.id;

    // Now delete it using DELETE method
    const deleteResponse = await request(BASE_URL)
      .delete(`/api/mobile?action=delete-purchase&id=${purchaseIdToDelete}`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(deleteResponse.body).toHaveProperty("success", true);
    expect(deleteResponse.body).toHaveProperty("action", "delete-purchase");
  });
});

describe("Finance API - Expenses", () => {
  test("POST /api/mobile?action=create-expense - Create new expense", async () => {
    const expenseData = {
      description: "Office supplies - printer paper and ink",
      amount: 45.5,
      date: "2025-12-20",
      time: "14:30",
    };

    const response = await request(BASE_URL)
      .post("/api/mobile?action=create-expense")
      .set("Authorization", `Bearer ${authToken}`)
      .send(expenseData)
      .expect(200);

    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("action", "create-expense");
    expect(response.body.data).toHaveProperty("expense");
    expect(response.body.data.expense).toHaveProperty("id");
    expect(response.body.data.expense.description).toBe(
      "Office supplies - printer paper and ink"
    );
    expect(response.body.data.expense.amount).toBe(45.5);

    // Save expense ID for subsequent tests
    testExpenseId = response.body.data.expense.id;
  });

  test("POST /api/mobile?action=create-expense - Missing required fields should fail", async () => {
    const invalidData = {
      description: "Test expense",
      // Missing amount, date, time
    };

    const response = await request(BASE_URL)
      .post("/api/mobile?action=create-expense")
      .set("Authorization", `Bearer ${authToken}`)
      .send(invalidData)
      .expect(400);

    expect(response.body).toHaveProperty("success", false);
    expect(response.body).toHaveProperty("error");
  });

  test("POST /api/mobile?action=create-expense - Negative amount should fail", async () => {
    const invalidData = {
      description: "Invalid expense",
      amount: -50,
      date: "2025-12-20",
      time: "14:30",
    };

    const response = await request(BASE_URL)
      .post("/api/mobile?action=create-expense")
      .set("Authorization", `Bearer ${authToken}`)
      .send(invalidData)
      .expect(400);

    expect(response.body).toHaveProperty("success", false);
    expect(response.body.error).toContain("non-negative");
  });

  test("GET /api/mobile?action=get-expenses - Get all expenses", async () => {
    const response = await request(BASE_URL)
      .get("/api/mobile?action=get-expenses")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("action", "get-expenses");
    expect(response.body.data).toHaveProperty("expenses");
    expect(response.body.data).toHaveProperty("total");
    expect(response.body.data).toHaveProperty("count");
    expect(Array.isArray(response.body.data.expenses)).toBe(true);
    expect(response.body.data.expenses.length).toBeGreaterThan(0);

    // Verify the expense we just created is in the list
    const createdExpense = response.body.data.expenses.find(
      (e) => e.id === testExpenseId
    );
    expect(createdExpense).toBeDefined();
    expect(createdExpense.description).toContain("Office supplies");
  });

  test("GET /api/mobile?action=get-expenses - Filter by date range", async () => {
    const response = await request(BASE_URL)
      .get(
        "/api/mobile?action=get-expenses&start_date=2025-12-01&end_date=2025-12-31"
      )
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty("success", true);
    expect(response.body.data).toHaveProperty("expenses");
    expect(Array.isArray(response.body.data.expenses)).toBe(true);
  });

  test("GET /api/mobile?action=get-expense - Get single expense by ID", async () => {
    const response = await request(BASE_URL)
      .get(`/api/mobile?action=get-expense&id=${testExpenseId}`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("action", "get-expense");
    expect(response.body.data).toHaveProperty("id", testExpenseId);
    expect(response.body.data).toHaveProperty("description");
    expect(response.body.data).toHaveProperty("amount", 45.5);
  });

  test("GET /api/mobile?action=get-expense - Invalid ID should fail", async () => {
    const response = await request(BASE_URL)
      .get("/api/mobile?action=get-expense&id=nonexistent_id")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty("success", false);
    expect(response.body).toHaveProperty("error");
  });

  test("POST /api/mobile?action=edit-expense - Update expense", async () => {
    const updateData = {
      id: testExpenseId,
      description: "Updated expense description",
      amount: 60,
    };

    const response = await request(BASE_URL)
      .post("/api/mobile?action=edit-expense")
      .set("Authorization", `Bearer ${authToken}`)
      .send(updateData)
      .expect(200);

    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("action", "edit-expense");
    expect(response.body.data.expense).toHaveProperty("id", testExpenseId);
    expect(response.body.data.expense.description).toBe(
      "Updated expense description"
    );
    expect(response.body.data.expense.amount).toBe(60);
  });

  test("POST /api/mobile?action=delete-expense - Delete expense", async () => {
    const response = await request(BASE_URL)
      .post("/api/mobile?action=delete-expense")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ id: testExpenseId })
      .expect(200);

    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("action", "delete-expense");
    expect(response.body).toHaveProperty("message");
  });

  test("DELETE /api/mobile?action=delete-expense - Delete expense using DELETE method", async () => {
    // First create a new expense to delete
    const expenseData = {
      description: "Expense to delete",
      amount: 25,
      date: "2025-12-20",
      time: "10:00",
    };

    const createResponse = await request(BASE_URL)
      .post("/api/mobile?action=create-expense")
      .set("Authorization", `Bearer ${authToken}`)
      .send(expenseData)
      .expect(200);

    const expenseIdToDelete = createResponse.body.data.expense.id;

    // Now delete it using DELETE method
    const deleteResponse = await request(BASE_URL)
      .delete(`/api/mobile?action=delete-expense&id=${expenseIdToDelete}`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(deleteResponse.body).toHaveProperty("success", true);
    expect(deleteResponse.body).toHaveProperty("action", "delete-expense");
  });
});

describe("Finance API - Invoice DELETE endpoint", () => {
  let testInvoiceId = "";

  test("Create test invoice for deletion", async () => {
    const invoiceData = {
      customer_name: "Test Customer",
      date: "2025-12-20",
      due_date: "2026-01-20",
      items: [
        {
          product_id: "test_product",
          product_name: "Test Product",
          quantity: 1,
          price: 100,
          total: 100,
        },
      ],
      total: 100,
    };

    const response = await request(BASE_URL)
      .post("/api/mobile?action=create-invoice")
      .set("Authorization", `Bearer ${authToken}`)
      .send(invoiceData)
      .expect(200);

    expect(response.body).toHaveProperty("success", true);
    testInvoiceId = response.body.data.invoice.id;
  });

  test("DELETE /api/mobile?action=delete-invoice - Delete invoice", async () => {
    const response = await request(BASE_URL)
      .delete(`/api/mobile?action=delete-invoice&id=${testInvoiceId}`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("action", "delete-invoice");
    expect(response.body).toHaveProperty("message");
  });

  test("DELETE /api/mobile?action=delete-invoice - Delete non-existent invoice should fail", async () => {
    const response = await request(BASE_URL)
      .delete("/api/mobile?action=delete-invoice&id=nonexistent_id")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(404);

    expect(response.body).toHaveProperty("success", false);
    expect(response.body.error).toContain("not found");
  });

  test("DELETE /api/mobile?action=delete-invoice - Missing ID should fail", async () => {
    const response = await request(BASE_URL)
      .delete("/api/mobile?action=delete-invoice")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(400);

    expect(response.body).toHaveProperty("success", false);
    expect(response.body.error).toContain("required");
  });
});

describe("Finance API - Error Handling", () => {
  test("GET /api/mobile - Missing action parameter", async () => {
    const response = await request(BASE_URL)
      .get("/api/mobile")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(400);

    expect(response.body).toHaveProperty("success", false);
    expect(response.body).toHaveProperty("error");
  });

  test("POST /api/mobile - Invalid action", async () => {
    const response = await request(BASE_URL)
      .post("/api/mobile?action=invalid-action")
      .set("Authorization", `Bearer ${authToken}`)
      .send({})
      .expect(400);

    expect(response.body).toHaveProperty("success", false);
    expect(response.body).toHaveProperty("error");
    expect(response.body).toHaveProperty("valid_post_actions");
  });

  test("DELETE /api/mobile - Invalid action", async () => {
    const response = await request(BASE_URL)
      .delete("/api/mobile?action=invalid-action")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(400);

    expect(response.body).toHaveProperty("success", false);
    expect(response.body).toHaveProperty("error");
    expect(response.body).toHaveProperty("valid_delete_actions");
  });
});
