# Customer Invoice API Documentation

**Complete Guide for Mobile App Integration**

This document provides comprehensive documentation for the Customer Invoice API endpoints required for the POS Candy Kush mobile application, including detailed examples for Android/Kotlin implementation.

**Last Updated:** December 20, 2025

---

## 📋 Table of Contents

1. [Base URL & Authentication](#base-url--authentication)
2. [Invoice Endpoints](#invoice-endpoints)
   - [Get All Invoices](#1-get-invoices)
   - [Get Single Invoice](#2-get-single-invoice)
   - [Create Invoice](#3-create-invoice)
   - [Edit Invoice](#4-edit-invoice)
   - [Update Invoice Status](#5-update-invoice-status-new)
   - [Delete Invoice](#6-delete-invoice)
3. [Android/Kotlin Integration](#androidkotlin-integration)
   - [Data Models](#kotlin-data-models)
   - [API Service](#retrofit-api-service)
   - [Complete Implementation](#complete-implementation-example)
4. [Mobile App Features](#mobile-app-features)
5. [Error Handling](#error-handling)
6. [Testing Guide](#testing-guide)

---

## Base URL & Authentication

```
https://pos-candy-kush.vercel.app/api/mobile
```

## Authentication

All API endpoints require JWT authentication. Include the JWT token in the `Authorization` header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

**Getting JWT Token:**

```http
POST /api/mobile
Content-Type: application/json

{
  "action": "login",
  "email": "admin@candykush.com",
  "password": "yourpassword"
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
    "role": "admin"
  }
}
```

---

## Invoice Endpoints

## 1. Get Invoices

Retrieve a list of all customer invoices.

**Authentication:** JWT token required

### Request

```http
GET /api/mobile?action=get-invoices
```

### Query Parameters

| Parameter | Type   | Required | Description    |
| --------- | ------ | -------- | -------------- |
| `action`  | string | Yes      | `get-invoices` |

### Example Request

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "https://pos-candy-kush.vercel.app/api/mobile?action=get-invoices"
```

### Response

**Success Response:**

```json
{
  "success": true,
  "action": "get-invoices",
  "generated_at": "2025-12-20T10:30:00.000Z",
  "data": {
    "invoices": [
      {
        "id": "ef5KiZay08bD1T6ltcg5",
        "invoice_id": "ef5KiZay08bD1T6ltcg5",
        "number": "INV-2025-001",
        "date": "2025-12-18",
        "due_date": "2025-12-25",
        "customer_name": "John Doe",
        "items": [
          {
            "product_id": "prod_001",
            "product_name": "Blue Dream - 3.5g",
            "quantity": 2.0,
            "price": 25.0,
            "total": 50.0
          }
        ],
        "total": 50.0,
        "status": "pending",
        "payment_status": "pending",
        "created_at": "2025-12-18T10:30:00.000Z",
        "updated_at": "2025-12-18T10:30:00.000Z"
      }
    ]
  }
}
```

**Empty Response (no invoices):**

```json
{
  "success": true,
  "data": {
    "invoices": []
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Failed to fetch invoices"
}
```

### Response Fields

| Field                                  | Type        | Description                                    |
| -------------------------------------- | ----------- | ---------------------------------------------- |
| `success`                              | boolean     | Whether the request was successful             |
| `data.invoices[]`                      | array       | Array of invoice objects                       |
| `data.invoices[].id`                   | string      | Unique invoice identifier                      |
| `data.invoices[].number`               | string      | Human-readable invoice number                  |
| `data.invoices[].date`                 | string      | Invoice date (YYYY-MM-DD format)               |
| `data.invoices[].due_date`             | string/null | Payment due date (YYYY-MM-DD format, optional) |
| `data.invoices[].customer_name`        | string      | Customer name                                  |
| `data.invoices[].items[]`              | array       | Array of invoice items                         |
| `data.invoices[].items[].product_id`   | string      | Product identifier                             |
| `data.invoices[].items[].product_name` | string      | Product name                                   |
| `data.invoices[].items[].quantity`     | number      | Quantity purchased                             |
| `data.invoices[].items[].price`        | number      | Unit price                                     |
| `data.invoices[].items[].total`        | number      | Line total (quantity × price)                  |
| `data.invoices[].total`                | number      | Invoice total                                  |
| `data.invoices[].created_at`           | string      | Invoice creation timestamp                     |
| `data.invoices[].updated_at`           | string      | Invoice last update timestamp                  |

---

## 2. Create Invoice

Create a new customer invoice.

**Authentication:** JWT token required

### Request

```http
POST /api/mobile
Content-Type: application/json
```

### Request Body

```json
{
  "action": "create-invoice",
  "customer_name": "John Doe",
  "date": "2025-12-18",
  "due_date": "2025-12-25",
  "items": [
    {
      "product_id": "prod_001",
      "product_name": "Blue Dream - 3.5g",
      "quantity": 2.0,
      "price": 25.0,
      "total": 50.0
    }
  ],
  "total": 50.0
}
```

### Request Parameters

| Parameter              | Type   | Required | Description                                                        |
| ---------------------- | ------ | -------- | ------------------------------------------------------------------ |
| `action`               | string | Yes      | `create-invoice`                                                   |
| `customer_name`        | string | Yes      | Customer name (can be custom or from existing customers)           |
| `date`                 | string | Yes      | Invoice date in YYYY-MM-DD format                                  |
| `due_date`             | string | No       | Payment due date in YYYY-MM-DD format (must be after invoice date) |
| `items`                | array  | Yes      | Array of invoice items                                             |
| `items[].product_id`   | string | Yes      | Product identifier from stock                                      |
| `items[].product_name` | string | Yes      | Product name                                                       |
| `items[].quantity`     | number | Yes      | Quantity (supports decimals)                                       |
| `items[].price`        | number | Yes      | Unit price                                                         |
| `items[].total`        | number | Yes      | Line total (quantity × price)                                      |
| `total`                | number | Yes      | Invoice total (sum of all item totals)                             |

### Example Request

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create-invoice",
    "customer_name": "John Doe",
    "date": "2025-12-18",
    "due_date": "2025-12-25",
    "items": [
      {
        "product_id": "prod_001",
        "product_name": "Blue Dream - 3.5g",
        "quantity": 2.0,
        "price": 25.00,
        "total": 50.00
      }
    ],
    "total": 50.00
  }' \
  https://pos-candy-kush.vercel.app/api/mobile
```

### Response

**Success Response:**

```json
{
  "success": true,
  "data": {
    "invoice": {
      "id": "inv_001",
      "number": "INV-2025-001",
      "date": "2025-12-18",
      "due_date": "2025-12-25",
      "customer_name": "John Doe",
      "items": [
        {
          "product_id": "prod_001",
          "product_name": "Blue Dream - 3.5g",
          "quantity": 2.0,
          "price": 25.0,
          "total": 50.0
        }
      ],
      "total": 50.0,
      "created_at": "2025-12-18T10:30:00Z",
      "updated_at": "2025-12-18T10:30:00Z"
    }
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Failed to create invoice"
}
```

**Validation Error Response:**

```json
{
  "success": false,
  "error": "Invalid invoice data",
  "details": {
    "customer_name": "Customer name is required",
    "items": "At least one item is required"
  }
}
```

### Business Logic Requirements

1. **Invoice Number Generation**: Generate unique, sequential invoice numbers (e.g., INV-2025-001)
2. **Stock Validation**: Verify that products exist and have sufficient stock before creating invoice
3. **Stock Deduction**: Optionally deduct stock quantities when invoice is created
4. **Date Validation**: Ensure invoice date is not in the future
5. **Due Date Validation**: If provided, due_date must be after invoice date
6. **Total Calculation**: Validate that the total matches the sum of item totals
7. **Audit Trail**: Log invoice creation with timestamp and user information

---

## 3. Get Single Invoice

Retrieve a specific customer invoice by ID.

**Authentication:** JWT token required

### Request

```http
GET /api/mobile?action=get-invoice&id={invoice_id}
```

### Query Parameters

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `action`  | string | Yes      | `get-invoice`          |
| `id`      | string | Yes      | Invoice ID to retrieve |

### Example Request

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "https://pos-candy-kush.vercel.app/api/mobile?action=get-invoice&id=inv_001"
```

### Response

**Success Response:**

```json
{
  "success": true,
  "action": "get-invoice",
  "generated_at": "2025-12-20T10:30:00.000Z",
  "data": {
    "invoice": {
      "id": "ef5KiZay08bD1T6ltcg5",
      "invoice_id": "ef5KiZay08bD1T6ltcg5",
      "number": "INV-2025-001",
      "date": "2025-12-18",
      "due_date": "2025-12-25",
      "customer_name": "John Doe",
      "items": [
        {
          "product_id": "prod_001",
          "product_name": "Blue Dream - 3.5g",
          "quantity": 2.0,
          "price": 25.0,
          "total": 50.0
        }
      ],
      "total": 50.0,
      "status": "pending",
      "payment_status": "pending",
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
  "error": "Invoice not found"
}
```

---

## 4. Edit Invoice

Update an existing customer invoice.

**Authentication:** JWT token required

### Request

```http
POST /api/mobile
Content-Type: application/json
```

### Request Body

```json
{
  "action": "edit-invoice",
  "id": "inv_001",
  "customer_name": "Jane Smith",
  "date": "2025-12-18",
  "due_date": "2025-12-26",
  "items": [
    {
      "product_id": "prod_001",
      "product_name": "Blue Dream - 3.5g",
      "quantity": 3.0,
      "price": 25.0,
      "total": 75.0
    }
  ],
  "total": 75.0
}
```

### Request Parameters

| Parameter              | Type   | Required | Description                                                                |
| ---------------------- | ------ | -------- | -------------------------------------------------------------------------- |
| `action`               | string | Yes      | `edit-invoice`                                                             |
| `id`                   | string | Yes      | Invoice ID to update                                                       |
| `customer_name`        | string | No       | Updated customer name                                                      |
| `date`                 | string | No       | Updated invoice date in YYYY-MM-DD format                                  |
| `due_date`             | string | No       | Updated payment due date in YYYY-MM-DD format (must be after invoice date) |
| `items`                | array  | No       | Updated array of invoice items                                             |
| `items[].product_id`   | string | Yes\*    | Product identifier from stock (\*required if items provided)               |
| `items[].product_name` | string | Yes\*    | Product name (\*required if items provided)                                |
| `items[].quantity`     | number | Yes\*    | Quantity (\*required if items provided)                                    |
| `items[].price`        | number | Yes\*    | Unit price (\*required if items provided)                                  |
| `items[].total`        | number | Yes\*    | Line total (\*required if items provided)                                  |
| `total`                | number | No       | Updated invoice total                                                      |

### Example Request

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "edit-invoice",
    "id": "inv_001",
    "customer_name": "Jane Smith",
    "due_date": "2025-12-26",
    "total": 75.00
  }' \
  https://pos-candy-kush.vercel.app/api/mobile
```

### Response

**Success Response:**

```json
{
  "success": true,
  "data": {
    "invoice": {
      "id": "inv_001",
      "number": "INV-2025-001",
      "date": "2025-12-18",
      "due_date": "2025-12-26",
      "customer_name": "Jane Smith",
      "items": [
        {
          "product_id": "prod_001",
          "product_name": "Blue Dream - 3.5g",
          "quantity": 2.0,
          "price": 25.0,
          "total": 50.0
        }
      ],
      "total": 75.0,
      "created_at": "2025-12-18T10:30:00Z",
      "updated_at": "2025-12-18T11:45:00Z"
    }
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Invoice not found"
}
```

---

## 5. Update Invoice Status **[NEW]**

Update the status of an invoice (pending, paid, or cancelled). This endpoint is used to mark invoices as paid or cancelled from the mobile app.

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
  "action": "update-invoice-status",
  "invoice_id": "ef5KiZay08bD1T6ltcg5",
  "status": "paid"
}
```

### Parameters

| Parameter    | Type   | Required | Description                                   |
| ------------ | ------ | -------- | --------------------------------------------- |
| `action`     | string | Yes      | Must be `update-invoice-status`               |
| `invoice_id` | string | Yes      | Invoice ID to update                          |
| `status`     | string | Yes      | New status: `pending`, `paid`, or `cancelled` |

### Valid Status Values

- `pending` - Invoice awaiting payment (default)
- `paid` - Invoice has been paid
- `cancelled` - Invoice has been cancelled

### Example Request

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update-invoice-status",
    "invoice_id": "ef5KiZay08bD1T6ltcg5",
    "status": "paid"
  }' \
  https://pos-candy-kush.vercel.app/api/mobile
```

### Response

**Success Response:**

```json
{
  "success": true,
  "action": "update-invoice-status",
  "data": {
    "invoice": {
      "id": "ef5KiZay08bD1T6ltcg5",
      "invoice_id": "ef5KiZay08bD1T6ltcg5",
      "number": "INV-2025-001",
      "customer_name": "John Doe",
      "date": "2025-12-18",
      "due_date": "2025-12-25",
      "items": [...],
      "total": 50.0,
      "status": "paid",
      "payment_status": "paid",
      "created_at": "2025-12-18T10:30:00.000Z",
      "updated_at": "2025-12-20T15:30:00.000Z"
    }
  }
}
```

**Error Responses:**

**Missing invoice_id:**

```json
{
  "success": false,
  "error": "invoice_id is required"
}
```

**Missing status:**

```json
{
  "success": false,
  "error": "status is required (pending, paid, or cancelled)"
}
```

**Invalid status:**

```json
{
  "success": false,
  "error": "Invalid status. Must be one of: pending, paid, cancelled"
}
```

**Invoice not found:**

```json
{
  "success": false,
  "error": "Invoice not found"
}
```

### Status Behavior

- When status is set to `paid`, `payment_status` automatically updates to `paid`
- When status is set to `cancelled` or `pending`, `payment_status` retains its previous value
- All status transitions are allowed (pending ↔ paid ↔ cancelled)

### Use Cases

1. **Mark as Paid:** When customer pays the invoice
2. **Mark as Cancelled:** When invoice is voided or cancelled
3. **Reset to Pending:** If an invoice needs to be reopened

---

## 6. Delete Invoice

Delete a customer invoice.

**Authentication:** JWT token required

### Request

```http
DELETE /api/mobile?action=delete-invoice&id={invoice_id}
Authorization: Bearer YOUR_JWT_TOKEN
```

### Query Parameters

| Parameter | Type   | Required | Description          |
| --------- | ------ | -------- | -------------------- |
| `action`  | string | Yes      | `delete-invoice`     |
| `id`      | string | Yes      | Invoice ID to delete |

### Example Request

```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "https://pos-candy-kush.vercel.app/api/mobile?action=delete-invoice&id=ef5KiZay08bD1T6ltcg5"
```

### Response

**Success Response:**

```json
{
  "success": true,
  "message": "Invoice deleted successfully"
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Invoice not found"
}
```

---

## Database Schema Requirements

### Invoices Table

```sql
CREATE TABLE invoices (
    id VARCHAR(50) PRIMARY KEY,
    number VARCHAR(50) UNIQUE NOT NULL,
    date DATE NOT NULL,
    due_date DATE NULL,
    customer_name VARCHAR(255) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Invoice Items Table

```sql
CREATE TABLE invoice_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);
```

### Indexes

```sql
CREATE INDEX idx_invoices_date ON invoices(date);
CREATE INDEX idx_invoices_customer ON invoices(customer_name);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_product ON invoice_items(product_id);
```

---

## Android Integration Guide

This section provides specific guidance for implementing the Customer Invoice API in Android applications.

### HTTP Client Setup

Use OkHttp or Retrofit for API communication:

```kotlin
// OkHttp client with authentication interceptor
val client = OkHttpClient.Builder()
    .addInterceptor { chain ->
        val original = chain.request()
        val request = original.newBuilder()
            .header("Authorization", "Bearer $jwtToken")
            .header("Content-Type", "application/json")
            .build()
        chain.proceed(request)
    }
    .build()
```

### Data Models

```kotlin
import com.google.gson.annotations.SerializedName

// Invoice data class with complete fields
data class Invoice(
    val id: String,
    @SerializedName("invoice_id") val invoiceId: String = "", // Backward compatibility
    val number: String,
    val date: String,
    @SerializedName("due_date") val dueDate: String?, // Nullable
    @SerializedName("customer_name") val customerName: String,
    val items: List<InvoiceItem>,
    val total: Double,
    val status: String = "pending", // pending, paid, cancelled
    @SerializedName("payment_status") val paymentStatus: String = "pending",
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("updated_at") val updatedAt: String?
) {
    // Helper method for status display
    fun getStatusText(): String = when (status.lowercase()) {
        "paid" -> "Paid"
        "pending" -> "Pending"
        "cancelled" -> "Cancelled"
        else -> status.capitalize()
    }

    // Helper method for status color
    fun getStatusColor(): Int = when (status.lowercase()) {
        "paid" -> R.color.status_completed      // Green
        "pending" -> R.color.status_pending     // Orange
        "cancelled" -> R.color.error_red        // Red
        else -> R.color.black
    }

    // Check if invoice can be edited (only pending invoices)
    fun canBeEdited(): Boolean = status.lowercase() == "pending"

    // Check if invoice can be marked as paid
    fun canBeMarkedPaid(): Boolean = status.lowercase() == "pending"
}

// Invoice item data class
data class InvoiceItem(
    @SerializedName("product_id") val productId: String,
    @SerializedName("product_name") val productName: String,
    val quantity: Double,
    val price: Double,
    val total: Double
)

// API response wrapper
data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val error: String? = null
)

// Invoice list response
data class InvoiceListResponse(
    val invoices: List<Invoice>
)

// Single invoice response
data class InvoiceResponse(
    val invoice: Invoice
)
```

### API Service Interface

```kotlin
interface InvoiceApiService {
    @GET("/api/mobile")
    suspend fun getInvoices(
        @Query("action") action: String = "get-invoices"
    ): ApiResponse<InvoiceListResponse>

    @GET("/api/mobile")
    suspend fun getInvoice(
        @Query("action") action: String = "get-invoice",
        @Query("id") id: String
    ): ApiResponse<InvoiceResponse>

    @POST("/api/mobile")
    suspend fun createInvoice(
        @Body request: CreateInvoiceRequest
    ): ApiResponse<InvoiceResponse>

    @POST("/api/mobile")
    suspend fun editInvoice(
        @Body request: EditInvoiceRequest
    ): ApiResponse<InvoiceResponse>

    @POST("/api/mobile")
    suspend fun updateInvoiceStatus(
        @Body request: UpdateInvoiceStatusRequest
    ): ApiResponse<InvoiceResponse>

    @DELETE("/api/mobile")
    suspend fun deleteInvoice(
        @Query("action") action: String = "delete-invoice",
        @Query("id") id: String
    ): ApiResponse<Unit>
}

// Request models
data class CreateInvoiceRequest(
    val action: String = "create-invoice",
    @SerializedName("customer_name") val customerName: String,
    val date: String,
    @SerializedName("due_date") val dueDate: String? = null,
    val items: List<InvoiceItem>,
    val total: Double
)

data class EditInvoiceRequest(
    val action: String = "edit-invoice",
    val id: String,
    @SerializedName("customer_name") val customerName: String? = null,
    val date: String? = null,
    @SerializedName("due_date") val dueDate: String? = null,
    val items: List<InvoiceItem>? = null,
    val total: Double? = null
)

data class UpdateInvoiceStatusRequest(
    val action: String = "update-invoice-status",
    @SerializedName("invoice_id") val invoiceId: String,
    val status: String // "pending", "paid", "cancelled"
)
```

### Complete Implementation Example

#### 1. Repository Layer (Data Access)

```kotlin
class InvoiceRepository(private val apiService: InvoiceApiService) {

    suspend fun getAllInvoices(): ApiResult<List<Invoice>> {
        return safeApiCall {
            apiService.getInvoices()
        }
    }

    suspend fun getInvoiceById(invoiceId: String): ApiResult<Invoice> {
        return safeApiCall {
            apiService.getInvoice(id = invoiceId)
        }
    }

    suspend fun createInvoice(
        customerName: String,
        date: LocalDate,
        dueDate: LocalDate?,
        items: List<InvoiceItem>
    ): ApiResult<Invoice> {
        val total = items.sumOf { it.total }

        return safeApiCall {
            apiService.createInvoice(
                CreateInvoiceRequest(
                    customerName = customerName,
                    date = date.toApiDateString(),
                    dueDate = dueDate?.toApiDateString(),
                    items = items,
                    total = total
                )
            )
        }
    }

    suspend fun updateInvoice(
        invoiceId: String,
        customerName: String? = null,
        date: String? = null,
        dueDate: String? = null,
        items: List<InvoiceItem>? = null,
        total: Double? = null
    ): ApiResult<Invoice> {
        return safeApiCall {
            apiService.editInvoice(
                EditInvoiceRequest(
                    id = invoiceId,
                    customerName = customerName,
                    date = date,
                    dueDate = dueDate,
                    items = items,
                    total = total
                )
            )
        }
    }

    suspend fun updateInvoiceStatus(
        invoiceId: String,
        newStatus: String
    ): ApiResult<Invoice> {
        return safeApiCall {
            apiService.updateInvoiceStatus(
                UpdateInvoiceStatusRequest(
                    invoiceId = invoiceId,
                    status = newStatus
                )
            )
        }
    }

    suspend fun deleteInvoice(invoiceId: String): ApiResult<Unit> {
        return safeApiCall {
            apiService.deleteInvoice(id = invoiceId)
        }
    }
}

// Extension function for mapping list responses
suspend fun <T, R> ApiResult<T>.map(transform: (T) -> R): ApiResult<R> {
    return when (this) {
        is ApiResult.Success -> ApiResult.Success(transform(data))
        is ApiResult.Error -> ApiResult.Error(message, code)
    }
}
```

#### 2. ViewModel Layer (Business Logic)

```kotlin
class InvoiceViewModel(
    private val repository: InvoiceRepository
) : ViewModel() {

    private val _invoices = MutableStateFlow<List<Invoice>>(emptyList())
    val invoices: StateFlow<List<Invoice>> = _invoices.asStateFlow()

    private val _selectedInvoice = MutableStateFlow<Invoice?>(null)
    val selectedInvoice: StateFlow<Invoice?> = _selectedInvoice.asStateFlow()

    private val _uiState = MutableStateFlow<UiState>(UiState.Idle)
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    fun loadInvoices() {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            when (val result = repository.getAllInvoices()) {
                is ApiResult.Success -> {
                    _invoices.value = result.data
                    _uiState.value = UiState.Success("Invoices loaded successfully")
                }
                is ApiResult.Error -> {
                    _uiState.value = UiState.Error(result.message)
                }
            }
        }
    }

    fun loadInvoiceDetails(invoiceId: String) {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            when (val result = repository.getInvoiceById(invoiceId)) {
                is ApiResult.Success -> {
                    _selectedInvoice.value = result.data
                    _uiState.value = UiState.Success("Invoice loaded")
                }
                is ApiResult.Error -> {
                    _uiState.value = UiState.Error(result.message)
                }
            }
        }
    }

    fun markInvoiceAsPaid(invoiceId: String) {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            when (val result = repository.updateInvoiceStatus(invoiceId, "paid")) {
                is ApiResult.Success -> {
                    // Update local state
                    _selectedInvoice.value = result.data
                    _invoices.value = _invoices.value.map {
                        if (it.id == invoiceId) result.data else it
                    }
                    _uiState.value = UiState.Success("Invoice marked as paid")
                }
                is ApiResult.Error -> {
                    _uiState.value = UiState.Error(result.message)
                }
            }
        }
    }

    fun cancelInvoice(invoiceId: String) {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            when (val result = repository.updateInvoiceStatus(invoiceId, "cancelled")) {
                is ApiResult.Success -> {
                    _selectedInvoice.value = result.data
                    _invoices.value = _invoices.value.map {
                        if (it.id == invoiceId) result.data else it
                    }
                    _uiState.value = UiState.Success("Invoice cancelled")
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
    }
}
```

#### 3. UI Layer (Invoice Detail Screen)

```kotlin
@Composable
fun InvoiceDetailScreen(
    invoiceId: String,
    viewModel: InvoiceViewModel = viewModel()
) {
    val invoice by viewModel.selectedInvoice.collectAsState()
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(invoiceId) {
        viewModel.loadInvoiceDetails(invoiceId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Invoice #${invoice?.number ?: ""}") },
                actions = {
                    // Show action buttons based on status
                    invoice?.let { inv ->
                        if (inv.canBeMarkedPaid()) {
                            IconButton(onClick = { viewModel.markInvoiceAsPaid(inv.id) }) {
                                Icon(Icons.Default.CheckCircle, "Mark as Paid")
                            }
                        }
                        if (inv.canBeEdited()) {
                            IconButton(onClick = { viewModel.cancelInvoice(inv.id) }) {
                                Icon(Icons.Default.Cancel, "Cancel Invoice")
                            }
                        }
                    }
                }
            )
        }
    ) { padding ->
        when (uiState) {
            is InvoiceViewModel.UiState.Loading -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            is InvoiceViewModel.UiState.Error -> {
                ErrorMessage((uiState as InvoiceViewModel.UiState.Error).message)
            }
            else -> {
                invoice?.let { inv ->
                    InvoiceDetailContent(
                        invoice = inv,
                        modifier = Modifier.padding(padding)
                    )
                }
            }
        }
    }
}

@Composable
fun InvoiceDetailContent(invoice: Invoice, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState())
    ) {
        // Status badge
        Card(
            colors = CardDefaults.cardColors(
                containerColor = invoice.getStatusColor()
            ),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                text = invoice.getStatusText(),
                style = MaterialTheme.typography.titleMedium,
                color = Color.White,
                modifier = Modifier.padding(16.dp)
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Customer info
        InfoRow("Customer", invoice.customerName)
        InfoRow("Invoice Date", invoice.date)
        invoice.dueDate?.let { InfoRow("Due Date", it) }

        Spacer(modifier = Modifier.height(24.dp))

        // Items
        Text("Items", style = MaterialTheme.typography.titleLarge)
        Spacer(modifier = Modifier.height(8.dp))

        invoice.items.forEach { item ->
            InvoiceItemRow(item)
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Total
        Divider()
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                "Total",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            Text(
                "$${String.format("%.2f", invoice.total)}",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
        }

        // Timestamps
        invoice.createdAt?.let {
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                "Created: ${it.formatTimestamp()}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        invoice.updatedAt?.let {
            Text(
                "Updated: ${it.formatTimestamp()}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium)
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
    }
}

@Composable
fun InvoiceItemRow(item: InvoiceItem) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(item.productName, style = MaterialTheme.typography.bodyLarge)
                Text(
                    "${item.quantity} x $${String.format("%.2f", item.price)}",
                    style = MaterialTheme.typography.bodySmall
                )
            }
            Text(
                "$${String.format("%.2f", item.total)}",
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

// Helper function to format ISO timestamps
fun String.formatTimestamp(): String {
    return try {
        val instant = Instant.parse(this)
        val formatter = DateTimeFormatter.ofPattern("MMM dd, yyyy HH:mm")
            .withZone(ZoneId.systemDefault())
        formatter.format(instant)
    } catch (e: Exception) {
        this
    }
}
```

### Error Handling

```kotlin
sealed class ApiResult<out T> {
    data class Success<out T>(val data: T) : ApiResult<T>()
    data class Error(val message: String, val code: Int? = null) : ApiResult<Nothing>()
}

suspend fun <T> safeApiCall(apiCall: suspend () -> Response<ApiResponse<T>>): ApiResult<T> {
    return try {
        val response = apiCall()
        if (response.isSuccessful) {
            val body = response.body()
            if (body?.success == true && body.data != null) {
                ApiResult.Success(body.data)
            } else {
                ApiResult.Error(body?.error ?: "Unknown error")
            }
        } else {
            ApiResult.Error("HTTP ${response.code()}: ${response.message()}")
        }
    } catch (e: Exception) {
        ApiResult.Error(e.localizedMessage ?: "Network error")
    }
}
```

### Date Handling

```kotlin
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.Instant
import java.time.ZoneId

// Parse dates from API (YYYY-MM-DD format)
fun String.toLocalDate(): LocalDate? {
    return try {
        LocalDate.parse(this, DateTimeFormatter.ISO_LOCAL_DATE)
    } catch (e: Exception) {
        null
    }
}

// Format dates for API
fun LocalDate.toApiDateString(): String {
    return this.format(DateTimeFormatter.ISO_LOCAL_DATE)
}

// Format ISO 8601 timestamps for display
fun String.formatTimestamp(): String {
    return try {
        val instant = Instant.parse(this)
        val formatter = DateTimeFormatter.ofPattern("MMM dd, yyyy HH:mm")
            .withZone(ZoneId.systemDefault())
        formatter.format(instant)
    } catch (e: Exception) {
        this
    }
}

// Validate due date is after invoice date
fun validateDueDate(invoiceDate: LocalDate, dueDate: LocalDate?): Boolean {
    return dueDate == null || dueDate.isAfter(invoiceDate)
}
```

### Quick Start Example

Here's a minimal example to get started with the Invoice API:

```kotlin
// 1. Setup (in Application or DI module)
val retrofit = Retrofit.Builder()
    .baseUrl("https://pos-candy-kush.vercel.app")
    .addConverterFactory(GsonConverterFactory.create())
    .build()

val apiService = retrofit.create(InvoiceApiService::class.java)
val repository = InvoiceRepository(apiService)

// 2. Authenticate (before any invoice operations)
viewModelScope.launch {
    val loginResult = apiService.login(
        LoginRequest(email = "user@example.com", password = "password")
    )
    if (loginResult.isSuccessful && loginResult.body()?.success == true) {
        val token = loginResult.body()?.data?.token
        // Store token securely and add to subsequent requests
    }
}

// 3. Fetch all invoices
viewModelScope.launch {
    when (val result = repository.getAllInvoices()) {
        is ApiResult.Success -> {
            val invoices = result.data
            // Update UI with invoices
        }
        is ApiResult.Error -> {
            // Show error message
        }
    }
}

// 4. Mark invoice as paid
viewModelScope.launch {
    when (val result = repository.updateInvoiceStatus(invoiceId, "paid")) {
        is ApiResult.Success -> {
            // Invoice updated successfully
        }
        is ApiResult.Error -> {
            // Handle error
        }
    }
}
```

### Network Configuration

```kotlin
// Network timeout configuration
val client = OkHttpClient.Builder()
    .connectTimeout(30, TimeUnit.SECONDS)
    .readTimeout(30, TimeUnit.SECONDS)
    .writeTimeout(30, TimeUnit.SECONDS)
    .addInterceptor { chain ->
        // Add JWT token to all requests
        val token = getStoredToken() // Implement secure token storage
        val request = chain.request().newBuilder()
            .addHeader("Authorization", "Bearer $token")
            .build()
        chain.proceed(request)
    }
    .build()

// Retrofit instance
val retrofit = Retrofit.Builder()
    .baseUrl("https://pos-candy-kush.vercel.app")
    .client(client)
    .addConverterFactory(GsonConverterFactory.create())
    .build()
```

---

## Mobile App Usage Patterns

### 1. Invoice List Display with Status Filtering

```kotlin
@Composable
fun InvoiceListScreen(viewModel: InvoiceViewModel = viewModel()) {
    val invoices by viewModel.invoices.collectAsState()
    var selectedFilter by remember { mutableStateOf("all") }

    val filteredInvoices = when (selectedFilter) {
        "pending" -> invoices.filter { it.status == "pending" }
        "paid" -> invoices.filter { it.status == "paid" }
        "cancelled" -> invoices.filter { it.status == "cancelled" }
        else -> invoices
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
                label = { Text("All (${invoices.size})") }
            )
            FilterChip(
                selected = selectedFilter == "pending",
                onClick = { selectedFilter = "pending" },
                label = { Text("Pending (${invoices.count { it.status == "pending" }})") }
            )
            FilterChip(
                selected = selectedFilter == "paid",
                onClick = { selectedFilter = "paid" },
                label = { Text("Paid (${invoices.count { it.status == "paid" }})") }
            )
            FilterChip(
                selected = selectedFilter == "cancelled",
                onClick = { selectedFilter = "cancelled" },
                label = { Text("Cancelled (${invoices.count { it.status == "cancelled" }})") }
            )
        }

        // Invoice list
        LazyColumn {
            items(filteredInvoices) { invoice ->
                InvoiceListItem(
                    invoice = invoice,
                    onClick = { /* Navigate to detail */ }
                )
            }
        }
    }
}

@Composable
fun InvoiceListItem(invoice: Invoice, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Invoice #${invoice.number}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = invoice.customerName,
                    style = MaterialTheme.typography.bodyMedium
                )
                Text(
                    text = invoice.date,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "$${String.format("%.2f", invoice.total)}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Badge(
                    containerColor = invoice.getStatusColor(),
                    modifier = Modifier.padding(top = 4.dp)
                ) {
                    Text(
                        text = invoice.getStatusText(),
                        color = Color.White
                    )
                }
            }
        }
    }
}
```

### 2. Status Update with Confirmation Dialog

```kotlin
@Composable
fun InvoiceDetailScreen(
    invoiceId: String,
    viewModel: InvoiceViewModel = viewModel()
) {
    val invoice by viewModel.selectedInvoice.collectAsState()
    var showMarkPaidDialog by remember { mutableStateOf(false) }
    var showCancelDialog by remember { mutableStateOf(false) }

    // Mark as paid confirmation dialog
    if (showMarkPaidDialog) {
        AlertDialog(
            onDismissRequest = { showMarkPaidDialog = false },
            title = { Text("Mark as Paid") },
            text = {
                Text("Are you sure you want to mark this invoice as paid? This action can be undone later if needed.")
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        invoice?.let { viewModel.markInvoiceAsPaid(it.id) }
                        showMarkPaidDialog = false
                    }
                ) {
                    Text("Mark as Paid")
                }
            },
            dismissButton = {
                TextButton(onClick = { showMarkPaidDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Cancel invoice confirmation dialog
    if (showCancelDialog) {
        AlertDialog(
            onDismissRequest = { showCancelDialog = false },
            title = { Text("Cancel Invoice") },
            text = {
                Text("Are you sure you want to cancel this invoice? You can reactivate it later if needed.")
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        invoice?.let { viewModel.cancelInvoice(it.id) }
                        showCancelDialog = false
                    },
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Text("Cancel Invoice")
                }
            },
            dismissButton = {
                TextButton(onClick = { showCancelDialog = false }) {
                    Text("Keep Invoice")
                }
            }
        )
    }

    Scaffold(
        floatingActionButton = {
            invoice?.let { inv ->
                if (inv.canBeMarkedPaid()) {
                    FloatingActionButton(
                        onClick = { showMarkPaidDialog = true },
                        containerColor = MaterialTheme.colorScheme.primary
                    ) {
                        Icon(Icons.Default.CheckCircle, "Mark as Paid")
                    }
                }
            }
        }
    ) { padding ->
        // Invoice detail content
        InvoiceDetailContent(
            invoice = invoice,
            onCancelClick = { showCancelDialog = true },
            modifier = Modifier.padding(padding)
        )
    }
}
```

### 3. Offline Caching Strategy

```kotlin
class InvoiceRepository(
    private val apiService: InvoiceApiService,
    private val localDatabase: InvoiceDao
) {

    // Fetch invoices with cache-first strategy
    suspend fun getAllInvoices(forceRefresh: Boolean = false): ApiResult<List<Invoice>> {
        // Return cached data first if available and not forcing refresh
        if (!forceRefresh) {
            val cachedInvoices = localDatabase.getAllInvoices()
            if (cachedInvoices.isNotEmpty()) {
                return ApiResult.Success(cachedInvoices)
            }
        }

        // Fetch from API
        return when (val result = safeApiCall { apiService.getInvoices() }) {
            is ApiResult.Success -> {
                // Update local cache
                localDatabase.insertAll(result.data)
                ApiResult.Success(result.data)
            }
            is ApiResult.Error -> {
                // If network fails, return cached data as fallback
                val cachedInvoices = localDatabase.getAllInvoices()
                if (cachedInvoices.isNotEmpty()) {
                    ApiResult.Success(cachedInvoices)
                } else {
                    result
                }
            }
        }
    }

    // Update invoice status with optimistic update
    suspend fun updateInvoiceStatus(
        invoiceId: String,
        newStatus: String
    ): ApiResult<Invoice> {
        // Optimistically update local cache
        localDatabase.updateInvoiceStatus(invoiceId, newStatus)

        // Send to API
        return when (val result = safeApiCall {
            apiService.updateInvoiceStatus(
                UpdateInvoiceStatusRequest(invoiceId = invoiceId, status = newStatus)
            )
        }) {
            is ApiResult.Success -> {
                // Sync local cache with server response
                localDatabase.update(result.data)
                result
            }
            is ApiResult.Error -> {
                // Rollback optimistic update on failure
                val originalInvoice = localDatabase.getInvoiceById(invoiceId)
                originalInvoice?.let { localDatabase.update(it) }
                result
            }
        }
    }
}

// Room DAO for local caching
@Dao
interface InvoiceDao {
    @Query("SELECT * FROM invoices ORDER BY date DESC")
    suspend fun getAllInvoices(): List<Invoice>

    @Query("SELECT * FROM invoices WHERE id = :id")
    suspend fun getInvoiceById(id: String): Invoice?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(invoices: List<Invoice>)

    @Update
    suspend fun update(invoice: Invoice)

    @Query("UPDATE invoices SET status = :status, updated_at = :updatedAt WHERE id = :invoiceId")
    suspend fun updateInvoiceStatus(invoiceId: String, status: String, updatedAt: String = System.currentTimeMillis().toString())
}
```

### 4. Pull-to-Refresh Implementation

```kotlin
@Composable
fun InvoiceListScreen(viewModel: InvoiceViewModel = viewModel()) {
    val invoices by viewModel.invoices.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val pullRefreshState = rememberPullRefreshState(
        refreshing = isRefreshing,
        onRefresh = { viewModel.refreshInvoices() }
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .pullRefresh(pullRefreshState)
    ) {
        LazyColumn {
            items(invoices) { invoice ->
                InvoiceListItem(invoice = invoice, onClick = { /* ... */ })
            }
        }

        PullRefreshIndicator(
            refreshing = isRefreshing,
            state = pullRefreshState,
            modifier = Modifier.align(Alignment.TopCenter)
        )
    }
}

// In ViewModel
class InvoiceViewModel(private val repository: InvoiceRepository) : ViewModel() {
    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    fun refreshInvoices() {
        viewModelScope.launch {
            _isRefreshing.value = true
            when (val result = repository.getAllInvoices(forceRefresh = true)) {
                is ApiResult.Success -> {
                    _invoices.value = result.data
                }
                is ApiResult.Error -> {
                    // Show error toast/snackbar
                }
            }
            _isRefreshing.value = false
        }
    }
}
```

---

## Best Practices

### 1. Security

- **Token Storage**: Store JWT tokens securely using EncryptedSharedPreferences (Android) or Keychain (iOS)
- **Token Refresh**: Implement automatic token refresh when approaching expiration (tokens last 30 days)
- **HTTPS Only**: Always use HTTPS for API communication (already enforced by the API)
- **Secure Logging**: Never log sensitive data (tokens, customer info) in production builds

### 2. Performance

- **Pagination**: Implement pagination for large invoice lists (to be added to API in future)
- **Image Loading**: Use Coil or Glide for efficient product image loading
- **List Recycling**: Use LazyColumn (Compose) or RecyclerView (Views) for efficient list rendering
- **Background Processing**: Run API calls on background threads (handled automatically by Retrofit + coroutines)

### 3. User Experience

- **Loading States**: Always show loading indicators during network operations
- **Error Messages**: Provide clear, actionable error messages to users
- **Offline Support**: Cache data locally for offline viewing
- **Confirmation Dialogs**: Require confirmation for destructive actions (cancel invoice, delete)
- **Pull-to-Refresh**: Allow users to manually refresh data
- **Optimistic Updates**: Update UI immediately, then sync with server

### 4. Data Validation

- **Client-Side Validation**: Validate data before sending to API to reduce network errors
- **Date Validation**: Ensure due dates are after invoice dates
- **Amount Validation**: Verify totals match item amounts before submission
- **Required Fields**: Check all required fields are present before API calls

### 5. Error Handling

- **Network Errors**: Handle timeouts, no connection, server errors gracefully
- **Validation Errors**: Display field-specific errors to users
- **Token Expiration**: Automatically redirect to login when token expires
- **Retry Logic**: Implement exponential backoff for failed requests

### 6. Testing

- **Unit Tests**: Test ViewModels and Repositories with mock data
- **Integration Tests**: Test API communication with test server
- **UI Tests**: Test user flows with Espresso (Android) or XCTest (iOS)
- **Edge Cases**: Test with empty lists, network failures, invalid data

---

## Integration Notes

1. **Existing Dependencies**: The mobile app already uses the `stock` endpoint to fetch products for invoice creation
2. **Caching**: The mobile app implements caching for invoice data to support offline viewing
3. **Error Handling**: Implement proper error responses for network issues, validation failures, and business logic violations
4. **Data Consistency**: Ensure atomic operations when creating invoices and updating stock levels
5. **Performance**: Consider pagination for large invoice lists in the future
6. **Android Integration**: Use the provided Kotlin data models and Retrofit interfaces for seamless Android integration
7. **Due Date Handling**: The `due_date` field is optional but when provided must be after the invoice date
8. **Date Format**: All dates use ISO 8601 format (YYYY-MM-DD) for consistency across platforms

---

## Testing Checklist

### API Endpoint Tests

- [x] GET /api/mobile?action=get-invoices returns empty array when no invoices exist
- [x] GET /api/mobile?action=get-invoices returns proper invoice data structure with all fields (invoice_id, status, payment_status, timestamps)
- [x] GET /api/mobile?action=get-invoice returns single invoice with complete details
- [x] GET /api/mobile?action=get-invoice returns 404 for non-existent invoice
- [x] POST /api/mobile?action=create-invoice validates required fields
- [x] POST /api/mobile?action=create-invoice creates invoice with correct totals
- [x] POST /api/mobile?action=create-invoice generates unique invoice numbers
- [x] POST /api/mobile?action=create-invoice handles invalid product IDs
- [x] POST /api/mobile?action=create-invoice validates date format
- [x] POST /api/mobile?action=create-invoice validates due_date is after invoice date
- [x] POST /api/mobile?action=create-invoice handles optional due_date field
- [x] POST /api/mobile?action=create-invoice defaults status to "pending"
- [x] POST /api/mobile?action=edit-invoice updates invoice with due_date validation
- [x] POST /api/mobile?action=edit-invoice preserves existing status
- [x] POST /api/mobile?action=update-invoice-status validates status values (pending, paid, cancelled)
- [x] POST /api/mobile?action=update-invoice-status updates status successfully
- [x] POST /api/mobile?action=update-invoice-status automatically updates payment_status when marking as paid
- [x] POST /api/mobile?action=update-invoice-status allows status transitions (pending ↔ paid ↔ cancelled)
- [x] POST /api/mobile?action=update-invoice-status returns 404 for non-existent invoice
- [x] POST /api/mobile?action=update-invoice-status requires invoice_id parameter
- [x] Authentication required for all invoice endpoints
- [x] Proper error responses for invalid requests
- [x] Timestamps (created_at, updated_at) are in ISO 8601 format

### Android Integration Tests

- [ ] Kotlin data models correctly parse API responses with all new fields
- [ ] Invoice.getStatusText() returns correct display text
- [ ] Invoice.getStatusColor() returns appropriate colors
- [ ] Invoice.canBeEdited() logic works correctly
- [ ] Invoice.canBeMarkedPaid() logic works correctly
- [ ] Retrofit service interfaces match API endpoints
- [ ] UpdateInvoiceStatusRequest serializes correctly
- [ ] Date parsing and formatting works correctly
- [ ] ISO 8601 timestamp parsing works (created_at, updated_at)
- [ ] Due date validation logic matches server validation
- [ ] Error handling covers all API error scenarios (network, validation, server errors)
- [ ] Network timeouts and retry logic implemented
- [ ] Offline caching works with invoice data and status updates
- [ ] Optimistic updates rollback on failure
- [ ] UI correctly displays invoice_id field
- [ ] UI correctly displays optional due_date field
- [ ] UI correctly displays status badges with colors
- [ ] UI correctly displays timestamps in user-friendly format
- [ ] Status update confirmation dialogs work correctly
- [ ] Pull-to-refresh updates invoice list
- [ ] Filter chips work for different statuses (all, pending, paid, cancelled)
- [ ] Invoice list shows correct badge colors for each status</content>
      <parameter name="filePath">C:\Users\kevin\AndroidStudioProjects\POSCandyKush\CUSTOMER_INVOICE_API_DOCUMENTATION.md
