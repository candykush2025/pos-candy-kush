# Payment Change Workflow & Shift Close Integration

## How It Works

### 1. Cashier Submits Payment Change Request

When a cashier requests to change a payment method:

1. **Request Creation**: A new document is created in `receipt_edit_requests` collection
2. **Receipt Marking**: The original receipt is marked with `hasPendingPaymentChange: true`
3. **No Immediate Change**: The receipt's payment method **remains unchanged** until admin approval
4. **Visual Indicator**: A "Change Pending" badge appears in the receipt details

### 2. Admin Approval Process

When admin approves the payment change:

1. **Receipt Update**: The receipt's `payments` array is updated with the new payment method
2. **Payment History**: A new entry is added to `paymentHistory` array showing:
   - Old payment method
   - New payment method
   - Who requested the change
   - When it was changed
   - Who approved it
3. **Clear Pending Flag**: `hasPendingPaymentChange` is set to `false`
4. **Request Status**: The request is marked as "approved"

### 3. Admin Decline Process

When admin declines the payment change:

1. **No Receipt Change**: The receipt remains completely unchanged
2. **Clear Pending Flag**: `hasPendingPaymentChange` is set to `false`
3. **Request Status**: The request is marked as "declined"

## Shift Close Integration

### Current Behavior

When a shift closes, it counts receipts based on their **current payment method** in the `payments` array.

### What This Means

1. **Before Admin Approval**:

   - If a cashier submits a change request during their shift
   - The shift close will count the **ORIGINAL payment method**
   - Example: Receipt was Cash, cashier requests Card change
   - Shift close counts it as **Cash** (because admin hasn't approved yet)

2. **After Admin Approval**:

   - If admin approves the change **before shift close**
   - The shift close will count the **NEW payment method**
   - Example: Receipt was Cash, admin approved Card change
   - Shift close counts it as **Card**

3. **After Shift Close**:
   - If admin approves the change **after the shift has closed**
   - The closed shift's totals are **NOT updated**
   - The payment change is logged in `paymentHistory` for audit purposes
   - Future reports will show the new payment method

## Data Structure

### Receipt Document

```javascript
{
  id: "receipt123",
  payments: [
    {
      name: "Card",           // Current payment method (what shift close uses)
      amount: 100.00,
      type: "card"
    }
  ],
  hasPendingPaymentChange: false,  // Flag to show pending badge
  paymentHistory: [
    {
      oldMethod: "Cash",      // Original method
      newMethod: "Card",      // Changed to
      changedAt: "2025-11-17T10:30:00Z",
      changedBy: "John Doe",  // Cashier who requested
      approvedBy: "Admin"     // Admin who approved
    }
  ]
}
```

### Edit Request Document

```javascript
{
  id: "request123",
  receiptId: "receipt123",
  receiptNumber: "R-001",     // Fallback to receipt.id if undefined
  type: "payment_change",
  oldPaymentMethod: "Cash",
  newPaymentMethod: "Card",
  requestedBy: "cashier123",
  requestedByName: "John Doe",
  requestedAt: "2025-11-17T10:00:00Z",
  status: "pending",          // pending | approved | declined
  approvedAt: null,           // Set when approved
  approvedBy: null,           // Admin ID who approved
  finalPaymentMethod: null    // Set when approved (can be edited by admin)
}
```

## Best Practices

### For Cashiers

1. ✅ **Submit Immediately**: Submit payment change requests as soon as you notice the error
2. ✅ **Don't Assume**: Don't assume the change will be approved before shift close
3. ✅ **Check Status**: Look for the "Change Pending" badge in receipt details
4. ❌ **Don't Close Shift**: If possible, wait for admin approval before closing shift for accurate totals

### For Admins

1. ✅ **Review Promptly**: Review and process requests as soon as possible
2. ✅ **Before Shift Close**: Try to approve/decline requests before cashier shifts close
3. ✅ **Verify Details**: Check the receipt amount and payment method before approving
4. ✅ **Edit if Needed**: You can change the payment method to a different option than requested
5. ⚠️ **Audit Trail**: All changes are logged in `paymentHistory` for accountability

### For Shift Close Reports

The shift close system will:

- Count receipts by their **current payment method** in the `payments` array
- NOT be affected by pending payment change requests
- NOT be retroactively updated if a payment is changed after shift close
- Show accurate totals based on what was actually recorded at the time of shift close

## Edge Cases

### Case 1: Multiple Change Requests

- Only one pending request allowed per receipt
- New requests will overwrite the pending flag
- Previous request should be declined before accepting a new one

### Case 2: Receipt Deleted

- Edit requests remain in the system
- Admin should decline the request if receipt is deleted

### Case 3: Shift Already Closed

- Payment changes don't affect closed shifts
- The change is still recorded in `paymentHistory`
- Future reports will show the updated payment method

## Firebase Security Rules

Ensure these collections have proper security:

```javascript
// receipt_edit_requests - Only cashiers and admins can read/write
match /receipt_edit_requests/{requestId} {
  allow read: if request.auth != null &&
              (request.auth.token.role == 'cashier' ||
               request.auth.token.role == 'admin');
  allow create: if request.auth != null &&
                request.auth.token.role == 'cashier';
  allow update, delete: if request.auth != null &&
                         request.auth.token.role == 'admin';
}

// receipts - Admins can update, cashiers can read
match /receipts/{receiptId} {
  allow read: if request.auth != null;
  allow update: if request.auth != null &&
                request.auth.token.role == 'admin';
}
```

## Troubleshooting

### Issue: "Unsupported field value: undefined"

**Solution**: Always use fallback values for optional fields

```javascript
receiptNumber: receipt.receiptNumber || receipt.id || "Unknown";
```

### Issue: Payment change not showing in shift close

**Solution**: This is expected behavior. Payment changes only affect future reports, not closed shifts.

### Issue: "Change Pending" badge not showing

**Solution**: Reload receipts after submitting a change request. The component should call `loadReceipts()` after creating the request.
