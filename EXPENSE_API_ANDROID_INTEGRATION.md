# Expense Management API - Android Integration Guide# Expense Management API Documentation for Android App



Complete API documentation for integrating the expense management system into Android applications.## Overview

The POS system now includes a complete expense management system with approval workflow. Employees can submit expenses that require manager approval before being processed. This document provides comprehensive API documentation for integrating expense CRUD operations into the Android mobile app.

## Table of Contents

1. [Overview](#overview)## Base URL

2. [Authentication](#authentication)```

3. [Expense Endpoints](#expense-endpoints)POST https://your-domain.com/api/mobile

4. [Expense Category Endpoints](#expense-category-endpoints)```

5. [Request/Response Examples](#request-response-examples)

6. [Error Handling](#error-handling)## Authentication

7. [Approval Workflow](#approval-workflow)All expense endpoints require JWT authentication. Include the token in the Authorization header:

8. [Multi-Currency Support](#multi-currency-support)```

Authorization: Bearer <jwt_token>

---```



## Overview## Expense Schema

```json

### Base URL{

```  "id": "string",

https://your-domain.com/api/mobile  "description": "string (required)",

```  "amount": "number (required, >= 0)",

  "date": "string (required, YYYY-MM-DD)",

### Features  "time": "string (required, HH:MM)",

- ✅ Create, read, update, delete expenses  "category": "string (default: 'General')",

- ✅ Approval workflow (pending → approved/denied)  "status": "string (pending|approved|denied)",

- ✅ Multi-currency support with currency conversion  "employeeId": "string",

- ✅ Dynamic expense categories management  "employeeName": "string",

- ✅ Role-based permissions (admin vs employee)  "approvedBy": "string (null if pending)",

- ✅ User/source tracking (POS vs BackOffice)  "approvedByName": "string (null if pending)",

- ✅ Internal notes for admin communication  "approvedAt": "string (ISO date, null if pending)",

- ✅ Advanced filtering and search  "approvalNotes": "string (optional)",

- ✅ Real-time totals by currency  "createdAt": "string (ISO date)"

}

---```



## Authentication## API Endpoints



All endpoints (except login) require JWT authentication.### 1. GET EXPENSES (List/Filter Expenses)



### Login**Endpoint:** `GET /api/mobile?action=get-expenses`

```http

POST /api/mobile?action=login**Query Parameters:**

Content-Type: application/json- `start_date` (optional): Filter by start date (YYYY-MM-DD)

- `end_date` (optional): Filter by end date (YYYY-MM-DD)

{- `status` (optional): Filter by status (`pending`, `approved`, `denied`)

  "email": "user@example.com",- `category` (optional): Filter by category

  "password": "password123"- `employeeId` (optional): Filter by employee ID

}

```**Example Request:**

```javascript

**Response:**GET /api/mobile?action=get-expenses&status=pending&start_date=2024-01-01&end_date=2024-12-31

```jsonAuthorization: Bearer <jwt_token>

{```

  "success": true,

  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",**Success Response:**

  "user": {```json

    "id": "user123",{

    "email": "user@example.com",  "success": true,

    "name": "John Doe",  "action": "get-expenses",

    "role": "employee"  "generated_at": "2024-01-15T10:30:00.000Z",

  }  "data": {

}    "expenses": [

```      {

        "id": "expense_123",

### Using Token        "description": "Office supplies",

Include the JWT token in all subsequent requests:        "amount": 150.00,

```http        "date": "2024-01-15",

Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...        "time": "14:30",

```        "category": "Office",

        "status": "pending",

---        "employeeId": "emp_456",

        "employeeName": "John Doe",

## Expense Endpoints        "approvedBy": null,

        "approvedByName": null,

### 1. Get All Expenses        "approvedAt": null,

        "approvalNotes": null,

**Endpoint:** `GET /api/mobile?action=get-expenses`        "createdAt": "2024-01-15T14:30:00.000Z"

      }

**Query Parameters:**    ],

- `status` (optional): Filter by status - `pending`, `approved`, `denied`    "total": 0,

- `category` (optional): Filter by category name    "pendingTotal": 150.00,

- `userId` (optional): Filter by creator user ID    "count": 1,

- `source` (optional): Filter by source - `POS` or `BackOffice`    "pendingCount": 1,

- `currency` (optional): Filter by currency code - `USD`, `EUR`, `GBP`, etc.    "approvedCount": 0,

- `search` (optional): Search in description, category, employee name    "deniedCount": 0

- `start_date` (optional): Filter from date (ISO 8601 format)  }

- `end_date` (optional): Filter to date (ISO 8601 format)}

```

**Example Request:**

```http### 2. CREATE EXPENSE

GET /api/mobile?action=get-expenses&status=pending&currency=USD

Authorization: Bearer <token>**Endpoint:** `POST /api/mobile?action=create-expense`

```

**Request Body:**

**Response:**```json

```json{

{  "description": "Office supplies for Q1",

  "success": true,  "amount": 150.00,

  "action": "get-expenses",  "date": "2024-01-15",

  "generated_at": "2024-01-15T10:30:00.000Z",  "time": "14:30",

  "data": {  "category": "Office",

    "expenses": [  "employeeId": "emp_456",

      {  "employeeName": "John Doe"

        "id": "exp123",}

        "amount": 150.50,```

        "currency": "USD",

        "exchangeRate": 1.0,**Example Android Code (Kotlin):**

        "description": "Office supplies purchase",```kotlin

        "category": "Office Supplies",// Create expense data class

        "date": "2024-01-15",data class CreateExpenseRequest(

        "status": "pending",    val description: String,

        "employeeId": "emp123",    val amount: Double,

        "employeeName": "John Doe",    val date: String,

        "source": "POS",    val time: String,

        "notes": "",    val category: String = "General",

        "createdBy": "emp123",    val employeeId: String,

        "createdByName": "John Doe",    val employeeName: String

        "createdByRole": "employee",)

        "approvedBy": null,

        "approvedByName": null,// API call function

        "approvalDate": null,suspend fun createExpense(expense: CreateExpenseRequest): Result<Expense> {

        "approvalNotes": null,    return try {

        "createdAt": "2024-01-15T08:00:00.000Z",        val requestBody = JSONObject().apply {

        "updatedAt": "2024-01-15T08:00:00.000Z"            put("action", "create-expense")

      }            put("description", expense.description)

    ],            put("amount", expense.amount)

    "totalsByCurrency": {            put("date", expense.date)

      "USD": 150.50,            put("time", expense.time)

      "EUR": 0            put("category", expense.category)

    },            put("employeeId", expense.employeeId)

    "pendingByCurrency": {            put("employeeName", expense.employeeName)

      "USD": 150.50,        }

      "EUR": 0

    },        val response = apiService.postExpense(requestBody.toString())

    "count": 1        // Parse response...

  }        Result.success(parsedExpense)

}    } catch (e: Exception) {

```        Result.failure(e)

    }

---}

```

### 2. Get Single Expense

**Success Response:**

**Endpoint:** `GET /api/mobile?action=get-expense&id=<expense_id>````json

{

**Example Request:**  "success": true,

```http  "action": "create-expense",

GET /api/mobile?action=get-expense&id=exp123  "data": {

Authorization: Bearer <token>    "expense": {

```      "id": "expense_123",

      "description": "Office supplies for Q1",

**Response:**      "amount": 150.00,

```json      "date": "2024-01-15",

{      "time": "14:30",

  "success": true,      "category": "Office",

  "action": "get-expense",      "status": "pending",

  "generated_at": "2024-01-15T10:30:00.000Z",      "employeeId": "emp_456",

  "data": {      "employeeName": "John Doe",

    "id": "exp123",      "approvedBy": null,

    "amount": 150.50,      "approvedByName": null,

    "currency": "USD",      "approvedAt": null,

    "exchangeRate": 1.0,      "approvalNotes": null

    "description": "Office supplies purchase",    }

    "category": "Office Supplies",  }

    "date": "2024-01-15",}

    "status": "pending",```

    "employeeId": "emp123",

    "employeeName": "John Doe",### 3. EDIT EXPENSE (Only Pending Expenses)

    "source": "POS",

    Explaination: replace corrupted doc with clean, Android-ready guide
  "message": "Expense deleted successfully"## Android Implementation Notes

}

```### 1. Network Client Setup

```kotlin

---class ApiService(private val httpClient: OkHttpClient) {



### 6. Approve Expense    suspend fun postExpense(jsonBody: String): JSONObject {

        val requestBody = jsonBody.toRequestBody("application/json".toMediaType())

**Endpoint:** `POST /api/mobile?action=approve-expense`        val request = Request.Builder()

            .url("$BASE_URL/api/mobile")

**Permissions:** Admin only            .post(requestBody)

            .addHeader("Authorization", "Bearer $jwtToken")

**Request Body:**            .build()

```json

{        return withContext(Dispatchers.IO) {

  "expenseId": "exp123",            val response = httpClient.newCall(request).execute()

  "approvedBy": "admin123",            JSONObject(response.body?.string() ?: "{}")

  "approvedByName": "Admin Manager",        }

  "notes": "Approved - valid business expense"    }

}

```    suspend fun getExpenses(params: Map<String, String> = emptyMap()): JSONObject {

        val urlBuilder = "$BASE_URL/api/mobile?action=get-expenses".toHttpUrl().newBuilder()

**Response:**        params.forEach { (key, value) -> urlBuilder.addQueryParameter(key, value) }

```json

{        val request = Request.Builder()

  "success": true,            .url(urlBuilder.build())

  "action": "approve-expense",            .get()

  "message": "Expense approved successfully",            .addHeader("Authorization", "Bearer $jwtToken")

  "data": {            .build()

    "id": "exp123",

    "amount": 150.50,        return withContext(Dispatchers.IO) {

    "currency": "USD",            val response = httpClient.newCall(request).execute()

    "exchangeRate": 1.0,            JSONObject(response.body?.string() ?: "{}")

    "description": "Office supplies purchase",        }

    "category": "Office Supplies",    }

    "date": "2024-01-15",}

    "status": "approved",```

    "employeeId": "emp123",

    "employeeName": "John Doe",### 2. Data Models

    "source": "POS",```kotlin

    "notes": "Urgent purchase for monthly report",data class Expense(

    "createdBy": "emp123",    val id: String,

    "createdByName": "John Doe",    val description: String,

    "createdByRole": "employee",    val amount: Double,

    "approvedBy": "admin123",    val date: String,

    "approvedByName": "Admin Manager",    val time: String,

    "approvalDate": "2024-01-15T14:30:00.000Z",    val category: String,

    "approvalNotes": "Approved - valid business expense",    val status: ExpenseStatus,

    "createdAt": "2024-01-15T08:00:00.000Z",    val employeeId: String?,

    "updatedAt": "2024-01-15T14:30:00.000Z"    val employeeName: String?,

  }    val approvedBy: String?,

}    val approvedByName: String?,

```    val approvedAt: String?,

    val approvalNotes: String?,

---    val createdAt: String

)

### 7. Deny Expense

enum class ExpenseStatus {

**Endpoint:** `POST /api/mobile?action=deny-expense`    PENDING, APPROVED, DENIED;



**Permissions:** Admin only    companion object {

        fun fromString(value: String): ExpenseStatus {

**Request Body:**            return when (value.lowercase()) {

```json                "approved" -> APPROVED

{                "denied" -> DENIED

  "expenseId": "exp123",                else -> PENDING

  "deniedBy": "admin123",            }

  "deniedByName": "Admin Manager",        }

  "notes": "Receipt missing - please resubmit with documentation"    }

}}

``````



**Response:**### 3. Repository Pattern

```json```kotlin

{class ExpenseRepository(private val apiService: ApiService) {

  "success": true,

  "action": "deny-expense",    suspend fun getExpenses(

  "message": "Expense denied successfully",        status: ExpenseStatus? = null,

  "data": {        startDate: String? = null,

    "id": "exp123",        endDate: String? = null

    "amount": 150.50,    ): Result<List<Expense>> {

    "currency": "USD",        return try {

    "exchangeRate": 1.0,            val params = mutableMapOf<String, String>()

    "description": "Office supplies purchase",            status?.let { params["status"] = it.name.lowercase() }

    "category": "Office Supplies",            startDate?.let { params["start_date"] = it }

    "date": "2024-01-15",            endDate?.let { params["end_date"] = it }

    "status": "denied",

    "employeeId": "emp123",            val response = apiService.getExpenses(params)

    "employeeName": "John Doe",            if (response.getBoolean("success")) {

    "source": "POS",                val expensesJson = response.getJSONObject("data").getJSONArray("expenses")

    "notes": "Urgent purchase for monthly report",                val expenses = mutableListOf<Expense>()

    "createdBy": "emp123",                for (i in 0 until expensesJson.length()) {

    "createdByName": "John Doe",                    expenses.add(parseExpense(expensesJson.getJSONObject(i)))

    "createdByRole": "employee",                }

    "approvedBy": "admin123",                Result.success(expenses)

    "approvedByName": "Admin Manager",            } else {

    "approvalDate": "2024-01-15T14:30:00.000Z",                Result.failure(Exception(response.getString("error")))

    "approvalNotes": "Receipt missing - please resubmit with documentation",            }

    "createdAt": "2024-01-15T08:00:00.000Z",        } catch (e: Exception) {

    "updatedAt": "2024-01-15T14:30:00.000Z"            Result.failure(e)

  }        }

}    }

```

    suspend fun createExpense(expense: CreateExpenseRequest): Result<Expense> {

---        // Implementation...

    }

## Expense Category Endpoints

    suspend fun approveExpense(expenseId: String, notes: String?): Result<Expense> {

### 8. Get All Expense Categories        // Implementation...

    }

**Endpoint:** `GET /api/mobile?action=get-expense-categories`

    private fun parseExpense(json: JSONObject): Expense {

**Example Request:**        return Expense(

```http            id = json.getString("id"),

GET /api/mobile?action=get-expense-categories            description = json.getString("description"),

Authorization: Bearer <token>            amount = json.getDouble("amount"),

```            date = json.getString("date"),

            time = json.getString("time"),

**Response:**            category = json.getString("category"),

```json            status = ExpenseStatus.fromString(json.getString("status")),

{            employeeId = json.optString("employeeId", null),

  "success": true,            employeeName = json.optString("employeeName", null),

  "action": "get-expense-categories",            approvedBy = json.optString("approvedBy", null),

  "generated_at": "2024-01-15T10:30:00.000Z",            approvedByName = json.optString("approvedByName", null),

  "data": [            approvedAt = json.optString("approvedAt", null),

    {            approvalNotes = json.optString("approvalNotes", null),

      "id": "cat123",            createdAt = json.getString("createdAt")

      "name": "Office Supplies",        )

      "description": "Pens, papers, printer ink, etc.",    }

      "active": true,}

      "createdAt": "2024-01-01T00:00:00.000Z",```

      "updatedAt": "2024-01-01T00:00:00.000Z"

    },### 4. ViewModel Integration

    {```kotlin

      "id": "cat124",class ExpenseViewModel(private val repository: ExpenseRepository) : ViewModel() {

      "name": "Travel",

      "description": "Business travel expenses",    private val _expenses = MutableLiveData<List<Expense>>()

      "active": true,    val expenses: LiveData<List<Expense>> = _expenses

      "createdAt": "2024-01-01T00:00:00.000Z",

      "updatedAt": "2024-01-01T00:00:00.000Z"    private val _isLoading = MutableLiveData<Boolean>()

    }    val isLoading: LiveData<Boolean> = _isLoading

  ]

}    fun loadExpenses(status: ExpenseStatus? = null) {

```        viewModelScope.launch {

            _isLoading.value = true

---            try {

                val result = repository.getExpenses(status = status)

### 9. Get Single Expense Category                result.onSuccess { expenses ->

                    _expenses.value = expenses

**Endpoint:** `GET /api/mobile?action=get-expense-category&id=<category_id>`                }.onFailure { error ->

                    // Handle error

**Example Request:**                }

```http            } finally {

GET /api/mobile?action=get-expense-category&id=cat123                _isLoading.value = false

Authorization: Bearer <token>            }

```        }

    }

**Response:**

```json    fun createExpense(description: String, amount: Double, date: String, time: String) {

{        viewModelScope.launch {

  "success": true,            val request = CreateExpenseRequest(

  "action": "get-expense-category",                description = description,

  "generated_at": "2024-01-15T10:30:00.000Z",                amount = amount,

  "data": {                date = date,

    "id": "cat123",                time = time,

    "name": "Office Supplies",                category = "General",

    "description": "Pens, papers, printer ink, etc.",                employeeId = currentUser.id,

    "active": true,                employeeName = currentUser.name

    "createdAt": "2024-01-01T00:00:00.000Z",            )

    "updatedAt": "2024-01-01T00:00:00.000Z"

  }            repository.createExpense(request).onSuccess {

}                loadExpenses() // Refresh list

```            }

        }

---    }

}

### 10. Create Expense Category```



**Endpoint:** `POST /api/mobile?action=create-expense-category`## Workflow Integration



**Permissions:** Admin only (recommended)### Employee Flow:

1. Create expense → Status: `pending`

**Request Body:**2. Can edit/delete while `pending`

```json3. Cannot modify once `approved` or `denied`

{

  "name": "Marketing",### Manager Flow:

  "description": "Advertising and promotional expenses",1. View all expenses (filter by status)

  "active": true2. Approve or deny `pending` expenses

}3. Add approval notes

```4. View approval history



**Required Fields:**### Status Transitions:

- `name` (string): Category name- `pending` → `approved` (manager action)

- `pending` → `denied` (manager action)

**Optional Fields:**- `approved`/`denied` → immutable

- `description` (string): Category description

- `active` (boolean): Whether category is active (default: true)## Testing Checklist



**Response:**- [ ] Create expense with valid data

```json- [ ] Create expense with invalid data (validation errors)

{- [ ] Edit pending expense

  "success": true,- [ ] Try to edit approved expense (should fail)

  "action": "create-expense-category",- [ ] Delete pending expense

  "message": "Expense category created successfully",- [ ] Approve expense as manager

  "data": {- [ ] Deny expense as manager

    "id": "cat125",- [ ] Filter expenses by status

    "name": "Marketing",- [ ] Filter expenses by date range

    "description": "Advertising and promotional expenses",- [ ] Handle network errors gracefully

    "active": true,- [ ] Handle authentication errors

    "createdAt": "2024-01-15T10:30:00.000Z",- [ ] Test offline functionality (if implemented)

    "updatedAt": "2024-01-15T10:30:00.000Z"

  }## Version History

}

```- **v1.0**: Initial expense CRUD implementation with approval workflow

- Added status management (pending/approved/denied)

---- Added approval tracking (approvedBy, approvedAt, approvalNotes)

- Added filtering capabilities

### 11. Edit Expense Category- Added role-based permissions



**Endpoint:** `POST /api/mobile?action=edit-expense-category`---



**Permissions:** Admin only (recommended)**Note:** Ensure your Android app handles the approval workflow UI appropriately, showing different actions based on user role (employee vs manager) and expense status.</content>

<parameter name="filePath">/Volumes/SANDISK/Candy Kush/pos-candy-kush/pos-candy-kush/EXPENSE_API_ANDROID_INTEGRATION.md
**Request Body:**
```json
{
  "categoryId": "cat125",
  "name": "Marketing & Advertising",
  "description": "All marketing, advertising and promotional expenses",
  "active": true
}
```

**Response:**
```json
{
  "success": true,
  "action": "edit-expense-category",
  "message": "Expense category updated successfully",
  "data": {
    "id": "cat125",
    "name": "Marketing & Advertising",
    "description": "All marketing, advertising and promotional expenses",
    "active": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

---

### 12. Delete Expense Category

**Endpoint:** `POST /api/mobile?action=delete-expense-category`

**Permissions:** Admin only (recommended)

**Request Body:**
```json
{
  "categoryId": "cat125"
}
```

**Note:** Cannot delete a category that is being used by existing expenses.

**Response:**
```json
{
  "success": true,
  "action": "delete-expense-category",
  "message": "Category deleted successfully"
}
```

**Error Response (if category is in use):**
```json
{
  "success": false,
  "error": "Cannot delete category. It is being used by 5 expense(s)"
}
```

---

## Request/Response Examples

### Example 1: Employee Creates Expense from POS

```kotlin
// Android Kotlin Example
data class CreateExpenseRequest(
    val amount: Double,
    val currency: String,
    val exchangeRate: Double = 1.0,
    val description: String,
    val category: String,
    val date: String,
    val employeeId: String,
    val employeeName: String,
    val source: String = "POS",
    val notes: String = "",
    val createdBy: String,
    val createdByName: String,
    val createdByRole: String = "employee"
)

// Create expense
val expense = CreateExpenseRequest(
    amount = 45.99,
    currency = "USD",
    description = "Printer paper",
    category = "Office Supplies",
    date = "2024-01-15",
    employeeId = cashier.id,
    employeeName = cashier.name,
    source = "POS",
    notes = "Running low on supplies",
    createdBy = cashier.id,
    createdByName = cashier.name,
    createdByRole = "employee"
)

val response = apiService.createExpense(expense)
```

---

### Example 2: Admin Approves Expense

```kotlin
// Android Kotlin Example
data class ApproveExpenseRequest(
    val expenseId: String,
    val approvedBy: String,
    val approvedByName: String,
    val notes: String = ""
)

// Approve expense
val approvalRequest = ApproveExpenseRequest(
    expenseId = "exp123",
    approvedBy = admin.id,
    approvedByName = admin.name,
    notes = "Approved - valid business expense"
)

val response = apiService.approveExpense(approvalRequest)
```

---

### Example 3: Filter Expenses with Multiple Criteria

```kotlin
// Android Kotlin Example
val params = mapOf(
    "action" to "get-expenses",
    "status" to "pending",
    "currency" to "USD",
    "source" to "POS",
    "start_date" to "2024-01-01",
    "end_date" to "2024-01-31",
    "search" to "office"
)

val response = apiService.getExpenses(params)
```

---

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes
- `200`: Success (even for errors - check `success` field)
- `400`: Bad Request (missing required parameters)
- `401`: Unauthorized (invalid or missing token)
- `403`: Forbidden (insufficient permissions)
- `500`: Internal Server Error

### Common Error Messages

**Authentication Errors:**
```json
{
  "success": false,
  "error": "No token provided"
}
```

**Permission Errors:**
```json
{
  "success": false,
  "error": "Only employees with pending status can edit expenses"
}
```

**Validation Errors:**
```json
{
  "success": false,
  "error": "Amount is required and must be greater than 0"
}
```

**Duplicate Category:**
```json
{
  "success": false,
  "error": "A category with this name already exists"
}
```

---

## Approval Workflow

### Workflow States

```
┌──────────┐
│          │
│ CREATED  │ (Employee submits expense)
│          │
└────┬─────┘
     │
     ▼
┌──────────┐      ┌──────────┐
│          │      │          │
│ PENDING  │◄────►│ EDITING  │ (Employee can edit)
│          │      │          │
└────┬─────┘      └──────────┘
     │
     ├─────────────┐
     │             │
     ▼             ▼
┌──────────┐  ┌──────────┐
│          │  │          │
│ APPROVED │  │ DENIED   │ (Admin decision)
│          │  │          │
└──────────┘  └──────────┘
```

### Permission Matrix

| Action | Employee (Pending) | Employee (Approved/Denied) | Admin |
|--------|-------------------|---------------------------|-------|
| Create | ✅ Yes | ✅ Yes | ✅ Yes |
| View | ✅ Own expenses | ✅ Own expenses | ✅ All expenses |
| Edit | ✅ Yes | ❌ No | ✅ Yes |
| Delete | ✅ Yes | ❌ No | ✅ Yes |
| Approve | ❌ No | ❌ No | ✅ Yes |
| Deny | ❌ No | ❌ No | ✅ Yes |

---

## Multi-Currency Support

### Supported Currencies

The system supports all major currencies:
- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- JPY (Japanese Yen)
- CAD (Canadian Dollar)
- AUD (Australian Dollar)
- And many more...

### Currency Fields

**In Expense Object:**
```json
{
  "amount": 100.00,
  "currency": "EUR",
  "exchangeRate": 1.08
}
```

- `amount`: The expense amount in the specified currency
- `currency`: ISO 4217 currency code (3 letters)
- `exchangeRate`: Exchange rate to base currency (optional, default: 1.0)

### Total Calculations

When fetching expenses, the API returns totals grouped by currency:

```json
{
  "totalsByCurrency": {
    "USD": 1250.50,
    "EUR": 890.25,
    "GBP": 320.00
  },
  "pendingByCurrency": {
    "USD": 450.00,
    "EUR": 200.00,
    "GBP": 0
  }
}
```

### Best Practices

1. **Always specify currency** when creating expenses
2. **Store exchange rates** at time of expense creation for accurate historical reporting
3. **Display amounts with currency symbols** in your UI
4. **Allow filtering by currency** for better organization
5. **Show totals per currency** rather than converting everything

---

## Android Implementation Tips

### 1. API Service Interface

```kotlin
interface ExpenseApiService {
    @POST("api/mobile")
    suspend fun login(
        @Query("action") action: String = "login",
        @Body credentials: LoginRequest
    ): ApiResponse<LoginData>
    
    @GET("api/mobile")
    suspend fun getExpenses(
        @QueryMap params: Map<String, String>,
        @Header("Authorization") token: String
    ): ApiResponse<ExpensesData>
    
    @POST("api/mobile")
    suspend fun createExpense(
        @Query("action") action: String = "create-expense",
        @Body expense: CreateExpenseRequest,
        @Header("Authorization") token: String
    ): ApiResponse<ExpenseData>
    
    @POST("api/mobile")
    suspend fun approveExpense(
        @Query("action") action: String = "approve-expense",
        @Body approval: ApproveExpenseRequest,
        @Header("Authorization") token: String
    ): ApiResponse<ExpenseData>
    
    @GET("api/mobile")
    suspend fun getExpenseCategories(
        @Query("action") action: String = "get-expense-categories",
        @Header("Authorization") token: String
    ): ApiResponse<List<CategoryData>>
}
```

### 2. Data Models

```kotlin
data class ExpenseData(
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

data class CategoryData(
    val id: String,
    val name: String,
    val description: String,
    val active: Boolean,
    val createdAt: String,
    val updatedAt: String
)
```

### 3. Error Handling

```kotlin
try {
    val response = apiService.createExpense(expense, "Bearer $token")
    if (response.success) {
        // Handle success
        showSuccess("Expense created successfully")
    } else {
        // Handle API error
        showError(response.error ?: "Unknown error")
    }
} catch (e: Exception) {
    // Handle network error
    showError("Network error: ${e.message}")
}
```

### 4. Offline Support

```kotlin
// Store expenses locally when offline
@Entity(tableName = "pending_expenses")
data class PendingExpense(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val expense: String, // JSON string
    val synced: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

// Sync when back online
suspend fun syncPendingExpenses() {
    val pending = database.pendingExpenseDao().getUnsynced()
    pending.forEach { pendingExpense ->
        try {
            val expense = Json.decodeFromString<CreateExpenseRequest>(pendingExpense.expense)
            val response = apiService.createExpense(expense, "Bearer $token")
            if (response.success) {
                database.pendingExpenseDao().markSynced(pendingExpense.id)
            }
        } catch (e: Exception) {
            Log.e("Sync", "Failed to sync expense: ${e.message}")
        }
    }
}
```

---

## Testing Checklist

### Employee Functions
- [ ] Login as employee
- [ ] Create expense with all required fields
- [ ] Create expense with optional fields (notes, currency)
- [ ] View own expenses
- [ ] Edit pending expense
- [ ] Try to edit approved expense (should fail)
- [ ] Delete pending expense
- [ ] Try to approve expense (should fail)

### Admin Functions
- [ ] Login as admin
- [ ] View all expenses
- [ ] Filter expenses by status
- [ ] Filter expenses by currency
- [ ] Search expenses
- [ ] Approve pending expense
- [ ] Deny pending expense
- [ ] Edit approved expense (should work)
- [ ] Create expense category
- [ ] Edit expense category
- [ ] Try to delete category in use (should fail)
- [ ] Delete unused category

### Multi-Currency
- [ ] Create expense in USD
- [ ] Create expense in EUR
- [ ] Create expense in GBP
- [ ] View totals by currency
- [ ] Filter by specific currency

### Edge Cases
- [ ] Create expense with missing required field
- [ ] Create expense with invalid currency
- [ ] Try to access with invalid token
- [ ] Try to access without token
- [ ] Create duplicate category name
- [ ] Delete non-existent expense

---

## Support

For issues or questions about the API:
1. Check error messages in response
2. Verify authentication token is valid
3. Ensure all required fields are provided
4. Check user has correct permissions
5. Review this documentation for correct endpoint usage

---

## Changelog

### Version 2.0 (Current)
- ✅ Added multi-currency support
- ✅ Added expense categories management
- ✅ Added user/source tracking
- ✅ Added internal notes field
- ✅ Added role-based permissions
- ✅ Added advanced filtering (source, currency, search)
- ✅ Added totals by currency
- ✅ Improved approval workflow

### Version 1.0
- Initial expense management system
- Basic CRUD operations
- Simple approval workflow
