# IndexedDB Delete Fix

## Problem

Products were showing as "successfully deleted" but remained visible in the admin panel. Investigation revealed:

1. **Products don't exist in Firebase** - Console logs showed "Document does not exist" warnings
2. **Products exist in IndexedDB** - 248 products were being loaded from local IndexedDB cache
3. **Delete only targeted Firebase** - The delete function was only trying to delete from Firebase, not IndexedDB
4. **Load was from IndexedDB** - Despite logs saying "Fetching from Firebase", products were actually loaded from IndexedDB

## Root Cause

The application uses **IndexedDB as the primary data store** for offline functionality, but the delete operations were only targeting Firebase. This created a disconnect:

- **Import from Kiosk** → Saves to IndexedDB ✅
- **Load Products** → Loads from IndexedDB ✅ (despite misleading logs)
- **Delete Products** → Only deleted from Firebase ❌
- **Result** → Products remain in IndexedDB and reappear on reload

## Solution

Updated the admin products page to manage BOTH Firebase and IndexedDB:

### 1. Added IndexedDB Delete Functions

**File**: `src/lib/db/dbService.js`

```javascript
async deleteProduct(id) {
  console.log(`🗑️ [IndexedDB] Deleting product: ${id}`);
  const result = await db.products.delete(id);
  console.log(`✅ [IndexedDB] Deleted product: ${id}`);
  return result;
},

async bulkDeleteProducts(ids) {
  console.log(`🗑️ [IndexedDB] Bulk deleting ${ids.length} products`);
  const result = await db.products.bulkDelete(ids);
  console.log(`✅ [IndexedDB] Bulk deleted ${ids.length} products`);
  return result;
}
```

### 2. Updated Single Delete Function

**File**: `src/app/admin/products/items/page.js`

```javascript
const handleDelete = async (id) => {
  // Delete from both Firebase and IndexedDB
  try {
    await productsService.delete(id);
    console.log("✅ Product deleted from Firebase:", id);
  } catch (fbError) {
    console.warn(
      "⚠️ Firebase delete failed (product may not exist):",
      fbError.message
    );
  }

  try {
    await dbService.deleteProduct(id);
    console.log("✅ Product deleted from IndexedDB:", id);
  } catch (dbError) {
    console.warn("⚠️ IndexedDB delete failed:", dbError.message);
  }

  await loadProducts();
};
```

### 3. Updated Bulk Delete Function

**File**: `src/app/admin/products/items/page.js`

```javascript
const handleBulkDelete = async () => {
  // Delete from Firebase one by one (to track progress)
  for (let i = 0; i < selectedProducts.length; i++) {
    const productId = selectedProducts[i];
    try {
      await productsService.delete(productId);
    } catch (error) {
      console.warn(`⚠️ Firebase delete failed (may not exist):`, productId);
    }
  }

  // Delete from IndexedDB in bulk (faster)
  try {
    await dbService.bulkDeleteProducts(selectedProducts);
    console.log("✅ Deleted from IndexedDB (bulk)");
  } catch (dbError) {
    console.error("❌ IndexedDB bulk delete failed:", dbError);
  }

  await loadProducts();
};
```

### 4. Updated Load Products

Changed to explicitly load from IndexedDB (the actual data source):

```javascript
const loadProducts = async () => {
  console.log("🔄 loadProducts() called - Fetching from IndexedDB...");

  // Load from IndexedDB (the actual data source)
  const data = await dbService.getProducts();

  console.log("📦 Received products from IndexedDB:", data.length);
  setProducts(data);
};
```

### 5. Updated Import from Kiosk

Now saves to both Firebase AND IndexedDB:

```javascript
const handleFetchFromKiosk = async () => {
  // Transform products...

  // Try saving to Firebase
  for (const product of transformedProducts) {
    try {
      await productsService.create(product);
    } catch (fbError) {
      console.warn("Firebase save failed:", fbError.message);
    }
  }

  // Save all to IndexedDB in bulk (more reliable)
  await dbService.upsertProducts(transformedProducts);

  await loadProducts();
};
```

## Data Flow

### Before Fix

```
Import from Kiosk → IndexedDB only
Load Products     → IndexedDB (but logs said Firebase)
Delete Products   → Firebase only ❌
Reload Products   → IndexedDB (products still there)
```

### After Fix

```
Import from Kiosk → IndexedDB + Firebase (best effort)
Load Products     → IndexedDB (correctly labeled)
Delete Products   → IndexedDB + Firebase ✅
Reload Products   → IndexedDB (deleted products gone)
```

## Testing

1. **Single Delete**: Delete a product → Verify it's removed from UI
2. **Bulk Delete**: Select multiple products → Delete → Verify all removed
3. **Import from Kiosk**: Import products → Verify they appear
4. **Reload Page**: Refresh browser → Verify deleted products stay gone

## Files Modified

1. `src/lib/db/dbService.js` - Added `deleteProduct()` and `bulkDeleteProducts()`
2. `src/app/admin/products/items/page.js` - Updated all delete/load/import functions

## Notes

- Firebase is kept as a backup/sync layer
- IndexedDB is the primary offline-first data store
- Errors from Firebase don't block operations (graceful fallback)
- Bulk operations use IndexedDB's `bulkDelete` for performance
- Console logs now accurately reflect which storage is being used
