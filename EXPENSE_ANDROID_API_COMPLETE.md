# Expense Management System - Complete Android API Documentation

**Complete API documentation for Android integration covering all expense features: multi-currency, categories, user tracking, permissions, notes, filtering, and reporting.**

---

## 📑 Table of Contents

1. [System Overview](#system-overview)
2. [Authentication](#authentication)
3. [Base Configuration](#base-configuration)
4. [Expense Schema](#expense-schema)
5. [API Endpoints](#api-endpoints)
   - [Expense Operations](#expense-operations)
   - [Category Management](#category-management)
   - [Approval Workflow](#approval-workflow)
6. [Data Models (Kotlin)](#data-models-kotlin)
7. [API Service Interface](#api-service-interface)
8. [Request/Response Examples](#requestresponse-examples)
9. [Error Handling](#error-handling)
10. [Testing Guide](#testing-guide)

---

## 🌟 System Overview

### Key Features ✅

1. **Multi-Currency Support** - Store and track expenses in 15+ currencies (USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR, MXN, BRL, ZAR, SGD, HKD, SEK)
2. **Expense Categories** - Create, manage, and filter by categories (separate from product categories)
3. **User/Source Tracking** - Track who created expense, their role, and source (POS vs BackOffice)
4. **Role-Based Permissions**:
   - **POS Users/Employees**: Can only add expenses (status: pending)
   - **Admin**: Can view, edit, delete, approve, and deny expenses
5. **Internal Notes** - Separate notes field for internal communication
6. **Advanced Filtering** - Filter by category, date range, user, source, currency, status
7. **Text Search** - Search expenses by description
8. **Approval Workflow** - Pending → Approved/Denied with approval notes
9. **Multi-Currency Totals** - Get totals grouped by currency

### Default Shop Currency

- Default currency: **USD**
- Each expense stores its own currency
- Admin can set default shop currency (feature-ready)

---

## 🔐 Authentication

All API endpoints require JWT authentication.

### Headers Required

```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

### How to Get JWT Token

Use the login endpoint to get a JWT token:

**Endpoint:** `POST /api/mobile?action=login`

**Request:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "action": "login",
  "data": {
    "user": {
      "id": "user123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 🌐 Base Configuration

```kotlin
object ApiConfig {
    const val BASE_URL = "https://your-domain.com"
    const val API_ENDPOINT = "/api/mobile"

    // Supported currencies
    val SUPPORTED_CURRENCIES = listOf(
        "USD", "EUR", "GBP", "JPY", "CAD",
        "AUD", "CHF", "CNY", "INR", "MXN",
        "BRL", "ZAR", "SGD", "HKD", "SEK"
    )

    // Expense sources
    enum class ExpenseSource(val value: String) {
        POS("POS"),
        BACK_OFFICE("BackOffice"),
        MOBILE_ADMIN("mobile-admin"),
        ANDROID("android")
    }

    // Expense status
    enum class ExpenseStatus(val value: String) {
        PENDING("pending"),
        APPROVED("approved"),
        DENIED("denied")
    }
}
```

---

## 📊 Expense Schema

### Complete Expense Object

```json
{
  "id": "exp_12345",
  "description": "Office supplies - printer paper",
  "amount": 45.5,
  "date": "2026-01-10",
  "time": "14:30",
  "category": "Office Supplies",
  "currency": "USD",
  "notes": "Urgent purchase for Q1 inventory",
  "source": "POS",

  // Creator tracking
  "createdBy": "user_789",
  "createdByName": "John Cashier",
  "createdByRole": "employee",

  // Employee info (for POS expenses)
  "employeeId": "user_789",
  "employeeName": "John Cashier",

  // Approval workflow
  "status": "pending",
  "approvedBy": null,
  "approvedByName": null,
  "approvedAt": null,
  "approvalNotes": null,

  // Timestamps
  "createdAt": "2026-01-10T14:30:00.000Z",
  "updatedAt": "2026-01-10T14:30:00.000Z"
}
```

### Field Descriptions

| Field            | Type   | Required | Description                                       |
| ---------------- | ------ | -------- | ------------------------------------------------- |
| `id`             | String | Auto     | Unique expense ID                                 |
| `description`    | String | ✅ Yes   | Expense description                               |
| `amount`         | Number | ✅ Yes   | Expense amount (>= 0)                             |
| `date`           | String | ✅ Yes   | Date (YYYY-MM-DD)                                 |
| `time`           | String | ✅ Yes   | Time (HH:MM)                                      |
| `category`       | String | No       | Category name (default: "Uncategorized")          |
| `currency`       | String | No       | Currency code (default: "USD")                    |
| `notes`          | String | No       | Internal notes                                    |
| `source`         | String | No       | Source: POS, BackOffice, android (default: "POS") |
| `createdBy`      | String | No       | User ID who created                               |
| `createdByName`  | String | No       | User name who created                             |
| `createdByRole`  | String | No       | User role: admin, employee                        |
| `employeeId`     | String | No       | Employee ID (for POS)                             |
| `employeeName`   | String | No       | Employee name                                     |
| `status`         | String | Auto     | pending, approved, denied                         |
| `approvedBy`     | String | Auto     | Approver ID                                       |
| `approvedByName` | String | Auto     | Approver name                                     |
| `approvedAt`     | String | Auto     | Approval timestamp                                |
| `approvalNotes`  | String | Auto     | Approval/denial notes                             |

---

## 📡 API Endpoints

### Expense Operations

#### 1. GET All Expenses (with filters)

**Endpoint:** `GET /api/mobile?action=get-expenses`

**Query Parameters:**

- `start_date` (optional): Filter from date (YYYY-MM-DD)
- `end_date` (optional): Filter to date (YYYY-MM-DD)
- `status` (optional): pending | approved | denied
- `category` (optional): Filter by category name
- `employeeId` (optional): Filter by employee/user ID
- `userId` (optional): Alternative to employeeId
- `source` (optional): POS | BackOffice | android
- `currency` (optional): Currency code (USD, EUR, etc.)
- `search` (optional): Text search in description

**Example Requests:**

```bash
# Get all expenses
GET /api/mobile?action=get-expenses

# Get pending expenses
GET /api/mobile?action=get-expenses&status=pending

# Get expenses by date range
GET /api/mobile?action=get-expenses&start_date=2026-01-01&end_date=2026-01-31

# Get expenses by category
GET /api/mobile?action=get-expenses&category=Office%20Supplies

# Get expenses by user
GET /api/mobile?action=get-expenses&userId=user_789

# Get expenses by source
GET /api/mobile?action=get-expenses&source=POS

# Get expenses by currency
GET /api/mobile?action=get-expenses&currency=EUR

# Search expenses
GET /api/mobile?action=get-expenses&search=printer

# Combined filters
GET /api/mobile?action=get-expenses&status=approved&currency=USD&start_date=2026-01-01&end_date=2026-01-31
```

**Response:**

```json
{
  "success": true,
  "action": "get-expenses",
  "generated_at": "2026-01-10T10:00:00.000Z",
  "data": {
    "expenses": [
      {
        "id": "exp_001",
        "description": "Office supplies",
        "amount": 45.5,
        "date": "2026-01-10",
        "time": "14:30",
        "category": "Office Supplies",
        "currency": "USD",
        "notes": "Urgent",
        "source": "POS",
        "createdBy": "user_789",
        "createdByName": "John Cashier",
        "createdByRole": "employee",
        "status": "pending",
        "createdAt": "2026-01-10T14:30:00.000Z"
      }
    ],
    "total": 45.5,
    "pendingTotal": 45.5,
    "totalsByCurrency": {
      "USD": 45.5,
      "EUR": 120.0
    },
    "pendingByCurrency": {
      "USD": 45.5
    },
    "count": 1,
    "pendingCount": 1,
    "approvedCount": 0,
    "deniedCount": 0
  }
}
```

---

#### 2. GET Single Expense

**Endpoint:** `GET /api/mobile?action=get-expense&id={expenseId}`

**Example:**

```bash
GET /api/mobile?action=get-expense&id=exp_12345
```

**Response:**

```json
{
  "success": true,
  "action": "get-expense",
  "generated_at": "2026-01-10T10:00:00.000Z",
  "data": {
    "id": "exp_12345",
    "description": "Office supplies - printer paper",
    "amount": 45.5,
    "date": "2026-01-10",
    "time": "14:30",
    "category": "Office Supplies",
    "currency": "USD",
    "notes": "Urgent purchase",
    "source": "POS",
    "createdBy": "user_789",
    "createdByName": "John Cashier",
    "createdByRole": "employee",
    "status": "pending",
    "createdAt": "2026-01-10T14:30:00.000Z"
  }
}
```

---

#### 3. POST Create Expense

**Endpoint:** `POST /api/mobile?action=create-expense`

**Required Fields:**

- `description`: String
- `amount`: Number (>= 0)
- `date`: String (YYYY-MM-DD)
- `time`: String (HH:MM)

**Optional Fields:**

- `category`: String (default: "Uncategorized")
- `currency`: String (default: "USD")
- `notes`: String
- `source`: String (default: "POS")
- `createdBy`: String (user ID)
- `createdByName`: String
- `createdByRole`: String (employee | admin)
- `employeeId`: String
- `employeeName`: String

**Request:**

```json
{
  "description": "Office supplies - printer paper",
  "amount": 45.5,
  "date": "2026-01-10",
  "time": "14:30",
  "category": "Office Supplies",
  "currency": "USD",
  "notes": "Urgent purchase for Q1 inventory",
  "source": "android",
  "createdBy": "user_789",
  "createdByName": "John Cashier",
  "createdByRole": "employee"
}
```

**Response:**

```json
{
  "success": true,
  "action": "create-expense",
  "data": {
    "expense": {
      "id": "exp_new123",
      "description": "Office supplies - printer paper",
      "amount": 45.5,
      "date": "2026-01-10",
      "time": "14:30",
      "category": "Office Supplies",
      "currency": "USD",
      "notes": "Urgent purchase for Q1 inventory",
      "source": "android",
      "createdBy": "user_789",
      "createdByName": "John Cashier",
      "createdByRole": "employee",
      "status": "pending"
    }
  }
}
```

**Auto-Approval Logic:**

- If `createdByRole === "admin"`, expense is auto-approved
- If `source === "admin"` or `source === "mobile-admin"`, expense is auto-approved
- Otherwise, status is "pending" and requires manager approval

---

#### 4. POST Edit Expense

**Endpoint:** `POST /api/mobile?action=edit-expense`

**Required:**

- `id`: String (expense ID)

**Optional (update only provided fields):**

- `description`: String
- `amount`: Number
- `date`: String
- `time`: String
- `category`: String
- `currency`: String
- `notes`: String

**Permissions:**

- **Employees**: Can only edit expenses with status "pending"
- **Admins**: Can edit any expense

**Request:**

```json
{
  "id": "exp_12345",
  "description": "Updated description",
  "amount": 50.0,
  "category": "General",
  "notes": "Updated notes"
}
```

**Response:**

```json
{
  "success": true,
  "action": "edit-expense",
  "data": {
    "expense": {
      "id": "exp_12345",
      "description": "Updated description",
      "amount": 50.0,
      "category": "General",
      "notes": "Updated notes"
    }
  }
}
```

---

#### 5. POST/DELETE Delete Expense

**Option 1: POST Method**

**Endpoint:** `POST /api/mobile?action=delete-expense`

**Request:**

```json
{
  "id": "exp_12345"
}
```

**Option 2: DELETE Method (RESTful)**

**Endpoint:** `DELETE /api/mobile?action=delete-expense&id=exp_12345`

**Response:**

```json
{
  "success": true,
  "action": "delete-expense",
  "message": "Expense deleted successfully"
}
```

**Permissions:**

- **Admins**: Can delete any expense
- **Employees**: Implementation dependent (recommend admin-only)

---

### Category Management

#### 6. GET All Expense Categories

**Endpoint:** `GET /api/mobile?action=get-expense-categories`

**Example:**

```bash
GET /api/mobile?action=get-expense-categories
```

**Response:**

```json
{
  "success": true,
  "action": "get-expense-categories",
  "generated_at": "2026-01-10T10:00:00.000Z",
  "data": [
    {
      "id": "cat_001",
      "name": "Office Supplies",
      "description": "Office equipment and supplies",
      "active": true,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "cat_002",
      "name": "Travel",
      "description": "Travel and accommodation",
      "active": true,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

**Permissions:**

- All authenticated users can read categories

---

#### 7. GET Single Category

**Endpoint:** `GET /api/mobile?action=get-expense-category&id={categoryId}`

**Example:**

```bash
GET /api/mobile?action=get-expense-category&id=cat_001
```

**Response:**

```json
{
  "success": true,
  "action": "get-expense-category",
  "generated_at": "2026-01-10T10:00:00.000Z",
  "data": {
    "id": "cat_001",
    "name": "Office Supplies",
    "description": "Office equipment and supplies",
    "active": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

---

#### 8. POST Create Category (Admin Only)

**Endpoint:** `POST /api/mobile?action=create-expense-category`

**Required:**

- `name`: String

**Optional:**

- `description`: String
- `active`: Boolean (default: true)

**Request:**

```json
{
  "name": "Marketing",
  "description": "Marketing and advertising expenses",
  "active": true
}
```

**Response:**

```json
{
  "success": true,
  "action": "create-expense-category",
  "message": "Expense category created successfully",
  "data": {
    "id": "cat_new123",
    "name": "Marketing",
    "description": "Marketing and advertising expenses",
    "active": true,
    "createdAt": "2026-01-10T10:00:00.000Z",
    "updatedAt": "2026-01-10T10:00:00.000Z"
  }
}
```

**Permissions:**

- **Admin only**

---

#### 9. POST Edit Category (Admin Only)

**Endpoint:** `POST /api/mobile?action=edit-expense-category`

**Required:**

- `categoryId`: String

**Optional:**

- `name`: String
- `description`: String
- `active`: Boolean

**Request:**

```json
{
  "categoryId": "cat_001",
  "name": "Office Equipment",
  "description": "Updated description",
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
    "id": "cat_001",
    "name": "Office Equipment",
    "description": "Updated description",
    "active": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-10T10:00:00.000Z"
  }
}
```

**Permissions:**

- **Admin only**

---

#### 10. POST Delete Category (Admin Only)

**Endpoint:** `POST /api/mobile?action=delete-expense-category`

**Request:**

```json
{
  "categoryId": "cat_001"
}
```

**Response:**

```json
{
  "success": true,
  "action": "delete-expense-category",
  "message": "Category deleted successfully"
}
```

**Error (if in use):**

```json
{
  "success": false,
  "error": "Cannot delete category. It is being used by 5 expense(s)"
}
```

**Permissions:**

- **Admin only**
- Cannot delete if category is being used by any expenses

---

### Approval Workflow

#### 11. POST Approve Expense (Admin Only)

**Endpoint:** `POST /api/mobile?action=approve-expense`

**Required:**

- `expenseId`: String
- `approvedBy`: String (user ID)

**Optional:**

- `approvedByName`: String (default: "Admin")
- `notes`: String (approval notes)

**Request:**

```json
{
  "expenseId": "exp_12345",
  "approvedBy": "admin_001",
  "approvedByName": "Jane Manager",
  "notes": "Approved for Q1 budget"
}
```

**Response:**

```json
{
  "success": true,
  "action": "approve-expense",
  "message": "Expense approved successfully",
  "data": {
    "expense": {
      "id": "exp_12345",
      "status": "approved",
      "approvedBy": "admin_001",
      "approvedByName": "Jane Manager",
      "approvedAt": "2026-01-10T15:00:00.000Z",
      "approvalNotes": "Approved for Q1 budget"
    }
  }
}
```

**Permissions:**

- **Admin only**
- Can only approve expenses with status "pending"

---

#### 12. POST Deny Expense (Admin Only)

**Endpoint:** `POST /api/mobile?action=deny-expense`

**Required:**

- `expenseId`: String
- `deniedBy`: String (user ID)

**Optional:**

- `deniedByName`: String (default: "Admin")
- `notes`: String (denial reason)

**Request:**

```json
{
  "expenseId": "exp_12345",
  "deniedBy": "admin_001",
  "deniedByName": "Jane Manager",
  "notes": "Exceeds budget limit"
}
```

**Response:**

```json
{
  "success": true,
  "action": "deny-expense",
  "message": "Expense denied successfully",
  "data": {
    "expense": {
      "id": "exp_12345",
      "status": "denied",
      "approvedBy": "admin_001",
      "approvedByName": "Jane Manager",
      "approvedAt": "2026-01-10T15:00:00.000Z",
      "approvalNotes": "Exceeds budget limit"
    }
  }
}
```

**Permissions:**

- **Admin only**
- Can only deny expenses with status "pending"

---

## 🎨 Data Models (Kotlin)

### Expense Models

```kotlin
// Expense.kt
data class Expense(
    val id: String = "",
    val description: String = "",
    val amount: Double = 0.0,
    val date: String = "",
    val time: String = "",
    val category: String = "Uncategorized",
    val currency: String = "USD",
    val notes: String? = null,
    val source: String = "POS",

    // Creator tracking
    val createdBy: String? = null,
    val createdByName: String = "Unknown",
    val createdByRole: String = "employee",

    // Employee info
    val employeeId: String? = null,
    val employeeName: String = "Unknown",

    // Approval workflow
    val status: String = "pending",
    val approvedBy: String? = null,
    val approvedByName: String? = null,
    val approvedAt: String? = null,
    val approvalNotes: String? = null,

    // Timestamps
    val createdAt: String = "",
    val updatedAt: String? = null
) {
    // Helper: Format currency
    fun getFormattedAmount(): String {
        return when (currency) {
            "USD" -> "$%.2f".format(amount)
            "EUR" -> "€%.2f".format(amount)
            "GBP" -> "£%.2f".format(amount)
            "JPY" -> "¥%.0f".format(amount)
            else -> "$currency %.2f".format(amount)
        }
    }

    // Helper: Check if editable (employees can only edit pending)
    fun isEditable(userRole: String): Boolean {
        return if (userRole == "admin") {
            true
        } else {
            status == "pending"
        }
    }

    // Helper: Check if deletable
    fun isDeletable(userRole: String): Boolean {
        return userRole == "admin"
    }
}

// Create request
data class CreateExpenseRequest(
    val description: String,
    val amount: Double,
    val date: String,
    val time: String,
    val category: String = "Uncategorized",
    val currency: String = "USD",
    val notes: String? = null,
    val source: String = "android",
    val createdBy: String? = null,
    val createdByName: String? = null,
    val createdByRole: String = "employee",
    val employeeId: String? = null,
    val employeeName: String? = null
)

// Edit request
data class EditExpenseRequest(
    val id: String,
    val description: String? = null,
    val amount: Double? = null,
    val date: String? = null,
    val time: String? = null,
    val category: String? = null,
    val currency: String? = null,
    val notes: String? = null
)

// Delete request
data class DeleteExpenseRequest(
    val id: String
)

// Expenses list response
data class ExpensesResponse(
    val expenses: List<Expense>,
    val total: Double,
    val pendingTotal: Double,
    val totalsByCurrency: Map<String, Double>,
    val pendingByCurrency: Map<String, Double>,
    val count: Int,
    val pendingCount: Int,
    val approvedCount: Int,
    val deniedCount: Int
)
```

### Category Models

```kotlin
// ExpenseCategory.kt
data class ExpenseCategory(
    val id: String = "",
    val name: String = "",
    val description: String = "",
    val active: Boolean = true,
    val createdAt: String = "",
    val updatedAt: String = ""
)

// Create category request
data class CreateCategoryRequest(
    val name: String,
    val description: String = "",
    val active: Boolean = true
)

// Edit category request
data class EditCategoryRequest(
    val categoryId: String,
    val name: String? = null,
    val description: String? = null,
    val active: Boolean? = null
)

// Delete category request
data class DeleteCategoryRequest(
    val categoryId: String
)
```

### Approval Models

```kotlin
// ApproveExpenseRequest.kt
data class ApproveExpenseRequest(
    val expenseId: String,
    val approvedBy: String,
    val approvedByName: String = "Admin",
    val notes: String? = null
)

// DenyExpenseRequest.kt
data class DenyExpenseRequest(
    val expenseId: String,
    val deniedBy: String,
    val deniedByName: String = "Admin",
    val notes: String? = null
)
```

### API Response Wrapper

```kotlin
// ApiResponse.kt
data class ApiResponse<T>(
    val success: Boolean,
    val action: String? = null,
    val message: String? = null,
    val data: T? = null,
    val error: String? = null,
    val generated_at: String? = null
)
```

---

## 🔌 API Service Interface

```kotlin
// ExpenseApiService.kt
import retrofit2.http.*

interface ExpenseApiService {

    // ==================== EXPENSE OPERATIONS ====================

    @GET("/api/mobile")
    suspend fun getExpenses(
        @Query("action") action: String = "get-expenses",
        @Query("start_date") startDate: String? = null,
        @Query("end_date") endDate: String? = null,
        @Query("status") status: String? = null,
        @Query("category") category: String? = null,
        @Query("userId") userId: String? = null,
        @Query("source") source: String? = null,
        @Query("currency") currency: String? = null,
        @Query("search") search: String? = null
    ): ApiResponse<ExpensesResponse>

    @GET("/api/mobile")
    suspend fun getExpense(
        @Query("action") action: String = "get-expense",
        @Query("id") id: String
    ): ApiResponse<Expense>

    @POST("/api/mobile?action=create-expense")
    suspend fun createExpense(
        @Body request: CreateExpenseRequest
    ): ApiResponse<ExpenseWrapper>

    @POST("/api/mobile?action=edit-expense")
    suspend fun editExpense(
        @Body request: EditExpenseRequest
    ): ApiResponse<ExpenseWrapper>

    @POST("/api/mobile?action=delete-expense")
    suspend fun deleteExpense(
        @Body request: DeleteExpenseRequest
    ): ApiResponse<Unit>

    @DELETE("/api/mobile")
    suspend fun deleteExpenseAlt(
        @Query("action") action: String = "delete-expense",
        @Query("id") id: String
    ): ApiResponse<Unit>

    // ==================== CATEGORY OPERATIONS ====================

    @GET("/api/mobile")
    suspend fun getExpenseCategories(
        @Query("action") action: String = "get-expense-categories"
    ): ApiResponse<List<ExpenseCategory>>

    @GET("/api/mobile")
    suspend fun getExpenseCategory(
        @Query("action") action: String = "get-expense-category",
        @Query("id") id: String
    ): ApiResponse<ExpenseCategory>

    @POST("/api/mobile?action=create-expense-category")
    suspend fun createExpenseCategory(
        @Body request: CreateCategoryRequest
    ): ApiResponse<ExpenseCategory>

    @POST("/api/mobile?action=edit-expense-category")
    suspend fun editExpenseCategory(
        @Body request: EditCategoryRequest
    ): ApiResponse<ExpenseCategory>

    @POST("/api/mobile?action=delete-expense-category")
    suspend fun deleteExpenseCategory(
        @Body request: DeleteCategoryRequest
    ): ApiResponse<Unit>

    // ==================== APPROVAL OPERATIONS ====================

    @POST("/api/mobile?action=approve-expense")
    suspend fun approveExpense(
        @Body request: ApproveExpenseRequest
    ): ApiResponse<ExpenseWrapper>

    @POST("/api/mobile?action=deny-expense")
    suspend fun denyExpense(
        @Body request: DenyExpenseRequest
    ): ApiResponse<ExpenseWrapper>
}

// Wrapper for single expense response
data class ExpenseWrapper(
    val expense: Expense
)
```

---

## 📝 Request/Response Examples

### Example 1: Create Expense (Employee)

**Request:**

```kotlin
val request = CreateExpenseRequest(
    description = "Office supplies - printer paper",
    amount = 45.50,
    date = "2026-01-10",
    time = "14:30",
    category = "Office Supplies",
    currency = "USD",
    notes = "Urgent purchase",
    source = "android",
    createdBy = currentUser.id,
    createdByName = currentUser.name,
    createdByRole = "employee"
)

val response = expenseApiService.createExpense(request)
```

**Response:**

```json
{
  "success": true,
  "action": "create-expense",
  "data": {
    "expense": {
      "id": "exp_new123",
      "description": "Office supplies - printer paper",
      "amount": 45.5,
      "status": "pending"
    }
  }
}
```

---

### Example 2: Filter Expenses (Admin)

**Request:**

```kotlin
val response = expenseApiService.getExpenses(
    startDate = "2026-01-01",
    endDate = "2026-01-31",
    status = "pending",
    currency = "USD"
)
```

**Response:**

```json
{
  "success": true,
  "data": {
    "expenses": [...],
    "count": 25,
    "pendingCount": 10,
    "approvedCount": 15,
    "totalsByCurrency": {
      "USD": 1250.50,
      "EUR": 890.00
    }
  }
}
```

---

### Example 3: Approve Expense (Admin)

**Request:**

```kotlin
val request = ApproveExpenseRequest(
    expenseId = "exp_12345",
    approvedBy = currentUser.id,
    approvedByName = currentUser.name,
    notes = "Approved for Q1 budget"
)

val response = expenseApiService.approveExpense(request)
```

**Response:**

```json
{
  "success": true,
  "action": "approve-expense",
  "message": "Expense approved successfully",
  "data": {
    "expense": {
      "id": "exp_12345",
      "status": "approved",
      "approvedBy": "admin_001",
      "approvedAt": "2026-01-10T15:00:00.000Z"
    }
  }
}
```

---

### Example 4: Search Expenses

**Request:**

```kotlin
val response = expenseApiService.getExpenses(
    search = "printer",
    category = "Office Supplies"
)
```

**Response:**

```json
{
  "success": true,
  "data": {
    "expenses": [
      {
        "id": "exp_001",
        "description": "Office supplies - printer paper",
        "amount": 45.5
      },
      {
        "id": "exp_002",
        "description": "Printer ink cartridges",
        "amount": 89.99
      }
    ],
    "count": 2
  }
}
```

---

## ⚠️ Error Handling

### Common Error Responses

#### 1. Authentication Error

```json
{
  "success": false,
  "error": "Missing or invalid authorization header"
}
```

#### 2. Permission Error

```json
{
  "success": false,
  "error": "Admin access required"
}
```

#### 3. Validation Error

```json
{
  "success": false,
  "error": "Description is required"
}
```

#### 4. Not Found Error

```json
{
  "success": false,
  "error": "Expense not found"
}
```

#### 5. Already Processed Error

```json
{
  "success": false,
  "error": "Expense has already been approved"
}
```

#### 6. Category In Use Error

```json
{
  "success": false,
  "error": "Cannot delete category. It is being used by 5 expense(s)"
}
```

### Error Handling in Kotlin

```kotlin
// Repository
class ExpenseRepository(private val apiService: ExpenseApiService) {

    suspend fun createExpense(request: CreateExpenseRequest): Result<Expense> {
        return try {
            val response = apiService.createExpense(request)
            if (response.success && response.data != null) {
                Result.success(response.data.expense)
            } else {
                Result.failure(Exception(response.error ?: "Unknown error"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getExpenses(
        startDate: String? = null,
        endDate: String? = null,
        status: String? = null,
        category: String? = null
    ): Result<ExpensesResponse> {
        return try {
            val response = apiService.getExpenses(
                startDate = startDate,
                endDate = endDate,
                status = status,
                category = category
            )
            if (response.success && response.data != null) {
                Result.success(response.data)
            } else {
                Result.failure(Exception(response.error ?: "Failed to fetch expenses"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

// ViewModel
class ExpenseViewModel(private val repository: ExpenseRepository) : ViewModel() {

    val expenses = MutableLiveData<List<Expense>>()
    val error = MutableLiveData<String>()
    val loading = MutableLiveData<Boolean>()

    fun loadExpenses(
        startDate: String? = null,
        endDate: String? = null,
        status: String? = null
    ) {
        viewModelScope.launch {
            loading.value = true
            repository.getExpenses(startDate, endDate, status).fold(
                onSuccess = { response ->
                    expenses.value = response.expenses
                    loading.value = false
                },
                onFailure = { exception ->
                    error.value = exception.message ?: "Failed to load expenses"
                    loading.value = false
                }
            )
        }
    }

    fun createExpense(request: CreateExpenseRequest) {
        viewModelScope.launch {
            loading.value = true
            repository.createExpense(request).fold(
                onSuccess = { expense ->
                    // Refresh list
                    loadExpenses()
                    loading.value = false
                },
                onFailure = { exception ->
                    error.value = exception.message ?: "Failed to create expense"
                    loading.value = false
                }
            )
        }
    }
}
```

---

## 🧪 Testing Guide

### Test Scenario 1: Employee Creates Expense

```kotlin
@Test
fun testEmployeeCreateExpense() = runBlocking {
    // Given
    val request = CreateExpenseRequest(
        description = "Test expense",
        amount = 100.0,
        date = "2026-01-10",
        time = "14:30",
        category = "Office Supplies",
        currency = "USD",
        source = "android",
        createdByRole = "employee"
    )

    // When
    val result = repository.createExpense(request)

    // Then
    assertTrue(result.isSuccess)
    val expense = result.getOrNull()
    assertNotNull(expense)
    assertEquals("pending", expense?.status)
}
```

### Test Scenario 2: Admin Approves Expense

```kotlin
@Test
fun testAdminApproveExpense() = runBlocking {
    // Given
    val expenseId = "exp_12345"
    val request = ApproveExpenseRequest(
        expenseId = expenseId,
        approvedBy = "admin_001",
        approvedByName = "Test Admin",
        notes = "Approved"
    )

    // When
    val result = repository.approveExpense(request)

    // Then
    assertTrue(result.isSuccess)
    val expense = result.getOrNull()
    assertEquals("approved", expense?.status)
    assertNotNull(expense?.approvedAt)
}
```

### Test Scenario 3: Filter Expenses by Multiple Criteria

```kotlin
@Test
fun testFilterExpenses() = runBlocking {
    // When
    val result = repository.getExpenses(
        startDate = "2026-01-01",
        endDate = "2026-01-31",
        status = "approved",
        category = "Office Supplies"
    )

    // Then
    assertTrue(result.isSuccess)
    val response = result.getOrNull()
    assertNotNull(response)
    assertTrue(response!!.expenses.all { it.status == "approved" })
    assertTrue(response.expenses.all { it.category == "Office Supplies" })
}
```

### Test Scenario 4: Employee Cannot Edit Approved Expense

```kotlin
@Test
fun testEmployeeCannotEditApprovedExpense() = runBlocking {
    // Given
    val request = EditExpenseRequest(
        id = "exp_approved",
        description = "Updated description"
    )

    // When
    val result = repository.editExpense(request)

    // Then
    assertTrue(result.isFailure)
    assertTrue(result.exceptionOrNull()?.message?.contains("approved") == true)
}
```

---

## 📋 Summary Checklist

### ✅ Requirements Coverage

1. **Currency** ✅

   - ✅ Ability to select currency (15+ supported)
   - ✅ Store currency per expense
   - ✅ Default shop currency (USD)
   - ✅ Multi-currency totals

2. **Expense Categories** ✅

   - ✅ Categories created and managed separately
   - ✅ Select category from dropdown when adding expense
   - ✅ Filter by category
   - ✅ Report by category
   - ✅ Prevent deletion if in use

3. **User/Source Tracking** ✅

   - ✅ Store who inserted (user ID + name + role)
   - ✅ Show if from POS or BackOffice
   - ✅ Track employee who created it
   - ✅ Distinguish between POS and BackOffice

4. **Permissions** ✅

   - ✅ POS users can only add expenses
   - ✅ Admin can view, edit, delete, approve, deny
   - ✅ Employees can only edit pending expenses
   - ✅ Role-based access control

5. **Notes** ✅

   - ✅ Internal notes field
   - ✅ Separate from description
   - ✅ Optional field

6. **Filters & Search** ✅
   - ✅ Filter by category
   - ✅ Filter by date range
   - ✅ Filter by user
   - ✅ Filter by source (POS/BackOffice)
   - ✅ Filter by status (pending/approved/denied)
   - ✅ Filter by currency
   - ✅ Text search on description

---

## 📞 Support & Contact

For API issues or questions:

- Backend API: `/api/mobile`
- Authentication: JWT tokens required
- Error reporting: Check `success` field in response

---

**Document Version:** 1.0  
**Last Updated:** January 10, 2026  
**API Version:** Compatible with POS Candy Kush v2.0+
