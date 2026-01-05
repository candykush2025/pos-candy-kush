# Customer Form Structure Update

## Overview

Updated the customer form in `CustomersSection.jsx` to match the exact Firebase database schema. This ensures data integrity and prevents issues with missing or mismatched fields.

## Changes Made

### 1. Removed Non-Existent Fields

The following fields were removed as they don't exist in the Firebase database:

- ❌ `customerCode` (replaced with `customerId`)
- ❌ `phone` (replaced with `cell`)
- ❌ `address`
- ❌ `city`
- ❌ `province`
- ❌ `postalCode`
- ❌ `country`
- ❌ `note`
- ❌ `visits` (replaced with `visitCount`)
- ❌ `lastVisit`

### 2. Added Firebase Database Fields

The following fields are now properly mapped:

- ✅ `name` - First name (required)
- ✅ `lastName` - Last name
- ✅ `nickname` - Nickname or preferred name
- ✅ `nationality` - Customer's nationality
- ✅ `dateOfBirth` - Date of birth (date input)
- ✅ `email` - Email address
- ✅ `cell` - Phone number (replaces `phone`)
- ✅ `customerId` - Unique customer ID (required, auto-generated)
- ✅ `memberId` - Member ID (defaults to customerId)
- ✅ `customPoints` - Initial points balance
- ✅ `isActive` - Active status (checkbox)
- ✅ `allowedCategories` - Array of allowed category IDs
- ✅ `points` - Array of point transactions
- ✅ `totalSpent` - Total amount spent
- ✅ `visitCount` - Number of visits
- ✅ `expiryDate` - Customer account expiry date

### 3. Form Structure Organization

The form is now organized into logical sections:

#### Personal Information

- First Name (required)
- Last Name
- Nickname
- Nationality
- Date of Birth

#### Contact Information

- Email
- Phone Number (cell)

#### Member Information

- Customer ID (required, auto-generated for new customers)
- Member ID (defaults to Customer ID)
- Initial Points
- Active Status

#### Kiosk Permissions

- Allowed Categories (multi-select)

#### Expiry Date Management

- Current Expiry Date display
- +10 Days / +6 Months buttons
- Status badges (Active/Expiring Soon/Expired)

### 4. Data Initialization

#### New Customer

```javascript
{
  name: "",
  lastName: "",
  nickname: "",
  nationality: "",
  dateOfBirth: "",
  email: "",
  cell: "",
  customerId: "CK-" + Date.now(), // Auto-generated
  memberId: "",                   // Will default to customerId
  customPoints: 0,
  isActive: true,
  allowedCategories: [],
  points: [],
  totalSpent: 0,
  visitCount: 0,
  expiryDate: "",
}
```

#### Editing Existing Customer

All fields are populated from the Firebase document, preserving:

- `customerId` (cannot be changed)
- `memberId` (defaults to customerId if empty)
- `points[]` array
- `totalSpent` value
- `visitCount` value
- All personal and contact information

### 5. Validation Updates

- Changed validation from `customerCode` to `customerId`
- Ensures `memberId` is set (defaults to `customerId` if empty)
- All required fields properly validated

### 6. Member ID Handling

- For new customers: `memberId` is automatically set to match `customerId` if left empty
- For existing customers: `memberId` is preserved from database
- User can override `memberId` manually if needed

## Firebase Schema Reference

```javascript
{
  allowedCategories: [],       // Array of category IDs
  cell: "+66812345678",        // Phone number
  createdAt: Timestamp,        // Auto-generated
  customPoints: 0,             // Initial points
  customerId: "CK-0001",       // Unique ID (required)
  dateOfBirth: "1990-01-01",   // Date string
  email: "john@example.com",   // Email address
  isActive: true,              // Active status
  lastName: "Doe",             // Last name
  memberId: "CK-0001",         // Member ID
  name: "John",                // First name (required)
  nationality: "Thai",         // Nationality
  nickname: "Johnny",          // Nickname
  points: [],                  // Points transaction array
  totalSpent: 0,               // Total amount spent
  updatedAt: Timestamp,        // Auto-generated
  visitCount: 0,               // Number of visits
  expiryDate: "2024-12-31",    // Expiry date (optional)
}
```

## Benefits

1. **Data Integrity**: Form fields now match database schema exactly
2. **No Data Loss**: All Firebase fields are properly handled
3. **Simplified Structure**: Removed unnecessary fields that weren't being stored
4. **Better Organization**: Form sections are logically grouped
5. **Consistent IDs**: `customerId` and `memberId` are properly managed
6. **Auto-generation**: New customers get automatic `CK-{timestamp}` IDs

## Testing Checklist

- [ ] Create new customer - verify all fields save correctly
- [ ] Edit existing customer - verify all fields populate and save
- [ ] Check Firebase console - verify data structure matches
- [ ] Verify `customerId` is required and unique
- [ ] Verify `memberId` defaults to `customerId` when empty
- [ ] Test expiry date functionality still works
- [ ] Verify allowed categories selection works
- [ ] Test active/inactive status toggle

## Related Files

- `src/components/pos/CustomersSection.jsx` - Main form component
- `src/lib/firebase/customersService.js` - Customer CRUD operations
- `src/lib/firebase/customerApprovalService.js` - Expiry date logic

## Next Steps

1. Test creating a new customer in the POS system
2. Verify data structure in Firebase console
3. Test editing an existing customer
4. Update admin customer page to match this structure (if needed)
5. Update cashier customer page to match this structure (if needed)
