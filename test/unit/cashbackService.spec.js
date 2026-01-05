const {
  cashbackRulesService,
} = require("../../src/lib/firebase/cashbackService");

describe("cashbackService.calculateItemCashback", () => {
  const categoryRule = {
    id: "r1",
    name: "Test Cashback",
    type: "category",
    targetId: "cat-123",
    cashbackType: "percentage",
    cashbackValue: 10,
    isActive: true,
    hasMinimumOrder: false,
  };

  test("applies category rule when item has categoryId", () => {
    const item = {
      productId: "p1",
      categoryId: "cat-123",
      price: 100,
      quantity: 1,
    };
    const result = cashbackRulesService.calculateItemCashback(
      item,
      [categoryRule],
      100
    );
    expect(result.points).toBeGreaterThan(0);
    expect(result.ruleApplied).toBeTruthy();
    expect(result.ruleApplied.name).toBe("Test Cashback");
  });

  test("does not apply category rule when item lacks categoryId", () => {
    const item = { productId: "p1", price: 100, quantity: 1 };
    const result = cashbackRulesService.calculateItemCashback(
      item,
      [categoryRule],
      100
    );
    expect(result.points).toBe(0);
    expect(result.ruleApplied).toBeNull();
  });
});
