# Cashback Debug Instructions

## 🔍 What to Check in Console

After adding customer and product to cart, you should see these logs in order:

### 1. Cart Calculation Trigger

```
[Cashback] Calculating for cart: {
  itemCount: 1,
  ruleCount: 1,
  total: 900,
  customer: "Test Customer"
}
```

✅ **You're seeing this** - Good! Calculation is triggered.

### 2. Item Data Being Processed

```
[Cashback Service] Calculating for item: {
  item: {
    productId: "abc123",  ← Check this value
    categoryId: "cat1",   ← Check this value
    price: 900,
    quantity: 1
  },
  ruleCount: 1,
  activeRules: 1
}
```

❓ **You should see this next** - Check the `productId` and `categoryId` values

### 3. Product Rule Search

```
[Cashback Service] Product rule search: {
  found: false,
  searchingFor: "abc123",  ← Your product ID
  availableProductRules: [
    { name: "...", targetId: "..." }
  ]
}
```

This shows if a product-specific rule was found

### 4. Category Rule Search

```
[Cashback Service] Category rule search: {
  found: true,  ← Should be true!
  searchingFor: "cat1",  ← Your category ID
  availableCategoryRules: [
    { name: "Test Rule", targetId: "cat1" }  ← Should match!
  ]
}
```

**IMPORTANT**: Check if:

- `found: true`
- `searchingFor` matches one of the `targetId` values

### 5. Rule Being Used

```
[Cashback Service] Using rule: {
  name: "Test Rule",
  type: "category",
  cashbackType: "percentage",  ← or "fixed"
  value: 10
}
```

### 6. Points Calculation

**For Percentage**:

```
[Cashback Service] Percentage calculation: {
  itemTotal: 900,
  percentage: 10,
  calculated: 90,
  points: 90
}
```

**For Fixed**:

```
[Cashback Service] Fixed calculation: {
  fixedValue: 10,
  quantity: 1,
  points: 10
}
```

### 7. Final Result

```
[Cashback Service] Final result: {
  points: 90,
  ruleName: "Test Rule"
}

[Cashback] Item calculation: {
  itemName: "Test Cashback",
  itemData: {...},
  points: 90,
  ruleApplied: "Test Rule"
}

[Cashback] Final calculation: {
  totalPoints: 90,
  itemBreakdown: [...]
}
```

---

## 🚨 Common Issues & What Logs Show

### Issue 1: Category/Product ID Mismatch

**Logs show**:

```
[Cashback Service] Category rule search: {
  found: false,
  searchingFor: "cat_beverages",  ← Product's category
  availableCategoryRules: [
    { name: "Drinks Rule", targetId: "beverages" }  ← Rule's target
  ]
}
```

**Problem**: IDs don't match!

- Product has: `cat_beverages`
- Rule has: `beverages`

**Fix**: Edit the cashback rule to use correct category ID

---

### Issue 2: Rule Not Active

**Logs show**:

```
[Cashback Service] Calculating for item: {
  ruleCount: 1,
  activeRules: 0  ← No active rules!
}
```

**Fix**: Go to Admin > Cashback and toggle rule to Active (green)

---

### Issue 3: No Rules Loaded

**Logs show**:

```
[Cashback] Calculating for cart: {
  ruleCount: 0  ← No rules!
}
```

**Fix**: Create a cashback rule in Admin > Cashback

---

### Issue 4: Product Missing Category ID

**Logs show**:

```
[Cashback Service] Calculating for item: {
  item: {
    productId: "abc123",
    categoryId: undefined,  ← Missing!
    ...
  }
}
```

**Fix**: Edit product to assign a category

---

## 📋 Step-by-Step Testing

### Step 1: Check Your Rule

1. Go to Admin > Cashback
2. Note the rule's **target ID**:
   - If Category rule → Note category ID (e.g., "cat_beverages")
   - If Product rule → Note product ID

### Step 2: Check Your Product

1. Open Console (F12)
2. In POS, with product in cart, type:

```javascript
console.log("Cart Items:", items);
```

3. Check the item's:
   - `productId` or `id`
   - `categoryId`

### Step 3: Compare IDs

The IDs must **match exactly**:

- Rule `targetId` = Product `categoryId` (for category rules)
- Rule `targetId` = Product `productId` (for product rules)

### Step 4: Test

1. Clear cart
2. Add customer (must be member)
3. Add product
4. Check console logs (follow the 7 steps above)

---

## 🎯 Quick Fix Commands

### See Current Cart Items

```javascript
// In browser console
console.log("Items:", items);
```

### See Cashback Rules

```javascript
// In browser console
console.log("Rules:", cashbackRules);
```

### See Calculated Cashback

```javascript
// In browser console
console.log("Calculated:", calculatedCashback);
```

---

## ✅ Success Looks Like This

```
[Cashback] Calculating for cart: { itemCount: 1, ruleCount: 1, ... }
[Cashback Service] Calculating for item: { ... }
[Cashback Service] Product rule search: { found: false, ... }
[Cashback Service] Category rule search: { found: true, ... }
[Cashback Service] Using rule: { name: "...", type: "category", ... }
[Cashback Service] Percentage calculation: { points: 90, ... }
[Cashback Service] Final result: { points: 90, ... }
[Cashback] Item calculation: { points: 90, ... }
[Cashback] Final calculation: { totalPoints: 90, ... }
```

Then in cart UI: `[+90 pts cashback]` badge appears ✅

---

## 📞 Next Steps

1. **Refresh the page** (hard refresh: Ctrl+Shift+R)
2. **Add customer** to cart
3. **Add product** to cart
4. **Check console** and paste ALL `[Cashback]` logs here
5. The logs will tell us exactly what's wrong!

The detailed logs will show us:

- ✅ What IDs the product has
- ✅ What IDs the rules are looking for
- ✅ Why they match or don't match
- ✅ How many points are calculated

---

**After refreshing, please share the console logs and we'll fix the exact issue!**
