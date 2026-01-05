# Customer Management API Documentation

## Overview

This API allows the POS system to manage customers that are synced with the Kiosk system via Firebase. All customer operations are performed on Firebase Firestore, which automatically syncs with the Kiosk in real-time.

## Architecture

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│     POS      │ ──────> │   FIREBASE   │ <────── │    KIOSK     │
│  Admin API   │  CRUD   │  customers   │  Read   │   Scanner    │
└──────────────┘         └──────────────┘         └──────────────┘
```

**Real-time Sync:**

- POS creates/updates/deletes customer → Firebase updates → Kiosk sees changes instantly
- Kiosk scans customer → Reads from Firebase → Gets latest customer data

---

## Customer Data Structure

### Complete Customer Schema

```javascript
{
  // Firebase Document ID (auto-generated)
  "id": "abc123def456",

  // Customer Identification
  "customerId": "CK-0001",              // Auto-generated unique ID (CK-XXXX)
  "memberId": "CK-0001",                // Member ID (defaults to customerId)

  // Personal Information
  "name": "John",                       // First name (REQUIRED)
  "lastName": "Doe",                    // Last name
  "nickname": "Johnny",                 // Nickname/preferred name
  "nationality": "Thai",                // Nationality
  "dateOfBirth": "1990-01-15",         // Date of birth (YYYY-MM-DD)

  // Contact Information
  "email": "john@example.com",         // Email address
  "cell": "+66812345678",              // Phone number

  // Member Status & Points
  "isNoMember": false,                  // Whether customer is a non-member
  "isActive": true,                     // Account active status
  "customPoints": 150,                  // Current points balance
  "points": [                           // Points transaction history (array)
    {
      "amount": 100,
      "date": Timestamp,
      "reason": "Purchase cashback",
      "transactionId": "TRX-00001"
    }
  ],

  // Purchase History
  "totalSpent": 5000,                   // Total amount spent (THB)
  "visitCount": 10,                     // Number of visits/purchases

  // Kiosk Permissions
  "allowedCategories": [                // Categories customer can access on kiosk
    "cat-001",                          // Empty array = access all categories
    "cat-002"
  ],

  // Timestamps
  "createdAt": Timestamp,               // Account creation date
  "updatedAt": Timestamp                // Last update date
}
```

### Field Descriptions

| Field               | Type      | Required | Description                                 |
| ------------------- | --------- | -------- | ------------------------------------------- |
| `id`                | string    | Auto     | Firebase document ID                        |
| `customerId`        | string    | Auto     | Unique customer ID (CK-0001, CK-0002, etc.) |
| `memberId`          | string    | No       | Member card ID (defaults to customerId)     |
| `name`              | string    | **Yes**  | Customer first name                         |
| `lastName`          | string    | No       | Customer last name                          |
| `nickname`          | string    | No       | Preferred nickname                          |
| `nationality`       | string    | No       | Customer nationality                        |
| `dateOfBirth`       | string    | No       | Birth date (YYYY-MM-DD format)              |
| `email`             | string    | No       | Email address                               |
| `cell`              | string    | No       | Phone number (with country code)            |
| `isNoMember`        | boolean   | No       | Is non-member (default: false)              |
| `isActive`          | boolean   | No       | Account status (default: true)              |
| `customPoints`      | number    | No       | Current points balance (default: 0)         |
| `points`            | array     | No       | Points history array (default: [])          |
| `totalSpent`        | number    | Auto     | Total purchase amount (auto-calculated)     |
| `visitCount`        | number    | Auto     | Visit counter (auto-calculated)             |
| `allowedCategories` | array     | No       | Category access restrictions (default: [])  |
| `createdAt`         | Timestamp | Auto     | Creation timestamp                          |
| `updatedAt`         | Timestamp | Auto     | Last update timestamp                       |

---

## API Endpoints

### Base URL

**Production:**

```
https://your-pos-domain.vercel.app/api/customers
```

**Local Development:**

```
http://localhost:3000/api/customers
```

---

## 1. Create Customer

Create a new customer account that syncs with the kiosk.

**Endpoint:** `POST /api/customers`

**Request Headers:**

```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer your-admin-token"
}
```

**Request Body:**

```json
{
  "name": "John",
  "lastName": "Doe",
  "nickname": "Johnny",
  "nationality": "Thai",
  "dateOfBirth": "1990-01-15",
  "email": "john@example.com",
  "cell": "+66812345678",
  "memberId": "",
  "customPoints": 0,
  "isNoMember": false,
  "isActive": true,
  "allowedCategories": ["cat-001", "cat-002"]
}
```

**Example: Customer with access to specific categories only**
```json
{
  "name": "John",
  "email": "john@example.com",
  "allowedCategories": ["cat-001", "cat-002"]
}
```

**Example: Customer with access to ALL categories**
```json
{
  "name": "Jane",
  "email": "jane@example.com",
  "allowedCategories": []
}
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "message": "Customer created successfully",
  "data": {
    "id": "abc123def456",
    "customerId": "CK-0001",
    "name": "John",
    "lastName": "Doe",
    "nickname": "Johnny",
    "nationality": "Thai",
    "dateOfBirth": "1990-01-15",
    "email": "john@example.com",
    "cell": "+66812345678",
    "memberId": "CK-0001",
    "customPoints": 0,
    "totalSpent": 0,
    "visitCount": 0,
    "isNoMember": false,
    "isActive": true,
    "allowedCategories": ["cat-001", "cat-002"],
    "points": [],
    "createdAt": "2025-11-04T10:30:00Z",
    "updatedAt": "2025-11-04T10:30:00Z"
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "Validation error",
  "message": "Name is required",
  "validationErrors": [
    {
      "field": "name",
      "message": "Name is required"
    }
  ]
}
```

**Error Response (500 Internal Server Error):**

```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Failed to create customer"
}
```

---

## 2. Get All Customers

Retrieve all customers in the system.

**Endpoint:** `GET /api/customers`

**Query Parameters:**

| Parameter   | Type    | Description                          |
| ----------- | ------- | ------------------------------------ |
| `limit`     | number  | Max results to return (default: 100) |
| `active`    | boolean | Filter by active status (true/false) |
| `hasPoints` | boolean | Filter customers with points > 0     |
| `search`    | string  | Search by name, email, or phone      |

**Request Examples:**

```bash
# Get all customers
GET /api/customers

# Get first 50 customers
GET /api/customers?limit=50

# Get only active customers
GET /api/customers?active=true

# Get customers with points
GET /api/customers?hasPoints=true

# Search customers
GET /api/customers?search=john
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "abc123",
      "customerId": "CK-0001",
      "name": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "cell": "+66812345678",
      "customPoints": 150,
      "totalSpent": 5000,
      "visitCount": 10,
      "isActive": true,
      "createdAt": "2025-11-01T10:30:00Z",
      "updatedAt": "2025-11-04T10:30:00Z"
    }
  ],
  "count": 1,
  "total": 1
}
```

---

## 3. Get Customer by ID

Retrieve a specific customer by their Firebase document ID or customerId.

**Endpoint:** `GET /api/customers/:id`

**Path Parameters:**

- `id` - Firebase document ID OR customerId (e.g., "CK-0001")

**Request Example:**

```bash
# By document ID
GET /api/customers/abc123def456

# By customerId
GET /api/customers/CK-0001
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "abc123def456",
    "customerId": "CK-0001",
    "name": "John",
    "lastName": "Doe",
    "nickname": "Johnny",
    "email": "john@example.com",
    "cell": "+66812345678",
    "nationality": "Thai",
    "dateOfBirth": "1990-01-15",
    "memberId": "CK-0001",
    "customPoints": 150,
    "totalSpent": 5000,
    "visitCount": 10,
    "isActive": true,
    "isNoMember": false,
    "allowedCategories": [],
    "points": [
      {
        "amount": 100,
        "date": "2025-11-01T10:00:00Z",
        "reason": "Purchase cashback",
        "transactionId": "TRX-00001"
      }
    ],
    "createdAt": "2025-11-01T10:30:00Z",
    "updatedAt": "2025-11-04T10:30:00Z"
  }
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": "Customer not found",
  "message": "No customer found with ID: CK-0001"
}
```

---

## 4. Update Customer

Update an existing customer's information.

**Endpoint:** `PUT /api/customers/:id` or `PATCH /api/customers/:id`

**Path Parameters:**

- `id` - Firebase document ID OR customerId

**Request Body:** (all fields optional)

```json
{
  "name": "John",
  "lastName": "Smith",
  "nickname": "JS",
  "email": "john.smith@example.com",
  "cell": "+66898765432",
  "nationality": "American",
  "dateOfBirth": "1990-01-15",
  "isActive": true,
  "allowedCategories": ["cat-001", "cat-002"],
  "customPoints": 200
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Customer updated successfully",
  "data": {
    "id": "abc123def456",
    "customerId": "CK-0001",
    "name": "John",
    "lastName": "Smith",
    "nickname": "JS",
    "email": "john.smith@example.com",
    "cell": "+66898765432",
    "customPoints": 200,
    "updatedAt": "2025-11-04T11:00:00Z"
  }
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": "Customer not found",
  "message": "No customer found with ID: CK-9999"
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "Validation error",
  "message": "Invalid email format",
  "validationErrors": [
    {
      "field": "email",
      "message": "Email must be a valid email address"
    }
  ]
}
```

---

## 5. Delete Customer

Delete a customer account (soft delete by setting isActive = false, or hard delete).

**Endpoint:** `DELETE /api/customers/:id`

**Path Parameters:**

- `id` - Firebase document ID OR customerId

**Query Parameters:**

- `hard` - Set to "true" for permanent deletion (default: false)

**Request Examples:**

```bash
# Soft delete (set isActive = false)
DELETE /api/customers/CK-0001

# Hard delete (permanent)
DELETE /api/customers/CK-0001?hard=true
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Customer deleted successfully",
  "data": {
    "id": "abc123def456",
    "customerId": "CK-0001",
    "deleted": true,
    "deletedAt": "2025-11-04T12:00:00Z"
  }
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": "Customer not found",
  "message": "No customer found with ID: CK-9999"
}
```

---

## 6. Add Points to Customer

Add or deduct points from a customer account.

**Endpoint:** `POST /api/customers/:id/points`

**Path Parameters:**

- `id` - Firebase document ID OR customerId

**Request Body:**

```json
{
  "amount": 100,
  "reason": "Purchase cashback",
  "transactionId": "TRX-00001",
  "source": "admin"
}
```

**For deduction (negative amount):**

```json
{
  "amount": -50,
  "reason": "Points redemption",
  "transactionId": "TRX-00002",
  "source": "kiosk"
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Points added successfully",
  "data": {
    "customerId": "CK-0001",
    "previousPoints": 100,
    "pointsAdded": 100,
    "newPoints": 200,
    "transaction": {
      "amount": 100,
      "reason": "Purchase cashback",
      "transactionId": "TRX-00001",
      "date": "2025-11-04T12:00:00Z"
    }
  }
}
```

---

## 7. Get Customer Points History

Retrieve a customer's points transaction history.

**Endpoint:** `GET /api/customers/:id/points`

**Path Parameters:**

- `id` - Firebase document ID OR customerId

**Query Parameters:**

- `limit` - Max results (default: 50)
- `offset` - Pagination offset

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "customerId": "CK-0001",
    "currentPoints": 200,
    "totalEarned": 300,
    "totalUsed": 100,
    "history": [
      {
        "amount": 100,
        "date": "2025-11-04T12:00:00Z",
        "reason": "Purchase cashback",
        "transactionId": "TRX-00001",
        "source": "kiosk"
      },
      {
        "amount": -50,
        "date": "2025-11-03T15:00:00Z",
        "reason": "Points redemption",
        "transactionId": "TRX-00002",
        "source": "kiosk"
      }
    ],
    "count": 2
  }
}
```

---

## 8. Get Categories List

**⚠️ IMPORTANT:** POS needs this endpoint to populate the category selection form when creating/editing customers.

Get all available categories in the kiosk system.

**Endpoint:** `GET /api/categories`

**Query Parameters:**

| Parameter | Type    | Description                           |
| --------- | ------- | ------------------------------------- |
| `active`  | boolean | Filter only active categories (true)  |

**Request Example:**

```bash
# Get all categories
GET /api/categories

# Get only active categories
GET /api/categories?active=true
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "cat-001",
      "categoryId": "CAT-001",
      "name": "Indoor Flower",
      "description": "Premium indoor grown cannabis",
      "isActive": true,
      "order": 1
    },
    {
      "id": "cat-002",
      "categoryId": "CAT-002",
      "name": "Outdoor Flower",
      "description": "High quality outdoor grown",
      "isActive": true,
      "order": 2
    },
    {
      "id": "cat-003",
      "categoryId": "CAT-003",
      "name": "Pre-Rolls",
      "description": "Ready to smoke joints",
      "isActive": true,
      "order": 3
    }
  ],
  "count": 3
}
```

**Error Response (500 Internal Server Error):**

```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Failed to fetch categories"
}
```

**How POS Uses This:**

1. **On Customer Form Load** → Fetch categories list
2. **Display Checkboxes** → Show each category with name
3. **On Submit** → Send selected category IDs in `allowedCategories` array
4. **Empty Array** → Customer sees ALL categories on kiosk
5. **Specific IDs** → Customer only sees those categories on kiosk

---

## 9. Search Customers

Advanced search for customers.

**Endpoint:** `GET /api/customers/search`

**Query Parameters:**

| Parameter     | Type    | Description                                   |
| ------------- | ------- | --------------------------------------------- |
| `q`           | string  | Search query (name, email, phone, customerId) |
| `nationality` | string  | Filter by nationality                         |
| `minPoints`   | number  | Minimum points balance                        |
| `maxPoints`   | number  | Maximum points balance                        |
| `minSpent`    | number  | Minimum total spent                           |
| `active`      | boolean | Filter by active status                       |
| `limit`       | number  | Results limit (default: 50)                   |

**Request Example:**

```bash
GET /api/customers/search?q=john&minPoints=100&active=true
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "abc123",
      "customerId": "CK-0001",
      "name": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "customPoints": 150,
      "totalSpent": 5000,
      "isActive": true
    }
  ],
  "count": 1,
  "query": {
    "q": "john",
    "minPoints": 100,
    "active": true
  }
}
```

---

## POS Implementation

### Create API Route: `app/api/customers/route.js`

```javascript
import { NextResponse } from "next/server";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const CUSTOMERS_COLLECTION = "customers";

/**
 * GET /api/customers
 * Get all customers
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get("limit")) || 100;
    const activeOnly = searchParams.get("active") === "true";
    const hasPoints = searchParams.get("hasPoints") === "true";
    const searchQuery = searchParams.get("search") || "";

    let q = query(
      collection(db, CUSTOMERS_COLLECTION),
      orderBy("updatedAt", "desc"),
      limit(limitParam)
    );

    // Apply filters
    if (activeOnly) {
      q = query(q, where("isActive", "==", true));
    }

    const querySnapshot = await getDocs(q);
    let customers = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()?.toISOString(),
      updatedAt: doc.data().updatedAt?.toDate()?.toISOString(),
    }));

    // Apply points filter
    if (hasPoints) {
      customers = customers.filter((c) => c.customPoints > 0);
    }

    // Apply search filter
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      customers = customers.filter(
        (c) =>
          c.name?.toLowerCase().includes(search) ||
          c.lastName?.toLowerCase().includes(search) ||
          c.email?.toLowerCase().includes(search) ||
          c.cell?.toLowerCase().includes(search) ||
          c.customerId?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      success: true,
      data: customers,
      count: customers.length,
      total: customers.length,
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
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

/**
 * POST /api/customers
 * Create new customer
 */
export async function POST(request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          message: "Name is required",
          validationErrors: [{ field: "name", message: "Name is required" }],
        },
        { status: 400 }
      );
    }

    // Generate customerId
    const customersSnapshot = await getDocs(
      collection(db, CUSTOMERS_COLLECTION)
    );
    const customerCount = customersSnapshot.size + 1;
    const customerId = `CK-${customerCount.toString().padStart(4, "0")}`;

    // Create customer document
    const customerData = {
      customerId: customerId,
      name: body.name,
      lastName: body.lastName || "",
      nickname: body.nickname || "",
      nationality: body.nationality || "",
      dateOfBirth: body.dateOfBirth || "",
      email: body.email || "",
      cell: body.cell || "",
      memberId: body.memberId || customerId,
      customPoints: body.customPoints || 0,
      points: [],
      totalSpent: 0,
      visitCount: 0,
      isNoMember: body.isNoMember || false,
      isActive: body.isActive !== false,
      allowedCategories: body.allowedCategories || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(
      collection(db, CUSTOMERS_COLLECTION),
      customerData
    );

    console.log("✅ Customer created:", {
      id: docRef.id,
      customerId: customerId,
      name: body.name,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Customer created successfully",
        data: {
          id: docRef.id,
          ...customerData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating customer:", error);
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
```

### Create API Route: `app/api/customers/[id]/route.js`

```javascript
import { NextResponse } from "next/server";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const CUSTOMERS_COLLECTION = "customers";

/**
 * GET /api/customers/[id]
 * Get customer by ID or customerId
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;

    let customerDoc;

    // Try to get by document ID first
    try {
      const docRef = doc(db, CUSTOMERS_COLLECTION, id);
      customerDoc = await getDoc(docRef);
    } catch (e) {
      // If fails, try to search by customerId
      const q = query(
        collection(db, CUSTOMERS_COLLECTION),
        where("customerId", "==", id)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        customerDoc = querySnapshot.docs[0];
      }
    }

    if (!customerDoc || !customerDoc.exists()) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer not found",
          message: `No customer found with ID: ${id}`,
        },
        { status: 404 }
      );
    }

    const customerData = {
      id: customerDoc.id,
      ...customerDoc.data(),
      createdAt: customerDoc.data().createdAt?.toDate()?.toISOString(),
      updatedAt: customerDoc.data().updatedAt?.toDate()?.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: customerData,
    });
  } catch (error) {
    console.error("Error fetching customer:", error);
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

/**
 * PUT/PATCH /api/customers/[id]
 * Update customer
 */
export async function PUT(request, { params }) {
  return PATCH(request, { params });
}

export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    // Find customer document
    let customerRef;
    try {
      customerRef = doc(db, CUSTOMERS_COLLECTION, id);
      const customerDoc = await getDoc(customerRef);
      if (!customerDoc.exists()) throw new Error("Not found by doc ID");
    } catch (e) {
      // Try by customerId
      const q = query(
        collection(db, CUSTOMERS_COLLECTION),
        where("customerId", "==", id)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return NextResponse.json(
          {
            success: false,
            error: "Customer not found",
            message: `No customer found with ID: ${id}`,
          },
          { status: 404 }
        );
      }

      customerRef = doc(db, CUSTOMERS_COLLECTION, querySnapshot.docs[0].id);
    }

    // Prepare update data (exclude system fields)
    const updateData = {
      ...body,
      updatedAt: serverTimestamp(),
    };

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.customerId;
    delete updateData.createdAt;
    delete updateData.totalSpent;
    delete updateData.visitCount;
    delete updateData.points;

    await updateDoc(customerRef, updateData);

    console.log("✅ Customer updated:", id);

    return NextResponse.json({
      success: true,
      message: "Customer updated successfully",
      data: {
        id: customerRef.id,
        ...updateData,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error updating customer:", error);
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

/**
 * DELETE /api/customers/[id]
 * Delete customer
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get("hard") === "true";

    // Find customer document
    let customerRef;
    let customerData;

    try {
      customerRef = doc(db, CUSTOMERS_COLLECTION, id);
      const customerDoc = await getDoc(customerRef);
      if (!customerDoc.exists()) throw new Error("Not found by doc ID");
      customerData = customerDoc.data();
    } catch (e) {
      // Try by customerId
      const q = query(
        collection(db, CUSTOMERS_COLLECTION),
        where("customerId", "==", id)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return NextResponse.json(
          {
            success: false,
            error: "Customer not found",
            message: `No customer found with ID: ${id}`,
          },
          { status: 404 }
        );
      }

      customerRef = doc(db, CUSTOMERS_COLLECTION, querySnapshot.docs[0].id);
      customerData = querySnapshot.docs[0].data();
    }

    if (hardDelete) {
      // Permanent deletion
      await deleteDoc(customerRef);
      console.log("🗑️ Customer permanently deleted:", id);
    } else {
      // Soft delete
      await updateDoc(customerRef, {
        isActive: false,
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log("✅ Customer soft deleted:", id);
    }

    return NextResponse.json({
      success: true,
      message: "Customer deleted successfully",
      data: {
        id: customerRef.id,
        customerId: customerData.customerId,
        deleted: true,
        deletedAt: new Date().toISOString(),
        hardDelete: hardDelete,
      },
    });
  } catch (error) {
    console.error("Error deleting customer:", error);
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
```

---

## Testing

### Test Get Categories

```bash
curl http://localhost:3000/api/categories
```

### Test Customer Creation

```bash
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "cell": "+66812345678",
    "nationality": "Thai",
    "customPoints": 0,
    "allowedCategories": ["cat-001", "cat-002"]
  }'
```

### Test Get All Customers

```bash
curl http://localhost:3000/api/customers
```

### Test Get Customer by ID

```bash
curl http://localhost:3000/api/customers/CK-0001
```

### Test Update Customer

```bash
curl -X PUT http://localhost:3000/api/customers/CK-0001 \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.updated@example.com",
    "customPoints": 200,
    "allowedCategories": ["cat-001", "cat-003"]
  }'
```

### Test Delete Customer

```bash
# Soft delete
curl -X DELETE http://localhost:3000/api/customers/CK-0001

# Hard delete
curl -X DELETE http://localhost:3000/api/customers/CK-0001?hard=true
```

---

## Kiosk Integration

The kiosk automatically reads customer data from Firebase in real-time.

**Customer Scanner Flow:**

1. Customer scans QR code/barcode on kiosk
2. Kiosk reads `customerId` from code
3. Kiosk queries Firebase `customers` collection
4. Customer data displayed instantly
5. Any changes from POS sync automatically

**No additional kiosk code needed** - Firebase handles real-time sync!

---

## Error Codes

| Code | Description                    |
| ---- | ------------------------------ |
| 200  | Success                        |
| 201  | Created                        |
| 400  | Bad Request (validation error) |
| 401  | Unauthorized                   |
| 404  | Not Found                      |
| 500  | Internal Server Error          |

---

## Best Practices

### 1. Customer ID Generation

- Use sequential numbering: CK-0001, CK-0002, etc.
- Never reuse deleted customer IDs
- Store in `customerId` field

### 2. Points Management

- Always use the points history array
- Record reason and transaction ID for each change
- Validate points before deduction

### 3. Data Validation

- Validate email format
- Validate phone number format
- Require name field
- Sanitize input data

### 4. Security

- Implement authentication for POS API
- Use HTTPS in production
- Validate user permissions
- Log all customer data changes

### 5. Real-time Sync

- Firebase automatically syncs changes
- No polling needed
- Changes appear on kiosk instantly
- Test sync with POS and kiosk simultaneously

---

## Admin Panel Considerations

When creating the customer form in POS admin panel, include these fields:

### Required Fields

- ✅ Name (first name)

### Recommended Fields

- Last Name
- Email
- Phone Number
- Nationality

### Optional Fields

- Nickname
- Date of Birth
- Member ID (auto-filled if empty)
- Initial Points Balance
- Category Restrictions

### System Fields (Auto-managed)

- Customer ID (auto-generated)
- Total Spent (calculated from transactions)
- Visit Count (calculated from orders)
- Created Date
- Updated Date

---

## Changelog

### Version 1.1.0 (2025-11-04)

- **NEW:** Added GET /api/categories endpoint for POS form
- **FIXED:** Added `allowedCategories` examples in all requests
- Category permissions now clearly documented

### Version 1.0.0 (2025-11-04)

- Initial API documentation
- CRUD operations for customers
- Real-time Firebase sync with kiosk
- Points management endpoints
- Search and filter capabilities
