const request = require("supertest");

// Test against the actual running Next.js development server
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3001";

describe("Mobile API Integration Tests", () => {
  // Increase timeout for API calls
  jest.setTimeout(30000);

  describe("API Structure Validation", () => {
    test("should return error for missing action", async () => {
      const response = await request(BASE_URL).get("/api/mobile").expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(
        /Invalid or missing action parameter/
      );
      expect(response.body).toHaveProperty("valid_actions");
    });

    test("should return error for invalid action", async () => {
      const response = await request(BASE_URL)
        .get("/api/mobile?action=invalid_action")
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(
        /Invalid or missing action parameter/
      );
    });

    test("should have CORS headers", async () => {
      const response = await request(BASE_URL)
        .get("/api/mobile?action=stock")
        .expect(200);

      expect(response.headers["access-control-allow-origin"]).toBe("*");
      expect(response.headers["access-control-allow-methods"]).toBe(
        "GET, OPTIONS"
      );
      expect(response.headers["access-control-allow-headers"]).toContain(
        "Content-Type"
      );
    });
  });

  describe("Sales Summary Endpoint", () => {
    const periods = ["today", "this_week", "this_month", "this_year"];

    periods.forEach((period) => {
      test(`should return sales summary for period: ${period}`, async () => {
        const response = await request(BASE_URL)
          .get(`/api/mobile?action=sales-summary&period=${period}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.action).toBe("sales-summary");
        expect(response.body).toHaveProperty("data");
        expect(response.body).toHaveProperty("filters");
        expect(response.body).toHaveProperty("generated_at");

        // Validate data structure
        expect(response.body.data).toHaveProperty("period");
        expect(response.body.data).toHaveProperty("metrics");
        expect(response.body.data).toHaveProperty("transactions");

        // Validate metrics
        const metrics = response.body.data.metrics;
        expect(metrics).toHaveProperty("gross_sales");
        expect(metrics).toHaveProperty("net_sales");
        expect(metrics).toHaveProperty("refunds");
        expect(metrics).toHaveProperty("discounts");
        expect(metrics).toHaveProperty("taxes");
        expect(metrics).toHaveProperty("cost_of_goods");
        expect(metrics).toHaveProperty("gross_profit");
        expect(metrics).toHaveProperty("profit_margin");

        // Validate transactions
        const transactions = response.body.data.transactions;
        expect(transactions).toHaveProperty("total_count");
        expect(transactions).toHaveProperty("refund_count");
        expect(transactions).toHaveProperty("average_value");
        expect(transactions).toHaveProperty("items_sold");

        // Validate all values are numbers
        Object.values(metrics).forEach((value) => {
          expect(typeof value).toBe("number");
        });
        Object.values(transactions).forEach((value) => {
          expect(typeof value).toBe("number");
        });
      });
    });

    test("should handle custom date range", async () => {
      const startDate = "2024-01-01";
      const endDate = "2024-12-31";

      const response = await request(BASE_URL)
        .get(
          `/api/mobile?action=sales-summary&period=custom&start_date=${startDate}&end_date=${endDate}`
        )
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.action).toBe("sales-summary");
      // Check that period object exists and has from/to dates
      expect(response.body.data.period).toHaveProperty("from");
      expect(response.body.data.period).toHaveProperty("to");
      expect(typeof response.body.data.period.from).toBe("string");
      expect(typeof response.body.data.period.to).toBe("string");
    });

    test("should reject custom period without required dates", async () => {
      const response = await request(BASE_URL)
        .get("/api/mobile?action=sales-summary&period=custom")
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain(
        "start_date and end_date are required"
      );
    });

    test("should handle employee filtering", async () => {
      const response = await request(BASE_URL)
        .get(
          "/api/mobile?action=sales-summary&period=today&employee_ids=test_emp_1,test_emp_2"
        )
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.filters.employee_ids).toEqual([
        "test_emp_1",
        "test_emp_2",
      ]);
    });
  });

  describe("Sales by Item Endpoint", () => {
    test("should return sales by item data", async () => {
      const response = await request(BASE_URL)
        .get("/api/mobile?action=sales-by-item&period=this_month")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.action).toBe("sales-by-item");
      expect(response.body.data).toHaveProperty("items");
      expect(response.body.data).toHaveProperty("totals");
      expect(response.body.data).toHaveProperty("period");

      // Validate items array
      expect(Array.isArray(response.body.data.items)).toBe(true);

      if (response.body.data.items.length > 0) {
        const item = response.body.data.items[0];
        expect(item).toHaveProperty("item_id");
        expect(item).toHaveProperty("item_name");
        expect(item).toHaveProperty("category");
        expect(item).toHaveProperty("quantity_sold");
        expect(item).toHaveProperty("gross_sales");
        expect(item).toHaveProperty("net_sales");
        expect(item).toHaveProperty("cost_of_goods");
        expect(item).toHaveProperty("gross_profit");
        expect(item).toHaveProperty("profit_margin");
      }

      // Validate totals
      const totals = response.body.data.totals;
      expect(totals).toHaveProperty("total_quantity");
      expect(totals).toHaveProperty("total_gross_sales");
      expect(totals).toHaveProperty("total_net_sales");
      expect(totals).toHaveProperty("total_cost");
      expect(totals).toHaveProperty("total_profit");
      expect(totals).toHaveProperty("item_count");
    });
  });

  describe("Sales by Category Endpoint", () => {
    test("should return sales by category data", async () => {
      const response = await request(BASE_URL)
        .get("/api/mobile?action=sales-by-category&period=this_month")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.action).toBe("sales-by-category");
      expect(response.body.data).toHaveProperty("categories");
      expect(response.body.data).toHaveProperty("totals");

      // Validate categories array
      expect(Array.isArray(response.body.data.categories)).toBe(true);

      if (response.body.data.categories.length > 0) {
        const category = response.body.data.categories[0];
        expect(category).toHaveProperty("category_id");
        expect(category).toHaveProperty("category_name");
        expect(category).toHaveProperty("quantity_sold");
        expect(category).toHaveProperty("gross_sales");
        expect(category).toHaveProperty("net_sales");
        expect(category).toHaveProperty("cost_of_goods");
        expect(category).toHaveProperty("gross_profit");
        expect(category).toHaveProperty("percentage_of_sales");
      }

      // Validate totals
      const totals = response.body.data.totals;
      expect(totals).toHaveProperty("total_categories");
      expect(totals).toHaveProperty("total_gross_sales");
      expect(totals).toHaveProperty("total_items_sold");
    });
  });

  describe("Sales by Employee Endpoint", () => {
    test("should return sales by employee data", async () => {
      const response = await request(BASE_URL)
        .get("/api/mobile?action=sales-by-employee&period=today")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.action).toBe("sales-by-employee");
      expect(response.body.data).toHaveProperty("employees");
      expect(response.body.data).toHaveProperty("totals");

      // Validate employees array
      expect(Array.isArray(response.body.data.employees)).toBe(true);

      if (response.body.data.employees.length > 0) {
        const employee = response.body.data.employees[0];
        expect(employee).toHaveProperty("employee_id");
        expect(employee).toHaveProperty("employee_name");
        expect(employee).toHaveProperty("gross_sales");
        expect(employee).toHaveProperty("net_sales");
        expect(employee).toHaveProperty("refunds");
        expect(employee).toHaveProperty("discounts");
        expect(employee).toHaveProperty("transaction_count");
        expect(employee).toHaveProperty("items_sold");
        expect(employee).toHaveProperty("average_transaction");
      }

      // Validate totals
      const totals = response.body.data.totals;
      expect(totals).toHaveProperty("total_gross_sales");
      expect(totals).toHaveProperty("total_net_sales");
      expect(totals).toHaveProperty("total_transactions");
      expect(totals).toHaveProperty("total_items_sold");
      expect(totals).toHaveProperty("employee_count");
    });
  });

  describe("Stock/Inventory Endpoint", () => {
    test("should return stock data", async () => {
      const response = await request(BASE_URL)
        .get("/api/mobile?action=stock")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.action).toBe("stock");
      expect(response.body.data).toHaveProperty("items");
      expect(response.body.data).toHaveProperty("summary");

      // Validate items array
      expect(Array.isArray(response.body.data.items)).toBe(true);

      if (response.body.data.items.length > 0) {
        const item = response.body.data.items[0];
        expect(item).toHaveProperty("product_id");
        expect(item).toHaveProperty("product_name");
        expect(item).toHaveProperty("sku");
        expect(item).toHaveProperty("category");
        expect(item).toHaveProperty("current_stock");
        expect(item).toHaveProperty("low_stock_threshold");
        expect(item).toHaveProperty("is_low_stock");
        expect(item).toHaveProperty("is_out_of_stock");
        expect(item).toHaveProperty("price");
        expect(item).toHaveProperty("cost");
        expect(item).toHaveProperty("stock_value");
      }

      // Validate summary
      const summary = response.body.data.summary;
      expect(summary).toHaveProperty("total_products");
      expect(summary).toHaveProperty("out_of_stock_count");
      expect(summary).toHaveProperty("low_stock_count");
      expect(summary).toHaveProperty("in_stock_count");
      expect(summary).toHaveProperty("total_stock_value");
      expect(summary).toHaveProperty("total_units");

      // Validate convenience arrays
      expect(response.body.data).toHaveProperty("out_of_stock");
      expect(response.body.data).toHaveProperty("low_stock");
      expect(Array.isArray(response.body.data.out_of_stock)).toBe(true);
      expect(Array.isArray(response.body.data.low_stock)).toBe(true);
    });
  });

  describe("OPTIONS request (CORS preflight)", () => {
    test("should handle OPTIONS request", async () => {
      const response = await request(BASE_URL)
        .options("/api/mobile")
        .expect(200);

      expect(response.headers["access-control-allow-origin"]).toBe("*");
      expect(response.headers["access-control-allow-methods"]).toBe(
        "GET, OPTIONS"
      );
    });
  });
});
