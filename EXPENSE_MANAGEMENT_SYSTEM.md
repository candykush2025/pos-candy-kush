# 💰 Expense Management System - Complete Implementation

## 📋 Overview

A unified expense management system that allows employees (cashiers) to submit expenses, managers to approve/deny them, and provides analytics in the dashboard. All platforms (cashier POS, admin web, mobile) share the same database.

## ✅ What's Been Implemented

### 1. **Database Schema** ✅

**Firestore Collection: `expenses`**

```javascript
{
  id: "auto-generated",
  description: "Office supplies - printer paper",
  amount: 45.50,
  date: "2026-01-06",
  time: "14:30",
  category: "Office Supplies",
  employeeId: "emp_001",
  employeeName: "John Doe",
  status: "pending", // pending, approved, denied
  approvedBy: "admin_001",
  approvedByName: "Jane Manager",
  approvedAt: "2026-01-06T15:00:00Z",
  approvalNotes: "Approved for Q1 budget",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 2. **API Endpoints** ✅

**File:** `src/app/api/mobile/route.js`

#### GET Endpoints

- **`GET /api/mobile?action=get-expenses`**
  - Get all expenses with optional filters
  - Query params:
    - `start_date` (optional): Filter by start date
    - `end_date` (optional): Filter by end date
    - `status` (optional): pending, approved, denied
    - `category` (optional): Filter by category
    - `employeeId` (optional): Filter by employee
  
  ```bash
  curl "http://localhost:3000/api/mobile?action=get-expenses&status=pending"
  ```

- **`GET /api/mobile?action=get-expense&id={expenseId}`**
  - Get single expense by ID
  
  ```bash
  curl "http://localhost:3000/api/mobile?action=get-expense&id=exp_123"
  ```

#### POST Endpoints

- **`POST /api/mobile?action=create-expense`**
  - Create a new expense (status: pending)
  
  ```json
  {
    "description": "Office supplies",
    "amount": 45.50,
    "date": "2026-01-06",
    "time": "14:30",
    "category": "Office Supplies",
    "employeeId": "emp_001",
    "employeeName": "John Doe"
  }
  ```

- **`POST /api/mobile?action=edit-expense`**
  - Edit pending expense (only if status is pending)
  
  ```json
  {
    "id": "exp_123",
    "description": "Updated description",
    "amount": 50.00,
    "category": "General"
  }
  ```

- **`POST /api/mobile?action=approve-expense`**
  - Approve an expense (admin/manager only)
  
  ```json
  {
    "expenseId": "exp_123",
    "approvedBy": "admin_001",
    "approvedByName": "Jane Manager",
    "notes": "Approved for Q1 budget"
  }
  ```

- **`POST /api/mobile?action=deny-expense`**
  - Deny an expense (admin/manager only)
  
  ```json
  {
    "expenseId": "exp_123",
    "deniedBy": "admin_001",
    "deniedByName": "Jane Manager",
    "notes": "Exceeds budget limit"
  }
  ```

- **`POST /api/mobile?action=delete-expense`**
  - Delete an expense
  
  ```json
  {
    "id": "exp_123"
  }
  ```

#### DELETE Endpoints

- **`DELETE /api/mobile?action=delete-expense&id={expenseId}`**
  - RESTful delete method

### 3. **Cashier Interface** ✅

**File:** `src/components/pos/ExpensesSection.jsx`

**Access:** POS → Expenses tab (sidebar navigation)

**Features:**
- ✅ Add new expense with form
  - Description (required)
  - Amount (required)
  - Category (dropdown)
  - Auto-fills employee info and timestamp
- ✅ View all expenses submitted by logged-in cashier
- ✅ Status badges (Pending, Approved, Denied)
- ✅ Summary statistics:
  - Total expenses
  - Pending count
  - Approved count
  - Denied count
  - Total approved amount
- ✅ Approval notes display
- ✅ Real-time updates

**Categories:**
- General
- Office Supplies
- Utilities
- Maintenance
- Transportation
- Food & Beverage
- Marketing
- Equipment
- Cleaning Supplies
- Other

### 4. **Admin Interface** ✅

**File:** `src/app/admin/expenses/page.js`

**Access:** Admin → Expenses (sidebar navigation)

**Features:**
- ✅ View all expenses from all employees
- ✅ Filter by:
  - Status (All, Pending, Approved, Denied)
  - Category
- ✅ Summary statistics:
  - Total expenses
  - Pending count
  - Approved count
  - Denied count
  - Total approved amount
  - Total pending amount
- ✅ Approve expenses with optional notes
- ✅ Deny expenses with optional notes
- ✅ View employee name, date, time, amount, category
- ✅ View who approved/denied and when
- ✅ Table view with sorting
- ✅ Real-time refresh

**Approval Dialog:**
- Shows expense details
- Employee name
- Amount
- Description
- Category
- Date/Time
- Optional notes field
- Confirm/Cancel buttons

### 5. **Mobile Support** 🔄 (Ready for Implementation)

**Planned Features:**
- All endpoints are mobile-ready
- Same API endpoints work for mobile
- Mobile can approve/deny expenses (managers only)
- Mobile can view and submit expenses
- Real-time sync with Firebase

## 🔧 Integration Points

### Cashier POS
```javascript
// File: src/app/(pos)/sales/page.js
// Tab: "expenses"
// Component: ExpensesSection
{activeTab === "expenses" && <ExpensesSection cashier={cashier} />}
```

### Admin Panel
```javascript
// File: src/app/admin/layout.js
// Navigation: desktopNavigation
{ name: "Expenses", href: "/admin/expenses", icon: FileText }
```

### API Route
```javascript
// File: src/app/api/mobile/route.js
// Actions: get-expenses, get-expense, create-expense, edit-expense, 
//          delete-expense, approve-expense, deny-expense
```

## 📊 Response Formats

### Get Expenses Response
```json
{
  "success": true,
  "action": "get-expenses",
  "generated_at": "2026-01-06T15:00:00Z",
  "data": {
    "expenses": [
      {
        "id": "exp_123",
        "description": "Office supplies",
        "amount": 45.50,
        "date": "2026-01-06",
        "time": "14:30",
        "category": "Office Supplies",
        "status": "approved",
        "employeeId": "emp_001",
        "employeeName": "John Doe",
        "approvedBy": "admin_001",
        "approvedByName": "Jane Manager",
        "approvedAt": "2026-01-06T15:00:00Z",
        "approvalNotes": "Approved",
        "createdAt": "2026-01-06T14:30:00Z"
      }
    ],
    "total": 45.50,
    "pendingTotal": 0,
    "count": 1,
    "pendingCount": 0,
    "approvedCount": 1,
    "deniedCount": 0
  }
}
```

### Create Expense Response
```json
{
  "success": true,
  "action": "create-expense",
  "data": {
    "expense": {
      "id": "exp_123",
      "description": "Office supplies",
      "amount": 45.50,
      "date": "2026-01-06",
      "time": "14:30",
      "category": "Office Supplies",
      "status": "pending",
      "employeeId": "emp_001",
      "employeeName": "John Doe",
      "approvedBy": null,
      "approvedByName": null,
      "approvedAt": null,
      "approvalNotes": null
    }
  }
}
```

### Approve/Deny Response
```json
{
  "success": true,
  "action": "approve-expense",
  "data": {
    "expense": {
      "id": "exp_123",
      "status": "approved",
      "approvedBy": "admin_001",
      "approvedByName": "Jane Manager",
      "approvedAt": "2026-01-06T15:00:00Z",
      "approvalNotes": "Approved for Q1 budget"
    }
  },
  "message": "Expense approved successfully"
}
```

## 🔒 Security & Permissions

### Cashier Permissions
- ✅ Create expense (own expenses)
- ✅ View own expenses
- ✅ Edit pending expenses (own only)
- ❌ Approve/deny expenses
- ❌ View other employees' expenses

### Admin/Manager Permissions
- ✅ View all expenses
- ✅ Filter by employee, status, category
- ✅ Approve expenses
- ✅ Deny expenses
- ✅ Add notes to approvals/denials
- ✅ Delete expenses

## 🚀 Testing the System

### 1. Test Expense Submission (Cashier)

1. Log in as cashier
2. Navigate to POS → Expenses tab
3. Click "Add Expense"
4. Fill in:
   - Description: "Office supplies - paper"
   - Amount: 50.00
   - Category: Office Supplies
5. Submit
6. Verify expense appears as "Pending"

### 2. Test Approval (Admin)

1. Log in as admin
2. Navigate to Admin → Expenses
3. Find the pending expense
4. Click approve button (green checkmark)
5. Add optional notes
6. Confirm approval
7. Verify status changes to "Approved"

### 3. Test Denial (Admin)

1. Create another expense as cashier
2. Log in as admin
3. Click deny button (red X)
4. Add reason: "Exceeds budget"
5. Confirm denial
6. Verify status changes to "Denied"

### 4. Test Filters

1. In admin panel, test filters:
   - Status: Pending, Approved, Denied
   - Category: Office Supplies, etc.
2. Verify filtering works correctly

### 5. Test Statistics

1. Verify summary cards show correct counts:
   - Total expenses
   - Pending count
   - Approved count
   - Denied count
   - Total approved amount
   - Total pending amount

## 📱 Next Steps (Mobile Implementation)

### Planned Features

1. **Mobile Expense List**
   - Use same API endpoints
   - Display expenses in mobile-friendly cards
   - Pull-to-refresh functionality

2. **Mobile Approval Interface**
   - Manager role check
   - Swipe actions for approve/deny
   - Quick approval dialog

3. **Mobile Submission Form**
   - Camera integration for receipts
   - Location tagging (optional)
   - Voice-to-text for description

### Mobile API Usage Example

```javascript
// Fetch expenses
const response = await fetch(
  'https://your-domain.com/api/mobile?action=get-expenses&status=pending'
);
const data = await response.json();

// Approve expense
await fetch('https://your-domain.com/api/mobile?action=approve-expense', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    expenseId: 'exp_123',
    approvedBy: userId,
    approvedByName: userName,
    notes: 'Approved'
  })
});
```

## 🎯 Dashboard Integration (Planned)

### Expense Analytics Widget

**File:** `src/app/admin/dashboard/page.js` (to be added)

**Features:**
- Total expenses this month/week/day
- Expense breakdown by category (pie chart)
- Pending approvals count (alert badge)
- Top 5 expense categories
- Expense trend line chart
- Quick approve pending button

## 📝 Database Queries

### Common Queries

```javascript
// Get all pending expenses
const pendingExpenses = expenses.filter(e => e.status === 'pending');

// Get expenses by employee
const employeeExpenses = expenses.filter(e => e.employeeId === 'emp_001');

// Get expenses by date range
const rangeExpenses = expenses.filter(e => {
  const expenseDate = new Date(e.date);
  return expenseDate >= startDate && expenseDate <= endDate;
});

// Calculate total approved expenses
const totalApproved = expenses
  .filter(e => e.status === 'approved')
  .reduce((sum, e) => sum + e.amount, 0);

// Get expenses by category
const categoryExpenses = expenses.filter(e => e.category === 'Office Supplies');
```

## 🐛 Known Issues & Limitations

1. **No bulk approval** - Each expense must be approved individually
2. **No receipt attachments** - Future feature
3. **No expense limits** - No automatic checks for budget limits
4. **No recurring expenses** - Must be entered manually each time

## 🎨 UI Components Used

- `Button` - Action buttons
- `Input` - Text and number inputs
- `Select` - Dropdown selects
- `Badge` - Status badges
- `Card` - Container cards
- `Dialog` - Modal dialogs
- `Table` - Data tables
- `Textarea` - Multi-line text input
- `Label` - Form labels

## 📚 Related Files

### Core Files
- `src/app/api/mobile/route.js` - API endpoints
- `src/lib/firebase/firestore.js` - Database service
- `src/components/pos/ExpensesSection.jsx` - Cashier UI
- `src/app/admin/expenses/page.js` - Admin UI
- `src/app/(pos)/layout.js` - POS navigation
- `src/app/admin/layout.js` - Admin navigation

### Helper Files
- `src/lib/utils/format.js` - Currency formatting
- `src/store/useAuthStore.js` - Authentication state

## 🔄 Workflow Summary

```
┌─────────────┐
│   Cashier   │
│  Submits    │
│  Expense    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Status:   │
│   PENDING   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Admin/Manager│
│   Reviews   │
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
   ▼       ▼
┌────┐   ┌────┐
│APPR│   │DENY│
│OVED│   │IED │
└────┘   └────┘
   │       │
   └───┬───┘
       │
       ▼
┌─────────────┐
│  Dashboard  │
│  Analytics  │
└─────────────┘
```

## ✅ Checklist

- [x] Database schema designed
- [x] API endpoints created
- [x] Cashier submission form
- [x] Cashier expense list
- [x] Admin approval interface
- [x] Admin filtering
- [x] Status badges
- [x] Approval/denial with notes
- [x] Statistics summaries
- [x] Navigation integration
- [ ] Mobile implementation
- [ ] Dashboard widgets
- [ ] Reports/exports
- [ ] Receipt attachments
- [ ] Notifications

## 🎉 Ready for Production

The expense management system is now fully functional for:
- ✅ Cashiers to submit expenses
- ✅ Admins to approve/deny expenses
- ✅ Real-time status tracking
- ✅ Filtering and searching
- ✅ Unified database across all platforms

**Next Steps:** Implement mobile views and dashboard analytics.
