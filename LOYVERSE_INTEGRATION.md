# Loyverse Integration Guide

## Overview

This integration allows you to sync data from your Loyverse POS system to the Candy Kush POS local database. It's a **one-way sync** from Loyverse → Local Database.

## Access Token

**Store ID**: pos-candy-kush  
**Access Token**: `d390d2223e2c4537a12f9bd60860c2b8`

## Features

### 1. **Categories Sync**

- Fetches all product categories from Loyverse
- Automatically handles pagination (up to 250 per request)
- Saves to IndexedDB for offline access
- Includes category name and color

### 2. **Products Sync**

- Syncs all items/products from Loyverse
- Includes:
  - Product name, description, SKU, barcode
  - Pricing (default price and cost)
  - Category assignment
  - Stock quantity
  - Product images
- Maps Loyverse variants to single product format

### 3. **Customers Sync**

- Fetches all customer data
- Includes:
  - Name, contact info (email, phone)
  - Address details (full address, city, region, postal code)
  - Customer code and loyalty points
  - Visit history

### 4. **Debug Tools**

- Test API connection
- View raw API responses
- Console logging for troubleshooting

## How to Use

### Access the Integration Page

1. Login to admin panel
2. Navigate to: **Admin → Integration**
3. You'll see the Loyverse Integration dashboard

### Test Connection

```
1. Click "Test Connection" button
2. Should see: "✅ Connection successful!"
3. Debug data panel will show first category
```

### Sync Individual Data

```
Categories:
- Click "Sync Categories" button
- Wait for completion
- Shows count of synced items

Products:
- Click "Sync Products" button
- May take longer (more data)
- Shows success status

Customers:
- Click "Sync Customers" button
- Syncs all customer records
```

### Sync All Data

```
1. Click "Sync All Data" button
2. Syncs in order: Categories → Products → Customers
3. Shows progress for each type
4. Completion toast when finished
```

## API Endpoints Used

### Categories

```
GET https://api.loyverse.com/v1.0/categories
Query Parameters:
- limit: 1-250 (default: 50)
- cursor: for pagination
- show_deleted: boolean (default: false)
- categories_ids: comma-separated IDs
```

### Items (Products)

```
GET https://api.loyverse.com/v1.0/items
Query Parameters:
- limit: 1-250
- cursor: for pagination
- show_deleted: boolean
- item_ids: comma-separated IDs
```

### Customers

```
GET https://api.loyverse.com/v1.0/customers
Query Parameters:
- limit: 1-250
- cursor: for pagination
- customer_ids: comma-separated IDs
```

### Receipts (Orders)

```
GET https://api.loyverse.com/v1.0/receipts
Query Parameters:
- limit: 1-250
- cursor: for pagination
- created_at_min: ISO 8601 date
- created_at_max: ISO 8601 date
```

## Data Transformation

### Category Mapping

```javascript
Loyverse → Local Database
{
  id: loyverse.id,
  name: loyverse.name,
  color: loyverse.color,
  createdAt: loyverse.created_at,
  updatedAt: loyverse.updated_at,
  deletedAt: loyverse.deleted_at,
  source: "loyverse"
}
```

### Product Mapping

```javascript
Loyverse Item → Local Product
{
  id: item.id,
  name: item.item_name,
  description: item.description,
  sku: item.reference_id,
  barcode: item.variants[0].barcode,
  price: item.variants[0].default_price,
  cost: item.variants[0].cost,
  categoryId: item.category_id,
  stock: item.variants[0].stock_quantity,
  image: item.image_url,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
  source: "loyverse"
}
```

### Customer Mapping

```javascript
Loyverse Customer → Local Customer
{
  id: customer.id,
  name: customer.name || first_name + last_name,
  customerCode: customer.customer_code,
  email: customer.email,
  phone: customer.phone_number,
  address: customer.address,
  city: customer.city,
  province: customer.region,
  postalCode: customer.postal_code,
  country: customer.country,
  note: customer.note,
  points: customer.total_points,
  visits: customer.total_visits,
  lastVisit: customer.last_visit,
  source: "loyverse"
}
```

## Code Structure

### Files Created

#### 1. Loyverse Service (`src/lib/api/loyverse.js`)

```javascript
// Main service class
class LoyverseService {
  // Core methods
  request(endpoint, options)

  // Data fetching
  getCategories(params)
  getAllCategories(params)
  getItems(params)
  getAllItems(params)
  getCustomers(params)
  getAllCustomers(params)
  getReceipts(params)
}

// Singleton export
export const loyverseService = new LoyverseService();
```

#### 2. Integration Page (`src/app/admin/integration/page.js`)

```javascript
// Main component
export default function IntegrationPage() {
  // State management
  - loading states
  - sync results
  - debug data

  // Handlers
  - handleTestConnection()
  - handleSyncCategories()
  - handleSyncItems()
  - handleSyncCustomers()
  - handleSyncAll()

  // UI Components
  - API Status Card
  - Sync Action Cards (Categories, Products, Customers)
  - Full Sync Button
  - Debug Data Viewer
  - Instructions
}
```

#### 3. Admin Layout Update (`src/app/admin/layout.js`)

```javascript
// Added navigation item
{
  name: "Integration",
  href: "/admin/integration",
  icon: Link2
}
```

## Pagination Handling

The Loyverse API uses cursor-based pagination:

```javascript
async getAllCategories() {
  let allCategories = [];
  let cursor = null;
  let hasMore = true;

  while (hasMore) {
    const response = await getCategories({
      cursor,
      limit: 250 // Max per request
    });

    allCategories.push(...response.categories);
    cursor = response.cursor;
    hasMore = !!cursor;
  }

  return allCategories;
}
```

## Error Handling

```javascript
try {
  const response = await loyverseService.getCategories();
  // Success
} catch (error) {
  // Error types:
  // 1. Network errors
  // 2. API errors (401, 403, 404, 500)
  // 3. Invalid token
  // 4. Rate limiting
  console.error("API Error:", error);
  toast.error(`Failed: ${error.message}`);
}
```

## Security Considerations

### Current Implementation

- ✅ Access token stored in service file
- ✅ HTTPS API requests
- ✅ Authorization header

### Production Recommendations

1. **Environment Variables**

   ```javascript
   // .env.local
   NEXT_PUBLIC_LOYVERSE_TOKEN = d390d2223e2c4537a12f9bd60860c2b8;

   // In code
   const token = process.env.NEXT_PUBLIC_LOYVERSE_TOKEN;
   ```

2. **Token Rotation**

   - Generate new token periodically
   - Implement token expiry handling

3. **Rate Limiting**

   - Add request throttling
   - Implement retry logic with backoff

4. **Error Logging**
   - Send errors to monitoring service
   - Track API usage metrics

## Troubleshooting

### Connection Fails

**Problem**: "Connection failed" error

**Solutions**:

1. Verify access token is correct
2. Check internet connection
3. Verify API endpoint is accessible
4. Check browser console for detailed errors

### No Data Returned

**Problem**: Sync completes but 0 items

**Solutions**:

1. Check if Loyverse account has data
2. Verify `show_deleted: false` parameter
3. Check API response in debug panel
4. Verify data transformation logic

### Sync Takes Too Long

**Problem**: Sync never completes

**Solutions**:

1. Check network connection
2. Reduce limit per request
3. Check for API rate limits
4. Monitor browser console for errors

### Data Not Appearing in POS

**Problem**: Synced but not visible

**Solutions**:

1. Check IndexedDB in DevTools
2. Verify data saved correctly
3. Refresh POS page
4. Check product/category filters

## Testing Checklist

- [ ] Test API connection
- [ ] Sync categories (should see count)
- [ ] Check IndexedDB for categories
- [ ] Sync products
- [ ] Verify products have correct category
- [ ] Sync customers
- [ ] Check customer data integrity
- [ ] Test "Sync All" button
- [ ] Verify no duplicate entries
- [ ] Test error handling (disconnect internet)
- [ ] Check debug data viewer
- [ ] Verify console logs are useful

## API Rate Limits

Loyverse API limits (check current documentation):

- **Rate limit**: Unknown (implement conservative approach)
- **Max per page**: 250 items
- **Timeout**: 30 seconds default

**Best Practices**:

- Use maximum limit (250) to reduce requests
- Implement exponential backoff on errors
- Cache responses when possible
- Schedule syncs during off-peak hours

## Future Enhancements

### Planned Features

1. **Auto-sync**

   - Schedule automatic syncs (e.g., every hour)
   - Background sync using Web Workers

2. **Selective Sync**

   - Sync only updated items (use timestamps)
   - Incremental sync for large datasets

3. **Two-way Sync**

   - Push local changes to Loyverse
   - Conflict resolution strategy

4. **Receipts/Orders Sync**

   - Import historical orders
   - Sync completed sales

5. **Real-time Sync**

   - WebSocket connection
   - Instant updates

6. **Sync History**

   - Track all sync operations
   - Show sync logs
   - Rollback capability

7. **Data Mapping UI**

   - Custom field mapping
   - Transform rules editor

8. **Multi-store Support**
   - Sync from multiple Loyverse stores
   - Store switching

## Support & Resources

### Official Documentation

- **Loyverse Developer Portal**: https://developer.loyverse.com/
- **API Reference**: https://developer.loyverse.com/docs/
- **Authentication**: https://developer.loyverse.com/docs/authentication

### Internal Files

- `src/lib/api/loyverse.js` - Service implementation
- `src/app/admin/integration/page.js` - UI component
- `src/lib/db/dbService.js` - Local database operations

### Useful Commands

```bash
# Check IndexedDB data
# Open DevTools → Application → IndexedDB → PosDB

# View sync logs
# Open DevTools → Console → Filter: "Loyverse"

# Clear synced data
# IndexedDB → PosDB → Right-click table → Clear
```

## Notes

- This is a **one-way sync** (Loyverse → Local)
- Data stored in **IndexedDB** for offline access
- **No automatic sync** - manual trigger required
- **Safe to run multiple times** - uses upsert (update or insert)
- **Source tracking** - all synced items marked with `source: "loyverse"`

---

**Last Updated**: October 13, 2025  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
