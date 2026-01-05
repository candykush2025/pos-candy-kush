const { useCartStore } = require("../../src/store/useCartStore");

describe("Cart Store addItem", () => {
  afterEach(() => {
    // Reset cart to avoid test interference
    useCartStore.getState().clearCart();
  });

  test("adds item with categoryId and categoryName when product provides them", () => {
    const product = {
      id: "p-1",
      name: "Test Product",
      price: 100,
      categoryId: "cat-123",
      categoryName: "Test Categories",
    };

    useCartStore.getState().addItem(product, 1);

    const items = useCartStore.getState().items;
    expect(items.length).toBe(1);
    expect(items[0].categoryId).toBe("cat-123");
    expect(items[0].categoryName).toBe("Test Categories");
  });
});
