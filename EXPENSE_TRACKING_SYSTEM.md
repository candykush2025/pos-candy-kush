# Expense Edit and Delete Tracking System

## Overview

Comprehensive expense tracking system that records all edits and uses soft delete to ensure data integrity and recoverability.

## Features Implemented

### 1. **Edit Tracking with Full History**

- Every edit to an expense is tracked with complete audit trail
- Records who edited, when, what changed, old values, and new values
- Edit history stored as array in expense document
- Prevents data loss and enables accountability

#### Tracked Fields:

- `description` - Expense description
- `amount` - Expense amount
- `date` - Expense date
- `time` - Expense time
- `category` - Expense category
- `currency` - Expense currency
- `notes` - Additional notes

#### Edit History Structure:

```javascript
{
  timestamp: "2026-01-11T10:30:00.000Z",
  editedBy: "user_uid",
  editedByName: "John Doe",
  changes: ["amount", "description"],
  oldValues: {
    amount: 100.00,
    description: "Office supplies"
  },
  newValues: {
    amount: 150.00,
    description: "Office supplies and equipment"
  }
}
```

### 2. **Soft Delete System**

- Expenses are NEVER deleted from database
- Delete operation flags expense as deleted instead of removing it
- All original data preserved for recovery
- Tracks who deleted and when

#### Delete Flag Structure:

```javascript
{
  isDeleted: true,
  deletedAt: "2026-01-11T10:30:00.000Z",
  deletedBy: "user_uid",
  deletedByName: "Admin User"
}
```

### 3. **UI Features**

#### Clickable Table Rows

- Click any expense row to open edit dialog
- Smart click handling ignores button and badge clicks

#### Action Buttons

Each expense row has three action buttons:

1. **Edit (✏️)** - Open edit dialog to modify expense
2. **History (🕐)** - View complete edit history (shown only if edits exist)
3. **Delete (🗑️)** - Soft delete with confirmation

#### Edit Dialog

- Pre-filled with current expense data
- Validates all fields before submission
- Shows success/error messages
- Automatically tracks changes and updates history

#### History Dialog

- Shows complete edit history timeline
- Displays old → new value changes
- Color-coded (red for old, green for new)
- Includes editor name and timestamp
- Formatted for easy readability

#### Delete Confirmation Dialog

- Shows expense details before deletion
- Explains soft delete mechanism
- Confirms deletion intent
- Prevents accidental deletions

### 4. **API Enhancements**

#### Edit Expense API (`/api/mobile?action=edit-expense`)

**Required Parameters:**

```javascript
{
  id: "expense_id",              // Required
  editedBy: "user_uid",          // Required for tracking
  editedByName: "User Name",     // Required for tracking
  // Only include fields you want to change:
  description: "New description",
  amount: 150.00,
  category: "Office",
  currency: "THB",
  notes: "Updated notes",
  date: "2026-01-11",
  time: "10:30"
}
```

**Response:**

```javascript
{
  success: true,
  action: "edit-expense",
  data: {
    expense: {
      id: "expense_id",
      // ... updated expense data
      editHistory: [...],
      lastEditedAt: "2026-01-11T10:30:00.000Z",
      lastEditedBy: "user_uid",
      lastEditedByName: "User Name"
    }
  }
}
```

**Features:**

- Validates all changes before applying
- Only tracks actual changes (ignores unchanged fields)
- Prevents editing of deleted expenses
- Returns detailed error messages
- Automatically creates edit history entry

#### Delete Expense API (`/api/mobile?action=delete-expense`)

**Required Parameters:**

```javascript
{
  id: "expense_id",              // Required
  deletedBy: "user_uid",         // Required for tracking
  deletedByName: "User Name"     // Required for tracking
}
```

**Response:**

```javascript
{
  success: true,
  action: "delete-expense",
  message: "Expense marked as deleted successfully"
}
```

**Features:**

- Soft delete only - never removes from database
- Prevents double deletion
- Tracks deletion metadata
- All original data preserved

#### Get Expenses API (`/api/mobile?action=get-expenses`)

**Updated Behavior:**

- Automatically filters out deleted expenses by default
- Add `includeDeleted=true` parameter to include deleted expenses

**Example:**

```javascript
// Normal request - excludes deleted expenses
GET /api/mobile?action=get-expenses

// Include deleted expenses for recovery/audit
GET /api/mobile?action=get-expenses&includeDeleted=true
```

### 5. **Data Structure Updates**

#### Expense Document Schema:

```javascript
{
  // Original fields
  id: string,
  description: string,
  amount: number,
  currency: string,
  category: string,
  date: string,
  time: string,
  status: "pending" | "approved" | "denied",
  employeeId: string,
  employeeName: string,
  source: "POS" | "BackOffice",
  notes: string,
  createdAt: timestamp,
  createdBy: string,
  createdByName: string,

  // Edit tracking fields
  lastEditedAt?: timestamp,
  lastEditedBy?: string,
  lastEditedByName?: string,
  editHistory?: [{
    timestamp: timestamp,
    editedBy: string,
    editedByName: string,
    changes: string[],
    oldValues: object,
    newValues: object
  }],

  // Soft delete fields
  isDeleted?: boolean,
  deletedAt?: timestamp,
  deletedBy?: string,
  deletedByName?: string
}
```

## Security Features

1. **Required Authentication**

   - All edit/delete operations require JWT token
   - User identity tracked for all changes

2. **Permission Checks**

   - Only admins can edit approved/denied expenses
   - Employees can only edit pending expenses

3. **Data Validation**

   - All fields validated before saving
   - Empty descriptions rejected
   - Negative amounts rejected
   - Required fields enforced

4. **Error Handling**
   - Detailed error messages
   - Transaction rollback on failure
   - Console logging for debugging

## Usage Examples

### Frontend - Edit Expense

```javascript
const updateExpense = async (expenseId, updates) => {
  const response = await fetch("/api/mobile?action=edit-expense", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: expenseId,
      ...updates,
      editedBy: user.uid,
      editedByName: user.displayName,
    }),
  });

  const data = await response.json();
  if (data.success) {
    console.log("Updated expense:", data.data.expense);
    console.log("Edit history:", data.data.expense.editHistory);
  }
};
```

### Frontend - Delete Expense

```javascript
const deleteExpense = async (expenseId) => {
  const response = await fetch("/api/mobile?action=delete-expense", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: expenseId,
      deletedBy: user.uid,
      deletedByName: user.displayName,
    }),
  });

  const data = await response.json();
  if (data.success) {
    console.log("Expense soft deleted");
  }
};
```

### Mobile App Integration

```kotlin
// Android example
fun editExpense(expenseId: String, updates: Map<String, Any>) {
    val request = JSONObject().apply {
        put("id", expenseId)
        put("editedBy", currentUser.uid)
        put("editedByName", currentUser.displayName)
        updates.forEach { (key, value) -> put(key, value) }
    }

    apiService.post(
        "/api/mobile?action=edit-expense",
        request,
        onSuccess = { response ->
            // Handle success
            val editHistory = response.getJSONArray("editHistory")
            showEditSuccess(editHistory.length())
        },
        onError = { error ->
            // Handle error
            showError(error.message)
        }
    )
}

fun deleteExpense(expenseId: String) {
    val request = JSONObject().apply {
        put("id", expenseId)
        put("deletedBy", currentUser.uid)
        put("deletedByName", currentUser.displayName)
    }

    apiService.post(
        "/api/mobile?action=delete-expense",
        request,
        onSuccess = {
            showMessage("Expense deleted (soft delete - data preserved)")
        },
        onError = { error ->
            showError(error.message)
        }
    )
}
```

## Benefits

1. **Data Integrity**

   - No data loss from edits or deletes
   - Complete audit trail
   - Easy data recovery

2. **Accountability**

   - Every change tracked with user identity
   - Timestamp for all modifications
   - Transparent change history

3. **Compliance**

   - Meets audit requirements
   - Regulatory compliance ready
   - Forensic analysis capable

4. **User Experience**

   - Click-to-edit convenience
   - Visual history timeline
   - Confirmation dialogs prevent mistakes

5. **Developer Friendly**
   - Clear API documentation
   - Consistent error handling
   - Easy integration

## Testing Checklist

- [x] Build successful
- [ ] Edit expense via table click
- [ ] Edit expense via edit button
- [ ] View edit history
- [ ] Delete expense with confirmation
- [ ] Verify soft delete (data still in database)
- [ ] Check deleted expenses don't appear in normal list
- [ ] Verify category inline edit with tracking
- [ ] Test mobile API edit endpoint
- [ ] Test mobile API delete endpoint
- [ ] Verify edit history format
- [ ] Test permission checks
- [ ] Verify validation errors

## Future Enhancements

1. **Restore Deleted Expenses**

   - Admin panel to view deleted expenses
   - One-click restore functionality

2. **Advanced History**

   - Diff view for changes
   - Revert to previous version
   - Compare multiple versions

3. **Notifications**

   - Email on edits
   - Slack/Discord integration
   - Real-time updates

4. **Bulk Operations**

   - Bulk edit with tracking
   - Bulk delete
   - Bulk restore

5. **Export & Reports**
   - Export edit history
   - Audit reports
   - Change analytics

## Files Modified

1. **API Backend**

   - `src/app/api/mobile/route.js`
     - Enhanced `editExpense()` function
     - Updated `deleteExpense()` function
     - Modified `getExpenses()` function
     - Updated endpoint handlers

2. **Frontend**
   - `src/app/admin/expenses/page.js`
     - Added clickable table rows
     - Added action buttons
     - Created edit dialog
     - Created history dialog
     - Created delete confirmation dialog
     - Updated handlers with tracking
     - Added new state variables

## Notes

- **IMPORTANT**: Delete is SOFT DELETE only - never removes from database
- Edit history array can grow large - consider pagination for very old expenses
- Always include `editedBy` and `editedByName` in edit requests
- Always include `deletedBy` and `deletedByName` in delete requests
- Deleted expenses are hidden by default but can be retrieved with `includeDeleted=true`

## Support

For issues or questions:

1. Check console logs for detailed errors
2. Verify JWT token is valid
3. Ensure all required fields are provided
4. Check Firestore rules for permissions
5. Review API documentation above
