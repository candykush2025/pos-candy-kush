import { create } from "zustand";
import { nanoid } from "nanoid";

export const useCartStore = create((set, get) => ({
  items: [],
  discount: { type: "percentage", value: 0 },
  tax: { rate: 0, amount: 0 },
  customer: null,
  notes: "",

  // Add item to cart
  addItem: (product, quantity = 1) => {
    const { items } = get();
    const existingItem = items.find((item) => item.productId === product.id);

    if (existingItem) {
      // Update quantity if item exists
      set({
        items: items.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
                total:
                  (item.price - item.discount) * (item.quantity + quantity),
              }
            : item
        ),
      });
    } else {
      // Add new item
      // Extract variant_id from product (Loyverse format)
      let variantId = null;
      if (product.variant_id) {
        variantId = product.variant_id;
      } else if (product.variants && product.variants.length > 0) {
        // Get first variant's ID
        variantId = product.variants[0].variant_id || product.variants[0].id;
      }

      const newItem = {
        id: nanoid(),
        productId: product.id,
        variantId: variantId, // Loyverse variant_id
        name: product.name,
        price: product.price,
        quantity,
        discount: 0,
        total: product.price * quantity,
        barcode: product.barcode,
        sku: product.sku,
        cost: product.cost || 0, // For Loyverse sync
      };
      set({ items: [...items, newItem] });
    }
  },

  // Update item quantity
  updateQuantity: (itemId, quantity) => {
    const { items } = get();
    if (quantity <= 0) {
      get().removeItem(itemId);
      return;
    }

    set({
      items: items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity,
              total: (item.price - item.discount) * quantity,
            }
          : item
      ),
    });
  },

  // Update item discount
  updateItemDiscount: (itemId, discount) => {
    const { items } = get();
    set({
      items: items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              discount,
              total: (item.price - discount) * item.quantity,
            }
          : item
      ),
    });
  },

  // Remove item from cart
  removeItem: (itemId) => {
    const { items } = get();
    set({ items: items.filter((item) => item.id !== itemId) });
  },

  // Clear cart
  clearCart: () => {
    set({
      items: [],
      discount: { type: "percentage", value: 0 },
      tax: { rate: 0, amount: 0 },
      customer: null,
      notes: "",
    });
  },

  // Set cart discount
  setDiscount: (type, value) => {
    set({ discount: { type, value } });
  },

  // Set tax
  setTax: (rate) => {
    const subtotal = get().getSubtotal();
    const amount = (subtotal * rate) / 100;
    set({ tax: { rate, amount } });
  },

  // Set customer
  setCustomer: (customer) => {
    set({ customer });
  },

  // Set notes
  setNotes: (notes) => {
    set({ notes });
  },

  // Calculate subtotal
  getSubtotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => sum + item.total, 0);
  },

  // Calculate discount amount
  getDiscountAmount: () => {
    const { discount } = get();
    const subtotal = get().getSubtotal();

    if (discount.type === "percentage") {
      return (subtotal * discount.value) / 100;
    }
    return discount.value;
  },

  // Calculate total
  getTotal: () => {
    const subtotal = get().getSubtotal();
    const discountAmount = get().getDiscountAmount();
    const { tax } = get();
    return subtotal - discountAmount + tax.amount;
  },

  // Get item count
  getItemCount: () => {
    const { items } = get();
    return items.reduce((sum, item) => sum + item.quantity, 0);
  },

  // Load cart from saved state
  loadCart: (cartData) => {
    set({
      items: cartData.items || [],
      discount: cartData.discount || { type: "percentage", value: 0 },
      tax: cartData.tax || { rate: 0, amount: 0 },
      customer: cartData.customer || null,
      notes: cartData.notes || "",
    });
  },

  // Get cart data for saving
  getCartData: () => {
    const state = get();
    return {
      items: state.items,
      discount: state.discount,
      tax: state.tax,
      customer: state.customer,
      notes: state.notes,
      subtotal: state.getSubtotal(),
      discountAmount: state.getDiscountAmount(),
      total: state.getTotal(),
    };
  },
}));

export default useCartStore;
