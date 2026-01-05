# Dashboard Data Mapping - COMPLETE FIX

## Problem Summary

The sales dashboard was showing **0 values**, **"Unknown"** labels, and missing data due to **incorrect field name references** when accessing nested Loyverse data.

## Complete Data Structure (From Firebase)

### Top-Level Receipt Fields (camelCase):

```javascript
{
  id: "abc123",
  receiptNumber: "2-1000",        // ✅ camelCase
  receiptType: "SALE",
  totalMoney: 80,                 // ✅ camelCase
  totalTax: 0,
  totalDiscount: 0,
  lineItems: [...],               // ✅ camelCase (array)
  payments: [...],                // ✅ camelCase (array)
  createdAt: Timestamp,
  receiptDate: "2024-08-23T10:12:28.000Z",
}
```

### Inside lineItems Array (snake_case from Loyverse):

```javascript
lineItems: [
  {
    item_id: "b4c8e8e8-dee7-4e53-b176-379f7b7945b7",
    item_name: "Outdoor Sativa small size", // ✅ snake_case
    variant_id: "889df43d-7fb7-4c18-b77e-f49d8d163209",
    quantity: 1, // ✅ no prefix
    price: 80,
    total_money: 80, // ✅ snake_case (NOT line_total!)
    total_discount: 0,
    cost: 80,
    sku: "10000",
  },
];
```

### Inside payments Array (snake_case from Loyverse):

```javascript
payments: [
  {
    payment_type_id: "e68a8970-7792-49f7-a0f3-f72c61371d46",
    name: "Cash", // ✅ For display
    type: "CASH", // ✅ For code/type
    money_amount: 80, // ✅ snake_case (NOT paid_money!)
    paid_at: "2024-08-23T10:12:28.000Z",
  },
];
```

## All Fixes Applied

### 1. Top Products Calculation

**WRONG:**

```javascript
productSales[itemName].revenue += item.line_total || 0; // ❌ WRONG!
```

**CORRECT:**

```javascript
productSales[itemName].revenue += item.total_money || 0; // ✅ CORRECT
```

### 2. Payment Methods Distribution

**WRONG:**

```javascript
const method = payment.payment_type_name || "Unknown"; // ❌ undefined
paymentMethods[method] += payment.paid_money || 0; // ❌ undefined
```

**CORRECT:**

```javascript
const method = payment.name || payment.type || "Unknown"; // ✅ CORRECT
paymentMethods[method] += payment.money_amount || 0; // ✅ CORRECT
```

### 3. Transaction List Display

**WRONG:**

```javascript
{
  transaction.payments[0].payment_type_name;
} // ❌ undefined = blank
```

**CORRECT:**

```javascript
{
  transaction.payments[0].name || transaction.payments[0].type;
} // ✅ Shows "Cash"
```

## Complete Field Reference

### Receipt Top-Level (camelCase):

| Field Name      | Type   | Example    |
| --------------- | ------ | ---------- |
| `totalMoney`    | number | `80`       |
| `totalTax`      | number | `0`        |
| `totalDiscount` | number | `0`        |
| `receiptNumber` | string | `"2-1000"` |
| `receiptType`   | string | `"SALE"`   |
| `lineItems`     | array  | `[...]`    |
| `payments`      | array  | `[...]`    |

### lineItems[i] Fields (snake_case):

| Field Name       | Type   | Example                       |
| ---------------- | ------ | ----------------------------- |
| `item_name`      | string | `"Outdoor Sativa small size"` |
| `item_id`        | string | `"b4c8e8e8-..."`              |
| `quantity`       | number | `1`                           |
| `price`          | number | `80`                          |
| `total_money`    | number | `80`                          |
| `total_discount` | number | `0`                           |
| `cost`           | number | `80`                          |
| `sku`            | string | `"10000"`                     |

### payments[i] Fields (snake_case):

| Field Name        | Type   | Example                      |
| ----------------- | ------ | ---------------------------- |
| `name`            | string | `"Cash"`                     |
| `type`            | string | `"CASH"`                     |
| `money_amount`    | number | `80`                         |
| `paid_at`         | string | `"2024-08-23T10:12:28.000Z"` |
| `payment_type_id` | string | `"e68a8970-..."`             |

## Why The Confusion?

### Integration Page Saves Data As-Is:

```javascript
// From integration/page.js
lineItems: receipt.line_items || [],  // Saved directly from Loyverse API
payments: receipt.payments || [],      // Saved directly from Loyverse API
```

The `lineItems` and `payments` arrays **keep the original Loyverse structure** (snake_case), while top-level fields are converted to camelCase.

## Testing Checklist

### ✅ Check Console (F12):

```
📊 Sample lineItem: {item_name: "...", total_money: 80, quantity: 1}
📊 Sample payment: {name: "Cash", money_amount: 80, type: "CASH"}
📊 Top products: [{name: "...", revenue: 240, quantity: 3}]
📊 Payment methods data: [{name: "Cash", value: 500}]
```

### ✅ Verify Dashboard Display:

- **Top Products**: Should show product names (not "Unknown")
- **Top Products Revenue**: Should show correct amounts (not $0)
- **Payment Methods Chart**: Should show method names ("Cash", not "Unknown")
- **Payment Methods Values**: Should show correct totals
- **Recent Transactions**: Should show payment method below amount

## Code Changes Summary

### dashboard/page.js - 3 Fixes:

**Fix 1: Top Products**

```javascript
// Line ~247
item.total_money; // Changed from item.line_total
```

**Fix 2: Payment Methods**

```javascript
// Line ~268
payment.name || payment.type; // Changed from payment.payment_type_name
payment.money_amount; // Changed from payment.paid_money
```

**Fix 3: Transaction Display**

```javascript
// Line ~683
transaction.payments[0].name || transaction.payments[0].type;
// Changed from transaction.payments[0].payment_type_name
```

## Quick Reference Card

### When accessing receipts from Firebase:

**Top-Level Fields** → Use **camelCase**:

- ✅ `receipt.totalMoney`
- ✅ `receipt.lineItems`
- ✅ `receipt.receiptNumber`

**Inside lineItems[]** → Use **snake_case**:

- ✅ `item.item_name`
- ✅ `item.total_money` (NOT `line_total`)
- ✅ `item.quantity`

**Inside payments[]** → Use **snake_case**:

- ✅ `payment.name` (for display)
- ✅ `payment.type` (for code)
- ✅ `payment.money_amount` (NOT `paid_money`)

---

**Status**: ✅ COMPLETELY FIXED  
**Date**: October 18, 2025  
**Files Modified**: `src/app/admin/dashboard/page.js`  
**Lines Changed**: 3 critical fixes

All data should now display correctly! 🎉
