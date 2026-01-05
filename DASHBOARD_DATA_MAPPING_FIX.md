# Dashboard Data Mapping Fix

## Problem: Zero Values and Missing Data

The sales dashboard was showing **0 values** and missing data because of a **field name mismatch** between how data is stored in Firebase and how the dashboard was trying to read it.

## Root Cause

### Integration Page (Sync):

When receipts are synced from Loyverse and saved to Firebase, they use **camelCase** field names:

```javascript
// From integration/page.js
const receipts = allReceipts.map((receipt) => ({
  receiptNumber: receipt.receipt_number, // camelCase ✅
  totalMoney: parseFloat(receipt.total_money || 0), // camelCase ✅
  lineItems: receipt.line_items || [], // camelCase ✅
  receiptDate: receipt.receipt_date, // camelCase ✅
  // ... etc
}));
```

### Dashboard (Read):

The dashboard was trying to read using **snake_case** field names:

```javascript
// OLD CODE (WRONG) ❌
const totalRevenue = receipts.reduce(
  (sum, receipt) => sum + (receipt.total_money || 0), // snake_case ❌
  0
);
```

**Result**: All calculations returned `0` because `receipt.total_money` was `undefined`.

## Fields Fixed

### Revenue Calculations:

| Wrong (snake_case)    | Correct (camelCase)  |
| --------------------- | -------------------- |
| `receipt.total_money` | `receipt.totalMoney` |

### Receipt Details:

| Wrong (snake_case)       | Correct (camelCase)     |
| ------------------------ | ----------------------- |
| `receipt.receipt_number` | `receipt.receiptNumber` |
| `receipt.line_items`     | `receipt.lineItems`     |

### All Affected Sections:

1. ✅ **Total Revenue** - Fixed to use `totalMoney`
2. ✅ **Month Revenue** - Fixed to use `totalMoney`
3. ✅ **Today Revenue** - Fixed to use `totalMoney`
4. ✅ **Daily Sales Chart** - Fixed to use `totalMoney`
5. ✅ **Monthly Revenue Chart** - Fixed to use `totalMoney`
6. ✅ **Top Products** - Fixed to use `lineItems`
7. ✅ **Recent Transactions** - Fixed to use `receiptNumber`, `totalMoney`, `lineItems`

## Changes Made

### 1. Revenue Calculations (5 locations)

```javascript
// BEFORE ❌
receipt.total_money;

// AFTER ✅
receipt.totalMoney;
```

### 2. Line Items Access (2 locations)

```javascript
// BEFORE ❌
receipt.line_items;

// AFTER ✅
receipt.lineItems;
```

### 3. Receipt Number Display (1 location)

```javascript
// BEFORE ❌
transaction.receipt_number;

// AFTER ✅
transaction.receiptNumber;
```

## Debug Logging Added

Enhanced console logging to help identify data issues:

```javascript
console.log("📊 Dashboard Debug - Total receipts:", receipts.length);
console.log("📊 Sample receipt structure:", receipts[0]);
console.log("📊 Sample receipt fields:", Object.keys(receipts[0]));
console.log("📊 Sample receipt totalMoney:", receipts[0].totalMoney);
console.log("📊 Sample receipt lineItems:", receipts[0].lineItems);
console.log("📊 Month receipts count:", monthReceipts.length);
console.log("📊 Month revenue:", monthRevenue);
console.log("📊 Today revenue:", todayRevenue);
```

## Testing

### 1. Check Console (F12):

Open browser console and look for:

```
📊 Dashboard Debug - Total receipts: 150
📊 Sample receipt totalMoney: 45000
📊 Month revenue: 1250000
📊 Today revenue: 85000
```

### 2. Verify Dashboard Cards:

- **Month Revenue**: Should show actual revenue (not $0)
- **Today's Sales**: Should show today's total
- **Month Orders**: Should show transaction count
- **Avg Order Value**: Should show average

### 3. Check Charts:

- **Daily Sales Chart**: Should show bars with revenue
- **Monthly Revenue Chart**: Should show line with trends
- **Top Products**: Should list best-selling items
- **Payment Methods**: Should show pie chart distribution

### 4. Check Transactions List:

- Receipt numbers should display
- Item counts should show
- Amounts should be correct
- Payment methods should show

## Expected Results

### Before Fix:

```
Month Revenue: $0.00
Today's Sales: $0.00
Avg Order Value: $0.00
Charts: All empty/zero
Top Products: Empty list
Recent Transactions: $0.00 amounts
```

### After Fix:

```
Month Revenue: $1,250,000
Today's Sales: $85,000
Avg Order Value: $8,333
Charts: Populated with real data
Top Products: List of 5 best sellers
Recent Transactions: Actual amounts shown
```

## Firebase Data Structure

### Receipts Collection:

```javascript
{
  id: "abc123",
  receiptNumber: "0001",      // camelCase
  receiptType: "SALE",
  totalMoney: 45000,          // camelCase (in cents or smallest unit)
  totalTax: 5000,
  totalDiscount: 0,
  lineItems: [                // camelCase
    {
      item_name: "Product A", // snake_case (kept from Loyverse)
      quantity: 2,
      line_total: 40000
    }
  ],
  payments: [
    {
      payment_type_name: "Cash", // snake_case (kept from Loyverse)
      paid_money: 45000
    }
  ],
  createdAt: Timestamp,
  receiptDate: "2025-10-18T10:30:00Z",
  syncedAt: "2025-10-18T10:35:00Z"
}
```

**Note**: Top-level fields use **camelCase**, but nested Loyverse objects (inside `lineItems`, `payments`) retain their original **snake_case** from the API.

## Files Modified

- `src/app/admin/dashboard/page.js`
  - Fixed 8 field name references
  - Added debug logging
  - Total lines changed: ~20

## Prevention

### For Future Development:

1. **Document field naming convention** in code comments
2. **Use TypeScript** for type safety (optional)
3. **Create data models** with clear field definitions
4. **Test with real data** after any integration changes
5. **Check console logs** during development

### Quick Reference:

When working with **receipts from Firebase**:

- Use `totalMoney` NOT `total_money`
- Use `lineItems` NOT `line_items`
- Use `receiptNumber` NOT `receipt_number`
- Use `receiptDate` NOT `receipt_date`

When working with **items inside lineItems** or **payments**:

- Use `item_name` (kept as snake_case)
- Use `line_total` (kept as snake_case)
- Use `payment_type_name` (kept as snake_case)

---

**Status**: ✅ Fixed  
**Date**: October 18, 2025  
**Impact**: Dashboard now shows correct sales data, revenue, and analytics
