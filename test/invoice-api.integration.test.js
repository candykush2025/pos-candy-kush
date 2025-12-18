const request = require("supertest");

// Test against the deployed production API
const BASE_URL =
  process.env.TEST_BASE_URL || "https://pos-candy-kush.vercel.app";

// Test user credentials (should be set in environment variables)
const TEST_EMAIL = process.env.TEST_EMAIL || "test@example.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "testpassword";

describe("Invoice API Integration Tests", () => {
  // Increase timeout for API calls
  jest.setTimeout(30000);

  let authToken = null;
  let testInvoiceId = null;

  // Test data for creating invoices
  const validInvoiceData = {
    customer_name: "John Doe",
    date: "2024-12-15", // Past date for testing
    due_date: "2024-12-30", // After invoice date
    items: [
      {
        product_id: "test-product-1",
        product_name: "Test Product 1",
        quantity: 2,
        price: 25.0,
        total: 50.0,
      },
      {
        product_id: "test-product-2",
        product_name: "Test Product 2",
        quantity: 1,
        price: 30.0,
        total: 30.0,
      },
    ],
    total: 80.0,
  };

  beforeAll(async () => {
    // Login to get authentication token
    try {
      const loginResponse = await request(BASE_URL).post("/api/mobile").send({
        action: "login",
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      if (loginResponse.body.success) {
        authToken = loginResponse.body.token;
        console.log("Successfully logged in and got auth token");
      } else {
        console.warn(
          "Login failed, some tests may be skipped:",
          loginResponse.body.error
        );
      }
    } catch (error) {
      console.warn(
        "Login request failed, some tests may be skipped:",
        error.message
      );
    }
  });

  describe("Authentication", () => {
    test("should require authentication for invoice endpoints", async () => {
      const response = await request(BASE_URL)
        .get("/api/mobile?action=get-invoices")
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/authorization|token/i);
    });
  });

  describe("GET /api/mobile?action=get-invoices", () => {
    test("should return all invoices when authenticated", async () => {
      if (!authToken) return; // Skip if not authenticated

      const response = await request(BASE_URL)
        .get("/api/mobile?action=get-invoices")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.action).toBe("get-invoices");
      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("invoices");
      expect(Array.isArray(response.body.data.invoices)).toBe(true);

      // Validate invoice structure if invoices exist
      if (response.body.data.invoices.length > 0) {
        const invoice = response.body.data.invoices[0];
        expect(invoice).toHaveProperty("id");
        expect(invoice).toHaveProperty("number");
        expect(invoice).toHaveProperty("date");
        expect(invoice).toHaveProperty("customer_name");
        expect(invoice).toHaveProperty("items");
        expect(invoice).toHaveProperty("total");
        expect(Array.isArray(invoice.items)).toBe(true);
      }
    });

    test("should include due_date field in invoice responses", async () => {
      if (!authToken) return; // Skip if not authenticated

      const response = await request(BASE_URL)
        .get("/api/mobile?action=get-invoices")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Check if any invoices have due_date (some may not have it set)
      const invoicesWithDueDate = response.body.data.invoices.filter(
        (inv) => inv.due_date
      );
      if (invoicesWithDueDate.length > 0) {
        expect(invoicesWithDueDate[0]).toHaveProperty("due_date");
        expect(typeof invoicesWithDueDate[0].due_date).toBe("string");
      }
    });
  });

  describe("GET /api/mobile?action=get-invoice&id={id}", () => {
    test("should return error for missing invoice ID", async () => {
      if (!authToken) return; // Skip if not authenticated

      const response = await request(BASE_URL)
        .get("/api/mobile?action=get-invoice")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/Invoice ID is required/i);
    });

    test("should return error for non-existent invoice ID", async () => {
      if (!authToken) return; // Skip if not authenticated

      const response = await request(BASE_URL)
        .get("/api/mobile?action=get-invoice&id=non-existent-id")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200); // API returns 200 with error in body

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/not found/i);
    });

    test("should return single invoice when valid ID provided", async () => {
      if (!authToken) return; // Skip if not authenticated

      // First get all invoices to find a valid ID
      const listResponse = await request(BASE_URL)
        .get("/api/mobile?action=get-invoices")
        .set("Authorization", `Bearer ${authToken}`);

      if (
        listResponse.body.success &&
        listResponse.body.data.invoices.length > 0
      ) {
        const invoiceId = listResponse.body.data.invoices[0].id;

        const response = await request(BASE_URL)
          .get(`/api/mobile?action=get-invoice&id=${invoiceId}`)
          .set("Authorization", `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.action).toBe("get-invoice");
        expect(response.body.data).toHaveProperty("invoice");

        const invoice = response.body.data.invoice;
        expect(invoice.id).toBe(invoiceId);
        expect(invoice).toHaveProperty("number");
        expect(invoice).toHaveProperty("date");
        expect(invoice).toHaveProperty("customer_name");
        expect(invoice).toHaveProperty("items");
        expect(invoice).toHaveProperty("total");
        expect(invoice).toHaveProperty("created_at");
        expect(invoice).toHaveProperty("updated_at");

        // Store for later tests
        testInvoiceId = invoiceId;
      }
    });

    test("should include due_date field in single invoice response", async () => {
      if (!authToken || !testInvoiceId) return; // Skip if not authenticated or no test invoice

      const response = await request(BASE_URL)
        .get(`/api/mobile?action=get-invoice&id=${testInvoiceId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const invoice = response.body.data.invoice;
      expect(invoice).toHaveProperty("due_date");
      // due_date can be null if not set
    });
  });

  describe("POST /api/mobile?action=create-invoice", () => {
    test("should create invoice with valid data", async () => {
      if (!authToken) return; // Skip if not authenticated

      const response = await request(BASE_URL)
        .post("/api/mobile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          action: "create-invoice",
          ...validInvoiceData,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.action).toBe("create-invoice");
      expect(response.body.data).toHaveProperty("invoice");

      const invoice = response.body.data.invoice;
      expect(invoice).toHaveProperty("id");
      expect(invoice).toHaveProperty("number");
      expect(invoice).toHaveProperty(
        "customer_name",
        validInvoiceData.customer_name
      );
      expect(invoice).toHaveProperty("date", validInvoiceData.date);
      expect(invoice).toHaveProperty("due_date", validInvoiceData.due_date);
      expect(invoice).toHaveProperty("items");
      expect(invoice).toHaveProperty("total", validInvoiceData.total);
      expect(invoice).toHaveProperty("created_at");

      // Store the created invoice ID for later tests
      testInvoiceId = invoice.id;
    });

    test("should create invoice without due_date (optional field)", async () => {
      if (!authToken) return; // Skip if not authenticated

      const invoiceWithoutDueDate = {
        ...validInvoiceData,
        due_date: undefined, // Remove due_date
      };

      const response = await request(BASE_URL)
        .post("/api/mobile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          action: "create-invoice",
          ...invoiceWithoutDueDate,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      const invoice = response.body.data.invoice;
      expect(invoice.due_date).toBeNull(); // Should be null when not provided
    });

    test("should validate required fields", async () => {
      if (!authToken) return; // Skip if not authenticated

      const requiredFields = ["customer_name", "date", "items", "total"];

      for (const field of requiredFields) {
        const invalidData = { ...validInvoiceData };
        delete invalidData[field];

        const response = await request(BASE_URL)
          .post("/api/mobile")
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            action: "create-invoice",
            ...invalidData,
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toMatch(
          new RegExp(field.replace("_", " "), "i")
        );
      }
    });

    test("should validate due_date is after invoice date", async () => {
      if (!authToken) return; // Skip if not authenticated

      const invalidData = {
        ...validInvoiceData,
        due_date: "2024-12-10", // Before invoice date (2024-12-15)
      };

      const response = await request(BASE_URL)
        .post("/api/mobile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          action: "create-invoice",
          ...invalidData,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/due date must be after/i);
    });

    test("should validate invoice date is not in future", async () => {
      if (!authToken) return; // Skip if not authenticated

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1); // Tomorrow
      const futureDateString = futureDate.toISOString().split("T")[0];

      const invalidData = {
        ...validInvoiceData,
        date: futureDateString,
      };

      const response = await request(BASE_URL)
        .post("/api/mobile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          action: "create-invoice",
          ...invalidData,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/cannot be in the future/i);
    });

    test("should validate item totals match quantity × price", async () => {
      if (!authToken) return; // Skip if not authenticated

      const invalidData = {
        ...validInvoiceData,
        items: [
          {
            product_id: "test-product-1",
            product_name: "Test Product 1",
            quantity: 2,
            price: 25.0,
            total: 60.0, // Should be 50.00 (2 × 25.00)
          },
        ],
        total: 60.0,
      };

      const response = await request(BASE_URL)
        .post("/api/mobile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          action: "create-invoice",
          ...invalidData,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/total does not match/i);
    });

    test("should validate invoice total matches sum of item totals", async () => {
      if (!authToken) return; // Skip if not authenticated

      const invalidData = {
        ...validInvoiceData,
        total: 100.0, // Should be 80.00
      };

      const response = await request(BASE_URL)
        .post("/api/mobile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          action: "create-invoice",
          ...invalidData,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/total does not match sum/i);
    });
  });

  describe("POST /api/mobile?action=edit-invoice", () => {
    test("should update invoice with valid data", async () => {
      if (!authToken || !testInvoiceId) return; // Skip if not authenticated or no test invoice

      const updateData = {
        id: testInvoiceId,
        customer_name: "Jane Smith", // Changed
        date: "2024-12-16", // Changed
        due_date: "2024-12-31", // Changed
        items: [
          {
            product_id: "test-product-1",
            product_name: "Updated Product 1",
            quantity: 3, // Changed
            price: 20.0, // Changed
            total: 60.0, // 3 × 20.00
          },
        ],
        total: 60.0, // Changed
      };

      const response = await request(BASE_URL)
        .post("/api/mobile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          action: "edit-invoice",
          ...updateData,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.action).toBe("edit-invoice");
      expect(response.body.data).toHaveProperty("invoice");

      const invoice = response.body.data.invoice;
      expect(invoice.id).toBe(testInvoiceId);
      expect(invoice.customer_name).toBe(updateData.customer_name);
      expect(invoice.date).toBe(updateData.date);
      expect(invoice.due_date).toBe(updateData.due_date);
      expect(invoice.total).toBe(updateData.total);
      expect(invoice).toHaveProperty("updated_at");
    });

    test("should validate invoice ID is required", async () => {
      if (!authToken) return; // Skip if not authenticated

      const response = await request(BASE_URL)
        .post("/api/mobile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          action: "edit-invoice",
          customer_name: "Test Customer",
          date: "2024-12-15",
          items: validInvoiceData.items,
          total: validInvoiceData.total,
          // Missing id
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/ID is required/i);
    });

    test("should validate due_date is after invoice date when updating", async () => {
      if (!authToken || !testInvoiceId) return; // Skip if not authenticated or no test invoice

      const invalidUpdate = {
        id: testInvoiceId,
        customer_name: "Test Customer",
        date: "2024-12-15",
        due_date: "2024-12-10", // Before invoice date
        items: validInvoiceData.items,
        total: validInvoiceData.total,
      };

      const response = await request(BASE_URL)
        .post("/api/mobile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          action: "edit-invoice",
          ...invalidUpdate,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/due date must be after/i);
    });

    test("should handle non-existent invoice ID", async () => {
      if (!authToken) return; // Skip if not authenticated

      const response = await request(BASE_URL)
        .post("/api/mobile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          action: "edit-invoice",
          id: "non-existent-id",
          customer_name: "Test Customer",
          date: "2024-12-15",
          items: validInvoiceData.items,
          total: validInvoiceData.total,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/not found/i);
    });
  });

  describe("Integration Tests", () => {
    test("should create, read, update, and verify invoice lifecycle", async () => {
      if (!authToken) return; // Skip if not authenticated

      // 1. Create invoice
      const createResponse = await request(BASE_URL)
        .post("/api/mobile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          action: "create-invoice",
          ...validInvoiceData,
        })
        .expect(201);

      const createdInvoice = createResponse.body.data.invoice;
      const invoiceId = createdInvoice.id;

      // 2. Read invoice (get single)
      const getResponse = await request(BASE_URL)
        .get(`/api/mobile?action=get-invoice&id=${invoiceId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.data.invoice.id).toBe(invoiceId);
      expect(getResponse.body.data.invoice.due_date).toBe(
        validInvoiceData.due_date
      );

      // 3. Update invoice
      const updateData = {
        id: invoiceId,
        customer_name: "Updated Customer",
        date: validInvoiceData.date,
        due_date: "2025-01-15", // New due date
        items: validInvoiceData.items,
        total: validInvoiceData.total,
      };

      const updateResponse = await request(BASE_URL)
        .post("/api/mobile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          action: "edit-invoice",
          ...updateData,
        })
        .expect(200);

      expect(updateResponse.body.data.invoice.customer_name).toBe(
        updateData.customer_name
      );
      expect(updateResponse.body.data.invoice.due_date).toBe(
        updateData.due_date
      );

      // 4. Verify in list
      const listResponse = await request(BASE_URL)
        .get("/api/mobile?action=get-invoices")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      const foundInvoice = listResponse.body.data.invoices.find(
        (inv) => inv.id === invoiceId
      );
      expect(foundInvoice).toBeDefined();
      expect(foundInvoice.customer_name).toBe(updateData.customer_name);
      expect(foundInvoice.due_date).toBe(updateData.due_date);
    });
  });
});
