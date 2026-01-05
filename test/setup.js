// Test setup
process.env.NODE_ENV = "test";

// Set test environment variables
process.env.LOYVERSE_ACCESS_TOKEN = "test_token";

// Mock Firebase if needed
jest.mock("@/lib/firebase/firestore", () => ({
  receiptsService: {
    getAll: jest.fn(() =>
      Promise.resolve([
        {
          id: "receipt_1",
          totalMoney: 100.0,
          total_money: 100.0,
          receiptType: "SALE",
          receipt_date: new Date(),
          created_at: new Date(),
          employeeId: "emp_1",
          employee_id: "emp_1",
          lineItems: [
            {
              item_id: "item_1",
              itemId: "item_1",
              item_name: "Test Item",
              quantity: 2,
              price: 50.0,
              line_total: 100.0,
              cost: 30.0,
              item_cost: 30.0,
            },
          ],
        },
      ])
    ),
  },
  productsService: {
    getAll: jest.fn(() =>
      Promise.resolve([
        {
          id: "item_1",
          name: "Test Item",
          category: "Test Category",
          category_name: "Test Category",
          sku: "TEST001",
          price: 50.0,
          cost: 30.0,
          variants: [],
          in_stock: 10,
          inStock: 10,
        },
      ])
    ),
  },
  categoriesService: {
    getAll: jest.fn(() =>
      Promise.resolve([
        {
          id: "cat_1",
          name: "Test Category",
        },
      ])
    ),
  },
  getDocuments: jest.fn(() =>
    Promise.resolve([
      {
        id: "emp_1",
        name: "Test Employee",
        email: "test@example.com",
      },
    ])
  ),
}));
