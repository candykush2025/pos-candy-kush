# Receipt Edit Requests System

## Overview

This system allows cashiers to request refunds or payment method changes for receipts, which require admin approval before being processed.

## Features

### 1. **Cashier Interface** (`HistorySection.jsx`)

- **Refund Button**: Request a refund for a receipt
- **Change Payment Button**: Request to change the payment method
- Requests are submitted to Firebase for admin review
- Tracks who made the request and when

### 2. **Admin Interface** (`/admin/receipt-requests`)

- View all pending and processed requests
- Review request details including:
  - Receipt number and amount
  - Who requested the change
  - When it was requested
  - Original and new payment methods (for payment changes)
- **Approve**: Accept the request and process the change
- **Decline**: Reject the request
- **Edit**: Modify the payment method before approving

## Data Structure

### Edit Request Object

```javascript
{
  receiptId: "string",           // ID of the receipt
  receiptNumber: "string",       // Receipt number for display
  type: "refund" | "payment_change",
  requestedBy: "string",         // Cashier ID
  requestedByName: "string",     // Cashier name
  requestedAt: "ISO date string",
  status: "pending" | "approved" | "declined",

  // For refunds:
  originalAmount: number,
  originalPaymentMethod: "string",

  // For payment changes:
  oldPaymentMethod: "string",
  newPaymentMethod: "string",
  amount: number,

  // After admin action:
  approvedAt?: "ISO date string",
  approvedBy?: "string",
  declinedAt?: "ISO date string",
  declinedBy?: "string",
  finalPaymentMethod?: "string"  // If admin edited before approving
}
```

## Payment History Tracking

When a payment method is changed, the receipt is updated with a `paymentHistory` array:

```javascript
{
  paymentHistory: [
    {
      oldMethod: "Cash",
      newMethod: "Card",
      changedAt: "2025-11-17T10:30:00Z",
      changedBy: "John Doe",
      approvedBy: "Admin Name",
    },
  ];
}
```

This preserves the audit trail of all payment method changes.

## Workflow

### Cashier Request Flow:

1. Cashier views receipt in History Section
2. Clicks "Refund" or "Change Payment" button
3. Fills out the modal form
4. Submits request
5. Request is saved to `receipt_edit_requests` collection with status "pending"
6. Cashier sees confirmation message

### Admin Approval Flow:

1. Admin navigates to `/admin/receipt-requests`
2. Views pending requests at the top
3. Clicks "Review" to see details
4. Can:
   - **Approve**: Processes the change immediately
   - **Decline**: Rejects the request
   - **Edit**: Changes payment method before approving (for payment changes)
5. System updates:
   - Receipt record (if approved)
   - Request status (approved/declined)
   - Payment history (for payment changes)

## Security Considerations

- Only cashiers can submit requests
- Only admins can approve/decline requests
- All changes are logged with timestamps and user IDs
- Original payment methods are preserved in history
- Admin can override the requested payment method

## Firebase Collections

### `receipt_edit_requests`

- Stores all refund and payment change requests
- Indexed by `requestedAt` for sorting
- Filtered by `status` for pending/processed views

### `receipts`

- Updated when requests are approved
- Includes `paymentHistory` array for audit trail
- Status field updated to "refunded" for refunds

## Usage

### Access Admin Page

Navigate to: `/admin/receipt-requests`

### For Cashiers

1. Open History Section in POS
2. Select a receipt
3. Click "Refund" or "Change Payment" in top-right
4. Fill out the form and submit

### For Admins

1. Go to Receipt Edit Requests page
2. Review pending requests
3. Click "Review" to see details
4. Approve or decline as needed

## Future Enhancements

- [ ] Email notifications to admins when new requests arrive
- [ ] Partial refund support
- [ ] Refund reason field
- [ ] Batch approval for multiple requests
- [ ] Export request history to CSV
- [ ] Dashboard widget showing pending request count
- [ ] Permission system for different admin levels
