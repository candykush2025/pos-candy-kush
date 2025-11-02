# Stock Sync Using Wrong API - Fixed

## Problem Identified ✅

Stock sync in the Integration page was setting all products to **0 stock** because it was using the **wrong Loyverse API endpoint**.

### What Was Wrong:

**Items API (`/items`) Response:**

```json
{
  "variants": [
    {
      "stores": [
        {
          "store_id": "...",
          "pricing_type": "FIXED",
          "price": 15,
          "available_for_sale": true,
          "optimal_stock": null,
          "low_stock": null
          // ❌ NO stock_quantity field!
        }
      ]
    }
  ]
}
```

The code was trying to read:

```javascript
const loyverseStock = primaryVariant.stores?.[0]?.stock_quantity || 0;
```

Since `stock_quantity` doesn't exist in Items API, it always defaulted to `0`!

---

## Root Cause

**Two Separate APIs in Loyverse:**

1. **Items API** (`/items`) - Product catalog data (name, price, SKU)
   - ❌ Does NOT include stock quantities
2. **Inventory API** (`/inventory`) - Stock levels per variant per store
   - ✅ Has `in_stock` field with actual quantities

The stock sync was incorrectly using Items API, which resulted in:

- Reading stock as `0` (because field doesn't exist)
- Adjusting all Firebase products to `0`
- Creating negative adjustments in stock history

---

## Solution Implemented ✅

### Changed from Items API to Inventory API

**File**: `/src/app/admin/integration/page.js`
**Function**: `handleSyncStock()`

**Before (WRONG):**

```javascript
const response = await loyverseService.getAllItems({ show_deleted: false });
const loyverseStock = primaryVariant.stores?.[0]?.stock_quantity || 0;
```

**After (CORRECT):**

```javascript
const inventoryResponse = await loyverseService.getAllInventory();

// Group by variant_id and sum stock across all stores
const variantStockMap = {};
inventoryResponse.inventory_levels.forEach((inv) => {
  if (!variantStockMap[inv.variant_id]) {
    variantStockMap[inv.variant_id] = 0;
  }
  variantStockMap[inv.variant_id] += inv.in_stock || 0;
});
```

---

## Key Changes

### 1. Use Inventory API

- Fetches `/inventory` endpoint (has stock data)
- Returns array of inventory levels with `variant_id`, `store_id`, and `in_stock`

### 2. Map by variant_id

- Products are matched by `variant_id` (not `item_id`)
- Firebase products store `variantId` field for this purpose

### 3. Sum Stock Across Stores

- If you have multiple stores, stock is summed
- Gives total stock count across all locations

### 4. Track Not Found

- Logs warning when variant_id doesn't match any Firebase product
- Shows count in sync results

### 5. Set lastInventorySync

- Marks products as having been inventory synced
- Prevents product sync from overwriting stock data

---

## API Comparison

| Feature     | Items API       | Inventory API |
| ----------- | --------------- | ------------- |
| Endpoint    | `/items`        | `/inventory`  |
| Purpose     | Product catalog | Stock levels  |
| Has Stock?  | ❌ No           | ✅ Yes        |
| Stock Field | N/A             | `in_stock`    |
| Group By    | `item_id`       | `variant_id`  |
| Per Store?  | No              | Yes           |

---

## Stock History Impact

### Before Fix:

```
Date: 02 Nov 2025 21:32
Item: Slim Jim normal (SKU: 10041)
Adjustment: -13
Stock After: 0 (was 13)  ❌ WRONG!
```

### After Fix:

```
Date: 02 Nov 2025 21:45
Item: Slim Jim normal (SKU: 10041)
Adjustment: 0 (no change)
Stock After: 13 (was 13)  ✅ CORRECT!
```

---

## How It Works Now

### Stock Sync Process:

1. **Fetch Inventory from Loyverse**

   ```javascript
   const inventoryResponse = await loyverseService.getAllInventory();
   // Returns: { inventory_levels: [...], total: 150 }
   ```

2. **Group by Variant ID**

   ```javascript
   // Sum stock across all stores for each variant
   const variantStockMap = {
     "variant-123": 13, // Total from all stores
     "variant-456": 16,
   };
   ```

3. **Match Products**

   ```javascript
   // Find Firebase product by variantId
   const product = productByVariantId[variantId];
   ```

4. **Compare and Adjust**
   ```javascript
   if (loyverseStock !== firebaseStock) {
     // Update stock
     await updateDocument(COLLECTIONS.PRODUCTS, product.id, {
       stock: loyverseStock,
       inStock: loyverseStock,
       lastInventorySync: new Date().toISOString(),
     });

     // Log in history
     await stockHistoryService.logStockMovement({...});
   }
   ```

---

## Benefits

✅ **Accurate Stock Data** - Uses real inventory counts from Loyverse  
✅ **Multi-Store Support** - Sums stock across all store locations  
✅ **Correct Mapping** - Matches by variant_id (proper identifier)  
✅ **No False Adjustments** - Only adjusts when values differ  
✅ **Better Tracking** - Marks products as inventory synced  
✅ **Error Reporting** - Shows count of products not found

---

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
