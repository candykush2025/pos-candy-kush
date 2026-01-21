# Testing the Shift Payment Change Fix

## Test Scenario: Your Example

### Initial State

```json
{
  "receipt_number": "O-260121-1334-224",
  "total_money": 1990,
  "paymentMethod": "cash", // Original payment method
  "paymentHistory": [
    {
      "oldMethod": "Cash",
      "newMethod": "Card",
      "changedAt": "2026-01-21T07:21:48.053Z",
      "status": "approved",
      "changedBy": "Kylo",
      "approvedBy": "admin"
    }
  ],
  "payments": [
    {
      "amount": 1990,
      "type": "card", // Changed to card
      "name": "Card"
    }
  ]
}
```

### Before Fix

- **Shift totalCashSales:** ฿1,990 (WRONG - counting as cash)
- **Shift totalCardSales:** ฿0
- **Expected Cash:** Starting Cash + ฿1,990 (WRONG)

### After Fix

When you recalculate the shift or when the payment change is approved:

1. **System checks receipt:**
   - Has paymentHistory? ✅ Yes
   - Has approved changes? ✅ Yes (status: "approved")
   - Latest approved method: "Card"

2. **System recategorizes:**
   - Remove from totalCashSales: ฿1,990
   - Add to totalCardSales: ฿1,990

3. **New shift totals:**
   - **Shift totalCashSales:** ฿0 (CORRECT)
   - **Shift totalCardSales:** ฿1,990 (CORRECT)
   - **Expected Cash:** Starting Cash + ฿0 (CORRECT)

## How to Test

### Option 1: Automatic Recalculation (Recommended)

1. Go to the Orders page as admin
2. Find the receipt "O-260121-1334-224"
3. If it has a pending payment change, approve it
4. The shift will automatically recalculate
5. Check the Shifts page - the totals should be correct

### Option 2: Manual Recalculation

1. Go to Sales → Shifts
2. Find the shift that contains order "O-260121-1334-224"
   - Date: 2026-01-21
   - Cashier: Kylo (wqUX5gb6hAeJZOsbaUFaIn2Q66k2)
3. Click on the shift to view details
4. Click the "Recalculate" button
5. Verify the totals are now correct:
   - totalCashSales should NOT include the ฿1,990
   - totalCardSales SHOULD include the ฿1,990

## Expected Console Output

When recalculating, you should see logs like:

```
Batch 1: Found 1 receipts for order numbers: ["O-260121-1334-224"]
Receipt 1PVB5FkCNF8AZFEktiTw payment changed from Cash to Card
  -> Card sale: 1990
Shift {shiftId} recalculation: {
  totalTransactions: 1,
  totalCashSales: 0,
  totalCardSales: 1990,
  totalOtherSales: 0,
  totalRefunds: 0,
  totalCashRefunds: 0,
  startingCash: ...,
  totalPaidIn: 0,
  totalPaidOut: 0
}
```

## Verification Steps

After recalculation, verify in the database or UI:

1. **Shift Document:**

   ```json
   {
     "id": "...",
     "totalCashSales": 0,        // Should be 0
     "totalCardSales": 1990,     // Should be 1990
     "expectedCash": startingCash + 0,  // Should NOT include 1990
     "recalculatedAt": "2026-01-21T..."  // New timestamp
   }
   ```

2. **Receipt Document:**
   ```json
   {
     "id": "1PVB5FkCNF8AZFEktiTw",
     "receipt_number": "O-260121-1334-224",
     "payments": [
       {
         "type": "card",
         "amount": 1990
       }
     ],
     "paymentHistory": [
       {
         "oldMethod": "Cash",
         "newMethod": "Card",
         "status": "approved"
       }
     ]
   }
   ```

## Troubleshooting

### If shift doesn't recalculate automatically:

1. Check browser console for errors
2. Verify the receipt has `orderNumber` or `receipt_number` field
3. Verify the shift's `transactions` array includes "O-260121-1334-224"
4. Manually click the Recalculate button in Shifts page

### If totals are still wrong:

1. Check if `paymentHistory` has `status: "approved"`
2. Check if multiple payment changes exist (uses latest approved)
3. Check console logs for the payment method detected
4. Verify the receipt's `payments` array is updated

## Next Steps

After verifying the fix works:

1. Test with multiple payment changes on the same receipt
2. Test with both Cash→Card and Card→Cash changes
3. Test with refunded receipts that have payment changes
4. Test with receipts that have multiple payment types
