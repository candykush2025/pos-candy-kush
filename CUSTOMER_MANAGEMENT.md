# Customer Management - Admin Panel

## Overview

Complete customer management system in the admin panel for viewing, creating, editing, and managing store customers.

## Location

**Admin → Customers**

Access the customer management page from the admin sidebar navigation.

## Features

### 📊 Dashboard Statistics

Four key metrics displayed at the top:

- **Total Customers** - Total number of customers in database
- **Synced from Loyverse** - Customers imported from Loyverse POS
- **Local Customers** - Customers created locally
- **Total Spent** - Cumulative spending across all customers

### 🔍 Search & Filter

- Real-time search across multiple fields:
  - Customer name
  - Email address
  - Phone number
  - Customer code
- Instant filtering as you type

### 👥 Customer List View

Each customer card displays:

- **Profile**: Name and customer code
- **Source Badge**: "Loyverse" or "Local" indicator
- **Contact Info**: Email, phone, location (city/province)
- **Statistics**:
  - Total visits
  - Total amount spent
  - Loyalty points balance
- **Action Buttons**: View, Edit, Delete

### ➕ Add New Customer

Create local customer records with:

- **Required**: Customer name
- **Optional**:
  - Customer code (auto-generated if blank)
  - Email address
  - Phone number
  - Full address (street, city, state, postal code, country)
  - Notes

### ✏️ Edit Customer

- Update customer information
- All fields editable except:
  - Customer ID
  - Visit statistics (managed by system)
  - Spending data (managed by system)
- **Note**: Cannot delete Loyverse-synced customers (only edit)

### 👁️ View Customer Details

Comprehensive customer profile modal showing:

**Customer Info**

- Name and customer code
- Source badge

**Contact Information**

- Email address
- Phone number

**Address**

- Street address
- City, state, postal code
- Country

**Statistics Cards**

- Total visits
- Total spent
- Loyalty points

**Visit History**

- First visit date
- Last visit date

**Notes**

- Custom notes about customer

**Record Information**

- Created timestamp
- Last updated timestamp

### 🗑️ Delete Customer

- Delete local customers permanently
- **Protected**: Cannot delete Loyverse-synced customers
- Confirmation dialog prevents accidental deletion

## Customer Data Structure

```javascript
{
  // Identity
  id: "cust_1697123456789",
  name: "John Doe",
  customerCode: "CUST-12345678",

  // Contact
  email: "john@example.com",
  phone: "+1 (555) 123-4567",

  // Address
  address: "123 Main Street",
  city: "New York",
  province: "NY",
  postalCode: "10001",
  countryCode: "US",

  // Notes
  note: "VIP customer, prefers email contact",

  // Statistics (managed by system)
  totalVisits: 15,
  totalSpent: 450.75,
  totalPoints: 225,
  firstVisit: "2024-01-15T10:30:00Z",
  lastVisit: "2024-10-12T14:20:00Z",

  // Metadata
  source: "local" | "loyverse",
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-10-12T14:25:00Z"
}
```

## Integration with Loyverse

### Syncing Customers

1. Go to **Admin → Integration**
2. Click **"Sync Customers"** button
3. All Loyverse customers imported to local database
4. Customers marked with `source: "loyverse"`

### Synced Customer Features

- **Read-only deletion**: Cannot delete synced customers
- **Editable**: Can edit contact info and notes
- **Badge**: Shows "Loyverse" source badge
- **Statistics**: Includes visit and spending data from Loyverse

### Data Source Priority

- **Loyverse customers**: Sync from Loyverse API
- **Local customers**: Created directly in admin panel
- Both types visible in same list with source badges

## Usage Examples

### Add a New Customer

1. Click **"Add Customer"** button
2. Fill in customer name (required)
3. Add optional contact and address details
4. Add notes if needed
5. Click **"Create Customer"**
6. Customer code auto-generated (e.g., CUST-12345678)

### Search for Customer

1. Type in search box
2. Search works across:
   - Name: "John Doe"
   - Email: "john@example.com"
   - Phone: "555-123-4567"
   - Code: "CUST-12345678"
3. Results filter instantly

### View Customer History

1. Click **"View"** button on customer card
2. See complete profile with:
   - Contact information
   - Address details
   - Visit history
   - Spending statistics
   - Loyalty points
3. Click **"Edit Customer"** to make changes

### Edit Customer Information

1. Click **Edit** button (pencil icon)
2. Update any field
3. Click **"Update Customer"**
4. Changes saved to database

### Delete Local Customer

1. Click **Delete** button (trash icon)
2. Confirm deletion in dialog
3. Customer removed from database
4. **Note**: Synced customers cannot be deleted (button disabled)

## Statistics Tracking

### Visit Count

- Incremented each time customer makes a purchase
- Displayed in customer card and detail view
- Tracks customer engagement

### Total Spent

- Sum of all completed orders
- Formatted as currency
- Displayed in green with dollar icon

### Loyalty Points

- Accumulated reward points
- Based on spending or promotions
- Displayed with award icon
- Only shown if points > 0

### Visit Dates

- **First Visit**: Date of first purchase
- **Last Visit**: Date of most recent purchase
- Helps identify active vs. inactive customers

## Database Methods

### Available in `dbService.js`:

```javascript
// Get all customers or search
await dbService.getCustomers(searchQuery);

// Bulk insert/update customers (for Loyverse sync)
await dbService.upsertCustomers([customer1, customer2]);

// Update single customer
await dbService.updateCustomer(customerId, {
  email: "newemail@example.com",
  phone: "+1 555-999-8888",
});

// Delete customer
await dbService.deleteCustomer(customerId);
```

## UI Components

### Customer Card

- Responsive layout with customer info
- Icon-based contact details
- Statistics badges
- Action buttons (View, Edit, Delete)
- Hover effect for better UX

### Statistics Cards

- Color-coded icons:
  - Blue: User/Visits
  - Green: Money/Spending
  - Purple: Points/Loyalty
- Large numbers for visibility
- Descriptive labels

### Search Bar

- Search icon on left
- Placeholder text guides usage
- Real-time filtering
- No submit required

### Modals

- **Add/Edit Form**: Two-column layout for efficiency
- **Detail View**: Organized sections for readability
- **Scrollable**: Handles long content
- **Responsive**: Works on all screen sizes

## Permissions & Security

### Admin-Only Access

- Only users with `role: "admin"` can access
- Redirects non-admin users
- Protected by authentication middleware

### Data Protection

- Loyverse customers protected from deletion
- Confirmation dialogs prevent accidents
- Validation on all form inputs

### Source Tracking

- Every customer tagged with source
- Prevents data conflicts
- Enables proper sync handling

## Best Practices

### When to Create Local Customers

- Walk-in customers not in Loyverse
- Quick checkout without full Loyverse sync
- Testing or demo purposes
- Offline scenarios

### When to Use Loyverse Sync

- Store uses Loyverse POS system
- Need complete customer history
- Want visit and spending data
- Managing loyalty programs

### Customer Code Format

- Auto-generated: `CUST-12345678` (timestamp-based)
- Custom: Any format (e.g., "VIP-001", "GOLD-123")
- Unique identifier for each customer
- Useful for printed receipts or cards

### Data Maintenance

- Regular syncs from Loyverse keep data fresh
- Edit local customers as needed
- Use notes field for important info
- Archive or delete outdated local customers

## Troubleshooting

### No Customers Showing

**Problem**: List is empty
**Solution**:

- Check if any customers created
- Try syncing from Loyverse (Integration page)
- Add first customer manually

### Cannot Delete Customer

**Problem**: Delete button disabled
**Solution**:

- Customer synced from Loyverse (protected)
- Can only delete local customers
- Edit instead of delete

### Search Not Working

**Problem**: Results don't update
**Solution**:

- Clear search box and try again
- Refresh page
- Check console for errors

### Statistics Not Updating

**Problem**: Visit/spend data incorrect
**Solution**:

- Statistics managed by order system
- Re-sync from Loyverse for accurate data
- Local customers: stats update with each order

## Future Enhancements

Potential additions:

- [ ] Customer purchase history table
- [ ] Export customer list to CSV
- [ ] Send email/SMS to customers
- [ ] Customer segments/groups
- [ ] Advanced filtering (by spending, visits, date)
- [ ] Customer import from CSV
- [ ] Merge duplicate customers
- [ ] Customer tags/labels
- [ ] Birthday tracking and reminders
- [ ] Custom fields for customer data

## Related Features

- **POS → Customers Section**: Customer selection during checkout
- **Admin → Integration**: Sync customers from Loyverse
- **Admin → Orders**: View orders by customer
- **History Section**: Filter by customer name

## Summary

The Customer Management page provides:
✅ Complete CRUD operations for customers
✅ Search and filtering capabilities  
✅ Detailed customer profiles
✅ Visit and spending statistics
✅ Integration with Loyverse POS
✅ Source tracking (Local vs. Loyverse)
✅ Protected deletion for synced data
✅ Clean, responsive UI with modal forms

Perfect for managing both locally-created customers and those synced from Loyverse!
