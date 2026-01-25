# Order Duplication API Documentation

## Overview

This document provides comprehensive documentation for creating API endpoints to duplicate orders between Firebase and a new server in the Candy Kush POS system.

## Order Data Structures

### 1. POS Order Data Structure (Firebase `receipts` collection)

```javascript
const posOrderData = {
  // === IDENTIFIERS ===
  orderNumber: "string", // Required: Unique order/receipt number
  receipt_number: "string", // Same as orderNumber
  deviceId: "string", // Device identifier

  // === TIMESTAMPS ===
  created_at: "ISO8601 string", // Required: Order creation time
  receipt_date: "ISO8601 string", // Required: Receipt date
  updated_at: "ISO8601 string", // Last update time

  // === CUSTOMER INFORMATION ===
  customerId: "string|null", // Customer ID if applicable
  customerName: "string|null", // Customer name
  customer: {
    id: "string|null",
    customerId: "string|null",
    name: "string",
    lastName: "string|null",
    fullName: "string",
    email: "string|null",
    phone: "string|null",
    isNoMember: "boolean",
    currentPoints: "number",
  },

  // === ORDER ITEMS ===
  line_items: [
    {
      id: "string", // Cart item ID
      item_id: "string", // Product ID
      variant_id: "string|null", // Product variant ID
      item_name: "string", // Product name
      variant_name: "string|null",
      sku: "string|null",
      quantity: "number", // Required
      price: "number", // Required: Unit price
      gross_total_money: "number", // Line total
      total_money: "number", // Line total after discounts
      cost: "number", // Product cost
      cost_total: "number", // Total cost
      total_discount: "number", // Line discount amount
      categoryId: "string|null", // Product category
      categoryName: "string|null",
    },
  ],

  // === PRICING ===
  subtotal: "number", // Required: Pre-tax subtotal
  total_discount: "number", // Total discount amount
  total_tax: "number", // Tax amount
  total_money: "number", // Required: Final total
  tip: "number", // Tip amount
  surcharge: "number", // Surcharge amount

  // === PAYMENT INFORMATION ===
  paymentMethod: "string", // 'cash', 'card', 'crypto', 'transfer'
  paymentTypeName: "string", // Human readable payment type
  cashReceived: "number|null", // Cash received (cash payments)
  change: "number", // Change given
  payments: [
    {
      payment_type_id: "string", // 'cash', 'card', 'crypto', 'transfer'
      name: "string", // Payment type name
      type: "string", // 'CASH', 'CARD', 'CUSTOM'
      money_amount: "number", // Payment amount
      paid_at: "ISO8601 string", // Payment timestamp
    },
  ],

  // === POINTS & CASHBACK ===
  points_used: "number", // Points redeemed
  points_discount: "number", // Value of points used
  points_earned: "number", // Points earned from this order
  points_deducted: "number", // Points used
  points_balance: "number", // Customer's point balance after transaction
  cashback_earned: "number", // New cashback system points earned
  cashback_breakdown: "array", // Itemized cashback earnings

  // === EMPLOYEE INFORMATION ===
  cashierId: "string|null", // Cashier user ID
  cashierName: "string", // Cashier name
  userId: "string|null", // Same as cashierId

  // === STATUS & METADATA ===
  status: "string", // 'completed', 'cancelled', etc.
  receipt_type: "string", // 'SALE'
  source: "string", // 'POS System'
  cancelled_at: "ISO8601 string|null",

  // === DISCOUNTS ===
  discounts: [
    {
      id: "string",
      name: "string",
      type: "string", // 'percentage' or 'fixed'
      value: "number", // Discount value
      amount: "number", // Calculated discount amount
    },
  ],

  // === SYNC STATUS ===
  syncStatus: "string", // 'synced', 'pending'
  syncedAt: "ISO8601 string|null",
  fromThisDevice: "boolean",
};
```

### 2. Kiosk Order Data Structure (Firebase `kioskOrders` collection)

```javascript
const kioskOrderData = {
  // === IDENTIFIERS ===
  transactionId: "string", // Required: Unique transaction ID
  orderNumber: "string", // Order number (same as transactionId)
  kioskId: "string", // Kiosk identifier

  // === STATUS ===
  status: "string", // 'pending_confirmation', 'confirmed', 'completed', 'cancelled'

  // === CUSTOMER INFORMATION ===
  customer: {
    id: "string|null",
    customerId: "string|null",
    name: "string",
    lastName: "string|null",
    fullName: "string",
    email: "string|null",
    phone: "string|null",
    isNoMember: "boolean",
    currentPoints: "number",
  },

  // === ORDER ITEMS ===
  items: [
    {
      id: "string", // Cart item ID
      productId: "string", // Product ID
      variantId: "string|null", // Product variant ID
      name: "string", // Product name
      price: "number", // Unit price
      originalPrice: "number", // Original product price
      memberPrice: "number|null", // Member discount price
      quantity: "number", // Required
      discount: "number", // Per-item discount
      total: "number", // Line total
      barcode: "string|null",
      sku: "string|null",
      cost: "number", // Product cost
      soldBy: "string", // 'unit' or 'weight'
      categoryId: "string|null",
      categoryName: "string|null",
      source: "string|null", // Product source
    },
  ],

  // === PRICING ===
  pricing: {
    subtotal: "number", // Required
    tax: "number", // Required
    discount: "number", // Required
    pointsUsed: "number", // Points used in dollar value
    pointsUsedValue: "number", // Same as pointsUsed
    total: "number", // Required: Final total
  },

  // === PAYMENT INFORMATION ===
  payment: {
    method: "string", // Required: 'cash', 'card', 'crypto', 'transfer'
    status: "string", // 'pending_confirmation', 'confirmed', etc.
    confirmedBy: "string|null",
    confirmedAt: "ISO8601 string|null",

    // For crypto payments
    cryptoDetails: {
      currency: "string",
      paymentId: "string",
      amount: "number",
      amountInCrypto: "number",
      network: "string",
      address: "string",
      transactionHash: "string|null",
      paymentUrl: "string",
      verificationStatus: "string", // 'pending', 'verified', 'failed'
      verifiedAt: "ISO8601 string|null",
    },
  },

  // === POINTS & CASHBACK ===
  points: {
    earned: "number",
    used: "number",
    usedValue: "number",
    usagePercentage: "number",
    details: "array", // Point usage details
    calculation: "object|null", // Point calculation data
  },

  // === METADATA ===
  source: "string", // 'kiosk'
  kioskLocation: "string", // Kiosk location description
  orderCompletedAt: "ISO8601 string", // Order completion time
  requiresConfirmation: "boolean", // true for kiosk orders
  notes: "string", // Order notes

  // === TIMESTAMPS ===
  createdAt: "Firebase Timestamp", // Auto-generated
  updatedAt: "Firebase Timestamp", // Auto-generated
};
```

## API Endpoint Implementation

### POST /api/orders/duplicate

```javascript
// POST /api/orders/duplicate
export async function POST(request) {
  try {
    const { orderData, orderType } = await request.json();

    // Validate required fields based on order type
    const validation = validateOrderData(orderData, orderType);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid order data",
          details: validation.errors,
        },
        { status: 400 },
      );
    }

    // Save to your new server/database
    const savedOrder = await saveOrderToNewServer(orderData, orderType);

    // Optionally sync back to Firebase if needed
    if (process.env.SYNC_TO_FIREBASE === "true") {
      await syncToFirebase(orderData, orderType);
    }

    return NextResponse.json({
      success: true,
      message: "Order duplicated successfully",
      data: {
        orderId: savedOrder.id,
        transactionId: orderData.transactionId || orderData.orderNumber,
        synced: true,
      },
    });
  } catch (error) {
    console.error("Order duplication failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to duplicate order" },
      { status: 500 },
    );
  }
}

// Validation function
function validateOrderData(orderData, orderType) {
  const errors = [];

  if (orderType === "pos") {
    // POS order validation
    if (!orderData.orderNumber) errors.push("orderNumber is required");
    if (!orderData.total_money && orderData.total_money !== 0)
      errors.push("total_money is required");
    if (!orderData.created_at) errors.push("created_at is required");
    if (!orderData.line_items || !Array.isArray(orderData.line_items)) {
      errors.push("line_items array is required");
    } else if (orderData.line_items.length === 0) {
      errors.push("At least one line item is required");
    }
  } else if (orderType === "kiosk") {
    // Kiosk order validation
    if (!orderData.transactionId) errors.push("transactionId is required");
    if (!orderData.pricing || !orderData.pricing.total)
      errors.push("pricing.total is required");
    if (!orderData.payment || !orderData.payment.method)
      errors.push("payment.method is required");
    if (!orderData.items || !Array.isArray(orderData.items)) {
      errors.push("items array is required");
    } else if (orderData.items.length === 0) {
      errors.push("At least one item is required");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

## Required Fields Summary

### For POS Orders:

- `orderNumber` (string)
- `created_at` (ISO8601 string)
- `total_money` (number)
- `line_items` (array with at least 1 item)
- `subtotal` (number)
- `paymentMethod` (string)

### For Kiosk Orders:

- `transactionId` (string)
- `pricing.total` (number)
- `payment.method` (string)
- `items` (array with at least 1 item)
- `customer` (object)

## Data Type Conversions

When duplicating orders, ensure proper data type handling:

```javascript
// Firebase Timestamps to ISO strings
const convertTimestamps = (data) => {
  if (data.createdAt?.toDate)
    data.created_at = data.createdAt.toDate().toISOString();
  if (data.updatedAt?.toDate)
    data.updated_at = data.updatedAt.toDate().toISOString();
  if (data.receipt_date?.toDate)
    data.receipt_date = data.receipt_date.toDate().toISOString();

  return data;
};

// Handle BigInt serialization for JSON
const serializeOrderData = (data) => {
  return JSON.parse(
    JSON.stringify(data, (key, value) => {
      if (typeof value === "bigint") {
        return value.toString();
      }
      return value;
    }),
  );
};
```

## API Request Examples

### POS Order Request

```json
{
  "orderData": {
    "orderNumber": "POS-2026-001",
    "created_at": "2026-01-24T10:30:00.000Z",
    "total_money": 45.5,
    "subtotal": 42.0,
    "total_tax": 3.5,
    "paymentMethod": "cash",
    "customer": {
      "id": "cust-123",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "line_items": [
      {
        "item_id": "prod-456",
        "item_name": "Premium Cannabis Flower",
        "quantity": 2,
        "price": 21.0,
        "total_money": 42.0
      }
    ]
  },
  "orderType": "pos"
}
```

### Kiosk Order Request

```json
{
  "orderData": {
    "transactionId": "KIOSK-2026-001",
    "kioskId": "kiosk-001",
    "status": "completed",
    "customer": {
      "id": "cust-123",
      "name": "Jane Smith",
      "isNoMember": false
    },
    "items": [
      {
        "productId": "prod-456",
        "name": "Premium Cannabis Flower",
        "quantity": 1,
        "price": 25.0,
        "total": 25.0
      }
    ],
    "pricing": {
      "subtotal": 25.0,
      "tax": 2.5,
      "discount": 0,
      "total": 27.5
    },
    "payment": {
      "method": "card",
      "status": "confirmed"
    }
  },
  "orderType": "kiosk"
}
```

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Order duplicated successfully",
  "data": {
    "orderId": "new-server-order-id",
    "transactionId": "POS-2026-001",
    "synced": true
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Invalid order data",
  "details": ["orderNumber is required", "total_money is required"]
}
```

## Implementation Notes

1. **Validation**: Always validate order data before processing
2. **Data Types**: Handle Firebase Timestamps and BigInt values properly
3. **Error Handling**: Provide detailed error messages for debugging
4. **Sync Status**: Track whether orders have been successfully duplicated
5. **Idempotency**: Ensure duplicate requests don't create duplicate orders
6. **Security**: Implement proper authentication and authorization
7. **Rate Limiting**: Consider implementing rate limits for the API endpoint

## Testing

Test the API endpoint with both POS and kiosk order types, ensuring all required fields are present and data types are correct. Test error scenarios and edge cases like empty orders, invalid payment methods, and missing customer data.
