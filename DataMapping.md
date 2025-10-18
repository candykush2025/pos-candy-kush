# Loyverse Receipt Data Analysis

**Generated**: 2025-10-18T09:35:48.311Z
**Total Receipts Analyzed**: 5

## Revenue Analysis

### Sum of all total_money values:
- **Raw sum**: 3210
- **Divided by 100**: 32.1

### How to determine correct calculation:
1. Look at Receipt 1 in Loyverse dashboard
2. Compare the display amount to the total_money value below
3. If Loyverse shows ฿550 → Already in Baht (no division needed)
4. If Loyverse shows ฿5.5 → Stored in satang (divide by 100)

### Example from Receipt 1:
- **total_money**: 550
- **As Baht (no conversion)**: ฿550
- **As Satang → Baht (÷100)**: ฿5.5

## 🔍 VERIFICATION STEPS:

1. **Open Loyverse Dashboard** in browser
2. **Go to Receipts** section
3. **Find Receipt**: 2-7340
4. **Check the total amount** displayed
5. **Compare** to total_money value: 550
6. **If they match** → Use value directly (no division)
7. **If Loyverse shows 1/100th** → Divide by 100 in code

---

# Detailed Receipt Data


## Receipt 1: 2-7340

### Basic Info
- **Receipt Number**: 2-7340
- **Receipt Type**: SALE
- **Date**: 2025-10-18T07:48:00.000Z
- **Created**: 2025-10-18T07:48:05.000Z

### Financial Data (CRITICAL FOR CALCULATIONS)
```javascript
totalMoney: 550
totalTax: 0
totalDiscount: 0
tip: 0
surcharge: 0
```

**CALCULATION CHECK:**
- If total_money = 550
- Then in Baht = 5.5 (if stored in satang)
- Or in Baht = 550 (if already in Baht)

### Line Items (1 items)

#### Item 1: Super Boof
```javascript
item_name: "Super Boof"
quantity: 1
price: 550
total_money: 550
total_discount: 0
cost: 0
sku: "10145"
```
**Item Calculation**: 1 × 550 = 550
**In Baht (if satang)**: 5.5

### Payments (1 payment methods)

#### Payment 1
```javascript
payment_type_id: "e68a8970-7792-49f7-a0f3-f72c61371d46"
paid_money: undefined
type: "CASH"
paid_at: "2025-10-18T07:48:00.000Z"
```
**In Baht (if satang)**: NaN

### Complete Receipt JSON
```json
{
  "receipt_number": "2-7340",
  "note": null,
  "receipt_type": "SALE",
  "refund_for": null,
  "order": null,
  "created_at": "2025-10-18T07:48:05.000Z",
  "updated_at": "2025-10-18T07:48:05.000Z",
  "source": "point of sale",
  "receipt_date": "2025-10-18T07:48:00.000Z",
  "cancelled_at": null,
  "total_money": 550,
  "total_tax": 0,
  "points_earned": 0,
  "points_deducted": 0,
  "points_balance": 0,
  "customer_id": null,
  "total_discount": 0,
  "employee_id": "6d0a6d80-5a6b-4d91-90d9-235b1734848d",
  "store_id": "6b365a0c-a2a8-4774-8904-06cedede22e6",
  "pos_device_id": "e7ed9593-1bb8-400a-bf76-016fff1311cb",
  "dining_option": "Dine in",
  "total_discounts": [],
  "total_taxes": [],
  "tip": 0,
  "surcharge": 0,
  "line_items": [
    {
      "id": "9553152a-9db0-4432-f6a3-2ab7f1d6516c",
      "item_id": "598def8e-7b0f-470a-84ac-28e9549c0a99",
      "variant_id": "4309a01e-b5b3-44de-b336-bf650cbf179a",
      "item_name": "Super Boof",
      "variant_name": null,
      "sku": "10145",
      "quantity": 1,
      "price": 550,
      "gross_total_money": 550,
      "total_money": 550,
      "cost": 0,
      "cost_total": 0,
      "line_note": null,
      "line_taxes": [],
      "total_discount": 0,
      "line_discounts": [],
      "line_modifiers": []
    }
  ],
  "payments": [
    {
      "payment_type_id": "e68a8970-7792-49f7-a0f3-f72c61371d46",
      "name": "Cash",
      "type": "CASH",
      "money_amount": 550,
      "paid_at": "2025-10-18T07:48:00.000Z",
      "payment_details": null
    }
  ]
}
```

---


## Receipt 2: 2-7339

### Basic Info
- **Receipt Number**: 2-7339
- **Receipt Type**: SALE
- **Date**: 2025-10-18T07:46:59.000Z
- **Created**: 2025-10-18T07:47:31.000Z

### Financial Data (CRITICAL FOR CALCULATIONS)
```javascript
totalMoney: 380
totalTax: 0
totalDiscount: 0
tip: 0
surcharge: 0
```

**CALCULATION CHECK:**
- If total_money = 380
- Then in Baht = 3.8 (if stored in satang)
- Or in Baht = 380 (if already in Baht)

### Line Items (1 items)

#### Item 1: Super Lemon Haze
```javascript
item_name: "Super Lemon Haze"
quantity: 1
price: 380
total_money: 380
total_discount: 0
cost: 60
sku: "10032"
```
**Item Calculation**: 1 × 380 = 380
**In Baht (if satang)**: 3.8

### Payments (1 payment methods)

#### Payment 1
```javascript
payment_type_id: "e68a8970-7792-49f7-a0f3-f72c61371d46"
paid_money: undefined
type: "CASH"
paid_at: "2025-10-18T07:46:59.000Z"
```
**In Baht (if satang)**: NaN

### Complete Receipt JSON
```json
{
  "receipt_number": "2-7339",
  "note": null,
  "receipt_type": "SALE",
  "refund_for": null,
  "order": null,
  "created_at": "2025-10-18T07:47:31.000Z",
  "updated_at": "2025-10-18T07:47:31.000Z",
  "source": "point of sale",
  "receipt_date": "2025-10-18T07:46:59.000Z",
  "cancelled_at": null,
  "total_money": 380,
  "total_tax": 0,
  "points_earned": 0,
  "points_deducted": 0,
  "points_balance": 0,
  "customer_id": null,
  "total_discount": 0,
  "employee_id": "6d0a6d80-5a6b-4d91-90d9-235b1734848d",
  "store_id": "6b365a0c-a2a8-4774-8904-06cedede22e6",
  "pos_device_id": "e7ed9593-1bb8-400a-bf76-016fff1311cb",
  "dining_option": "Dine in",
  "total_discounts": [],
  "total_taxes": [],
  "tip": 0,
  "surcharge": 0,
  "line_items": [
    {
      "id": "9553152a-9db0-4432-f6a3-2ab7f1d5516c",
      "item_id": "e03995bf-b98b-4d51-9408-7eb6223dc3cc",
      "variant_id": "0e4a8a25-85a9-4c61-a66b-6569b0555337",
      "item_name": "Super Lemon Haze",
      "variant_name": null,
      "sku": "10032",
      "quantity": 1,
      "price": 380,
      "gross_total_money": 380,
      "total_money": 380,
      "cost": 60,
      "cost_total": 60,
      "line_note": null,
      "line_taxes": [],
      "total_discount": 0,
      "line_discounts": [],
      "line_modifiers": []
    }
  ],
  "payments": [
    {
      "payment_type_id": "e68a8970-7792-49f7-a0f3-f72c61371d46",
      "name": "Cash",
      "type": "CASH",
      "money_amount": 380,
      "paid_at": "2025-10-18T07:46:59.000Z",
      "payment_details": null
    }
  ]
}
```

---


## Receipt 3: 2-7338

### Basic Info
- **Receipt Number**: 2-7338
- **Receipt Type**: SALE
- **Date**: 2025-10-18T07:15:57.000Z
- **Created**: 2025-10-18T07:18:44.000Z

### Financial Data (CRITICAL FOR CALCULATIONS)
```javascript
totalMoney: 550
totalTax: 0
totalDiscount: 0
tip: 0
surcharge: 0
```

**CALCULATION CHECK:**
- If total_money = 550
- Then in Baht = 5.5 (if stored in satang)
- Or in Baht = 550 (if already in Baht)

### Line Items (1 items)

#### Item 1: Super Boof
```javascript
item_name: "Super Boof"
quantity: 1
price: 550
total_money: 550
total_discount: 0
cost: 0
sku: "10145"
```
**Item Calculation**: 1 × 550 = 550
**In Baht (if satang)**: 5.5

### Payments (1 payment methods)

#### Payment 1
```javascript
payment_type_id: "e68a8970-7792-49f7-a0f3-f72c61371d46"
paid_money: undefined
type: "CASH"
paid_at: "2025-10-18T07:15:57.000Z"
```
**In Baht (if satang)**: NaN

### Complete Receipt JSON
```json
{
  "receipt_number": "2-7338",
  "note": null,
  "receipt_type": "SALE",
  "refund_for": null,
  "order": null,
  "created_at": "2025-10-18T07:18:44.000Z",
  "updated_at": "2025-10-18T07:18:44.000Z",
  "source": "point of sale",
  "receipt_date": "2025-10-18T07:15:57.000Z",
  "cancelled_at": null,
  "total_money": 550,
  "total_tax": 0,
  "points_earned": 0,
  "points_deducted": 0,
  "points_balance": 0,
  "customer_id": null,
  "total_discount": 0,
  "employee_id": "5ffe6714-87d3-4256-8248-891dae1121ad",
  "store_id": "6b365a0c-a2a8-4774-8904-06cedede22e6",
  "pos_device_id": "e7ed9593-1bb8-400a-bf76-016fff1311cb",
  "dining_option": "Dine in",
  "total_discounts": [],
  "total_taxes": [],
  "tip": 0,
  "surcharge": 0,
  "line_items": [
    {
      "id": "9553152a-9db0-4432-f6a3-2ab7f1d4516c",
      "item_id": "598def8e-7b0f-470a-84ac-28e9549c0a99",
      "variant_id": "4309a01e-b5b3-44de-b336-bf650cbf179a",
      "item_name": "Super Boof",
      "variant_name": null,
      "sku": "10145",
      "quantity": 1,
      "price": 550,
      "gross_total_money": 550,
      "total_money": 550,
      "cost": 0,
      "cost_total": 0,
      "line_note": null,
      "line_taxes": [],
      "total_discount": 0,
      "line_discounts": [],
      "line_modifiers": []
    }
  ],
  "payments": [
    {
      "payment_type_id": "e68a8970-7792-49f7-a0f3-f72c61371d46",
      "name": "Cash",
      "type": "CASH",
      "money_amount": 550,
      "paid_at": "2025-10-18T07:15:57.000Z",
      "payment_details": null
    }
  ]
}
```

---


## Receipt 4: 2-7337

### Basic Info
- **Receipt Number**: 2-7337
- **Receipt Type**: SALE
- **Date**: 2025-10-18T05:44:37.000Z
- **Created**: 2025-10-18T05:44:42.000Z

### Financial Data (CRITICAL FOR CALCULATIONS)
```javascript
totalMoney: 250
totalTax: 0
totalDiscount: 0
tip: 0
surcharge: 0
```

**CALCULATION CHECK:**
- If total_money = 250
- Then in Baht = 2.5 (if stored in satang)
- Or in Baht = 250 (if already in Baht)

### Line Items (1 items)

#### Item 1: Sativa Normal
```javascript
item_name: "Sativa Normal"
quantity: 1
price: 250
total_money: 250
total_discount: 0
cost: 0
sku: "10007"
```
**Item Calculation**: 1 × 250 = 250
**In Baht (if satang)**: 2.5

### Payments (1 payment methods)

#### Payment 1
```javascript
payment_type_id: "e68a8970-7792-49f7-a0f3-f72c61371d46"
paid_money: undefined
type: "CASH"
paid_at: "2025-10-18T05:44:37.000Z"
```
**In Baht (if satang)**: NaN

### Complete Receipt JSON
```json
{
  "receipt_number": "2-7337",
  "note": null,
  "receipt_type": "SALE",
  "refund_for": null,
  "order": null,
  "created_at": "2025-10-18T05:44:42.000Z",
  "updated_at": "2025-10-18T05:44:42.000Z",
  "source": "point of sale",
  "receipt_date": "2025-10-18T05:44:37.000Z",
  "cancelled_at": null,
  "total_money": 250,
  "total_tax": 0,
  "points_earned": 0,
  "points_deducted": 0,
  "points_balance": 0,
  "customer_id": null,
  "total_discount": 0,
  "employee_id": "5ffe6714-87d3-4256-8248-891dae1121ad",
  "store_id": "6b365a0c-a2a8-4774-8904-06cedede22e6",
  "pos_device_id": "e7ed9593-1bb8-400a-bf76-016fff1311cb",
  "dining_option": "Dine in",
  "total_discounts": [],
  "total_taxes": [],
  "tip": 0,
  "surcharge": 0,
  "line_items": [
    {
      "id": "9553152a-9db0-4432-f6a3-2ab7f1d3516c",
      "item_id": "4b8cd1cb-9e4b-4de6-b423-6ff1546cd76f",
      "variant_id": "96b310a6-ddcb-49c1-a5c0-2deebb3fd89c",
      "item_name": "Sativa Normal",
      "variant_name": null,
      "sku": "10007",
      "quantity": 1,
      "price": 250,
      "gross_total_money": 250,
      "total_money": 250,
      "cost": 0,
      "cost_total": 0,
      "line_note": null,
      "line_taxes": [],
      "total_discount": 0,
      "line_discounts": [],
      "line_modifiers": []
    }
  ],
  "payments": [
    {
      "payment_type_id": "e68a8970-7792-49f7-a0f3-f72c61371d46",
      "name": "Cash",
      "type": "CASH",
      "money_amount": 250,
      "paid_at": "2025-10-18T05:44:37.000Z",
      "payment_details": null
    }
  ]
}
```

---


## Receipt 5: 2-7336

### Basic Info
- **Receipt Number**: 2-7336
- **Receipt Type**: SALE
- **Date**: 2025-10-17T20:23:29.000Z
- **Created**: 2025-10-17T22:28:10.000Z

### Financial Data (CRITICAL FOR CALCULATIONS)
```javascript
totalMoney: 1480
totalTax: 0
totalDiscount: 0
tip: 0
surcharge: 0
```

**CALCULATION CHECK:**
- If total_money = 1480
- Then in Baht = 14.8 (if stored in satang)
- Or in Baht = 1480 (if already in Baht)

### Line Items (2 items)

#### Item 1: Juicy wine
```javascript
item_name: "Juicy wine"
quantity: 1
price: 580
total_money: 580
total_discount: 0
cost: 150
sku: "10037"
```
**Item Calculation**: 1 × 580 = 580
**In Baht (if satang)**: 5.8

#### Item 2: Buddha
```javascript
item_name: "Buddha"
quantity: 2
price: 450
total_money: 900
total_discount: 0
cost: 0
sku: "10156"
```
**Item Calculation**: 2 × 450 = 900
**In Baht (if satang)**: 9

### Payments (1 payment methods)

#### Payment 1
```javascript
payment_type_id: "e68a8970-7792-49f7-a0f3-f72c61371d46"
paid_money: undefined
type: "CASH"
paid_at: "2025-10-17T20:23:29.000Z"
```
**In Baht (if satang)**: NaN

### Complete Receipt JSON
```json
{
  "receipt_number": "2-7336",
  "note": null,
  "receipt_type": "SALE",
  "refund_for": null,
  "order": null,
  "created_at": "2025-10-17T22:28:10.000Z",
  "updated_at": "2025-10-17T22:28:10.000Z",
  "source": "point of sale",
  "receipt_date": "2025-10-17T20:23:29.000Z",
  "cancelled_at": null,
  "total_money": 1480,
  "total_tax": 0,
  "points_earned": 0,
  "points_deducted": 0,
  "points_balance": 0,
  "customer_id": null,
  "total_discount": 0,
  "employee_id": "0565c051-bbc3-481d-8b42-e56fb6a5e777",
  "store_id": "6b365a0c-a2a8-4774-8904-06cedede22e6",
  "pos_device_id": "e7ed9593-1bb8-400a-bf76-016fff1311cb",
  "dining_option": "Dine in",
  "total_discounts": [],
  "total_taxes": [],
  "tip": 0,
  "surcharge": 0,
  "line_items": [
    {
      "id": "9553152a-9db0-4432-f6a3-2ab7f1d2516c",
      "item_id": "544e2023-f8ca-4f0e-8a6d-b5fdd61763a9",
      "variant_id": "1e4a9f12-3c64-4be0-9c58-e33ab77f1c88",
      "item_name": "Juicy wine",
      "variant_name": null,
      "sku": "10037",
      "quantity": 1,
      "price": 580,
      "gross_total_money": 580,
      "total_money": 580,
      "cost": 150,
      "cost_total": 150,
      "line_note": null,
      "line_taxes": [],
      "total_discount": 0,
      "line_discounts": [],
      "line_modifiers": []
    },
    {
      "id": "9553152a-9db0-4432-f6a3-2ab7f1d2516d",
      "item_id": "7482af24-9c0b-4542-97cc-77a729f714a9",
      "variant_id": "b38959d0-bb38-4043-81b2-945525a77ba0",
      "item_name": "Buddha",
      "variant_name": null,
      "sku": "10156",
      "quantity": 2,
      "price": 450,
      "gross_total_money": 900,
      "total_money": 900,
      "cost": 0,
      "cost_total": 0,
      "line_note": null,
      "line_taxes": [],
      "total_discount": 0,
      "line_discounts": [],
      "line_modifiers": []
    }
  ],
  "payments": [
    {
      "payment_type_id": "e68a8970-7792-49f7-a0f3-f72c61371d46",
      "name": "Cash",
      "type": "CASH",
      "money_amount": 1480,
      "paid_at": "2025-10-17T20:23:29.000Z",
      "payment_details": null
    }
  ]
}
```

---



# Summary Table

| Receipt # | total_money | ÷100 (Baht) | Items | Payments |
|-----------|-------------|-------------|-------|----------|
| 2-7340 | 550 | 5.5 | 1 | 1 |
| 2-7339 | 380 | 3.8 | 1 | 1 |
| 2-7338 | 550 | 5.5 | 1 | 1 |
| 2-7337 | 250 | 2.5 | 1 | 1 |
| 2-7336 | 1480 | 14.8 | 2 | 1 |
