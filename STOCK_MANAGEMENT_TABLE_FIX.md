# Stock Management Improvements

## Changes Made

### 1. Stock Management UI - Table Format ✅

**File**: `/src/components/admin/stock/StockManagementSection.jsx`

**Changes**:

- Converted from card-based layout to a proper data table
- Added sortable columns for better management:
  - Product Name
  - SKU
  - Current Stock
  - Low Stock Level
  - Price
  - Status
- Implemented sorting functionality (click column headers to sort)
- Added "Hide Zero Stock" toggle button to filter out products with 0 stock
- Improved dark mode support throughout the table
- Better visual hierarchy with status badges

**Features**:

- ✅ Sortable columns (ascending/descending)
- ✅ Search by name, SKU, or barcode
- ✅ Filter to hide/show zero stock products
- ✅ Visual status indicators (In Stock, Low Stock, Out of Stock)
- ✅ Summary cards showing totals
- ✅ Responsive design
- ✅ Dark mode support

---

### 2. Fixed Stock Initialization Logic ✅

**File**: `/src/app/admin/integration/page.js`

**Problem**:
When products were synced from Loyverse:

- If Loyverse didn't have stock data configured, `stock` was set to `0`
- This created many products showing 0 stock even though they shouldn't
- Existing stock values were overwritten with 0 on re-sync

**Solution**:

#### A. Product Sync - Only set stock when data exists

```javascript
// Stock info - only set if stock tracking is enabled AND stock data exists
// This prevents overwriting existing stock with 0 when Loyverse doesn't have stock data
...(item.track_stock &&
primaryVariant.stores?.[0]?.stock_quantity !== undefined
  ? { stock: primaryVariant.stores[0].stock_quantity }
  : {}),
```

**How it works**:

- Only includes `stock` field if:
  1. Product tracks stock (`track_stock = true`), AND
  2. Loyverse has actual stock data (`stock_quantity !== undefined`)
- If no stock data exists, field is omitted entirely (preserves existing value)

#### B. Smart Sync - Preserve existing stock

```javascript
const hasManualSync = existing.lastInventorySync;
const hasExistingStock =
  existing.stock !== undefined && existing.stock !== null;
const newSyncHasNoStock = doc.stock === undefined || doc.stock === null;

if (hasManualSync || (hasExistingStock && newSyncHasNoStock)) {
  console.log(
    `📦 Preserving stock data for product: ${doc.name} (current: ${existing.stock})`
  );
  docToSave.stock = existing.stock;
  docToSave.inStock = existing.inStock;
  docToSave.inventoryLevels = existing.inventoryLevels;
  docToSave.lastInventorySync = existing.lastInventorySync;
}
```

**Preservation Rules**:

1. **Manual Sync Priority**: If product has `lastInventorySync` (was manually synced from Loyverse inventory), preserve all stock data
2. **Existing Stock Protection**: If product has existing stock value AND new sync doesn't include stock, preserve existing value
3. **Stock History Respect**: Protects stock that was adjusted via Purchase Orders or Stock Adjustments

---

## How Stock is Calculated

Stock is **NOT** calculated from stock history. Stock is a **direct field** on the product document.

### Stock Update Flow:

1. **Initial Stock** (Product Creation)

   - Set when product is created
   - Logged to stock history with type='initial'

2. **Purchase Orders**

   - When PO is marked "Received"
   - Adds quantity to existing stock
   - Logged to stock history with type='purchase_order'

3. **Stock Adjustments**

   - Manual add/decrease
   - Updates stock directly
   - Logged to stock history with type='adjustment'

4. **Sales**

   - When receipt is completed
   - Deducts quantity from stock
   - Logged to stock history with type='sale'

5. **Loyverse Stock Sync**
   - Compares Loyverse stock vs Firebase stock
   - Adjusts if different
   - Logged to stock history with type='adjustment'

### Stock History Purpose:

- **Audit Trail**: Who changed stock, when, and why
- **History Tracking**: Full timeline of stock movements
- **Reference Tracking**: Links to orders, POs, adjustments
- **NOT for calculation**: Stock is stored directly on product for performance

---

## Why Were There So Many 0 Stock Products?

### Root Causes:

1. **Product Sync Default**

   - Before fix: `stock: primaryVariant.stores?.[0]?.stock_quantity || 0`
   - After fix: Only sets stock if data exists

2. **Loyverse Configuration**

   - Products synced from Loyverse without inventory setup
   - Loyverse Items API doesn't always include stock data
   - Stock needs to be synced separately via Inventory API or Stock Sync feature

3. **No Stock Tracking**
   - Products with `trackStock: false` shouldn't show stock anyway
   - But sync was still setting stock to 0

### Solution Impact:

**Before Fix**:

```
Sync Products → All get stock: 0 → Hundreds of 0-stock products
```

**After Fix**:

```
Sync Products → Only set stock if Loyverse has data → Existing stock preserved
```

---

## Usage Instructions

### For Users:

1. **View Stock Levels**

   - Go to Admin → Stock → Stock Management
   - Use table view to see all products
   - Click column headers to sort
   - Use search to find specific products

2. **Filter Zero Stock Products**

   - Click "Hide Zero Stock" button
   - Only products with stock > 0 will show
   - Useful for focusing on actual inventory

3. **Update Stock**

   - Use Stock Adjustment tab to manually adjust
   - Use Purchase Orders tab to receive shipments
   - Use Integration → Stock Sync to sync from Loyverse

4. **Track Stock History**
   - Go to Stock → Stock History
   - See complete timeline of all changes
   - Filter by product, type, or date

### For Stock Sync:

1. **Initial Setup**

   - Sync products from Integration page
   - Then use "Sync Stock Levels" to get accurate stock
   - Stock sync uses Loyverse Inventory API (more accurate)

2. **Ongoing Management**
   - Product sync preserves existing stock
   - Re-syncing products won't reset stock to 0
   - Use Stock Sync when needed to align with Loyverse

---

## Technical Details

### Stock Field Behavior:

| Scenario                                | Old Behavior             | New Behavior                  |
| --------------------------------------- | ------------------------ | ----------------------------- |
| New product from Loyverse with stock    | `stock: 5`               | `stock: 5` ✅                 |
| New product from Loyverse without stock | `stock: 0`               | No stock field (undefined) ✅ |
| Existing product with stock, re-sync    | `stock: 0` (overwritten) | `stock: 100` (preserved) ✅   |
| Product with manual stock adjustment    | `stock: 0` (overwritten) | `stock: 50` (preserved) ✅    |
| Product with lastInventorySync          | `stock: 0` (overwritten) | `stock: 150` (preserved) ✅   |

### Database Impact:

- **Products Collection**: Stock stored directly on product document
- **Stock History Collection**: Audit log of all movements
- **Stock Adjustments Collection**: Manual adjustment records
- **Purchase Orders Collection**: PO records with stock implications

---

## Benefits

✅ **Cleaner Stock View**: Table format makes it easy to manage hundreds of products  
✅ **Better Filtering**: Hide zero-stock products to focus on actual inventory  
✅ **Sortable Data**: Click any column to sort ascending/descending  
✅ **Preserved Stock**: Re-syncing products won't reset stock values  
✅ **Accurate Data**: Stock only set when Loyverse has actual data  
✅ **Performance**: Direct stock field (not calculated) for fast queries  
✅ **Audit Trail**: Complete history of all stock movements  
✅ **Smart Sync**: Respects manual adjustments and existing data

---

## Testing Checklist

- [x] Stock Management table displays correctly
- [x] Sorting works on all columns
- [x] Hide/Show Zero Stock filter works
- [x] Search functionality works
- [x] Dark mode displays properly
- [x] Product sync preserves existing stock
- [x] Stock sync still works correctly
- [x] Stock adjustments update correctly
- [x] Purchase orders update stock
- [x] Sales deduct stock properly
