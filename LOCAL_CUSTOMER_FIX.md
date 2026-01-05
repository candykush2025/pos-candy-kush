# Local Customer Sync Fix

## Problem

Customers created from the admin page or POS were not showing up in the cashier sales section, even though they appeared in the admin customer management page.

## Root Cause Analysis

### Issue 1: Admin Not Saving to Firebase

- **Admin page** was only saving customers to **IndexedDB** (`dbService.upsertCustomers`)
- **POS/Cashier** was loading customers from **Firebase** (`customersService.getAll`)
- Result: Customers created in admin were invisible to cashier

### Issue 2: Missing Source Field in POS

- **POS CustomersSection** was creating customers without the `source: "local"` field
- Customers created in POS had no source identification

### Issue 3: Inconsistent Source Naming

- Admin was using `source: "admin"` instead of `source: "local"`
- Should use "local" for all customers created within the POS/admin system

## Data Flow Before Fix

```
Admin Creates Customer:
Admin → IndexedDB ONLY → ❌ Not in Firebase → ❌ Not visible in Cashier

POS Creates Customer:
POS → Firebase → IndexedDB sync → ✅ Visible in Cashier

Cashier Loads Customers:
Cashier → Firebase (when online) → Only sees POS-created customers
```

## Data Flow After Fix

```
Admin Creates Customer:
Admin → Firebase + IndexedDB → ✅ Visible everywhere

POS Creates Customer:
POS → Firebase (with source: "local") → ✅ Visible everywhere

Cashier Loads Customers:
Cashier → Firebase → All customers (Loyverse + Kiosk + Local)
```

## Changes Made

### 1. Admin Customer Page (`src/app/admin/customers/page.js`)

#### Change 1: Save to Both Firebase and IndexedDB

**Before:**

```javascript
if (editingCustomer) {
  await dbService.updateCustomer(editingCustomer.id, customerData);
  toast.success("Customer updated successfully");
} else {
  // Create new
  customerData.id = `cust_${Date.now()}`;
  customerData.createdAt = new Date().toISOString();
  // ... field setup
  await dbService.upsertCustomers([customerData]); // ❌ IndexedDB only
}
```

**After:**

```javascript
if (editingCustomer) {
  // Update both Firebase and IndexedDB
  await customersService.update(editingCustomer.id, customerData);
  await dbService.updateCustomer(editingCustomer.id, customerData);
  toast.success("Customer updated successfully");
} else {
  // Create new
  customerData.id = `cust_${Date.now()}`;
  customerData.createdAt = new Date().toISOString();
  // ... field setup

  // Save to both Firebase and IndexedDB
  await customersService.create(customerData); // ✅ Firebase
  await dbService.upsertCustomers([customerData]); // ✅ IndexedDB
}
```

#### Change 2: Fix Source Field

**Before:**

```javascript
source: editingCustomer?.source || "admin", // ❌ Wrong
```

**After:**

```javascript
source: editingCustomer?.source || "local", // ✅ Correct
```

**Comment Update:**

```javascript
// Source tracking - mark as "local" for customers created in admin/POS
source: editingCustomer?.source || "local",
```

### 2. POS Customers Section (`src/components/pos/CustomersSection.jsx`)

#### Add Source Field to New Customers

**Before:**

```javascript
} else {
  // Create new customer with cashier info
  const customerData = {
    ...formData,
    createdBy: cashier?.id || null,
    createdByName: cashier?.name || null,
  };
  await customersService.create(customerData);
  toast.success("Customer created successfully");
}
```

**After:**

```javascript
} else {
  // Create new customer with cashier info and source as "local"
  const customerData = {
    ...formData,
    source: "local", // ✅ Mark as locally created customer
    createdBy: cashier?.id || null,
    createdByName: cashier?.name || null,
  };
  await customersService.create(customerData);
  toast.success("Customer created successfully");
}
```

## Customer Source Types

| Source     | Description              | Created From                |
| ---------- | ------------------------ | --------------------------- |
| `loyverse` | Synced from Loyverse POS | External API                |
| `kiosk`    | Synced from Kiosk system | External API                |
| `local`    | Created in POS/Admin     | Admin or POS Customers page |

## Benefits

1. ✅ **Consistent Data**: All customers saved to both Firebase and IndexedDB
2. ✅ **Visible Everywhere**: Customers created in admin now appear in cashier
3. ✅ **Proper Source Tracking**: All local customers marked with `source: "local"`
4. ✅ **Offline Support**: IndexedDB sync maintains offline functionality
5. ✅ **Update Support**: Edits in admin update both Firebase and IndexedDB

## Testing Checklist

### Admin Page Tests

- [ ] Create new customer in admin
- [ ] Verify customer appears in admin list with "local" badge
- [ ] Verify customer saved to Firebase
- [ ] Verify customer saved to IndexedDB
- [ ] Refresh page and confirm customer still visible
- [ ] Edit existing customer
- [ ] Verify updates reflected in both Firebase and IndexedDB

### POS Customers Page Tests

- [ ] Create new customer in POS Customers section
- [ ] Verify `source: "local"` field is set
- [ ] Verify customer saved to Firebase
- [ ] Verify customer appears in POS customers list

### Cashier Sales Section Tests

- [ ] Open cashier sales page
- [ ] Click "Add Customer" button
- [ ] Verify all local customers appear in modal
- [ ] Verify customers show "local" badge (purple)
- [ ] Select a local customer
- [ ] Verify customer displays correctly in cart
- [ ] Test offline mode (disconnect internet)
- [ ] Verify local customers still load from IndexedDB

### Cross-System Tests

- [ ] Create customer in admin → Verify visible in cashier
- [ ] Create customer in POS → Verify visible in admin
- [ ] Create customer in POS → Verify visible in cashier
- [ ] Edit customer in admin → Verify changes in cashier
- [ ] Mix of Loyverse, Kiosk, and Local customers all visible

## Technical Notes

### Firebase Service Methods Used

```javascript
// Create
await customersService.create(customerData);

// Update
await customersService.update(customerId, customerData);

// Read All
const customers = await customersService.getAll({ orderBy: ["name", "asc"] });
```

### IndexedDB Service Methods Used

```javascript
// Create/Update (upsert)
await dbService.upsertCustomers([customerData]);

// Update
await dbService.updateCustomer(customerId, customerData);

// Read All
const customers = await dbService.getAllCustomers();
```

### Customer Data Structure

```javascript
{
  id: string,
  customerId: string, // e.g., "CK-0001"
  source: "loyverse" | "kiosk" | "local",
  name: string,
  email: string,
  phone: string,
  customPoints: number,
  totalVisits: number,
  totalSpent: number,
  createdBy: string | null,
  createdByName: string | null,
  createdAt: string,
  updatedAt: string,
  // ... other fields
}
```

## Migration Notes

### Existing Customers Without Source

Customers created before this fix may not have a `source` field. They will:

- Display without a source badge in the UI
- Be treated as legacy customers
- Can be updated to add the `source: "local"` field if needed

### Manual Migration (Optional)

If you want to update existing customers to have the `source` field:

```javascript
// In browser console or migration script
const customers = await customersService.getAll();
for (const customer of customers) {
  if (!customer.source) {
    await customersService.update(customer.id, {
      ...customer,
      source: "local", // or determine based on other fields
    });
  }
}
```

## Related Files Modified

1. `src/app/admin/customers/page.js` - Admin customer management
2. `src/components/pos/CustomersSection.jsx` - POS customer creation
3. `src/components/pos/SalesSection.jsx` - Already correctly loads from Firebase (no changes needed)

## Summary

The fix ensures that all customers, regardless of where they are created (admin or POS), are saved to Firebase and properly tagged with `source: "local"`. This makes them visible across all parts of the system including the cashier sales section.
