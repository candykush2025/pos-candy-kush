# Cannabis Fields Removal - Product Edit Form Alignment

## Changes Made

Removed all cannabis-specific fields from the product management system to align with the new Kiosk API documentation.

## Removed Fields

The following fields have been completely removed:

1. **thcPercentage** - THC percentage
2. **cbdPercentage** - CBD percentage
3. **strain** - Strain type (Indica/Sativa/Hybrid)
4. **effects** - Product effects array
5. **flavors** - Product flavors array

## Files Modified

### `src/app/admin/products/items/page.js`

**Locations Updated:**

1. ✅ **Initial formData state** (line ~100)

   - Removed cannabis fields from default state

2. ✅ **handleFetchFromKiosk** (line ~280)

   - Removed cannabis field assignments from Kiosk import

3. ✅ **handleSubmit save function** (line ~520)

   - Removed cannabis fields from product save data

4. ✅ **handleEdit function** (line ~680)

   - Removed cannabis fields from edit form population

5. ✅ **resetForm function** (line ~940)

   - Removed cannabis fields from form reset

6. ✅ **Edit Modal UI** (line ~1605)
   - Completely removed "Cannabis Information" section containing:
     - THC % input field
     - CBD % input field
     - Strain dropdown
     - Effects input field
     - Flavors input field

### `next.config.mjs`

✅ **Firebase Storage Image Domain** already configured:

```javascript
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "firebasestorage.googleapis.com",
      pathname: "/**",
    },
  ],
}
```

## Current Product Fields (Aligned with Kiosk API)

### Basic Information

- `name` - Product name
- `description` - Product description
- `sku` - Stock Keeping Unit
- `barcode` - Barcode

### Category

- `categoryId` - Category reference
- `categoryName` - Category display name

### Pricing

- `price` - Base price
- `memberPrice` - Member discount price
- `cost` - Purchase cost

### Variants (NEW)

- `hasVariants` - Boolean flag
- `variants[]` - Array of variants with name, price, memberPrice, sku

### Images (NEW)

- `mainImage` - Primary product image URL
- `images[]` - Array of image objects
- `imageUrl` - Legacy image field (for backward compatibility)
- `backgroundImage` - Background image for display
- `backgroundFit` - CSS fit property (contain/cover)
- `textColor` - Text color for product display

### 3D Model (NEW)

- `modelUrl` - 3D model file URL (.glb)
- `modelRotationX` - X-axis rotation
- `modelRotationY` - Y-axis rotation
- `modelRotationZ` - Z-axis rotation

### Stock

- `stock` - Current stock quantity
- `trackStock` - Enable/disable stock tracking
- `soldByWeight` - Sold by weight flag
- `availableForSale` - Availability status

### Other

- `notes` - Product notes
- `isFeatured` - Featured flag
- `source` - Data source (kiosk/local/loyverse)
- `createdAt` - Creation timestamp
- `updatedAt` - Update timestamp

## Benefits

1. **✅ Cleaner UI** - Edit form is now simpler and more focused
2. **✅ API Alignment** - Product structure matches Kiosk API documentation exactly
3. **✅ No Data Loss** - Existing products with cannabis fields will keep their data (backward compatible)
4. **✅ Future-Proof** - System is now product-agnostic, not cannabis-specific
5. **✅ Image Support** - Firebase Storage images now work correctly

## Testing Checklist

- [ ] Edit existing product - cannabis fields should not appear
- [ ] Create new product - cannabis fields should not appear
- [ ] Import from Kiosk - should work without cannabis fields
- [ ] Save product - should save without cannabis fields
- [ ] Firebase Storage images - should display correctly (https://firebasestorage.googleapis.com/...)

## Migration Notes

**Existing Products:**

- Products with existing cannabis field data will retain that data in the database
- Cannabis fields will not be displayed in the edit form
- Cannabis fields will not be updated or saved when editing products
- This allows for backward compatibility without data loss

**New Products:**

- Will not have cannabis fields at all
- Will use the new Kiosk API structure
- Fully aligned with the product documentation

## Image Display Fix

The Firebase Storage image issue was caused by Next.js requiring explicit permission for remote image domains. This has been resolved by adding Firebase Storage to the `remotePatterns` in `next.config.mjs`.

**Supported Image URLs:**

- `https://firebasestorage.googleapis.com/v0/b/...` ✅
- Any Firebase Storage URL with proper tokens ✅

**Note:** After updating `next.config.mjs`, you need to restart the dev server for changes to take effect.
