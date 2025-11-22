# Customer Expiry Date System - Implementation Summary

## ✅ Completed Features

### 1. Core Service Layer

**File**: `src/lib/firebase/customerApprovalService.js`

✅ Created comprehensive approval service with functions for:

- Creating expiry date change requests
- Approving/declining requests
- Calculating expiry dates (+10 days, +6 months)
- Checking expiry status (expired, expiring soon, active)
- Getting pending requests

### 2. Admin Customer Management

**File**: `src/app/admin/customers/page.js`

✅ Updated with:

- Expiry date field in form
- +10 Days / +6 Months quick action buttons
- Status badges showing Active/Expiring Soon/Expired
- Direct expiry date setting (no approval needed for admin)
- Visual indicators for expiry status

### 3. POS Customer Management

**File**: `src/components/pos/CustomersSection.jsx`

✅ Updated with:

- Expiry date field in customer form
- +10 Days / +6 Months buttons
- Approval workflow for cashiers
- Status badges on customer cards
- Warning message about admin approval requirement

### 4. Cashier Customer Page

**File**: `src/app/(pos)/sales/customers/page.js`

✅ Updated with:

- Expiry date field with quick options
- Amber warning about approval requirement
- Status badges showing expiry status
- Form integration ready for approval flow

### 5. Checkout Validation

**File**: `src/components/pos/SalesSection.jsx`

✅ Added validation in checkout:

- Blocks checkout if customer is expired
- Shows warning if customer is expiring soon (within 7 days)
- Clear error messages prompting to extend expiry

### 6. Documentation

**File**: `CUSTOMER_EXPIRY_SYSTEM.md`

✅ Comprehensive guide including:

- Feature overview
- User role capabilities
- How-to guides for admin and cashier
- Database structure
- Service function examples
- UI component examples
- Workflow diagrams
- Testing checklist
- Troubleshooting guide

## 🔄 How It Works

### Admin Flow (Direct)

```
Admin → Edit Customer → Set Expiry Date → Save
                                            ↓
                               Customer.expiryDate UPDATED IMMEDIATELY
```

### Cashier Flow (Approval Required)

```
Cashier → Edit Customer → Set Expiry Date → Save
                                              ↓
                               Create Approval Request (status: pending)
                                              ↓
                               Customer.expiryDate NOT CHANGED YET
                                              ↓
Admin → Approve Request
           ↓
Customer.expiryDate UPDATED
```

### Checkout Validation

```
Customer Added to Cart → Checkout Button Clicked
                              ↓
                Check customer.expiryDate
                              ↓
              Is expired? (< today)
             ↙ YES           NO ↘
    ❌ BLOCK CHECKOUT    ✅ ALLOW CHECKOUT
    Show error message   (warn if expiring soon)
```

## 📊 Status Indicators

### Badge Colors

- **Green "Active"**: Expiry date > 7 days in future
- **Yellow "Expiring Soon"**: Expiry date ≤ 7 days in future
- **Red "Expired"**: Expiry date ≤ today

### Icons

- **Active**: Calendar icon
- **Expiring Soon**: Clock icon
- **Expired**: Alert Triangle icon

## 🎯 Key Features

### 1. Quick Date Options

- **+10 Days**: Adds 10 days from today
- **+6 Months**: Adds 6 months from today
- Manual date picker for custom dates

### 2. Role-Based Permissions

- **Admin**: Direct expiry date modification
- **Cashier**: Request-based expiry date changes

### 3. Checkout Protection

- Prevents expired customers from completing purchases
- Warns about customers expiring soon
- Forces expiry extension before payment

### 4. Audit Trail

All expiry requests include:

- Customer ID and name
- Current and new expiry dates
- Requester information (ID and name)
- Request reason
- Timestamps (created, approved/declined)
- Approver/decliner information

## 📁 Files Modified

### Services

- ✅ `src/lib/firebase/customerApprovalService.js` (NEW)

### Components

- ✅ `src/components/pos/CustomersSection.jsx`
- ✅ `src/components/pos/SalesSection.jsx`

### Pages

- ✅ `src/app/admin/customers/page.js`
- ✅ `src/app/(pos)/sales/customers/page.js`

### Documentation

- ✅ `CUSTOMER_EXPIRY_SYSTEM.md` (NEW)
- ✅ `CUSTOMER_EXPIRY_IMPLEMENTATION.md` (THIS FILE)

## 🚀 Build Status

✅ **Build Successful** - All changes compile without errors

```
✓ Compiled successfully
✓ Generating static pages (36/36)
✓ Finalizing page optimization
```

## ⏭️ Next Steps (Not Yet Implemented)

### Admin Approval Page

**Status**: Not started
**Priority**: High

Need to create:

- Admin page to view pending expiry requests
- Approve/Decline buttons
- Request history view
- Integration with customer update on approval

**Suggested Location**: `/admin/customer-approvals`

**Features Needed**:

1. List pending requests with:

   - Customer name
   - Current vs requested expiry date
   - Requester (cashier) name
   - Request date
   - Action buttons (Approve/Decline)

2. Approve action:

   - Update request status to "approved"
   - Update customer's expiryDate
   - Show success message
   - Refresh list

3. Decline action:

   - Update request status to "declined"
   - Add decline reason
   - Show success message
   - Refresh list

4. History tab:
   - Show all approved/declined requests
   - Filter by date, customer, status
   - Audit trail

## 🧪 Testing Recommendations

### Admin Tests

```bash
# Test 1: Create customer with expiry
1. Go to Admin → Customers
2. Click "Add Customer"
3. Fill in details
4. Click "+10 Days" button
5. Save customer
6. Verify expiry date set immediately

# Test 2: Edit expiry date
1. Edit existing customer
2. Change expiry date
3. Save
4. Verify new date applied immediately
```

### Cashier Tests

```bash
# Test 1: Request expiry extension
1. Go to POS → Customers
2. Edit a customer
3. Click "+6 Months" button
4. Save
5. Verify message: "Expiry date change sent for admin approval"
6. Verify customer expiry NOT changed yet

# Test 2: Checkout validation
1. Add customer with expired membership to cart
2. Add items
3. Click Checkout
4. Verify error: "Customer membership has expired!"
```

### Checkout Tests

```bash
# Test 1: Expired customer
1. Create customer with expiry date = yesterday
2. Add to cart with items
3. Try checkout
4. Should be blocked with error

# Test 2: Expiring soon
1. Create customer with expiry date = 3 days from now
2. Add to cart with items
3. Click checkout
4. Should show warning but allow checkout
```

## 💡 Usage Examples

### Calculate Expiry Date

```javascript
import { customerApprovalService } from "@/lib/firebase/customerApprovalService";

// Get date 10 days from now
const expiry10Days = customerApprovalService.calculateExpiryDate("10days");
// Returns: "2024-12-01" (YYYY-MM-DD format)

// Get date 6 months from now
const expiry6Months = customerApprovalService.calculateExpiryDate("6months");
// Returns: "2025-05-21"
```

### Check Expiry Status

```javascript
// Check if customer is expired
const isExpired = customerApprovalService.isCustomerExpired(
  customer.expiryDate
);

// Check if expiring soon (within 7 days)
const expiringSoon = customerApprovalService.isExpiringSoon(
  customer.expiryDate
);

// Get full status object
const status = customerApprovalService.getExpiryStatus(customer.expiryDate);
// Returns: { status: "expiring", message: "Expires in 3 days", variant: "outline" }
```

### Create Approval Request (Cashier)

```javascript
await customerApprovalService.createExpiryRequest({
  customerId: customer.id,
  customerName: customer.name,
  currentExpiryDate: customer.expiryDate,
  newExpiryDate: "2024-12-31",
  requestedBy: cashier.id,
  requestedByName: cashier.name,
  reason: "Customer requested extension",
});
```

## 🎨 UI Screenshots

### Admin Customer Form

```
┌─────────────────────────────────────┐
│ Membership Expiry                    │
├─────────────────────────────────────┤
│ Expiry Date [Active ✓]              │
│ [2024-12-31_________________]       │
│                                      │
│ [Set +10 Days] [Set +6 Months]     │
│                                      │
│ ℹ️ Admin can set expiry dates       │
│   directly without approval          │
└─────────────────────────────────────┘
```

### Cashier Customer Form

```
┌─────────────────────────────────────┐
│ Membership Expiry                    │
├─────────────────────────────────────┤
│ Expiry Date [Expiring Soon ⚠️]      │
│ [2024-11-25_________________]       │
│                                      │
│ [+10 Days] [+6 Months]              │
│                                      │
│ ⚠️ Cashier changes require admin    │
│   approval before being applied      │
└─────────────────────────────────────┘
```

### Customer Card with Status

```
┌─────────────────────────────────────┐
│ 👤 John Doe                          │
│    [Kiosk] [⏰ Expiring Soon]       │
│    Code: CK-0001                     │
├─────────────────────────────────────┤
│ 📧 john@example.com                 │
│ 📞 +66812345678                      │
└─────────────────────────────────────┘
```

### Checkout Error

```
┌─────────────────────────────────────┐
│ ❌ Checkout Blocked                  │
├─────────────────────────────────────┤
│ Customer "John Doe" membership has   │
│ expired! Please extend the expiry    │
│ date before checkout.                │
│                                      │
│ [OK]                                 │
└─────────────────────────────────────┘
```

## 📝 Database Collections

### customers (existing, updated)

```javascript
{
  id: "cust_123",
  name: "John Doe",
  email: "john@example.com",
  expiryDate: "2024-12-31",  // NEW FIELD
  // ... other fields
}
```

### customer_expiry_requests (new)

```javascript
{
  id: "req_456",
  customerId: "cust_123",
  customerName: "John Doe",
  currentExpiryDate: "2024-11-21",
  newExpiryDate: "2024-12-01",
  requestedBy: "cashier_789",
  requestedByName: "Jane Smith",
  reason: "Customer requested extension",
  status: "pending",  // "pending" | "approved" | "declined"
  createdAt: Timestamp,
  updatedAt: Timestamp,
  // After approval:
  approvedBy: "admin_001",
  approvedByName: "Admin User",
  approvedAt: Timestamp
}
```

## 🔐 Security Considerations

1. **Admin Check**: Admin approval page should verify user role
2. **Cashier ID**: Get from authenticated session (localStorage or auth store)
3. **Audit Trail**: All changes logged with user information
4. **Validation**: Server-side validation recommended for expiry dates

## 📞 Support

For questions or issues:

1. Check `CUSTOMER_EXPIRY_SYSTEM.md` for detailed documentation
2. Review `customerApprovalService.js` for service functions
3. Check console for error messages
4. Verify Firebase Firestore rules allow read/write to `customer_expiry_requests`

---

**Implementation Date**: November 21, 2024
**Status**: ✅ Core features complete, Admin approval page pending
**Build Status**: ✅ Successful
**Next Priority**: Create admin approval page
