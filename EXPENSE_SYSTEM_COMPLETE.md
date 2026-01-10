# Complete Expense Management System Documentation

**Comprehensive guide covering authentication, multi-currency support, metadata tracking, filtering, and API integration for the POS expense management system.**

---

## 📑 Table of Contents

1. [System Overview](#system-overview)
2. [Authentication & Permissions](#authentication--permissions)
3. [Multi-Currency Support](#multi-currency-support)
4. [Expense Features](#expense-features)
5. [Advanced Filtering & Search](#advanced-filtering--search)
6. [POS Interface](#pos-interface)
7. [Admin Panel](#admin-panel)
8. [API Integration](#api-integration)
9. [Android Implementation](#android-implementation)
10. [Database Schema](#database-schema)
11. [Testing Guide](#testing-guide)
12. [Deployment](#deployment)

---

## 🌟 System Overview

### Purpose
Complete expense management system with approval workflow, multi-currency support, enhanced metadata tracking, and advanced filtering capabilities.

### Key Features
- ✅ **Multi-currency support** - 15 major currencies (USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR, MXN, BRL, ZAR, SGD, HKD, SEK)
- ✅ **Role-based access control** - Employees can create, admins can approve/deny
- ✅ **Internal notes** - Employee and admin notes for context
- ✅ **Source tracking** - POS, Android, or BackOffice origin
- ✅ **Advanced filtering** - Search, category, currency, source filters
- ✅ **Approval workflow** - Pending → Approved/Denied with notes
- ✅ **Real-time updates** - Firestore synchronization
- ✅ **Metadata tracking** - Complete audit trail (who, when, where, why)

### Technology Stack
- **Frontend**: Next.js 16.0.7, React, shadcn/ui components
- **Backend**: Next.js API routes, Firestore
- **Authentication**: JWT tokens with role-based permissions
- **State Management**: Zustand
- **Database**: Firebase Firestore
- **Styling**: Tailwind CSS

---

## 🔐 Authentication & Permissions

### Authentication Fix (Completed)

#### Problem Solved
Cashiers were getting "Admin access required" error when trying to access expense categories.

#### Root Causes
1. `authenticateRequest()` function required admin role for ALL requests (including GET)
2. Cashier login didn't generate JWT tokens

#### Solution Implemented

**File**: `/src/app/api/mobile/route.js`

```javascript
// Flexible authentication function
async function authenticateRequest(req, requireAdmin = false) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authorized: false, error: "Missing or invalid authorization header" };
  }

  const token = authHeader.substring(7);
  const decoded = jwtUtils.decode(token);
  
  if (!decoded || !decoded.userId) {
    return { authorized: false, error: "Invalid token" };
  }

  // Check admin requirement
  if (requireAdmin && decoded.role !== "admin") {
    return { authorized: false, error: "Admin access required" };
  }

  return { authorized: true, user: decoded };
}

// GET handler (employees can read)
if (req.method === "GET") {
  const auth = await authenticateRequest(req, false); // requireAdmin = false
  // ... handle GET requests
}

// POST handler (admin only for write operations)
if (req.method === "POST") {
  if (action === "create-expense-category" || action === "edit-expense-category") {
    const auth = await authenticateRequest(req, true); // requireAdmin = true
    // ... handle admin-only operations
  }
}
```

**File**: `/src/app/(pos)/sales/page.js`

```javascript
// Cashier login now generates JWT token
const handleCashierLogin = async () => {
  // ... existing login code
  
  // Generate JWT token for API calls
  setAuth({
    user: employee,
    token: jwtUtils.encode({
      userId: employee.id,
      email: employee.email,
      name: employee.name,
      role: employee.role || "cashier"
    })
  });
};
```

### Permission Matrix

| Action | Employee/Cashier | Admin |
|--------|------------------|-------|
| **Read Operations** | | |
| View expense categories | ✅ | ✅ |
| View own expenses | ✅ | ✅ |
| View all expenses | ❌ | ✅ |
| **Write Operations** | | |
| Create expense | ✅ | ✅ |
| Update pending expense (own) | ✅ | ✅ |
| Update any pending expense | ❌ | ✅ |
| Delete pending expense (own) | ✅ | ✅ |
| Delete any pending expense | ❌ | ✅ |
| **Approval Operations** | | |
| Approve expense | ❌ | ✅ |
| Deny expense | ❌ | ✅ |
| **Category Management** | | |
| Create category | ❌ | ✅ |
| Edit category | ❌ | ✅ |
| Delete category | ❌ | ✅ |

---

## 🌍 Multi-Currency Support

### Supported Currencies (15)

| Code | Symbol | Currency Name          | Region |
|------|--------|------------------------|--------|
| USD  | $      | United States Dollar   | North America |
| EUR  | €      | Euro                   | Europe |
| GBP  | £      | British Pound          | UK |
| JPY  | ¥      | Japanese Yen           | Asia |
| CAD  | C$     | Canadian Dollar        | North America |
| AUD  | A$     | Australian Dollar      | Oceania |
| CHF  | Fr     | Swiss Franc            | Europe |
| CNY  | ¥      | Chinese Yuan           | Asia |
| INR  | ₹      | Indian Rupee           | Asia |
| MXN  | $      | Mexican Peso           | Latin America |
| BRL  | R$     | Brazilian Real         | Latin America |
| ZAR  | R      | South African Rand     | Africa |
| SGD  | S$     | Singapore Dollar       | Asia |
| HKD  | HK$    | Hong Kong Dollar       | Asia |
| SEK  | kr     | Swedish Krona          | Europe |

### Currency Utilities

**File**: `/src/lib/constants/currencies.js`

```javascript
export const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "MXN", symbol: "$", name: "Mexican Peso" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" }
];

export const DEFAULT_CURRENCY = "USD";

export const getCurrencySymbol = (code) => {
  const currency = CURRENCIES.find(c => c.code === code);
  return currency ? currency.symbol : "$";
};

export const getCurrencyName = (code) => {
  const currency = CURRENCIES.find(c => c.code === code);
  return currency ? currency.name : "US Dollar";
};

export const formatAmountWithCurrency = (amount, currencyCode = "USD") => {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${Number(amount).toFixed(2)}`;
};
```

### Currency Features

1. **Default Currency**: USD (if not specified)
2. **Validation**: Only supported currencies accepted
3. **Display**: Amounts formatted with currency symbol
4. **Filtering**: Can filter expenses by currency
5. **Storage**: Stored in original currency (no auto-conversion)
6. **Backward Compatible**: Old expenses without currency default to USD

---

## 💼 Expense Features

### 1. Internal Notes

**Purpose**: Add context and documentation to expenses

**Types of Notes**:
- **Employee Notes**: Added when creating/editing expense
- **Approval Notes**: Added by admin when approving/denying

**Use Cases**:
- Project reference
- Budget code
- Justification
- Additional details
- Denial reasons

**Implementation**:
```javascript
// POS Form
{
  category: "Office Supplies",
  amount: 150.00,
  currency: "EUR",
  description: "Printer paper",
  notes: "Needed for Q1 project deliverables" // Internal notes
}

// Admin Approval
{
  approvalNotes: "Approved for project budget",
  approvedAt: "2024-01-15T16:00:00Z",
  approvedBy: "admin_123"
}
```

### 2. Source Tracking

**Purpose**: Identify where expense was created

**Sources**:
- **POS**: Created from POS sales page
- **Android**: Created from Android mobile app
- **BackOffice**: Created from admin panel

**Visual Distinction**:
- POS: Blue badge (primary)
- BackOffice: Gray badge (secondary)
- Android: Purple badge

**Auto-filled**: System determines source automatically

### 3. User Metadata

**Tracked Information**:
```javascript
{
  createdBy: "emp_123",           // User ID
  createdByName: "John Doe",      // Display name
  createdByRole: "cashier",       // User role
  source: "POS",                  // Origin
  
  // After approval
  approvedBy: "admin_456",
  approvedByName: "Admin User",
  approvedAt: "2024-01-15T16:00:00Z"
}
```

### 4. Status Workflow

```
┌──────────┐
│  Create  │ (Employee/Cashier)
└────┬─────┘
     │
     ▼
┌──────────┐
│ PENDING  │ (Can edit/delete)
└────┬─────┘
     │
     ├────────────┬────────────┐
     ▼            ▼            ▼
┌─────────┐  ┌─────────┐  ┌────────┐
│APPROVED │  │ DENIED  │  │ DELETE │
└─────────┘  └─────────┘  └────────┘
(Admin only) (Admin only) (Own only)
```

---

## 🔍 Advanced Filtering & Search

### Filter Capabilities

#### 1. Text Search
- **Fields searched**: Description, notes, employee name, approval notes
- **Case insensitive**: Matches regardless of case
- **Real-time**: Updates as you type
- **Location**: Available in both pending and approved tabs

**Example**:
```
Search: "office" → Matches:
- Description: "Office supplies"
- Notes: "For office renovation"
- Employee: "Office Manager"
```

#### 2. Category Filter
- **Options**: All categories + "All"
- **Dynamic**: Populated from active categories
- **Applies to**: Both pending and approved expenses

#### 3. Currency Filter
- **Options**: USD, EUR, GBP, JPY, CAD, AUD + "All"
- **Default**: "All" (shows all currencies)
- **Use case**: Find expenses in specific currency

#### 4. Source Filter
- **Options**: POS, BackOffice, Android + "All"
- **Use case**: Audit expenses by origin
- **Visual**: Matches source badges

#### 5. Status Filter (Approved Tab)
- **Options**: All, Approved, Denied
- **Use case**: View only approved or only denied

### Filter Implementation

**File**: `/src/app/admin/expenses/page.js`

```javascript
// Filter pending expenses
const filteredPendingExpenses = pendingExpenses.filter((expense) => {
  // Category filter
  if (categoryFilter !== "all" && expense.category !== categoryFilter) return false;
  
  // Currency filter
  if (currencyFilter !== "all" && (expense.currency || "USD") !== currencyFilter) return false;
  
  // Source filter
  if (sourceFilter !== "all" && (expense.source || "BackOffice") !== sourceFilter) return false;
  
  // Search query
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    const matchesDescription = expense.description?.toLowerCase().includes(query);
    const matchesNotes = expense.notes?.toLowerCase().includes(query);
    const matchesEmployee = expense.employeeName?.toLowerCase().includes(query);
    if (!matchesDescription && !matchesNotes && !matchesEmployee) return false;
  }
  
  return true;
});

// Filter approved/denied expenses
const filteredApprovedExpenses = approvedExpenses.filter((expense) => {
  if (filter !== "all" && expense.status !== filter) return false;
  if (categoryFilter !== "all" && expense.category !== categoryFilter) return false;
  if (currencyFilter !== "all" && (expense.currency || "USD") !== currencyFilter) return false;
  if (sourceFilter !== "all" && (expense.source || "BackOffice") !== sourceFilter) return false;
  
  // Search includes approval notes for approved expenses
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    const matchesDescription = expense.description?.toLowerCase().includes(query);
    const matchesNotes = expense.notes?.toLowerCase().includes(query);
    const matchesEmployee = expense.employeeName?.toLowerCase().includes(query);
    const matchesApprovalNotes = expense.approvalNotes?.toLowerCase().includes(query);
    if (!matchesDescription && !matchesNotes && !matchesEmployee && !matchesApprovalNotes) return false;
  }
  
  return true;
});
```

### Filter UI

```jsx
{/* Filter Controls */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
  {/* Search */}
  <div className="lg:col-span-2">
    <Input
      placeholder="Search description, notes, or employee..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
  </div>
  
  {/* Category Filter */}
  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
    <SelectTrigger>
      <SelectValue placeholder="All Categories" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Categories</SelectItem>
      {categories.map((cat) => (
        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
  
  {/* Currency Filter */}
  <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
    <SelectTrigger>
      <SelectValue placeholder="All Currencies" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Currencies</SelectItem>
      <SelectItem value="USD">USD</SelectItem>
      <SelectItem value="EUR">EUR</SelectItem>
      <SelectItem value="GBP">GBP</SelectItem>
      {/* ... more currencies */}
    </SelectContent>
  </Select>
  
  {/* Source Filter */}
  <Select value={sourceFilter} onValueChange={setSourceFilter}>
    <SelectTrigger>
      <SelectValue placeholder="All Sources" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Sources</SelectItem>
      <SelectItem value="POS">POS</SelectItem>
      <SelectItem value="BackOffice">BackOffice</SelectItem>
      <SelectItem value="Android">Android</SelectItem>
    </SelectContent>
  </Select>
</div>
```

---

## 📱 POS Interface

### Expense Form

**Location**: POS Sales Page → Expenses Tab

**File**: `/src/components/pos/ExpensesSection.jsx`

**Features**:
- Currency selector (15 currencies)
- Notes textarea (optional)
- Dynamic category dropdown
- Amount validation
- Real-time expense list

**Form Fields**:
```jsx
<Select value={formData.category}>
  {/* Categories */}
</Select>

<Input 
  type="number" 
  value={formData.amount}
  placeholder="0.00"
/>

<Select value={formData.currency}>
  {CURRENCIES.map((currency) => (
    <SelectItem value={currency.code}>
      {currency.symbol} {currency.code} - {currency.name}
    </SelectItem>
  ))}
</Select>

<Input 
  value={formData.description}
  placeholder="What was this expense for?"
/>

<Textarea
  value={formData.notes}
  placeholder="Add internal notes (optional)"
  rows={3}
/>

<Button onClick={handleSubmit}>
  Submit Expense
</Button>
```

### Expense Display

**Layout**:
```
┌─────────────────────────────────────┐
│ 📅 Jan 15, 2024 at 14:30           │
│ 💰 €150.00                         │
│ 🏷️ Office Supplies [EUR] [POS]     │
│ 📝 Printer paper and supplies      │
│ 💬 Note: Needed for Q1 project     │
│ ✅ Status: Pending Approval        │
└─────────────────────────────────────┘
```

**Implementation**:
```jsx
{recentExpenses.map((expense) => (
  <Card key={expense.id}>
    <CardContent className="p-4">
      {/* Date */}
      <div className="text-sm text-gray-500">
        {format(new Date(expense.date), "MMM dd, yyyy")} at {expense.time}
      </div>
      
      {/* Amount with currency */}
      <div className="text-2xl font-bold mt-2">
        {formatAmountWithCurrency(expense.amount, expense.currency)}
      </div>
      
      {/* Category and badges */}
      <div className="flex gap-2 mt-2">
        <Badge variant="outline">{expense.category}</Badge>
        <Badge variant="secondary">{expense.currency || "USD"}</Badge>
        <Badge variant={expense.source === 'POS' ? 'default' : 'secondary'}>
          {expense.source || 'BackOffice'}
        </Badge>
      </div>
      
      {/* Description */}
      <p className="mt-2 text-sm">{expense.description}</p>
      
      {/* Notes */}
      {expense.notes && (
        <p className="mt-1 text-xs text-gray-500">
          Note: {expense.notes}
        </p>
      )}
      
      {/* Status */}
      <div className="mt-2">
        {getStatusBadge(expense.status)}
      </div>
      
      {/* Approval notes (if any) */}
      {expense.approvalNotes && (
        <p className="mt-2 text-xs text-blue-600">
          Admin: {expense.approvalNotes}
        </p>
      )}
    </CardContent>
  </Card>
))}
```

---

## 👨‍💼 Admin Panel

### Pending Expenses Tab

**Features**:
- Real-time filters (search, category, currency, source)
- Approve/Deny actions
- Source badges
- Currency display
- Notes inline
- Quick approval dialog

**Table Layout**:
```
┌────────┬──────────┬─────────────┬──────────┬────────┬─────────┬─────────┬─────────┐
│ Date   │ Employee │ Description │ Category │ Source │ Amount  │ Status  │ Actions │
├────────┼──────────┼─────────────┼──────────┼────────┼─────────┼─────────┼─────────┤
│ Jan 15 │ John Doe │ Office      │ Office   │ [POS]  │ €150.00 │ Pending │ ✓ ✗     │
│        │          │ supplies    │ Supplies │  blue  │ € EUR   │         │         │
│        │          │ Note: Need  │          │        │         │         │         │
└────────┴──────────┴─────────────┴──────────┴────────┴─────────┴─────────┴─────────┘
```

**Approval Dialog**:
```jsx
<Dialog open={showApprovalDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>
        {approvalAction === "approve" ? "Approve" : "Deny"} Expense
      </DialogTitle>
    </DialogHeader>
    
    {selectedExpense && (
      <div className="space-y-4">
        {/* Expense Summary */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-gray-500">Employee:</span>
              <p className="font-medium">{selectedExpense.employeeName}</p>
            </div>
            <div>
              <span className="text-gray-500">Amount:</span>
              <p className="font-bold text-lg">
                {formatAmountWithCurrency(selectedExpense.amount, selectedExpense.currency)}
              </p>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">Description:</span>
              <p>{selectedExpense.description}</p>
            </div>
            {selectedExpense.notes && (
              <div className="col-span-2">
                <span className="text-gray-500">Employee Notes:</span>
                <p className="text-sm">{selectedExpense.notes}</p>
              </div>
            )}
            <div>
              <span className="text-gray-500">Category:</span>
              <p>{selectedExpense.category}</p>
            </div>
            <div>
              <span className="text-gray-500">Source:</span>
              <Badge variant={selectedExpense.source === 'POS' ? 'default' : 'secondary'}>
                {selectedExpense.source || 'BackOffice'}
              </Badge>
            </div>
            <div>
              <span className="text-gray-500">Date:</span>
              <p>{format(new Date(selectedExpense.date), "MMM dd, yyyy")}</p>
            </div>
            {selectedExpense.currency && selectedExpense.currency !== 'USD' && (
              <div>
                <span className="text-gray-500">Currency:</span>
                <p>{getCurrencySymbol(selectedExpense.currency)} {selectedExpense.currency}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Admin Notes */}
        <div>
          <Label>Notes {approvalAction === "deny" && "(Optional)"}</Label>
          <Textarea
            placeholder={
              approvalAction === "approve"
                ? "Add any notes about this approval..."
                : "Provide a reason for denial..."
            }
            value={approvalNotes}
            onChange={(e) => setApprovalNotes(e.target.value)}
            rows={3}
          />
        </div>
        
        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={submitApproval}
            variant={approvalAction === "approve" ? "default" : "destructive"}
          >
            {approvalAction === "approve" ? "Approve" : "Deny"} Expense
          </Button>
        </div>
      </div>
    )}
  </DialogContent>
</Dialog>
```

### Approved/Denied Tab

**Features**:
- Status filter (All/Approved/Denied)
- All filters from pending tab
- Approval information
- Admin notes display
- Complete audit trail

**Additional Columns**:
- Approved By
- Processed Date
- Approval Notes (inline in description)

---

## 📡 API Integration

### Base URL
```
https://your-domain.com/api/mobile
```

### Authentication
All endpoints require JWT token:
```http
Authorization: Bearer <JWT_TOKEN>
```

### Endpoints

#### 1. Get Expense Categories
```http
GET /api/mobile?action=get-expense-categories
Authorization: Bearer <TOKEN>
```

**Response**:
```json
{
  "success": true,
  "categories": [
    {
      "id": "cat_1",
      "name": "Office Supplies",
      "description": "Office equipment and supplies",
      "active": true,
      "createdAt": "2024-01-01T10:00:00Z"
    }
  ]
}
```

**Permission**: All authenticated users

---

#### 2. Create Expense
```http
POST /api/mobile?action=create-expense
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "category": "Office Supplies",
  "amount": 150.50,
  "currency": "EUR",
  "description": "Printer paper and toner",
  "notes": "Needed for Q1 project deliverables"
}
```

**Required Fields**:
- `category` (string): Must match existing category
- `amount` (number): Must be > 0
- `description` (string): Non-empty

**Optional Fields**:
- `currency` (string): 3-letter code, defaults to "USD"
- `notes` (string): Internal notes

**Auto-filled Fields**:
- `source`: "POS", "Android", or "BackOffice" (determined by system)
- `createdBy`: User ID from JWT
- `createdByName`: User name from JWT
- `createdByRole`: User role from JWT
- `status`: "pending"
- `date`: Current date (YYYY-MM-DD)
- `time`: Current time (HH:MM)
- `createdAt`: ISO timestamp

**Response**:
```json
{
  "success": true,
  "expense": {
    "id": "exp_abc123",
    "amount": 150.50,
    "currency": "EUR",
    "description": "Printer paper and toner",
    "notes": "Needed for Q1 project deliverables",
    "category": "Office Supplies",
    "source": "Android",
    "createdBy": "emp_123",
    "createdByName": "John Doe",
    "createdByRole": "cashier",
    "status": "pending",
    "date": "2024-01-15",
    "time": "14:30",
    "createdAt": "2024-01-15T14:30:00Z"
  }
}
```

**Permission**: All authenticated users

---

#### 3. Get Expenses (with filtering)
```http
GET /api/mobile?action=get-expenses
    &status=pending
    &category=Office%20Supplies
    &currency=EUR
    &start_date=2024-01-01
    &end_date=2024-01-31
Authorization: Bearer <TOKEN>
```

**Query Parameters** (all optional):
- `status`: "pending", "approved", "denied", "all"
- `category`: Category name to filter
- `currency`: 3-letter currency code
- `start_date`: YYYY-MM-DD format
- `end_date`: YYYY-MM-DD format

**Response**:
```json
{
  "success": true,
  "expenses": [
    {
      "id": "exp_abc123",
      "amount": 150.50,
      "currency": "EUR",
      "description": "Printer paper and toner",
      "notes": "Needed for Q1 project deliverables",
      "category": "Office Supplies",
      "source": "Android",
      "createdBy": "emp_123",
      "createdByName": "John Doe",
      "createdByRole": "cashier",
      "status": "approved",
      "date": "2024-01-15",
      "time": "14:30",
      "approvedAt": "2024-01-15T16:00:00Z",
      "approvedBy": "admin_456",
      "approvedByName": "Admin User",
      "approvalNotes": "Approved for project budget"
    }
  ]
}
```

**Permission**: All authenticated users (see own expenses), Admin (see all)

---

#### 4. Update Expense
```http
PUT /api/mobile?action=update-expense
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "expenseId": "exp_abc123",
  "category": "Office Supplies",
  "amount": 175.00,
  "currency": "USD",
  "description": "Updated description",
  "notes": "Updated notes"
}
```

**Constraints**:
- Only **pending** expenses can be updated
- Must be expense creator or admin

**Response**: Same as create expense

**Permission**: Creator or Admin (pending only)

---

#### 5. Delete Expense
```http
DELETE /api/mobile?action=delete-expense
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "expenseId": "exp_abc123"
}
```

**Constraints**:
- Only **pending** expenses can be deleted
- Must be expense creator or admin

**Response**:
```json
{
  "success": true,
  "message": "Expense deleted successfully"
}
```

**Permission**: Creator or Admin (pending only)

---

## 📱 Android Implementation

### Data Models

```kotlin
data class Expense(
    val id: String,
    val amount: Double,
    val currency: String = "USD",
    val description: String,
    val notes: String? = null,
    val category: String,
    val source: String = "Android",
    val createdBy: String,
    val createdByName: String,
    val createdByRole: String,
    val status: ExpenseStatus,
    val date: String,
    val time: String,
    val createdAt: String,
    
    // Approval fields
    val approvedAt: String? = null,
    val approvedBy: String? = null,
    val approvedByName: String? = null,
    val approvalNotes: String? = null
)

enum class ExpenseStatus {
    PENDING, APPROVED, DENIED
}

data class Currency(
    val code: String,
    val symbol: String,
    val name: String
)

object Currencies {
    val ALL = listOf(
        Currency("USD", "$", "US Dollar"),
        Currency("EUR", "€", "Euro"),
        Currency("GBP", "£", "British Pound"),
        Currency("JPY", "¥", "Japanese Yen"),
        Currency("CAD", "C$", "Canadian Dollar"),
        Currency("AUD", "A$", "Australian Dollar"),
        Currency("CHF", "Fr", "Swiss Franc"),
        Currency("CNY", "¥", "Chinese Yuan"),
        Currency("INR", "₹", "Indian Rupee"),
        Currency("MXN", "$", "Mexican Peso"),
        Currency("BRL", "R$", "Brazilian Real"),
        Currency("ZAR", "R", "South African Rand"),
        Currency("SGD", "S$", "Singapore Dollar"),
        Currency("HKD", "HK$", "Hong Kong Dollar"),
        Currency("SEK", "kr", "Swedish Krona")
    )
    
    val DEFAULT = ALL.first { it.code == "USD" }
    
    fun getByCode(code: String) = ALL.find { it.code == code }
    fun getSymbol(code: String) = getByCode(code)?.symbol ?: "$"
}
```

### API Service

```kotlin
class ExpenseApiService(private val apiClient: ApiClient) {
    
    suspend fun getCategories(): Result<List<ExpenseCategory>> {
        return apiClient.get("/api/mobile?action=get-expense-categories")
    }
    
    suspend fun createExpense(
        category: String,
        amount: Double,
        currency: String,
        description: String,
        notes: String?
    ): Result<Expense> {
        val request = JSONObject().apply {
            put("category", category)
            put("amount", amount)
            put("currency", currency)
            put("description", description)
            notes?.let { put("notes", it) }
        }
        
        return apiClient.post(
            endpoint = "/api/mobile?action=create-expense",
            body = request
        )
    }
    
    suspend fun getExpenses(
        status: String? = null,
        category: String? = null,
        currency: String? = null,
        startDate: String? = null,
        endDate: String? = null
    ): Result<List<Expense>> {
        val params = buildString {
            append("action=get-expenses")
            status?.let { append("&status=$it") }
            category?.let { append("&category=$it") }
            currency?.let { append("&currency=$it") }
            startDate?.let { append("&start_date=$it") }
            endDate?.let { append("&end_date=$it") }
        }
        
        return apiClient.get("/api/mobile?$params")
    }
    
    suspend fun updateExpense(
        expenseId: String,
        category: String,
        amount: Double,
        currency: String,
        description: String,
        notes: String?
    ): Result<Expense> {
        val request = JSONObject().apply {
            put("expenseId", expenseId)
            put("category", category)
            put("amount", amount)
            put("currency", currency)
            put("description", description)
            notes?.let { put("notes", it) }
        }
        
        return apiClient.put(
            endpoint = "/api/mobile?action=update-expense",
            body = request
        )
    }
    
    suspend fun deleteExpense(expenseId: String): Result<Unit> {
        val request = JSONObject().apply {
            put("expenseId", expenseId)
        }
        
        return apiClient.delete(
            endpoint = "/api/mobile?action=delete-expense",
            body = request
        )
    }
}
```

### UI Components (Jetpack Compose)

```kotlin
@Composable
fun ExpenseFormScreen(
    categories: List<ExpenseCategory>,
    onSubmit: (category: String, amount: Double, currency: String, description: String, notes: String?) -> Unit
) {
    var selectedCategory by remember { mutableStateOf(categories.firstOrNull()) }
    var amount by remember { mutableStateOf("") }
    var selectedCurrency by remember { mutableStateOf(Currencies.DEFAULT) }
    var description by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Category Dropdown
        ExposedDropdownMenuBox(
            expanded = categoryExpanded,
            onExpandedChange = { categoryExpanded = !categoryExpanded }
        ) {
            OutlinedTextField(
                value = selectedCategory?.name ?: "",
                onValueChange = {},
                readOnly = true,
                label = { Text("Category") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(categoryExpanded) },
                modifier = Modifier.fillMaxWidth()
            )
            ExposedDropdownMenu(
                expanded = categoryExpanded,
                onDismissRequest = { categoryExpanded = false }
            ) {
                categories.forEach { category ->
                    DropdownMenuItem(
                        text = { Text(category.name) },
                        onClick = {
                            selectedCategory = category
                            categoryExpanded = false
                        }
                    )
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Amount Input
        OutlinedTextField(
            value = amount,
            onValueChange = { amount = it },
            label = { Text("Amount") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            leadingIcon = { Text(selectedCurrency.symbol) },
            modifier = Modifier.fillMaxWidth()
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Currency Dropdown
        ExposedDropdownMenuBox(
            expanded = currencyExpanded,
            onExpandedChange = { currencyExpanded = !currencyExpanded }
        ) {
            OutlinedTextField(
                value = "${selectedCurrency.symbol} ${selectedCurrency.code}",
                onValueChange = {},
                readOnly = true,
                label = { Text("Currency") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(currencyExpanded) },
                modifier = Modifier.fillMaxWidth()
            )
            ExposedDropdownMenu(
                expanded = currencyExpanded,
                onDismissRequest = { currencyExpanded = false }
            ) {
                Currencies.ALL.forEach { currency ->
                    DropdownMenuItem(
                        text = { Text("${currency.symbol} ${currency.name}") },
                        onClick = {
                            selectedCurrency = currency
                            currencyExpanded = false
                        }
                    )
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Description Input
        OutlinedTextField(
            value = description,
            onValueChange = { description = it },
            label = { Text("Description") },
            maxLines = 2,
            modifier = Modifier.fillMaxWidth()
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Notes Input
        OutlinedTextField(
            value = notes,
            onValueChange = { notes = it },
            label = { Text("Internal Notes (Optional)") },
            maxLines = 3,
            modifier = Modifier.fillMaxWidth()
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Submit Button
        Button(
            onClick = {
                selectedCategory?.let { category ->
                    onSubmit(
                        category.name,
                        amount.toDoubleOrNull() ?: 0.0,
                        selectedCurrency.code,
                        description,
                        notes.takeIf { it.isNotBlank() }
                    )
                }
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = amount.toDoubleOrNull() != null && description.isNotBlank()
        ) {
            Text("Submit Expense")
        }
    }
}

@Composable
fun ExpenseListItem(expense: Expense) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // Amount with currency
                Text(
                    text = formatAmount(expense.amount, expense.currency),
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                
                // Status badge
                StatusBadge(status = expense.status)
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Description
            Text(
                text = expense.description,
                style = MaterialTheme.typography.bodyMedium
            )
            
            // Notes
            expense.notes?.let {
                Text(
                    text = "Note: $it",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Category and Source badges
            Row {
                AssistChip(
                    onClick = {},
                    label = { Text(expense.category) },
                    leadingIcon = { Icon(Icons.Default.Category, null) }
                )
                Spacer(modifier = Modifier.width(8.dp))
                AssistChip(
                    onClick = {},
                    label = { Text(expense.source) },
                    leadingIcon = { Icon(Icons.Default.Phone, null) }
                )
                if (expense.currency != "USD") {
                    Spacer(modifier = Modifier.width(8.dp))
                    AssistChip(
                        onClick = {},
                        label = { Text(expense.currency) }
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Date and time
            Text(
                text = "${expense.date} at ${expense.time}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            // Approval info
            if (expense.status != ExpenseStatus.PENDING) {
                Divider(modifier = Modifier.padding(vertical = 8.dp))
                Text(
                    text = if (expense.status == ExpenseStatus.APPROVED) 
                        "Approved by ${expense.approvedByName}" 
                    else 
                        "Denied by ${expense.approvedByName}",
                    style = MaterialTheme.typography.bodySmall
                )
                expense.approvalNotes?.let {
                    Text(
                        text = "Admin: $it",
                        style = MaterialTheme.typography.bodySmall,
                        color = if (expense.status == ExpenseStatus.APPROVED)
                            MaterialTheme.colorScheme.primary
                        else
                            MaterialTheme.colorScheme.error,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }
            }
        }
    }
}

fun formatAmount(amount: Double, currency: String): String {
    val symbol = Currencies.getSymbol(currency)
    return "$symbol${String.format("%.2f", amount)}"
}
```

---

## 💾 Database Schema

### Firestore Collection: `expenses`

```javascript
{
  // Document ID (auto-generated)
  id: "exp_abc123",
  
  // Required Fields
  amount: 150.50,
  currency: "EUR",                    // 3-letter code, default: "USD"
  description: "Printer paper and toner",
  category: "Office Supplies",
  date: "2024-01-15",                 // YYYY-MM-DD
  time: "14:30",                      // HH:MM
  
  // Optional Fields
  notes: "Needed for Q1 project",     // Employee notes
  
  // Auto-filled Fields
  status: "pending",                  // "pending", "approved", "denied"
  source: "POS",                      // "POS", "Android", "BackOffice"
  createdBy: "emp_123",
  createdByName: "John Doe",
  createdByRole: "cashier",
  employeeId: "emp_123",              // Same as createdBy
  employeeName: "John Doe",           // Same as createdByName
  createdAt: "2024-01-15T14:30:00Z",  // ISO timestamp
  
  // Approval Fields (added after admin action)
  approvedAt: "2024-01-15T16:00:00Z",
  approvedBy: "admin_456",
  approvedByName: "Admin User",
  approvalNotes: "Approved for project budget"
}
```

### Indexes Required

```
Collection: expenses
- Composite: status, createdAt (desc)
- Composite: employeeId, status, createdAt (desc)
- Single: currency
- Single: source
- Single: category
```

---

## 🧪 Testing Guide

### Pre-Testing Setup
1. Start dev server: `npm run dev`
2. Login accounts:
   - Admin: admin@example.com / password
   - Cashier: cashier@example.com / password

### Test Scenarios

#### 1. Authentication Test
- [ ] Cashier can login
- [ ] JWT token generated
- [ ] Can access expense categories
- [ ] Cannot access admin features

#### 2. Multi-Currency Test
- [ ] Create expense with USD
- [ ] Create expense with EUR
- [ ] Create expense with GBP
- [ ] Verify correct symbols display
- [ ] Filter by EUR currency
- [ ] Approve expense preserves currency

#### 3. Notes Test
- [ ] Create expense with notes
- [ ] Notes display in POS
- [ ] Notes visible in admin approval dialog
- [ ] Admin adds approval notes
- [ ] Both notes visible in approved tab

#### 4. Source Tracking Test
- [ ] POS expense shows "POS" badge
- [ ] Badge is blue for POS
- [ ] createdByName matches logged-in user
- [ ] createdByRole is correct

#### 5. Filtering Test
- [ ] Search by description works
- [ ] Search by notes works
- [ ] Search by employee name works
- [ ] Category filter works
- [ ] Currency filter works
- [ ] Source filter works
- [ ] Multiple filters work together

#### 6. Approval Workflow Test
- [ ] Pending expense appears in admin
- [ ] Approval dialog shows all details
- [ ] Approve with notes works
- [ ] Expense moves to approved tab
- [ ] Deny with reason works
- [ ] Cannot edit approved expense

#### 7. API Test (cURL)
```bash
# Login
curl -X POST http://localhost:3000/api/mobile?action=login \
  -H "Content-Type: application/json" \
  -d '{"email":"cashier@example.com","password":"password"}'

# Get categories
curl http://localhost:3000/api/mobile?action=get-expense-categories \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create expense
curl -X POST http://localhost:3000/api/mobile?action=create-expense \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Office Supplies",
    "amount": 150.00,
    "currency": "EUR",
    "description": "Test expense",
    "notes": "Testing"
  }'

# Get expenses with filters
curl "http://localhost:3000/api/mobile?action=get-expenses&currency=EUR&status=pending" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🚀 Deployment

### Pre-Deployment Checklist
- [ ] All tests passing
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Environment variables set
- [ ] Firebase rules updated
- [ ] Firestore indexes created

### Environment Variables
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
JWT_SECRET=your-secret-key
```

### Deployment Steps
1. Build project: `npm run build`
2. Test production build: `npm start`
3. Deploy to hosting
4. Verify all features work in production
5. Monitor error logs

---

## 📚 File Reference

### Core Files
- `/src/lib/constants/currencies.js` - Currency utilities
- `/src/app/api/mobile/route.js` - API handlers
- `/src/components/pos/ExpensesSection.jsx` - POS expense component
- `/src/app/admin/expenses/page.js` - Admin expense page
- `/src/app/(pos)/sales/page.js` - POS sales page

### Documentation
- This file: Complete expense system documentation

---

## 🎯 Quick Reference

### Default Values
- Currency: USD
- Source: Determined by system (POS/Android/BackOffice)
- Status: pending

### Constraints
- Only pending expenses can be edited
- Only pending expenses can be deleted
- Only admins can approve/deny
- Currency must be one of 15 supported

### Best Practices
1. Always include notes for context
2. Select correct currency
3. Approve/deny promptly
4. Use filters to find expenses quickly
5. Review all details before approval

---

**Version**: 2.0.0
**Last Updated**: January 9, 2026
**Status**: Complete and Production-Ready
**Maintained By**: Development Team
