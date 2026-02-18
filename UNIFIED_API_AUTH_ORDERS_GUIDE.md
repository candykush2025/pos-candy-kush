# ISY Unified API — Authentication & Orders/Receipts Guide

> **Purpose**: This document tells you **exactly** how every website (POS, Management, Kiosk) and the Android app must call the API for login and creating/reading orders. Use this to fix any site that is out of sync.

**Base URL**: `https://api.isy.software`

---

## Table of Contents

1. [Authentication](#1-authentication)
   - [Unified Login (all apps)](#11-unified-login-all-apps)
   - [JWT Token Structure](#12-jwt-token-structure)
   - [Token Expiry by App Type](#13-token-expiry-by-app-type)
   - [PIN Login (Android POS only)](#14-pin-login-android-pos-only)
   - [Validate Token](#15-validate-token)
   - [Refresh Token](#16-refresh-token)
   - [Logout](#17-logout)
2. [Orders / Receipts](#2-orders--receipts)
   - [POS Website — Create Order](#21-pos-website--create-order)
   - [Android POS — Create Order](#22-android-pos--create-order)
   - [Get Orders (all apps)](#23-get-orders-all-apps)
   - [Get Single Order](#24-get-single-order)
   - [Update Order / Receipt](#25-update-order--receipt)
   - [Delete Order / Receipt](#26-delete-order--receipt)
   - [Receipt Document Format (MongoDB)](#27-receipt-document-format-mongodb)
3. [Common Mistakes to Fix](#3-common-mistakes-to-fix)
4. [How to Use the Token in Every Request](#4-how-to-use-the-token-in-every-request)
5. [Quick Reference — All Endpoints](#5-quick-reference--all-endpoints)
6. [Old Server Sync Guide](#6-old-server-sync-guide)
   - [Sync Overview](#61-sync-overview)
   - [Sync Script — Pull from Old Server](#62-sync-script--pull-from-old-server)
   - [Sync Strategy — Conflict Resolution](#63-sync-strategy--conflict-resolution)

---

## 1. Authentication

### 1.1 Unified Login (all apps)

All apps — POS website, Management website, Kiosk website, Android — use the **same endpoint**.

```
POST https://api.isy.software/api/v1/auth/login
Content-Type: application/json
```

**Request Body:**

```json
{
  "username": "your_username",
  "password": "your_password",
  "type": "pos"
}
```

| Field      | Required | Values                               | Notes                                                                                    |
| ---------- | -------- | ------------------------------------ | ---------------------------------------------------------------------------------------- |
| `username` | ✅ Yes   | string                               |                                                                                          |
| `password` | ✅ Yes   | string                               |                                                                                          |
| `type`     | ❌ No    | `"kiosk"` / `"pos"` / `"management"` | If omitted, any active user can log in. If provided, only users of that type can log in. |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "65a1b2c3d4e5f6789012345",
      "username": "cashier01",
      "email": "cashier@store.com",
      "name": "John Smith",
      "role": "cashier",
      "type": "pos",
      "storeId": "692a98d1c5c2655fead2fa93",
      "storeName": "My Store",
      "storeLogo": "https://api.isy.software/uploads/logo.png",
      "currency": "THB",
      "permissions": ["view", "input"],
      "active": true,
      "lastLogin": "2026-02-18T10:30:00Z",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  }
}
```

**Error Response (401):**

```json
{
  "error": "Invalid username or password"
}
```

**Error Response (400 — wrong type):**

```json
{
  "error": "Invalid type. Must be 'kiosk', 'pos', or 'management'"
}
```

> ⚠️ **IMPORTANT**: The response wrapper is `data` not `user` directly.  
> Access token: `response.data.token`  
> Access user: `response.data.user`

---

### 1.2 JWT Token Structure

After login, decode the JWT to get these claims:

```json
{
  "userId": "65a1b2c3d4e5f6789012345",
  "username": "cashier01",
  "email": "cashier@store.com",
  "role": "cashier",
  "type": "pos",
  "storeId": "692a98d1c5c2655fead2fa93",
  "storeName": "My Store",
  "storeLogo": "https://api.isy.software/uploads/logo.png",
  "currency": "THB",
  "permissions": ["view", "input"],
  "exp": 1739876543,
  "iat": 1739790143
}
```

The API middleware reads `storeId` from the JWT automatically. You **do not** need to send `storeId` in request bodies — it is injected from the token.

---

### 1.3 Token Expiry by App Type

| App Type     | Token Expiry | Reason                         |
| ------------ | ------------ | ------------------------------ |
| `management` | 24 hours     | Browser session                |
| `pos`        | 30 days      | POS device stays logged in     |
| `kiosk`      | 1 year       | Kiosk device is always running |

---

### 1.4 PIN Login (Android POS only)

For PIN-based login on the POS device (requires an existing auth token):

```
POST https://api.isy.software/api/v1/auth/pin
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "pin": "1234"
}
```

**Success Response (200):**

Same structure as `/api/v1/auth/login` — returns a full token and user object.

> The PIN is matched against users in the **same store** only (enforced by `storeId` from the JWT).

---

### 1.5 Validate Token

Check if a token is still valid (no auth required):

```
GET https://api.isy.software/api/v1/auth/validate
Authorization: Bearer <token>
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "user": {
      "userId": "65a1b2c3d4e5f6789012345",
      "username": "cashier01",
      "email": "cashier@store.com",
      "role": "cashier",
      "type": "pos",
      "storeId": "692a98d1c5c2655fead2fa93"
    }
  }
}
```

---

### 1.6 Refresh Token

Get a new token before the old one expires (auth required):

```
POST https://api.isy.software/api/v1/auth/refresh
Authorization: Bearer <token>
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "message": "Token refreshed successfully"
  }
}
```

---

### 1.7 Logout

```
POST https://api.isy.software/api/v1/auth/logout
Authorization: Bearer <token>
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

> Token invalidation is client-side. Remove the stored token from `localStorage` / `sessionStorage`.

---

## 2. Orders / Receipts

All orders are stored in the MongoDB `receipts` collection. Both the **POS website endpoint** and the **Android endpoint** save to the same collection so Management can read them all.

### 2.1 POS Website — Create Order

**Endpoint (used by POS frontend website):**

```
POST https://api.isy.software/pos/v1/receipts
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "orderNumber": "POS-20260218-001",
  "customerId": "65a1b2c3d4e5f6789012345",
  "customerName": "Jane Doe",
  "userId": "65a1b2c3d4e5f6789012346",
  "userName": "cashier01",
  "shiftId": "65a1b2c3d4e5f6789012347",
  "items": [
    {
      "productId": "65a1b2c3d4e5f6789012348",
      "sku": "PROD-001",
      "name": "Product Name",
      "variantId": "",
      "quantity": 2.5,
      "price": 100.0,
      "discount": 0.0,
      "tax": 0.0,
      "total": 250.0,
      "cost": 50.0
    }
  ],
  "subtotal": 250.0,
  "discountAmount": 0.0,
  "discountType": "fixed",
  "taxAmount": 0.0,
  "totalAmount": 250.0,
  "payment": {
    "method": "cash",
    "amount": 300.0,
    "changeDue": 50.0,
    "transactionId": ""
  },
  "status": "completed",
  "notes": ""
}
```

| Field            | Type   | Required | Notes                                   |
| ---------------- | ------ | -------- | --------------------------------------- |
| `items`          | array  | ✅       | At least 1 item required                |
| `totalAmount`    | float  | ✅       | Must be > 0                             |
| `payment.method` | string | ✅       | `"cash"` / `"card"` / `"digital"`       |
| `orderNumber`    | string | ❌       | Auto-generated if empty                 |
| `storeId`        | string | ❌       | **DO NOT SEND** — taken from JWT token  |
| `quantity`       | float  | ✅       | **Decimal supported** e.g. `0.5`, `1.2` |

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "_id":         "65a1b2c3d4e5f6789012349",
    "orderNumber": "POS-20260218-001",
    "storeId":     "692a98d1c5c2655fead2fa93",
    "items": [...],
    "totalAmount": 250.00,
    "status":      "completed",
    "createdAt":   "2026-02-18T10:30:00Z"
  }
}
```

---

### 2.2 Android POS — Create Order

**Endpoint (used by Android app only):**

```
POST https://api.isy.software/pos/v1/orders
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body (Android format):**

```json
{
  "receiptNumber": "POS-20260218-001",
  "customerId": "65a1b2c3d4e5f6789012345",
  "customerName": "Jane Doe",
  "cashierName": "cashier01",
  "shiftId": "65a1b2c3d4e5f6789012347",
  "items": [
    {
      "productId": "65a1b2c3d4e5f6789012348",
      "name": "Product Name",
      "quantity": 2.5,
      "price": 100.0,
      "total": 250.0
    }
  ],
  "subtotal": 250.0,
  "tax": 0.0,
  "discount": 0.0,
  "cashbackUsed": 0.0,
  "cashbackEarned": 0.0,
  "total": 250.0,
  "paymentMethod": "cash",
  "status": "completed",
  "notes": ""
}
```

**Key Differences — Android vs POS Website:**

| Field              | POS Website                   | Android                 | MongoDB stored as                       |
| ------------------ | ----------------------------- | ----------------------- | --------------------------------------- |
| Order number field | `orderNumber`                 | `receiptNumber`         | both `orderNumber` + `receiptNumber`    |
| Total field        | `totalAmount`                 | `total`                 | `total`                                 |
| Tax field          | `taxAmount`                   | `tax`                   | `tax`                                   |
| Discount field     | `discountAmount`              | `discount`              | `discount`                              |
| Cashier field      | `userName`                    | `cashierName`           | `cashierName`                           |
| Payment            | `payment: { method, amount }` | `paymentMethod: "cash"` | both `payment.method` + `paymentMethod` |
| Item name field    | `name`                        | `name`                  | `name`                                  |
| Item total field   | `total`                       | `total`                 | `total`                                 |

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "_id":          "65a1b2c3d4e5f6789012349",
    "receiptNumber": "POS-20260218-001",
    "storeId":      "692a98d1c5c2655fead2fa93",
    "items": [...],
    "total":        250.00,
    "paymentMethod": "cash",
    "status":       "completed",
    "createdAt":    "2026-02-18T10:30:00Z"
  }
}
```

---

### 2.3 Get Orders (all apps)

#### POS Website endpoint:

```
GET https://api.isy.software/pos/v1/receipts
Authorization: Bearer <token>
```

#### Android endpoint:

```
GET https://api.isy.software/pos/v1/orders
Authorization: Bearer <token>
```

Both return the same `receipts` collection. `storeId` is filtered automatically from your JWT token.

**Query Parameters:**

| Parameter   | Type   | Example                 | Description                   |
| ----------- | ------ | ----------------------- | ----------------------------- |
| `status`    | string | `?status=completed`     | Filter by status              |
| `startDate` | string | `?startDate=2026-02-01` | Date range start (YYYY-MM-DD) |
| `endDate`   | string | `?endDate=2026-02-18`   | Date range end (YYYY-MM-DD)   |

**Example:**

```
GET https://api.isy.software/pos/v1/orders?startDate=2026-02-01&endDate=2026-02-18&status=completed
Authorization: Bearer <token>
```

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id":           "65a1b2c3d4e5f6789012349",
      "receiptNumber": "POS-20260218-001",
      "storeId":       "692a98d1c5c2655fead2fa93",
      "items": [...],
      "total":         250.00,
      "paymentMethod": "cash",
      "status":        "completed",
      "cashierName":   "cashier01",
      "customerName":  "Jane Doe",
      "createdAt":     "2026-02-18T10:30:00Z"
    }
  ]
}
```

---

### 2.4 Get Single Order

#### POS Website endpoint:

```
GET https://api.isy.software/pos/v1/receipts/{id}
Authorization: Bearer <token>
```

#### Android endpoint:

```
GET https://api.isy.software/pos/v1/orders/{id}
Authorization: Bearer <token>
```

Where `{id}` is the MongoDB `_id` string.

---

### 2.5 Update Order / Receipt

Update specific fields of a receipt/order. Only fields you send will be updated — other fields are untouched. The `storeId` and `_id` fields are **protected** and cannot be overwritten.

#### POS Website endpoint:

```
PUT https://api.isy.software/pos/v1/receipts/{id}
Authorization: Bearer <token>
Content-Type: application/json
```

#### Android endpoint:

```
PUT https://api.isy.software/pos/v1/orders/{id}
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body (partial update — send only fields to change):**

```json
{
  "status": "refunded",
  "notes": "Customer returned item",
  "paymentMethod": "card",
  "total": 200.0,
  "items": [
    {
      "productId": "65a1b2c3d4e5f6789012348",
      "name": "Product Name",
      "quantity": 1,
      "price": 200.0,
      "total": 200.0
    }
  ]
}
```

| Field       | Type   | Notes                                        |
| ----------- | ------ | -------------------------------------------- |
| Any field   | varies | Only include fields you want to update       |
| `storeId`   | ❌     | **CANNOT be changed** — enforced by JWT      |
| `_id`       | ❌     | **CANNOT be changed** — protected field      |
| `updatedAt` | auto   | **Auto-set** to current time on every update |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Receipt updated",
    "id": "65a1b2c3d4e5f6789012349"
  }
}
```

**Error — Not Found (404):**

```json
{
  "error": "Order not found"
}
```

> ⚠️ **Security**: You can only update receipts in your own store (enforced by `storeId` from JWT).

---

### 2.6 Delete Order / Receipt

Permanently delete a receipt/order by ID. This is intended for **sync and cleanup** operations only.

#### POS Website endpoint:

```
DELETE https://api.isy.software/pos/v1/receipts/{id}
Authorization: Bearer <token>
```

#### Android endpoint:

```
DELETE https://api.isy.software/pos/v1/orders/{id}
Authorization: Bearer <token>
```

Where `{id}` is the MongoDB `_id` string.

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Receipt deleted successfully",
    "id": "65a1b2c3d4e5f6789012349"
  }
}
```

**Error — Not Found (404):**

```json
{
  "error": "Receipt not found"
}
```

**Error — Invalid ID (400):**

```json
{
  "error": "Invalid receipt ID"
}
```

> ⚠️ **Security**: You can only delete receipts in your own store (enforced by `storeId` from JWT).
> ⚠️ **Warning**: Deletion is permanent. No soft-delete. Use `status: "voided"` via PUT if you want to keep the record.

---

### 2.7 Receipt Document Format (MongoDB)

This is what gets saved to the `receipts` collection. Both endpoints write to this same format so Management can always read it.

```json
{
  "_id": "ObjectId",
  "storeId": "692a98d1c5c2655fead2fa93",
  "orderNumber": "POS-20260218-001",
  "receiptNumber": "POS-20260218-001",
  "type": "SALE",
  "source": "pos",
  "items": [
    {
      "productId": "65a1b2c3d4e5f6789012348",
      "sku": "PROD-001",
      "name": "Product Name",
      "variantId": "",
      "quantity": 2.5,
      "price": 100.0,
      "discount": 0.0,
      "tax": 0.0,
      "total": 250.0,
      "cost": 50.0
    }
  ],
  "subtotal": 250.0,
  "tax": 0.0,
  "discount": 0.0,
  "total": 250.0,
  "payment": {
    "method": "cash",
    "amount": 300.0,
    "changeDue": 50.0,
    "transactionId": ""
  },
  "paymentMethod": "cash",
  "status": "completed",
  "cashierId": "65a1b2c3d4e5f6789012346",
  "cashierName": "cashier01",
  "customerId": "65a1b2c3d4e5f6789012345",
  "customerName": "Jane Doe",
  "notes": "",
  "shiftId": "65a1b2c3d4e5f6789012347",
  "receiptDate": "2026-02-18T10:30:00Z",
  "createdAt": "2026-02-18T10:30:00Z",
  "updatedAt": "2026-02-18T10:30:00Z"
}
```

> **Note on quantities**: `quantity` is `float64` (decimal). Values like `0.5`, `1.2`, `2.0` are all valid.

---

## 3. Common Mistakes to Fix

### ❌ Wrong login endpoint

```js
// WRONG - old per-app endpoints
POST / kiosk / v1 / auth / login;
POST / management / v1 / auth / login;

// ✅ CORRECT - unified endpoint for ALL apps
POST / api / v1 / auth / login;
```

### ❌ Wrong response field for token

```js
// WRONG
const token = response.token;
const user = response.user;

// ✅ CORRECT
const token = response.data.token;
const user = response.data.user;
```

### ❌ Sending storeId in request body

```js
// WRONG - do not send storeId, API reads it from JWT
{ storeId: "692a98d1c5c2655fead2fa93", items: [...] }

// ✅ CORRECT - just send the order data
{ items: [...], totalAmount: 250 }
```

### ❌ Using parseInt for stock/quantity

```js
// WRONG - drops decimal part
quantity: parseInt(item.quantity); // 1.5 becomes 1

// ✅ CORRECT - keep decimal
quantity: parseFloat(item.quantity); // 1.5 stays 1.5
```

### ❌ Wrong field name for order total

```js
// WRONG - POS website uses totalAmount
{
  total: 250;
} // won't save correctly via /pos/v1/receipts

// ✅ CORRECT for POS website /pos/v1/receipts
{
  totalAmount: 250;
}

// ✅ CORRECT for Android /pos/v1/orders
{
  total: 250;
}
```

### ❌ Not sending Authorization header

```js
// WRONG
fetch("/pos/v1/orders");

// ✅ CORRECT
fetch("/pos/v1/orders", {
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});
```

---

## 4. How to Use the Token in Every Request

After login, store the token and attach it to every API call:

### JavaScript / Next.js (POS & Management websites)

```js
// Store after login
localStorage.setItem("token", response.data.token);
localStorage.setItem("user", JSON.stringify(response.data.user));
localStorage.setItem("storeId", response.data.user.storeId);

// Use in requests
const token = localStorage.getItem("token");

const res = await fetch("https://api.isy.software/pos/v1/receipts", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(orderData),
});
const data = await res.json();
```

### NextAuth.js (Management website)

```js
// In [...nextauth]/route.js - after credentials login
async authorize(credentials) {
  const res = await fetch('https://api.isy.software/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: credentials.username,
      password: credentials.password,
      type: 'management'
    })
  })
  const data = await res.json()
  if (data.success) {
    return {
      id: data.data.user.id,
      name: data.data.user.name,
      token: data.data.token,
      storeId: data.data.user.storeId,
      role: data.data.user.role
    }
  }
  return null
}
```

### Android Kotlin (Retrofit)

```kotlin
// API interface
interface ApiService {
    @POST("api/v1/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @POST("pos/v1/orders")
    suspend fun createOrder(
        @Header("Authorization") token: String,
        @Body order: CreateOrderRequest
    ): Response<OrderResponse>
}

// Login data class
data class LoginRequest(
    val username: String,
    val password: String,
    val type: String = "pos"
)

// After login - access token and user:
val token = response.body()?.data?.token
val user = response.body()?.data?.user
val storeId = user?.storeId  // Already embedded in JWT - no need to send it again
```

---

## 5. Quick Reference — All Endpoints

### Auth Endpoints (No auth needed unless noted)

| Method | URL                            | Auth | Description              |
| ------ | ------------------------------ | ---- | ------------------------ |
| `POST` | `/api/v1/auth/login`           | ❌   | Login — all app types    |
| `POST` | `/api/v1/auth/pin`             | ✅   | PIN login — Android only |
| `GET`  | `/api/v1/auth/validate`        | ❌   | Validate token           |
| `POST` | `/api/v1/auth/refresh`         | ✅   | Refresh token            |
| `POST` | `/api/v1/auth/logout`          | ✅   | Logout                   |
| `PUT`  | `/api/v1/auth/change-password` | ✅   | Change password          |

### POS Orders — Website Frontend

| Method   | URL                     | Auth | Description                   |
| -------- | ----------------------- | ---- | ----------------------------- |
| `POST`   | `/pos/v1/receipts`      | ✅   | Create order (website format) |
| `GET`    | `/pos/v1/receipts`      | ✅   | List orders                   |
| `GET`    | `/pos/v1/receipts/{id}` | ✅   | Get single order              |
| `PUT`    | `/pos/v1/receipts/{id}` | ✅   | Update order (sync/edit)      |
| `DELETE` | `/pos/v1/receipts/{id}` | ✅   | Delete order (sync/cleanup)   |

### POS Orders — Android App

| Method   | URL                     | Auth | Description                   |
| -------- | ----------------------- | ---- | ----------------------------- |
| `POST`   | `/pos/v1/orders`        | ✅   | Create order (Android format) |
| `GET`    | `/pos/v1/orders`        | ✅   | List orders                   |
| `GET`    | `/pos/v1/orders/{id}`   | ✅   | Get single order              |
| `PUT`    | `/pos/v1/orders/{id}`   | ✅   | Update order (sync/edit)      |
| `DELETE` | `/pos/v1/orders/{id}`   | ✅   | Delete order (sync/cleanup)   |
| `GET`    | `/pos/v1/orders/today`  | ✅   | Today's orders                |
| `GET`    | `/pos/v1/sales/summary` | ✅   | Sales summary                 |

### POS Auth — Android Legacy (also works)

| Method | URL                       | Auth | Description                         |
| ------ | ------------------------- | ---- | ----------------------------------- |
| `POST` | `/pos/v1/auth/login`      | ❌   | Login (Android legacy, same result) |
| `POST` | `/pos/v1/auth/verify-pin` | ✅   | Verify PIN                          |
| `GET`  | `/pos/v1/auth/me`         | ✅   | Get current user                    |

---

## 6. Old Server Sync Guide

> **Purpose**: Sync receipts/orders from an old server (e.g., Firebase, old MongoDB, or legacy POS) to the current ISY API. This uses the CRUD endpoints on the API container — **NOT the management container**.

### 6.1 Sync Overview

```
┌────────────────────┐         ┌─────────────────────────┐         ┌──────────────┐
│   Old Server       │  READ   │   Sync Script           │  WRITE  │   ISY API    │
│  (Firebase/Legacy) │ ──────► │  (Node.js / Python)     │ ──────► │  isy-api     │
│                    │         │  Runs on your machine    │         │  :8080       │
└────────────────────┘         └─────────────────────────┘         └──────────────┘
```

**Key principles:**

1. The sync script runs **outside** containers, on your local machine
2. It reads from the old server and writes to `https://api.isy.software/pos/v1/receipts` (or `/orders`)
3. Uses the **full CRUD** endpoints: Create, Read, Update, Delete
4. `storeId` is injected from the JWT — **never hardcode it**
5. This is an API-level operation — **do NOT modify the management container**

### 6.2 Sync Script — Pull from Old Server

Below is a reference sync script in Node.js. Adapt the "read from old server" part to your old data source.

```js
// sync-receipts.js
// Run with: node sync-receipts.js
// Requires: npm install node-fetch

const API_BASE = "https://api.isy.software";

// Step 1: Login to get token
async function login(username, password) {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, type: "pos" }),
  });
  const data = await res.json();
  if (!data.success) throw new Error("Login failed: " + JSON.stringify(data));
  console.log(
    `✅ Logged in as ${data.data.user.username} (store: ${data.data.user.storeId})`,
  );
  return data.data.token;
}

// Step 2: Get existing receipts from new server (to avoid duplicates)
async function getExistingReceipts(token) {
  const res = await fetch(`${API_BASE}/pos/v1/receipts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!data.success) throw new Error("Failed to fetch receipts");

  // Build a Set of existing receiptNumbers for dedup
  const existing = new Set();
  for (const r of data.data) {
    if (r.receiptNumber) existing.add(r.receiptNumber);
    if (r.orderNumber) existing.add(r.orderNumber);
  }
  return existing;
}

// Step 3: Create a receipt on the new server
async function createReceipt(token, receipt) {
  const res = await fetch(`${API_BASE}/pos/v1/receipts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(receipt),
  });
  const data = await res.json();
  if (!data.success) {
    console.error(`❌ Failed to create receipt: ${JSON.stringify(data)}`);
    return null;
  }
  return data.data;
}

// Step 4: Update a receipt on the new server
async function updateReceipt(token, receiptId, updates) {
  const res = await fetch(`${API_BASE}/pos/v1/receipts/${receiptId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!data.success) {
    console.error(
      `❌ Failed to update receipt ${receiptId}: ${JSON.stringify(data)}`,
    );
    return null;
  }
  return data.data;
}

// Step 5: Delete a receipt from the new server (cleanup)
async function deleteReceipt(token, receiptId) {
  const res = await fetch(`${API_BASE}/pos/v1/receipts/${receiptId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!data.success) {
    console.error(
      `❌ Failed to delete receipt ${receiptId}: ${JSON.stringify(data)}`,
    );
    return false;
  }
  console.log(`🗑️ Deleted receipt ${receiptId}`);
  return true;
}

// ===========================
// MAIN SYNC FLOW
// ===========================
async function syncFromOldServer() {
  const token = await login("your_username", "your_password");
  const existingReceipts = await getExistingReceipts(token);

  // TODO: Replace this with your actual old server data source
  // Examples:
  //   - Firebase Firestore query
  //   - Old MongoDB direct connection
  //   - CSV/JSON file export from old system
  const oldReceipts = [
    // Example old receipt format:
    {
      receiptNumber: "OLD-20250101-001",
      items: [
        {
          productId: "old_product_id",
          name: "Product From Old System",
          quantity: 2,
          price: 100.0,
          total: 200.0,
        },
      ],
      subtotal: 200.0,
      tax: 0,
      discount: 0,
      total: 200.0,
      paymentMethod: "cash",
      status: "completed",
      cashierName: "old_cashier",
      customerName: "Old Customer",
      notes: "Synced from old server",
    },
  ];

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const oldReceipt of oldReceipts) {
    // Dedup check: skip if receiptNumber already exists
    if (existingReceipts.has(oldReceipt.receiptNumber)) {
      console.log(`⏭️ Skipping ${oldReceipt.receiptNumber} (already exists)`);
      skipped++;
      continue;
    }

    const result = await createReceipt(token, {
      receiptNumber: oldReceipt.receiptNumber,
      items: oldReceipt.items.map((item) => ({
        productId: item.productId || "",
        name: item.name,
        quantity: parseFloat(item.quantity), // ✅ Keep decimals
        price: parseFloat(item.price),
        total: parseFloat(item.total),
      })),
      subtotal: parseFloat(oldReceipt.subtotal),
      tax: parseFloat(oldReceipt.tax || 0),
      discount: parseFloat(oldReceipt.discount || 0),
      total: parseFloat(oldReceipt.total),
      paymentMethod: oldReceipt.paymentMethod || "cash",
      status: oldReceipt.status || "completed",
      cashierName: oldReceipt.cashierName || "",
      customerName: oldReceipt.customerName || "",
      notes: oldReceipt.notes || "Synced from old server",
    });

    if (result) {
      console.log(`✅ Created ${oldReceipt.receiptNumber} → ${result._id}`);
      created++;
    } else {
      failed++;
    }

    // Rate limit: wait 100ms between requests
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(
    `\n📊 Sync complete: ${created} created, ${skipped} skipped, ${failed} failed`,
  );
}

syncFromOldServer().catch(console.error);
```

### 6.3 Sync Strategy — Conflict Resolution

| Scenario                                      | Strategy                                                  | API Call                       |
| --------------------------------------------- | --------------------------------------------------------- | ------------------------------ |
| Receipt exists on old server, not on new      | **Create** it on new server                               | `POST /pos/v1/receipts`        |
| Receipt exists on both (same `receiptNumber`) | **Skip** (already synced) or **Update** if changed        | `PUT /pos/v1/receipts/{id}`    |
| Receipt exists on new but not on old          | **Keep** it (new server is source of truth going forward) | —                              |
| Duplicate from old server needs cleanup       | **Delete** it from new server                             | `DELETE /pos/v1/receipts/{id}` |
| Old server uses different field names         | **Map** fields in sync script (see table in §2.2)         | —                              |

### 6.4 CRUD Summary for Sync

| Operation | Website Endpoint               | Android Endpoint             | Handler Function                   |
| --------- | ------------------------------ | ---------------------------- | ---------------------------------- |
| Create    | `POST /pos/v1/receipts`        | `POST /pos/v1/orders`        | `CreateOrder` / `CreatePOSOrder`   |
| Read All  | `GET /pos/v1/receipts`         | `GET /pos/v1/orders`         | `GetOrders` / `GetPOSOrders`       |
| Read One  | `GET /pos/v1/receipts/{id}`    | `GET /pos/v1/orders/{id}`    | `GetOrder` / `GetPOSOrderByID`     |
| Update    | `PUT /pos/v1/receipts/{id}`    | `PUT /pos/v1/orders/{id}`    | `UpdateReceipt` / `UpdatePOSOrder` |
| Delete    | `DELETE /pos/v1/receipts/{id}` | `DELETE /pos/v1/orders/{id}` | `DeleteReceipt` / `DeletePOSOrder` |

> ⚠️ **IMPORTANT**: All CRUD operations are on the **API container** (`isy-api`). Do NOT modify the management container for sync. The management frontend reads the same `receipts` collection automatically.
