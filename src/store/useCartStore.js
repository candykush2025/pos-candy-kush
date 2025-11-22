import { create } from "zustand";
import { nanoid } from "nanoid";

export const useCartStore = create((set, get) => ({
  items: [],
  discounts: [], // Changed to array to support multiple discounts
  discount: { type: "percentage", value: 0 }, // Keep for backward compatibility
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
      discounts: [],
      discount: { type: "percentage", value: 0 },
      tax: { rate: 0, amount: 0 },
      customer: null,
      notes: "",
      kioskOrderId: null,
    });
    get().syncCartToAPI();
  },

  // Add a discount (supports multiple)
  addDiscount: (discount) => {
    const { discounts } = get();
    const newDiscount = {
      id:
        discount.id ||
        `discount-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: discount.name || "Discount",
      type: discount.type, // "percentage" or "amount"
      value: discount.value,
      isCustom: discount.isCustom || false,
    };
    set({ discounts: [...discounts, newDiscount] });
    get().syncCartToAPI();
  },

  // Remove a specific discount
  removeDiscount: (discountId) => {
    const { discounts } = get();
    set({ discounts: discounts.filter((d) => d.id !== discountId) });
    get().syncCartToAPI();
  },

  // Clear all discounts
  clearDiscounts: () => {
    set({ discounts: [] });
    get().syncCartToAPI();
  },

  // Set cart discount (legacy - for backward compatibility)
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

  // Calculate discount amount (supports multiple discounts)
  getDiscountAmount: () => {
    const { discounts } = get();
    const subtotal = get().getSubtotal();

    // Calculate total discount from all discounts
    let totalDiscount = 0;
    let remainingSubtotal = subtotal;

    // Apply discounts sequentially (percentage discounts apply to remaining amount)
    discounts.forEach((discount) => {
      if (discount.type === "percentage") {
        const discountAmount = (remainingSubtotal * discount.value) / 100;
        totalDiscount += discountAmount;
        remainingSubtotal -= discountAmount;
      } else {
        // Fixed amount discount
        const discountAmount = Math.min(discount.value, remainingSubtotal);
        totalDiscount += discountAmount;
        remainingSubtotal -= discountAmount;
      }
    });

    return totalDiscount;
  },

  // Calculate total
  getTotal: () => {
    const subtotal = get().getSubtotal();
    const discountAmount = get().getDiscountAmount();
    const { tax } = get();
    const total = subtotal - discountAmount + tax.amount;

    return total;
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
      discounts: cartData.discounts || [],
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
    const subtotal = state.getSubtotal();
    const discountAmount = state.getDiscountAmount();
    const total = state.getTotal();

    return {
      items: state.items,
      discounts: state.discounts,
      discount: state.discount,
      tax: state.tax,
      customer: state.customer,
      notes: state.notes,
      kioskOrderId: state.kioskOrderId,
      subtotal,
      discountAmount,
      total,
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

  // Generate receipt data for thermal printing
  generateReceiptData: (paymentData) => {
    const { items, discounts, discount, tax, customer, notes } = get();

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);

    // Calculate total discount from multiple discounts
    const discountAmount = get().getDiscountAmount();
    const discountedSubtotal = subtotal - discountAmount;
    const taxAmount =
      tax.rate > 0 ? discountedSubtotal * (tax.rate / 100) : tax.amount;
    const total = discountedSubtotal + taxAmount;

    // Format receipt data
    let receipt = "CANDY KUSH POS\n";
    receipt += "================\n";
    receipt += new Date().toLocaleString() + "\n\n";

    if (customer) {
      receipt += `Customer: ${customer.name}\n`;
      if (customer.phone) receipt += `Phone: ${customer.phone}\n`;
      receipt += "\n";
    }

    receipt += "ITEMS:\n";
    receipt += "----------------\n";

    items.forEach((item) => {
      receipt += `${item.name}\n`;
      receipt += `  ${item.quantity} x $${item.price.toFixed(2)}`;
      if (item.discount > 0) {
        receipt += ` -$${item.discount.toFixed(2)}`;
      }
      receipt += ` = $${item.total.toFixed(2)}\n`;
      if (item.barcode) {
        receipt += `  SKU: ${item.barcode}\n`;
      }
      receipt += "\n";
    });

    receipt += "----------------\n";
    receipt += `Subtotal: $${subtotal.toFixed(2)}\n`;

    if (discountAmount > 0) {
      // Show individual discounts if multiple
      if (discounts && discounts.length > 0) {
        discounts.forEach((disc) => {
          const discValue =
            disc.type === "percentage"
              ? `${disc.value}%`
              : `$${disc.value.toFixed(2)}`;
          receipt += `  ${disc.name} (${discValue})\n`;
        });
      }
      receipt += `Total Discount: -$${discountAmount.toFixed(2)}\n`;
    }

    if (taxAmount > 0) {
      receipt += `Tax: $${taxAmount.toFixed(2)}\n`;
    }

    receipt += `TOTAL: $${total.toFixed(2)}\n\n`;

    receipt += `Payment: ${paymentData.method}\n`;
    if (paymentData.transactionId) {
      receipt += `Transaction ID: ${paymentData.transactionId}\n`;
    }

    if (notes) {
      receipt += `\nNotes: ${notes}\n`;
    }

    receipt += "\nThank you for your business!\n";
    receipt += "================\n";

    return receipt;
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
        // Generate receipt data before clearing cart
        const receiptData = get().generateReceiptData(paymentData);

        // Send receipt to thermal print API
        try {
          await fetch("/api/print", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              data: receiptData,
            }),
          });
        } catch (printError) {
          console.error("Failed to send receipt to printer:", printError);
          // Don't fail the payment if printing fails
        }

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
