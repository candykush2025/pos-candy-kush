# Finance API Quick Start Guide

## Testing the Finance API Locally

### 1. Start the Development Server

```bash
npm run dev
```

Wait for the server to start. You should see:

```
✓ Ready in 1619ms
Local: http://localhost:3000
```

### 2. Test Authentication

Open a new terminal and run:

```bash
# PowerShell
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/mobile?action=login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"admin@candykush.com","password":"admin123"}' `
  -UseBasicParsing

$json = $response.Content | ConvertFrom-Json
$token = $json.token
Write-Host "Token: $token"
```

Save the token for subsequent requests.

### 3. Test Create Purchase

```bash
# PowerShell
$purchaseData = @{
  supplier_name = "Test Supplier"
  purchase_date = "2025-12-20"
  due_date = "2025-12-27"
  items = @(
    @{
      product_id = "test_001"
      product_name = "Test Product"
      quantity = 10
      price = 5.0
      total = 50.0
    }
  )
  total = 50.0
  reminder_type = "days_before"
  reminder_value = "3"
  reminder_time = "09:00"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/mobile?action=create-purchase" `
  -Method POST `
  -Headers @{Authorization="Bearer $token"} `
  -ContentType "application/json" `
  -Body $purchaseData `
  -UseBasicParsing | Select-Object -ExpandProperty Content
```

### 4. Test Get All Purchases

```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/api/mobile?action=get-purchases" `
  -Method GET `
  -Headers @{Authorization="Bearer $token"} `
  -UseBasicParsing | Select-Object -ExpandProperty Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### 5. Test Create Expense

```bash
# PowerShell
$expenseData = @{
  description = "Office supplies"
  amount = 45.5
  date = "2025-12-20"
  time = "14:30"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/mobile?action=create-expense" `
  -Method POST `
  -Headers @{Authorization="Bearer $token"} `
  -ContentType "application/json" `
  -Body $expenseData `
  -UseBasicParsing | Select-Object -ExpandProperty Content
```

### 6. Test Get All Expenses

```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/api/mobile?action=get-expenses" `
  -Method GET `
  -Headers @{Authorization="Bearer $token"} `
  -UseBasicParsing | Select-Object -ExpandProperty Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### 7. Test Get Expenses with Date Filter

```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/api/mobile?action=get-expenses&start_date=2025-12-01&end_date=2025-12-31" `
  -Method GET `
  -Headers @{Authorization="Bearer $token"} `
  -UseBasicParsing | Select-Object -ExpandProperty Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### 8. Test Complete Purchase

First, get a purchase ID from step 4, then:

```bash
# PowerShell
$completeData = @{
  id = "YOUR_PURCHASE_ID_HERE"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/mobile?action=complete-purchase" `
  -Method POST `
  -Headers @{Authorization="Bearer $token"} `
  -ContentType "application/json" `
  -Body $completeData `
  -UseBasicParsing | Select-Object -ExpandProperty Content
```

### 9. Test Delete with DELETE Method

```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/api/mobile?action=delete-purchase&id=YOUR_PURCHASE_ID_HERE" `
  -Method DELETE `
  -Headers @{Authorization="Bearer $token"} `
  -UseBasicParsing | Select-Object -ExpandProperty Content
```

---

## Testing on Production (Vercel)

Replace `http://localhost:3000` with `https://pos-candy-kush.vercel.app` in all commands above.

Example:

```bash
# PowerShell
$response = Invoke-WebRequest -Uri "https://pos-candy-kush.vercel.app/api/mobile?action=login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"admin@candykush.com","password":"admin123"}' `
  -UseBasicParsing

$json = $response.Content | ConvertFrom-Json
$token = $json.token
Write-Host "Token: $token"
```

---

## Running Automated Tests

```bash
npm test -- __tests__/api/finance-api.test.js
```

This will run all 30+ test cases covering:

- Authentication
- Purchases CRUD
- Expenses CRUD
- Invoice deletion
- Error handling
- Validation

---

## Using Postman

### 1. Create a New Collection

- Name: Finance API

### 2. Add Environment Variables

- `base_url`: http://localhost:3000 (or https://pos-candy-kush.vercel.app)
- `token`: (will be set after login)

### 3. Import Requests

**Login:**

```
POST {{base_url}}/api/mobile?action=login
Body (JSON):
{
  "email": "admin@candykush.com",
  "password": "admin123"
}
```

**Get Purchases:**

```
GET {{base_url}}/api/mobile?action=get-purchases
Headers:
Authorization: Bearer {{token}}
```

**Create Purchase:**

```
POST {{base_url}}/api/mobile?action=create-purchase
Headers:
Authorization: Bearer {{token}}
Content-Type: application/json
Body (JSON):
{
  "supplier_name": "Test Supplier",
  "purchase_date": "2025-12-20",
  "due_date": "2025-12-27",
  "items": [
    {
      "product_id": "test_001",
      "product_name": "Test Product",
      "quantity": 10,
      "price": 5.0,
      "total": 50.0
    }
  ],
  "total": 50.0,
  "reminder_type": "days_before",
  "reminder_value": "3",
  "reminder_time": "09:00"
}
```

---

## Quick Validation Checklist

After starting the server, verify:

- [ ] Login returns JWT token
- [ ] Get purchases works with token
- [ ] Create purchase returns new purchase with ID
- [ ] Get single purchase returns correct data
- [ ] Complete purchase changes status to "completed"
- [ ] Create expense returns new expense with ID
- [ ] Get expenses shows total and count
- [ ] Date filtering for expenses works
- [ ] Delete operations return success message
- [ ] All endpoints require authentication (except login)

---

## Common Issues

### Issue: "Unable to connect to the remote server"

**Solution:** Make sure the dev server is running (`npm run dev`)

### Issue: "Unauthorized" error

**Solution:** Check that your JWT token is valid and not expired. Re-login if needed.

### Issue: "Purchase not found"

**Solution:** Make sure you're using a valid purchase ID from the get-purchases response.

### Issue: CORS error

**Solution:** The API already has CORS configured. If you still see errors, check that you're using the correct headers.

---

## Expected Response Format

### Success Response:

```json
{
  "success": true,
  "action": "create-purchase",
  "data": {
    "purchase": {
      "id": "abc123",
      "supplier_name": "Test Supplier",
      ...
    }
  }
}
```

### Error Response:

```json
{
  "success": false,
  "error": "Supplier name is required"
}
```

---

## Next Steps

1. ✅ Test all endpoints locally
2. ✅ Deploy to Vercel
3. ✅ Test on production
4. ✅ Integrate with Android app
5. ✅ Add to your mobile app navigation

---

For complete API documentation, see: **FINANCE_API_DOCUMENTATION.md**

For implementation details, see: **FINANCE_API_IMPLEMENTATION_SUMMARY.md**
