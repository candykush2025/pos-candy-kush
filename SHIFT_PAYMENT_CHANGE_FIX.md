# Shift Payment Method Change Fix

## Problem

When a payment method is changed from Cash to Card (or vice versa) after admin approval, the shift calculations were not being updated. The shift would still count the transaction as the original payment method.

### Example Issue:

- Transaction originally recorded as Cash payment: ฿1,990
- Payment method changed to Card after admin approval
- Shift still counted ฿1,990 as cash sale
- Expected cash was incorrectly calculated

## Solution Implemented

### 1. Updated `recalculateShift()` Function

**File:** `src/lib/firebase/shiftsService.js`

The function now:

- ✅ Recalculates ALL payment method totals (cash, card, other) from scratch
- ✅ Checks for approved payment history changes on each receipt
- ✅ Uses the CURRENT/FINAL payment method for categorization
- ✅ Properly accounts for refunds based on final payment method

**Logic Flow:**

```javascript
For each receipt in shift:
  1. Check if receipt has paymentHistory with approved changes
  2. If yes, use the latest approved payment method
  3. If no, use the original payment method
  4. Categorize the sale/refund based on current payment method
  5. Recalculate totalCashSales, totalCardSales, totalOtherSales
  6. Recalculate expectedCash based on new totals
```

**Expected Cash Formula:**

```
Expected Cash = Starting Cash
              + Cash Sales (based on current payment methods)
              - Cash Refunds (based on current payment methods)
              + Paid In
              - Paid Out
```

### 2. Auto-Recalculation on Payment Approval

**File:** `src/app/admin/orders/page.js`

When admin approves a payment method change:

1. ✅ Updates the receipt with new payment method
2. ✅ Adds entry to paymentHistory with status "approved"
3. ✅ **NEW:** Finds the shift containing this receipt
4. ✅ **NEW:** Automatically recalculates the shift
5. ✅ Shows success message with shift recalculation status

**Implementation:**

```javascript
// After approving payment change:
1. Get receipt order number
2. Search for shift containing this order number (±7 days)
3. Call shiftsService.recalculateShift(shiftId)
4. Show appropriate success message
```

### 3. Manual Recalculation Button

**File:** `src/components/pos/ShiftsSection.jsx`

- Already exists in the UI
- Located in shift details view
- Allows manual recalculation if needed
- Shows "Last recalculated" timestamp

## How to Use

### For Automatic Recalculation:

1. Admin approves a payment method change in Orders page
2. System automatically finds and recalculates the associated shift
3. No manual action needed

### For Manual Recalculation:

1. Go to Sales → Shifts
2. Click on a shift to view details
3. Click the "Recalculate" button
4. Shift totals will be updated based on current receipt data

## Testing

### Test Case 1: Cash to Card Change

1. Create a cash transaction (e.g., ฿1,990)
2. Transaction is added to cashier's active shift
3. Request payment method change to Card
4. Admin approves the change
5. **Expected Result:**
   - Receipt shows Card payment
   - Shift totalCashSales decreases by ฿1,990
   - Shift totalCardSales increases by ฿1,990
   - Expected cash recalculated correctly

### Test Case 2: Card to Cash Change

1. Create a card transaction (e.g., ฿2,500)
2. Transaction is added to cashier's active shift
3. Request payment method change to Cash
4. Admin approves the change
5. **Expected Result:**
   - Receipt shows Cash payment
   - Shift totalCardSales decreases by ฿2,500
   - Shift totalCashSales increases by ฿2,500
   - Expected cash recalculated correctly

### Test Case 3: Multiple Changes

1. Create multiple transactions with different payment methods
2. Change some payment methods
3. Admin approves all changes
4. **Expected Result:**
   - Each shift recalculates individually
   - All totals are accurate
   - No duplicate counting

## Console Logs

The recalculation function logs detailed information:

```javascript
// For each receipt:
`Receipt ${id} payment changed from ${oldMethod} to ${newMethod}``-> Cash sale: ${amount}``-> Card sale: ${amount}`
// Summary:
`Shift ${shiftId} recalculation: {
  totalCashSales,
  totalCardSales,
  totalOtherSales,
  totalRefunds,
  totalCashRefunds,
  ...
}`;
```

## Benefits

1. ✅ **Accurate Shift Calculations:** Shifts reflect actual payment methods
2. ✅ **Automatic Updates:** No manual intervention needed after approval
3. ✅ **Historical Tracking:** Payment changes are logged with approval status
4. ✅ **Manual Override:** Can manually recalculate if needed
5. ✅ **Handles Edge Cases:** Works with refunds, multiple changes, etc.

## Related Files

- `src/lib/firebase/shiftsService.js` - Shift service with recalculation logic
- `src/app/admin/orders/page.js` - Admin approval with auto-recalculation
- `src/components/pos/ShiftsSection.jsx` - UI with manual recalculate button
- `PAYMENT_CHANGE_WORKFLOW.md` - Payment change workflow documentation

## Notes

- Recalculation searches ±7 days from receipt date for performance
- If shift not found, approval still succeeds but shift isn't recalculated
- Shift recalculation failure doesn't block payment change approval
- All changes are logged to console for debugging
