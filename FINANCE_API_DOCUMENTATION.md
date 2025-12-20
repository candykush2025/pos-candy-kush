# Finance API Documentation

Complete API reference for Purchasing and Expense management in POS Candy Kush mobile app.

**Base URL:** `https://pos-candy-kush.vercel.app/api/mobile`

**API Version:** 1.0

**Last Updated:** December 20, 2025

---

## Table of Contents

1. [Authentication](#authentication)
2. [Purchases API](#purchases-api)
   - [Get All Purchases](#get-all-purchases)
   - [Get Purchase by ID](#get-purchase-by-id)
   - [Create Purchase](#create-purchase)
   - [Edit Purchase](#edit-purchase)
   - [Delete Purchase](#delete-purchase)
   - [Complete Purchase](#complete-purchase)
3. [Expenses API](#expenses-api)
   - [Get All Expenses](#get-all-expenses)
   - [Get Expense by ID](#get-expense-by-id)
   - [Create Expense](#create-expense)
   - [Edit Expense](#edit-expense)
   - [Delete Expense](#delete-expense)
4. [Invoices API (Enhanced)](#invoices-api-enhanced)
   - [Delete Invoice](#delete-invoice)
5. [Items/Products API](#itemsproducts-api)
   - [Get All Items](#get-all-items)
6. [Categories API](#categories-api)
   - [Get All Categories](#get-all-categories)
7. [Error Handling](#error-handling)
8. [Android Integration Guide](#android-integration-guide)
9. [Testing](#testing)

---

## Authentication

All Finance API endpoints (except login) require JWT authentication.

### Login

**Endpoint:** `POST /api/mobile?action=login`

**Request Body:**

```json
{
  "email": "admin@candykush.com",
  "password": "admin123"
}
```

**Response:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "uid": "abc123",
    "email": "admin@candykush.com",
    "role": "admin",
    "name": "Admin User"
  }
}
```

**Using the Token:**

Include the JWT token in the Authorization header for all subsequent requests:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Purchases API

### Get All Purchases

Retrieve a list of all purchase orders.

**Endpoint:** `GET /api/mobile?action=get-purchases`

**Headers:**

```
Authorization: Bearer {token}
```

**Response:**

```json
{
  "success": true,
  "action": "get-purchases",
  "generated_at": "2025-12-20T10:30:00.000Z",
  "data": {
    "purchases": [
      {
        "id": "purchase_123",
        "supplier_name": "ABC Suppliers Inc.",
        "purchase_date": "2025-12-20",
        "due_date": "2025-12-27",
        "items": [
          {
            "product_id": "prod_001",
            "product_name": "USB Cable",
            "quantity": 10,
            "price": 5.0,
            "total": 50.0
          }
        ],
        "total": 50.0,
        "status": "pending",
        "reminder_type": "days_before",
        "reminder_value": "3",
        "reminder_time": "09:00",
        "createdAt": "2025-12-20T08:15:00.000Z"
      }
    ]
  }
}
```

**Purchase Status:**

- `pending` - Purchase order not yet completed
- `completed` - Purchase order has been received/completed

**Reminder Types:**

- `no_reminder` - No notification scheduled
- `days_before` - Remind X days before due date (e.g., "3" days before)
- `specific_date` - Remind on specific date (e.g., "2025-12-25")

---

### Get Purchase by ID

Retrieve a single purchase order by its ID.

**Endpoint:** `GET /api/mobile?action=get-purchase&id={purchaseId}`

**Headers:**

```
Authorization: Bearer {token}
```

**Parameters:**

- `id` (required): Purchase ID

**Response:**

```json
{
  "success": true,
  "action": "get-purchase",
  "generated_at": "2025-12-20T10:30:00.000Z",
  "data": {
    "id": "purchase_123",
    "supplier_name": "ABC Suppliers Inc.",
    "purchase_date": "2025-12-20",
    "due_date": "2025-12-27",
    "items": [
      {
        "product_id": "prod_001",
        "product_name": "USB Cable",
        "quantity": 10,
        "price": 5.0,
        "total": 50.0
      }
    ],
    "total": 50.0,
    "status": "pending",
    "reminder_type": "days_before",
    "reminder_value": "3",
    "reminder_time": "09:00",
    "createdAt": "2025-12-20T08:15:00.000Z"
  }
}
```

**Error Response (Purchase Not Found):**

```json
{
  "success": false,
  "error": "Purchase not found"
}
```

---

### Create Purchase

Create a new purchase order.

**Endpoint:** `POST /api/mobile?action=create-purchase`

**Headers:**

```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**

```json
{
  "supplier_name": "ABC Suppliers Inc.",
  "purchase_date": "2025-12-20",
  "due_date": "2025-12-27",
  "items": [
    {
      "product_id": "prod_001",
      "product_name": "USB Cable",
      "quantity": 10,
      "price": 5.0,
      "total": 50.0
    },
    {
      "product_id": "prod_002",
      "product_name": "HDMI Cable",
      "quantity": 5,
      "price": 10.0,
      "total": 50.0
    }
  ],
  "total": 100.0,
  "reminder_type": "days_before",
  "reminder_value": "3",
  "reminder_time": "09:00"
}
```

**Required Fields:**

- `supplier_name` (string): Name of the supplier
- `purchase_date` (string): Date of purchase order (YYYY-MM-DD)
- `due_date` (string): Due date for delivery (YYYY-MM-DD)
- `items` (array): Array of purchase items (at least 1 item required)
  - `product_id` (string): Product ID
  - `product_name` (string): Product name
  - `quantity` (number): Quantity ordered
  - `price` (number): Price per unit
  - `total` (number): Total for this item (quantity × price)
- `total` (number): Total purchase amount

**Optional Fields:**

- `reminder_type` (string): Type of reminder ("no_reminder", "days_before", "specific_date")
- `reminder_value` (string): Depends on reminder_type:
  - For "days_before": Number of days (e.g., "3")
  - For "specific_date": Date in YYYY-MM-DD format
- `reminder_time` (string): Time for reminder in HH:mm format (e.g., "09:00")

**Response:**

```json
{
  "success": true,
  "action": "create-purchase",
  "data": {
    "purchase": {
      "id": "purchase_124",
      "supplier_name": "ABC Suppliers Inc.",
      "purchase_date": "2025-12-20",
      "due_date": "2025-12-27",
      "items": [
        {
          "product_id": "prod_001",
          "product_name": "USB Cable",
          "quantity": 10,
          "price": 5.0,
          "total": 50.0
        }
      ],
      "total": 100.0,
      "status": "pending",
      "reminder_type": "days_before",
      "reminder_value": "3",
      "reminder_time": "09:00"
    }
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Supplier name is required"
}
```

---

### Edit Purchase

Update an existing purchase order.

**Endpoint:** `POST /api/mobile?action=edit-purchase`

**Headers:**

```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**

```json
{
  "id": "purchase_123",
  "supplier_name": "Updated Supplier Name",
  "total": 150.0,
  "items": [
    {
      "product_id": "prod_001",
      "product_name": "Updated Product",
      "quantity": 15,
      "price": 10.0,
      "total": 150.0
    }
  ]
}
```

**Required Fields:**

- `id` (string): Purchase ID to update

**Optional Fields:** (any field can be updated)

- `supplier_name` (string)
- `purchase_date` (string)
- `due_date` (string)
- `items` (array)
- `total` (number)
- `status` (string)
- `reminder_type` (string)
- `reminder_value` (string)
- `reminder_time` (string)

**Response:**

```json
{
  "success": true,
  "action": "edit-purchase",
  "data": {
    "purchase": {
      "id": "purchase_123",
      "supplier_name": "Updated Supplier Name",
      "purchase_date": "2025-12-20",
      "due_date": "2025-12-27",
      "items": [
        {
          "product_id": "prod_001",
          "product_name": "Updated Product",
          "quantity": 15,
          "price": 10.0,
          "total": 150.0
        }
      ],
      "total": 150.0,
      "status": "pending",
      "reminder_type": "days_before",
      "reminder_value": "3",
      "reminder_time": "09:00"
    }
  }
}
```

---

### Delete Purchase

Delete a purchase order (POST method).

**Endpoint:** `POST /api/mobile?action=delete-purchase`

**Headers:**

```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**

```json
{
  "id": "purchase_123"
}
```

**Response:**

```json
{
  "success": true,
  "action": "delete-purchase",
  "message": "Purchase deleted successfully"
}
```

**Alternative: DELETE Method**

**Endpoint:** `DELETE /api/mobile?action=delete-purchase&id={purchaseId}`

**Headers:**

```
Authorization: Bearer {token}
```

**Response:**

```json
{
  "success": true,
  "action": "delete-purchase",
  "message": "Purchase deleted successfully"
}
```

---

### Complete Purchase

Mark a purchase order as completed (received).

**Endpoint:** `POST /api/mobile?action=complete-purchase`

**Headers:**

```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**

```json
{
  "id": "purchase_123"
}
```

**Response:**

```json
{
  "success": true,
  "action": "complete-purchase",
  "data": {
    "purchase": {
      "id": "purchase_123",
      "supplier_name": "ABC Suppliers Inc.",
      "purchase_date": "2025-12-20",
      "due_date": "2025-12-27",
      "items": [
        {
          "product_id": "prod_001",
          "product_name": "USB Cable",
          "quantity": 10,
          "price": 5.0,
          "total": 50.0
        }
      ],
      "total": 50.0,
      "status": "completed",
      "reminder_type": "days_before",
      "reminder_value": "3",
      "reminder_time": "09:00"
    }
  }
}
```

---

## Expenses API

### Get All Expenses

Retrieve a list of all expenses with optional date filtering.

**Endpoint:** `GET /api/mobile?action=get-expenses`

**Headers:**

```
Authorization: Bearer {token}
```

**Optional Query Parameters:**

- `start_date` (string): Filter expenses from this date (YYYY-MM-DD)
- `end_date` (string): Filter expenses up to this date (YYYY-MM-DD)

**Example:**

```
GET /api/mobile?action=get-expenses&start_date=2025-12-01&end_date=2025-12-31
```

**Response:**

```json
{
  "success": true,
  "action": "get-expenses",
  "generated_at": "2025-12-20T10:30:00.000Z",
  "data": {
    "expenses": [
      {
        "id": "expense_123",
        "description": "Office supplies - printer paper and ink",
        "amount": 45.5,
        "date": "2025-12-20",
        "time": "14:30",
        "createdAt": "2025-12-20T14:30:00.000Z"
      },
      {
        "id": "expense_124",
        "description": "Monthly rent payment",
        "amount": 2000.0,
        "date": "2025-12-01",
        "time": "09:00",
        "createdAt": "2025-12-01T09:00:00.000Z"
      }
    ],
    "total": 2045.5,
    "count": 2
  }
}
```

---

### Get Expense by ID

Retrieve a single expense by its ID.

**Endpoint:** `GET /api/mobile?action=get-expense&id={expenseId}`

**Headers:**

```
Authorization: Bearer {token}
```

**Parameters:**

- `id` (required): Expense ID

**Response:**

```json
{
  "success": true,
  "action": "get-expense",
  "generated_at": "2025-12-20T10:30:00.000Z",
  "data": {
    "id": "expense_123",
    "description": "Office supplies - printer paper and ink",
    "amount": 45.5,
    "date": "2025-12-20",
    "time": "14:30",
    "createdAt": "2025-12-20T14:30:00.000Z"
  }
}
```

**Error Response (Expense Not Found):**

```json
{
  "success": false,
  "error": "Expense not found"
}
```

---

### Create Expense

Create a new expense record.

**Endpoint:** `POST /api/mobile?action=create-expense`

**Headers:**

```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**

```json
{
  "description": "Office supplies - printer paper and ink",
  "amount": 45.5,
  "date": "2025-12-20",
  "time": "14:30"
}
```

**Required Fields:**

- `description` (string): Description of the expense
- `amount` (number): Expense amount (must be non-negative)
- `date` (string): Date of expense (YYYY-MM-DD)
- `time` (string): Time of expense (HH:mm format)

**Response:**

```json
{
  "success": true,
  "action": "create-expense",
  "data": {
    "expense": {
      "id": "expense_125",
      "description": "Office supplies - printer paper and ink",
      "amount": 45.5,
      "date": "2025-12-20",
      "time": "14:30"
    }
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Amount must be a non-negative number"
}
```

---

### Edit Expense

Update an existing expense.

**Endpoint:** `POST /api/mobile?action=edit-expense`

**Headers:**

```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**

```json
{
  "id": "expense_123",
  "description": "Updated expense description",
  "amount": 60.0
}
```

**Required Fields:**

- `id` (string): Expense ID to update

**Optional Fields:** (any field can be updated)

- `description` (string)
- `amount` (number)
- `date` (string)
- `time` (string)

**Response:**

```json
{
  "success": true,
  "action": "edit-expense",
  "data": {
    "expense": {
      "id": "expense_123",
      "description": "Updated expense description",
      "amount": 60.0,
      "date": "2025-12-20",
      "time": "14:30"
    }
  }
}
```

---

### Delete Expense

Delete an expense record (POST method).

**Endpoint:** `POST /api/mobile?action=delete-expense`

**Headers:**

```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**

```json
{
  "id": "expense_123"
}
```

**Response:**

```json
{
  "success": true,
  "action": "delete-expense",
  "message": "Expense deleted successfully"
}
```

**Alternative: DELETE Method**

**Endpoint:** `DELETE /api/mobile?action=delete-expense&id={expenseId}`

**Headers:**

```
Authorization: Bearer {token}
```

**Response:**

```json
{
  "success": true,
  "action": "delete-expense",
  "message": "Expense deleted successfully"
}
```

---

## Invoices API (Enhanced)

### Delete Invoice

Delete an invoice (new DELETE method support).

**Endpoint:** `DELETE /api/mobile?action=delete-invoice&id={invoiceId}`

**Headers:**

```
Authorization: Bearer {token}
```

**Parameters:**

- `id` (required): Invoice ID

**Response:**

```json
{
  "success": true,
  "action": "delete-invoice",
  "message": "Invoice deleted successfully"
}
```

**Error Response (Invoice Not Found):**

```json
{
  "success": false,
  "error": "Invoice not found"
}
```

**Error Response (Missing ID):**

```json
{
  "success": false,
  "error": "Invoice ID is required"
}
```

---

## Error Handling

### HTTP Status Codes

- `200` - Success (includes business logic errors with `success: false`)
- `400` - Bad Request (validation errors, missing parameters)
- `401` - Unauthorized (invalid or missing JWT token)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

### Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### Common Errors

**Missing Authentication:**

```json
{
  "success": false,
  "error": "Unauthorized: Invalid or missing token"
}
```

**Validation Error:**

```json
{
  "success": false,
  "error": "Supplier name is required"
}
```

**Resource Not Found:**

```json
{
  "success": false,
  "error": "Purchase not found"
}
```

**Invalid Action:**

```json
{
  "success": false,
  "error": "Invalid action for POST method",
  "valid_post_actions": [
    "login",
    "edit-product-cost",
    "create-invoice",
    "edit-invoice",
    "create-purchase",
    "edit-purchase",
    "delete-purchase",
    "complete-purchase",
    "create-expense",
    "edit-expense",
    "delete-expense"
  ]
}
```

---

## Android Integration Guide

### Setup Dependencies

Add to `app/build.gradle`:

```gradle
dependencies {
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    implementation 'com.google.code.gson:gson:2.10.1'
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
}
```

### Data Models

```kotlin
// Purchase.kt
data class Purchase(
    val id: String = "",
    val supplier_name: String = "",
    val purchase_date: String = "",
    val due_date: String = "",
    val items: List<PurchaseItem> = emptyList(),
    val total: Double = 0.0,
    val status: String = "pending", // "pending" or "completed"
    val reminder_type: String = "no_reminder",
    val reminder_value: String = "",
    val reminder_time: String = "",
    val createdAt: String = ""
)

data class PurchaseItem(
    val product_id: String = "",
    val product_name: String = "",
    val quantity: Int = 0,
    val price: Double = 0.0,
    val total: Double = 0.0
)

// Expense.kt
data class Expense(
    val id: String = "",
    val description: String = "",
    val amount: Double = 0.0,
    val date: String = "",
    val time: String = "",
    val createdAt: String = ""
)

// API Response wrappers
data class PurchasesResponse(
    val success: Boolean,
    val action: String?,
    val data: PurchasesData?,
    val error: String?
)

data class PurchasesData(
    val purchases: List<Purchase>
)

data class ExpensesResponse(
    val success: Boolean,
    val action: String?,
    val data: ExpensesData?,
    val error: String?
)

data class ExpensesData(
    val expenses: List<Expense>,
    val total: Double,
    val count: Int
)
```

### API Service

```kotlin
// PurchaseApiService.kt
class PurchaseApiService {
    private val client = OkHttpClient()
    private val gson = Gson()
    private val baseUrl = "https://pos-candy-kush.vercel.app/api/mobile"

    suspend fun getPurchases(token: String): PurchasesResponse? {
        return withContext(Dispatchers.IO) {
            try {
                val request = Request.Builder()
                    .url("$baseUrl?action=get-purchases")
                    .addHeader("Authorization", "Bearer $token")
                    .get()
                    .build()

                val response = client.newCall(request).execute()
                val body = response.body?.string()

                if (response.isSuccessful && body != null) {
                    gson.fromJson(body, PurchasesResponse::class.java)
                } else {
                    null
                }
            } catch (e: Exception) {
                Log.e("PurchaseApiService", "Error fetching purchases", e)
                null
            }
        }
    }

    suspend fun createPurchase(token: String, purchase: Purchase): PurchasesResponse? {
        return withContext(Dispatchers.IO) {
            try {
                val json = gson.toJson(purchase)
                val requestBody = json.toRequestBody("application/json".toMediaType())

                val request = Request.Builder()
                    .url("$baseUrl?action=create-purchase")
                    .addHeader("Authorization", "Bearer $token")
                    .post(requestBody)
                    .build()

                val response = client.newCall(request).execute()
                val body = response.body?.string()

                if (body != null) {
                    gson.fromJson(body, PurchasesResponse::class.java)
                } else {
                    null
                }
            } catch (e: Exception) {
                Log.e("PurchaseApiService", "Error creating purchase", e)
                null
            }
        }
    }

    suspend fun completePurchase(token: String, purchaseId: String): PurchasesResponse? {
        return withContext(Dispatchers.IO) {
            try {
                val json = gson.toJson(mapOf("id" to purchaseId))
                val requestBody = json.toRequestBody("application/json".toMediaType())

                val request = Request.Builder()
                    .url("$baseUrl?action=complete-purchase")
                    .addHeader("Authorization", "Bearer $token")
                    .post(requestBody)
                    .build()

                val response = client.newCall(request).execute()
                val body = response.body?.string()

                if (body != null) {
                    gson.fromJson(body, PurchasesResponse::class.java)
                } else {
                    null
                }
            } catch (e: Exception) {
                Log.e("PurchaseApiService", "Error completing purchase", e)
                null
            }
        }
    }

    suspend fun deletePurchase(token: String, purchaseId: String): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                val request = Request.Builder()
                    .url("$baseUrl?action=delete-purchase&id=$purchaseId")
                    .addHeader("Authorization", "Bearer $token")
                    .delete()
                    .build()

                val response = client.newCall(request).execute()
                response.isSuccessful
            } catch (e: Exception) {
                Log.e("PurchaseApiService", "Error deleting purchase", e)
                false
            }
        }
    }
}

// ExpenseApiService.kt
class ExpenseApiService {
    private val client = OkHttpClient()
    private val gson = Gson()
    private val baseUrl = "https://pos-candy-kush.vercel.app/api/mobile"

    suspend fun getExpenses(token: String, startDate: String? = null, endDate: String? = null): ExpensesResponse? {
        return withContext(Dispatchers.IO) {
            try {
                var url = "$baseUrl?action=get-expenses"
                if (startDate != null) url += "&start_date=$startDate"
                if (endDate != null) url += "&end_date=$endDate"

                val request = Request.Builder()
                    .url(url)
                    .addHeader("Authorization", "Bearer $token")
                    .get()
                    .build()

                val response = client.newCall(request).execute()
                val body = response.body?.string()

                if (response.isSuccessful && body != null) {
                    gson.fromJson(body, ExpensesResponse::class.java)
                } else {
                    null
                }
            } catch (e: Exception) {
                Log.e("ExpenseApiService", "Error fetching expenses", e)
                null
            }
        }
    }

    suspend fun createExpense(token: String, expense: Expense): ExpensesResponse? {
        return withContext(Dispatchers.IO) {
            try {
                val json = gson.toJson(expense)
                val requestBody = json.toRequestBody("application/json".toMediaType())

                val request = Request.Builder()
                    .url("$baseUrl?action=create-expense")
                    .addHeader("Authorization", "Bearer $token")
                    .post(requestBody)
                    .build()

                val response = client.newCall(request).execute()
                val body = response.body?.string()

                if (body != null) {
                    gson.fromJson(body, ExpensesResponse::class.java)
                } else {
                    null
                }
            } catch (e: Exception) {
                Log.e("ExpenseApiService", "Error creating expense", e)
                null
            }
        }
    }

    suspend fun deleteExpense(token: String, expenseId: String): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                val request = Request.Builder()
                    .url("$baseUrl?action=delete-expense&id=$expenseId")
                    .addHeader("Authorization", "Bearer $token")
                    .delete()
                    .build()

                val response = client.newCall(request).execute()
                response.isSuccessful
            } catch (e: Exception) {
                Log.e("ExpenseApiService", "Error deleting expense", e)
                false
            }
        }
    }
}
```

### Usage Example

```kotlin
// In your Activity or ViewModel
class PurchasingActivity : AppCompatActivity() {
    private val apiService = PurchaseApiService()
    private val prefs by lazy {
        getSharedPreferences("pos_prefs", Context.MODE_PRIVATE)
    }

    private fun loadPurchases() {
        lifecycleScope.launch {
            val token = prefs.getString("jwt_token", "") ?: ""
            val response = apiService.getPurchases(token)

            if (response?.success == true) {
                val purchases = response.data?.purchases ?: emptyList()
                // Update UI with purchases
                updatePurchasesList(purchases)
            } else {
                // Handle error
                showError(response?.error ?: "Failed to load purchases")
            }
        }
    }

    private fun createNewPurchase() {
        lifecycleScope.launch {
            val token = prefs.getString("jwt_token", "") ?: ""
            val purchase = Purchase(
                supplier_name = "ABC Suppliers",
                purchase_date = "2025-12-20",
                due_date = "2025-12-27",
                items = listOf(
                    PurchaseItem(
                        product_id = "prod_001",
                        product_name = "USB Cable",
                        quantity = 10,
                        price = 5.0,
                        total = 50.0
                    )
                ),
                total = 50.0,
                reminder_type = "days_before",
                reminder_value = "3",
                reminder_time = "09:00"
            )

            val response = apiService.createPurchase(token, purchase)

            if (response?.success == true) {
                Toast.makeText(this, "Purchase created successfully", Toast.LENGTH_SHORT).show()
                loadPurchases() // Refresh list
            } else {
                showError(response?.error ?: "Failed to create purchase")
            }
        }
    }
}
```

---

## Testing

### Manual Testing with cURL

**Login:**

```bash
curl -X POST "https://pos-candy-kush.vercel.app/api/mobile?action=login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@candykush.com","password":"admin123"}'
```

**Get Purchases:**

```bash
curl -X GET "https://pos-candy-kush.vercel.app/api/mobile?action=get-purchases" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Create Purchase:**

```bash
curl -X POST "https://pos-candy-kush.vercel.app/api/mobile?action=create-purchase" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "supplier_name": "Test Supplier",
    "purchase_date": "2025-12-20",
    "due_date": "2025-12-27",
    "items": [
      {
        "product_id": "test_001",
        "product_name": "Test Product",
        "quantity": 10,
        "price": 5.0,
        "total": 50.0
      }
    ],
    "total": 50.0,
    "reminder_type": "days_before",
    "reminder_value": "3",
    "reminder_time": "09:00"
  }'
```

**Create Expense:**

```bash
curl -X POST "https://pos-candy-kush.vercel.app/api/mobile?action=create-expense" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Office supplies",
    "amount": 45.5,
    "date": "2025-12-20",
    "time": "14:30"
  }'
```

**Delete Purchase:**

```bash
curl -X DELETE "https://pos-candy-kush.vercel.app/api/mobile?action=delete-purchase&id=PURCHASE_ID" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Automated Testing

Run the Jest test suite:

```bash
npm test -- __tests__/api/finance-api.test.js
```

This will test all Finance API endpoints including:

- Authentication
- All Purchases CRUD operations
- All Expenses CRUD operations
- Invoice deletion
- Error handling
- Validation

---

## Items/Products API

### Get All Items

Retrieve a list of all products/items with category information. This endpoint returns the latest data from Firebase and includes full category details for each item.

**Endpoint:** `GET /api/mobile?action=get-items`

**Authentication:** JWT token required

**Headers:**

```
Authorization: Bearer {token}
```

**Response:**

```json
{
  "success": true,
  "action": "get-items",
  "generated_at": "2025-12-20T15:30:00.000Z",
  "data": {
    "items": [
      {
        "id": "abc123",
        "product_id": "PROD001",
        "name": "OG Kush",
        "description": "Premium indoor strain",
        "sku": "SKU-001",
        "category_id": "flowers",
        "category_name": "Flowers",
        "category_image": "/categories/flowers.jpg",
        "price": 25.0,
        "cost": 15.0,
        "stock": 100,
        "track_stock": true,
        "low_stock_threshold": 10,
        "is_active": true,
        "available_for_sale": true,
        "variants": [
          {
            "variant_id": "var001",
            "variant_name": "1g",
            "sku": "SKU-001-1G",
            "stock": 50,
            "price": 25.0,
            "cost": 15.0
          },
          {
            "variant_id": "var002",
            "variant_name": "3.5g",
            "sku": "SKU-001-3.5G",
            "stock": 50,
            "price": 80.0,
            "cost": 50.0
          }
        ],
        "created_at": "2025-01-01T10:00:00.000Z",
        "updated_at": "2025-12-20T15:00:00.000Z"
      }
    ],
    "total_count": 45,
    "generated_at": "2025-12-20T15:30:00.000Z"
  }
}
```

**Item Fields:**

| Field                 | Type    | Description                                     |
| --------------------- | ------- | ----------------------------------------------- |
| `id`                  | string  | Firebase document ID                            |
| `product_id`          | string  | Product ID (internal reference)                 |
| `name`                | string  | Product name                                    |
| `description`         | string  | Product description                             |
| `sku`                 | string  | Stock Keeping Unit                              |
| `category_id`         | string  | Category ID (for filtering/grouping)            |
| `category_name`       | string  | Category display name                           |
| `category_image`      | string  | Category image URL                              |
| `price`               | number  | Selling price                                   |
| `cost`                | number  | Cost price                                      |
| `stock`               | number  | Total stock quantity (sum of all variants)      |
| `track_stock`         | boolean | Whether stock tracking is enabled               |
| `low_stock_threshold` | number  | Alert threshold for low stock                   |
| `is_active`           | boolean | Whether product is active                       |
| `available_for_sale`  | boolean | Whether product can be sold                     |
| `variants`            | array   | List of product variants with stock and pricing |
| `created_at`          | string  | ISO 8601 timestamp                              |
| `updated_at`          | string  | ISO 8601 timestamp                              |

**Use Cases:**

- Display product catalog in mobile app
- Filter products by category
- Show stock levels for purchase planning
- Categorize items in purchase orders
- Update product costs

**Example Request (Android):**

```kotlin
suspend fun getItems(): Response<ItemsResponse> {
    return apiService.get(
        url = "${baseUrl}/api/mobile?action=get-items",
        headers = mapOf("Authorization" to "Bearer $token")
    )
}

// Usage
lifecycleScope.launch {
    val response = apiManager.getItems()
    if (response.success) {
        val items = response.data.items
        // Group by category
        val itemsByCategory = items.groupBy { it.category_name }
        displayItems(itemsByCategory)
    }
}
```

---

## Categories API

### Get All Categories

Retrieve a list of all product categories. Use this endpoint to populate category dropdowns and filter items by category.

**Endpoint:** `GET /api/mobile?action=get-categories`

**Authentication:** JWT token required

**Headers:**

```
Authorization: Bearer {token}
```

**Response:**

```json
{
  "success": true,
  "action": "get-categories",
  "generated_at": "2025-12-20T15:30:00.000Z",
  "data": {
    "categories": [
      {
        "id": "cat001",
        "category_id": "flowers",
        "name": "Flowers",
        "description": "Premium cannabis flowers",
        "image": "/categories/flowers.jpg",
        "color": "#4CAF50",
        "icon": "local_florist",
        "is_active": true,
        "sort_order": 1,
        "created_at": "2025-01-01T10:00:00.000Z",
        "updated_at": "2025-12-20T15:00:00.000Z"
      },
      {
        "id": "cat002",
        "category_id": "edibles",
        "name": "Edibles",
        "description": "Cannabis-infused edibles",
        "image": "/categories/edibles.jpg",
        "color": "#FF9800",
        "icon": "cake",
        "is_active": true,
        "sort_order": 2,
        "created_at": "2025-01-01T10:00:00.000Z",
        "updated_at": "2025-12-20T15:00:00.000Z"
      }
    ],
    "total_count": 8,
    "generated_at": "2025-12-20T15:30:00.000Z"
  }
}
```

**Category Fields:**

| Field         | Type    | Description                      |
| ------------- | ------- | -------------------------------- |
| `id`          | string  | Firebase document ID             |
| `category_id` | string  | Category ID (for filtering)      |
| `name`        | string  | Category display name            |
| `description` | string  | Category description             |
| `image`       | string  | Category image URL               |
| `color`       | string  | Hex color code for UI theming    |
| `icon`        | string  | Material icon name               |
| `is_active`   | boolean | Whether category is active       |
| `sort_order`  | number  | Display order (sorted ascending) |
| `created_at`  | string  | ISO 8601 timestamp               |
| `updated_at`  | string  | ISO 8601 timestamp               |

**Use Cases:**

- Populate category dropdown in purchase form
- Filter items by category
- Display category-based navigation
- Show category icons and colors in UI

**Example Request (Android):**

```kotlin
suspend fun getCategories(): Response<CategoriesResponse> {
    return apiService.get(
        url = "${baseUrl}/api/mobile?action=get-categories",
        headers = mapOf("Authorization" to "Bearer $token")
    )
}

// Usage
lifecycleScope.launch {
    val response = apiManager.getCategories()
    if (response.success) {
        val categories = response.data.categories
        // Populate spinner/dropdown
        categoryAdapter.setData(categories)
    }
}
```

**Filtering Items by Category:**

```kotlin
// 1. Get all categories
val categoriesResponse = apiManager.getCategories()
val categories = categoriesResponse.data.categories

// 2. Get all items
val itemsResponse = apiManager.getItems()
val items = itemsResponse.data.items

// 3. Filter items by selected category
val selectedCategoryId = "flowers"
val filteredItems = items.filter { it.category_id == selectedCategoryId }

// 4. Display filtered items
displayItems(filteredItems)
```

---

## Summary

The Finance API provides complete CRUD operations for:

**Purchases (6 endpoints):**

- GET all purchases
- GET single purchase
- POST create purchase
- POST edit purchase
- POST/DELETE delete purchase
- POST complete purchase

**Expenses (5 endpoints):**

- GET all expenses (with date filtering)
- GET single expense
- POST create expense
- POST edit expense
- POST/DELETE delete expense

**Items/Products (1 endpoint):**

- GET all items (with full category information and latest stock levels)

**Categories (1 endpoint):**

- GET all categories (for filtering and categorizing items)

**Invoices (Enhanced):**

- DELETE invoice

All endpoints require JWT authentication (except login) and follow consistent request/response patterns with proper error handling.

**Key Features:**

- ✅ Real-time data from Firebase
- ✅ Category information on all items
- ✅ Stock tracking and variants support
- ✅ Filter items by category
- ✅ Latest product updates reflected immediately

**Support:** For issues or questions, contact the development team.

**Last Updated:** December 20, 2025
