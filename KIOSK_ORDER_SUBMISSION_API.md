# Kiosk Order Submission API Documentation

## Overview

When a customer completes an order on the Kiosk, the order data is sent via HTTP POST to the POS system's API endpoint. The POS API receives the order, saves it to Firebase, and the cashier can then view and confirm the payment.

## Architecture Flow

```
┌──────────────┐         ┌──────────────────┐         ┌──────────────┐         ┌──────────────┐
│    KIOSK     │ ──────> │   POS API        │ ──────> │   FIREBASE   │ <────── │   CASHIER    │
│ (Complete)   │  POST   │ /api/orders      │  Save   │  FIRESTORE   │  Read   │   (Confirm)  │
└──────────────┘         └──────────────────┘         └──────────────┘         └──────────────┘
```

**Detailed Flow:**

1. Customer completes order on Kiosk
2. Kiosk sends HTTP POST to POS API: `POST /api/orders/submit`
3. POS API validates the order data
4. POS API saves order to Firebase `kioskOrders` collection with status "pending_confirmation"
5. Cashier sees new order in real-time on POS dashboard
6. Cashier confirms payment method (cash/card/crypto)
7. For crypto: Cashier verifies transaction ID/proof
8. Order status updated to "confirmed" in Firebase
9. Transaction is finalized

---

## API Endpoint

### Submit Order from Kiosk

**Endpoint:** `POST /api/orders/submit`

**Purpose:** Receive completed orders from kiosk and save to Firebase for cashier confirmation

**Request Headers:**

```json
{
  "Content-Type": "application/json",
  "X-Kiosk-ID": "KIOSK-001",
  "X-API-Key": "your-api-key-here" // Optional for security
}
```

**Request Body:**

```json
{
  "orderData": {
    "transactionId": "TRX-00001",
    "orderNumber": "TRX-00001",
    "kioskId": "KIOSK-001",

    // Customer Information
    "customer": {
      "id": "abc123def456",
      "customerId": "CK-0001",
      "name": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "+66812345678",
      "isNoMember": false,
      "currentPoints": 150
    },

    // Order Items
    "items": [
      {
        "id": "prod-001",
        "productId": "prod-001",
        "name": "Premium Cannabis 3.5g",
        "price": 500,
        "quantity": 2,
        "image": "https://...",
        "categoryId": "cat-001",
        "categoryName": "Indoor Sativa",
        "subtotal": 1000,
        "cashbackEnabled": true,
        "cashbackType": "percentage",
        "cashbackValue": 10
      }
    ],

    // Pricing
    "pricing": {
      "subtotal": 1000,
      "tax": 0,
      "discount": 0,
      "pointsUsed": 50,
      "pointsUsedValue": 100,
      "total": 900
    },

    // Payment Information
    "payment": {
      "method": "crypto",
      "status": "pending_confirmation",
      "cryptoDetails": {
        "currency": "USDT",
        "paymentId": "payment_12345",
        "amount": 25.5,
        "amountInCrypto": 25.5,
        "network": "TRX",
        "address": "TXYZabc123...",
        "transactionHash": null,
        "paymentUrl": "https://nowpayments.io/payment/12345"
      }
    },

    // Points & Cashback
    "points": {
      "earned": 100,
      "used": 50,
      "usedValue": 100,
      "usagePercentage": 10,
      "details": [
        {
          "productId": "prod-001",
          "productName": "Premium Cannabis 3.5g",
          "categoryId": "cat-001",
          "categoryName": "Indoor Sativa",
          "subtotal": 1000,
          "cashbackType": "percentage",
          "cashbackValue": 10,
          "cashbackAmount": 100,
          "points": 100
        }
      ],
      "calculation": {
        "totalPointsEarned": 100,
        "calculationMethod": "category-based",
        "items": []
      }
    },

    // Metadata
    "metadata": {
      "source": "kiosk",
      "kioskId": "KIOSK-001",
      "kioskLocation": "Main Store",
      "orderCompletedAt": "2025-11-03T10:30:00Z",
      "requiresConfirmation": true,
      "notes": ""
    }
  }
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Order received successfully",
  "data": {
    "orderId": "firebase-doc-id-123",
    "transactionId": "TRX-00001",
    "status": "pending_confirmation",
    "confirmationUrl": "/api/orders/firebase-doc-id-123/confirm",
    "queueNumber": 5,
    "estimatedWaitTime": "2-3 minutes"
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "Invalid order data",
  "message": "Missing required field: customer.fullName",
  "validationErrors": [
    {
      "field": "customer.fullName",
      "message": "Customer name is required"
    }
  ]
}
```

**Error Response (500 Internal Server Error):**

```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Failed to save order to database"
}
```

---

## POS API Implementation

### Create API Route: `/api/orders/submit/route.js`

```javascript
import { NextResponse } from "next/server";
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request) {
  try {
    // 1. Parse request body
    const body = await request.json();
    const { orderData } = body;

    // 2. Validate required fields
    const validation = validateOrderData(orderData);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid order data",
          message: validation.message,
          validationErrors: validation.errors,
        },
        { status: 400 }
      );
    }

    // 3. Get kiosk ID from headers
    const kioskId =
      request.headers.get("X-Kiosk-ID") || orderData.kioskId || "UNKNOWN";

    // Optional: Verify API key for security
    const apiKey = request.headers.get("X-API-Key");
    if (process.env.KIOSK_API_KEY && apiKey !== process.env.KIOSK_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          message: "Invalid API key",
        },
        { status: 401 }
      );
    }

    // 4. Prepare order document for Firebase
    const orderDocument = {
      // Order Identification
      transactionId: orderData.transactionId,
      orderNumber: orderData.orderNumber || orderData.transactionId,
      kioskId: kioskId,
      status: "pending_confirmation", // Status: pending_confirmation, confirmed, completed, cancelled

      // Customer Information
      customer: {
        id: orderData.customer?.id || null,
        customerId: orderData.customer?.customerId || null,
        name: orderData.customer?.name || "",
        lastName: orderData.customer?.lastName || "",
        fullName:
          orderData.customer?.fullName || orderData.customer?.name || "Guest",
        email: orderData.customer?.email || "",
        phone: orderData.customer?.phone || "",
        isNoMember: orderData.customer?.isNoMember || false,
        currentPoints: orderData.customer?.currentPoints || 0,
      },

      // Order Items
      items: orderData.items || [],

      // Pricing
      pricing: {
        subtotal: orderData.pricing?.subtotal || 0,
        tax: orderData.pricing?.tax || 0,
        discount: orderData.pricing?.discount || 0,
        pointsUsed: orderData.pricing?.pointsUsed || 0,
        pointsUsedValue: orderData.pricing?.pointsUsedValue || 0,
        total: orderData.pricing?.total || 0,
      },

      // Payment Information
      payment: {
        method: orderData.payment?.method || "",
        status: orderData.payment?.status || "pending_confirmation",
        confirmedBy: null,
        confirmedAt: null,

        // For crypto payments
        cryptoDetails:
          orderData.payment?.method === "crypto"
            ? {
                currency: orderData.payment?.cryptoDetails?.currency || "",
                paymentId: orderData.payment?.cryptoDetails?.paymentId || "",
                amount: orderData.payment?.cryptoDetails?.amount || 0,
                amountInCrypto:
                  orderData.payment?.cryptoDetails?.amountInCrypto || 0,
                network: orderData.payment?.cryptoDetails?.network || "",
                address: orderData.payment?.cryptoDetails?.address || "",
                transactionHash:
                  orderData.payment?.cryptoDetails?.transactionHash || null,
                paymentUrl: orderData.payment?.cryptoDetails?.paymentUrl || "",
                verificationStatus: "pending",
                verifiedAt: null,
              }
            : null,
      },

      // Points & Cashback
      points: {
        earned: orderData.points?.earned || 0,
        used: orderData.points?.used || 0,
        usedValue: orderData.points?.usedValue || 0,
        usagePercentage: orderData.points?.usagePercentage || 0,
        details: orderData.points?.details || [],
        calculation: orderData.points?.calculation || null,
      },

      // Metadata
      source: "kiosk",
      kioskLocation: orderData.metadata?.kioskLocation || "Unknown",
      orderCompletedAt: orderData.metadata?.orderCompletedAt
        ? Timestamp.fromDate(new Date(orderData.metadata.orderCompletedAt))
        : serverTimestamp(),
      requiresConfirmation: true,
      notes: orderData.metadata?.notes || "",

      // Timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // 5. Save to Firebase
    const docRef = await addDoc(collection(db, "kioskOrders"), orderDocument);

    console.log("✅ Kiosk order saved:", {
      orderId: docRef.id,
      transactionId: orderData.transactionId,
      customer: orderData.customer?.fullName,
      total: orderData.pricing?.total,
      paymentMethod: orderData.payment?.method,
    });

    // 6. Get queue position (optional)
    const queueNumber = await getQueuePosition();

    // 7. Return success response
    return NextResponse.json(
      {
        success: true,
        message: "Order received successfully",
        data: {
          orderId: docRef.id,
          transactionId: orderData.transactionId,
          status: "pending_confirmation",
          confirmationUrl: `/api/orders/${docRef.id}/confirm`,
          queueNumber: queueNumber,
          estimatedWaitTime: "2-3 minutes",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error processing kiosk order:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// Validation function
function validateOrderData(orderData) {
  const errors = [];

  if (!orderData) {
    return {
      valid: false,
      message: "Order data is required",
      errors: [{ field: "orderData", message: "Order data is required" }],
    };
  }

  // Required fields
  if (!orderData.transactionId) {
    errors.push({
      field: "transactionId",
      message: "Transaction ID is required",
    });
  }

  if (!orderData.items || orderData.items.length === 0) {
    errors.push({
      field: "items",
      message: "Order must have at least one item",
    });
  }

  if (!orderData.pricing || orderData.pricing.total === undefined) {
    errors.push({
      field: "pricing.total",
      message: "Total amount is required",
    });
  }

  if (!orderData.payment || !orderData.payment.method) {
    errors.push({
      field: "payment.method",
      message: "Payment method is required",
    });
  }

  if (errors.length > 0) {
    return {
      valid: false,
      message: "Validation failed",
      errors: errors,
    };
  }

  return { valid: true };
}

// Get queue position
async function getQueuePosition() {
  // Implement logic to count pending orders
  // Return queue number
  return Math.floor(Math.random() * 10) + 1;
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json(
    {
      error: "Method not allowed",
      message: "This endpoint only accepts POST requests",
    },
    { status: 405 }
  );
}
```

---

## Kiosk Implementation

### Update Kiosk to Send Order via API

Modify your `processPayment` function in `src/app/menu/page.js`:

```javascript
// After payment is successful and transaction is created in Firebase
const processPayment = async () => {
  // ... existing payment processing code ...

  try {
    // 1. Create transaction in Firebase (existing code)
    const result = await TransactionService.createTransaction(transactionData);

    // 2. Send order to POS API
    await sendOrderToPOS({
      transactionId: result.transactionId,
      orderNumber: result.transactionId,
      kioskId: "KIOSK-001", // Your kiosk ID

      customer: {
        id: customer?.id || null,
        customerId: customer?.customerId || null,
        name: customer?.name || "",
        lastName: customer?.lastName || "",
        fullName: customer
          ? customer.isNoMember
            ? "No Member"
            : `${customer.name} ${customer.lastName || ""}`.trim()
          : "Guest",
        email: customer?.email || "",
        phone: customer?.cell || "",
        isNoMember: customer?.isNoMember || false,
        currentPoints: customer?.customPoints || 0,
      },

      items: cart.map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        categoryId: item.categoryId,
        categoryName: item.categoryName || "",
        subtotal: item.price * item.quantity,
        cashbackEnabled: item.cashbackEnabled || false,
        cashbackType: item.cashbackType || "",
        cashbackValue: item.cashbackValue || 0,
      })),

      pricing: {
        subtotal: originalTotal,
        tax: 0,
        discount: 0,
        pointsUsed: pointsToUse,
        pointsUsedValue: pointsValue,
        total: finalTotal,
      },

      payment: {
        method: paymentMethod,
        status:
          paymentMethod === "crypto" ? "pending_confirmation" : "completed",
        cryptoDetails:
          paymentMethod === "crypto"
            ? {
                currency: selectedCryptoCurrency,
                paymentId: cryptoPaymentId,
                amount: cryptoPaymentAmount,
                amountInCrypto: cryptoPaymentAmountInCrypto,
                network: cryptoPaymentNetwork,
                address: cryptoPaymentAddress,
                transactionHash: null,
                paymentUrl: cryptoPaymentUrl,
              }
            : null,
      },

      points: {
        earned: customer?.isNoMember ? 0 : cashbackPoints,
        used: pointsToUse,
        usedValue: pointsValue,
        usagePercentage: pointsUsagePercentage,
        details: customer?.isNoMember ? [] : window.menuCashbackDetails || [],
        calculation: {
          totalPointsEarned: customer?.isNoMember ? 0 : cashbackPoints,
          calculationMethod: customer?.isNoMember ? "none" : "category-based",
          items: customer?.isNoMember ? [] : window.menuCashbackDetails || [],
        },
      },

      metadata: {
        source: "kiosk",
        kioskId: "KIOSK-001",
        kioskLocation: "Main Store",
        orderCompletedAt: new Date().toISOString(),
        requiresConfirmation: true,
        notes: "",
      },
    });

    // 3. Show success message
    console.log("✅ Order sent to POS successfully");

    // Continue with existing code...
  } catch (error) {
    console.error("Payment error:", error);
    setError(error.message);
  }
};

// Function to send order to POS API
async function sendOrderToPOS(orderData) {
  try {
    const response = await fetch(
      "https://pos-candy-kush.vercel.app/api/orders/submit",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Kiosk-ID": "KIOSK-001",
          "X-API-Key": process.env.NEXT_PUBLIC_KIOSK_API_KEY || "", // Optional
        },
        body: JSON.stringify({ orderData }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to submit order to POS");
    }

    console.log("📦 Order submitted to POS:", result.data);
    return result.data;
  } catch (error) {
    console.error("❌ Failed to send order to POS:", error);
    // Don't throw error - order is already saved in Firebase
    // Just log for monitoring
    return null;
  }
}
```

---

## Cashier Confirmation Interface

### Real-time Order Listener for Cashier

```javascript
"use client";
import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function CashierOrderConfirmation() {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    // Listen to pending orders
    const q = query(
      collection(db, "kioskOrders"),
      where("status", "==", "pending_confirmation"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = [];
      snapshot.forEach((doc) => {
        orders.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          orderCompletedAt: doc.data().orderCompletedAt?.toDate(),
        });
      });

      setPendingOrders(orders);

      // Play sound for new orders
      if (orders.length > pendingOrders.length) {
        playNotificationSound();
      }
    });

    return () => unsubscribe();
  }, []);

  const confirmOrder = async (orderId, confirmationData) => {
    try {
      const orderRef = doc(db, "kioskOrders", orderId);

      await updateDoc(orderRef, {
        status: "confirmed",
        "payment.confirmedBy": confirmationData.cashierName || "Cashier",
        "payment.confirmedAt": serverTimestamp(),
        "payment.status": "confirmed",

        // For crypto payments
        ...(confirmationData.cryptoTransactionHash && {
          "payment.cryptoDetails.transactionHash":
            confirmationData.cryptoTransactionHash,
          "payment.cryptoDetails.verificationStatus": "verified",
          "payment.cryptoDetails.verifiedAt": serverTimestamp(),
        }),

        updatedAt: serverTimestamp(),
      });

      console.log("✅ Order confirmed:", orderId);
      setSelectedOrder(null);

      // Show success message
      alert("Order confirmed successfully!");
    } catch (error) {
      console.error("❌ Error confirming order:", error);
      alert("Failed to confirm order: " + error.message);
    }
  };

  return (
    <div className="cashier-dashboard">
      <h1>Pending Orders ({pendingOrders.length})</h1>

      <div className="orders-grid">
        {pendingOrders.map((order) => (
          <OrderConfirmationCard
            key={order.id}
            order={order}
            onSelect={() => setSelectedOrder(order)}
            onConfirm={(data) => confirmOrder(order.id, data)}
          />
        ))}
      </div>

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onConfirm={(data) => confirmOrder(selectedOrder.id, data)}
        />
      )}
    </div>
  );
}

function OrderConfirmationCard({ order, onSelect, onConfirm }) {
  const [cashierName, setCashierName] = useState("");
  const [cryptoTxHash, setCryptoTxHash] = useState("");

  const handleConfirm = () => {
    if (order.payment.method === "crypto" && !cryptoTxHash) {
      alert("Please enter crypto transaction hash");
      return;
    }

    onConfirm({
      cashierName: cashierName || "Cashier",
      cryptoTransactionHash: cryptoTxHash || null,
    });
  };

  return (
    <div className="order-card pending">
      {/* Order Header */}
      <div className="order-header">
        <h3>Order #{order.transactionId}</h3>
        <span className="badge new">NEW</span>
        <span className="time">{order.createdAt?.toLocaleTimeString()}</span>
      </div>

      {/* Customer Info */}
      <div className="customer-section">
        <h4>👤 Customer</h4>
        <p className="name">{order.customer.fullName}</p>
        {!order.customer.isNoMember && (
          <>
            <p className="member-id">ID: {order.customer.customerId}</p>
            <p className="points">Points: {order.customer.currentPoints}</p>
          </>
        )}
      </div>

      {/* Items Summary */}
      <div className="items-summary">
        <h4>📦 Items ({order.items.length})</h4>
        {order.items.map((item, idx) => (
          <div key={idx} className="item-row">
            <span>
              {item.quantity}x {item.name}
            </span>
            <span>฿{item.subtotal}</span>
          </div>
        ))}
      </div>

      {/* Pricing */}
      <div className="pricing">
        <div className="price-row">
          <span>Subtotal:</span>
          <span>฿{order.pricing.subtotal}</span>
        </div>
        {order.pricing.pointsUsed > 0 && (
          <div className="price-row discount">
            <span>Points Used ({order.pricing.pointsUsed}):</span>
            <span>-฿{order.pricing.pointsUsedValue}</span>
          </div>
        )}
        <div className="price-row total">
          <strong>Total:</strong>
          <strong>฿{order.pricing.total}</strong>
        </div>
      </div>

      {/* Payment Method - NEEDS CONFIRMATION */}
      <div className="payment-confirmation">
        <h4>💳 Payment Method</h4>
        <div className={`payment-badge ${order.payment.method}`}>
          {order.payment.method.toUpperCase()}
        </div>

        {/* Cash Payment */}
        {order.payment.method === "cash" && (
          <div className="confirm-section">
            <p>✅ Confirm cash payment received</p>
          </div>
        )}

        {/* Card Payment */}
        {order.payment.method === "card" && (
          <div className="confirm-section">
            <p>✅ Confirm card payment processed</p>
          </div>
        )}

        {/* Crypto Payment */}
        {order.payment.method === "crypto" && (
          <div className="crypto-confirm-section">
            <div className="crypto-details">
              <p>
                <strong>Currency:</strong>{" "}
                {order.payment.cryptoDetails.currency}
              </p>
              <p>
                <strong>Amount:</strong>{" "}
                {order.payment.cryptoDetails.amountInCrypto}{" "}
                {order.payment.cryptoDetails.currency}
              </p>
              <p>
                <strong>Network:</strong> {order.payment.cryptoDetails.network}
              </p>
              <p>
                <strong>Payment ID:</strong>{" "}
                {order.payment.cryptoDetails.paymentId}
              </p>
              {order.payment.cryptoDetails.paymentUrl && (
                <a
                  href={order.payment.cryptoDetails.paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  🔗 View Payment
                </a>
              )}
            </div>

            <div className="tx-hash-input">
              <label>Transaction Hash (Proof):</label>
              <input
                type="text"
                placeholder="Enter blockchain transaction hash"
                value={cryptoTxHash}
                onChange={(e) => setCryptoTxHash(e.target.value)}
                className="form-control"
              />
              <small>
                Verify payment on blockchain and enter transaction hash
              </small>
            </div>
          </div>
        )}
      </div>

      {/* Cashier Input */}
      <div className="cashier-input">
        <label>Cashier Name:</label>
        <input
          type="text"
          placeholder="Your name"
          value={cashierName}
          onChange={(e) => setCashierName(e.target.value)}
          className="form-control"
        />
      </div>

      {/* Action Buttons */}
      <div className="actions">
        <button onClick={onSelect} className="btn-view">
          View Details
        </button>
        <button onClick={handleConfirm} className="btn-confirm">
          ✅ Confirm Order
        </button>
      </div>
    </div>
  );
}

function playNotificationSound() {
  const audio = new Audio("/notification.mp3");
  audio.play().catch((e) => console.log("Audio play failed:", e));
}
```

---

## Firebase Document Structure (kioskOrders)

```javascript
{
  "id": "firebase-doc-id-123",

  // Order Identification
  "transactionId": "TRX-00001",
  "orderNumber": "TRX-00001",
  "kioskId": "KIOSK-001",
  "status": "pending_confirmation", // pending_confirmation → confirmed → completed

  // Customer
  "customer": {
    "id": "abc123",
    "customerId": "CK-0001",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "+66812345678",
    "isNoMember": false,
    "currentPoints": 150
  },

  // Items
  "items": [...],

  // Pricing
  "pricing": {
    "subtotal": 1000,
    "total": 900
  },

  // Payment (IMPORTANT - Cashier confirms this)
  "payment": {
    "method": "crypto",
    "status": "pending_confirmation", // → "confirmed"
    "confirmedBy": null, // → "Cashier Name"
    "confirmedAt": null, // → Timestamp when confirmed

    "cryptoDetails": {
      "currency": "USDT",
      "paymentId": "payment_12345",
      "transactionHash": null, // → Cashier enters this
      "verificationStatus": "pending", // → "verified"
      "verifiedAt": null // → Timestamp when verified
    }
  },

  // Timestamps
  "createdAt": Timestamp,
  "updatedAt": Timestamp
}
```

---

## Environment Variables

Add to POS `.env.local`:

```env
# Kiosk API Security
KIOSK_API_KEY=your-secret-api-key-here
```

Add to Kiosk `.env.local`:

```env
# POS API Endpoint
NEXT_PUBLIC_POS_API_URL=https://pos-candy-kush.vercel.app
NEXT_PUBLIC_KIOSK_API_KEY=your-secret-api-key-here
NEXT_PUBLIC_KIOSK_ID=KIOSK-001
```

---

## Testing

### Test Order Submission from Kiosk

```javascript
// Test in browser console on kiosk
const testOrder = {
  orderData: {
    transactionId: "TEST-001",
    orderNumber: "TEST-001",
    kioskId: "KIOSK-001",
    customer: {
      id: null,
      fullName: "Test Customer",
      isNoMember: true,
    },
    items: [
      {
        id: "test-1",
        name: "Test Product",
        price: 100,
        quantity: 1,
      },
    ],
    pricing: {
      subtotal: 100,
      total: 100,
    },
    payment: {
      method: "cash",
      status: "pending_confirmation",
    },
    points: {
      earned: 0,
      used: 0,
    },
    metadata: {
      source: "kiosk",
      kioskId: "KIOSK-001",
      orderCompletedAt: new Date().toISOString(),
    },
  },
};

fetch("http://localhost:3000/api/orders/submit", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(testOrder),
})
  .then((r) => r.json())
  .then(console.log);
```

---

## Summary

**What happens:**

1. ✅ Kiosk sends order via POST to `/api/orders/submit`
2. ✅ POS API receives and validates order
3. ✅ Order saved to Firebase `kioskOrders` collection
4. ✅ Cashier sees order in real-time
5. ✅ Cashier confirms payment method:
   - **Cash:** Just confirm received
   - **Card:** Confirm card processed
   - **Crypto:** Enter transaction hash as proof
6. ✅ Order status updated to "confirmed"
7. ✅ Transaction is finalized

This gives you a complete audit trail and cashier verification for all payment methods! 🚀
