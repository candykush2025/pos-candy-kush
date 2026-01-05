# Purchase API Integration Guide for Mobile App

**Complete Guide for Sending Purchase Data to POS Candy Kush API**

**Last Updated:** January 6, 2026
**API Version:** 1.0
**Base URL:** `https://pos-candy-kush.vercel.app/api/mobile`

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Create Purchase Endpoint](#create-purchase-endpoint)
4. [Request Format](#request-format)
5. [Response Format](#response-format)
6. [Error Handling](#error-handling)
7. [Testing Examples](#testing-examples)
8. [Mobile Integration](#mobile-integration)

---

## Overview

This guide provides complete documentation for creating purchase orders through the POS Candy Kush mobile API. The API allows mobile applications to create purchase orders for inventory management.

**Key Features:**
- ✅ JWT Authentication required
- ✅ Full purchase order creation with multiple items
- ✅ Automatic validation of required fields
- ✅ Reminder system for due dates
- ✅ Stock level updates when completed

---

## Authentication

All purchase API endpoints require JWT authentication.

### Login Process

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
    "email": "admin@candykush.com",
    "role": "admin"
  }
}
```

**Use the token in Authorization header:**
```
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

---

## Create Purchase Endpoint

### Endpoint Details

**URL:** `https://pos-candy-kush.vercel.app/api/mobile?action=create-purchase`

**Method:** `POST`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Required Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `supplier_name` | string | Yes | Name of the supplier/vendor |
| `purchase_date` | string | Yes | Purchase date in YYYY-MM-DD format |
| `due_date` | string | Yes | Due date in YYYY-MM-DD format |
| `items` | array | Yes | Array of purchase items (min 1 item) |
| `total` | number | Yes | Total purchase amount (must be >= 0) |
| `reminder_type` | string | No | Reminder type: "no_reminder", "days_before", "weeks_before", "specific_date" |
| `reminder_value` | string | No | Reminder value (e.g., "3" for 3 days before) |
| `reminder_time` | string | No | Reminder time in HH:MM format (e.g., "09:00") |

### Items Array Structure

Each item in the `items` array must have:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `product_id` | string | Yes | Unique product identifier |
| `product_name` | string | Yes | Display name of the product |
| `quantity` | number | Yes | Quantity to purchase (must be > 0) |
| `price` | number | Yes | Unit price (must be >= 0) |
| `total` | number | Yes | Line total (quantity × price) |

---

## Request Format

### Complete Request Example

```http
POST /api/mobile?action=create-purchase
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "supplier_name": "Green Valley Suppliers",
  "purchase_date": "2026-01-06",
  "due_date": "2026-01-15",
  "items": [
    {
      "product_id": "cannabis_flower_001",
      "product_name": "Premium Cannabis Flower",
      "quantity": 10,
      "price": 50.00,
      "total": 500.00
    },
    {
      "product_id": "accessories_001",
      "product_name": "Rolling Papers",
      "quantity": 5,
      "price": 100.00,
      "total": 500.00
    }
  ],
  "total": 1000.00,
  "reminder_type": "days_before",
  "reminder_value": "3",
  "reminder_time": "09:00"
}
```

### Minimal Request Example

```json
{
  "supplier_name": "Test Supplier",
  "purchase_date": "2026-01-06",
  "due_date": "2026-01-15",
  "items": [
    {
      "product_id": "test_product_1",
      "product_name": "Test Product",
      "quantity": 1,
      "price": 100.00,
      "total": 100.00
    }
  ],
  "total": 100.00
}
```

---

## Response Format

### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "action": "create-purchase",
  "data": {
    "purchase": {
      "id": "abc123def456",
      "supplier_name": "Green Valley Suppliers",
      "purchase_date": "2026-01-06",
      "due_date": "2026-01-15",
      "items": [
        {
          "product_id": "cannabis_flower_001",
          "product_name": "Premium Cannabis Flower",
          "quantity": 10,
          "price": 50,
          "total": 500
        },
        {
          "product_id": "accessories_001",
          "product_name": "Rolling Papers",
          "quantity": 5,
          "price": 100,
          "total": 500
        }
      ],
      "total": 1000,
      "status": "pending",
      "reminder_type": "days_before",
      "reminder_value": "3",
      "reminder_time": "09:00"
    }
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `true` for successful requests |
| `action` | string | Always `"create-purchase"` |
| `data.purchase.id` | string | Unique purchase ID (auto-generated) |
| `data.purchase.status` | string | Always `"pending"` for new purchases |
| Other fields | various | Echo back the submitted data |

---

## Error Handling

### Common Error Responses

**Status Code:** `400 Bad Request`

```json
{
  "success": false,
  "error": "Supplier name is required"
}
```

```json
{
  "success": false,
  "error": "At least one item is required"
}
```

```json
{
  "success": false,
  "error": "Total must be a non-negative number"
}
```

### Authentication Errors

**Status Code:** `401 Unauthorized`

```json
{
  "success": false,
  "error": "Missing or invalid authorization header"
}
```

```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

### Error Codes and Messages

| Error Message | Cause |
|---------------|-------|
| `"Supplier name is required"` | `supplier_name` is empty or missing |
| `"Purchase date is required"` | `purchase_date` is missing |
| `"Due date is required"` | `due_date` is missing |
| `"At least one item is required"` | `items` array is empty or missing |
| `"Total must be a non-negative number"` | `total` is negative or not a number |
| `"Missing or invalid authorization header"` | No Bearer token provided |
| `"Invalid or expired token"` | JWT token is invalid |

---

## Testing Examples

### cURL Test Command

```bash
# 1. Login first
curl -X POST "https://pos-candy-kush.vercel.app/api/mobile?action=login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@candykush.com",
    "password": "admin123"
  }'

# 2. Create purchase (replace TOKEN with actual token)
curl -X POST "https://pos-candy-kush.vercel.app/api/mobile?action=create-purchase" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "supplier_name": "Test Supplier",
    "purchase_date": "2026-01-06",
    "due_date": "2026-01-15",
    "items": [
      {
        "product_id": "test_product_1",
        "product_name": "Test Product",
        "quantity": 10,
        "price": 50.00,
        "total": 500.00
      }
    ],
    "total": 500.00,
    "reminder_type": "days_before",
    "reminder_value": "3",
    "reminder_time": "09:00"
  }'
```

### JavaScript/Node.js Example

```javascript
async function createPurchase(token) {
  const response = await fetch('https://pos-candy-kush.vercel.app/api/mobile?action=create-purchase', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      supplier_name: "Green Valley Suppliers",
      purchase_date: "2026-01-06",
      due_date: "2026-01-15",
      items: [
        {
          product_id: "cannabis_flower_001",
          product_name: "Premium Cannabis Flower",
          quantity: 10,
          price: 50.00,
          total: 500.00
        }
      ],
      total: 500.00,
      reminder_type: "days_before",
      reminder_value: "3",
      reminder_time: "09:00"
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Purchase creation failed: ${data.error}`);
  }

  return data.data.purchase;
}
```

---

## Mobile Integration

### Kotlin/Android Example

```kotlin
data class PurchaseItem(
    @SerializedName("product_id") val productId: String,
    @SerializedName("product_name") val productName: String,
    val quantity: Int,
    val price: Double,
    val total: Double
)

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

data class PurchaseResponse(
    val success: Boolean,
    val action: String,
    val data: PurchaseData,
    val error: String? = null
)

data class PurchaseData(
    val purchase: Purchase
)

data class Purchase(
    val id: String,
    @SerializedName("supplier_name") val supplierName: String,
    @SerializedName("purchase_date") val purchaseDate: String,
    @SerializedName("due_date") val dueDate: String,
    val items: List<PurchaseItem>,
    val total: Double,
    val status: String,
    @SerializedName("reminder_type") val reminderType: String,
    @SerializedName("reminder_value") val reminderValue: String,
    @SerializedName("reminder_time") val reminderTime: String
)

// API Service
interface PurchaseApiService {
    @POST("/api/mobile")
    suspend fun createPurchase(
        @Body request: CreatePurchaseRequest
    ): PurchaseResponse
}

// Repository
class PurchaseRepository(private val apiService: PurchaseApiService) {
    suspend fun createPurchase(
        supplierName: String,
        purchaseDate: String,
        dueDate: String,
        items: List<PurchaseItem>,
        reminderType: String = "no_reminder",
        reminderValue: String = "",
        reminderTime: String = ""
    ): Result<Purchase> {
        return try {
            val total = items.sumOf { it.total }
            val request = CreatePurchaseRequest(
                supplierName = supplierName,
                purchaseDate = purchaseDate,
                dueDate = dueDate,
                items = items,
                total = total,
                reminderType = reminderType,
                reminderValue = reminderValue,
                reminderTime = reminderTime
            )

            val response = apiService.createPurchase(request)

            if (response.success) {
                Result.success(response.data.purchase)
            } else {
                Result.failure(Exception(response.error ?: "Unknown error"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

### Usage in Android Activity/Fragment

```kotlin
class CreatePurchaseActivity : AppCompatActivity() {
    private lateinit var apiService: PurchaseApiService
    private lateinit var repository: PurchaseRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize Retrofit
        val retrofit = Retrofit.Builder()
            .baseUrl("https://pos-candy-kush.vercel.app/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        apiService = retrofit.create(PurchaseApiService::class.java)
        repository = PurchaseRepository(apiService)
    }

    private fun createPurchase() {
        val items = listOf(
            PurchaseItem(
                productId = "cannabis_001",
                productName = "Premium Flower",
                quantity = 10,
                price = 50.0,
                total = 500.0
            )
        )

        lifecycleScope.launch {
            try {
                val result = repository.createPurchase(
                    supplierName = "Green Valley Suppliers",
                    purchaseDate = "2026-01-06",
                    dueDate = "2026-01-15",
                    items = items,
                    reminderType = "days_before",
                    reminderValue = "3",
                    reminderTime = "09:00"
                )

                result.onSuccess { purchase ->
                    Toast.makeText(this@CreatePurchaseActivity,
                        "Purchase created: ${purchase.id}",
                        Toast.LENGTH_LONG).show()
                    // Navigate to purchase details or list
                }.onFailure { error ->
                    Toast.makeText(this@CreatePurchaseActivity,
                        "Error: ${error.message}",
                        Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Log.e("CreatePurchase", "Error creating purchase", e)
            }
        }
    }
}
```

---

## 📝 Notes for Mobile Developers

1. **Date Format:** Always use `YYYY-MM-DD` format for dates
2. **Time Format:** Use `HH:MM` format for reminder times (24-hour)
3. **Total Calculation:** Ensure `total` matches sum of all item totals
4. **Item Totals:** Each item total should be `quantity × price`
5. **Authentication:** Store JWT token securely and refresh when expired
6. **Error Handling:** Always check `response.success` before accessing data
7. **Network:** Handle network timeouts and offline scenarios
8. **Validation:** Validate all required fields before sending request

---

## 🔧 Troubleshooting

### Common Issues

1. **400 Bad Request**
   - Check all required fields are present
   - Verify date formats (YYYY-MM-DD)
   - Ensure total is a positive number
   - Check items array is not empty

2. **401 Unauthorized**
   - Verify JWT token is valid and not expired
   - Check Authorization header format: `Bearer TOKEN`

3. **500 Internal Server Error**
   - Check server logs for detailed error
   - Verify Firebase configuration in production

### Testing Checklist

- [ ] Login works and returns valid JWT token
- [ ] Create purchase with minimal required fields
- [ ] Create purchase with all optional fields
- [ ] Verify purchase appears in get-purchases list
- [ ] Test error scenarios (missing fields, invalid dates)
- [ ] Test with different reminder configurations

---

**For additional support, check the main API documentation or contact the development team.**</content>
<parameter name="filePath">/Volumes/SANDISK/Candy Kush/pos-candy-kush/pos-candy-kush/PURCHASE_API_MOBILE_INTEGRATION.md