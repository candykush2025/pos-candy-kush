# Purchase API - Quick Reference for Mobile Developers

## 🚀 Create Purchase Endpoint

**URL:** `https://pos-candy-kush.vercel.app/api/mobile?action=create-purchase`
**Method:** `POST`
**Auth:** JWT Bearer Token Required

## 📝 Request Format

```json
{
  "supplier_name": "Supplier Name",
  "purchase_date": "2026-01-06",
  "due_date": "2026-01-15",
  "items": [
    {
      "product_id": "product_123",
      "product_name": "Product Name",
      "quantity": 10,
      "price": 50.00,
      "total": 500.00
    }
  ],
  "total": 500.00,
  "reminder_type": "days_before",
  "reminder_value": "3",
  "reminder_time": "09:00"
}
```

## ✅ Required Fields

- `supplier_name` (string)
- `purchase_date` (YYYY-MM-DD)
- `due_date` (YYYY-MM-DD)
- `items` (array, min 1 item)
- `total` (number >= 0)

## 📋 Item Structure

```json
{
  "product_id": "string",
  "product_name": "string",
  "quantity": 1,
  "price": 0.00,
  "total": 0.00
}
```

## 🔑 Authentication

1. Login first: `POST /api/mobile?action=login`
2. Get token from response
3. Use: `Authorization: Bearer YOUR_TOKEN`

## 📱 Kotlin Data Classes

```kotlin
data class PurchaseItem(
    @SerializedName("product_id") val productId: String,
    @SerializedName("product_name") val productName: String,
    val quantity: Int,
    val price: Double,
    val total: Double
)

data class CreatePurchaseRequest(
    val action: String = "create-purchase",
    @SerializedName("supplier_name") val supplierName: String,
    @SerializedName("purchase_date") val purchaseDate: String,
    @SerializedName("due_date") val dueDate: String,
    val items: List<PurchaseItem>,
    val total: Double,
    @SerializedName("reminder_type") val reminderType: String = "no_reminder",
    @SerializedName("reminder_value") val reminderValue: String = "",
    @SerializedName("reminder_time") val reminderTime: String = ""
)
```

## 🧪 Test Example

```bash
# Login
curl -X POST "https://pos-candy-kush.vercel.app/api/mobile?action=login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@candykush.com","password":"admin123"}'

# Create Purchase (use token from login)
curl -X POST "https://pos-candy-kush.vercel.app/api/mobile?action=create-purchase" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "supplier_name": "Test Supplier",
    "purchase_date": "2026-01-06",
    "due_date": "2026-01-15",
    "items": [{
      "product_id": "test_1",
      "product_name": "Test Product",
      "quantity": 1,
      "price": 100.00,
      "total": 100.00
    }],
    "total": 100.00
  }'
```

## ⚠️ Common Errors

- **400 Bad Request**: Missing required fields
- **401 Unauthorized**: Invalid/missing JWT token
- **Date Format**: Must be YYYY-MM-DD
- **Total**: Must equal sum of item totals

## 📞 Support

For full documentation, see: `PURCHASE_API_MOBILE_INTEGRATION.md`</content>
<parameter name="filePath">/Volumes/SANDISK/Candy Kush/pos-candy-kush/pos-candy-kush/PURCHASE_API_QUICK_REF.md