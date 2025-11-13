import { create } from "zustand";
import { nanoid } from "nanoid";

export const useCartStore = create((set, get) => ({
  items: [],
  discount: { type: "percentage", value: 0 },
  tax: { rate: 0, amount: 0 },
  customer: null,
  notes: "",
  kioskOrderId: null, // Store kiosk order ID for later update

  // Add item to cart
  addItem: (product, quantity = 1) => {
    const { items, customer } = get();
    const existingItem = items.find((item) => item.productId === product.id);

    // Determine price to use (member price if available and customer is attached)
    const hasCustomer = !!customer;
    const hasMemberPrice =
      product.source === "kiosk" &&
      product.memberPrice &&
      product.memberPrice < product.price;
    const usePrice =
      hasCustomer && hasMemberPrice ? product.memberPrice : product.price;

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
      get().syncCartToAPI();
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
        price: usePrice, // Use member price if applicable
        originalPrice: product.price, // Keep original for reference
        memberPrice: product.memberPrice || null,
        source: product.source || null,
        quantity,
        discount: 0,
        total: usePrice * quantity,
        barcode: product.barcode,
        sku: product.sku,
        cost: product.cost || 0, // For Loyverse sync
        soldBy: product.soldBy || "unit", // Track if sold by weight or unit
      };
      set({ items: [...items, newItem] });
      get().syncCartToAPI();
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
    get().syncCartToAPI();
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
    get().syncCartToAPI();
  },

  // Remove item from cart
  removeItem: (itemId) => {
    const { items } = get();
    set({ items: items.filter((item) => item.id !== itemId) });
    get().syncCartToAPI();
  },

  // Clear cart
  clearCart: () => {
    set({
      items: [],
      discount: { type: "percentage", value: 0 },
      tax: { rate: 0, amount: 0 },
      customer: null,
      notes: "",
      kioskOrderId: null,
    });
    get().syncCartToAPI();
  },

  // Set cart discount
  setDiscount: (type, value) => {
    set({ discount: { type, value } });
    get().syncCartToAPI();
  },

  // Set tax
  setTax: (rate) => {
    const subtotal = get().getSubtotal();
    const amount = (subtotal * rate) / 100;
    set({ tax: { rate, amount } });
    get().syncCartToAPI();
  },

  // Set customer
  setCustomer: (customer) => {
    set({ customer });
    get().syncCartToAPI();
  },

  // Set notes
  setNotes: (notes) => {
    set({ notes });
    get().syncCartToAPI();
  },

  // Set kiosk order ID
  setKioskOrderId: (orderId) => {
    set({ kioskOrderId: orderId });
    get().syncCartToAPI();
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
      kioskOrderId: cartData.kioskOrderId || null,
    });
    get().syncCartToAPI();
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
      kioskOrderId: state.kioskOrderId,
      subtotal: state.getSubtotal(),
      discountAmount: state.getDiscountAmount(),
      total: state.getTotal(),
    };
  },

  // Sync cart to API
  syncCartToAPI: async () => {
    const cartData = get().getCartData();
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cartData),
      });
      if (!response.ok) {
        console.error("Failed to sync cart to API");
      }
    } catch (error) {
      console.error("Error syncing cart to API:", error);
    }
  },

  // Process payment and clear cart
  processPayment: async (paymentData) => {
    try {
      const response = await fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "process_payment",
          paymentData,
        }),
      });
      if (response.ok) {
        // Clear cart locally after successful API call
        set({
          items: [],
          discount: { type: "percentage", value: 0 },
          tax: { rate: 0, amount: 0 },
          customer: null,
          notes: "",
          kioskOrderId: null,
        });
      } else {
        console.error("Failed to process payment via API");
      }
    } catch (error) {
      console.error("Error processing payment:", error);
    }
  },
}));

// Initialize API cart on store creation (e.g., on page load/refresh)
useCartStore.getState().syncCartToAPI();

export default useCartStore;
