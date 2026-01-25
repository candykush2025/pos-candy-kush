# POS Receipt Creation API Documentation

## Overview

This document specifies the data structure and required fields that the POS (Point of Sale) system must send when creating receipts via the API. This ensures compatibility with the order duplication system and maintains consistent data across all platforms.

## API Endpoint

```
POST /pos/v1/orders
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

## Authentication

### JWT Token Requirements

All requests to the POS Receipt API must include a valid JWT (JSON Web Token) in the Authorization header.

#### Header Format:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Token Validation:

- **Required**: Valid JWT token issued by the authentication service
- **Expiration**: Tokens must not be expired
- **Permissions**: Token must have `pos:create_receipt` or `admin` permissions
- **Device Context**: Token should be associated with the requesting POS device
- **Store Context**: Token must contain `storeId` and `userId` claims

#### JWT Token Payload Structure:

```json
{
  "storeId": "string", // Store identifier (automatically applied to receipts)
  "userId": "string",  // User identifier (cashier who created the receipt)
  "role": "string",    // User role (pos, admin, etc.)
  "deviceId": "string", // Device identifier
  "iat": number,       // Issued at timestamp
  "exp": number        // Expiration timestamp
}
```

#### Authentication Flow:

1. **POS Device Login**: Device obtains JWT token via `POST /pos/v1/auth/login`
2. **Token Storage**: Store token securely on device (localStorage/secure storage)
3. **Token Refresh**: Automatically refresh token before expiration
4. **Request Authorization**: Include token in all API requests
5. **Store Context**: `storeId` from token is automatically applied to all receipts

### Important Notes:

- **Store ID**: The `storeId` is extracted from the JWT token and automatically applied to receipts. **Do not include `storeId` in the request body**.
- **User ID**: The `userId` (cashier) is also extracted from the JWT token.
- **Device Tracking**: Receipts are automatically associated with the authenticated device.

### Authentication Error Responses

#### Invalid Token

```json
{
  "success": false,
  "error": "Invalid authentication token",
  "code": "AUTH_INVALID_TOKEN"
}
```

#### Expired Token

```json
{
  "success": false,
  "error": "Authentication token has expired",
  "code": "AUTH_TOKEN_EXPIRED"
}
```

#### Missing Permissions

```json
{
  "success": false,
  "error": "Insufficient permissions to create receipts",
  "code": "AUTH_INSUFFICIENT_PERMISSIONS"
}
```

#### Missing Token

```json
{
  "success": false,
  "error": "Authentication token required",
  "code": "AUTH_TOKEN_MISSING"
}
```

## API Versioning

The POS API uses semantic versioning with the `/pos/v1/` prefix. All endpoints are versioned to ensure backward compatibility.

- **Current Version**: `v1`
- **Base URL**: `https://api.isy.software/pos/v1/`
- **Version Changes**: Will be communicated in advance with migration guides

## Environment-Specific Endpoints

### Production

```
https://api.isy.software/pos/v1/orders
```

### Staging

```
https://api-staging.isy.software/pos/v1/orders
```

### Development

```
http://localhost:8080/pos/v1/orders
```

**Note**: Always use HTTPS in production. Development environment may use HTTP for local testing.

## Technical Specifications

### Request Limits

- **Maximum Request Size**: 1MB per request
- **Timeout**: 30 seconds per request
- **Rate Limiting**: 100 requests per minute per device
- **Concurrent Requests**: Maximum 5 concurrent requests per device

### Response Format

All responses follow a consistent JSON structure:

```json
{
  "success": boolean,    // true for success, false for errors
  "message": "string",   // Human-readable message
  "data": object,        // Response data (success only)
  "error": "string",     // Error message (errors only)
  "code": "string"       // Error code (errors only)
}
```

### HTTP Status Codes

- `200 OK` - Successful request
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required/failed
- `403 Forbidden` - Insufficient permissions
- `422 Unprocessable Entity` - Validation failed
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Core Receipt Data

```javascript
{
  // === IDENTIFIERS ===
  "orderNumber": "string", // Required: Unique order/receipt number (e.g., "POS-2026-001")
  "deviceId": "string", // Required: Device identifier for tracking

  // === TIMESTAMPS ===
  "created_at": "string", // Required: ISO8601 timestamp (e.g., "2026-01-24T10:30:00.000Z")
  "receipt_date": "string", // Required: ISO8601 timestamp (same as created_at)
  "updated_at": "string", // Required: ISO8601 timestamp

  // === CUSTOMER INFORMATION ===
  "customerId": "string|null", // Customer ID if applicable
  "customerName": "string|null", // Customer name
  "customer": {
    "id": "string|null",
    "customerId": "string|null",
    "name": "string",
    "lastName": "string|null",
    "fullName": "string",
    "email": "string|null",
    "phone": "string|null",
    "isNoMember": "boolean", // Required: true if no membership
    "currentPoints": "number" // Required: current points balance
  },

  // === ORDER ITEMS ===
  "line_items": [
    {
      "id": "string", // Cart item ID
      "item_id": "string", // Required: Product ID
      "variant_id": "string|null", // Product variant ID
      "item_name": "string", // Required: Product name
      "variant_name": "string|null",
      "sku": "string|null",
      "quantity": "number", // Required: Must be > 0
      "price": "number", // Required: Unit price
      "gross_total_money": "number", // Line total before discounts
      "total_money": "number", // Required: Line total after discounts
      "cost": "number", // Product cost
      "total_discount": "number", // Line discount amount
      "categoryId": "string|null", // Product category ID
      "categoryName": "string|null" // Product category name
    }
  ],

  // === PRICING ===
  "subtotal": "number", // Required: Pre-tax subtotal
  "total_discount": "number", // Total discount amount
  "total_tax": "number", // Tax amount
  "total_money": "number", // Required: Final total
  "tip": "number", // Tip amount (0 if none)
  "surcharge": "number", // Surcharge amount (0 if none)

  // === PAYMENT INFORMATION ===
  "paymentMethod": "string", // Required: 'cash', 'card', 'crypto', 'transfer'
  "paymentTypeName": "string", // Human readable payment type
  "cashReceived": "number|null", // Cash received (required for cash payments)
  "change": "number", // Change given (0 if none)
  "payments": [
    {
      "payment_type_id": "string", // Payment type ID
      "name": "string", // Payment type name
      "type": "string", // 'CASH', 'CARD', 'CUSTOM'
      "money_amount": "number", // Payment amount
      "paid_at": "string" // ISO8601 timestamp
    }
  ],

  // === POINTS & CASHBACK ===
  "points_used": "number", // Points redeemed (0 if none)
  "points_discount": "number", // Value of points used (0 if none)
  "points_earned": "number", // Points earned from this order
  "points_deducted": "number", // Points used (same as points_used)
  "points_balance": "number", // Customer's point balance after transaction
  "cashback_earned": "number", // New cashback system points earned
  "cashback_breakdown": "array", // Itemized cashback earnings

  // === EMPLOYEE INFORMATION ===
  "cashierId": "string|null", // Cashier user ID
  "cashierName": "string", // Required: Cashier name
  "userId": "string|null", // Same as cashierId

  // === STATUS & METADATA ===
  "status": "string", // Required: 'completed', 'cancelled', etc.
  "receipt_type": "string", // Required: 'SALE'
  "source": "string", // Required: 'POS System'
  "cancelled_at": "string|null", // ISO8601 timestamp if cancelled
  "fromThisDevice": "boolean", // Required: true

  // === DISCOUNTS ===
  "discounts": [
    {
      "id": "string",
      "name": "string",
      "type": "string", // 'percentage' or 'fixed'
      "value": "number", // Discount value
      "amount": "number" // Calculated discount amount
    }
  ],

  // === SYNC STATUS ===
  "syncStatus": "string", // Required: 'synced' or 'pending'
  "syncedAt": "string|null" // ISO8601 timestamp when synced
}
```

## Required Fields Validation

### Always Required Fields:

- `orderNumber` (string)
- `deviceId` (string)
- `created_at` (ISO8601 string)
- `receipt_date` (ISO8601 string)
- `updated_at` (ISO8601 string)
- `total_money` (number)
- `subtotal` (number)
- `paymentMethod` (string)
- `cashierName` (string)
- `status` (string)
- `receipt_type` (string)
- `source` (string)
- `fromThisDevice` (boolean)
- `syncStatus` (string)
- `line_items` (array with at least 1 item)

### Conditionally Required Fields:

#### For Cash Payments:

- `cashReceived` (number) - Amount tendered
- `change` (number) - Change to give back

#### For Customer Transactions:

- `customer.isNoMember` (boolean)
- `customer.currentPoints` (number)

#### For Cancelled Orders:

- `cancelled_at` (ISO8601 string)

## Data Type Requirements

### String Fields:

- Order numbers should follow format: `POS-YYYYMMDD-NNN` (e.g., "POS-20260124-001")
- Timestamps must be ISO8601 format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Device IDs should be unique per device (UUID recommended)

### Number Fields:

- All monetary values in cents (integers) or dollars (decimals)
- Quantities as positive numbers
- Points as non-negative integers

### Boolean Fields:

- `fromThisDevice`: Always `true` for POS-generated receipts
- `customer.isNoMember`: `true` for non-members, `false` for members

### Array Fields:

- `line_items`: Must contain at least one item
- `payments`: Must contain at least one payment method
- `discounts`: Can be empty array if no discounts applied

## Validation Rules

### Business Logic Validation:

1. **Total Calculation**: `total_money` must equal `subtotal + total_tax - total_discount - points_discount + tip + surcharge`
2. **Line Item Totals**: Sum of `line_items[].total_money` should equal `subtotal`
3. **Payment Totals**: Sum of `payments[].money_amount` should equal `total_money`
4. **Points Balance**: `points_balance` should equal `customer.currentPoints - points_used + points_earned`
5. **Cash Transactions**: `change` should equal `cashReceived - total_money` (for cash payments)

### Data Integrity Validation:

1. **Order Number Uniqueness**: Each `orderNumber` must be unique
2. **Device ID Format**: Should be valid UUID or consistent identifier
3. **Timestamp Validity**: All timestamps must be valid ISO8601 dates
4. **Reference Integrity**: `customerId` should reference existing customer if provided

## API Request Examples

### Basic Cash Sale

```bash
curl -X POST https://api.isy.software/pos/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "orderNumber": "POS-20260124-001",
    "deviceId": "device-uuid-123",
    ...
  }'
```

```json
{
  "orderNumber": "POS-20260124-001",
  "deviceId": "device-uuid-123",
  "created_at": "2026-01-24T10:30:00.000Z",
  "receipt_date": "2026-01-24T10:30:00.000Z",
  "updated_at": "2026-01-24T10:30:00.000Z",
  "customerId": null,
  "customerName": null,
  "customer": {
    "id": null,
    "customerId": null,
    "name": "",
    "lastName": null,
    "fullName": "",
    "email": null,
    "phone": null,
    "isNoMember": true,
    "currentPoints": 0
  },
  "line_items": [
    {
      "id": "cart-item-1",
      "item_id": "prod-456",
      "variant_id": null,
      "item_name": "Premium Cannabis Flower",
      "variant_name": null,
      "sku": "PREM-001",
      "quantity": 2,
      "price": 21.0,
      "gross_total_money": 42.0,
      "total_money": 42.0,
      "cost": 15.0,
      "total_discount": 0,
      "categoryId": "cat-flower",
      "categoryName": "Flower"
    }
  ],
  "subtotal": 42.0,
  "total_discount": 0,
  "total_tax": 3.36,
  "total_money": 45.36,
  "tip": 0,
  "surcharge": 0,
  "paymentMethod": "cash",
  "paymentTypeName": "Cash",
  "cashReceived": 50.0,
  "change": 4.64,
  "payments": [
    {
      "payment_type_id": "cash",
      "name": "Cash",
      "type": "CASH",
      "money_amount": 45.36,
      "paid_at": "2026-01-24T10:30:00.000Z"
    }
  ],
  "points_used": 0,
  "points_discount": 0,
  "points_earned": 0,
  "points_deducted": 0,
  "points_balance": 0,
  "cashback_earned": 0,
  "cashback_breakdown": [],
  "cashierId": "user-123",
  "cashierName": "John Doe",
  "userId": "user-123",
  "status": "completed",
  "receipt_type": "SALE",
  "source": "POS System",
  "cancelled_at": null,
  "fromThisDevice": true,
  "discounts": [],
  "syncStatus": "synced",
  "syncedAt": "2026-01-24T10:30:00.000Z"
}
```

### Sale with Customer and Points

```json
{
  "orderNumber": "POS-20260124-002",
  "deviceId": "device-uuid-123",
  "created_at": "2026-01-24T11:15:00.000Z",
  "receipt_date": "2026-01-24T11:15:00.000Z",
  "updated_at": "2026-01-24T11:15:00.000Z",
  "customerId": "cust-789",
  "customerName": "Jane Smith",
  "customer": {
    "id": "cust-789",
    "customerId": "cust-789",
    "name": "Jane Smith",
    "lastName": null,
    "fullName": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+1234567890",
    "isNoMember": false,
    "currentPoints": 150
  },
  "line_items": [
    {
      "id": "cart-item-2",
      "item_id": "prod-999",
      "variant_id": null,
      "item_name": "CBD Oil 500mg",
      "variant_name": null,
      "sku": "CBD-500",
      "quantity": 1,
      "price": 35.0,
      "gross_total_money": 35.0,
      "total_money": 35.0,
      "cost": 20.0,
      "total_discount": 0,
      "categoryId": "cat-oil",
      "categoryName": "Oil"
    }
  ],
  "subtotal": 35.0,
  "total_discount": 0,
  "total_tax": 2.8,
  "total_money": 37.8,
  "tip": 0,
  "surcharge": 0,
  "paymentMethod": "card",
  "paymentTypeName": "Card",
  "cashReceived": null,
  "change": 0,
  "payments": [
    {
      "payment_type_id": "card",
      "name": "Card",
      "type": "CARD",
      "money_amount": 37.8,
      "paid_at": "2026-01-24T11:15:00.000Z"
    }
  ],
  "points_used": 0,
  "points_discount": 0,
  "points_earned": 37,
  "points_deducted": 0,
  "points_balance": 187,
  "cashback_earned": 37,
  "cashback_breakdown": [
    {
      "item_id": "prod-999",
      "points_earned": 37,
      "rate": 1.0
    }
  ],
  "cashierId": "user-123",
  "cashierName": "John Doe",
  "userId": "user-123",
  "status": "completed",
  "receipt_type": "SALE",
  "source": "POS System",
  "cancelled_at": null,
  "fromThisDevice": true,
  "discounts": [],
  "syncStatus": "synced",
  "syncedAt": "2026-01-24T11:15:00.000Z"
}
```

## Error Responses

### Validation Error

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    "orderNumber is required",
    "total_money must be a positive number",
    "line_items must contain at least one item"
  ]
}
```

### Success Response

```json
{
  "success": true,
  "message": "Receipt created successfully",
  "data": {
    "receiptId": "receipt-uuid",
    "orderNumber": "POS-20260124-001",
    "synced": true
  }
}
```

## Implementation Notes

1. **Order Number Generation**: Use consistent format across all POS devices
2. **Device ID**: Generate unique identifier per device/installation
3. **Timestamp Synchronization**: Ensure device clocks are synchronized
4. **Customer Data**: Always include complete customer object structure
5. **Points Calculation**: Implement proper points earning/redemption logic
6. **Data Consistency**: Validate all monetary calculations before sending
7. **Error Handling**: Implement retry logic for network failures
8. **Offline Support**: Queue receipts when offline, sync when connected

### JWT Authentication Implementation

1. **Token Storage**: Store JWT tokens securely (avoid localStorage for production)
2. **Token Refresh**: Implement automatic token refresh before expiration
3. **Request Interceptor**: Add Authorization header to all API requests
4. **Error Handling**: Handle token expiration and re-authentication
5. **Device Binding**: Associate tokens with specific POS devices
6. **Permission Checks**: Validate required permissions before API calls
7. **Store Context**: `storeId` from JWT is automatically applied - do not send in request body

#### JavaScript Example:

```javascript
// JWT Token Management
class AuthManager {
  constructor() {
    this.token = localStorage.getItem("jwt_token");
  }

  async getValidToken() {
    if (this.isTokenExpired()) {
      await this.refreshToken();
    }
    return this.token;
  }

  async makeAuthenticatedRequest(url, data) {
    const token = await this.getValidToken();
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }
}
```

### Store ID Handling

**Important**: The `storeId` is automatically extracted from the JWT token and applied to all receipts. **Do not include `storeId` in the request body** as it will be ignored and overridden by the token value.

The JWT token contains:

- `storeId`: Identifies which store the receipt belongs to
- `userId`: Identifies the cashier/user creating the receipt
- `deviceId`: Identifies the POS device

This ensures data integrity and prevents receipts from being created for the wrong store.

## Testing Checklist

- [ ] Order number uniqueness
- [ ] Total calculation accuracy
- [ ] Payment method validation
- [ ] Customer data completeness
- [ ] Points balance updates
- [ ] Line item data integrity
- [ ] Timestamp format validation
- [ ] Required field presence
- [ ] Data type validation
- [ ] Business rule compliance

### Authentication Testing

- [ ] Valid JWT token acceptance
- [ ] Invalid token rejection
- [ ] Expired token handling
- [ ] Missing token rejection
- [ ] Insufficient permissions rejection
- [ ] Token refresh functionality
- [ ] Device-specific token validation
- [ ] Authorization header format validation
- [ ] Store ID extraction from JWT
- [ ] User ID extraction from JWT

### Technical Testing

- [ ] API versioning (`/pos/v1/` prefix)
- [ ] Request size limits (1MB)
- [ ] Timeout handling (30 seconds)
- [ ] Rate limiting (100 req/min)
- [ ] Concurrent request limits (5 max)
- [ ] HTTP status codes
- [ ] Error response format
- [ ] CORS headers
- [ ] Content-Type validation</content>
      <parameter name="filePath">c:\Users\kevin\SynologyDrive\isy.software\isy.software\documentation\POS_RECEIPT_API_SPECIFICATION.md
