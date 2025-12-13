# 🚀 Quick Start - Cashback System Testing

## ✅ System Status

- **Build:** Successful ✅
- **Dev Server:** Running on http://localhost:3005
- **All Components:** Created ✅
- **All Code:** Implemented ✅

---

## 🎯 Start Testing NOW - 5 Minute Flow

### Step 1: Setup Cashback Rule (2 min)

1. Open http://localhost:3005/admin/cashback
2. Click "Add Rule"
3. Fill in:
   - Type: **Category**
   - Select any category (e.g., "Drinks")
   - Name: **"Test 10% Cashback"**
   - Cashback Type: **Percentage**
   - Value: **10**
   - Toggle "Members Only": **ON**
4. Click "Create Rule"
5. ✅ Verify rule appears in list

### Step 2: Make a Test Sale (2 min)

1. Go to http://localhost:3005/sales
2. Click customer icon, select a **member customer** (with active expiry date)
3. Add products from the category you selected above
4. Click "Complete Sale"
5. Select payment method (Cash)
6. Enter amount
7. Complete payment
8. ✅ Verify success message

### Step 3: Verify Points Earned (1 min)

1. Go to http://localhost:3005/admin/customers
2. Click on the customer you just used
3. Scroll to "Points History"
4. ✅ Verify new entry:
   - Type: "Earned"
   - Points: 10% of purchase total
   - Receipt number linked
   - Date: Just now

---

## 🔄 Test Points Redemption - 3 Minutes

### Step 1: Use Points in Checkout

1. Go back to http://localhost:3005/sales
2. Same customer (who now has points)
3. Add items to cart
4. Click "Complete Sale"
5. **Look for "Use Points" section** in payment modal
6. ✅ Verify shows "Available: X pts"
7. Click "25%" button
8. ✅ Verify total decreases
9. Complete payment

### Step 2: Check Points Used

1. Go to customer detail again
2. Check Points History
3. ✅ Verify new "Used" entry (negative amount)
4. ✅ Verify balance updated correctly

---

## 🛠️ Test Admin Point Adjustment - 2 Minutes

1. In customer detail page
2. Click "Add Point" button
3. Enter: **50** points
4. Reason: **"Test bonus"**
5. Click "Add Point"
6. ✅ Verify new entry in history
7. Click "Reduce Point" button
8. Enter: **20** points
9. Reason: **"Test correction"**
10. Click "Reduce Point"
11. ✅ Verify negative entry appears

---

## 📋 Critical Tests Checklist

### Must Test ✅

- [ ] Create cashback rule
- [ ] Member earns points on purchase
- [ ] Points appear in customer history
- [ ] Use points during checkout
- [ ] Total reduces when using points
- [ ] Points balance updates after redemption
- [ ] Admin can add/reduce points manually
- [ ] Non-member doesn't see "Use Points" option

### Important Tests ⚠️

- [ ] Expired member warning on checkout
- [ ] Product rule overrides category rule
- [ ] Minimum order requirement works
- [ ] Maximum points usage limit works
- [ ] Receipt number links to receipt

### Nice to Test 💡

- [ ] Edit cashback rule
- [ ] Deactivate/activate rule
- [ ] Delete rule
- [ ] Configure point usage settings
- [ ] Quick percentage buttons (10%, 25%, 50%, 100%)

---

## 🐛 What to Look For

### ✅ Good Signs

- No console errors
- Points calculate correctly
- Data persists after page refresh
- Smooth user experience
- Success toasts appear

### ❌ Red Flags

- Console errors
- Points not calculating
- "undefined" or "NaN" appearing
- Page crashes
- Data not saving
- Slow performance (>2 sec load)

---

## 📊 Expected Calculations

### Example: 10% Category Cashback

- Cart Total: **200 THB**
- Cashback Rule: **10%**
- **Points Earned:** 20 points ✅

### Example: 50 Fixed Points Product

- Product Price: **100 THB**
- Quantity: **2**
- Cashback Rule: **50 points (fixed)**
- **Points Earned:** 100 points (50 × 2) ✅

### Example: Points Redemption

- Cart Total: **300 THB**
- Points Used: **50 points**
- Point Value: **1 THB per point**
- **Final Total:** 250 THB ✅

---

## 🚨 Common Issues & Quick Fixes

### Issue: "Can't see Use Points section"

**Check:**

- Customer is a member (not "No Member")
- Customer expiry date is valid (not expired)
- Customer has points > 0

### Issue: "Points not earned after sale"

**Check:**

- Customer is active member
- Cashback rule is active
- Products match rule's category/product
- Cart total meets minimum order (if set)

### Issue: "Wrong points calculated"

**Check:**

- Product rule overrides category rule (intentional)
- Verify cashback percentage/fixed value
- Check if minimum order not met

---

## 📱 Test on Different Devices

- [ ] Desktop Chrome
- [ ] Desktop Firefox
- [ ] Mobile Chrome (if available)
- [ ] Tablet (if available)

---

## 🎉 Success Indicators

After 15 minutes of testing, you should have:

1. ✅ Created at least 1 cashback rule
2. ✅ Completed 1 sale with points earned
3. ✅ Redeemed points in 1 checkout
4. ✅ Manually adjusted points (add/reduce)
5. ✅ Verified all data appears correctly
6. ✅ No critical errors in console

**If all above complete = System is working! 🎊**

---

## 📞 Next Actions

### If Tests Pass ✅

1. Test with real store categories/products
2. Train staff on new features
3. Set up actual cashback rules
4. Monitor first week of production use

### If Tests Fail ❌

1. Note exact steps that failed
2. Check browser console for errors
3. Take screenshots
4. Report issue with details from CASHBACK_SYSTEM_TESTING.md

---

## 🔗 Quick Links

- **Admin Cashback:** http://localhost:3005/admin/cashback
- **POS Sales:** http://localhost:3005/sales
- **Customers:** http://localhost:3005/admin/customers
- **Full Testing Guide:** CASHBACK_SYSTEM_TESTING.md

---

**Ready to test? Start with Step 1 above! ⬆️**

**Dev Server:** Running on port 3005
**Status:** Ready for Testing ✅
**Time Needed:** 15-20 minutes for complete flow

---

**💡 Pro Tip:** Open browser DevTools (F12) to watch for any console errors during testing!
