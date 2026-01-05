# Cashback/Points System - Complete Testing Guide

## System Overview

The cashback system allows admin to create cashback rules for categories or products, and customers with active membership earn points on purchases. Points can be redeemed during checkout.

## Prerequisites

✅ Build successful
✅ Code implementation complete
✅ All components created

---

## Testing Checklist

### 1. Admin - Cashback Rules Management

#### Test 1.1: Access Cashback Page

- [ ] Login as admin
- [ ] Navigate to Admin Panel
- [ ] Click "Cashback" in the sidebar menu
- [ ] Verify page loads with two tabs: "Rules" and "Point Usage Settings"

#### Test 1.2: Create Category-Based Cashback Rule

- [ ] Click "Add Rule" button
- [ ] Select "Category" as type
- [ ] Choose a category from dropdown
- [ ] Enter rule name (e.g., "Drinks 5% Cashback")
- [ ] Select "Percentage" cashback type
- [ ] Enter 5% value
- [ ] Toggle "Minimum Order" ON
- [ ] Enter minimum amount (e.g., 100)
- [ ] Toggle "Members Only" ON
- [ ] Click "Create Rule"
- [ ] Verify rule appears in the list
- [ ] Verify status shows "Active" with green indicator

#### Test 1.3: Create Product-Based Cashback Rule

- [ ] Click "Add Rule" button
- [ ] Select "Product" as type
- [ ] Choose a specific product from dropdown
- [ ] Enter rule name (e.g., "Special Item 10 Points")
- [ ] Select "Fixed Amount" cashback type
- [ ] Enter 10 points value
- [ ] Leave minimum order OFF
- [ ] Click "Create Rule"
- [ ] Verify rule appears in the list
- [ ] Verify product rules show with package icon

#### Test 1.4: Edit Cashback Rule

- [ ] Click pencil icon on an existing rule
- [ ] Change cashback value
- [ ] Modify minimum order setting
- [ ] Click "Update Rule"
- [ ] Verify changes are saved
- [ ] Verify updated date changes

#### Test 1.5: Deactivate/Activate Rule

- [ ] Toggle the switch on an active rule
- [ ] Verify status changes to "Inactive" with gray color
- [ ] Toggle switch again to reactivate
- [ ] Verify status returns to "Active"

#### Test 1.6: Delete Cashback Rule

- [ ] Click trash icon on a rule
- [ ] Verify confirmation dialog appears
- [ ] Click "Delete"
- [ ] Verify rule is removed from list

### 2. Admin - Point Usage Settings

#### Test 2.1: Configure Point Usage Rules

- [ ] Switch to "Point Usage Settings" tab
- [ ] Set "Point Value": 1 (1 point = 1 THB/USD)
- [ ] Select "Price When Using Points": Member Price
- [ ] Toggle "Earn Cashback When Using Points": ON
- [ ] Set "Maximum Points Usage": 50%
- [ ] Set "Minimum Points to Redeem": 10
- [ ] Click "Save Settings"
- [ ] Verify success toast appears
- [ ] Refresh page and verify settings are persisted

### 3. Admin - Customer Point Management

#### Test 3.1: View Customer Points

- [ ] Go to Admin → Customers
- [ ] Click on a customer with membership
- [ ] Scroll to "Points History" section
- [ ] Verify points are calculated from pointList array
- [ ] Verify history shows: Date, Type, Amount, Source, Receipt#

#### Test 3.2: Add Points Manually

- [ ] Click "Add Point" button
- [ ] Enter amount (e.g., 50)
- [ ] Enter reason (e.g., "Birthday bonus")
- [ ] Click "Add Point"
- [ ] Verify success message
- [ ] Verify new entry appears in Points History
- [ ] Verify type shows "Adjustment Add"
- [ ] Verify reason is displayed
- [ ] Verify total points increased

#### Test 3.3: Reduce Points Manually

- [ ] Click "Reduce Point" button
- [ ] Enter amount (e.g., 20)
- [ ] Enter reason (e.g., "Correction")
- [ ] Click "Reduce Point"
- [ ] Verify success message
- [ ] Verify new entry appears in Points History
- [ ] Verify amount shows negative (-20)
- [ ] Verify type shows "Adjustment Reduce"
- [ ] Verify total points decreased

### 4. POS - Cashback Earning (Members Only)

#### Test 4.1: Member Purchase with Category Cashback

- [ ] Go to POS (Sales page)
- [ ] Select a customer WITH active membership
- [ ] Add products from a category with cashback rule
- [ ] Ensure cart total meets minimum order if set
- [ ] Click "Complete Sale"
- [ ] Choose payment method
- [ ] Complete payment
- [ ] Verify success message
- [ ] Go to Admin → Customers → [That Customer]
- [ ] Check Points History
- [ ] Verify new "Earned" entry with correct points
- [ ] Verify receipt number is linked
- [ ] Verify points calculated based on category rule

#### Test 4.2: Member Purchase with Product Cashback (Priority)

- [ ] In POS, select same customer
- [ ] Add a product with BOTH category AND product cashback rules
- [ ] Complete sale
- [ ] Check customer's Points History
- [ ] Verify PRODUCT rule was applied (not category)
- [ ] Verify points match product rule value

#### Test 4.3: Non-Member Purchase (No Cashback)

- [ ] In POS, select customer marked as "No Member"
- [ ] Add products with cashback rules
- [ ] Complete sale
- [ ] Go to customer detail
- [ ] Verify NO points were earned
- [ ] Verify no new entry in Points History

#### Test 4.4: Expired Member (No Cashback)

- [ ] Select customer with EXPIRED membership date
- [ ] Add products with cashback rules
- [ ] Attempt to complete sale
- [ ] Verify warning about expired membership
- [ ] If allowed to proceed, verify no points earned

#### Test 4.5: Below Minimum Order (No Cashback)

- [ ] Select active member
- [ ] Add products with minimum order requirement
- [ ] Keep cart total BELOW minimum
- [ ] Complete sale
- [ ] Verify NO points were earned (rule not applied)

### 5. POS - Point Redemption

#### Test 5.1: Use Points - Quick Percentage Buttons

- [ ] Select customer with 100+ points
- [ ] Add items to cart (total = 200 THB)
- [ ] Click "Complete Sale"
- [ ] Verify "Use Points" section appears
- [ ] Verify "Available: X pts" badge shows correct amount
- [ ] Click "25%" quick button
- [ ] Verify points field updates to 25% of available
- [ ] Verify total updates (deducts point value)
- [ ] Click "50%" button
- [ ] Verify points updates to 50%
- [ ] Try "100%" button
- [ ] If exceeds allowed amount, verify capped correctly

#### Test 5.2: Use Points - Custom Amount

- [ ] In payment modal, locate "Enter points" input
- [ ] Type "30" points
- [ ] Click "Apply" button
- [ ] Verify pointsToUse updates to 30
- [ ] Verify total deducts 30 THB (if point value = 1)
- [ ] Clear and enter amount greater than available
- [ ] Click "Apply"
- [ ] Verify capped at available points

#### Test 5.3: Complete Sale with Points

- [ ] Set points to use (e.g., 50)
- [ ] Verify final total is reduced
- [ ] Enter cash received (if cash payment)
- [ ] Complete payment
- [ ] Check customer Points History
- [ ] Verify "Used" entry with negative amount (-50)
- [ ] Verify "Redeemed 50 points for 50 THB" in reason
- [ ] Verify receipt number is linked
- [ ] Verify total points balance decreased

#### Test 5.4: Earn Cashback While Using Points

- [ ] Configure Point Usage Settings: "Earn Cashback When Using Points" = ON
- [ ] Select customer with points
- [ ] Add products with cashback rules
- [ ] Use some points during checkout
- [ ] Complete sale
- [ ] Check Points History
- [ ] Verify TWO entries:
  1.  "Used" entry (negative)
  2.  "Earned" entry (positive)
- [ ] Verify net points balance updated correctly

#### Test 5.5: No Cashback When Using Points

- [ ] Configure Point Usage Settings: "Earn Cashback When Using Points" = OFF
- [ ] Select customer with points
- [ ] Add products with cashback rules
- [ ] Use points during checkout
- [ ] Complete sale
- [ ] Check Points History
- [ ] Verify ONLY "Used" entry appears
- [ ] Verify NO "Earned" entry (no cashback)

#### Test 5.6: Points for Non-Members (Should Not Work)

- [ ] Select customer marked as "No Member"
- [ ] Add items to cart
- [ ] Click "Complete Sale"
- [ ] Verify "Use Points" section DOES NOT appear
- [ ] Complete sale normally
- [ ] Verify no points deducted

### 6. Receipt Integration

#### Test 6.1: Receipt Shows Points Information

- [ ] Complete a sale with points earned
- [ ] Print/view the receipt
- [ ] Verify receipt shows:
  - [ ] Points Earned: X pts
  - [ ] Previous Balance: Y pts
  - [ ] New Balance: Z pts

#### Test 6.2: Receipt Shows Points Redemption

- [ ] Complete a sale using points
- [ ] Print/view the receipt
- [ ] Verify receipt shows:
  - [ ] Points Used: X pts
  - [ ] Points Discount: THB X
  - [ ] Total after points discount

#### Test 6.3: Receipt Links in Points History

- [ ] Go to customer Points History
- [ ] Click on a receipt number link
- [ ] Verify it navigates to receipt details page
- [ ] Verify correct receipt is displayed

### 7. Edge Cases & Error Handling

#### Test 7.1: Insufficient Points

- [ ] Customer has 10 points
- [ ] Try to use 100 points
- [ ] Verify system caps at available points (10)

#### Test 7.2: Maximum Points Limit

- [ ] Set "Maximum Points Usage" to 50%
- [ ] Cart total is 100 THB
- [ ] Customer has 1000 points
- [ ] Try to use 100 points (100%)
- [ ] Verify capped at 50 points (50% of 100 THB)

#### Test 7.3: Minimum Points to Redeem

- [ ] Set "Minimum Points to Redeem" to 10
- [ ] Customer has 5 points
- [ ] Verify "Use Points" UI is disabled or shows message
- [ ] Customer with 15 points should work normally

#### Test 7.4: Multiple Cashback Rules (Priority)

- [ ] Create category rule: 5% cashback
- [ ] Create product rule for item in that category: 10 points fixed
- [ ] Purchase that specific product
- [ ] Verify PRODUCT rule applied (10 points)
- [ ] Verify category rule NOT applied

#### Test 7.5: Rule Deactivation During Active Sale

- [ ] Add items to cart with active cashback rule
- [ ] Admin deactivates the rule
- [ ] Complete the sale
- [ ] Verify cashback calculated based on rules at payment time

#### Test 7.6: Offline Mode

- [ ] Disconnect internet
- [ ] Complete sale with points
- [ ] Verify sale completes (saved locally)
- [ ] Reconnect internet
- [ ] Verify sync occurs
- [ ] Check Firebase for updated points

### 8. Performance & Data Integrity

#### Test 8.1: Large Point History

- [ ] Customer with 100+ point transactions
- [ ] Load customer detail page
- [ ] Verify page loads within reasonable time
- [ ] Verify points calculation is correct
- [ ] Verify history is sorted by date (newest first)

#### Test 8.2: Concurrent Point Updates

- [ ] Two admins open same customer
- [ ] Admin 1 adds 50 points
- [ ] Admin 2 adds 30 points
- [ ] Verify both updates are recorded
- [ ] Verify no data loss
- [ ] Verify total is correct (previous + 50 + 30)

#### Test 8.3: Multiple Cashback Rules

- [ ] Create 10+ cashback rules
- [ ] POS loads products
- [ ] Verify no performance degradation
- [ ] Complete sale
- [ ] Verify correct rules applied

---

## Test Results Template

### Test Session: [Date/Time]

**Tester:** [Your Name]
**Environment:** Dev / Staging / Production
**Browser:** Chrome / Firefox / Safari / Edge

| Test ID | Test Name            | Status  | Notes |
| ------- | -------------------- | ------- | ----- |
| 1.1     | Access Cashback Page | ✅ / ❌ |       |
| 1.2     | Create Category Rule | ✅ / ❌ |       |
| 1.3     | Create Product Rule  | ✅ / ❌ |       |
| ...     | ...                  | ...     |       |

### Issues Found

1. **[Issue Title]**
   - Severity: Critical / High / Medium / Low
   - Description:
   - Steps to Reproduce:
   - Expected Result:
   - Actual Result:
   - Screenshot/Video:

---

## Quick Test Scenarios (Minimal Testing)

If time is limited, test these critical paths:

### Scenario A: Basic Cashback Flow (5 minutes)

1. Create 1 category cashback rule (5%)
2. Create 1 product cashback rule (10 points)
3. Make POS sale with member customer
4. Verify points earned in customer history

### Scenario B: Points Redemption Flow (5 minutes)

1. Customer with 100 points
2. Add items worth 200 THB
3. Use 50 points during checkout
4. Verify points deducted and sale completed

### Scenario C: Admin Point Management (3 minutes)

1. Open customer detail
2. Add 50 points (manual adjustment)
3. Reduce 20 points (manual adjustment)
4. Verify history shows both transactions

---

## Known Limitations

1. **Point calculations are client-side**: Cashback calculated at checkout, not stored in rules
2. **No point expiration**: Points don't expire automatically (future enhancement)
3. **No point transfer**: Cannot transfer points between customers
4. **No bulk rule import**: Rules must be created individually
5. **Receipt links**: Only work if receipt still exists in Firebase

---

## Firebase Data Structure Reference

### Cashback Rule Document

```javascript
{
  id: "rule_123",
  name: "Drinks 5% Cashback",
  type: "category", // or "product"
  targetId: "category_id_123",
  targetName: "Drinks",
  cashbackType: "percentage", // or "fixed"
  cashbackValue: 5,
  hasMinimumOrder: true,
  minimumOrderAmount: 100,
  membersOnly: true,
  isActive: true,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Point List Entry

```javascript
{
  id: "pt_1234567890_abc",
  type: "earned", // "used", "adjustment_add", "adjustment_reduce"
  amount: 50, // negative for used/reduce
  source: "purchase", // "redemption", "admin_adjustment"
  receiptNumber: "ORD-001",
  receiptId: "firebase_doc_id",
  reason: "Earned from purchase #ORD-001",
  createdAt: "2024-12-11T10:30:00.000Z",
  // Optional fields
  itemBreakdown: [...],
  valueRedeemed: 50,
  adjustedBy: { id: "admin_id", name: "Admin Name" }
}
```

---

## Success Criteria

✅ All tests pass with expected results
✅ No console errors during testing
✅ Points calculations are accurate
✅ Data persists correctly in Firebase
✅ UI is responsive and intuitive
✅ No data loss during offline/online transitions

---

## Next Steps After Testing

1. **Document any bugs found** in project management tool
2. **Update this guide** with any new edge cases discovered
3. **Train staff** on how to use the cashback system
4. **Monitor production** for first week after deployment
5. **Gather user feedback** for improvements

---

## Support & Troubleshooting

### Common Issues

**Issue:** Points not appearing after sale

- **Solution:** Check customer membership status and expiry date
- **Solution:** Verify cashback rule is active and minimum order met

**Issue:** Can't use points at checkout

- **Solution:** Verify customer is active member (not expired)
- **Solution:** Check minimum points to redeem setting

**Issue:** Wrong points calculated

- **Solution:** Check if product rule overrides category rule
- **Solution:** Verify cashback percentage/fixed value in rule

**Issue:** Points history not loading

- **Solution:** Check browser console for errors
- **Solution:** Verify Firebase connection
- **Solution:** Refresh the page

---

**Last Updated:** December 11, 2024
**Version:** 1.0.0
**Status:** Ready for Testing ✅
