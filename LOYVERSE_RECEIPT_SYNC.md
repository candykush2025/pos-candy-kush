# Loyverse Receipt Sync Integration

## Overview

Every sale transaction made in the Candy Kush POS is now automatically synced to Loyverse using the Loyverse Receipts API. This creates a two-way integration where:

- Receipts created in Loyverse are visible in your POS
- Receipts created in your POS are synced to Loyverse
- All receipts are saved to Firebase with full Loyverse-compatible format

## Features

### 1. **Automatic Sync on Sale**

When a cashier completes a transaction:

1. The receipt is immediately sent to Loyverse API
2. The sync status is tracked (synced, failed, offline, pending)
3. The receipt is saved to Firebase with full Loyverse format
4. A local backup is saved to IndexedDB

### 2. **Sync Status Tracking**

Each receipt includes comprehensive sync information:

- **Synced** ✓ - Successfully synced to Loyverse
- **Pending** - Waiting to sync
- **Offline** - Created while offline, will sync when online
- **Failed** - Sync failed (with error message)
- **From Loyverse** - Receipt originated from Loyverse

### 3. **Device Tracking**

- Each device gets a unique ID on first use
- Receipts are tagged with `fromThisDevice: true` for receipts created locally
- You can see which device created each receipt

### 4. **History View**

The History tab in POS now displays:

- Sync status badges on each receipt card
- "This Device" badge for locally created receipts
- Loyverse receipt number when synced
- Detailed sync information in receipt details modal
- Sync error messages if sync failed

## Technical Details

### Receipt Data Structure

Receipts are saved in Firebase with Loyverse-compatible format:

```javascript
{
  // Local identifiers
  orderNumber: "ORD-20241014-001",
  deviceId: "device-1728934567890-xyz123",
  fromThisDevice: true,

  // Loyverse format
  receipt_number: "2-1009",           // From Loyverse after sync
  receipt_type: "SALE",
  order: "ORD-20241014-001",
  source: "Candy Kush POS",

  // Dates
  created_at: "2024-10-14T12:30:00.000Z",
  receipt_date: "2024-10-14T12:30:00.000Z",
  updated_at: "2024-10-14T12:30:00.000Z",

  // Money amounts
  total_money: 168.76,
  total_tax: 0,
  total_discount: 10.00,
  subtotal: 178.76,
  tip: 0,
  surcharge: 0,

  // IDs
  store_id: "42dc2cec-6f40-11ea-bde9-1269e7c5a22d",
  employee_id: null,                  // Loyverse employee ID if linked
  customer_id: null,                  // Loyverse customer ID if linked

  // Sync tracking
  syncStatus: "synced",               // synced | pending | offline | failed
  syncError: null,                    // Error message if failed
  syncedAt: "2024-10-14T12:30:01.000Z",
  loyverseReceiptNumber: "2-1009",
  loyverseResponse: {...},            // Full Loyverse API response

  // Line items (Loyverse format)
  line_items: [
    {
      item_id: "2ca3341b-0a7b-4375-990a-30d402e55a7e",
      variant_id: "06929667-cc44-4bbb-b226-6758285d7033",
      item_name: "Coffee",
      variant_name: null,
      sku: "21213",
      quantity: 2,
      price: 50,
      gross_total_money: 100,
      total_money: 100,
      cost: 25,
      cost_total: 50,
      line_taxes: [],
      line_discounts: [],
      line_modifiers: []
    }
  ],

  // Payment info
  payments: [
    {
      payment_type_id: "42dd2a55-6f40-11ea-bde9-1269e7c5a22d",
      name: "Cash",
      type: "CASH",
      money_amount: 168.76,
      paid_at: "2024-10-14T12:30:00.000Z"
    }
  ]
}
```

### Sync Flow

```
1. Cashier completes sale
   ↓
2. Check if online & Loyverse sync enabled
   ↓
3a. ONLINE: Send to Loyverse API
    → Success: syncStatus = "synced"
    → Failure: syncStatus = "failed" (with error message)
   ↓
3b. OFFLINE: syncStatus = "offline"
   ↓
4. Save to Firebase with sync status
   ↓
5. Save to IndexedDB for offline access
   ↓
6. Show receipt to cashier
```

### API Integration

**Create Receipt Endpoint:**

```
POST https://api.loyverse.com/v1.0/receipts
```

**Request Body:**

```json
{
  "store_id": "42dc2cec-6f40-11ea-bde9-1269e7c5a22d",
  "employee_id": null,
  "order": "ORD-20241014-001",
  "customer_id": null,
  "source": "Candy Kush POS",
  "receipt_date": "2024-10-14T12:30:00.000Z",
  "note": "Transaction from Candy Kush POS",
  "line_items": [
    {
      "variant_id": "06929667-cc44-4bbb-b226-6758285d7033",
      "quantity": 2,
      "price": 50,
      "cost": 25
    }
  ],
  "payments": [
    {
      "payment_type_id": "42dd2a55-6f40-11ea-bde9-1269e7c5a22d",
      "paid_at": "2024-10-14T12:30:00.000Z"
    }
  ]
}
```

## Configuration

### Constants (`src/config/constants.js`)

```javascript
export const LOYVERSE_CONFIG = {
  STORE_ID: "42dc2cec-6f40-11ea-bde9-1269e7c5a22d",
  DEFAULT_PAYMENT_TYPE_ID: "42dd2a55-6f40-11ea-bde9-1269e7c5a22d",
  SOURCE_NAME: "Candy Kush POS",
};

export const FEATURES = {
  LOYVERSE_SYNC: true, // Enable/disable Loyverse syncing
};
```

### Updating Store Configuration

To use your own Loyverse store:

1. Get your Store ID from Loyverse Dashboard
2. Get your default Payment Type ID
3. Update `LOYVERSE_CONFIG` in `src/config/constants.js`

## Usage

### For Cashiers

No changes needed! When completing a sale:

1. Complete payment as usual
2. System automatically syncs to Loyverse
3. Receipt shows sync status
4. In History tab, see which receipts synced successfully

### For Managers

**View Sync Status:**

1. Open POS → History tab
2. Look for sync status badges on each receipt:
   - Green ✓ "Synced" = Successfully in Loyverse
   - Yellow clock "Pending" = Waiting to sync
   - Gray WiFi off "Offline" = Created offline
   - Red X "Failed" = Sync error occurred

**View Sync Details:**

1. Click "View Details" on any receipt
2. See full sync information at the top:
   - Sync status badge
   - Loyverse receipt number (if synced)
   - "Created on This Device" badge
   - Sync error message (if failed)
   - Sync timestamp

### Troubleshooting

**Receipt shows "Failed" status:**

1. Click "View Details" to see error message
2. Common causes:
   - Invalid variant_id (product not in Loyverse)
   - Invalid store_id or payment_type_id
   - Network timeout
   - Loyverse API rate limit

**Receipt shows "Offline" status:**

- Normal when device is offline
- Will need manual retry when back online
- Consider implementing background sync queue

**Duplicate receipts in Loyverse:**

- Check that `order` field is unique per transaction
- Current format: `ORD-YYYYMMDD-NNN`

## File Changes

### Modified Files:

1. **`src/lib/api/loyverse.js`**

   - Added `createReceipt()` method for POST requests

2. **`src/config/constants.js`**

   - Added `LOYVERSE_CONFIG` with store IDs
   - Added `FEATURES.LOYVERSE_SYNC` flag

3. **`src/components/pos/SalesSection.jsx`**

   - Device ID initialization
   - Loyverse sync on checkout
   - Receipt data in Loyverse format
   - Sync status tracking
   - Error handling

4. **`src/components/pos/HistorySection.jsx`**
   - Sync status badge component
   - Display sync status on receipt cards
   - Sync details in modal
   - Device tracking display

## Future Enhancements

### Planned Features:

1. **Background Sync Queue**

   - Retry failed syncs automatically
   - Sync offline receipts when back online
   - Batch sync for better performance

2. **Sync Dashboard**

   - Admin page to view all sync statuses
   - Manual retry for failed syncs
   - Bulk sync operations

3. **Customer Linking**

   - Link local customers to Loyverse customers
   - Sync customer data both ways
   - Loyalty points integration

4. **Employee Linking**

   - Link cashiers to Loyverse employees
   - Track sales per employee in Loyverse
   - Commission tracking

5. **Inventory Sync**
   - Update Loyverse inventory on sale
   - Two-way inventory synchronization
   - Stock level alerts

## API Documentation

Full Loyverse API documentation:
https://developer.loyverse.com/docs/

**Receipts API:**
https://developer.loyverse.com/docs/#tag/Receipts

## Support

For issues or questions:

1. Check sync error messages in receipt details
2. Review Loyverse API documentation
3. Check network connectivity
4. Verify store_id and payment_type_id are correct
