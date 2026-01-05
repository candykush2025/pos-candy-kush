# Payment Types API Integration

## Overview

The integration admin page now includes a **Payment Types** section that fetches and displays all payment types configured in your Loyverse account.

## What This Does

### Purpose

- View all available payment types (Cash, Card, Transfer, etc.)
- Get Payment Type IDs for configuring receipts
- Verify payment type configurations
- Identify which stores use which payment types

### Use Cases

1. **Setup Configuration** - Find the correct Payment Type ID to use in `.env.local`
2. **Receipt Debugging** - Verify payment types exist before creating receipts
3. **Multi-Store Setup** - See which payment types are available per store
4. **Audit** - Review all payment methods configured in Loyverse

## How to Use

### Access the Feature

1. Go to **Admin → Integration**
2. Scroll to the **Payment Types** section
3. Click **"Get Payment Types"** button
4. View the results displayed below

### What You'll See

Each payment type shows:

- **Name** - Display name (e.g., "Cash", "Credit Card")
- **Type** - Payment method type badge (CASH, CARD, etc.)
- **ID** - The Payment Type ID (copy this for configuration)
- **Stores** - Number of stores configured
- **Created Date** - When it was created
- **Updated Date** - Last modification date
- **Deleted Badge** - Shows if payment type was deleted

### Example Output

```
┌─────────────────────────────────────────────────┐
│ Cash                              [CASH]        │
│ ID: 42dd2a55-6f40-11ea-bde9-1269e7c5a22d       │
│ Stores: 1 configured                            │
│ Created: 10/13/2025                             │
│ Updated: 10/14/2025                             │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Transfer                          [CARD]        │
│ ID: abc123def-456-789-xyz-123456789012          │
│ Stores: 1 configured                            │
│ Created: 10/13/2025                             │
└─────────────────────────────────────────────────┘
```

## Configuration Usage

### Finding Your Payment Type ID

1. Click "Get Payment Types" in Integration page
2. Find the payment type you want to use (e.g., "Cash")
3. Copy the ID shown (e.g., `42dd2a55-6f40-11ea-bde9-1269e7c5a22d`)
4. Add it to your `.env.local`:

```bash
NEXT_PUBLIC_LOYVERSE_PAYMENT_TYPE_ID=42dd2a55-6f40-11ea-bde9-1269e7c5a22d
```

5. Restart your dev server

### Multiple Payment Types

If you need to support multiple payment types in your POS:

```javascript
// Future enhancement: Payment type mapping
const paymentTypeMap = {
  cash: "42dd2a55-6f40-11ea-bde9-1269e7c5a22d",
  card: "abc123def-456-789-xyz-123456789012",
  transfer: "xyz789abc-123-456-def-987654321098",
};
```

## Technical Details

### API Endpoint

```
GET https://api.loyverse.com/v1.0/payment_types
```

### Request Parameters

| Parameter          | Type     | Description                                    |
| ------------------ | -------- | ---------------------------------------------- |
| `payment_type_ids` | string   | Comma-separated list of IDs to filter          |
| `created_at_min`   | datetime | Show payment types created after date          |
| `created_at_max`   | datetime | Show payment types created before date         |
| `updated_at_min`   | datetime | Show payment types updated after date          |
| `updated_at_max`   | datetime | Show payment types updated before date         |
| `show_deleted`     | boolean  | Include deleted payment types (default: false) |

### Response Structure

```json
{
  "payment_types": [
    {
      "id": "42dd2a55-6f40-11ea-bde9-1269e7c5a22d",
      "name": "Cash",
      "type": "CASH",
      "stores": [],
      "created_at": "2020-03-25T19:55:23.077Z",
      "updated_at": "2020-03-30T08:05:10.020Z",
      "deleted_at": null
    },
    {
      "id": "abc123def-456-789-xyz-123456789012",
      "name": "Credit Card",
      "type": "CARD",
      "stores": [
        {
          "store_id": "42dc2cec-6f40-11ea-bde9-1269e7c5a22d"
        }
      ],
      "created_at": "2020-03-25T19:55:23.077Z",
      "updated_at": "2020-03-30T08:05:10.020Z",
      "deleted_at": null
    }
  ]
}
```

### Payment Type Types

| Type     | Description                  |
| -------- | ---------------------------- |
| `CASH`   | Cash payments                |
| `CARD`   | Card payments (credit/debit) |
| `OTHER`  | Other payment methods        |
| `CUSTOM` | Custom payment types         |

## Code Implementation

### Files Modified

1. **`src/lib/api/loyverse.js`**

   - Added `getPaymentTypes()` method
   - Added `getAllPaymentTypes()` convenience method

2. **`src/app/api/loyverse/route.js`**

   - Added payment_types endpoint handling
   - Added parameter mapping for payment type queries

3. **`src/app/admin/integration/page.js`**
   - Added Payment Types section in UI
   - Added `handleGetPaymentTypes()` function
   - Added state management for payment types data
   - Added display component with badges and formatting

### Usage in Code

```javascript
import { loyverseService } from "@/lib/api/loyverse";

// Get all payment types
const response = await loyverseService.getAllPaymentTypes({
  show_deleted: false,
});

console.log(response.payment_types);

// Get specific payment types by ID
const response = await loyverseService.getPaymentTypes({
  payment_type_ids: "id1,id2,id3",
});

// Get payment types created after a date
const response = await loyverseService.getPaymentTypes({
  created_at_min: "2024-01-01T00:00:00.000Z",
});
```

## Common Scenarios

### Scenario 1: Finding Default Payment Type

**Need:** Set up default payment type for POS receipts

**Steps:**

1. Go to Integration page
2. Click "Get Payment Types"
3. Find "Cash" (most common default)
4. Copy the ID
5. Update `.env.local`:
   ```bash
   NEXT_PUBLIC_LOYVERSE_PAYMENT_TYPE_ID=your_cash_id_here
   ```

### Scenario 2: Multiple Store Setup

**Need:** Different stores use different payment types

**Steps:**

1. Get all payment types
2. Note which payment types are linked to which stores
3. Configure per-store settings in your app
4. Map store IDs to payment type IDs

### Scenario 3: Payment Type Not Working

**Problem:** Receipt creation fails with "Invalid payment_type_id"

**Solution:**

1. Go to Integration page
2. Click "Get Payment Types"
3. Verify the payment type ID exists
4. Check if payment type is deleted (red badge)
5. Update your configuration with valid ID

### Scenario 4: Adding New Payment Method

**Need:** Just added a new payment type in Loyverse

**Steps:**

1. Add payment type in Loyverse Dashboard
2. Go to Integration page in your POS
3. Click "Get Payment Types" to refresh
4. New payment type will appear in the list
5. Copy ID if needed for configuration

## Troubleshooting

### No Payment Types Showing

**Check:**

1. Loyverse access token is configured
2. Internet connection is active
3. Browser console for errors
4. Loyverse API status

**Fix:**

```bash
# Check .env.local has token
LOYVERSE_ACCESS_TOKEN=your_token_here

# Restart dev server
npm run dev
```

### Error: "Failed to fetch payment types"

**Possible Causes:**

1. Invalid access token
2. Network timeout
3. Loyverse API down
4. CORS issues (should be handled by proxy)

**Fix:**

1. Verify token in Loyverse Dashboard
2. Check network connection
3. Try "Test Connection" button first
4. Check browser console for detailed error

### Payment Type Shows as Deleted

**What it means:**

- Payment type was deleted in Loyverse
- Can't be used for new receipts
- Old receipts still show this payment type

**Fix:**

1. Create new payment type in Loyverse
2. Get updated payment types list
3. Update your configuration with new ID

## Best Practices

### Configuration Management

✅ **DO:**

- Store payment type IDs in environment variables
- Test payment types before production use
- Document which payment type is used for what
- Refresh payment types list after Loyverse changes

❌ **DON'T:**

- Hardcode payment type IDs in source code
- Use deleted payment types
- Share payment type IDs publicly (they're linked to your account)
- Assume payment types are the same across environments

### Security

- Payment Type IDs are safe to expose (they're in client-side code)
- Access token should remain secret (server-side only)
- IDs are specific to your Loyverse account

### Performance

- Payment types rarely change - no need to fetch frequently
- Cache results locally if needed
- Fetch once during initial setup
- Re-fetch only when:
  - Adding new payment type
  - Updating payment type configuration
  - Troubleshooting receipt issues

## Future Enhancements

Potential features to add:

1. **Payment Type Mapping**

   - Map POS payment methods to Loyverse payment types
   - Support multiple payment types per transaction
   - Dynamic payment type selection in POS

2. **Auto-Configuration**

   - Automatically detect and suggest default payment type
   - Auto-fill payment type ID in settings
   - Validation before saving configuration

3. **Store-Specific Settings**

   - Configure different payment types per store
   - Multi-store payment type management
   - Store-specific defaults

4. **Analytics**
   - Track which payment types are used most
   - Payment method trends
   - Revenue by payment type

## Related Documentation

- **ENV_VARIABLES.md** - Environment variable configuration
- **LOYVERSE_INTEGRATION.md** - Full Loyverse integration guide
- **LOYVERSE_RECEIPT_SYNC.md** - Receipt syncing documentation
- [Loyverse API Docs](https://developer.loyverse.com/) - Official API documentation

## Support

### Getting Help

1. Check this documentation first
2. Review error messages in browser console
3. Verify Loyverse API status
4. Test with "Test Connection" button
5. Check Loyverse Dashboard for payment type configuration

### Common Questions

**Q: How many payment types can I have?**
A: No limit in Loyverse (within reason)

**Q: Can I use the same payment type ID across stores?**
A: Yes, if the payment type is configured for those stores

**Q: What if I delete a payment type?**
A: Old receipts keep the data, but you can't use it for new receipts

**Q: Do payment types sync automatically?**
A: No, this is view-only. Click "Get Payment Types" to refresh.

---

**Last Updated:** October 14, 2025  
**Feature Status:** ✅ Active and Working
