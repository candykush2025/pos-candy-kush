# Loyverse Customer Sync Implementation

## Overview

Complete implementation of Loyverse Customer API integration with proper query parameters and data mapping.

## API Endpoint

```
GET https://api.loyverse.com/v1.0/customers
```

## Supported Query Parameters

### Filtering

- `customer_ids` (string) - Comma-separated list of customer IDs
- `email` (string) - Filter customers by email

### Date Ranges

- `created_at_min` (ISO 8601) - Show customers created after date
- `created_at_max` (ISO 8601) - Show customers created before date
- `updated_at_min` (ISO 8601) - Show customers updated after date
- `updated_at_max` (ISO 8601) - Show customers updated before date

### Pagination

- `limit` (integer, 1-250, default: 50) - Number of results per page
- `cursor` (string) - Pagination cursor from previous response

## API Response Structure

```json
{
  "customers": [
    {
      "id": "string",
      "name": "string",
      "email": "string",
      "phone_number": "string",
      "address": "string",
      "city": "string",
      "region": "string",
      "postal_code": "string",
      "country_code": "string",
      "customer_code": "string",
      "note": "string",
      "first_visit": null,
      "last_visit": null,
      "total_visits": 0,
      "total_spent": 120.55,
      "total_points": 0,
      "created_at": "2020-03-25T19:55:23.077Z",
      "updated_at": "2020-03-30T08:05:10.020Z",
      "deleted_at": "2020-04-02T23:45:20.050Z",
      "permanent_deletion_at": "2020-04-03T23:45:20.050Z"
    }
  ],
  "cursor": "eyJpZCI6MTIzfQ=="
}
```

## Data Transformation

### Loyverse API → Local Database

```javascript
{
  // Identity
  id: cust.id,                              // Loyverse customer ID
  name: cust.name,                          // Customer name
  customerCode: cust.customer_code,         // Custom customer code

  // Contact Information
  email: cust.email,                        // Email address
  phone: cust.phone_number,                 // Phone number

  // Address
  address: cust.address,                    // Street address
  city: cust.city,                          // City
  province: cust.region,                    // State/Province
  postalCode: cust.postal_code,             // Postal/ZIP code
  countryCode: cust.country_code,           // Country code (e.g., "US")

  // Additional Info
  note: cust.note,                          // Customer notes

  // Visit & Spending Data
  firstVisit: cust.first_visit,             // First visit timestamp
  lastVisit: cust.last_visit,               // Last visit timestamp
  totalVisits: cust.total_visits,           // Total number of visits
  totalSpent: cust.total_spent,             // Total amount spent
  totalPoints: cust.total_points,           // Loyalty points balance

  // Timestamps
  createdAt: cust.created_at,               // Creation date
  updatedAt: cust.updated_at,               // Last update date
  deletedAt: cust.deleted_at,               // Soft delete date
  permanentDeletionAt: cust.permanent_deletion_at, // Permanent deletion date

  // Source Tracking
  source: "loyverse"                        // Data source identifier
}
```

## Implementation Files

### 1. API Service (`src/lib/api/loyverse.js`)

```javascript
/**
 * Get list of customers with filtering and pagination
 */
async getCustomers(params = {}) {
  const requestParams = {};

  // Validation and parameter handling
  if (params.limit) {
    requestParams.limit = Math.min(Math.max(params.limit, 1), 250);
  }
  if (params.customer_ids) requestParams.customer_ids = params.customer_ids;
  if (params.email) requestParams.email = params.email;
  if (params.created_at_min) requestParams.created_at_min = params.created_at_min;
  if (params.created_at_max) requestParams.created_at_max = params.created_at_max;
  if (params.updated_at_min) requestParams.updated_at_min = params.updated_at_min;
  if (params.updated_at_max) requestParams.updated_at_max = params.updated_at_max;
  if (params.cursor) requestParams.cursor = params.cursor;

  return await this.request("/customers", requestParams);
}

/**
 * Get all customers with automatic pagination
 */
async getAllCustomers(params = {}) {
  let allCustomers = [];
  let cursor = null;
  let hasMore = true;

  while (hasMore) {
    const requestParams = { ...params, limit: 250 };
    if (cursor) requestParams.cursor = cursor;

    const response = await this.getCustomers(requestParams);

    if (response.customers?.length > 0) {
      allCustomers = [...allCustomers, ...response.customers];
    }

    cursor = response.cursor;
    hasMore = !!cursor && cursor !== "";
  }

  return {
    customers: allCustomers,
    total: allCustomers.length,
  };
}
```

### 2. API Proxy (`src/app/api/loyverse/route.js`)

Handles customer-specific parameters:

```javascript
if (endpoint.includes("customers")) {
  const customer_ids = searchParams.get("customer_ids");
  const email = searchParams.get("email");
  const created_at_min = searchParams.get("created_at_min");
  const created_at_max = searchParams.get("created_at_max");
  const updated_at_min = searchParams.get("updated_at_min");
  const updated_at_max = searchParams.get("updated_at_max");

  if (customer_ids) queryParams.append("customer_ids", customer_ids);
  if (email) queryParams.append("email", email);
  if (created_at_min) queryParams.append("created_at_min", created_at_min);
  if (created_at_max) queryParams.append("created_at_max", created_at_max);
  if (updated_at_min) queryParams.append("updated_at_min", updated_at_min);
  if (updated_at_max) queryParams.append("updated_at_max", updated_at_max);
}
```

### 3. Integration Page (`src/app/admin/integration/page.js`)

Sync customers from Loyverse to local database:

```javascript
const handleSyncCustomers = async () => {
  setSyncing({ ...syncing, customers: true });
  try {
    // Fetch all customers
    const response = await loyverseService.getAllCustomers();

    // Transform to local format
    const customers = response.customers.map((cust) => ({
      id: cust.id,
      name: cust.name || "",
      customerCode: cust.customer_code || "",
      email: cust.email || "",
      phone: cust.phone_number || "",
      address: cust.address || "",
      city: cust.city || "",
      province: cust.region || "",
      postalCode: cust.postal_code || "",
      countryCode: cust.country_code || "",
      note: cust.note || "",
      firstVisit: cust.first_visit || null,
      lastVisit: cust.last_visit || null,
      totalVisits: parseInt(cust.total_visits || 0),
      totalSpent: parseFloat(cust.total_spent || 0),
      totalPoints: parseFloat(cust.total_points || 0),
      createdAt: cust.created_at,
      updatedAt: cust.updated_at,
      deletedAt: cust.deleted_at || null,
      permanentDeletionAt: cust.permanent_deletion_at || null,
      source: "loyverse",
    }));

    // Save to IndexedDB
    await dbService.upsertCustomers(customers);

    toast.success(`✅ Synced ${customers.length} customers`);
  } catch (error) {
    toast.error(`❌ Sync failed: ${error.message}`);
  }
};
```

## Usage Examples

### Example 1: Get All Customers

```javascript
const response = await loyverseService.getAllCustomers();
console.log(`Total customers: ${response.total}`);
```

### Example 2: Get Customers by Email

```javascript
const response = await loyverseService.getCustomers({
  email: "customer@example.com",
  limit: 10,
});
```

### Example 3: Get Customers Created in Date Range

```javascript
const response = await loyverseService.getCustomers({
  created_at_min: "2024-01-01T00:00:00.000Z",
  created_at_max: "2024-12-31T23:59:59.999Z",
  limit: 250,
});
```

### Example 4: Get Specific Customers by IDs

```javascript
const response = await loyverseService.getCustomers({
  customer_ids: "id1,id2,id3",
});
```

## Testing

### In Admin Integration Page:

1. **Test Connection**

   ```javascript
   await loyverseService.getCustomers({ limit: 1 });
   ```

2. **Sync All Customers**

   - Go to Admin → Integration
   - Click "Sync Customers" button
   - Verify success toast shows count
   - Check browser console for debug data

3. **Verify in Database**
   ```javascript
   const customers = await dbService.getCustomers();
   console.log(customers);
   ```

## Key Features

✅ **Proper Pagination** - Handles cursor-based pagination automatically
✅ **Date Filtering** - Supports created_at and updated_at ranges
✅ **Email Filtering** - Find customers by email
✅ **Visit Tracking** - Stores first_visit, last_visit, total_visits
✅ **Spending Data** - Tracks total_spent and total_points
✅ **Soft Delete Support** - Includes deleted_at timestamp
✅ **Source Tracking** - Marks synced data with "loyverse" source

## Important Notes

### Data Sorting

Customers are sorted by `created_at` in **descending order** (most recent first).

### Visit Data

- `first_visit`: Can be `null` if customer hasn't visited yet
- `last_visit`: Can be `null` if customer hasn't visited yet
- `total_visits`: Number of store visits

### Financial Data

- `total_spent`: Total amount customer has spent (float)
- `total_points`: Loyalty points balance (float)

### Deletion

- `deleted_at`: Soft delete timestamp (customer still in system)
- `permanent_deletion_at`: Scheduled permanent deletion timestamp

## Common Issues & Solutions

### Issue: No customers synced

**Solution**: Check that customers exist in Loyverse and API token has correct permissions.

### Issue: Some customer fields are null

**Solution**: This is normal - not all fields are required in Loyverse. Handle with `|| ""` or `|| null`.

### Issue: Pagination cursor error

**Solution**: Already fixed - cursor only sent when it has a valid value.

### Issue: Date filter not working

**Solution**: Use ISO 8601 format: `2020-03-30T18:30:00.000Z`

## Next Steps

- [ ] Add incremental sync (only sync updated customers)
- [ ] Add customer search in POS
- [ ] Display customer visit history
- [ ] Show customer spending analytics
- [ ] Implement loyalty points redemption
