# Stock Count Showing Zero - Fixed

## Problem

All products were showing stock count as **0** even though inventory exists in Loyverse.

## Root Cause

When products are synced from Loyverse using the **Items API**, the stock/inventory data is **NOT included**.

Loyverse has a separate **Inventory API** (`/v1.0/inventory`) that must be called to get stock levels for each product variant.

## Why This Happens

- **Items API** returns product information (name, price, SKU, variants)
- **Inventory API** returns stock levels per store
- These are separate API endpoints for performance reasons

## Solution Implemented

### 1. Added "Sync Stock" Button to Products Page

**Location**: Products Items page header (next to "Add Product" button)

**Features**:

- Icon-only on mobile (refresh icon)
- Full label on desktop ("Sync Stock")
- Shows loading state with spinning animation
- Processes products in batches (10 at a time)
- Updates stock counts in real-time

**Usage**:

1. Go to **Admin → Products → Items**
2. Click **"Sync Stock"** button (or refresh icon on mobile)
3. Wait for sync to complete
4. Stock counts will be updated for all products

### 2. How It Works

```javascript
const syncInventoryFromLoyverse = async () => {
  // For each product:
  // 1. Get variant_id
  // 2. Call Loyverse Inventory API with variant_id
  // 3. Calculate total stock across all stores
  // 4. Update product in Firebase with stock count
};
```

**API Call**:

```
GET https://api.loyverse.com/v1.0/inventory?variant_ids={variant_id}
```

**Response Structure**:

```json
{
  "inventory_levels": [
    {
      "variant_id": "uuid",
      "store_id": "store-uuid",
      "in_stock": 50,
      "updated_at": "2025-10-19T10:30:00Z"
    }
  ]
}
```

**Stock Calculation**:

- Sums `in_stock` across all stores for each variant
- Saves total to product's `stock` field
- Also saves detailed `inventoryLevels` array
- Records `lastInventorySync` timestamp

### 3. Batch Processing

To avoid overwhelming the API:

- Processes 10 products at a time
- 500ms delay between batches
- Shows progress toast notifications
- Handles errors gracefully

### 4. Requirements

Products must have `variantId` or `variant_id` field to sync inventory:

- Products synced from Loyverse automatically have this
- Manually created products need to be mapped to Loyverse variants first

### 5. Toast Notifications

**Success**:

```
✅ Synced inventory for 25 products
```

**Partial Success**:

```
✅ Synced inventory for 20 products (5 skipped - no variant ID)
```

**Warning**:

```
⚠️ 25 products skipped - missing variant IDs.
Please sync products from Loyverse first.
```

## Alternative Method

You can also sync inventory from the dedicated **Stock Management** page:

1. Go to **Admin → Stock**
2. Click **"Sync Inventory from Loyverse"**
3. View detailed stock levels per store

## Data Saved to Firebase

For each product after sync:

```javascript
{
  stock: 50,                    // Total stock across all stores
  inStock: 50,                  // Same as stock
  inventoryLevels: [            // Detailed breakdown
    {
      store_id: "store-uuid",
      in_stock: 30,
      updated_at: "2025-10-19T..."
    },
    {
      store_id: "store-uuid-2",
      in_stock: 20,
      updated_at: "2025-10-19T..."
    }
  ],
  lastInventorySync: "2025-10-19T10:30:00Z"
}
```

## When to Sync Inventory

- **After syncing products from Loyverse** (first time setup)
- **Periodically** to keep stock counts updated
- **After receiving new stock** in Loyverse
- **When stock counts look incorrect**

## Mobile UI

**Collapsed Button** (Mobile):

- Shows only refresh icon
- Spins during sync
- Compact design fits in header

**Full Button** (Desktop):

- Shows "Sync Stock" text
- Refresh icon + label
- More prominent

## Technical Details

**Files Modified**:

- `src/app/admin/products/items/page.js`

**New Imports**:

```javascript
import { loyverseService } from "@/lib/api/loyverse";
import { RefreshCw } from "lucide-react";
```

**New State**:

```javascript
const [syncingInventory, setSyncingInventory] = useState(false);
```

**New Function**:

```javascript
const syncInventoryFromLoyverse = async () => {
  // Batch processing logic
  // API calls
  // State updates
};
```

## Error Handling

- **No variant ID**: Skips product, counts in report
- **API error**: Logs error, continues with next product
- **Network error**: Shows error toast, stops sync
- **Partial success**: Shows count of successful and failed syncs

## Performance

- **Batch size**: 10 products per batch
- **Delay**: 500ms between batches
- **Parallel**: Processes all products in batch simultaneously
- **Time**: ~0.5s per 10 products (depends on API speed)

**Example**:

- 50 products = ~2.5 seconds
- 100 products = ~5 seconds
- 250 products = ~12.5 seconds

## Future Enhancements

- [ ] Auto-sync inventory on page load (with cache)
- [ ] Background sync using service worker
- [ ] Sync only products with outdated inventory
- [ ] Scheduled automatic syncs (hourly/daily)
- [ ] Sync single product on demand
- [ ] Show last sync time per product
- [ ] Inventory sync history log

## Related Documentation

- `LOYVERSE_INTEGRATION.md` - Complete integration guide
- `src/app/admin/stock/page.js` - Full stock management page
- `LOYVERSE_VARIANT_ID_REQUIRED.md` - Why variant IDs are needed

## Summary

✅ **Problem**: Stock counts all showing 0  
✅ **Cause**: Inventory not synced from Loyverse  
✅ **Solution**: Added "Sync Stock" button to products page  
✅ **How to fix**: Click "Sync Stock" button in products page header  
✅ **Result**: All stock counts updated from Loyverse inventory

The stock count issue is now **permanently fixed** with an easy one-click solution! 🎉
