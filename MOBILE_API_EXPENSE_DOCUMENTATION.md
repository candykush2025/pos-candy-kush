# Mobile API - Expense Management Documentation

## Base URL

```
POST /api/mobile
```

## Authentication

All expense operations require JWT authentication in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

---

## 1. Approve Expense

**Action:** `approve-expense`

**Method:** POST

**Request Body:**

```json
{
  "action": "approve-expense",
  "expenseId": "string (required)",
  "approvedBy": "string (required - user ID)",
  "approvedByName": "string (optional - defaults to 'Admin')",
  "notes": "string (optional - approval notes)"
}
```

**Example Request:**

```json
{
  "action": "approve-expense",
  "expenseId": "MWRofkSZqr7OaKhHFhGc",
  "approvedBy": "user123",
  "approvedByName": "John Admin",
  "notes": "Approved for office supplies"
}
```

**Response:**

```json
{
  "success": true,
  "action": "approve-expense",
  "data": {
    "expense": {
      "id": "MWRofkSZqr7OaKhHFhGc",
      "status": "approved",
      "approvedBy": "user123",
      "approvedByName": "John Admin",
      "approvedAt": "2026-01-10T10:30:00.000Z",
      "approvalNotes": "Approved for office supplies"
    }
  },
  "message": "Expense approved successfully"
}
```

---

## 2. Deny/Reject Expense

**Action:** `deny-expense`

**Method:** POST

**Request Body:**

```json
{
  "action": "deny-expense",
  "expenseId": "string (required)",
  "deniedBy": "string (required - user ID)",
  "deniedByName": "string (optional - defaults to 'Admin')",
  "notes": "string (required - reason for denial)"
}
```

**Example Request:**

```json
{
  "action": "deny-expense",
  "expenseId": "MWRofkSZqr7OaKhHFhGc",
  "deniedBy": "user123",
  "deniedByName": "John Admin",
  "notes": "Insufficient documentation provided"
}
```

**Response:**

```json
{
  "success": true,
  "action": "deny-expense",
  "data": {
    "expense": {
      "id": "MWRofkSZqr7OaKhHFhGc",
      "status": "denied",
      "approvedBy": "user123",
      "approvedByName": "John Admin",
      "approvedAt": "2026-01-10T10:30:00.000Z",
      "approvalNotes": "Insufficient documentation provided"
    }
  },
  "message": "Expense denied successfully"
}
```

---

## 3. Edit/Update Expense

**Action:** `edit-expense`

**Method:** POST

**Request Body:**

```json
{
  "action": "edit-expense",
  "id": "string (required - expense ID)",
  "description": "string (optional)",
  "amount": "number (optional)",
  "date": "string (optional - ISO date)",
  "time": "string (optional - HH:mm format)",
  "category": "string (optional)",
  "currency": "string (optional)",
  "notes": "string (optional)"
}
```

**Example Request:**

```json
{
  "action": "edit-expense",
  "id": "MWRofkSZqr7OaKhHFhGc",
  "description": "Updated office supplies",
  "amount": 150.0,
  "category": "Office Supplies",
  "notes": "Updated amount after receipt review"
}
```

**Response:**

```json
{
  "success": true,
  "action": "edit-expense",
  "data": {
    "expense": {
      "id": "MWRofkSZqr7OaKhHFhGc",
      "description": "Updated office supplies",
      "amount": 150.0,
      "category": "Office Supplies",
      "notes": "Updated amount after receipt review",
      "updatedAt": "2026-01-10T10:30:00.000Z"
    }
  }
}
```

**Notes:**

- Only `id` is required, all other fields are optional
- Employees can only edit pending expenses
- Admins can edit expenses in any status
- Validation ensures description is not empty and amount is non-negative

---

## 4. Delete Expense

**Action:** `delete-expense`

**Method:** POST

**Request Body:**

```json
{
  "action": "delete-expense",
  "id": "string (required - expense ID)"
}
```

**Example Request:**

```json
{
  "action": "delete-expense",
  "id": "MWRofkSZqr7OaKhHFhGc"
}
```

**Response:**

```json
{
  "success": true,
  "action": "delete-expense",
  "message": "Expense deleted successfully"
}
```

**Notes:**

- Employees can only delete their own pending expenses
- Admins can delete any expense
- Approved/denied expenses require admin privileges to delete

---

## Error Responses

All operations return similar error formats:

```json
{
  "success": false,
  "error": "Error message description"
}
```

**Common Error Codes:**

- `401`: Authentication required
- `400`: Invalid request data
- `404`: Expense not found
- `403`: Insufficient permissions

---

## Permission Rules

- **Employees:** Can create, edit (pending only), and delete (own pending expenses only)
- **Admins:** Can perform all operations on any expense regardless of status

---

## Data Validation

- **expenseId/id:** Must be a valid Firestore document ID
- **amount:** Must be a positive number
- **description:** Cannot be empty when provided
- **date:** Should be in ISO format (YYYY-MM-DD)
- **time:** Should be in HH:mm format
- **currency:** Should be a valid currency code (e.g., "USD", "EUR")

---

## Additional Expense Operations

### Get Expenses

**Action:** `get-expenses`

**Method:** GET

**Query Parameters:**

- `employee_id` (optional): Filter by employee
- `status` (optional): Filter by status (pending/approved/denied)
- `start_date` (optional): ISO date
- `end_date` (optional): ISO date

### Create Expense

**Action:** `create-expense`

**Method:** POST

**Request Body:**

```json
{
  "action": "create-expense",
  "description": "string (required)",
  "amount": "number (required)",
  "category": "string (required)",
  "currency": "string (optional)",
  "date": "string (optional)",
  "time": "string (optional)",
  "notes": "string (optional)",
  "employeeId": "string (optional)"
}
```

This documentation covers all the expense management operations available in the mobile API. Make sure to include proper authentication headers and send the data as JSON in the request body.
