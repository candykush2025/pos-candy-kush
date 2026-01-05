# Kiosk Customer API Integration

## Overview

This document describes the integration between the **Kiosk System** and the **POS System** for customer data synchronization.

## API Endpoint

**URL:** `https://candy-kush-kiosk.vercel.app/api/customers`  
**Method:** `GET`  
**Purpose:** Fetch all customers from the Kiosk system to import into POS

---

## Expected Response Format

### Success Response

```json
{
  "success": true,
  "data": [
    {
      // === Identifiers ===
      "id": "cust_12345", // Unique customer ID
      "customerId": "CUST-2024-001", // Human-readable customer code
      "memberId": "MEM-001", // Optional: Membership ID

      // === Personal Information ===
      "name": "John", // First name (required)
      "firstName": "John", // Alternative field for first name
      "lastName": "Doe", // Last name
      "nickname": "Johnny", // Nickname/preferred name
      "nationality": "Thai", // Nationality
      "dateOfBirth": "1990-01-15", // ISO date string
      "dob": "1990-01-15", // Alternative DOB field

      // === Contact Information ===
      "email": "john.doe@example.com", // Email address
      "phone": "+66812345678", // Phone number
      "cell": "+66812345678", // Alternative phone field

      // === Member Status ===
      "isNoMember": false, // true = guest, false = member
      "isActive": true, // Account active status

      // === Points & Loyalty ===
      "customPoints": 150, // Loyalty points balance
      "points": 150, // Alternative points field
      "totalSpent": 5000.0, // Lifetime spending (optional)
      "totalVisits": 25, // Total visit count (optional)

      // === Kiosk Permissions ===
      "allowedCategories": [
        // Categories customer can access
        "category-id-1",
        "category-id-2"
      ],

      // === Metadata ===
      "createdAt": "2024-01-15T10:30:00Z", // ISO timestamp (optional)
      "updatedAt": "2024-11-05T14:20:00Z" // ISO timestamp (optional)
    }
  ],
  "count": 1, // Total number of customers (optional)
  "message": "Customers fetched successfully" // Optional message
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message description",
  "message": "User-friendly error message"
}
```

---

## Field Mapping (Kiosk → POS)

| Kiosk Field                | POS Field           | Type    | Required | Default | Notes                |
| -------------------------- | ------------------- | ------- | -------- | ------- | -------------------- |
| `id` or `customerId`       | `id`                | string  | ✅       | -       | Primary identifier   |
| `customerId`               | `customerId`        | string  | ✅       | -       | Human-readable code  |
| `memberId`                 | `memberId`          | string  | ❌       | `""`    | Membership number    |
| `name` or `firstName`      | `name`              | string  | ✅       | -       | First name           |
| `lastName`                 | `lastName`          | string  | ❌       | `""`    | Last name            |
| `nickname`                 | `nickname`          | string  | ❌       | `""`    | Preferred name       |
| `nationality`              | `nationality`       | string  | ❌       | `""`    | Nationality          |
| `dateOfBirth` or `dob`     | `dateOfBirth`       | string  | ❌       | `""`    | ISO date format      |
| `email`                    | `email`             | string  | ❌       | `""`    | Email address        |
| `phone` or `cell`          | `phone` / `cell`    | string  | ❌       | `""`    | Contact number       |
| `isNoMember`               | `isNoMember`        | boolean | ❌       | `false` | Guest status         |
| `isActive`                 | `isActive`          | boolean | ❌       | `true`  | Account status       |
| `customPoints` or `points` | `customPoints`      | number  | ❌       | `0`     | Loyalty points       |
| `totalSpent`               | `totalSpent`        | number  | ❌       | `0`     | Lifetime spending    |
| `totalVisits`              | `totalVisits`       | number  | ❌       | `0`     | Visit count          |
| `allowedCategories`        | `allowedCategories` | array   | ❌       | `[]`    | Category permissions |
| `createdAt`                | `createdAt`         | string  | ❌       | auto    | ISO timestamp        |
| `updatedAt`                | `updatedAt`         | string  | ❌       | auto    | ISO timestamp        |

---

## Data Transformation

### Automatic Fields Added by POS

When importing from Kiosk, the POS system automatically adds:

```javascript
{
  tags: ["kiosk"],                    // Tag to identify Kiosk customers
  source: "kiosk",                    // Identifies data origin
  lastSyncedAt: "2024-11-05T...",    // Last import timestamp
  syncedToFirebase: true             // Saved to Firebase flag
}
```

**Note:** The `tags: ["kiosk"]` array is automatically added to all customers imported from the Kiosk system. This allows you to:

- Filter customers by source (show only Kiosk customers)
- Identify which customers originated from the Kiosk system
- Apply specific business logic to Kiosk customers

### Validation Rules

1. **Required Fields:**

   - `id` or `customerId` must be present
   - `name` or `firstName` must be present

2. **Data Types:**

   - Numeric fields (`customPoints`, `totalSpent`, `totalVisits`) default to `0`
   - Boolean fields (`isNoMember`, `isActive`) default to `false` and `true`
   - Arrays (`allowedCategories`) default to empty array `[]`

3. **Date Formats:**
   - All dates should be in ISO 8601 format: `YYYY-MM-DDTHH:mm:ssZ`
   - If only date is needed: `YYYY-MM-DD`

---

## Import Process Flow

```
┌─────────────────┐
│  Click "Import  │
│  from Kiosk"    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Fetch from Kiosk API           │
│  GET /api/customers             │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Transform Data                 │
│  - Map fields                   │
│  - Set defaults                 │
│  - Add tags: ["kiosk"]          │
│  - Add source: "kiosk"          │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Save to Firebase               │
│  - Check if exists (by ID)      │
│  - Update or Create             │
│  - Ensure all saved to Firebase │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Fetch ALL Customers            │
│  - Get complete list from       │
│    Firebase (Loyverse + Kiosk   │
│    + Local - mixed data)        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Sync to IndexedDB              │
│  (Local browser storage)        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Update UI                      │
│  - Show ALL customers (mixed)   │
│  - Apply source filters         │
│  - Show success message         │
└─────────────────────────────────┘
```

**Important:** After importing from Kiosk, the system fetches ALL customers from Firebase, not just the newly imported ones. This ensures the UI displays a mix of all customer sources (Loyverse, Kiosk, and Local).

---

## Example Usage

### Minimal Required Data

```json
{
  "success": true,
  "data": [
    {
      "id": "cust_001",
      "customerId": "CUST-001",
      "name": "John"
    }
  ]
}
```

### Full Customer Data

```json
{
  "success": true,
  "data": [
    {
      "id": "cust_12345",
      "customerId": "CUST-2024-001",
      "memberId": "MEM-001",
      "name": "John",
      "lastName": "Doe",
      "nickname": "Johnny",
      "nationality": "Thai",
      "dateOfBirth": "1990-01-15",
      "email": "john.doe@example.com",
      "phone": "+66812345678",
      "cell": "+66812345678",
      "isNoMember": false,
      "isActive": true,
      "customPoints": 150,
      "totalSpent": 5000.0,
      "totalVisits": 25,
      "allowedCategories": ["cat-001", "cat-002"],
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-11-05T14:20:00Z"
    }
  ],
  "count": 1
}
```

---

## Error Handling

### Kiosk API Errors

- **Network Error:** Shows toast with network failure message
- **Invalid Response:** Shows toast with invalid format message
- **Empty Data:** Shows success but indicates 0 customers imported

### Individual Customer Errors

- If a customer fails to save, the error is logged but doesn't stop the import
- Successfully imported customers are still saved
- Error details are logged to console

---

## Source Filtering

### Filter Options

The customer management page includes source filters to help you view customers from specific origins:

| Filter       | Description                          | Customer Source                      |
| ------------ | ------------------------------------ | ------------------------------------ |
| **Loyverse** | Customers synced from Loyverse POS   | `source: "loyverse"`                 |
| **Kiosk**    | Customers imported from Kiosk system | `source: "kiosk"`                    |
| **Local**    | Customers created directly in POS    | `source: "local"` or no source field |

### How to Use Filters

1. Navigate to Customer Management page
2. Look for the "Filter by Source" section below the search bar
3. Check/uncheck the checkboxes to show/hide customers from each source
4. The count next to each filter shows how many customers are from that source
5. The "Showing X of Y customers" indicator updates in real-time

### Filter Behavior

- **All checked:** Shows all customers (default)
- **Mixed selection:** Shows only customers from selected sources
- **None checked:** Shows no customers
- **Persists during search:** Filters work alongside the search functionality

---

## Testing

### Manual Testing Checklist

1. ✅ Click "Import from Kiosk" button
2. ✅ Verify loading state (button shows "Importing...")
3. ✅ Check console logs for fetched data
4. ✅ Verify customers appear in the list (mixed with existing)
5. ✅ Check Firebase to confirm data saved
6. ✅ Verify all customers are shown (not just Kiosk)
7. ✅ Test source filters (Loyverse, Kiosk, Local)
8. ✅ Verify filter counts match actual customer counts
9. ✅ Verify IndexedDB has synced data
10. ✅ Test with duplicate customers (should update)
11. ✅ Test with new customers (should create)

### Expected Console Logs

```
🏪 Kiosk API Response: {success: true, data: [...]}
🏪 Fetched customers from Kiosk: [...]
🏪 Number of customers: 5
✅ Created customer: John Doe
✅ Updated customer: Jane Smith
💾 All Kiosk customers saved to Firebase
📊 Total customers in Firebase: 15
```

---

## UI Features

### Button States

- **Normal:** "Import from Kiosk" with Download icon
- **Loading:** "Importing..." with bouncing Download icon
- **Disabled:** When already importing

### Toast Notifications

- **Info:** "Fetching customers from Kiosk..."
- **Success:** "Successfully imported X customers from Kiosk to POS"
- **Error:** "Failed to fetch from Kiosk: [error message]"

---

## Future Enhancements

### Potential Improvements

1. **Incremental Sync:** Only fetch customers updated since last sync
2. **Conflict Resolution:** Handle cases where customer edited in both systems
3. **Batch Import:** Process customers in batches for better performance
4. **Validation:** Pre-import validation of customer data
5. **Rollback:** Ability to rollback failed imports
6. **Scheduling:** Automatic periodic syncing from Kiosk

### Additional Fields to Consider

- `address` - Customer address
- `city`, `state`, `zipCode` - Address components
- `preferences` - Customer preferences (JSON)
- `tags` - Customer tags/categories
- `notes` - Admin notes about customer
- `loyaltyTier` - VIP/Gold/Silver tier status

---

## Security Considerations

### Current Implementation

- No authentication required for GET endpoint
- Data transmitted over HTTPS
- No sensitive data filtering

### Recommendations

1. **API Authentication:** Add API key or JWT token
2. **Rate Limiting:** Prevent abuse of the endpoint
3. **Data Validation:** Server-side validation of customer data
4. **Audit Logging:** Log all data import operations
5. **Data Encryption:** Encrypt sensitive fields (email, phone)

---

## Contact & Support

For issues or questions about the Kiosk API integration:

- **Kiosk System:** https://candy-kush-kiosk.vercel.app
- **POS System:** Current application
- **Documentation:** This file

---

**Last Updated:** November 5, 2024  
**Version:** 1.0.0
