# Visual Guide: Customer UI Changes

## Before & After Comparison

### 1. Customer Selection Modal

#### BEFORE ❌

```
┌─────────────────────────────────────────────┐
│ [Alan] [kiosk] [Synced to Kiosk]           │ ← Confusing labels
│ ID: CK-0021                                 │
│ 📧 sugarkimkju@gmail.com                    │
│ 📱 +85266281268                             │
│ 🛒 3354 pts | 👤 0 visits                   │ ← Hardcoded points
│                                             │
│ (Can select even if expired)                │
└─────────────────────────────────────────────┘
```

#### AFTER ✅

```
┌─────────────────────────────────────────────┐
│ [Alan] [Member ✓] [Active ✓]               │ ← Clear status
│ ID: CK-0021 | Member: CK-0021              │
│ 📧 sugarkimkju@gmail.com                    │
│ 📱 +85266281268                             │
│ 🕐 Expires: 12/31/2025                      │ ← Expiry date shown
│ 🛒 0 pts | 👤 0 visits                      │ ← Real points from PointList
└─────────────────────────────────────────────┘
```

---

### 2. Expired Customer

#### BEFORE ❌

```
┌─────────────────────────────────────────────┐
│ [John] [local]                              │ ← No indication
│ ID: CK-0022                                 │
│ 📧 john@example.com                         │
│                                             │
│ Can be selected                             │ ← Problem!
└─────────────────────────────────────────────┘
```

#### AFTER ✅

```
┌─────────────────────────────────────────────┐
│ [John] [Member ✓] [Expired ✗]              │ ← Red badge
│ ID: CK-0022                                 │
│ 📧 john@example.com                         │
│ 🕐 Expires: 11/30/2024                      │ ← Past date
│                                             │
│ (Dimmed, 60% opacity)                       │ ← Visual disabled
│ (Cannot click - shows error)                │ ← Blocked
└─────────────────────────────────────────────┘
```

---

### 3. Cart Item Display

#### BEFORE ❌

```
┌─────────────────────────────────────┐
│ Test Cashback                       │
│ ฿1,000.00 → ฿900.00 [Member]        │
│                                     │ ← No cashback info
│ [- 1 +]              ฿900.00        │
└─────────────────────────────────────┘
```

#### AFTER ✅

```
┌─────────────────────────────────────┐
│ Test Cashback                       │
│ ฿1,000.00 → ฿900.00 [Member]        │
│ [+10 pts cashback]                  │ ← Cashback shown!
│ [- 1 +]              ฿900.00        │
└─────────────────────────────────────┘
```

---

## Badge Color Guide

### Customer Status Badges

#### Active Membership ✅

```
[Member ✓] [Active ✓]
  │           │
  │           └── Green badge: bg-green-50, border-green-500
  └── Blue badge: bg-blue-50, border-blue-500
```

#### Expired Membership ❌

```
[Member ✓] [Expired ✗]
  │           │
  │           └── Red badge: bg-red-50, border-red-500
  └── Blue badge: bg-blue-50, border-blue-500
```

#### Non-Member

```
(No badges shown)
```

### Cashback Badge

```
[+10 pts cashback]
└── Green badge: bg-green-50, border-green-500
```

---

## Interaction Examples

### Scenario 1: Select Active Customer

```
User clicks active customer card
    ↓
✓ Customer added to cart
✓ Toast: "Customer Alan added to cart"
✓ Cart updates with member prices
✓ Cashback calculated
```

### Scenario 2: Try to Select Expired Customer

```
User clicks expired customer card
    ↓
✗ Customer NOT added
✗ Toast: "Cannot select John - membership expired on 11/30/2024"
✗ Cart remains unchanged
```

### Scenario 3: Scan Expired Customer QR

```
Scan expired customer QR code
    ↓
✗ Customer NOT added
✗ Toast: "Cannot select John - membership expired on 11/30/2024"
✗ Console: "[Barcode Scanner] Customer membership expired"
```

### Scenario 4: Add Product to Cart (with Member)

```
Add product with cashback rule
    ↓
✓ Product added to cart
✓ Member price applied
✓ Cashback badge shows "+X pts"
✓ Quantity changes update cashback
```

---

## Mobile View

### Active Customer Card

```
┌─────────────────────────────┐
│ 👤 Alan                     │
│ [Member] [Active]           │
│                             │
│ 🆔 CK-0021                  │
│ 📧 email@example.com        │
│ 📱 +85266281268             │
│ 🕐 Expires: 12/31/2025      │
│                             │
│ 🛒 120 pts | 👤 15 visits   │
└─────────────────────────────┘
```

### Expired Customer Card (Blocked)

```
┌─────────────────────────────┐
│ 👤 John                     │
│ [Member] [Expired]          │ ← Red
│                             │
│ 🆔 CK-0022                  │
│ 📧 john@example.com         │
│ 🕐 Expired: 11/30/2024      │
│                             │
│ (Cannot select)             │ ← Dimmed
└─────────────────────────────┘
```

---

## Dark Mode Examples

### Active Customer (Dark)

```
┌─────────────────────────────────────┐ ← Dark background
│ [Alan] [Member ✓] [Active ✓]       │ ← Light text
│         └─ Blue      └─ Green       │
│                                     │
│ 📧 sugarkimkju@gmail.com            │ ← Gray-400 text
│ 🕐 Expires: 12/31/2025              │
└─────────────────────────────────────┘
```

### Expired Customer (Dark)

```
┌─────────────────────────────────────┐ ← Dark background
│ [John] [Member ✓] [Expired ✗]      │ ← Light text
│         └─ Blue     └─ Red          │
│                                     │
│ (Dimmed to 60% opacity)             │
└─────────────────────────────────────┘
```

### Cart Item with Cashback (Dark)

```
┌─────────────────────────────────────┐
│ Test Cashback                       │ ← Light text
│ ฿1,000 → ฿900 [Member]              │
│ [+10 pts cashback]                  │ ← Green badge (dark variant)
│       └─ bg-green-950, text-green-400
└─────────────────────────────────────┘
```

---

## Error Message Examples

### Modal Selection Error

```
┌─────────────────────────────────────┐
│ ❌ Cannot select John               │
│    - membership expired on          │
│      11/30/2024                     │
└─────────────────────────────────────┘
(Toast notification, auto-dismiss)
```

### Scanner Error

```
┌─────────────────────────────────────┐
│ ❌ Cannot select John               │
│    - membership expired on          │
│      11/30/2024                     │
└─────────────────────────────────────┘
(Toast notification, auto-dismiss)

Console:
[Barcode Scanner] Customer membership expired: {customer object}
```

---

## Cashback Examples

### Single Item

```
Test Cashback - ฿900
[+10 pts cashback]
```

### Multiple Items

```
Item 1 - ฿500
[+5 pts cashback]

Item 2 - ฿300
[+3 pts cashback]

Item 3 - ฿200
(no badge - no cashback rule)

Total: ฿1,000
Cashback: +8 pts
```

---

## Complete Purchase Flow

```
1. SELECT CUSTOMER
   ├─ Active → ✓ Proceed
   └─ Expired → ✗ Blocked

2. ADD PRODUCTS
   ├─ Member price applied
   └─ Cashback badges shown

3. VIEW CART
   ├─ Each item shows cashback
   └─ Total cashback at bottom

4. PAYMENT
   ├─ Can use points (if enough)
   └─ Earn new cashback points

5. COMPLETE
   ├─ Points recorded in PointList
   └─ Receipt shows earned cashback
```

---

## CSS Classes Reference

### Expiry Badges

```css
/* Active */
.bg-green-50 .dark:bg-green-950
.border-green-500
.text-green-700 .dark:text-green-400

/* Expired */
.bg-red-50 .dark:bg-red-950
.border-red-500
.text-red-700 .dark:text-red-400
```

### Cashback Badge

```css
.bg-green-50 .dark:bg-green-950
.border-green-500
.text-green-700 .dark:text-green-400
.text-[10px]
```

### Disabled Customer Card

```css
.opacity-60
.cursor-not-allowed
.border-red-300 .dark:border-red-700
```

---

## Testing Scenarios

### ✅ Test 1: Active Customer

- Badge shows green "Active"
- Expiry date in future
- Can be selected
- Member prices apply
- Cashback works

### ✅ Test 2: Expired Customer

- Badge shows red "Expired"
- Expiry date in past
- Cannot be selected (modal)
- Cannot be scanned (QR)
- Error toast shown

### ✅ Test 3: No Expiry Date

- No expiry badge shown
- Can be selected normally
- Works as before

### ✅ Test 4: Cashback Display

- Badge shows for eligible items
- Correct points amount
- Updates with quantity
- Only for members

### ✅ Test 5: Source Badges

- No "kiosk" badge
- No "local" badge
- No "loyverse" badge
- No "pos" badge
- Only "Member" badge

---

This visual guide shows exactly how the UI looks and behaves after the updates.
