# ⚠️ CRITICAL: Loyverse Product Sync Required

## The Problem

**ERROR:** `NOT_FOUND: The resource with ID 'xxx' not found - field: object.line_items[0].variant_id`

This error occurs because **your products in the POS don't have valid Loyverse variant_id values**.

## Why This Happens

When creating a receipt in Loyverse, the API requires:

```json
{
  "line_items": [
    {
      "variant_id": "06929667-cc44-4bbb-b226-6758285d7033", // ← MUST exist in Loyverse
      "quantity": 2
    }
  ]
}
```

The `variant_id` **MUST be a valid UUID from your Loyverse account**. You cannot use:

- ❌ Random product IDs from your local database
- ❌ Firebase-generated IDs
- ❌ Made-up UUIDs

## How Loyverse Works

### Product Structure in Loyverse:

```
Item (Product)
├── variant_id: "06929667-cc44-4bbb-b226-6758285d7033"  ← THIS IS WHAT YOU NEED
├── item_id: "2ca3341b-0a7b-4375-990a-30d402e55a7e"
├── item_name: "Coffee"
├── variant_name: "Large"
├── sku: "COFFEE-L"
└── price: 50
```

Every product in Loyverse has:

- **item_id** - The product/item ID
- **variant_id** - The variant ID (even if there's only one variant, it still exists)

## The Solution

### ✅ STEP 1: Sync Products from Loyverse

You **MUST** sync products from Loyverse to your POS. This is the ONLY way to get valid variant_ids.

**Use the Items API:**

```
GET https://api.loyverse.com/v1.0/items
```

This will return all products with their **variant_id** values.

### ✅ STEP 2: Store variant_id in Your Database

When syncing products from Loyverse, save this structure:

**Firebase/Database Product Document:**

```javascript
{
  id: "local-id-123",              // Your local ID
  name: "Coffee",
  price: 50,
  sku: "COFFEE-001",

  // LOYVERSE DATA - CRITICAL!
  item_id: "2ca3341b-0a7b-4375-990a-30d402e55a7e",    // Loyverse item ID
  variant_id: "06929667-cc44-4bbb-b226-6758285d7033",  // Loyverse variant ID

  // Or if product has multiple variants:
  variants: [
    {
      id: "local-variant-1",
      variant_id: "06929667-cc44-4bbb-b226-6758285d7033",  // Loyverse ID
      name: "Small",
      price: 40
    },
    {
      id: "local-variant-2",
      variant_id: "a1b2c3d4-5678-90ab-cdef-1234567890ab",  // Loyverse ID
      name: "Large",
      price: 50
    }
  ]
}
```

### ✅ STEP 3: Cart Store Now Captures variant_id

**Updated:** The cart store now extracts `variant_id` when adding products:

```javascript
// useCartStore.js - addItem() function
const newItem = {
  id: nanoid(),
  productId: product.id,
  variantId: product.variant_id || product.variants[0].variant_id, // ← Now saved!
  name: product.name,
  price: product.price,
  quantity,
  // ...
};
```

### ✅ STEP 4: Receipt Sync Uses variant_id

**Updated:** The payment completion now sends correct variant_id:

```javascript
// SalesSection.jsx - handleCompletePayment()
const lineItems = items.map((item) => ({
  variant_id: item.variantId || item.variant_id || item.productId, // ← Tries multiple sources
  quantity: item.quantity,
  // Optional fields:
  price: item.price,
  cost: item.cost,
}));
```

## What You Need to Do NOW

### Option 1: Sync Products from Loyverse (RECOMMENDED)

1. **Go to Admin → Integration page**
2. **Click "Sync Products from Loyverse"** (you may need to add this button)
3. **This will:**
   - Fetch all items from Loyverse API
   - Extract variant_id for each product
   - Save to Firebase with Loyverse IDs
   - Update local products with variant_id

### Option 2: Manually Map Products

If you have products in your POS that aren't in Loyverse yet:

1. **Create products in Loyverse FIRST** (via Loyverse dashboard or mobile app)
2. **Get their variant_id** using the Integration page → Get Items
3. **Update your Firebase products** with the correct variant_id
4. **Example:**
   ```javascript
   // Update product in Firebase
   {
     id: "existing-product-123",
     name: "Existing Product",
     price: 100,
     variant_id: "PASTE-LOYVERSE-VARIANT-ID-HERE"  // ← Get from Loyverse
   }
   ```

### Option 3: Test with Sample Loyverse Product

To test immediately:

1. **Go to Loyverse dashboard** → Items
2. **Create a test product** (e.g., "Test Coffee")
3. **Copy the variant_id** from the API response
4. **Create the same product in your POS** with that variant_id
5. **Try a transaction** - it should sync!

## How to Get variant_id from Loyverse

### Method 1: Use Integration Page

1. Admin → Integration
2. Click "Get Items" (or similar button)
3. Find your product in the list
4. Copy the `variant_id` field

### Method 2: Call API Directly

```bash
curl -X GET "https://api.loyverse.com/v1.0/items" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Response:

```json
{
  "items": [
    {
      "id": "2ca3341b-0a7b-4375-990a-30d402e55a7e",
      "item_name": "Coffee",
      "variants": [
        {
          "variant_id": "06929667-cc44-4bbb-b226-6758285d7033", // ← THIS!
          "variant_name": null,
          "sku": "COFFEE-001",
          "price": 50
        }
      ]
    }
  ]
}
```

## Testing Checklist

Before testing transactions:

- [ ] Products synced from Loyverse (have valid variant_id)
- [ ] Each product in POS has `variant_id` or `variants[0].variant_id` field
- [ ] Cart items include `variantId` field when added
- [ ] Payment completion logs show correct variant_id in line_items
- [ ] No "NOT_FOUND" errors when creating receipt

## Common Mistakes

### ❌ DON'T DO THIS:

```javascript
// Using local product ID as variant_id
{
  variant_id: "firebase-id-abc123"; // ← WRONG! Not a Loyverse ID
}

// Using random UUID
{
  variant_id: "00000000-0000-0000-0000-000000000000"; // ← WRONG! Doesn't exist in Loyverse
}
```

### ✅ DO THIS:

```javascript
// Using actual Loyverse variant_id from API
{
  variant_id: "06929667-cc44-4bbb-b226-6758285d7033"; // ← CORRECT! From Loyverse Items API
}
```

## Debugging Tips

### 1. Check Cart Items

```javascript
// In browser console when item in cart:
console.log(useCartStore.getState().items);

// Should show:
[
  {
    id: "local-nano-id",
    productId: "firebase-id",
    variantId: "06929667-cc44-4bbb-b226-6758285d7033", // ← Must be Loyverse UUID
    name: "Coffee",
    quantity: 1,
  },
];
```

### 2. Check Line Items Before Sync

Add this to `handleCompletePayment()` before sending to Loyverse:

```javascript
console.log("Line items being sent to Loyverse:", lineItems);

// Should show:
[
  {
    variant_id: "06929667-cc44-4bbb-b226-6758285d7033", // ← Valid Loyverse UUID
    quantity: 2,
  },
];
```

### 3. Verify in Loyverse

- Log into Loyverse dashboard
- Go to Items
- Find the product
- Check if the variant_id in your database matches

## Next Steps

1. **Implement Product Sync** - Create a sync button that fetches items from Loyverse
2. **Update Existing Products** - Map current products to Loyverse variant_ids
3. **Prevent Manual Product Creation** - Force products to come from Loyverse
4. **Add Validation** - Check variant_id exists before allowing checkout

## Related Documentation

- `LOYVERSE_ITEMS_API.md` - Items API documentation (create this)
- `PRODUCT_SYNC.md` - Product sync implementation guide (create this)
- `LOYVERSE_RECEIPT_SYNC.md` - Receipt sync documentation
- `PAYMENT_TYPES_API.md` - Payment types reference

## Summary

**The fix is simple but requires action:**

1. ✅ Cart store updated to capture variant_id
2. ✅ Payment logic updated to send variant_id
3. ⚠️ **YOU MUST sync products from Loyverse** to get valid variant_ids
4. ⚠️ **Cannot create receipts** until products have Loyverse variant_ids

**Without valid variant_ids from Loyverse, receipt syncing will ALWAYS fail with NOT_FOUND errors.**
