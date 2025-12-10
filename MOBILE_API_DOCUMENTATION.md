# Mobile API Documentation

This document provides comprehensive documentation for the POS Candy Kush Mobile API, designed for Android and iOS applications.

## Base URL

```
https://your-domain.com/api/mobile
```

## Authentication

Currently, the API is open for development. In production, implement token-based authentication using the `Authorization` header.

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## CORS Support

The API supports CORS with the following headers:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, OPTIONS`
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

1. [Sales Summary](#1-sales-summary)
2. [Sales by Item](#2-sales-by-item)
3. [Sales by Category](#3-sales-by-category)
4. [Sales by Employee](#4-sales-by-employee)
5. [Stock/Inventory](#5-stockinventory)

---

## 1. Sales Summary

Get overall sales metrics and transaction statistics.

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
curl "https://your-domain.com/api/mobile?action=sales-summary&period=today"

# This month's sales
curl "https://your-domain.com/api/mobile?action=sales-summary&period=this_month"

# Custom date range
curl "https://your-domain.com/api/mobile?action=sales-summary&period=custom&start_date=2024-01-01&end_date=2024-01-31"

# Filter by specific employees
curl "https://your-domain.com/api/mobile?action=sales-summary&period=this_week&employee_ids=emp_001,emp_002"
```

### Response

```json
{
  "success": true,
  "action": "sales-summary",
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
    "metrics": {
      "gross_sales": 15000.0,
      "refunds": 500.0,
      "discounts": 200.0,
      "taxes": 1200.0,
      "net_sales": 14300.0,
      "cost_of_goods": 8000.0,
      "gross_profit": 6300.0,
      "profit_margin": 44.06
    },
    "transactions": {
      "total_count": 45,
      "refund_count": 2,
      "average_value": 333.33,
      "items_sold": 150
    }
  }
}
```

### Response Fields

| Field                        | Type   | Description                         |
| ---------------------------- | ------ | ----------------------------------- |
| `metrics.gross_sales`        | number | Total sales before deductions       |
| `metrics.refunds`            | number | Total refund amount                 |
| `metrics.discounts`          | number | Total discounts applied             |
| `metrics.taxes`              | number | Total taxes collected               |
| `metrics.net_sales`          | number | Gross sales - refunds - discounts   |
| `metrics.cost_of_goods`      | number | Total cost of sold items            |
| `metrics.gross_profit`       | number | Net sales - cost of goods           |
| `metrics.profit_margin`      | number | Profit margin percentage            |
| `transactions.total_count`   | number | Total number of sales transactions  |
| `transactions.refund_count`  | number | Total number of refund transactions |
| `transactions.average_value` | number | Average transaction value           |
| `transactions.items_sold`    | number | Total items sold                    |

---

## 2. Sales by Item

Get sales breakdown by individual products/items.

### Request

```http
GET /api/mobile?action=sales-by-item&period=this_month
```

### Example Request

```bash
curl "https://your-domain.com/api/mobile?action=sales-by-item&period=this_week"
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
    "items": [
      {
        "item_id": "prod_001",
        "item_name": "Blue Dream - 3.5g",
        "category": "Flower",
        "sku": "BD-35G",
        "quantity_sold": 50,
        "gross_sales": 2500.0,
        "net_sales": 2400.0,
        "cost_of_goods": 1500.0,
        "discounts": 100.0,
        "gross_profit": 900.0,
        "profit_margin": 36.0,
        "average_price": 50.0,
        "transaction_count": 45
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
    ],
    "totals": {
      "total_quantity": 80,
      "total_gross_sales": 4000.0,
      "total_net_sales": 3850.0,
      "total_cost": 2400.0,
      "total_profit": 1450.0,
      "item_count": 2
    }
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

### Request

```http
GET /api/mobile?action=sales-by-category&period=this_month
```

### Example Request

```bash
curl "https://your-domain.com/api/mobile?action=sales-by-category&period=this_month"
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
      },
      {
        "category_id": "cat_002",
        "category_name": "Vaporizers",
        "quantity_sold": 100,
        "gross_sales": 6000.0,
        "net_sales": 5800.0,
        "cost_of_goods": 3500.0,
        "discounts": 200.0,
        "gross_profit": 2300.0,
        "item_count": 80,
        "percentage_of_sales": 27.27
      },
      {
        "category_id": "cat_003",
        "category_name": "Edibles",
        "quantity_sold": 150,
        "gross_sales": 6000.0,
        "net_sales": 5700.0,
        "cost_of_goods": 3000.0,
        "discounts": 300.0,
        "gross_profit": 2700.0,
        "item_count": 120,
        "percentage_of_sales": 27.27
      }
    ],
    "totals": {
      "total_categories": 3,
      "total_gross_sales": 22000.0,
      "total_items_sold": 450
    }
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

### Request

```http
GET /api/mobile?action=sales-by-employee&period=today
```

### Example Request

```bash
curl "https://your-domain.com/api/mobile?action=sales-by-employee&period=today"
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
    ],
    "totals": {
      "total_gross_sales": 9500.0,
      "total_net_sales": 9150.0,
      "total_transactions": 38,
      "total_items_sold": 120,
      "employee_count": 2
    }
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

### Request

```http
GET /api/mobile?action=stock
```

### Example Request

```bash
curl "https://your-domain.com/api/mobile?action=stock"
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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import com.google.gson.Gson

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
    private val gson = Gson()

    suspend fun getSalesSummary(period: String = "today"): SalesSummaryResponse {
        return withContext(Dispatchers.IO) {
            val request = Request.Builder()
                .url("$baseUrl/api/mobile?action=sales-summary&period=$period")
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

class MobileApiService {
    let baseUrl: String

    init(baseUrl: String) {
        self.baseUrl = baseUrl
    }

    func getSalesSummary(period: String = "today") async throws -> SalesSummaryResponse {
        guard let url = URL(string: "\(baseUrl)/api/mobile?action=sales-summary&period=\(period)") else {
            throw URLError(.badURL)
        }

        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(SalesSummaryResponse.self, from: data)
    }

    func getStock() async throws -> StockResponse {
        guard let url = URL(string: "\(baseUrl)/api/mobile?action=stock") else {
            throw URLError(.badURL)
        }

        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(StockResponse.self, from: data)
    }
}
```

### React Native (JavaScript/TypeScript)

```typescript
const BASE_URL = "https://your-domain.com";

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

class MobileApiService {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async getSalesSummary(
    period: string = "today"
  ): Promise<ApiResponse<SalesSummaryData>> {
    const response = await fetch(
      `${this.baseUrl}/api/mobile?action=sales-summary&period=${period}`
    );
    return response.json();
  }

  async getSalesByItem(
    period: string = "this_month"
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${this.baseUrl}/api/mobile?action=sales-by-item&period=${period}`
    );
    return response.json();
  }

  async getSalesByCategory(
    period: string = "this_month"
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${this.baseUrl}/api/mobile?action=sales-by-category&period=${period}`
    );
    return response.json();
  }

  async getSalesByEmployee(
    period: string = "today"
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${this.baseUrl}/api/mobile?action=sales-by-employee&period=${period}`
    );
    return response.json();
  }

  async getStock(): Promise<ApiResponse<any>> {
    const response = await fetch(`${this.baseUrl}/api/mobile?action=stock`);
    return response.json();
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

    const response = await fetch(url);
    return response.json();
  }
}

// Usage Example
const api = new MobileApiService();

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
```

---

## Rate Limiting

Currently no rate limiting is applied. In production, consider implementing:

- 100 requests per minute per IP
- 1000 requests per hour per authenticated user

---

## Changelog

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
