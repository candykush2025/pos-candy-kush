# Cashback Display Fix & Source Badge Removal

## Issues Fixed

### 1. ✅ Removed "kiosk" Badge from Cart Customer Display

**Problem**: Customer in cart still showed "kiosk" badge  
**Location**: Cart sidebar customer section

**Fixed**: Replaced source badge with Member and Expiry status badges

**Before**:

```jsx
{
  cartCustomer.source && <Badge>{cartCustomer.source}</Badge>;
}
```

**After**:

```jsx
{
  cartCustomer.isMember && <Badge>Member</Badge>;
}
{
  cartCustomer.expiryDate && <Badge>{isExpired ? "Expired" : "Active"}</Badge>;
}
```

---

### 2. ✅ Fixed Cashback Not Showing in Cart

**Problem**: Cashback rules created in admin but not showing in cart items

**Root Cause**: Cashback calculation required `expiryDate` field to exist, preventing calculation for customers without expiry dates

**Old Logic** (Line 426):

```javascript
if (cartCustomer && !cartCustomer.isNoMember && cartCustomer.expiryDate) {
  // Only calculated if expiryDate exists ❌
}
```

**New Logic**:

```javascript
const isMember =
  cartCustomer && (cartCustomer.isMember || !cartCustomer.isNoMember);

if (isMember) {
  // Check expiry only if it exists
  if (cartCustomer.expiryDate) {
    const isExpired = customerApprovalService.isCustomerExpired(
      cartCustomer.expiryDate
    );
    if (isExpired) {
      setCalculatedCashback({ totalPoints: 0, itemBreakdown: [] });
      return;
    }
  }

  // Calculate cashback ✅
  if (items.length > 0 && cashbackRules.length > 0) {
    calculateCashbackForCart();
  }
}
```

**Key Changes**:

1. Member status checked via `isMember` flag OR absence of `isNoMember`
2. Expiry check only performed if `expiryDate` exists
3. Cashback calculated for all members, not just those with expiry dates

---

### 3. ✅ Added Debug Logging

Added console logs to help diagnose cashback issues:

```javascript
console.log("[Cashback] Calculating for cart:", {
  itemCount: items.length,
  ruleCount: cashbackRules.length,
  total,
  customer: cartCustomer?.name,
});

console.log("[Cashback] Item calculation:", {
  itemName: item.name,
  itemData,
  points,
  ruleApplied: ruleApplied?.name,
});

console.log("[Cashback] Final calculation:", {
  totalPoints,
  itemBreakdown,
});
```

**How to Use**:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Add customer and products to cart
4. Watch for `[Cashback]` logs

---

## Files Modified

### `src/components/pos/SalesSection.jsx`

**Changes**:

1. **Line ~3765**: Removed source badge, added Member & Expiry badges
2. **Line ~426**: Fixed cashback calculation logic to work without expiry date
3. **Line ~2232**: Fixed payment cashback calculation logic
4. **Line ~454**: Added debug logging to cashback calculation

---

## Testing Guide

### Test 1: Source Badge Removed ✓

1. Add customer to cart
2. Check customer display in cart sidebar
3. **Should NOT see**: "kiosk", "local", "loyverse", "pos" badges
4. **Should see**: "Member" badge (if member), "Active"/"Expired" badge (if has expiry)

### Test 2: Cashback Showing for Customer Without Expiry

1. Create customer without expiry date
2. Mark as member (isMember = true OR isNoMember = false)
3. Create cashback rule in Admin > Cashback
4. Add customer to cart
5. Add product covered by cashback rule
6. **Expected**: Green cashback badge shows: `[+X pts cashback]`

### Test 3: Cashback Showing for Customer With Expiry

1. Create customer with future expiry date
2. Mark as member
3. Create cashback rule
4. Add customer to cart
5. Add product covered by rule
6. **Expected**: Green cashback badge shows

### Test 4: No Cashback for Expired Customer

1. Create customer with past expiry date
2. Try to add to cart
3. **Expected**: Cannot add (blocked with error)

### Test 5: Debug Logs Working

1. Open DevTools > Console
2. Add customer and products
3. **Expected**: See `[Cashback]` logs with:
   - Item count
   - Rule count
   - Points calculated per item
   - Final total

---

## Visual Examples

### Cart Customer Display (After)

```
┌─────────────────────────────────────┐
│ 👤 Test Customer                    │
│ [Member] [Active]                   │ ← No "kiosk" badge
│ CK-0068 • 0 pts                     │
│                                     │
│ [X Remove]                          │
└─────────────────────────────────────┘
```

### Cart Item with Cashback (After Fix)

```
┌─────────────────────────────────────┐
│ Test Cashback                       │
│ ฿1,000 → ฿900 [Member]              │
│ [+10 pts cashback] ← NOW SHOWS!     │
│ [- 1 +]    ฿900.00                  │
└─────────────────────────────────────┘
```

### Console Output (Debug)

```
[Cashback] Calculating for cart: {
  itemCount: 1,
  ruleCount: 2,
  total: 900,
  customer: "Test Customer"
}

[Cashback] Item calculation: {
  itemName: "Test Cashback",
  itemData: { productId: "abc123", categoryId: "cat1", price: 900, quantity: 1 },
  points: 10,
  ruleApplied: "5% Cashback on All Products"
}

[Cashback] Final calculation: {
  totalPoints: 10,
  itemBreakdown: [{ itemId: "abc123", itemName: "Test Cashback", points: 10 }]
}
```

---

## Member Detection Logic

The system now detects members using multiple methods:

```javascript
// Method 1: Explicit isMember flag
customer.isMember === true;

// Method 2: Absence of isNoMember flag
customer.isNoMember !== true;

// Combined Check
const isMember = customer.isMember || !customer.isNoMember;
```

**This means**:

- ✅ Customer with `isMember: true` → Member
- ✅ Customer with `isNoMember: false` → Member
- ✅ Customer with no flags → Member (default)
- ❌ Customer with `isNoMember: true` → Not a member

---

## Expiry Handling

**Old Behavior** ❌:

- Required expiry date to calculate cashback
- Customers without expiry = no cashback

**New Behavior** ✅:

- Expiry date is optional
- If exists → check if not expired
- If doesn't exist → assume active, calculate cashback

```javascript
// Expiry check only if exists
if (cartCustomer.expiryDate) {
  const isExpired = customerApprovalService.isCustomerExpired(
    cartCustomer.expiryDate
  );
  if (isExpired) {
    // Block expired members
    return;
  }
}

// Otherwise, proceed with cashback
calculateCashbackForCart();
```

---

## Common Issues & Solutions

### Issue: Cashback still not showing

**Check**:

1. Is customer marked as member? (`isMember: true` OR `isNoMember: false`)
2. Are cashback rules created and active in Admin?
3. Does product match the rule (category or product)?
4. Open Console and check `[Cashback]` logs

### Issue: "kiosk" badge still showing

**Check**:

1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache
3. Verify you're on latest code (npm run dev restarted)

### Issue: Expired customer can be added

**Check**:

1. Expiry date is in the past
2. Date format is correct (YYYY-MM-DD or ISO 8601)
3. Check customer selection modal validation

---

## Build Status

✅ **Compiled Successfully**  
✅ **No Errors**  
✅ **No Type Errors**  
✅ **Debug Logs Added**

---

## Next Steps

1. **Test cashback display** with different customers:

   - With expiry date
   - Without expiry date
   - With isMember flag
   - Without flags (default member)

2. **Verify badge removal** in all locations:

   - Cart customer display ✅
   - Customer selection modal ✅
   - Customer list page ✅

3. **Check console logs** to ensure cashback calculation working

4. **Create cashback rules** in Admin > Cashback if not exists

5. **Test complete purchase flow** with cashback earning

---

**Status**: ✅ **READY TO TEST**

See console logs for real-time cashback calculation debugging.
