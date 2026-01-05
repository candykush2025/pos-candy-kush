# Customer Expiry Date System

## Overview

The Customer Expiry Date system allows administrators and cashiers to manage customer membership expiration dates with an approval workflow. Expired customers cannot complete purchases until their membership is extended.

## Features

### 1. Expiry Date Management

- **Admin**: Can set/update expiry dates directly without approval
- **Cashier**: Can request expiry date changes that require admin approval
- **Quick Options**: +10 Days or +6 Months buttons for fast setup
- **Manual Entry**: Custom date selection via date picker

### 2. Expiry Status Indicators

- **Active**: Customer membership is valid
- **Expiring Soon**: Within 7 days of expiration (⚠️ warning)
- **Expired**: Past expiration date (❌ blocked from checkout)

### 3. Checkout Validation

- Prevents checkout if customer has expired membership
- Shows warning if customer is expiring soon
- Prompts to extend expiry date before payment

### 4. Approval Workflow

- Cashier changes create pending approval requests
- Admin can approve or decline requests
- Audit trail of all expiry changes

## User Roles

### Admin Capabilities

✅ Set expiry dates directly (no approval needed)
✅ Approve/decline cashier requests
✅ View all expiry requests
✅ Extend expired memberships immediately

### Cashier Capabilities

⚠️ Request expiry date changes (requires approval)
⚠️ Cannot directly modify expiry dates
✅ Can add new customers (expiry requires approval if set)
✅ See expiry status on all customer cards
❌ Cannot checkout with expired customers

## How to Use

### For Admin: Set Expiry Date

1. Go to **Admin → Customers**
2. Click **Edit** on a customer
3. Scroll to **Membership Expiry** section
4. Choose:
   - Click **Set +10 Days** for 10-day extension
   - Click **Set +6 Months** for 6-month extension
   - Or manually select a date
5. Click **Update Customer**
6. ✅ Expiry date applied immediately

### For Cashier: Request Expiry Extension

1. Go to **POS → Customers** or **Sales → Customers**
2. Click **Edit** on a customer
3. Scroll to **Expiry Date** section
4. Choose:
   - Click **+10 Days** button
   - Click **+6 Months** button
   - Or manually select a date
5. Click **Update** or **Create**
6. ⚠️ Message: "Expiry date change sent for admin approval"
7. Wait for admin approval

### For Admin: Approve Expiry Requests

1. Go to **Admin → Customers** (approval section will be added)
2. View **Pending Expiry Requests**
3. Review:
   - Customer name
   - Current expiry date
   - Requested new expiry date
   - Requested by (cashier name)
   - Request date/time
4. Click **Approve** or **Decline**
5. If approved, customer's expiry date is updated

### Handle Expired Customer at Checkout

**Scenario**: Customer tries to checkout but membership expired

1. Cashier selects customer for cart
2. Adds items to cart
3. Clicks **Checkout**
4. ❌ Error: "Customer membership has expired! Please extend the expiry date before checkout."
5. Options:
   - **Cashier**: Request expiry extension (wait for admin)
   - **Admin**: Edit customer and extend expiry immediately
6. After extension approved, checkout proceeds normally

## Database Structure

### Customer Document (Firebase)

```javascript
{
  id: "customer_id",
  name: "John Doe",
  email: "john@example.com",
  expiryDate: "2024-12-31", // YYYY-MM-DD format
  // ... other fields
}
```

### Expiry Request Document (Firebase)

```javascript
{
  id: "request_id",
  customerId: "customer_id",
  customerName: "John Doe",
  currentExpiryDate: "2024-11-21",
  newExpiryDate: "2024-12-01",
  requestedBy: "cashier_id",
  requestedByName: "Cashier Name",
  reason: "Cashier requested expiry date extension",
  status: "pending", // "pending" | "approved" | "declined"
  createdAt: Timestamp,
  updatedAt: Timestamp,
  // After approval/decline:
  approvedBy: "admin_id",
  approvedByName: "Admin Name",
  approvedAt: Timestamp,
  // Or:
  declinedBy: "admin_id",
  declinedByName: "Admin Name",
  declinedAt: Timestamp,
  declineReason: "Reason for decline"
}
```

## Service Functions

### `customerApprovalService.js`

#### Create Request

```javascript
await customerApprovalService.createExpiryRequest({
  customerId: "customer_id",
  customerName: "John Doe",
  currentExpiryDate: "2024-11-21",
  newExpiryDate: "2024-12-01",
  requestedBy: cashier.id,
  requestedByName: cashier.name,
  reason: "Extension requested",
});
```

#### Calculate Expiry Date

```javascript
// +10 days from today
const expiry10Days = customerApprovalService.calculateExpiryDate("10days");

// +6 months from today
const expiry6Months = customerApprovalService.calculateExpiryDate("6months");
```

#### Check Expiry Status

```javascript
// Check if expired
const isExpired = customerApprovalService.isCustomerExpired("2024-11-01");

// Check if expiring soon (within 7 days)
const expiringSoon = customerApprovalService.isExpiringSoon("2024-11-25");

// Get full status
const status = customerApprovalService.getExpiryStatus("2024-12-01");
// Returns: { status: "active", message: "Active", variant: "default" }
```

#### Approve Request

```javascript
await customerApprovalService.approveExpiryRequest(
  requestId,
  adminId,
  adminName
);

// Then update customer
await customersService.update(customerId, {
  expiryDate: newExpiryDate,
});
```

#### Decline Request

```javascript
await customerApprovalService.declineExpiryRequest(
  requestId,
  adminId,
  adminName,
  "Insufficient documentation"
);
```

## UI Components

### Expiry Date Badge (Customer Card)

```jsx
{
  customer.expiryDate && (
    <Badge
      variant={
        customerApprovalService.isCustomerExpired(customer.expiryDate)
          ? "destructive"
          : customerApprovalService.isExpiringSoon(customer.expiryDate)
          ? "outline"
          : "default"
      }
    >
      {customerApprovalService.isCustomerExpired(customer.expiryDate) ? (
        <>
          <AlertTriangle className="h-3 w-3" />
          Expired
        </>
      ) : customerApprovalService.isExpiringSoon(customer.expiryDate) ? (
        <>
          <Clock className="h-3 w-3" />
          Expiring Soon
        </>
      ) : (
        <>
          <Calendar className="h-3 w-3" />
          Active
        </>
      )}
    </Badge>
  );
}
```

### Expiry Date Form Field (Admin)

```jsx
<div className="space-y-3">
  <Input
    type="date"
    value={formData.expiryDate}
    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
  />

  <div className="flex gap-2">
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        const expiry = customerApprovalService.calculateExpiryDate("10days");
        setFormData({ ...formData, expiryDate: expiry });
      }}
    >
      +10 Days
    </Button>
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        const expiry = customerApprovalService.calculateExpiryDate("6months");
        setFormData({ ...formData, expiryDate: expiry });
      }}
    >
      +6 Months
    </Button>
  </div>
</div>
```

## Validation Rules

### Checkout Validation

1. ✅ Customer has no expiry date → Allow checkout
2. ✅ Customer expiry date is in the future → Allow checkout (warn if < 7 days)
3. ❌ Customer expiry date is today or past → Block checkout

### Expiry Date Rules

- Format: `YYYY-MM-DD` (ISO 8601)
- Stored as string in Firebase
- Compared as Date objects for validation
- Timezone: Local browser timezone

## Workflow Diagrams

### Admin Sets Expiry

```
Admin → Edit Customer → Set Expiry Date → Save
                                            ↓
                               Customer.expiryDate UPDATED
```

### Cashier Requests Expiry

```
Cashier → Edit Customer → Set Expiry Date → Save
                                              ↓
                               Create Approval Request (pending)
                                              ↓
                               Customer.expiryDate NOT CHANGED
                                              ↓
Admin → View Requests → Approve
                           ↓
         Customer.expiryDate UPDATED
```

### Checkout with Expired Customer

```
Cashier → Add Customer to Cart → Add Items → Checkout
                                                 ↓
                                Check if customer.expiryDate exists
                                                 ↓
                                    Is expired? (< today)
                                   ↙ YES         NO ↘
                              ❌ Block            ✅ Allow
                        Show error message    (warn if expiring soon)
```

## Error Messages

### Expired Customer at Checkout

```
❌ Customer "John Doe" membership has expired!
   Please extend the expiry date before checkout.
```

### Expiring Soon Warning

```
⚠️ Customer "John Doe" expires in 3 days
```

### Cashier Request Confirmation

```
✅ Customer updated! Expiry date change sent for admin approval.
```

### Request Created

```
✅ Customer created! Expiry date sent for admin approval.
```

## Testing Checklist

### Admin Tests

- [ ] Create customer with expiry date → Set immediately
- [ ] Edit customer to add expiry date → Updated immediately
- [ ] Edit customer to change expiry date → Updated immediately
- [ ] Use +10 Days button → Correct date calculated
- [ ] Use +6 Months button → Correct date calculated
- [ ] Manually select date → Correct date saved

### Cashier Tests

- [ ] Create customer with expiry date → Request created
- [ ] Edit customer expiry date → Request created
- [ ] Create customer without expiry → No request created
- [ ] Edit customer without changing expiry → No request created
- [ ] Use +10 Days button → Correct date in request
- [ ] Use +6 Months button → Correct date in request

### Checkout Tests

- [ ] Customer with no expiry date → Checkout allowed
- [ ] Customer with future expiry (> 7 days) → Checkout allowed
- [ ] Customer expiring in 3 days → Checkout allowed + warning shown
- [ ] Customer expired yesterday → Checkout blocked + error shown
- [ ] Customer expired today → Checkout blocked + error shown

### Status Badge Tests

- [ ] No expiry date → No badge shown
- [ ] Active (> 7 days) → Green "Active" badge
- [ ] Expiring soon (≤ 7 days) → Yellow "Expiring Soon" badge
- [ ] Expired → Red "Expired" badge

### Approval Tests (To Be Implemented)

- [ ] Admin views pending requests
- [ ] Admin approves request → Customer updated
- [ ] Admin declines request → Customer not updated
- [ ] Request shows audit trail (who, when, why)

## Future Enhancements

### Phase 2

- [ ] Admin approval page/modal
- [ ] Email notifications for expiry reminders
- [ ] Bulk expiry extension for multiple customers
- [ ] Expiry reports and analytics
- [ ] Auto-renewal options
- [ ] Grace period after expiry (allow X days)

### Phase 3

- [ ] SMS notifications for expiring memberships
- [ ] Customer self-service expiry renewal
- [ ] Integration with payment gateway for auto-renewal
- [ ] Tiered membership levels with different expiry rules

## Troubleshooting

### Issue: Cashier changes applied immediately

**Solution**: Check if `cashier` prop is being passed correctly to form component

### Issue: Expiry date not showing in UI

**Solution**: Ensure `expiryDate` field is included in customer data fetch

### Issue: Checkout not blocking expired customers

**Solution**: Verify `cartCustomer` has `expiryDate` field and validation is running

### Issue: +10 Days button not working

**Solution**: Check `customerApprovalService.calculateExpiryDate()` function

### Issue: Status badge not updating

**Solution**: Force re-render after expiry date change or refresh customer list

## Support

For questions or issues with the expiry system:

1. Check this documentation
2. Review service functions in `customerApprovalService.js`
3. Check console for error messages
4. Verify Firebase permissions for `customer_expiry_requests` collection

---

**Last Updated**: November 21, 2024
**Version**: 1.0.0
