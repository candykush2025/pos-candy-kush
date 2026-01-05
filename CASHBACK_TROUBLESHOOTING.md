# Cashback Troubleshooting Guide

## 🔍 Cashback Not Showing? Follow This Checklist

### Step 1: Check Customer Status

Open browser console (F12), then in Console tab, type:

```javascript
// In browser console while on POS page
console.log("Customer:", cartCustomer);
```

**What to check**:

- ✅ `isMember: true` OR `isNoMember: false` (or undefined)
- ✅ `expiryDate: null` OR future date (not past)
- ❌ `isNoMember: true` = Won't get cashback

### Step 2: Check Cashback Rules

1. Go to **Admin > Cashback**
2. Verify rules exist in "Cashback Rules" tab
3. Check:
   - ✅ Rule is **Active** (toggle switch ON)
   - ✅ Rule type matches product (Category OR Product)
   - ✅ Cashback value is greater than 0
   - ✅ Minimum order requirement met (if set)

### Step 3: Check Console Logs

Open DevTools (F12) > Console tab, look for:

```
[Cashback] Calculating for cart: {
  itemCount: 1,          ← Should be > 0
  ruleCount: 2,          ← Should be > 0
  total: 900,
  customer: "Test Customer"
}
```

**If you see**:

- `itemCount: 0` → Add products to cart
- `ruleCount: 0` → Create rules in Admin
- No log at all → Customer not detected as member

### Step 4: Check Item Calculation

Look for per-item logs:

```
[Cashback] Item calculation: {
  itemName: "Test Cashback",
  itemData: { productId: "abc123", categoryId: "cat1", ... },
  points: 10,           ← Should be > 0
  ruleApplied: "5% Cashback on All Products"
}
```

**If you see**:

- `points: 0` → No rule matched, check rule configuration
- `ruleApplied: null` → No matching rule found

### Step 5: Verify Product Data

The product must have:

- ✅ Valid `productId` or `id`
- ✅ Valid `categoryId`
- ✅ Price > 0

Check in console:

```javascript
console.log("Cart Items:", items);
```

---

## 🐛 Common Issues & Fixes

### Issue 1: "Cashback badge not appearing"

**Symptoms**:

- Console shows `points: 10` (or > 0)
- Badge still doesn't show in cart

**Fix**:

1. Hard refresh (Ctrl+Shift+R)
2. Check if customer is added to cart
3. Verify item has `productId` or `id` field

**Code to check** (in SalesSection.jsx ~3871):

```javascript
const itemCashback = calculatedCashback.itemBreakdown.find(
  (cb) => cb.itemId === (item.productId || item.id)
);
```

### Issue 2: "Points showing 0 in console"

**Cause**: No matching cashback rule

**Checklist**:

1. ✅ Rule type = "product" → Must match exact product ID
2. ✅ Rule type = "category" → Must match product's category
3. ✅ Rule is **Active** (green toggle)
4. ✅ Minimum order met (if required)

**Example**:

```
Rule: "5% on Beverages" (Category)
Product: { categoryId: "beverages" }  ← Must match exactly
```

### Issue 3: "Member but no cashback"

**Possible causes**:

**A. Expiry Date Issue**

```javascript
// Customer has expired membership
expiryDate: "2024-11-30"; // Past date ❌
```

**Fix**: Update expiry to future date or remove field

**B. isNoMember Flag Set**

```javascript
// Customer marked as non-member
isNoMember: true  ❌
```

**Fix**: Set `isNoMember: false` or `isMember: true`

**C. Missing Member Status**

```javascript
// No member flags at all
isMember: undefined;
isNoMember: undefined;
```

**Result**: Should work (defaults to member) ✅  
**If not working**: Set `isMember: true` explicitly

### Issue 4: "Console shows nothing"

**Cause**: Cashback calculation not triggered

**Check**:

1. Is customer added to cart?
2. Are products in cart?
3. Are cashback rules loaded?

**Force reload**:

```javascript
// In browser console
window.location.reload();
```

---

## 📊 Debug Checklist

Use this checklist to debug systematically:

### Pre-Requisites

- [ ] Customer added to cart
- [ ] Products in cart
- [ ] Cashback rules created in Admin
- [ ] At least one rule is Active

### Customer Validation

- [ ] `cartCustomer` exists
- [ ] `isMember: true` OR `isNoMember: false`
- [ ] `expiryDate` is null OR future date
- [ ] Member badge shows in cart

### Rule Validation

- [ ] Rules visible in Admin > Cashback
- [ ] Rule toggle is green (Active)
- [ ] Rule type matches product/category
- [ ] Cashback value > 0

### Console Logs

- [ ] `[Cashback] Calculating for cart` appears
- [ ] `itemCount > 0` and `ruleCount > 0`
- [ ] `[Cashback] Item calculation` appears
- [ ] `points > 0` for at least one item
- [ ] `ruleApplied` shows rule name

### Visual Confirmation

- [ ] Green badge shows in cart item
- [ ] Badge text: `+X pts cashback`
- [ ] Badge visible below price info

---

## 🔧 Manual Testing Steps

### Test 1: Basic Cashback

1. **Admin Setup**:

   - Go to Admin > Cashback
   - Click "Add Rule"
   - Name: "Test 10% Cashback"
   - Apply to: Category
   - Select: Any category
   - Cashback Type: Percentage
   - Value: 10%
   - Toggle: Active ✓
   - Click "Create Rule"

2. **POS Testing**:

   - Go to Sales
   - Click "Add Customer"
   - Select any customer
   - Add any product from that category
   - **Expected**: See `[+X pts cashback]` badge

3. **Console Check**:
   - Open DevTools (F12)
   - Should see `[Cashback]` logs
   - `points: X` (where X > 0)

### Test 2: Product-Specific Cashback

1. **Admin Setup**:

   - Add Rule > Product type
   - Select specific product
   - Set cashback (e.g., 5 pts fixed)

2. **POS Testing**:
   - Add that specific product
   - **Expected**: Badge shows `[+5 pts cashback]`

### Test 3: No Cashback (Control)

1. Add product without any rule
2. **Expected**: No badge shown
3. Console: `points: 0`

---

## 🎯 Quick Fixes

### Fix 1: Force Member Status

If customer not detected as member:

1. Go to Admin > Customers
2. Edit customer
3. Check "Is Member" toggle
4. Save

Or directly in Firebase:

```json
{
  "isMember": true,
  "isNoMember": false
}
```

### Fix 2: Remove Expiry Date

If expiry causing issues:

In Firebase Firestore:

1. Open customer document
2. Delete `expiryDate` field
3. Customer will be treated as active member

### Fix 3: Activate All Rules

In Admin > Cashback:

1. Check all rule toggles are green
2. If red, click to activate
3. Refresh POS page

### Fix 4: Clear Cache

If changes not appearing:

1. Hard refresh: `Ctrl + Shift + R` (Windows)
2. Or clear browser cache
3. Reload page

---

## 📱 Test Data Examples

### Good Customer (Will get cashback)

```json
{
  "name": "Test Customer",
  "customerId": "CK-0068",
  "isMember": true,
  "expiryDate": "2025-12-31",
  "pointList": []
}
```

### Bad Customer (Won't get cashback)

```json
{
  "name": "Non Member",
  "customerId": "CK-0069",
  "isNoMember": true, // ❌ Marked as non-member
  "expiryDate": "2024-01-01" // ❌ Expired
}
```

### Good Rule (Will give cashback)

```json
{
  "name": "10% Cashback",
  "type": "category",
  "targetId": "cat_beverages",
  "cashbackType": "percentage",
  "cashbackValue": 10,
  "isActive": true, // ✅
  "hasMinimumOrder": false
}
```

---

## 🚨 Emergency Debug Commands

Run these in browser console for instant diagnosis:

```javascript
// 1. Check customer in cart
console.log("Customer:", cartCustomer);

// 2. Check calculated cashback
console.log("Calculated Cashback:", calculatedCashback);

// 3. Check cashback rules
console.log("Cashback Rules:", cashbackRules);

// 4. Check cart items
console.log("Cart Items:", items);

// 5. Manual cashback calculation
items.forEach((item) => {
  console.log(`Item: ${item.name}`, {
    productId: item.productId || item.id,
    categoryId: item.categoryId,
    price: item.price,
  });
});
```

---

## ✅ Success Indicators

You'll know it's working when you see:

1. **Console**: `[Cashback] Final calculation: { totalPoints: 10, itemBreakdown: [...] }`
2. **Cart**: Green badge below price: `[+10 pts cashback]`
3. **Payment**: Total cashback shown before payment
4. **After Sale**: Points added to customer's PointList

---

## 📞 Still Not Working?

Check these files in order:

1. **SalesSection.jsx** ~Line 426: Cashback calculation trigger
2. **SalesSection.jsx** ~Line 454: Cashback calculation logic
3. **SalesSection.jsx** ~Line 3871: Cashback display in cart
4. **cashbackService.js**: Rule matching logic

Make sure:

- Latest code deployed (`npm run dev` restarted)
- No JavaScript errors in console
- Firebase connected and rules synced

---

**Last Resort**: Restart dev server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

Then hard refresh browser: `Ctrl + Shift + R`
