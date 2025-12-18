# Customer Invoice API Documentation

This document provides documentation for the Customer Invoice API endpoints required for the POS Candy Kush mobile application.

## Base URL

```
https://pos-candy-kush.vercel.app/api/mobile
```

## Authentication

All API endpoints require JWT authentication. Include the JWT token in the `Authorization` header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

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
  "data": {
    "invoices": [
      {
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
// Invoice data class
data class Invoice(
    val id: String,
    val number: String,
    val date: String,
    val dueDate: String?, // Nullable due_date field
    val customerName: String,
    val items: List<InvoiceItem>,
    val total: Double,
    val createdAt: String,
    val updatedAt: String
)

// Invoice item data class
data class InvoiceItem(
    val productId: String,
    val productName: String,
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
    suspend fun getInvoices(@Query("action") action: String = "get-invoices"): ApiResponse<InvoiceListResponse>

    @GET("/api/mobile")
    suspend fun getInvoice(@Query("action") action: String = "get-invoice", @Query("id") id: String): ApiResponse<InvoiceResponse>

    @POST("/api/mobile")
    suspend fun createInvoice(@Body request: CreateInvoiceRequest): ApiResponse<InvoiceResponse>

    @POST("/api/mobile")
    suspend fun editInvoice(@Body request: EditInvoiceRequest): ApiResponse<InvoiceResponse>
}

// Request models
data class CreateInvoiceRequest(
    val action: String = "create-invoice",
    val customerName: String,
    val date: String,
    val dueDate: String? = null,
    val items: List<InvoiceItem>,
    val total: Double
)

data class EditInvoiceRequest(
    val action: String = "edit-invoice",
    val id: String,
    val customerName: String? = null,
    val date: String? = null,
    val dueDate: String? = null,
    val items: List<InvoiceItem>? = null,
    val total: Double? = null
)
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

// Parse dates from API
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

// Validate due date is after invoice date
fun validateDueDate(invoiceDate: LocalDate, dueDate: LocalDate?): Boolean {
    return dueDate == null || dueDate.isAfter(invoiceDate)
}
```

### Usage Example

```kotlin
class InvoiceRepository(private val apiService: InvoiceApiService) {

    suspend fun getAllInvoices(): ApiResult<List<Invoice>> {
        return safeApiCall {
            apiService.getInvoices()
        }.map { it.invoices }
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
        }.map { it.invoice }
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
    .build()

// Retrofit instance
val retrofit = Retrofit.Builder()
    .baseUrl("https://pos-candy-kush.vercel.app")
    .client(client)
    .addConverterFactory(GsonConverterFactory.create())
    .build()
```

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
- [x] GET /api/mobile?action=get-invoices returns proper invoice data structure with due_date field
- [x] GET /api/mobile?action=get-invoice returns single invoice with due_date field
- [x] POST /api/mobile?action=create-invoice validates required fields
- [x] POST /api/mobile?action=create-invoice creates invoice with correct totals
- [x] POST /api/mobile?action=create-invoice generates unique invoice numbers
- [x] POST /api/mobile?action=create-invoice handles invalid product IDs
- [x] POST /api/mobile?action=create-invoice validates date format
- [x] POST /api/mobile?action=create-invoice validates due_date is after invoice date
- [x] POST /api/mobile?action=create-invoice handles optional due_date field
- [x] POST /api/mobile?action=edit-invoice updates invoice with due_date validation
- [x] Authentication required for all invoice endpoints
- [x] Proper error responses for invalid requests

### Android Integration Tests

- [ ] Kotlin data models correctly parse API responses
- [ ] Retrofit service interfaces match API endpoints
- [ ] Date parsing and formatting works correctly
- [ ] Due date validation logic matches server validation
- [ ] Error handling covers all API error scenarios
- [ ] Network timeouts and retry logic implemented
- [ ] Offline caching works with invoice data
- [ ] UI correctly displays optional due_date field</content>
      <parameter name="filePath">C:\Users\kevin\AndroidStudioProjects\POSCandyKush\CUSTOMER_INVOICE_API_DOCUMENTATION.md
