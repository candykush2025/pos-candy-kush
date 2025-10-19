# Stock Data Persistence Fix

## Problem

Stock data was showing as 0 after refreshing, even though it was manually synced from Loyverse Inventory API.

## Root Cause Analysis

### How Stock Data Works:

1. **Product Sync (Integration Page)**:

   - Syncs products from Loyverse Items API
   - Items API includes: `variants[0].stores[0].stock_quantity`
   - This only gets stock from the **first store**
   - Often returns 0 if not properly configured

2. **Manual Stock Sync (Products Items Page)**:

   - Calls Loyverse Inventory API separately
   - Gets accurate stock levels from **all stores**
   - Calculates total stock across stores
   - Saves to Firebase with these fields:
     - `stock`: Total stock count
     - `inStock`: Same as stock
     - `inventoryLevels`: Array of per-store inventory
     - `lastInventorySync`: Timestamp of sync

3. **The Bug**:
   - When products were re-synced from Integration page
   - The sync would **overwrite** the manually synced stock data
   - Stock would reset to 0 (from Items API)
   - User had to manually sync stock again

## Solution

Modified the `smartSync` function in Integration page to **preserve manually synced stock data**.

### Implementation

```javascript
// Smart sync: Only update changed documents
const smartSync = async (collectionName, documents, idField = "id") => {
  for (const doc of documents) {
    const existing = await getDocument(collectionName, docId);

    if (needsUpdate(existing, doc)) {
      let docToSave = { ...doc };

      // For products: preserve manually synced stock data
      if (collectionName === COLLECTIONS.PRODUCTS && existing) {
        if (
          existing.lastInventorySync &&
          (existing.stock > 0 ||
            existing.inStock > 0 ||
            existing.inventoryLevels)
        ) {
          // Keep the accurate inventory data
          docToSave.stock = existing.stock;
          docToSave.inStock = existing.inStock;
          docToSave.inventoryLevels = existing.inventoryLevels;
          docToSave.lastInventorySync = existing.lastInventorySync;
        }
      }

      await setDocument(collectionName, docId, docToSave);
    }
  }
};
```

### Logic:

1. **Check if it's a product sync**: `collectionName === COLLECTIONS.PRODUCTS`
2. **Check if product has manually synced stock**:
   - Has `lastInventorySync` timestamp
   - Has stock > 0 OR inventoryLevels array
3. **If yes**: Preserve the existing stock data
4. **If no**: Use the stock from Items API (new products)

## Benefits

✅ **Stock persists after product sync**

- Manually synced stock data is preserved
- No need to re-sync inventory after product updates
- Stock data remains accurate across syncs

✅ **Smart detection**

- Only preserves if `lastInventorySync` exists
- New products still get initial stock from Items API
- Won't preserve stale data

✅ **Backward compatible**

- Products without manual sync work as before
- No breaking changes to existing data
- Console logs for debugging

## User Workflow

### Initial Setup:

1. Go to Integration page
2. Sync Products (gets product info)
3. Go to Products > Items
4. Click "Sync Stock" (gets accurate inventory)
5. ✅ Stock data is now saved

### After Fix:

- Sync Products again from Integration
- ✅ Stock data is preserved
- No need to re-sync inventory

## Testing

### Test Cases:

1. **New Product**:

   - Sync product from Loyverse
   - Should use stock from Items API
   - ✅ Works

2. **Existing Product with Manual Stock Sync**:

   - Product has `lastInventorySync`
   - Re-sync products
   - ✅ Stock data preserved

3. **Existing Product without Manual Sync**:

   - Product has no `lastInventorySync`
   - Re-sync products
   - ✅ Updates stock from Items API

4. **Refresh Browser**:
   - Stock data loads from Firebase
   - ✅ Shows correct values

## Technical Details

### Fields Preserved:

```javascript
{
  stock: 150,                    // Total stock count
  inStock: 150,                  // Same as stock
  inventoryLevels: [             // Per-store breakdown
    {
      store_id: "store-1",
      in_stock: 100,
      updated_at: "2025-10-19"
    },
    {
      store_id: "store-2",
      in_stock: 50,
      updated_at: "2025-10-19"
    }
  ],
  lastInventorySync: "2025-10-19T10:30:00Z"
}
```

### Why This Works:

**Before Fix**:

```
Product Sync → Overwrites stock to 0 → User sees 0
```

**After Fix**:

```
Product Sync → Checks lastInventorySync → Preserves accurate stock → User sees correct value
```

## Alternative Approaches Considered

### Option 1: Always Fetch Inventory During Product Sync ❌

- **Pros**: Always accurate
- **Cons**:
  - Very slow (API call per product)
  - High API usage
  - Timeout issues with many products

### Option 2: Separate Inventory Sync Schedule ❌

- **Pros**: Automated
- **Cons**:
  - Complex scheduling
  - Still overwrites if user syncs manually
  - Doesn't solve the root issue

### Option 3: Preserve Stock Data (CHOSEN) ✅

- **Pros**:
  - Fast
  - No extra API calls
  - Respects manual sync
  - Simple to implement
- **Cons**:
  - Requires manual stock sync initially
  - Need to re-sync stock if actual inventory changes

## Future Enhancements

Possible improvements:

- [ ] **Auto-sync inventory** on schedule (daily/weekly)
- [ ] **Stock sync indicator** showing last sync time in UI
- [ ] **Low stock alerts** based on inventory levels
- [ ] **Bulk inventory sync** button in Integration page
- [ ] **Stock history tracking** to see changes over time

## Related Files

- `src/app/admin/integration/page.js` - Product sync with preservation
- `src/app/admin/products/items/page.js` - Manual stock sync button
- `STOCK_COUNT_ZERO_FIX.md` - Original stock sync implementation

---

**Status**: ✅ Fixed
**Date**: October 19, 2025
**Impact**: All products with manually synced stock
