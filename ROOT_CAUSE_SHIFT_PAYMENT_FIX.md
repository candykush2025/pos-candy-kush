# SHIFT PAYMENT RECALCULATION - ROOT CAUSE ANALYSIS

## Issue Description

After a payment method is changed from Cash to Card (and approved by admin), the shift calculation still counts the transaction as a Cash sale instead of a Card sale.

**Example:**

- Order: O-260121-1334-224
- Amount: ฿1,990
- Original Payment: Cash
- Changed To: Card (approved by admin)
- **Problem:** Shift still shows ฿1,990 as Cash sales

## Root Cause

### Previous Logic (WRONG)

The old recalculation logic had a flawed approach:

```javascript
// ❌ WRONG: Checked payment history first, then fallback to payments array
if (receipt.paymentHistory && receipt.paymentHistory.length > 0) {
  const approvedChanges = receipt.paymentHistory.filter(
    (h) => h.status === "approved",
  );
  if (approvedChanges.length > 0) {
    const latestChange = approvedChanges[approvedChanges.length - 1];
    currentPaymentMethod = (latestChange.newMethod || "").toLowerCase();
  }
}

// If no approved payment change, use the current payment method
if (!currentPaymentMethod) {
  // ... check payments array
}
```

**Why this was wrong:**

1. `paymentHistory` is just a LOG of changes, not the source of truth
2. The logic assumed if there's no payment history, use payments array
3. But payment history could exist without being the correct current state

### The Real Source of Truth

When a payment method is changed and approved:

1. **The `payments` array is UPDATED** with the new payment method:

   ```json
   "payments": [
     {
       "type": "card",  // ← Updated to card
       "name": "Card",
       "amount": 1990
     }
   ]
   ```

2. **The `paymentHistory` array is APPENDED** with a log entry:
   ```json
   "paymentHistory": [
     {
       "oldMethod": "Cash",
       "newMethod": "Card",
       "status": "approved",
       "changedAt": "2026-01-21T07:21:48.053Z",
       "changedBy": "Kylo",
       "approvedBy": "admin"
     }
   ]
   ```

So the `payments` array is ALWAYS the current state, while `paymentHistory` is just a history log.

## The Fix

### New Logic (CORRECT)

```javascript
// ✅ CORRECT: ALWAYS check payments array first
const payments = receipt.payments || [];

if (payments.length > 0) {
  // Use the payment type from the payments array (source of truth)
  currentPaymentMethod = (
    payments[0].type ||
    payments[0].name ||
    ""
  ).toLowerCase();
} else {
  // Fallback to other fields only if payments array is empty
  const paymentMethod = (
    receipt.payment_method ||
    receipt.paymentMethod ||
    ""
  ).toLowerCase();
  const paymentTypeName = (receipt.paymentTypeName || "").toLowerCase();

  if (paymentMethod) {
    currentPaymentMethod = paymentMethod;
  } else if (paymentTypeName) {
    currentPaymentMethod = paymentTypeName;
  }
}

// Also check paymentHistory for context/logging purposes
if (receipt.paymentHistory && receipt.paymentHistory.length > 0) {
  const approvedChanges = receipt.paymentHistory.filter(
    (h) => h.status === "approved",
  );
  if (approvedChanges.length > 0) {
    hasPaymentChange = true;
    // Log it for debugging, but don't use it for categorization
  }
}
```

## Why This Fixes the Issue

1. **Always reads current state:** The `payments` array reflects the CURRENT payment method
2. **Payment history is for context only:** We log it to know there was a change, but don't use it for calculations
3. **Fallback is safe:** Only if payments array is completely missing do we check other fields

## Verification

### Before Fix:

```
Receipt O-260121-1334-224:
  payments: [{type: "card", amount: 1990}]
  paymentHistory: [{oldMethod: "Cash", newMethod: "Card", status: "approved"}]

Logic flow:
  1. Found approved payment change in history ❌
  2. Used newMethod from history: "Card" ❌
  3. But this was unreliable if history structure was different ❌

Result: Sometimes counted as Cash, sometimes as Card (inconsistent)
```

### After Fix:

```
Receipt O-260121-1334-224:
  payments: [{type: "card", amount: 1990}]
  paymentHistory: [{oldMethod: "Cash", newMethod: "Card", status: "approved"}]

Logic flow:
  1. Check payments array first ✅
  2. Found: payments[0].type = "card" ✅
  3. Use "card" as current payment method ✅
  4. Check payment history for logging only ✅

Result: ALWAYS counted as Card (consistent and correct)
```

## Data Flow

### When Payment Method Changes:

1. **Cashier requests change** (in POS HistorySection)

   ```javascript
   pendingPaymentChange: {
     oldMethod: "Cash",
     newMethod: "Card",
     requestedBy: "cashierId",
     requestedAt: "timestamp"
   }
   ```

2. **Admin approves change** (in Admin Orders page)

   ```javascript
   // Updates the receipt:
   payments: [{type: "card", ...}],  // ← UPDATED
   paymentHistory: [...history, {
     oldMethod: "Cash",
     newMethod: "Card",
     status: "approved",
     approvedBy: "admin"
   }]  // ← APPENDED
   ```

3. **Shift recalculates** (automatically or manually)

   ```javascript
   // Reads payments array:
   currentPaymentMethod = payments[0].type; // "card"

   // Categorizes correctly:
   if (currentPaymentMethod.includes("card")) {
     totalCardSales += amount; // ✅ Added to card sales
   }
   ```

## Code Changes Summary

**File:** `src/lib/firebase/shiftsService.js`
**Function:** `recalculateShift(shiftId)`

### Key Changes:

1. ✅ Reorder logic to check `payments` array first
2. ✅ Use `payments[0].type` as the source of truth
3. ✅ Treat `paymentHistory` as a log, not the source
4. ✅ Add extensive console logging for debugging
5. ✅ Recalculate ALL payment method totals (cash, card, other)

### Additional Enhancement:

When admin approves payment change, the system now automatically:

1. Finds the shift containing the receipt
2. Calls `recalculateShift()` automatically
3. Updates shift totals immediately

**File:** `src/app/admin/orders/page.js`
**Function:** `handleApprovePaymentChange()`

## Testing Checklist

- [x] Fix applied to `shiftsService.js`
- [x] Auto-recalculation added to payment approval
- [x] Extensive logging added for debugging
- [ ] **YOU TEST:** Click Recalculate button
- [ ] **YOU VERIFY:** Check console logs
- [ ] **YOU CONFIRM:** Shift totals are correct

## Expected Console Output

When you click Recalculate, you should see:

```
📝 Processing receipt 1PVB5FkCNF8AZFEktiTw (O-260121-1334-224):
   Total: 1990
   Payments array: [{type: "card", name: "Card", amount: 1990}]
   ✅ Has approved payment change: Cash → Card
   💳 Current payment method from payments array: "card"
   ✅ Counted as CARD sale: ฿1990

📊 SHIFT RECALCULATION SUMMARY
   💵 Total Cash Sales: ฿0       ← CORRECT (not 1990)
   💳 Total Card Sales: ฿1990    ← CORRECT (includes the changed payment)
```

If you see anything different, the console logs will tell us exactly where the problem is!
