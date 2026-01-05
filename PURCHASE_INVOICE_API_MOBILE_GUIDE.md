# Purchase Invoice API - Complete Mobile Integration Guide

**Complete Guide for Android/Kotlin Mobile App Development**

This document provides comprehensive documentation for the Purchase Invoice API endpoints, including detailed Android/Kotlin implementation examples, best practices, and complete UI patterns for the POS Candy Kush mobile application.

**Last Updated:** December 20, 2025

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Purchase Invoice Endpoints](#purchase-invoice-endpoints)
   - [Get All Purchases](#1-get-all-purchases)
   - [Get Single Purchase](#2-get-single-purchase)
   - [Create Purchase](#3-create-purchase)
   - [Edit Purchase](#4-edit-purchase)
   - [Complete Purchase](#5-complete-purchase)
   - [Delete Purchase](#6-delete-purchase)
4. [Android/Kotlin Integration](#androidkotlin-integration)
   - [Data Models](#kotlin-data-models)
   - [API Service](#retrofit-api-service)
   - [Complete Implementation](#complete-implementation-example)
5. [Mobile App Usage Patterns](#mobile-app-usage-patterns)
6. [Best Practices](#best-practices)
7. [Testing Guide](#testing-guide)

---

## Overview

The Purchase Invoice API manages supplier purchase orders in the POS system. It supports:

- **Creating purchase orders** from suppliers
- **Tracking pending purchases** awaiting delivery
- **Completing purchases** when items are received
- **Managing reminders** for upcoming deliveries
- **Updating stock levels** when purchases are completed

**Base URL:** `https://pos-candy-kush.vercel.app/api/mobile`

**Key Features:**

- ✅ Full CRUD operations for purchase invoices
- ✅ Status tracking (pending → completed)
- ✅ Automatic stock updates on completion
- ✅ Reminder system for due dates
- ✅ Supplier management
- ✅ Multi-item purchases with quantities
- ✅ Cost tracking per item

---

## Authentication

All purchase invoice endpoints require JWT authentication.

### Login Request

```http
POST /api/mobile
Content-Type: application/json

{
  "action": "login",
  "email": "admin@candykush.com",
  "password": "yourpassword"
}
```

### Login Response

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "uid": "abc123",
    "email": "admin@candykush.com",
    "role": "admin"
  }
}
```

### Using JWT Token

Include the token in all subsequent requests:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Purchase Invoice Endpoints

## 1. Get All Purchases

Retrieve a list of all purchase orders.

**Authentication:** JWT token required

### Request

```http
GET /api/mobile?action=get-purchases
Authorization: Bearer YOUR_JWT_TOKEN
```

### Query Parameters

| Parameter | Type   | Required | Description     |
| --------- | ------ | -------- | --------------- |
| `action`  | string | Yes      | `get-purchases` |

### Example Request

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "https://pos-candy-kush.vercel.app/api/mobile?action=get-purchases"
```

### Response

**Success Response:**

```json
{
  "success": true,
  "action": "get-purchases",
  "generated_at": "2025-12-20T10:30:00.000Z",
  "data": {
    "purchases": [
      {
        "id": "purchase_123",
        "supplier_name": "ABC Wholesalers",
        "purchase_date": "2025-12-18",
        "due_date": "2025-12-25",
        "items": [
          {
            "product_id": "prod_001",
            "product_name": "OG Kush - 28g",
            "quantity": 10,
            "price": 150.0,
            "total": 1500.0
          },
          {
            "product_id": "prod_002",
            "product_name": "Blue Dream - 14g",
            "quantity": 5,
            "price": 80.0,
            "total": 400.0
          }
        ],
        "total": 1900.0,
        "status": "pending",
        "reminder_type": "days_before",
        "reminder_value": "3",
        "reminder_time": "09:00",
        "created_at": "2025-12-18T10:30:00.000Z",
        "updated_at": "2025-12-18T10:30:00.000Z"
      }
    ]
  }
}
```

**Empty Response:**

```json
{
  "success": true,
  "data": {
    "purchases": []
  }
}
```

### Response Fields

| Field                                   | Type    | Description                                  |
| --------------------------------------- | ------- | -------------------------------------------- |
| `success`                               | boolean | Whether the request was successful           |
| `data.purchases[]`                      | array   | Array of purchase objects                    |
| `data.purchases[].id`                   | string  | Unique purchase identifier                   |
| `data.purchases[].supplier_name`        | string  | Name of the supplier                         |
| `data.purchases[].purchase_date`        | string  | Purchase order date (YYYY-MM-DD)             |
| `data.purchases[].due_date`             | string  | Expected delivery date (YYYY-MM-DD)          |
| `data.purchases[].items[]`              | array   | Array of purchased items                     |
| `data.purchases[].items[].product_id`   | string  | Product identifier                           |
| `data.purchases[].items[].product_name` | string  | Product name                                 |
| `data.purchases[].items[].quantity`     | number  | Quantity ordered                             |
| `data.purchases[].items[].price`        | number  | Unit cost price                              |
| `data.purchases[].items[].total`        | number  | Line total (quantity × price)                |
| `data.purchases[].total`                | number  | Purchase order total                         |
| `data.purchases[].status`               | string  | "pending" or "completed"                     |
| `data.purchases[].reminder_type`        | string  | "days_before", "weeks_before", "no_reminder" |
| `data.purchases[].reminder_value`       | string  | Number of days/weeks for reminder            |
| `data.purchases[].reminder_time`        | string  | Time for reminder (HH:mm format)             |
| `data.purchases[].created_at`           | string  | ISO 8601 timestamp                           |
| `data.purchases[].updated_at`           | string  | ISO 8601 timestamp                           |

---

## 2. Get Single Purchase

Retrieve a specific purchase order by ID.

**Authentication:** JWT token required

### Request

```http
GET /api/mobile?action=get-purchase&id={purchase_id}
Authorization: Bearer YOUR_JWT_TOKEN
```

### Query Parameters

| Parameter | Type   | Required | Description             |
| --------- | ------ | -------- | ----------------------- |
| `action`  | string | Yes      | `get-purchase`          |
| `id`      | string | Yes      | Purchase ID to retrieve |

### Example Request

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "https://pos-candy-kush.vercel.app/api/mobile?action=get-purchase&id=purchase_123"
```

### Response

**Success Response:**

```json
{
  "success": true,
  "action": "get-purchase",
  "generated_at": "2025-12-20T10:30:00.000Z",
  "data": {
    "purchase": {
      "id": "purchase_123",
      "supplier_name": "ABC Wholesalers",
      "purchase_date": "2025-12-18",
      "due_date": "2025-12-25",
      "items": [
        {
          "product_id": "prod_001",
          "product_name": "OG Kush - 28g",
          "quantity": 10,
          "price": 150.0,
          "total": 1500.0
        }
      ],
      "total": 1500.0,
      "status": "pending",
      "reminder_type": "days_before",
      "reminder_value": "3",
      "reminder_time": "09:00",
      "created_at": "2025-12-18T10:30:00.000Z",
      "updated_at": "2025-12-18T10:30:00.000Z"
    }
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Purchase not found"
}
```

---

## 3. Create Purchase

Create a new purchase order.

**Authentication:** JWT token required

### Request

```http
POST /api/mobile
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Request Body

```json
{
  "action": "create-purchase",
  "supplier_name": "ABC Wholesalers",
  "purchase_date": "2025-12-20",
  "due_date": "2025-12-27",
  "items": [
    {
      "product_id": "prod_001",
      "product_name": "OG Kush - 28g",
      "quantity": 10,
      "price": 150.0,
      "total": 1500.0
    },
    {
      "product_id": "prod_002",
      "product_name": "Blue Dream - 14g",
      "quantity": 5,
      "price": 80.0,
      "total": 400.0
    }
  ],
  "total": 1900.0,
  "reminder_type": "days_before",
  "reminder_value": "3",
  "reminder_time": "09:00"
}
```

### Request Parameters

| Parameter              | Type   | Required | Description                                            |
| ---------------------- | ------ | -------- | ------------------------------------------------------ |
| `action`               | string | Yes      | `create-purchase`                                      |
| `supplier_name`        | string | Yes      | Supplier/vendor name                                   |
| `purchase_date`        | string | Yes      | Purchase order date (YYYY-MM-DD)                       |
| `due_date`             | string | Yes      | Expected delivery date (YYYY-MM-DD)                    |
| `items`                | array  | Yes      | Array of items (minimum 1 item)                        |
| `items[].product_id`   | string | Yes      | Product identifier                                     |
| `items[].product_name` | string | Yes      | Product name                                           |
| `items[].quantity`     | number | Yes      | Quantity to order (must be > 0)                        |
| `items[].price`        | number | Yes      | Unit cost price                                        |
| `items[].total`        | number | Yes      | Line total (quantity × price)                          |
| `total`                | number | Yes      | Purchase order total (sum of all item totals)          |
| `reminder_type`        | string | No       | "days_before", "weeks_before", "no_reminder" (default) |
| `reminder_value`       | string | No       | Number for reminder (e.g., "3" for 3 days)             |
| `reminder_time`        | string | No       | Time for reminder in HH:mm format (e.g., "09:00")      |

### Response

**Success Response:**

```json
{
  "success": true,
  "action": "create-purchase",
  "data": {
    "purchase": {
      "id": "purchase_456",
      "supplier_name": "ABC Wholesalers",
      "purchase_date": "2025-12-20",
      "due_date": "2025-12-27",
      "items": [...],
      "total": 1900.00,
      "status": "pending",
      "reminder_type": "days_before",
      "reminder_value": "3",
      "reminder_time": "09:00",
      "created_at": "2025-12-20T10:30:00.000Z",
      "updated_at": "2025-12-20T10:30:00.000Z"
    }
  }
}
```

**Validation Error Response:**

```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "supplier_name": "Supplier name is required",
    "items": "At least one item is required"
  }
}
```

---

## 4. Edit Purchase

Update an existing purchase order (only for pending purchases).

**Authentication:** JWT token required

### Request

```http
POST /api/mobile
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Request Body

```json
{
  "action": "edit-purchase",
  "id": "purchase_123",
  "supplier_name": "XYZ Suppliers",
  "purchase_date": "2025-12-20",
  "due_date": "2025-12-28",
  "items": [
    {
      "product_id": "prod_001",
      "product_name": "OG Kush - 28g",
      "quantity": 15,
      "price": 150.0,
      "total": 2250.0
    }
  ],
  "total": 2250.0,
  "reminder_type": "days_before",
  "reminder_value": "5",
  "reminder_time": "10:00"
}
```

### Request Parameters

| Parameter           | Type   | Required | Description                     |
| ------------------- | ------ | -------- | ------------------------------- |
| `action`            | string | Yes      | `edit-purchase`                 |
| `id`                | string | Yes      | Purchase ID to update           |
| All other fields... | ...    | Yes      | Same as create-purchase request |

### Response

**Success Response:**

```json
{
  "success": true,
  "action": "edit-purchase",
  "data": {
    "purchase": {
      "id": "purchase_123",
      "supplier_name": "XYZ Suppliers",
      "purchase_date": "2025-12-20",
      "due_date": "2025-12-28",
      "items": [...],
      "total": 2250.00,
      "status": "pending",
      "updated_at": "2025-12-20T11:00:00.000Z"
    }
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Cannot edit completed purchase"
}
```

---

## 5. Complete Purchase

Mark a purchase order as completed and update stock levels.

**Authentication:** JWT token required

### Request

```http
POST /api/mobile
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Request Body

```json
{
  "action": "complete-purchase",
  "id": "purchase_123"
}
```

### Request Parameters

| Parameter | Type   | Required | Description             |
| --------- | ------ | -------- | ----------------------- |
| `action`  | string | Yes      | `complete-purchase`     |
| `id`      | string | Yes      | Purchase ID to complete |

### Response

**Success Response:**

```json
{
  "success": true,
  "action": "complete-purchase",
  "message": "Purchase completed successfully. Stock levels updated.",
  "data": {
    "purchase": {
      "id": "purchase_123",
      "status": "completed",
      "completed_at": "2025-12-20T15:30:00.000Z",
      "updated_at": "2025-12-20T15:30:00.000Z"
    },
    "stock_updates": [
      {
        "product_id": "prod_001",
        "product_name": "OG Kush - 28g",
        "quantity_added": 10,
        "new_stock_level": 110
      },
      {
        "product_id": "prod_002",
        "product_name": "Blue Dream - 14g",
        "quantity_added": 5,
        "new_stock_level": 55
      }
    ]
  }
}
```

**Business Logic:**

- Sets purchase status to "completed"
- Adds purchased quantities to product stock levels
- Records completion timestamp
- Cannot be undone (delete and recreate if needed)

**Error Response:**

```json
{
  "success": false,
  "error": "Purchase already completed"
}
```

---

## 6. Delete Purchase

Delete a purchase order.

**Authentication:** JWT token required

### Request

```http
DELETE /api/mobile?action=delete-purchase&id={purchase_id}
Authorization: Bearer YOUR_JWT_TOKEN
```

### Query Parameters

| Parameter | Type   | Required | Description           |
| --------- | ------ | -------- | --------------------- |
| `action`  | string | Yes      | `delete-purchase`     |
| `id`      | string | Yes      | Purchase ID to delete |

### Example Request

```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "https://pos-candy-kush.vercel.app/api/mobile?action=delete-purchase&id=purchase_123"
```

### Response

**Success Response:**

```json
{
  "success": true,
  "message": "Purchase deleted successfully"
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Purchase not found"
}
```

**Note:** Deleting a completed purchase does NOT reverse stock changes. If you need to reverse stock, you must manually adjust inventory or create a new purchase with negative quantities (return).

---

## Android/Kotlin Integration

### Dependencies

Add to `app/build.gradle`:

```gradle
dependencies {
    // Retrofit for HTTP client
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'

    // OkHttp for interceptors
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    implementation 'com.squareup.okhttp3:logging-interceptor:4.12.0'

    // Kotlin Coroutines
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'

    // Lifecycle
    implementation 'androidx.lifecycle:lifecycle-viewmodel-ktx:2.6.2'
    implementation 'androidx.lifecycle:lifecycle-runtime-ktx:2.6.2'
}
```

---

### Kotlin Data Models

```kotlin
import com.google.gson.annotations.SerializedName

// Purchase data class
data class Purchase(
    val id: String,
    @SerializedName("supplier_name") val supplierName: String,
    @SerializedName("purchase_date") val purchaseDate: String,
    @SerializedName("due_date") val dueDate: String,
    val items: List<PurchaseItem>,
    val total: Double,
    val status: String = "pending", // "pending" or "completed"
    @SerializedName("reminder_type") val reminderType: String = "no_reminder",
    @SerializedName("reminder_value") val reminderValue: String = "",
    @SerializedName("reminder_time") val reminderTime: String = "",
    @SerializedName("completed_at") val completedAt: String? = null,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("updated_at") val updatedAt: String?
) {
    // Helper method for status display
    fun getStatusText(): String = when (status.lowercase()) {
        "completed" -> "Completed"
        "pending" -> "Pending"
        else -> status.capitalize()
    }

    // Helper method for status color
    fun getStatusColor(): Int = when (status.lowercase()) {
        "completed" -> R.color.status_completed      // Green
        "pending" -> R.color.status_pending          // Orange
        else -> R.color.black
    }

    // Check if purchase can be edited
    fun canBeEdited(): Boolean = status.lowercase() == "pending"

    // Check if purchase can be completed
    fun canBeCompleted(): Boolean = status.lowercase() == "pending"

    // Get reminder display text
    fun getReminderText(): String {
        if (reminderType == "no_reminder") return "No reminder"
        val unit = when (reminderType) {
            "days_before" -> "day(s)"
            "weeks_before" -> "week(s)"
            else -> ""
        }
        return "$reminderValue $unit before at $reminderTime"
    }

    // Calculate days until due
    fun getDaysUntilDue(): Int? {
        return try {
            val today = LocalDate.now()
            val due = LocalDate.parse(dueDate)
            ChronoUnit.DAYS.between(today, due).toInt()
        } catch (e: Exception) {
            null
        }
    }

    // Check if purchase is overdue
    fun isOverdue(): Boolean {
        val daysUntil = getDaysUntilDue()
        return daysUntil != null && daysUntil < 0 && status == "pending"
    }
}

// Purchase item data class
data class PurchaseItem(
    @SerializedName("product_id") val productId: String,
    @SerializedName("product_name") val productName: String,
    val quantity: Int,
    val price: Double,
    val total: Double
)

// Stock update info (returned when completing purchase)
data class StockUpdate(
    @SerializedName("product_id") val productId: String,
    @SerializedName("product_name") val productName: String,
    @SerializedName("quantity_added") val quantityAdded: Int,
    @SerializedName("new_stock_level") val newStockLevel: Int
)

// API response wrappers
data class ApiResponse<T>(
    val success: Boolean,
    val action: String? = null,
    val data: T? = null,
    val error: String? = null,
    val message: String? = null,
    @SerializedName("generated_at") val generatedAt: String? = null
)

// Purchase list response
data class PurchaseListResponse(
    val purchases: List<Purchase>
)

// Single purchase response
data class PurchaseResponse(
    val purchase: Purchase,
    @SerializedName("stock_updates") val stockUpdates: List<StockUpdate>? = null
)
```

---

### Retrofit API Service

```kotlin
interface PurchaseApiService {
    @GET("/api/mobile")
    suspend fun getPurchases(
        @Query("action") action: String = "get-purchases"
    ): ApiResponse<PurchaseListResponse>

    @GET("/api/mobile")
    suspend fun getPurchase(
        @Query("action") action: String = "get-purchase",
        @Query("id") id: String
    ): ApiResponse<PurchaseResponse>

    @POST("/api/mobile")
    suspend fun createPurchase(
        @Body request: CreatePurchaseRequest
    ): ApiResponse<PurchaseResponse>

    @POST("/api/mobile")
    suspend fun editPurchase(
        @Body request: EditPurchaseRequest
    ): ApiResponse<PurchaseResponse>

    @POST("/api/mobile")
    suspend fun completePurchase(
        @Body request: CompletePurchaseRequest
    ): ApiResponse<PurchaseResponse>

    @DELETE("/api/mobile")
    suspend fun deletePurchase(
        @Query("action") action: String = "delete-purchase",
        @Query("id") id: String
    ): ApiResponse<Unit>
}

// Request models
data class CreatePurchaseRequest(
    val action: String = "create-purchase",
    @SerializedName("supplier_name") val supplierName: String,
    @SerializedName("purchase_date") val purchaseDate: String,
    @SerializedName("due_date") val dueDate: String,
    val items: List<PurchaseItem>,
    val total: Double,
    @SerializedName("reminder_type") val reminderType: String = "no_reminder",
    @SerializedName("reminder_value") val reminderValue: String = "",
    @SerializedName("reminder_time") val reminderTime: String = ""
)

data class EditPurchaseRequest(
    val action: String = "edit-purchase",
    val id: String,
    @SerializedName("supplier_name") val supplierName: String,
    @SerializedName("purchase_date") val purchaseDate: String,
    @SerializedName("due_date") val dueDate: String,
    val items: List<PurchaseItem>,
    val total: Double,
    @SerializedName("reminder_type") val reminderType: String = "no_reminder",
    @SerializedName("reminder_value") val reminderValue: String = "",
    @SerializedName("reminder_time") val reminderTime: String = ""
)

data class CompletePurchaseRequest(
    val action: String = "complete-purchase",
    val id: String
)
```

---

### Complete Implementation Example

#### 1. Repository Layer

```kotlin
class PurchaseRepository(private val apiService: PurchaseApiService) {

    suspend fun getAllPurchases(): ApiResult<List<Purchase>> {
        return safeApiCall {
            apiService.getPurchases()
        }
    }

    suspend fun getPurchaseById(purchaseId: String): ApiResult<Purchase> {
        return safeApiCall {
            apiService.getPurchase(id = purchaseId)
        }
    }

    suspend fun createPurchase(
        supplierName: String,
        purchaseDate: LocalDate,
        dueDate: LocalDate,
        items: List<PurchaseItem>,
        reminderType: String = "no_reminder",
        reminderValue: String = "",
        reminderTime: String = ""
    ): ApiResult<Purchase> {
        val total = items.sumOf { it.total }

        return safeApiCall {
            apiService.createPurchase(
                CreatePurchaseRequest(
                    supplierName = supplierName,
                    purchaseDate = purchaseDate.toApiDateString(),
                    dueDate = dueDate.toApiDateString(),
                    items = items,
                    total = total,
                    reminderType = reminderType,
                    reminderValue = reminderValue,
                    reminderTime = reminderTime
                )
            )
        }
    }

    suspend fun updatePurchase(
        purchaseId: String,
        supplierName: String,
        purchaseDate: String,
        dueDate: String,
        items: List<PurchaseItem>,
        reminderType: String,
        reminderValue: String,
        reminderTime: String
    ): ApiResult<Purchase> {
        val total = items.sumOf { it.total }

        return safeApiCall {
            apiService.editPurchase(
                EditPurchaseRequest(
                    id = purchaseId,
                    supplierName = supplierName,
                    purchaseDate = purchaseDate,
                    dueDate = dueDate,
                    items = items,
                    total = total,
                    reminderType = reminderType,
                    reminderValue = reminderValue,
                    reminderTime = reminderTime
                )
            )
        }
    }

    suspend fun completePurchase(purchaseId: String): ApiResult<Pair<Purchase, List<StockUpdate>>> {
        return when (val result = safeApiCall {
            apiService.completePurchase(CompletePurchaseRequest(id = purchaseId))
        }) {
            is ApiResult.Success -> {
                val purchase = result.data.purchase
                val stockUpdates = result.data.stockUpdates ?: emptyList()
                ApiResult.Success(Pair(purchase, stockUpdates))
            }
            is ApiResult.Error -> ApiResult.Error(result.message, result.code)
        }
    }

    suspend fun deletePurchase(purchaseId: String): ApiResult<Unit> {
        return safeApiCall {
            apiService.deletePurchase(id = purchaseId)
        }
    }
}

// Extension function for mapping responses
suspend fun <T, R> ApiResult<ApiResponse<T>>.map(transform: (T) -> R): ApiResult<R> {
    return when (this) {
        is ApiResult.Success -> {
            if (data.success && data.data != null) {
                ApiResult.Success(transform(data.data))
            } else {
                ApiResult.Error(data.error ?: "Unknown error")
            }
        }
        is ApiResult.Error -> ApiResult.Error(message, code)
    }
}
```

#### 2. ViewModel Layer

```kotlin
class PurchaseViewModel(
    private val repository: PurchaseRepository
) : ViewModel() {

    private val _purchases = MutableStateFlow<List<Purchase>>(emptyList())
    val purchases: StateFlow<List<Purchase>> = _purchases.asStateFlow()

    private val _selectedPurchase = MutableStateFlow<Purchase?>(null)
    val selectedPurchase: StateFlow<Purchase?> = _selectedPurchase.asStateFlow()

    private val _uiState = MutableStateFlow<UiState>(UiState.Idle)
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    fun loadPurchases() {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            when (val result = repository.getAllPurchases()) {
                is ApiResult.Success -> {
                    _purchases.value = result.data
                    _uiState.value = UiState.Success("Purchases loaded")
                }
                is ApiResult.Error -> {
                    _uiState.value = UiState.Error(result.message)
                }
            }
        }
    }

    fun loadPurchaseDetails(purchaseId: String) {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            when (val result = repository.getPurchaseById(purchaseId)) {
                is ApiResult.Success -> {
                    _selectedPurchase.value = result.data
                    _uiState.value = UiState.Success("Purchase loaded")
                }
                is ApiResult.Error -> {
                    _uiState.value = UiState.Error(result.message)
                }
            }
        }
    }

    fun completePurchase(purchaseId: String) {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            when (val result = repository.completePurchase(purchaseId)) {
                is ApiResult.Success -> {
                    val (purchase, stockUpdates) = result.data
                    _selectedPurchase.value = purchase
                    _purchases.value = _purchases.value.map {
                        if (it.id == purchaseId) purchase else it
                    }
                    _uiState.value = UiState.StockUpdated(
                        "Purchase completed. Stock updated for ${stockUpdates.size} items.",
                        stockUpdates
                    )
                }
                is ApiResult.Error -> {
                    _uiState.value = UiState.Error(result.message)
                }
            }
        }
    }

    sealed class UiState {
        object Idle : UiState()
        object Loading : UiState()
        data class Success(val message: String) : UiState()
        data class Error(val message: String) : UiState()
        data class StockUpdated(
            val message: String,
            val stockUpdates: List<StockUpdate>
        ) : UiState()
    }
}
```

#### 3. UI Layer (Purchase Detail Screen)

```kotlin
@Composable
fun PurchaseDetailScreen(
    purchaseId: String,
    viewModel: PurchaseViewModel = viewModel()
) {
    val purchase by viewModel.selectedPurchase.collectAsState()
    val uiState by viewModel.uiState.collectAsState()
    var showCompleteDialog by remember { mutableStateOf(false) }

    LaunchedEffect(purchaseId) {
        viewModel.loadPurchaseDetails(purchaseId)
    }

    // Complete purchase confirmation dialog
    if (showCompleteDialog) {
        AlertDialog(
            onDismissRequest = { showCompleteDialog = false },
            title = { Text("Complete Purchase") },
            text = {
                Text("Mark this purchase as completed? This will add all items to stock and cannot be undone.")
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        purchase?.let { viewModel.completePurchase(it.id) }
                        showCompleteDialog = false
                    }
                ) {
                    Text("Complete")
                }
            },
            dismissButton = {
                TextButton(onClick = { showCompleteDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Purchase Order") },
                actions = {
                    purchase?.let { p ->
                        if (p.canBeCompleted()) {
                            IconButton(onClick = { showCompleteDialog = true }) {
                                Icon(Icons.Default.CheckCircle, "Complete Purchase")
                            }
                        }
                    }
                }
            )
        },
        floatingActionButton = {
            purchase?.let { p ->
                if (p.canBeCompleted()) {
                    FloatingActionButton(
                        onClick = { showCompleteDialog = true },
                        containerColor = MaterialTheme.colorScheme.primary
                    ) {
                        Icon(Icons.Default.Check, "Complete")
                    }
                }
            }
        }
    ) { padding ->
        when (uiState) {
            is PurchaseViewModel.UiState.Loading -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            is PurchaseViewModel.UiState.StockUpdated -> {
                val state = uiState as PurchaseViewModel.UiState.StockUpdated
                // Show stock update confirmation
                StockUpdateDialog(state.stockUpdates, onDismiss = {
                    viewModel.loadPurchases() // Refresh list
                })
            }
            else -> {
                purchase?.let { p ->
                    PurchaseDetailContent(
                        purchase = p,
                        modifier = Modifier.padding(padding)
                    )
                }
            }
        }
    }
}
```

---

## Mobile App Usage Patterns

### 1. Purchase List with Status Filtering

```kotlin
@Composable
fun PurchaseListScreen(viewModel: PurchaseViewModel = viewModel()) {
    val purchases by viewModel.purchases.collectAsState()
    var selectedFilter by remember { mutableStateOf("all") }

    val filteredPurchases = when (selectedFilter) {
        "pending" -> purchases.filter { it.status == "pending" }
        "completed" -> purchases.filter { it.status == "completed" }
        "overdue" -> purchases.filter { it.isOverdue() }
        else -> purchases
    }

    Column(modifier = Modifier.fillMaxSize()) {
        // Filter chips
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            FilterChip(
                selected = selectedFilter == "all",
                onClick = { selectedFilter = "all" },
                label = { Text("All (${purchases.size})") }
            )
            FilterChip(
                selected = selectedFilter == "pending",
                onClick = { selectedFilter = "pending" },
                label = { Text("Pending (${purchases.count { it.status == "pending" }})") }
            )
            FilterChip(
                selected = selectedFilter == "overdue",
                onClick = { selectedFilter = "overdue" },
                label = { Text("Overdue (${purchases.count { it.isOverdue() }})") }
            )
            FilterChip(
                selected = selectedFilter == "completed",
                onClick = { selectedFilter = "completed" },
                label = { Text("Completed (${purchases.count { it.status == "completed" }})") }
            )
        }

        // Purchase list
        LazyColumn {
            items(filteredPurchases) { purchase ->
                PurchaseListItem(
                    purchase = purchase,
                    onClick = { /* Navigate to detail */ }
                )
            }
        }
    }
}
```

### 2. Overdue Purchase Indicator

```kotlin
@Composable
fun PurchaseListItem(purchase: Purchase, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = if (purchase.isOverdue())
                MaterialTheme.colorScheme.errorContainer
            else
                MaterialTheme.colorScheme.surface
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = purchase.supplierName,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Due: ${purchase.dueDate}",
                    style = MaterialTheme.typography.bodyMedium
                )
                purchase.getDaysUntilDue()?.let { days ->
                    Text(
                        text = when {
                            days < 0 -> "OVERDUE by ${-days} days"
                            days == 0 -> "DUE TODAY"
                            days <= 7 -> "Due in $days days"
                            else -> ""
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = when {
                            days < 0 -> MaterialTheme.colorScheme.error
                            days <= 3 -> MaterialTheme.colorScheme.primary
                            else -> MaterialTheme.colorScheme.onSurface
                        },
                        fontWeight = if (days <= 0) FontWeight.Bold else FontWeight.Normal
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "$${String.format("%.2f", purchase.total)}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Badge(
                    containerColor = purchase.getStatusColor()
                ) {
                    Text(
                        text = purchase.getStatusText(),
                        color = Color.White
                    )
                }
            }
        }
    }
}
```

### 3. Stock Update Confirmation

```kotlin
@Composable
fun StockUpdateDialog(
    stockUpdates: List<StockUpdate>,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Stock Updated") },
        text = {
            Column {
                Text(
                    "The following items have been added to stock:",
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
                LazyColumn(modifier = Modifier.heightIn(max = 200.dp)) {
                    items(stockUpdates) { update ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = update.productName,
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.weight(1f)
                            )
                            Text(
                                text = "+${update.quantityAdded} → ${update.newStockLevel}",
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("OK")
            }
        }
    )
}
```

---

## Best Practices

### 1. Security

- **Token Storage**: Use EncryptedSharedPreferences for JWT tokens
- **Token Refresh**: Implement automatic token refresh
- **HTTPS Only**: Always use HTTPS (enforced by API)
- **Secure Logging**: Never log sensitive supplier or pricing data in production

### 2. Performance

- **Cache Purchases**: Implement local caching with Room for offline access
- **Pagination**: Consider pagination for large purchase lists
- **Background Sync**: Sync purchases in background worker

### 3. User Experience

- **Overdue Alerts**: Highlight overdue purchases prominently
- **Reminder System**: Show upcoming reminders in notification tray
- **Stock Preview**: Show expected stock levels before completing
- **Confirmation Dialogs**: Require confirmation for completing/deleting purchases
- **Optimistic Updates**: Update UI immediately, rollback on failure

### 4. Data Validation

- **Date Validation**: Ensure due date is after purchase date
- **Item Validation**: Verify products exist in inventory
- **Amount Validation**: Check totals match item sums
- **Quantity Validation**: Ensure positive quantities only

### 5. Error Handling

- **Network Errors**: Handle timeouts and offline gracefully
- **Validation Errors**: Show field-specific error messages
- **Business Logic Errors**: Handle "already completed" scenarios
- **Retry Logic**: Implement exponential backoff

---

## Testing Guide

### API Endpoint Tests

- [x] GET /api/mobile?action=get-purchases returns empty array when no purchases exist
- [x] GET /api/mobile?action=get-purchases returns all purchases with proper structure
- [x] GET /api/mobile?action=get-purchase returns single purchase with all fields
- [x] GET /api/mobile?action=get-purchase returns 404 for non-existent purchase
- [x] POST /api/mobile?action=create-purchase validates required fields
- [x] POST /api/mobile?action=create-purchase creates purchase with items
- [x] POST /api/mobile?action=create-purchase defaults status to "pending"
- [x] POST /api/mobile?action=create-purchase handles reminders correctly
- [x] POST /api/mobile?action=edit-purchase updates pending purchase
- [x] POST /api/mobile?action=edit-purchase rejects editing completed purchase
- [x] POST /api/mobile?action=complete-purchase updates status to completed
- [x] POST /api/mobile?action=complete-purchase adds quantities to stock
- [x] POST /api/mobile?action=complete-purchase returns stock update info
- [x] POST /api/mobile?action=complete-purchase rejects already completed purchase
- [x] DELETE /api/mobile?action=delete-purchase removes purchase
- [x] Authentication required for all endpoints
- [x] Proper error responses for invalid requests

### Android Integration Tests

- [ ] Kotlin data models parse API responses correctly
- [ ] Purchase.getStatusText() returns correct display text
- [ ] Purchase.canBeCompleted() logic works correctly
- [ ] Purchase.isOverdue() calculation is accurate
- [ ] Purchase.getReminderText() formats reminders properly
- [ ] Retrofit service interfaces match API endpoints
- [ ] Date formatting works correctly (YYYY-MM-DD)
- [ ] Error handling covers all API error scenarios
- [ ] Offline caching works with pending purchases
- [ ] Stock update dialog displays correctly
- [ ] Overdue purchase highlighting works
- [ ] Filter chips work for different statuses
- [ ] Complete purchase confirmation dialog prevents accidents
- [ ] Purchase list shows correct badge colors

---

## Summary

**Purchase Invoice API Features:**

- ✅ Full CRUD operations for purchase orders
- ✅ Status tracking (pending → completed)
- ✅ Automatic stock updates on completion
- ✅ Reminder system for due dates
- ✅ Multi-item purchases with cost tracking
- ✅ Comprehensive mobile integration guide

**Key Endpoints:**

1. **get-purchases** - List all purchase orders
2. **get-purchase** - Get single purchase by ID
3. **create-purchase** - Create new purchase order
4. **edit-purchase** - Update pending purchase
5. **complete-purchase** - Mark as completed and update stock
6. **delete-purchase** - Delete purchase order

**Status:** ✅ **PRODUCTION READY**  
**Documentation:** ✅ **COMPLETE**  
**Mobile Integration:** ✅ **FULLY DOCUMENTED**

---

_Last Updated: December 20, 2025_  
_Purchase Invoice API - Complete Mobile Integration Guide_ 🚀
