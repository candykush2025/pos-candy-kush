# iOS Admin API Endpoint Documentation

## Overview

This document provides complete API documentation for the iOS-specific admin endpoint. This endpoint uses **test data only** and does not write to Firebase, making it safe for testing and development.

**Base URL**: `/api/mobile/ios`

## ⚠️ Important Notes

- **Test Data Only**: All data is stored in-memory and resets on server restart
- **No Firebase Connection**: Safe to use without affecting live data
- **JWT Authentication**: Required for all endpoints except health check and login
- **Admin Access**: Most write operations require admin role

---

## Authentication

### JWT Token Format
```http
Authorization: Bearer <JWT_TOKEN>
```

### Login Endpoint
**POST** `/api/mobile/ios?action=login`

#### Request Body (Email/Password):
```json
{
  "email": "admin@test.com",
  "password": "any_password"
}
```

#### Request Body (PIN):
```json
{
  "pin": "1234"
}
```

#### Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_001",
    "email": "admin@test.com",
    "name": "Admin User",
    "role": "admin",
    "permissions": { ... },
    "isActive": true
  }
}
```

### Test Users Available
| Email | PIN | Role | Description |
|-------|-----|------|-------------|
| admin@test.com | 1234 | admin | Full access |
| cashier@test.com | 5678 | cashier | Limited access |

---

## Products

### Get All Products
**GET** `/api/mobile/ios?action=get-products`

Query Parameters:
- `category`: Filter by category ID
- `search`: Search by name, description, or SKU
- `availability`: Filter by `available`, `unavailable`, or `all`

```bash
GET /api/mobile/ios?action=get-products&category=cat_001&search=test
```

### Get Single Product
**GET** `/api/mobile/ios?action=get-product&id=prod_001`

### Create Product
**POST** `/api/mobile/ios?action=create-product`

```json
{
  "name": "New Product",
  "description": "Product description",
  "price": 299.99,
  "cost": 150.00,
  "categoryId": "cat_001",
  "categoryName": "Electronics",
  "stock": 50,
  "trackStock": true,
  "lowStockAlert": 10,
  "sku": "NEW-001",
  "isAvailable": true,
  "source": "local"
}
```

### Update Product
**POST** `/api/mobile/ios?action=update-product`

```json
{
  "id": "prod_001",
  "name": "Updated Product Name",
  "price": 349.99,
  "stock": 75
}
```

### Delete Product
**POST** `/api/mobile/ios?action=delete-product`

```json
{
  "id": "prod_001"
}
```

---

## Categories

### Get All Categories
**GET** `/api/mobile/ios?action=get-categories`

### Create Category
**POST** `/api/mobile/ios?action=create-category`

```json
{
  "name": "New Category",
  "description": "Category description",
  "color": "#FF5733"
}
```

### Update Category
**POST** `/api/mobile/ios?action=update-category`

```json
{
  "id": "cat_001",
  "name": "Updated Category",
  "color": "#00FF00"
}
```

### Delete Category
**POST** `/api/mobile/ios?action=delete-category`

```json
{
  "id": "cat_001"
}
```

---

## Customers

### Get All Customers
**GET** `/api/mobile/ios?action=get-customers`

Query Parameters:
- `search`: Search by name, email, or phone
- `source`: Filter by `local` or `loyverse`

### Get Single Customer
**GET** `/api/mobile/ios?action=get-customer&id=cust_001`

### Get Customer Purchase History
**GET** `/api/mobile/ios?action=get-customer-history&id=cust_001`

Response includes:
- Array of purchases (receipts)
- Total spent
- Order count

### Get Customer Points
**GET** `/api/mobile/ios?action=get-customer-points&id=cust_001`

### Create Customer
**POST** `/api/mobile/ios?action=create-customer`

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "address": "123 Main St",
  "notes": "VIP Customer"
}
```

### Update Customer
**POST** `/api/mobile/ios?action=update-customer`

```json
{
  "id": "cust_001",
  "name": "John Smith",
  "email": "john.smith@example.com"
}
```

### Delete Customer
**POST** `/api/mobile/ios?action=delete-customer`

```json
{
  "id": "cust_001"
}
```

### Adjust Customer Points
**POST** `/api/mobile/ios?action=adjust-customer-points`

```json
{
  "id": "cust_001",
  "amount": 100,
  "reason": "Bonus points",
  "type": "add"
}
```

Types: `add` or `reduce`

---

## Receipts & Orders

### Get All Receipts
**GET** `/api/mobile/ios?action=get-receipts`

Query Parameters:
- `dateRange`: Filter by date range
- `paymentType`: Filter by payment type
- `minAmount`: Minimum receipt total
- `maxAmount`: Maximum receipt total

### Get Single Receipt
**GET** `/api/mobile/ios?action=get-receipt&id=receipt_001`

### Create Order/Receipt
**POST** `/api/mobile/ios?action=create-order`

```json
{
  "customerId": "cust_001",
  "customerName": "John Doe",
  "employeeId": "user_001",
  "employeeName": "Admin User",
  "lineItems": [
    {
      "productId": "prod_001",
      "itemName": "Test Product 1",
      "quantity": 2,
      "price": 299.99,
      "discount": 0,
      "total": 599.98,
      "cost": 300.00
    }
  ],
  "subtotal": 599.98,
  "discount": 0,
  "tax": 42.00,
  "total": 641.98,
  "payments": [
    {
      "type": "Cash",
      "name": "Cash",
      "amount": 641.98
    }
  ],
  "source": "POS"
}
```

---

## Expenses

### Get Expense Categories
**GET** `/api/mobile/ios?action=get-expense-categories`

### Create Expense Category
**POST** `/api/mobile/ios?action=create-expense-category`

```json
{
  "name": "Travel",
  "description": "Travel and transportation expenses"
}
```

### Update Expense Category
**POST** `/api/mobile/ios?action=update-expense-category`

```json
{
  "id": "expcat_001",
  "name": "Office & Supplies",
  "description": "Updated description"
}
```

### Delete Expense Category
**POST** `/api/mobile/ios?action=delete-expense-category`

```json
{
  "id": "expcat_001"
}
```

### Get Expenses
**GET** `/api/mobile/ios?action=get-expenses`

Query Parameters:
- `status`: `pending`, `approved`, `denied`, or `all`
- `startDate`: Filter start date
- `endDate`: Filter end date

### Create Expense
**POST** `/api/mobile/ios?action=create-expense`

```json
{
  "category": "Office Supplies",
  "amount": 150.50,
  "currency": "USD",
  "description": "Printer paper and ink",
  "notes": "For Q1 reports",
  "date": "2026-01-23",
  "time": "14:30",
  "source": "BackOffice"
}
```

**Note**: Expenses created by admin users are auto-approved

### Update Expense
**POST** `/api/mobile/ios?action=update-expense`

```json
{
  "id": "exp_001",
  "amount": 175.00,
  "description": "Updated description"
}
```

### Delete Expense
**POST** `/api/mobile/ios?action=delete-expense`

```json
{
  "id": "exp_001"
}
```

### Approve Expense
**POST** `/api/mobile/ios?action=approve-expense`

```json
{
  "id": "exp_001",
  "approvalNotes": "Approved for office budget"
}
```

### Deny Expense
**POST** `/api/mobile/ios?action=deny-expense`

```json
{
  "id": "exp_001",
  "approvalNotes": "Exceeds budget limit"
}
```

---

## Shifts

### Get Shifts
**GET** `/api/mobile/ios?action=get-shifts`

Query Parameters:
- `status`: `active`, `completed`, or `all`
- `employeeId`: Filter by employee

Response includes shifts array and statistics object.

### Get Shift Details
**GET** `/api/mobile/ios?action=get-shift-details&id=shift_001`

Returns shift data with associated transactions.

### Open Shift
**POST** `/api/mobile/ios?action=open-shift`

```json
{
  "employeeId": "user_002",
  "employeeName": "Cashier User",
  "startingCash": 500.00
}
```

### Close Shift
**POST** `/api/mobile/ios?action=close-shift`

```json
{
  "id": "shift_001",
  "closingCash": 1650.00,
  "notes": "All transactions reconciled"
}
```

Automatically calculates:
- Expected cash
- Cash variance
- Shift totals

---

## Cashback & Loyalty

### Get Cashback Rules
**GET** `/api/mobile/ios?action=get-cashback-rules`

### Create Cashback Rule
**POST** `/api/mobile/ios?action=create-cashback-rule`

```json
{
  "name": "Summer Sale Cashback",
  "type": "category",
  "targetId": "cat_001",
  "targetName": "Electronics",
  "cashbackType": "percentage",
  "cashbackValue": 10,
  "hasMinimumOrder": true,
  "minimumOrderAmount": 200,
  "isActive": true
}
```

Types:
- `type`: `category` or `product`
- `cashbackType`: `percentage` or `fixed`

### Update Cashback Rule
**POST** `/api/mobile/ios?action=update-cashback-rule`

```json
{
  "id": "cbr_001",
  "cashbackValue": 15,
  "isActive": false
}
```

### Delete Cashback Rule
**POST** `/api/mobile/ios?action=delete-cashback-rule`

```json
{
  "id": "cbr_001"
}
```

### Get Point Usage Rules
**GET** `/api/mobile/ios?action=get-point-usage-rules`

### Update Point Usage Rules
**POST** `/api/mobile/ios?action=update-point-usage-rules`

```json
{
  "pointValue": 1,
  "priceWhenUsingPoints": "member",
  "earnCashbackWhenUsingPoints": false,
  "maxPointUsagePercent": 50,
  "minPointsToRedeem": 100
}
```

---

## Stock Management

### Get Stock Levels
**GET** `/api/mobile/ios?action=get-stock`

Query Parameters:
- `lowStockOnly`: `true` or `false`

Returns products with stock info and low stock count.

### Adjust Stock
**POST** `/api/mobile/ios?action=adjust-stock`

```json
{
  "productId": "prod_001",
  "quantity": 20,
  "reason": "Inventory recount",
  "type": "add"
}
```

Types: `add` or `remove`

### Get Stock History
**GET** `/api/mobile/ios?action=get-stock-history`

Query Parameters:
- `productId`: Filter by specific product

### Get Purchase Orders
**GET** `/api/mobile/ios?action=get-purchase-orders`

### Create Purchase Order
**POST** `/api/mobile/ios?action=create-purchase-order`

```json
{
  "supplier": "Acme Supplies Co.",
  "items": [
    {
      "productId": "prod_001",
      "productName": "Test Product 1",
      "quantity": 100,
      "costPerUnit": 150.00,
      "total": 15000.00
    }
  ],
  "totalCost": 15000.00,
  "dueDate": "2026-02-01T00:00:00Z",
  "notes": "Q1 inventory restock"
}
```

### Update Purchase Order
**POST** `/api/mobile/ios?action=update-purchase-order`

```json
{
  "id": "po_001",
  "status": "completed"
}
```

**Note**: When status is set to `completed`, stock is automatically updated for all items in the PO.

### Delete Purchase Order
**POST** `/api/mobile/ios?action=delete-purchase-order`

```json
{
  "id": "po_001"
}
```

---

## Users

### Get All Users
**GET** `/api/mobile/ios?action=get-users`

Returns users without sensitive data (PIN excluded).

### Create User
**POST** `/api/mobile/ios?action=create-user`

```json
{
  "email": "newuser@test.com",
  "name": "New User",
  "role": "cashier",
  "permissions": {
    "canChangePrice": false,
    "canChangeStock": false,
    "canAddProduct": false,
    "canEditProduct": false,
    "canDeleteProduct": false,
    "canManageCustomers": true,
    "canCreateExpenses": true,
    "canApproveExpenses": false
  },
  "pin": "9999"
}
```

### Update User
**POST** `/api/mobile/ios?action=update-user`

```json
{
  "id": "user_002",
  "name": "Updated Name",
  "role": "employee",
  "permissions": { ... }
}
```

### Delete User
**POST** `/api/mobile/ios?action=delete-user`

```json
{
  "id": "user_002"
}
```

### Reset User Password
**POST** `/api/mobile/ios?action=reset-user-password`

```json
{
  "id": "user_002",
  "newPassword": "newpass123"
}
```

---

## Settings & Configuration

### Get Settings
**GET** `/api/mobile/ios?action=get-settings`

### Update Settings
**POST** `/api/mobile/ios?action=update-settings`

```json
{
  "businessName": "My POS Store",
  "businessAddress": "456 New Address",
  "baseCurrency": "USD",
  "taxRate": 8.5,
  "lowStockThreshold": 15,
  "autoSyncEnabled": true,
  "syncIntervalMinutes": 60,
  "theme": {
    "mode": "dark",
    "primaryColor": "#10B981",
    "secondaryColor": "#3B82F6"
  }
}
```

### Get Exchange Rates
**GET** `/api/mobile/ios?action=get-exchange-rates`

### Update Exchange Rates
**POST** `/api/mobile/ios?action=update-exchange-rates`

```json
{
  "baseCurrency": "USD",
  "rates": {
    "USD": 1.0,
    "EUR": 0.85,
    "GBP": 0.73,
    "JPY": 110.0
  }
}
```

### Refresh Exchange Rates
**POST** `/api/mobile/ios?action=refresh-exchange-rates`

Simulates fetching new rates (adds small random variations).

---

## Analytics & Reports

### Get Dashboard Analytics
**GET** `/api/mobile/ios?action=get-dashboard-analytics`

Returns:
```json
{
  "success": true,
  "metrics": {
    "totalRevenue": 641.98,
    "totalOrders": 1,
    "totalCustomers": 2,
    "totalProducts": 2,
    "avgOrderValue": 641.98
  },
  "topProducts": [ ... ],
  "topCustomers": [ ... ]
}
```

### Get Sold Items
**GET** `/api/mobile/ios?action=get-sold-items`

Returns all sold items with:
- Product details
- Total quantity sold
- Total revenue
- Aggregated statistics

---

## Utility Endpoints

### Health Check
**GET** `/api/mobile/ios?action=health`

**No authentication required**

Returns:
```json
{
  "success": true,
  "message": "iOS API endpoint is working",
  "timestamp": "2026-01-23T10:00:00Z",
  "dataAvailable": true
}
```

### Reset Test Data (Admin Only)
**POST** `/api/mobile/ios?action=reset-test-data`

Resets all test data to initial state.

**Requires admin role**

---

## Error Responses

All errors return with appropriate HTTP status codes:

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Missing or invalid authorization header"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Admin access required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Product not found"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "error": "Unknown action",
  "availableActions": [ ... ]
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## Complete Action Reference

### GET Actions
- `health` - Health check (no auth)
- `get-products` - List products
- `get-product` - Single product
- `get-categories` - List categories
- `get-customers` - List customers
- `get-customer` - Single customer
- `get-customer-history` - Customer purchases
- `get-customer-points` - Customer loyalty points
- `get-receipts` - List receipts/orders
- `get-receipt` - Single receipt
- `get-expense-categories` - List expense categories
- `get-expenses` - List expenses
- `get-users` - List users
- `get-shifts` - List shifts
- `get-shift-details` - Shift details with transactions
- `get-cashback-rules` - List cashback rules
- `get-point-usage-rules` - Point redemption rules
- `get-stock` - Stock levels
- `get-purchase-orders` - List purchase orders
- `get-stock-history` - Stock adjustment history
- `get-settings` - System settings
- `get-exchange-rates` - Currency exchange rates
- `get-dashboard-analytics` - Dashboard metrics
- `get-sold-items` - Sold items report

### POST Actions (Admin Required Unless Noted)
- `login` - User login (no auth required)
- `create-product` - Create product
- `update-product` - Update product
- `delete-product` - Delete product
- `create-category` - Create category
- `update-category` - Update category
- `delete-category` - Delete category
- `create-customer` - Create customer
- `update-customer` - Update customer
- `delete-customer` - Delete customer
- `adjust-customer-points` - Add/reduce points
- `create-order` - Create order/receipt
- `create-expense-category` - Create expense category
- `update-expense-category` - Update expense category
- `delete-expense-category` - Delete expense category
- `create-expense` - Create expense (all roles)
- `update-expense` - Update expense
- `delete-expense` - Delete expense
- `approve-expense` - Approve expense (admin only)
- `deny-expense` - Deny expense (admin only)
- `open-shift` - Open employee shift
- `close-shift` - Close employee shift
- `create-cashback-rule` - Create cashback rule
- `update-cashback-rule` - Update cashback rule
- `delete-cashback-rule` - Delete cashback rule
- `update-point-usage-rules` - Update point rules
- `adjust-stock` - Adjust inventory
- `create-purchase-order` - Create PO
- `update-purchase-order` - Update PO
- `delete-purchase-order` - Delete PO
- `update-settings` - Update settings
- `update-exchange-rates` - Update rates
- `refresh-exchange-rates` - Refresh rates
- `create-user` - Create user (admin only)
- `update-user` - Update user (admin only)
- `delete-user` - Delete user (admin only)
- `reset-user-password` - Reset password (admin only)
- `reset-test-data` - Reset all data (admin only)

---

## Testing Guide

### 1. Test Authentication
```bash
# Login as admin
curl -X POST "http://localhost:3000/api/mobile/ios?action=login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.com", "password": "test"}'

# Save the token from response
```

### 2. Test Product Operations
```bash
# Get all products
curl -X GET "http://localhost:3000/api/mobile/ios?action=get-products" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create a product
curl -X POST "http://localhost:3000/api/mobile/ios?action=create-product" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Product", "price": 99.99, "stock": 100}'
```

### 3. Test Health Check
```bash
# No authentication needed
curl -X GET "http://localhost:3000/api/mobile/ios?action=health"
```

---

## iOS Swift Implementation Example

```swift
class IOSAPIClient {
    let baseURL = "https://your-domain.vercel.app/api/mobile/ios"
    var authToken: String?
    
    func login(email: String, password: String) async throws -> User {
        let url = URL(string: "\(baseURL)?action=login")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["email": email, "password": password]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(LoginResponse.self, from: data)
        
        self.authToken = response.token
        return response.user
    }
    
    func getProducts(category: String? = nil, search: String? = nil) async throws -> [Product] {
        var components = URLComponents(string: "\(baseURL)")!
        var queryItems = [URLQueryItem(name: "action", value: "get-products")]
        
        if let category = category {
            queryItems.append(URLQueryItem(name: "category", value: category))
        }
        if let search = search {
            queryItems.append(URLQueryItem(name: "search", value: search))
        }
        
        components.queryItems = queryItems
        
        var request = URLRequest(url: components.url!)
        request.httpMethod = "GET"
        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(ProductsResponse.self, from: data)
        
        return response.products
    }
    
    func createExpense(expense: ExpenseInput) async throws -> Expense {
        let url = URL(string: "\(baseURL)?action=create-expense")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        request.httpBody = try JSONEncoder().encode(expense)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(ExpenseResponse.self, from: data)
        
        return response.expense
    }
}
```

---

## Notes

1. **Data Persistence**: All data is stored in-memory and will reset when the server restarts
2. **No Firebase**: This endpoint does NOT touch Firebase at all - completely safe for testing
3. **Authentication**: JWT tokens are validated but test credentials accept any password
4. **Auto-approval**: Expenses created by admins from BackOffice are automatically approved
5. **Stock Updates**: Purchase orders marked as "completed" automatically update product stock
6. **IDs**: All generated IDs use timestamp + random string for uniqueness

---

## Support

For issues or questions about this API endpoint, refer to the comprehensive admin features documentation.
