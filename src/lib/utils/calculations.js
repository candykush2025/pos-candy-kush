/**
 * Calculate item total
 */
export const calculateItemTotal = (price, quantity, discount = 0) => {
  const subtotal = price * quantity;
  return subtotal - discount;
};

/**
 * Calculate cart subtotal
 */
export const calculateSubtotal = (items) => {
  return items.reduce((sum, item) => sum + item.total, 0);
};

/**
 * Calculate discount amount
 */
export const calculateDiscountAmount = (subtotal, discount) => {
  if (discount.type === "percentage") {
    return (subtotal * discount.value) / 100;
  }
  return discount.value;
};

/**
 * Calculate tax amount
 */
export const calculateTaxAmount = (subtotal, taxRate) => {
  return (subtotal * taxRate) / 100;
};

/**
 * Calculate total
 */
export const calculateTotal = (subtotal, discountAmount, taxAmount) => {
  return subtotal - discountAmount + taxAmount;
};

/**
 * Calculate change
 */
export const calculateChange = (total, amountPaid) => {
  return Math.max(0, amountPaid - total);
};

/**
 * Apply discount to item
 */
export const applyItemDiscount = (item, discount) => {
  const discountAmount =
    discount.type === "percentage"
      ? (item.price * discount.value) / 100
      : discount.value;

  return {
    ...item,
    discount: discountAmount,
    total: (item.price - discountAmount) * item.quantity,
  };
};

/**
 * Calculate profit margin
 */
export const calculateProfitMargin = (cost, price) => {
  if (price === 0) return 0;
  return ((price - cost) / price) * 100;
};

/**
 * Calculate markup
 */
export const calculateMarkup = (cost, price) => {
  if (cost === 0) return 0;
  return ((price - cost) / cost) * 100;
};

/**
 * Prorate discount across items
 */
export const prorateDiscount = (items, totalDiscount) => {
  const subtotal = calculateSubtotal(items);

  return items.map((item, index) => {
    const itemPercentage = item.total / subtotal;
    const itemDiscount =
      index === items.length - 1
        ? totalDiscount -
          items.slice(0, -1).reduce((sum, i) => sum + i.proratedDiscount, 0)
        : Math.round(totalDiscount * itemPercentage * 100) / 100;

    return {
      ...item,
      proratedDiscount: itemDiscount,
      finalTotal: item.total - itemDiscount,
    };
  });
};
