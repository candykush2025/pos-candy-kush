# Mobile API Documentation

This document provides comprehensive documentation for the POS Candy Kush Mobile API, designed for Android and iOS applications.

## Base URL

```
https://pos-candy-kush.vercel.app/api/mobile
```

## Authentication

All API endpoints require JWT authentication except for the login endpoint. Include the JWT token in the `Authorization` header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Login

Authenticate and receive a JWT token with admin privileges (valid for 1 month).

**Endpoint:** `POST /api/mobile`

**Request Body:**

```json
{
  "action": "login",
  "email": "admin@example.com",
  "password": "your_password"
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": "user_uid",
    "email": "admin@example.com",
    "name": "Admin User",
    "role": "admin"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 2592000
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

## CORS Support

The API supports CORS with the following headers:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

---

## Common Parameters

All sales-related endpoints (`sales-summary`, `sales-by-item`, `sales-by-category`, `sales-by-employee`) support these filter parameters:

| Parameter      | Type   | Required    | Description                                             |
| -------------- | ------ | ----------- | ------------------------------------------------------- |
| `action`       | string | Yes         | The action to perform (see Available Actions)           |
| `period`       | string | No          | Time period filter. Default: `last_30_days`             |
| `start_date`   | string | Conditional | ISO 8601 date (YYYY-MM-DD). Required if `period=custom` |
| `end_date`     | string | Conditional | ISO 8601 date (YYYY-MM-DD). Required if `period=custom` |
| `employee_ids` | string | No          | Comma-separated employee IDs to filter by               |

### Period Options

| Value          | Description                                              |
| -------------- | -------------------------------------------------------- |
| `today`        | Current day (midnight to now)                            |
| `this_week`    | Current week (Monday to now)                             |
| `this_month`   | Current month (1st to now)                               |
| `this_year`    | Current year (Jan 1 to now)                              |
| `custom`       | Custom date range (requires `start_date` and `end_date`) |
| `last_30_days` | Last 30 days (default)                                   |

---

## Available Actions

1. [Login](#login) - POST (No authentication required)
2. [Sales Summary](#1-sales-summary) - GET (JWT required)
3. [Sales by Item](#2-sales-by-item) - GET (JWT required)
4. [Sales by Category](#3-sales-by-category) - GET (JWT required)
5. [Sales by Employee](#4-sales-by-employee) - GET (JWT required)
6. [Stock/Inventory](#5-stockinventory) - GET (JWT required)

---

## Login

Authenticate with email and password to receive a JWT token with admin privileges.

### Request

```http
POST /api/mobile
Content-Type: application/json

{
  "action": "login",
  "email": "admin@example.com",
  "password": "your_password"
}
```

### Response

```json
{
  "success": true,
  "user": {
    "id": "firebase_user_uid",
    "email": "admin@example.com",
    "name": "Admin User",
    "role": "admin"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 2592000
}
```

### Error Responses

**Invalid Credentials:**

```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

**Missing Fields:**

```json
{
  "success": false,
  "error": "Email and password are required"
}
```

---

## 1. Sales Summary

Get day-by-day sales metrics and transaction statistics. This endpoint returns detailed data for each day in the selected period, allowing the mobile app to perform its own calculations and summaries.

**Authentication:** JWT token required

**Note:** The API returns raw daily data without aggregation. Your mobile app should calculate totals, averages, and summaries from the daily data for better performance.

### Request

```http
GET /api/mobile?action=sales-summary&period=today
```

### Query Parameters

| Parameter      | Type   | Required  | Example                                                   |
| -------------- | ------ | --------- | --------------------------------------------------------- |
| `action`       | string | Yes       | `sales-summary`                                           |
| `period`       | string | No        | `today`, `this_week`, `this_month`, `this_year`, `custom` |
| `start_date`   | string | If custom | `2024-01-01`                                              |
| `end_date`     | string | If custom | `2024-01-31`                                              |
| `employee_ids` | string | No        | `emp_001,emp_002`                                         |

### Example Requests

```bash
# Today's sales
curl "https://pos-candy-kush.vercel.app/api/mobile?action=sales-summary&period=today"

# This month's sales
curl "https://pos-candy-kush.vercel.app/api/mobile?action=sales-summary&period=this_month"

# Custom date range
curl "https://pos-candy-kush.vercel.app/api/mobile?action=sales-summary&period=custom&start_date=2024-01-01&end_date=2024-01-31"

# Filter by specific employees
curl "https://pos-candy-kush.vercel.app/api/mobile?action=sales-summary&period=this_week&employee_ids=emp_001,emp_002"
```

### Response

```json
{
  "success": true,
  "action": "sales-summary",
  "period": "this_month",
  "filters": {
    "date_range": {
      "from": "2024-12-01T00:00:00.000Z",
      "to": "2024-12-10T23:59:59.999Z"
    },
    "employee_ids": null
  },
  "generated_at": "2024-12-10T14:30:00.000Z",
  "data": {
    "period": {
      "from": "2024-12-01T00:00:00.000Z",
      "to": "2024-12-10T23:59:59.999Z"
    },
    "daily_data": [
      {
        "date": "2024-12-01",
        "metrics": {
          "gross_sales": 1500.0,
          "refunds": 0.0,
          "discounts": 50.0,
          "taxes": 120.0,
          "net_sales": 1450.0,
          "cost_of_goods": 800.0,
          "gross_profit": 650.0,
          "profit_margin": 44.83
        },
        "transactions": {
          "total_count": 5,
          "refund_count": 0,
          "average_value": 300.0,
          "items_sold": 15
        },
        "receipts": [
          {
            "receipt_id": "rec_001",
            "receipt_number": "R-001",
            "receipt_type": "SALE",
            "total": 300.0,
            "discount": 10.0,
            "tax": 24.0,
            "employee_id": "emp_001",
            "employee_name": "John Doe",
            "timestamp": "2024-12-01T10:30:00.000Z",
            "line_items": [
              {
                "item_id": "prod_001",
                "item_name": "Blue Dream - 3.5g",
                "quantity": 1,
                "price": 50.0,
                "total": 50.0,
                "cost": 30.0,
                "discount": 0.0
              }
            ]
          }
        ]
      },
      {
        "date": "2024-12-02",
        "metrics": {
          "gross_sales": 2000.0,
          "refunds": 100.0,
          "discounts": 30.0,
          "taxes": 150.0,
          "net_sales": 1870.0,
          "cost_of_goods": 1000.0,
          "gross_profit": 870.0,
          "profit_margin": 46.52
        },
        "transactions": {
          "total_count": 8,
          "refund_count": 1,
          "average_value": 250.0,
          "items_sold": 20
        },
        "receipts": []
      }
    ]
  }
}
```

### Response Fields

| Field                        | Type   | Description                            |
| ---------------------------- | ------ | -------------------------------------- |
| `daily_data`                 | array  | Array of daily sales data              |
| `daily_data[].date`          | string | Date in YYYY-MM-DD format              |
| `daily_data[].receipts`      | array  | All receipts for that day              |
| `metrics.gross_sales`        | number | Total sales before deductions          |
| `metrics.refunds`            | number | Total refund amount                    |
| `metrics.discounts`          | number | Total discounts applied                |
| `metrics.taxes`              | number | Total taxes collected                  |
| `metrics.net_sales`          | number | Gross sales - refunds - discounts      |
| `metrics.cost_of_goods`      | number | Total cost of sold items               |
| `metrics.gross_profit`       | number | Net sales - cost of goods              |
| `metrics.profit_margin`      | number | Profit margin percentage               |
| `transactions.total_count`   | number | Total number of sales transactions     |
| `transactions.refund_count`  | number | Total number of refund transactions    |
| `transactions.average_value` | number | Average transaction value              |
| `transactions.items_sold`    | number | Total items sold                       |
| `receipts[].receipt_id`      | string | Unique receipt identifier              |
| `receipts[].receipt_number`  | string | Human-readable receipt number          |
| `receipts[].receipt_type`    | string | SALE or REFUND                         |
| `receipts[].total`           | number | Receipt total amount                   |
| `receipts[].employee_id`     | string | Employee who processed the transaction |
| `receipts[].line_items`      | array  | Items in the receipt                   |

---

## 2. Sales by Item

Get sales breakdown by individual products/items on a day-by-day basis.

**Authentication:** JWT token required

**Note:** Returns daily breakdown of item sales. The mobile app should aggregate data across days if needed.

### Request

```http
GET /api/mobile?action=sales-by-item&period=this_month
```

### Example Request

```bash
curl "https://pos-candy-kush.vercel.app/api/mobile?action=sales-by-item&period=this_week"
```

### Response

```json
{
  "success": true,
  "action": "sales-by-item",
  "period": "this_week",
  "filters": {
    "date_range": {
      "from": "2024-12-09T00:00:00.000Z",
      "to": "2024-12-10T23:59:59.999Z"
    },
    "employee_ids": null
  },
  "generated_at": "2024-12-10T14:30:00.000Z",
  "data": {
    "period": {
      "from": "2024-12-09T00:00:00.000Z",
      "to": "2024-12-10T23:59:59.999Z"
    },
    "daily_data": [
      {
        "date": "2024-12-09",
        "items": [
          {
            "item_id": "prod_001",
            "item_name": "Blue Dream - 3.5g",
            "category": "Flower",
            "sku": "BD-35G",
            "quantity_sold": 25,
            "gross_sales": 1250.0,
            "net_sales": 1200.0,
            "cost_of_goods": 750.0,
            "discounts": 50.0,
            "gross_profit": 450.0,
            "profit_margin": 36.0,
            "average_price": 50.0,
            "transaction_count": 20
          }
        ]
      },
      {
        "date": "2024-12-10",
        "items": [
          {
            "item_id": "prod_001",
            "item_name": "Blue Dream - 3.5g",
            "category": "Flower",
            "sku": "BD-35G",
            "quantity_sold": 25,
            "gross_sales": 1250.0,
            "net_sales": 1200.0,
            "cost_of_goods": 750.0,
            "discounts": 50.0,
            "gross_profit": 450.0,
            "profit_margin": 36.0,
            "average_price": 50.0,
            "transaction_count": 25
          },
          {
            "item_id": "prod_002",
            "item_name": "OG Kush - 1g Cartridge",
            "category": "Vaporizers",
            "sku": "OGK-1G",
            "quantity_sold": 30,
            "gross_sales": 1500.0,
            "net_sales": 1450.0,
            "cost_of_goods": 900.0,
            "discounts": 50.0,
            "gross_profit": 550.0,
            "profit_margin": 36.67,
            "average_price": 50.0,
            "transaction_count": 28
          }
        ]
      }
    ]
  }
}
```

### Item Fields

| Field               | Type   | Description               |
| ------------------- | ------ | ------------------------- |
| `item_id`           | string | Unique product identifier |
| `item_name`         | string | Product name              |
| `category`          | string | Product category          |
| `sku`               | string | Stock Keeping Unit        |
| `quantity_sold`     | number | Total units sold          |
| `gross_sales`       | number | Total sales amount        |
| `net_sales`         | number | Sales after discounts     |
| `cost_of_goods`     | number | Total cost                |
| `discounts`         | number | Total discounts           |
| `gross_profit`      | number | Net sales - cost          |
| `profit_margin`     | number | Profit margin %           |
| `average_price`     | number | Average selling price     |
| `transaction_count` | number | Number of transactions    |

---

## 3. Sales by Category

Get sales breakdown by product categories.

**Authentication:** JWT token required

### Request

```http
GET /api/mobile?action=sales-by-category&period=this_month
```

### Example Request

```bash
curl "https://pos-candy-kush.vercel.app/api/mobile?action=sales-by-category&period=this_month"
```

### Response

```json
{
  "success": true,
  "action": "sales-by-category",
  "period": "this_month",
  "filters": {
    "date_range": {
      "from": "2024-12-01T00:00:00.000Z",
      "to": "2024-12-10T23:59:59.999Z"
    },
    "employee_ids": null
  },
  "generated_at": "2024-12-10T14:30:00.000Z",
  "data": {
    "period": {
      "from": "2024-12-01T00:00:00.000Z",
      "to": "2024-12-10T23:59:59.999Z"
    },
    "daily_data": [
      {
        "date": "2024-12-01",
        "categories": [
          {
            "category_id": "cat_001",
            "category_name": "Flower",
            "quantity_sold": 20,
            "gross_sales": 1000.0,
            "net_sales": 950.0,
            "cost_of_goods": 550.0,
            "discounts": 50.0,
            "gross_profit": 400.0,
            "item_count": 15,
            "percentage_of_sales": 50.0
          },
          {
            "category_id": "cat_002",
            "category_name": "Vaporizers",
            "quantity_sold": 10,
            "gross_sales": 1000.0,
            "net_sales": 1000.0,
            "cost_of_goods": 600.0,
            "discounts": 0.0,
            "gross_profit": 400.0,
            "item_count": 10,
            "percentage_of_sales": 50.0
          }
        ]
      },
      {
        "date": "2024-12-02",
        "categories": [
          {
            "category_id": "cat_001",
            "category_name": "Flower",
            "quantity_sold": 200,
            "gross_sales": 10000.0,
            "net_sales": 9500.0,
            "cost_of_goods": 5500.0,
            "discounts": 500.0,
            "gross_profit": 4000.0,
            "item_count": 150,
            "percentage_of_sales": 45.45
          }
        ]
      }
    ]
  }
}
```

### Category Fields

| Field                 | Type   | Description                  |
| --------------------- | ------ | ---------------------------- |
| `category_id`         | string | Unique category identifier   |
| `category_name`       | string | Category name                |
| `quantity_sold`       | number | Total units sold in category |
| `gross_sales`         | number | Total sales amount           |
| `net_sales`           | number | Sales after discounts        |
| `cost_of_goods`       | number | Total cost                   |
| `discounts`           | number | Total discounts              |
| `gross_profit`        | number | Net sales - cost             |
| `item_count`          | number | Number of line items         |
| `percentage_of_sales` | number | % of total sales             |

---

## 4. Sales by Employee

Get sales breakdown by employee/cashier.

**Authentication:** JWT token required

### Request

```http
GET /api/mobile?action=sales-by-employee&period=today
```

### Example Request

```bash
curl "https://pos-candy-kush.vercel.app/api/mobile?action=sales-by-employee&period=today"
```

### Response

```json
{
  "success": true,
  "action": "sales-by-employee",
  "period": "today",
  "filters": {
    "date_range": {
      "from": "2024-12-10T00:00:00.000Z",
      "to": "2024-12-10T23:59:59.999Z"
    },
    "employee_ids": null
  },
  "generated_at": "2024-12-10T14:30:00.000Z",
  "data": {
    "period": {
      "from": "2024-12-10T00:00:00.000Z",
      "to": "2024-12-10T23:59:59.999Z"
    },
    "daily_data": [
      {
        "date": "2024-12-10",
        "employees": [
          {
            "employee_id": "emp_001",
            "employee_name": "John Smith",
            "gross_sales": 5000.0,
            "refunds": 100.0,
            "discounts": 150.0,
            "net_sales": 4750.0,
            "transaction_count": 20,
            "refund_count": 1,
            "items_sold": 65,
            "average_transaction": 250.0
          },
          {
            "employee_id": "emp_002",
            "employee_name": "Jane Doe",
            "gross_sales": 4500.0,
            "refunds": 0.0,
            "discounts": 100.0,
            "net_sales": 4400.0,
            "transaction_count": 18,
            "refund_count": 0,
            "items_sold": 55,
            "average_transaction": 250.0
          }
        ]
      }
    ]
  }
}
```

### Employee Fields

| Field                 | Type   | Description                 |
| --------------------- | ------ | --------------------------- |
| `employee_id`         | string | Unique employee identifier  |
| `employee_name`       | string | Employee name               |
| `gross_sales`         | number | Total sales amount          |
| `refunds`             | number | Total refunds processed     |
| `discounts`           | number | Total discounts given       |
| `net_sales`           | number | Gross - refunds - discounts |
| `transaction_count`   | number | Number of sales             |
| `refund_count`        | number | Number of refunds           |
| `items_sold`          | number | Total items sold            |
| `average_transaction` | number | Average transaction value   |

---

## 5. Stock/Inventory

Get current stock levels for all products.

**Authentication:** JWT token required

### Request

```http
GET /api/mobile?action=stock
```

### Example Request

```bash
curl "https://pos-candy-kush.vercel.app/api/mobile?action=stock"
```

### Response

```json
{
  "success": true,
  "action": "stock",
  "generated_at": "2024-12-10T14:30:00.000Z",
  "data": {
    "items": [
      {
        "product_id": "prod_001",
        "product_name": "Blue Dream - 3.5g",
        "sku": "BD-35G",
        "category": "Flower",
        "current_stock": 0,
        "low_stock_threshold": 10,
        "is_low_stock": false,
        "is_out_of_stock": true,
        "price": 50.0,
        "cost": 30.0,
        "stock_value": 0.0,
        "variants": [
          {
            "variant_id": "var_001",
            "variant_name": "Blue Dream - 3.5g",
            "sku": "BD-35G",
            "stock": 0,
            "price": 50.0,
            "cost": 30.0
          }
        ]
      },
      {
        "product_id": "prod_002",
        "product_name": "OG Kush - 1g Cartridge",
        "sku": "OGK-1G",
        "category": "Vaporizers",
        "current_stock": 5,
        "low_stock_threshold": 10,
        "is_low_stock": true,
        "is_out_of_stock": false,
        "price": 50.0,
        "cost": 30.0,
        "stock_value": 150.0,
        "variants": [
          {
            "variant_id": "var_002",
            "variant_name": "OG Kush - 1g Cartridge",
            "sku": "OGK-1G",
            "stock": 5,
            "price": 50.0,
            "cost": 30.0
          }
        ]
      },
      {
        "product_id": "prod_003",
        "product_name": "Gummy Bears - 100mg",
        "sku": "GB-100",
        "category": "Edibles",
        "current_stock": 50,
        "low_stock_threshold": 10,
        "is_low_stock": false,
        "is_out_of_stock": false,
        "price": 25.0,
        "cost": 12.0,
        "stock_value": 600.0,
        "variants": []
      }
    ],
    "summary": {
      "total_products": 3,
      "out_of_stock_count": 1,
      "low_stock_count": 1,
      "in_stock_count": 1,
      "total_stock_value": 750.0,
      "total_units": 55
    },
    "out_of_stock": [
      {
        "product_id": "prod_001",
        "product_name": "Blue Dream - 3.5g",
        "sku": "BD-35G",
        "category": "Flower",
        "current_stock": 0
      }
    ],
    "low_stock": [
      {
        "product_id": "prod_002",
        "product_name": "OG Kush - 1g Cartridge",
        "sku": "OGK-1G",
        "category": "Vaporizers",
        "current_stock": 5,
        "low_stock_threshold": 10
      }
    ]
  }
}
```

### Stock Item Fields

| Field                 | Type    | Description                            |
| --------------------- | ------- | -------------------------------------- |
| `product_id`          | string  | Unique product identifier              |
| `product_name`        | string  | Product name                           |
| `sku`                 | string  | Stock Keeping Unit                     |
| `category`            | string  | Product category                       |
| `current_stock`       | number  | Current stock quantity                 |
| `low_stock_threshold` | number  | Threshold for low stock alert          |
| `is_low_stock`        | boolean | True if stock ≤ threshold              |
| `is_out_of_stock`     | boolean | True if stock ≤ 0                      |
| `price`               | number  | Selling price                          |
| `cost`                | number  | Cost price                             |
| `stock_value`         | number  | current_stock × cost                   |
| `variants`            | array   | Product variants with individual stock |

### Summary Fields

| Field                | Type   | Description                 |
| -------------------- | ------ | --------------------------- |
| `total_products`     | number | Total number of products    |
| `out_of_stock_count` | number | Products with zero stock    |
| `low_stock_count`    | number | Products below threshold    |
| `in_stock_count`     | number | Products with healthy stock |
| `total_stock_value`  | number | Total inventory value       |
| `total_units`        | number | Total units in stock        |

---

## Error Responses

### Authentication Errors

**Missing Token:**

```json
{
  "success": false,
  "error": "Missing or invalid authorization header"
}
```

**Invalid/Expired Token:**

```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

**Insufficient Permissions:**

```json
{
  "success": false,
  "error": "Admin access required"
}
```

### Invalid Action

```json
{
  "success": false,
  "error": "Invalid or missing action parameter",
  "valid_actions": [
    "sales-summary",
    "sales-by-item",
    "sales-by-category",
    "sales-by-employee",
    "stock"
  ],
  "usage": {
    "endpoint": "/api/mobile",
    "parameters": {
      "action": "Required. One of: sales-summary, sales-by-item, sales-by-category, sales-by-employee, stock",
      "period": "Optional. One of: today, this_week, this_month, this_year, custom, last_30_days (default)",
      "start_date": "Required if period=custom. ISO 8601 date format (YYYY-MM-DD)",
      "end_date": "Required if period=custom. ISO 8601 date format (YYYY-MM-DD)",
      "employee_ids": "Optional. Comma-separated list of employee IDs to filter by"
    }
  }
}
```

### Missing Custom Date Range

```json
{
  "success": false,
  "error": "start_date and end_date are required for custom period"
}
```

### Server Error

```json
{
  "success": false,
  "error": "Internal server error message"
}
```

---

## HTTP Status Codes

| Code | Description                      |
| ---- | -------------------------------- |
| 200  | Success                          |
| 400  | Bad Request (invalid parameters) |
| 500  | Internal Server Error            |

---

## Mobile Implementation Examples

### Android (Kotlin)

```kotlin
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import com.google.gson.Gson

data class LoginResponse(
    val success: Boolean,
    val user: User?,
    val token: String?,
    val expires_in: Long?,
    val error: String?
)

data class User(
    val id: String,
    val email: String,
    val name: String,
    val role: String
)

data class SalesSummaryResponse(
    val success: Boolean,
    val action: String,
    val data: SalesSummaryData
)

data class SalesSummaryData(
    val metrics: SalesMetrics,
    val transactions: TransactionStats
)

data class SalesMetrics(
    val gross_sales: Double,
    val net_sales: Double,
    val refunds: Double,
    val discounts: Double,
    val gross_profit: Double,
    val profit_margin: Double
)

data class TransactionStats(
    val total_count: Int,
    val average_value: Double,
    val items_sold: Int
)

class MobileApiService(private val baseUrl: String) {
    private val client = OkHttpClient()
    private var authToken: String? = null

    // Login method
    suspend fun login(email: String, password: String): LoginResponse {
        val loginRequest = """
            {
                "action": "login",
                "email": "$email",
                "password": "$password"
            }
        """.trimIndent()

        val request = Request.Builder()
            .url("$baseUrl/api/mobile")
            .post(okhttp3.RequestBody.create("application/json".toMediaType(), loginRequest))
            .build()

        return withContext(Dispatchers.IO) {
            val response = client.newCall(request).execute()
            val result = gson.fromJson(response.body?.string(), LoginResponse::class.java)
            if (result.success) {
                authToken = result.token
            }
            result
        }
    }

    // Helper method to create authenticated requests
    private fun createAuthenticatedRequest(url: String): Request.Builder {
        return Request.Builder()
            .url(url)
            .addHeader("Authorization", "Bearer $authToken")
    }

    suspend fun getSalesSummary(period: String = "today"): SalesSummaryResponse {
        return withContext(Dispatchers.IO) {
            val request = createAuthenticatedRequest("$baseUrl/api/mobile?action=sales-summary&period=$period")
                .build()

            val response = client.newCall(request).execute()
            gson.fromJson(response.body?.string(), SalesSummaryResponse::class.java)
        }
    }

    suspend fun getStock(): StockResponse {
        return withContext(Dispatchers.IO) {
            val request = Request.Builder()
                .url("$baseUrl/api/mobile?action=stock")
                .build()

            val response = client.newCall(request).execute()
            gson.fromJson(response.body?.string(), StockResponse::class.java)
        }
    }
}
```

### iOS (Swift)

```swift
import Foundation

struct SalesSummaryResponse: Codable {
    let success: Bool
    let action: String
    let data: SalesSummaryData
}

struct SalesSummaryData: Codable {
    let metrics: SalesMetrics
    let transactions: TransactionStats
}

struct SalesMetrics: Codable {
    let grossSales: Double
    let netSales: Double
    let refunds: Double
    let discounts: Double
    let grossProfit: Double
    let profitMargin: Double

    enum CodingKeys: String, CodingKey {
        case grossSales = "gross_sales"
        case netSales = "net_sales"
        case refunds
        case discounts
        case grossProfit = "gross_profit"
        case profitMargin = "profit_margin"
    }
}

struct TransactionStats: Codable {
    let totalCount: Int
    let averageValue: Double
    let itemsSold: Int

    enum CodingKeys: String, CodingKey {
        case totalCount = "total_count"
        case averageValue = "average_value"
        case itemsSold = "items_sold"
    }
}

struct LoginResponse: Codable {
    let success: Bool
    let token: String
    let expiresAt: String
    let user: User

    enum CodingKeys: String, CodingKey {
        case success
        case token
        case expiresAt = "expires_at"
        case user
    }
}

struct User: Codable {
    let uid: String
    let email: String
    let role: String
}

class MobileApiService {
    let baseUrl: String
    private var token: String?

    init(baseUrl: String) {
        self.baseUrl = baseUrl
    }

    func login(email: String, password: String) async throws -> LoginResponse {
        guard let url = URL(string: "\(baseUrl)/api/mobile") else {
            throw URLError(.badURL)
        }

        let loginData = [
            "action": "login",
            "email": email,
            "password": password
        ]

        let jsonData = try JSONSerialization.data(withJSONObject: loginData)

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = jsonData

        let (data, _) = try await URLSession.shared.data(for: request)
        let result = try JSONDecoder().decode(LoginResponse.self, from: data)

        if result.success, let token = result.token {
            self.token = token
        }

        return result
    }

    private func makeAuthenticatedRequest<T: Codable>(url: URL) async throws -> T {
        guard let token = token else {
            throw NSError(domain: "MobileApiService", code: 401, userInfo: [NSLocalizedDescriptionKey: "Not authenticated. Please login first."])
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)

        if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 401 {
            throw NSError(domain: "MobileApiService", code: 401, userInfo: [NSLocalizedDescriptionKey: "Authentication failed. Token may be expired."])
        }

        return try JSONDecoder().decode(T.self, from: data)
    }

    func getSalesSummary(period: String = "today") async throws -> SalesSummaryResponse {
        guard let url = URL(string: "\(baseUrl)/api/mobile?action=sales-summary&period=\(period)") else {
            throw URLError(.badURL)
        }

        return try await makeAuthenticatedRequest(url: url)
    }

    func getStock() async throws -> StockResponse {
        guard let url = URL(string: "\(baseUrl)/api/mobile?action=stock") else {
            throw URLError(.badURL)
        }

        return try await makeAuthenticatedRequest(url: url)
    }
}
```

### React Native (JavaScript/TypeScript)

```typescript
const BASE_URL = "https://pos-candy-kush.vercel.app";

interface SalesMetrics {
  gross_sales: number;
  net_sales: number;
  refunds: number;
  discounts: number;
  taxes: number;
  cost_of_goods: number;
  gross_profit: number;
  profit_margin: number;
}

interface TransactionStats {
  total_count: number;
  refund_count: number;
  average_value: number;
  items_sold: number;
}

interface SalesSummaryData {
  period: { from: string; to: string };
  metrics: SalesMetrics;
  transactions: TransactionStats;
}

interface ApiResponse<T> {
  success: boolean;
  action: string;
  period?: string;
  filters?: any;
  generated_at: string;
  data: T;
}

interface LoginResponse {
  success: boolean;
  token: string;
  expires_at: string;
  user: {
    uid: string;
    email: string;
    role: string;
  };
}

class MobileApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/api/mobile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "login",
        email,
        password,
      }),
    });

    const result: LoginResponse = await response.json();

    if (result.success && result.token) {
      this.token = result.token;
    }

    return result;
  }

  private async makeAuthenticatedRequest(url: string): Promise<any> {
    if (!this.token) {
      throw new Error("Not authenticated. Please login first.");
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (response.status === 401) {
      throw new Error("Authentication failed. Token may be expired.");
    }

    return response.json();
  }

  async getSalesSummary(
    period: string = "today"
  ): Promise<ApiResponse<SalesSummaryData>> {
    const url = `${this.baseUrl}/api/mobile?action=sales-summary&period=${period}`;
    return this.makeAuthenticatedRequest(url);
  }

  async getSalesByItem(
    period: string = "this_month"
  ): Promise<ApiResponse<any>> {
    const url = `${this.baseUrl}/api/mobile?action=sales-by-item&period=${period}`;
    return this.makeAuthenticatedRequest(url);
  }

  async getSalesByCategory(
    period: string = "this_month"
  ): Promise<ApiResponse<any>> {
    const url = `${this.baseUrl}/api/mobile?action=sales-by-category&period=${period}`;
    return this.makeAuthenticatedRequest(url);
  }

  async getSalesByEmployee(
    period: string = "today"
  ): Promise<ApiResponse<any>> {
    const url = `${this.baseUrl}/api/mobile?action=sales-by-employee&period=${period}`;
    return this.makeAuthenticatedRequest(url);
  }

  async getStock(): Promise<ApiResponse<any>> {
    const url = `${this.baseUrl}/api/mobile?action=stock`;
    return this.makeAuthenticatedRequest(url);
  }

  async getCustomDateRange(
    action: string,
    startDate: string,
    endDate: string,
    employeeIds?: string[]
  ): Promise<ApiResponse<any>> {
    let url = `${this.baseUrl}/api/mobile?action=${action}&period=custom&start_date=${startDate}&end_date=${endDate}`;

    if (employeeIds && employeeIds.length > 0) {
      url += `&employee_ids=${employeeIds.join(",")}`;
    }

    return this.makeAuthenticatedRequest(url);
  }
}

// Usage Example
const api = new MobileApiService();

// Login first
try {
  const loginResult = await api.login("admin@example.com", "password123");
  console.log("Login successful:", loginResult.user.email);
  console.log("Token expires:", loginResult.expires_at);
} catch (error) {
  console.error("Login failed:", error.message);
  return;
}

// Now make authenticated requests
try {
  // Get today's sales summary
  const todaySales = await api.getSalesSummary("today");
  console.log("Today's Net Sales:", todaySales.data.metrics.net_sales);

  // Get stock levels
  const stock = await api.getStock();
  console.log("Out of stock items:", stock.data.summary.out_of_stock_count);

  // Custom date range
  const customSales = await api.getCustomDateRange(
    "sales-summary",
    "2024-12-01",
    "2024-12-10"
  );
} catch (error) {
  console.error("API request failed:", error.message);
}
```

---

## Rate Limiting

Currently no rate limiting is applied. In production, consider implementing:

- 100 requests per minute per IP
- 1000 requests per hour per authenticated user

---

## Changelog

### Version 1.2.0 (December 2024)

- **Day-by-day data structure**: All sales endpoints now return daily breakdown instead of aggregated totals
- Mobile apps can now calculate their own summaries for better performance
- Sales Summary returns `daily_data` array with metrics, transactions, and receipts for each day
- Sales by Item returns `daily_data` with items sold each day
- Sales by Category returns `daily_data` with category sales for each day
- Sales by Employee returns `daily_data` with employee performance for each day
- Faster API response times by eliminating server-side aggregation

### Version 1.1.0 (December 2024)

- Added JWT authentication system
- Login endpoint with 1-month admin tokens
- All endpoints now require authentication
- Updated mobile implementation examples with authentication
- Added comprehensive error handling for authentication failures

### Version 1.0.0 (December 2024)

- Initial release
- Sales Summary endpoint
- Sales by Item endpoint
- Sales by Category endpoint
- Sales by Employee endpoint
- Stock/Inventory endpoint
- Period filtering (today, this_week, this_month, this_year, custom)
- Employee filtering
- CORS support for mobile apps
