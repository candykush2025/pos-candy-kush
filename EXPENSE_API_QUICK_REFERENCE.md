# Expense API - Quick Reference for Android Team v2.0

**🆕 Updated with multi-currency support and internal notes**

## 🚀 Quick Start

### Base URL
```
https://your-domain.com/api/mobile
```

### Authentication
```http
Authorization: Bearer <your_jwt_token>
```

### What's New in v2.0
- ✅ **Multi-currency support** (15 currencies)
- ✅ **Internal notes field** for expense context
- ✅ **Enhanced metadata** (source, user tracking)
- ✅ **Currency filtering** in get-expenses

---

## 📋 All Endpoints (12 Total)

| # | Method | Action | Description | Permission |
|---|--------|--------|-------------|------------|
| 1 | GET | `get-expenses` | List all expenses | All |
| 2 | GET | `get-expense` | Get single expense | All |
| 3 | POST | `create-expense` | Create new expense | All |
| 4 | POST | `edit-expense` | Update expense | Employee (pending only), Admin (all) |
| 5 | POST | `delete-expense` | Delete expense | All |
| 6 | POST | `approve-expense` | Approve expense | Admin only |
| 7 | POST | `deny-expense` | Deny expense | Admin only |
| 8 | GET | `get-expense-categories` | List all categories | All |
| 9 | GET | `get-expense-category` | Get single category | All |
| 10 | POST | `create-expense-category` | Create category | Admin |
| 11 | POST | `edit-expense-category` | Update category | Admin |
| 12 | POST | `delete-expense-category` | Delete category | Admin |

---

## 🔥 Most Used Endpoints

### 1. Get Expenses (with filters)
```http
GET /api/mobile?action=get-expenses&status=pending&currency=USD
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "expenses": [...],
    "totalsByCurrency": { "USD": 1250.50 },
    "pendingByCurrency": { "USD": 450.00 },
    "count": 5
  }
}
```

### 2. Create Expense
```http
POST /api/mobile?action=create-expense
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 150.50,
  "currency": "USD",
  "description": "Office supplies",
  "category": "Office Supplies",
  "date": "2024-01-15",
  "employeeId": "emp123",
  "employeeName": "John Doe",
  "source": "POS",
  "notes": "Urgent purchase",
  "createdBy": "emp123",
  "createdByName": "John Doe",
  "createdByRole": "employee"
}
```

### 3. Approve Expense
```http
POST /api/mobile?action=approve-expense
Authorization: Bearer <token>
Content-Type: application/json

{
  "expenseId": "exp123",
  "approvedBy": "admin123",
  "approvedByName": "Admin Manager",
  "notes": "Approved - valid expense"
}
```

### 4. Get Categories
```http
GET /api/mobile?action=get-expense-categories
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cat123",
      "name": "Office Supplies",
      "description": "Pens, papers, printer ink",
      "active": true
    }
  ]
}
```

---

## 🎨 Android Code Examples

### Data Models
```kotlin
data class Expense(
    val id: String,
    val amount: Double,
    val currency: String,
    val exchangeRate: Double,
    val description: String,
    val category: String,
    val date: String,
    val status: String,
    val employeeId: String,
    val employeeName: String,
    val source: String,
    val notes: String?,
    val createdBy: String,
    val createdByName: String,
    val createdByRole: String,
    val approvedBy: String?,
    val approvedByName: String?,
    val approvalDate: String?,
    val approvalNotes: String?,
    val createdAt: String,
    val updatedAt: String
)

data class Category(
    val id: String,
    val name: String,
    val description: String,
    val active: Boolean
)
```

### API Service
```kotlin
interface ExpenseApi {
    @GET("api/mobile")
    suspend fun getExpenses(
        @Query("action") action: String = "get-expenses",
        @Query("status") status: String? = null,
        @Query("currency") currency: String? = null,
        @Header("Authorization") token: String
    ): ApiResponse<ExpensesData>
    
    @POST("api/mobile")
    suspend fun createExpense(
        @Query("action") action: String = "create-expense",
        @Body expense: CreateExpenseRequest,
        @Header("Authorization") token: String
    ): ApiResponse<Expense>
    
    @POST("api/mobile")
    suspend fun approveExpense(
        @Query("action") action: String = "approve-expense",
        @Body request: ApproveRequest,
        @Header("Authorization") token: String
    ): ApiResponse<Expense>
    
    @GET("api/mobile")
    suspend fun getCategories(
        @Query("action") action: String = "get-expense-categories",
        @Header("Authorization") token: String
    ): ApiResponse<List<Category>>
}
```

### Usage Example
```kotlin
// Create expense
val expense = CreateExpenseRequest(
    amount = 45.99,
    currency = "USD",
    description = "Printer paper",
    category = "Office Supplies",
    date = "2024-01-15",
    employeeId = currentUser.id,
    employeeName = currentUser.name,
    source = "POS",
    createdBy = currentUser.id,
    createdByName = currentUser.name,
    createdByRole = "employee"
)

viewModelScope.launch {
    try {
        val response = api.createExpense(
            expense = expense,
            token = "Bearer $token"
        )
        if (response.success) {
            showSuccess("Expense created!")
        }
    } catch (e: Exception) {
        showError(e.message)
    }
}
```

---

## 🔍 Filter Options

### get-expenses Filters
- `status` → pending, approved, denied
- `category` → category name
- `userId` → creator user ID
- `source` → POS, BackOffice
- `currency` → USD, EUR, GBP, etc.
- `search` → search text
- `start_date` → YYYY-MM-DD
- `end_date` → YYYY-MM-DD

**Example:**
```
GET /api/mobile?action=get-expenses&status=pending&currency=USD&source=POS&search=office
```

---

## ✅ Required Fields

### Create Expense (Required)
- `amount` (number)
- `currency` (string)
- `description` (string)
- `category` (string)
- `date` (string YYYY-MM-DD)
- `employeeId` (string)
- `employeeName` (string)

### Create Expense (Optional)
- `exchangeRate` (number, default: 1.0)
- `source` (string, default: "BackOffice")
- `notes` (string)
- `createdBy` (string)
- `createdByName` (string)
- `createdByRole` (string)

### Approve/Deny Expense (Required)
- `expenseId` (string)
- `approvedBy` or `deniedBy` (string)
- `approvedByName` or `deniedByName` (string)

### Approve/Deny Expense (Optional)
- `notes` (string)

---

## 🎯 Common Use Cases

### 1. Employee submits expense from POS
```kotlin
createExpense(
    amount = 50.00,
    currency = "USD",
    description = "Supplies",
    category = "Office Supplies",
    date = today(),
    employeeId = cashier.id,
    employeeName = cashier.name,
    source = "POS",
    createdBy = cashier.id,
    createdByName = cashier.name,
    createdByRole = "employee"
)
```

### 2. Manager approves expense
```kotlin
approveExpense(
    expenseId = "exp123",
    approvedBy = manager.id,
    approvedByName = manager.name,
    notes = "Approved"
)
```

### 3. View pending expenses for today
```kotlin
getExpenses(
    status = "pending",
    start_date = today(),
    end_date = today()
)
```

### 4. Search expenses by text
```kotlin
getExpenses(
    search = "office"  // searches description, category, employee name
)
```

### 5. View USD expenses from POS
```kotlin
getExpenses(
    currency = "USD",
    source = "POS"
)
```

---

## ⚠️ Permission Rules

| Action | Employee (Pending) | Employee (Approved/Denied) | Admin |
|--------|-------------------|---------------------------|-------|
| Create | ✅ | ✅ | ✅ |
| View | ✅ Own | ✅ Own | ✅ All |
| Edit | ✅ | ❌ | ✅ |
| Delete | ✅ | ❌ | ✅ |
| Approve | ❌ | ❌ | ✅ |
| Deny | ❌ | ❌ | ✅ |

---

## 🚨 Common Errors

### Error: "Only employees with pending status can edit expenses"
**Solution:** Employees can only edit pending expenses. Use admin account or don't allow editing approved/denied expenses.

### Error: "Amount is required and must be greater than 0"
**Solution:** Ensure amount field is present and > 0.

### Error: "A category with this name already exists"
**Solution:** Category names must be unique. Check existing categories first.

### Error: "Cannot delete category. It is being used by X expense(s)"
**Solution:** Cannot delete categories that have expenses. Mark as inactive instead.

### Error: "No token provided"
**Solution:** Include Authorization header: `Authorization: Bearer <token>`

---

## 💰 Currency Support

### Supported Currencies
USD, EUR, GBP, JPY, CAD, AUD, and more...

### Currency Fields
```json
{
  "amount": 100.00,
  "currency": "EUR",
  "exchangeRate": 1.08
}
```

### Totals by Currency
```json
{
  "totalsByCurrency": {
    "USD": 1250.50,
    "EUR": 890.25
  }
}
```

---

## 📚 Full Documentation

For complete details, see:
**`EXPENSE_API_ANDROID_INTEGRATION.md`**

Includes:
- All 12 endpoints with full examples
- Complete request/response schemas
- Error handling guide
- Approval workflow diagram
- Multi-currency best practices
- Android implementation tips
- Testing checklist

---

## 🔗 Quick Links

| Document | Purpose |
|----------|---------|
| `EXPENSE_API_ANDROID_INTEGRATION.md` | Complete API documentation |
| `EXPENSE_ENHANCEMENT_SUMMARY.md` | Implementation details |
| This file | Quick reference |

---

## 📞 Support

1. Check error messages in API response
2. Verify token is valid
3. Ensure required fields are provided
4. Check user has correct permissions
5. Review full documentation

---

**Last Updated:** January 2024  
**API Version:** 2.0  
**Status:** Production Ready ✅
