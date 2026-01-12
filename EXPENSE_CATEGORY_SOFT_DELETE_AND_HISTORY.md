# Expense Category Soft Delete & Edit History System

**Complete Guide for Soft Delete and Change Tracking**

**Last Updated:** January 12, 2026
**API Version:** 2.3
**Feature:** Soft Delete + Edit History

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Soft Delete System](#soft-delete-system)
3. [Edit History Tracking](#edit-history-tracking)
4. [API Endpoints](#api-endpoints)
5. [Database Structure](#database-structure)
6. [Usage Examples](#usage-examples)
7. [Frontend Integration](#frontend-integration)

---

## Overview

The expense category system now implements **soft delete** and **edit history tracking** to preserve data integrity and provide complete audit trails.

### Key Features

- ✅ **Soft Delete**: Categories are flagged as deleted but remain in database
- ✅ **Data Integrity**: Expenses continue to reference deleted categories
- ✅ **Edit History**: Complete audit trail of all changes
- ✅ **Restore Capability**: Deleted categories can be restored
- ✅ **Change Tracking**: Know who changed what and when
- ✅ **Automatic History**: Every edit/delete/restore is logged automatically

---

## Soft Delete System

### How It Works

When a category is "deleted":

1. The `active` field is set to `false`
2. A `deletedAt` timestamp is added
3. A `deletedBy` field records who deleted it
4. The category remains in the database
5. Expenses using this category are unaffected
6. A history entry is created for the deletion

### Benefits

- **Data Preservation**: Never lose historical data
- **Referential Integrity**: Expenses maintain their category relationships
- **Reporting**: Historical reports remain accurate
- **Compliance**: Audit trail for regulatory requirements
- **Reversibility**: Mistakes can be undone

---

## Edit History Tracking

### What Gets Tracked

Every time a category is modified, the system logs:

- **Timestamp**: Exact date/time of change
- **Action**: Type of change (edit, delete, restore)
- **Changed By**: User who made the change
- **Changes**: What fields changed and their before/after values
- **Notes**: Additional context for the change

### History Entry Structure

```json
{
  "id": "history_entry_id",
  "timestamp": "2026-01-12T10:00:00.000Z",
  "action": "edit",
  "changedBy": "admin@candykush.com",
  "changes": {
    "name": {
      "from": "Office Supplies",
      "to": "Office Equipment"
    },
    "description": {
      "from": "General office supplies",
      "to": "Office equipment and supplies"
    }
  },
  "note": "Updated category name and description for clarity"
}
```

### Tracked Actions

- **`edit`**: Category details were modified
- **`delete`**: Category was soft deleted
- **`restore`**: Category was restored from deleted state

---

## API Endpoints

### 1. Delete Category (Soft Delete)

**Endpoint:** `POST /api/mobile?action=delete-expense-category`

**Headers:**

```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**

```json
{
  "id": "category_id_here",
  "deletedBy": "admin@candykush.com"
}
```

**Response:**

```json
{
  "success": true,
  "action": "delete-expense-category",
  "message": "Category deleted successfully (soft delete - data preserved)"
}
```

**Notes:**

- Category is flagged as `active: false`
- Original data remains in database
- Expenses using this category are not affected
- `deletedBy` is optional (defaults to authenticated user or "system")

---

### 2. Get Category History

**Endpoint:** `POST /api/mobile?action=get-expense-category-history`

**Headers:**

```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**

```json
{
  "id": "category_id_here"
}
```

**Response:**

```json
{
  "success": true,
  "action": "get-expense-category-history",
  "data": {
    "category": {
      "id": "category_001",
      "name": "Office Supplies",
      "description": "General office supplies",
      "active": true,
      "createdAt": "2026-01-01T10:00:00.000Z",
      "updatedAt": "2026-01-12T10:00:00.000Z",
      "deletedAt": null
    },
    "history": [
      {
        "id": "history_003",
        "timestamp": "2026-01-12T10:00:00.000Z",
        "action": "edit",
        "changedBy": "admin@candykush.com",
        "changes": {
          "description": {
            "from": "Office supplies",
            "to": "General office supplies"
          }
        }
      },
      {
        "id": "history_002",
        "timestamp": "2026-01-10T14:30:00.000Z",
        "action": "edit",
        "changedBy": "admin@candykush.com",
        "changes": {
          "name": {
            "from": "Supplies",
            "to": "Office Supplies"
          }
        }
      },
      {
        "id": "history_001",
        "timestamp": "2026-01-01T10:00:00.000Z",
        "action": "create",
        "changedBy": "admin@candykush.com"
      }
    ]
  }
}
```

---

### 3. Restore Deleted Category

**Endpoint:** `POST /api/mobile?action=restore-expense-category`

**Headers:**

```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**

```json
{
  "id": "category_id_here",
  "restoredBy": "admin@candykush.com"
}
```

**Response:**

```json
{
  "success": true,
  "action": "restore-expense-category",
  "data": {
    "category": {
      "id": "category_001",
      "name": "Office Supplies",
      "description": "General office supplies",
      "active": true,
      "createdAt": "2026-01-01T10:00:00.000Z",
      "updatedAt": "2026-01-12T15:00:00.000Z"
    }
  }
}
```

**Notes:**

- Category's `active` field is set to `true`
- A `restoredAt` timestamp is added
- A history entry is created for the restoration
- `restoredBy` is optional (defaults to authenticated user or "system")

---

### 4. Edit Category (with History Tracking)

**Endpoint:** `POST /api/mobile?action=edit-expense-category`

**Headers:**

```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**

```json
{
  "id": "category_id_here",
  "name": "Updated Category Name",
  "description": "Updated description",
  "changedBy": "admin@candykush.com"
}
```

**Response:**

```json
{
  "success": true,
  "action": "edit-expense-category",
  "message": "Expense category updated successfully",
  "data": {
    "id": "category_001",
    "name": "Updated Category Name",
    "description": "Updated description",
    "active": true,
    "createdAt": "2026-01-01T10:00:00.000Z",
    "updatedAt": "2026-01-12T10:00:00.000Z"
  }
}
```

**Notes:**

- Only changed fields are tracked in history
- If no changes are detected, no history entry is created
- `changedBy` is optional (defaults to authenticated user or "system")

---

## Database Structure

### Main Collection: `expense_categories`

```javascript
{
  id: "category_001",
  name: "Office Supplies",
  description: "General office supplies",
  active: true,               // false when soft deleted
  createdAt: Timestamp,
  updatedAt: Timestamp,
  deletedAt: Timestamp,       // null if not deleted
  deletedBy: "user@email.com", // who deleted it
  restoredAt: Timestamp,      // null if never restored
  restoredBy: "user@email.com" // who restored it
}
```

### Subcollection: `expense_categories/{categoryId}/history`

```javascript
{
  id: "history_001",
  timestamp: Timestamp,
  action: "edit",             // "edit", "delete", "restore"
  changedBy: "user@email.com",
  changes: {
    name: {
      from: "Old Name",
      to: "New Name"
    },
    description: {
      from: "Old Description",
      to: "New Description"
    },
    active: {
      from: true,
      to: false
    }
  },
  note: "Optional note about the change"
}
```

---

## Usage Examples

### JavaScript/Frontend Example

```javascript
// 1. Soft delete a category
async function deleteCategory(categoryId) {
  const response = await fetch(
    "https://pos-candy-kush.vercel.app/api/mobile?action=delete-expense-category",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: categoryId,
        deletedBy: "admin@candykush.com",
      }),
    }
  );

  const data = await response.json();
  console.log(data.message); // "Category deleted successfully (soft delete - data preserved)"
}

// 2. Get category edit history
async function getCategoryHistory(categoryId) {
  const response = await fetch(
    "https://pos-candy-kush.vercel.app/api/mobile?action=get-expense-category-history",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: categoryId,
      }),
    }
  );

  const data = await response.json();
  return data.data; // { category: {...}, history: [...] }
}

// 3. Restore a deleted category
async function restoreCategory(categoryId) {
  const response = await fetch(
    "https://pos-candy-kush.vercel.app/api/mobile?action=restore-expense-category",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: categoryId,
        restoredBy: "admin@candykush.com",
      }),
    }
  );

  const data = await response.json();
  return data.data.category;
}

// 4. Edit category (with automatic history tracking)
async function editCategory(categoryId, updates) {
  const response = await fetch(
    "https://pos-candy-kush.vercel.app/api/mobile?action=edit-expense-category",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: categoryId,
        ...updates,
        changedBy: "admin@candykush.com",
      }),
    }
  );

  const data = await response.json();
  return data.data;
}
```

---

## Frontend Integration

### Show Active Categories Only

```javascript
// When fetching categories for dropdown/list
const categories = await getExpenseCategories();
const activeCategories = categories.filter((cat) => cat.active !== false);
```

### Show Deleted Categories Separately

```javascript
// Display deleted categories in a separate "Deleted Categories" section
const allCategories = await getExpenseCategories();
const activeCategories = allCategories.filter((cat) => cat.active !== false);
const deletedCategories = allCategories.filter((cat) => cat.active === false);

// UI Example:
// Active Categories (5)
// - Office Supplies
// - Travel
// - Marketing
//
// Deleted Categories (2) [Expand to show]
// - Old Category Name (deleted on Jan 10, 2026) [Restore]
// - Another Old Category (deleted on Dec 15, 2025) [Restore]
```

### Display Category History

```javascript
async function showCategoryHistory(categoryId) {
  const { category, history } = await getCategoryHistory(categoryId);

  console.log(`History for: ${category.name}`);
  console.log(`Current Status: ${category.active ? "Active" : "Deleted"}`);
  console.log("\nChange Log:");

  history.forEach((entry) => {
    console.log(`\n${entry.timestamp}`);
    console.log(`Action: ${entry.action}`);
    console.log(`By: ${entry.changedBy}`);

    if (entry.changes) {
      Object.keys(entry.changes).forEach((field) => {
        const change = entry.changes[field];
        console.log(`  ${field}: "${change.from}" → "${change.to}"`);
      });
    }
  });
}

// Output example:
// History for: Office Supplies
// Current Status: Active
//
// Change Log:
//
// 2026-01-12T10:00:00.000Z
// Action: edit
// By: admin@candykush.com
//   description: "Office supplies" → "General office supplies"
//
// 2026-01-10T14:30:00.000Z
// Action: edit
// By: admin@candykush.com
//   name: "Supplies" → "Office Supplies"
```

### Confirm Before Deleting

```javascript
async function handleDeleteCategory(categoryId, categoryName) {
  const confirmed = confirm(
    `Delete category "${categoryName}"?\n\n` +
      "This is a soft delete - the category will be hidden but data will be preserved.\n" +
      "Expenses using this category will not be affected.\n" +
      "You can restore it later if needed."
  );

  if (confirmed) {
    await deleteCategory(categoryId);
    alert("Category deleted successfully (data preserved)");
  }
}
```

---

## Benefits Summary

### For Data Integrity

- ✅ Expenses never lose their category reference
- ✅ Historical reports remain accurate
- ✅ Database relationships maintained
- ✅ No orphaned records

### For Auditing

- ✅ Complete audit trail of all changes
- ✅ Know who changed what and when
- ✅ Compliance with financial regulations
- ✅ Accountability for all actions

### For Users

- ✅ Undo mistakes by restoring categories
- ✅ Hide unused categories without losing data
- ✅ Track category evolution over time
- ✅ Transparency in data management

### For Developers

- ✅ Automatic history tracking (no manual logging)
- ✅ Consistent data structure
- ✅ Easy to implement in UI
- ✅ Query-friendly subcollection structure

---

## Testing Checklist

- [ ] Create a new category
- [ ] Edit category name (verify history entry created)
- [ ] Edit category description (verify history entry created)
- [ ] Soft delete category (verify `active: false`, history entry created)
- [ ] Verify deleted category still appears in database
- [ ] Create expense using deleted category (should work)
- [ ] Fetch category history (verify all changes are logged)
- [ ] Restore deleted category (verify `active: true`, history entry created)
- [ ] Edit restored category (verify history continues)
- [ ] Filter active vs deleted categories in UI

---

## Migration Notes

If you have existing categories in production:

1. **Existing categories** will automatically have `active: true` (default behavior)
2. **No history entries** for past changes (history starts from now)
3. **No breaking changes** - all existing code continues to work
4. **Gradual adoption** - you can implement history UI features incrementally

---

**For additional support or questions, refer to the main API documentation or contact the development team.**
