# Payment Types Integration - POS Sales

## Overview

The POS Sales section now supports **4 different payment types** that sync correctly with Loyverse:

1. **Cash** - Traditional cash payments
2. **Card** - Non-integrated card terminal payments
3. **Crypto transfer** - Cryptocurrency payments
4. **Transfer** - Bank transfer payments

Each payment type has its unique ID from your Loyverse account and syncs properly when creating receipts.

## Payment Types Configuration

### Payment Type Details (from Loyverse)

```javascript
// Located in: src/config/constants.js
export const LOYVERSE_PAYMENT_TYPES = {
  CASH: {
    id: "e68a8970-7792-49f7-a0f3-f72c61371d46",
    name: "Cash",
    type: "CASH",
  },
  CARD: {
    id: "4b4b981f-81aa-4979-baaa-cf8ac49647ec",
    name: "Card",
    type: "NONINTEGRATEDCARD",
  },
  CRYPTO: {
    id: "d8139062-22ed-4e16-a565-0a1fead90c70",
    name: "Crypto transfer",
    type: "OTHER",
  },
  TRANSFER: {
    id: "e8cc7249-784b-4224-bd9c-db4fe19c1d84",
    name: "Transfer",
    type: "OTHER",
  },
};
```

### Payment Type Mapping

| Payment Method | Loyverse Type     | Icon             | Description                                       |
| -------------- | ----------------- | ---------------- | ------------------------------------------------- |
| Cash           | CASH              | 💵 Banknote      | Traditional cash payments with change calculation |
| Card           | NONINTEGRATEDCARD | 💳 CreditCard    | Card terminal payments (non-integrated)           |
| Crypto         | OTHER             | ₿ Bitcoin        | Cryptocurrency transfer payments                  |
| Transfer       | OTHER             | ⇄ ArrowLeftRight | Bank transfer payments                            |

## Features

### 1. Payment Selection UI

**Location:** POS Sales → Checkout → Payment Modal

The payment selection screen shows all 4 payment types in a 2x2 grid layout:

```
┌────────────┬────────────┐
│  💵 Cash   │ 💳 Card    │
├────────────┼────────────┤
│ ₿ Crypto   │ ⇄ Transfer │
└────────────┴────────────┘
```

**Features:**

- Visual icons for easy identification
- Active state highlighting (selected payment is highlighted)
- Touch-friendly button size (h-20)
- Responsive 2-column grid layout

### 2. Payment-Specific UI

#### Cash Payment

- **Cash Received Input:** Number input for cash amount
- **Quick Cash Buttons:** Fast selection of common denominations
- **Change Calculation:** Automatic change calculation with visual highlight
- **Validation:** Must receive sufficient cash before completing

#### Card Payment

- **Instruction Message:** Blue notification to process card at terminal
- **No Additional Input:** Automatically uses total amount
- **Immediate Completion:** Click "Complete Payment" when card processed

#### Crypto Transfer

- **Instruction Message:** Purple notification to process crypto transfer
- **Confirmation Required:** Complete payment after confirming crypto received
- **Total Amount Display:** Shows exact amount to receive

#### Transfer Payment

- **Instruction Message:** Indigo notification to process bank transfer
- **Confirmation Required:** Complete payment after confirming transfer
- **Total Amount Display:** Shows exact amount to receive

### 3. Loyverse Sync Integration

**How it works:**

1. **Payment Selection:** User selects payment type
2. **Payment Type Lookup:** System maps selected method to Loyverse payment type
3. **Receipt Creation:** Creates receipt with correct `payment_type_id`
4. **Loyverse Sync:** Sends to Loyverse API with proper payment type
5. **Receipt Storage:** Saves to Firebase with payment type name

**Code Flow:**

```javascript
// User selects payment method
paymentMethod = "crypto"; // or "cash", "card", "transfer"

// System looks up Loyverse payment type
selectedPaymentType = LOYVERSE_PAYMENT_TYPES.CRYPTO;
// {
//   id: "d8139062-22ed-4e16-a565-0a1fead90c70",
//   name: "Crypto transfer",
//   type: "OTHER"
// }

// Creates Loyverse receipt with correct payment type
loyverseData = {
  ...receiptData,
  payments: [
    {
      payment_type_id: "d8139062-22ed-4e16-a565-0a1fead90c70", // Correct ID
      paid_at: "2024-10-14T12:30:00.000Z",
    },
  ],
};

// Syncs to Loyverse
loyverseService.createReceipt(loyverseData);
```

### 4. Receipt Display

**Receipt Modal:**

- Shows payment type name (e.g., "Crypto transfer" instead of "crypto")
- Displays cash received and change for cash payments
- Shows total amount for non-cash payments

**Thermal Receipt:**

- Payment type name printed on receipt
- Cash received and change details for cash
- Clean formatting for all payment types

**History View:**

- Payment type name shown in receipt details
- Sync status badges
- Device tracking

## Implementation Details

### Files Modified

1. **`src/config/constants.js`**

   - Added `LOYVERSE_PAYMENT_TYPES` constant with all 4 payment types
   - Includes ID, name, and type for each payment method

2. **`src/components/pos/SalesSection.jsx`**
   - Added Bitcoin and ArrowLeftRight icons
   - Updated payment method selection UI (2x2 grid)
   - Added payment-specific instruction messages
   - Modified `handleCompletePayment()` to use correct payment type ID
   - Updated receipt data to store payment type name
   - Updated thermal receipt generation
   - Updated receipt modal display

### Key Code Changes

#### Payment Type Selection

```jsx
// Get payment type details based on selected payment method
const { LOYVERSE_PAYMENT_TYPES } = await import("@/config/constants");
let selectedPaymentType;
switch (paymentMethod) {
  case "cash":
    selectedPaymentType = LOYVERSE_PAYMENT_TYPES.CASH;
    break;
  case "card":
    selectedPaymentType = LOYVERSE_PAYMENT_TYPES.CARD;
    break;
  case "crypto":
    selectedPaymentType = LOYVERSE_PAYMENT_TYPES.CRYPTO;
    break;
  case "transfer":
    selectedPaymentType = LOYVERSE_PAYMENT_TYPES.TRANSFER;
    break;
  default:
    selectedPaymentType = LOYVERSE_PAYMENT_TYPES.CASH;
}
```

#### Payment Data Preparation

```jsx
// Prepare payment data with correct payment type ID
const payments = [
  {
    payment_type_id: selectedPaymentType.id,
    paid_at: now.toISOString(),
  },
];
```

#### Receipt Data Storage

```jsx
receiptData = {
  ...otherData,
  paymentMethod: paymentMethod,
  paymentTypeName: selectedPaymentType.name, // NEW: Store readable name
  payments: [
    {
      payment_type_id: selectedPaymentType.id,
      name: selectedPaymentType.name,
      type: selectedPaymentType.type,
      money_amount: total,
      paid_at: now.toISOString(),
      payment_details: null,
    },
  ],
};
```

## Testing Guide

### Test Scenario 1: Cash Payment

1. Add items to cart
2. Click "Checkout"
3. Select **Cash** payment
4. Enter cash amount (e.g., $100)
5. Verify change calculation is correct
6. Click "Complete Payment"
7. **Expected:** Receipt shows "Cash" payment, change amount displayed

### Test Scenario 2: Card Payment

1. Add items to cart
2. Click "Checkout"
3. Select **Card** payment
4. See blue instruction message
5. Click "Complete Payment"
6. **Expected:** Receipt shows "Card" payment, no change calculation

### Test Scenario 3: Crypto Transfer

1. Add items to cart
2. Click "Checkout"
3. Select **Crypto** payment (Bitcoin icon)
4. See purple instruction message
5. Process crypto transfer externally
6. Click "Complete Payment"
7. **Expected:** Receipt shows "Crypto transfer" payment

### Test Scenario 4: Bank Transfer

1. Add items to cart
2. Click "Checkout"
3. Select **Transfer** payment
4. See indigo instruction message
5. Confirm bank transfer externally
6. Click "Complete Payment"
7. **Expected:** Receipt shows "Transfer" payment

### Loyverse Sync Verification

For each payment type, verify in Loyverse:

1. Go to Loyverse dashboard
2. Navigate to Receipts
3. Find the synced receipt
4. **Verify:**
   - Receipt number matches POS
   - Payment type is correct (Cash/Card/Crypto/Transfer)
   - Amount is correct
   - Store ID matches
   - Sync status is "synced" in POS

## Troubleshooting

### Issue: Wrong payment type in Loyverse

**Solution:** Check that payment type IDs in `constants.js` match your Loyverse account.

1. Go to Admin → Integration page
2. Click "Get Payment Types"
3. Find your payment types
4. Copy the correct IDs
5. Update `LOYVERSE_PAYMENT_TYPES` in `constants.js`

### Issue: Payment type not syncing

**Possible Causes:**

- Internet connection offline
- Invalid payment type ID
- Loyverse API error

**Debug Steps:**

1. Check browser console for errors
2. Verify payment type ID is correct
3. Check sync status in receipt details
4. Look at `syncError` field in Firebase

### Issue: Receipt shows "undefined" payment type

**Solution:** Old receipts don't have `paymentTypeName` field.

**Fix:** The code has fallback logic:

```jsx
{
  completedOrder.paymentTypeName || completedOrder.paymentMethod;
}
```

For new receipts, this won't be an issue.

## API Reference

### Loyverse Receipts API - Payments Object

When creating a receipt, the payments array must include:

```json
{
  "payments": [
    {
      "payment_type_id": "e68a8970-7792-49f7-a0f3-f72c61371d46",
      "paid_at": "2024-10-14T12:30:00.000Z"
    }
  ]
}
```

**Required Fields:**

- `payment_type_id` - UUID of payment type from Loyverse
- `paid_at` - ISO 8601 timestamp

**Optional Fields:**

- `payment_details` - Additional payment information

### Payment Type IDs

Payment type IDs are unique to your Loyverse account. Get them via:

**API Endpoint:**

```
GET https://api.loyverse.com/v1.0/payment_types
```

**POS Method:**

1. Admin → Integration
2. Click "Get Payment Types"
3. Copy IDs from the list

## Best Practices

### 1. Cash Handling

- Always verify cash received amount
- Use quick cash buttons for speed
- Double-check change calculation
- Count change back to customer

### 2. Card Payments

- Process card at terminal before completing in POS
- Verify card approval before clicking "Complete Payment"
- Keep card terminal receipt for reconciliation

### 3. Crypto Transfers

- Wait for blockchain confirmation before completing
- Note transaction hash for records
- Verify exact amount received (account for fees)

### 4. Bank Transfers

- Verify transfer received before completing
- Note transfer reference number
- Confirm amount matches total (account for bank fees)

### 5. Receipt Management

- Print/email receipt after every transaction
- Keep digital copy in POS history
- Verify Loyverse sync status
- Handle failed syncs promptly

## Future Enhancements

### Potential Features:

1. **Custom Payment Types:** Allow adding more payment types
2. **Split Payments:** Multiple payment methods per transaction
3. **Payment Method Icons:** Custom icons from Loyverse
4. **Payment Analytics:** Reports by payment type
5. **Auto-sync Failed Payments:** Background retry for failed syncs
6. **Payment Limits:** Set min/max amounts per payment type
7. **Payment Notes:** Add notes to specific payment types

## Support

### Getting Payment Type IDs

- Use Admin → Integration → Payment Types feature
- Or call Loyverse API directly
- Or check Loyverse dashboard settings

### Sync Issues

- Check LOYVERSE_SYNC feature flag in .env.local
- Verify internet connection
- Check Loyverse API status
- Review sync error messages in receipt details

### Questions?

Refer to:

- `LOYVERSE_RECEIPT_SYNC.md` - Sync documentation
- `PAYMENT_TYPES_API.md` - Payment Types API docs
- `ENV_VARIABLES.md` - Configuration guide
