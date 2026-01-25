# ISY Order Sync Implementation - Complete Guide

## Overview

This document describes the complete implementation of the silent order synchronization system between the POS system and api.isy.software.

**Key Features:**

- ✅ Silent background sync (no cashier UI)
- ✅ Firebase logging of all sync attempts
- ✅ Developer-only debug interface
- ✅ Individual and bulk retry functionality
- ✅ Basic Authentication
- ✅ Automatic sync on every transaction

## Architecture

### Flow Diagram

```
┌─────────────────┐
│   Cashier POS   │
│  (SalesSection) │
└────────┬────────┘
         │ 1. Complete Sale
         ▼
┌─────────────────────────┐
│  Save to Firebase       │
│  (receipts collection)  │
└────────┬────────────────┘
         │ 2. Success
         ▼
┌──────────────────────────────┐
│  duplicateOrderToISY()       │
│  (orderDuplicationService)   │
└────────┬─────────────────────┘
         │ 3. Transform & Send
         ▼
┌─────────────────────────────────┐
│  POST to api.isy.software       │
│  Basic Auth: candykush_cashier  │
└────────┬────────────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌─────────┐
│Success │ │ Failed  │
└───┬────┘ └────┬────┘
    │           │
    └─────┬─────┘
          │ 4. Log Result
          ▼
┌──────────────────────────┐
│  Firebase syncReceipts   │
│  (all attempts logged)   │
└──────────────────────────┘
          │
          │ 5. Developer View
          ▼
┌──────────────────────────┐
│   /debug/sync Page       │
│  - View logs             │
│  - Retry failed syncs    │
│  - Monitor statistics    │
└──────────────────────────┘
```

## Implementation Details

### 1. Environment Configuration

**File:** `.env.local`

```env
# ISY API Configuration
NEXT_PUBLIC_ISY_API_URL=https://api.isy.software
NEXT_PUBLIC_ISY_API_ENABLED=true
NEXT_PUBLIC_ISY_API_USERNAME=candykush_cashier
NEXT_PUBLIC_ISY_API_PASSWORD=admin123
```

**Purpose:** Store API credentials and configuration

### 2. Order Duplication Service

**File:** `src/lib/services/orderDuplicationService.js`

**Key Functions:**

#### `duplicateOrderToISY(receiptData, cashier)`

- Main function called after each sale
- Transforms receipt data to ISY API format
- Sends POST request with Basic Auth
- Logs all attempts to Firebase `syncReceipts` collection
- Returns success/failure status

#### `retryFromLog(logId)`

- Retrieves sync log from Firebase by ID
- Extracts original order data and cashier info
- Calls `duplicateOrderToISY()` to retry
- Used by debug page for manual retries

#### `getSyncLog(logId)`

- Helper function to fetch sync log from Firebase
- Used for retry operations

#### `logSyncToFirebase(syncLog)`

- Internal function to save sync attempt to Firebase
- Creates document in `syncReceipts` collection
- Stores all relevant data for debugging and retry

**Authentication:** Basic Auth using btoa()

```javascript
const credentials = btoa(`${username}:${password}`);
headers: {
  'Authorization': `Basic ${credentials}`
}
```

### 3. POS Integration

**File:** `src/components/pos/SalesSection.jsx`

**Integration Point:**

```javascript
// After saving to Firebase receipts collection
if (process.env.NEXT_PUBLIC_ISY_API_ENABLED === "true") {
  duplicateOrderToISY(receiptData, currentUser).catch((error) => {
    // Silent error - logged to Firebase
    console.error("ISY sync failed:", error);
  });
}
```

**Key Changes:**

- ❌ Removed toast notifications to cashiers
- ❌ Removed IndexedDB queue management
- ✅ Silent background execution
- ✅ No UI changes for cashiers

### 4. Firebase Schema

**Collection:** `syncReceipts`

**Document Structure:**

```javascript
{
  // Identification
  orderNumber: "ORD-2024-001",
  receiptId: "firebase_receipt_id",

  // Timing
  attemptedAt: "2024-01-15T10:30:00Z",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  duration: 1234, // milliseconds

  // Status
  status: "success" | "failed" | "pending",

  // API Details
  apiUrl: "https://api.isy.software/pos/v1/orders",
  httpStatus: 200,

  // Success Data
  isyOrderId: "ISY-12345",
  response: { /* API response */ },

  // Error Data (if failed)
  error: "Error message",
  errorCode: "ERROR_CODE",
  errorType: "TypeError",
  errorDetails: { /* additional info */ },

  // Retry Data (for manual retries)
  orderData: { /* complete order data */ },
  cashierId: "user_id",
  cashierName: "John Doe"
}
```

**Indexes Recommended:**

- `status` (for filtering)
- `createdAt` (for ordering)
- `orderNumber` (for searching)

### 5. Debug Interface

**File:** `src/app/debug/sync/page.jsx`

**URL:** `https://your-domain.com/debug/sync`

**Features:**

#### Statistics Dashboard

- Total syncs
- Success count (green)
- Failed count (red)
- Pending count (yellow)

#### Filters

- All syncs
- Success only
- Failed only
- Pending only

#### Search

- Search by order number

#### Actions

- **Refresh**: Reload logs from Firebase
- **Retry All Failed**: Bulk retry all failed syncs
- **Clear Successful**: Remove successful logs

#### Individual Log Actions

- **Retry**: Retry single failed sync
- **Delete**: Remove log entry

**UI Components Used:**

- shadcn/ui Card, Button, Badge, Input
- lucide-react Icons
- sonner Toast notifications

### 6. API Data Format

**Endpoint:** `POST https://api.isy.software/pos/v1/orders`

**Request Format:**

```javascript
{
  // Order identification
  orderNumber: "ORD-2024-001",
  receipt_number: "RCP-001",
  deviceId: "device_123",

  // Timestamps
  created_at: "2024-01-15T10:30:00Z",
  receipt_date: "2024-01-15",

  // Customer
  customerId: "cust_123",
  customerName: "John Doe",
  customer: {
    id: "cust_123",
    name: "John",
    lastName: "Doe",
    email: "john@example.com",
    phone: "+1234567890"
  },

  // Line items
  line_items: [
    {
      id: "item_1",
      item_id: "prod_123",
      item_name: "Product Name",
      quantity: 2,
      price: 10.00,
      total_money: 20.00,
      cost: 5.00,
      cost_total: 10.00
    }
  ],

  // Pricing
  subtotal: 20.00,
  total_discount: 2.00,
  total_tax: 1.80,
  total_money: 19.80,
  tip: 0,
  surcharge: 0,

  // Payment
  paymentMethod: "cash",
  paymentTypeName: "Cash",
  cashReceived: 20.00,
  change: 0.20,

  // Points & Cashback
  points_earned: 10,
  cashback_earned: 0.50,

  // Employee
  cashierId: "emp_123",
  cashierName: "Jane Smith",

  // Status
  status: "completed",
  source: "POS System"
}
```

## Workflow

### 1. Normal Sale Flow

1. Cashier completes a sale in POS
2. Order saved to Firebase `receipts` collection
3. `duplicateOrderToISY()` called automatically
4. Order data transformed to ISY format
5. POST request sent with Basic Auth
6. Result logged to Firebase `syncReceipts` collection
7. Cashier sees no notification (silent)

### 2. Successful Sync

- Status: `"success"`
- `isyOrderId` stored in sync log
- HTTP 200-299 response
- Order available in ISY system immediately

### 3. Failed Sync

- Status: `"failed"`
- Error message and details stored
- HTTP error code recorded
- No notification to cashier
- Available for retry in debug page

### 4. Developer Retry Flow

1. Developer accesses `/debug/sync`
2. Views failed syncs with error details
3. Clicks "Retry" on specific order
4. `retryFromLog()` fetches original order data
5. `duplicateOrderToISY()` called again
6. New sync log created with result
7. Toast notification shows outcome

### 5. Bulk Retry Flow

1. Developer clicks "Retry All Failed"
2. System retrieves all failed sync logs
3. Loops through each with 500ms delay
4. Retries using original order data
5. Shows success/failure count
6. Refreshes log display

## Security Considerations

### 1. Credentials

- Stored in environment variables
- Not exposed to client (use NEXT*PUBLIC* carefully)
- Basic Auth over HTTPS only

### 2. Debug Page Access

- Consider adding authentication
- Restrict to admin/developer routes
- Contains sensitive customer data

### 3. Firebase Security Rules

```javascript
// Suggested rules for syncReceipts collection
match /syncReceipts/{syncId} {
  // Allow authenticated users to read/write
  allow read, write: if request.auth != null;

  // Or restrict to specific admin role
  allow read, write: if request.auth.token.role == 'admin';
}
```

### 4. Data Retention

- Consider auto-deleting old successful logs
- Keep failed logs for investigation
- Implement data retention policy

## Monitoring & Maintenance

### Daily Checks

1. Visit `/debug/sync`
2. Check failed sync count
3. Review error messages
4. Retry failed syncs if appropriate

### Weekly Maintenance

1. Clear old successful logs
2. Review error patterns
3. Update documentation for new error types
4. Monitor sync performance (duration)

### When to Investigate

- Failed count > 5% of total
- Same error repeating frequently
- Sync duration increasing
- HTTP 4xx errors (data issues)
- HTTP 5xx errors (API issues)

## Testing Checklist

### Initial Setup

- [ ] Environment variables configured
- [ ] Firebase `syncReceipts` collection accessible
- [ ] Debug page loads without errors
- [ ] API credentials valid

### Sync Testing

- [ ] Complete a test sale
- [ ] Verify sync log created in Firebase
- [ ] Check if order appears in ISY system
- [ ] Verify no UI shown to cashier
- [ ] Check sync log has complete data

### Retry Testing

- [ ] Cause a failed sync (wrong credentials)
- [ ] View failed sync in debug page
- [ ] Fix credentials
- [ ] Retry single sync
- [ ] Verify success status updated

### Bulk Testing

- [ ] Create multiple failed syncs
- [ ] Use "Retry All Failed" button
- [ ] Verify all retries processed
- [ ] Check success/failure counts
- [ ] Confirm logs updated

### Error Handling

- [ ] Test with no internet
- [ ] Test with invalid credentials
- [ ] Test with invalid order data
- [ ] Verify error messages are clear
- [ ] Confirm retry functionality works

## Troubleshooting

### Syncs Not Happening

1. Check `NEXT_PUBLIC_ISY_API_ENABLED=true`
2. Verify environment variables loaded
3. Check browser console for errors
4. Verify `duplicateOrderToISY()` is called

### All Syncs Failing

1. Verify API credentials
2. Test API endpoint manually (Postman)
3. Check network connectivity
4. Review API error messages
5. Verify Basic Auth format

### Debug Page Not Loading

1. Check if `/debug/sync` route exists
2. Verify Firebase connection
3. Check browser console for errors
4. Ensure shadcn/ui components installed

### Retry Not Working

1. Verify `orderData` in sync log
2. Check if `retryFromLog()` function exists
3. Ensure Firebase permissions allow updates
4. Check console for error messages

## Performance Considerations

### Sync Duration

- Normal: 200-500ms
- Slow: 500-2000ms
- Timeout: >5000ms

### Optimization

- Sync happens async (doesn't block UI)
- Small delay between bulk retries
- Consider batch API endpoint for bulk operations

### Scaling

- Current: Sequential syncs
- Future: Queue-based system with workers
- Consider: Rate limiting on API side

## Related Documentation

- [ISY_API_DOCUMENTATION.md](./ISY_API_DOCUMENTATION.md) - Complete API reference
- [ISY_SYNC_DEBUG_GUIDE.md](./ISY_SYNC_DEBUG_GUIDE.md) - Debug page usage guide
- [ISY_INTEGRATION_COMPLETE.md](./ISY_INTEGRATION_COMPLETE.md) - Original implementation guide

## Version History

### v2.0 (Current - Silent Sync)

- Silent background sync
- Firebase logging system
- Debug page for developers
- Basic Authentication
- Retry functionality

### v1.0 (Deprecated)

- JWT authentication
- Cashier-facing UI
- IndexedDB queue
- Background sync service

## Support

For issues or questions:

1. Check debug page error messages
2. Review Firebase sync logs
3. Test API endpoint manually
4. Check this documentation
5. Contact ISY API support if needed

## Future Enhancements

### Planned

- [ ] Real-time sync status updates
- [ ] Email notifications for failures
- [ ] Automatic retry scheduling
- [ ] Sync performance analytics
- [ ] Export logs to CSV

### Under Consideration

- [ ] Webhook for sync events
- [ ] Advanced filtering in debug page
- [ ] Sync queue dashboard
- [ ] API health monitoring
- [ ] Multi-location sync support
