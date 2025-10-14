# Cashier Login System - Quick Start

## 📱 PWA Installation (Recommended)

**For the best cashier experience, install the POS as an app on your device!**

### Why Install?

- ⚡ **Faster**: Instant loading after installation
- 📱 **App-like**: Works like a native mobile/desktop app
- 🔒 **Focused**: No browser tabs or distractions
- 💾 **Better Performance**: Products and settings load faster

### Quick Install Guide

1. Open Chrome browser on your device
2. Navigate to: `https://your-pos-domain.com/sales`
3. Wait 30 seconds → Install prompt will appear
4. Click "Install" button
5. Done! Access via "CK POS" icon on your device

**📖 Full Installation Guide**: See [CASHIER_PWA_INSTALL.md](./CASHIER_PWA_INSTALL.md)

> **Note for Admins**: Do NOT install the PWA. Use the regular browser for admin features.

---

## ✅ What's Been Implemented

### 1. **Cashier Login Screen**

- Location: `/sales` (POS page)
- PIN-based authentication (4-6 digits)
- Works 100% offline using IndexedDB
- Session persists across refreshes
- Clean, centered login UI

### 2. **Offline Transaction Tracking**

- Every order includes:
  - `cashierId` - Unique cashier identifier
  - `cashierName` - Display name (e.g., "John Doe")
  - `syncStatus` - "pending" or "synced"
- Transactions saved locally even when offline
- Auto-sync when connection restored

### 3. **Sync Status Indicators**

- **Orange Banner (Offline)**: "Offline Mode - Transactions will sync when online"
- **Blue Banner (Syncing)**: "X transactions pending sync" with spinning icon
- **Auto-refresh**: Updates every 5 seconds
- Banner disappears when fully synced

### 4. **Transaction Persistence**

- All transactions saved to IndexedDB
- Changing cashiers doesn't delete old transactions
- Each order permanently linked to cashier who created it
- View cashier info in History tab

### 5. **Session Management**

- Cashier name displayed in tab bar (top)
- Red "Logout" button with icon
- Session saved to localStorage
- Can switch cashiers without losing data

## 🚀 How to Test

### Step 1: Add Test Cashiers

Visit: **http://localhost:3001/admin/cashier-setup**

Click "Add All Test Cashiers" to add:

- **John Doe** - PIN: `1234`
- **Jane Smith** - PIN: `5678`
- **Admin User** - PIN: `0000`

### Step 2: Login as Cashier

1. Go to: **http://localhost:3001/sales**
2. Enter PIN: `1234`
3. Click "Login"

### Step 3: Test Online Transactions

1. Add items to cart
2. Complete a sale
3. Check History tab - should show "Cashier: John Doe"

### Step 4: Test Offline Mode

1. Disconnect internet (or use DevTools > Network > Offline)
2. Orange banner should appear: "Offline Mode"
3. Process another sale
4. Transaction saves to IndexedDB

### Step 5: Test Sync

1. Reconnect internet
2. Blue banner appears: "X transactions pending sync"
3. Wait a few seconds
4. Banner disappears (synced!)
5. Check History - all transactions synced

### Step 6: Test Cashier Switching

1. Click "Logout" button (red, top right)
2. Login as different cashier (PIN: `5678`)
3. Check History tab
4. Previous cashier's transactions still visible
5. Each shows correct cashier name

## 📁 Files Modified/Created

### Modified Files:

1. **`src/app/(pos)/sales/page.js`**

   - Added CashierLogin component
   - Added session management
   - Added cashier display in UI
   - Added logout button

2. **`src/components/pos/SalesSection.jsx`**

   - Added `cashier` prop
   - Added sync status indicators
   - Added `cashierId` and `cashierName` to orders
   - Added unsynced order counter
   - Added online/offline status detection

3. **`src/components/pos/HistorySection.jsx`**

   - Added `cashier` prop
   - Added cashier name display in order details
   - Added sync status badge

4. **`src/lib/db/dbService.js`**
   - Added `getUserByPin()` method

### New Files:

1. **`src/app/admin/cashier-setup/page.js`**

   - Cashier management interface
   - Add single or multiple test cashiers
   - Debug tools

2. **`CASHIER_LOGIN.md`**
   - Complete documentation
   - API reference
   - Security considerations
   - Troubleshooting guide

## 🔑 Key Features

### ✅ Offline First

- No internet required for cashier login
- All transactions work offline
- Auto-sync when online

### ✅ Transaction Integrity

- Every transaction tracked with cashier ID
- Transactions never deleted when switching users
- Full audit trail

### ✅ Visual Feedback

```
┌─────────────────────────────────────────────┐
│ ⚠️ Offline Mode - Transactions will sync   │ ← Orange banner
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 🔄 3 transactions pending sync | Syncing... │ ← Blue banner
└─────────────────────────────────────────────┘
```

### ✅ Easy Maintenance

- Simple PIN system
- No complex authentication
- Works entirely client-side
- Zero backend dependencies for offline

## 📊 Order Schema

```javascript
{
  // Order Info
  orderNumber: "ORD-20251013-001",
  total: 150.00,
  status: "completed",

  // Cashier Tracking (NEW!)
  cashierId: "cashier_test1",
  cashierName: "John Doe",

  // Customer Info (optional)
  customerId: "cust_123",
  customerName: "Jane Customer",

  // Sync Status (NEW!)
  syncStatus: "synced", // or "pending"

  // Standard Fields
  items: [...],
  paymentMethod: "cash",
  createdAt: "2025-10-13T10:30:00Z"
}
```

## 🎯 What Happens When...

### Scenario 1: Normal Online Sale

1. Cashier logs in ✅
2. Processes sale ✅
3. Order saved to Firebase immediately ✅
4. Order saved to IndexedDB with `syncStatus: "synced"` ✅
5. No sync banner shown ✅

### Scenario 2: Offline Sale

1. Internet disconnects 📡❌
2. Orange "Offline Mode" banner appears ✅
3. Cashier processes sale ✅
4. Order saved to IndexedDB with `syncStatus: "pending"` ✅
5. Order added to sync queue ✅
6. Internet reconnects 📡✅
7. Blue "pending sync" banner appears ✅
8. Sync engine uploads order ✅
9. `syncStatus` changed to "synced" ✅
10. Banner disappears ✅

### Scenario 3: Cashier Switch

1. John Doe (PIN: 1234) logs in ✅
2. Processes 3 sales ✅
3. Clicks logout ✅
4. Jane Smith (PIN: 5678) logs in ✅
5. History tab shows all 6 transactions ✅
6. John's 3 sales show "Cashier: John Doe" ✅
7. Jane's sales will show "Cashier: Jane Smith" ✅

## 🔐 Security Notes

**Current Implementation** (for testing):

- PINs stored as plain text
- Session in localStorage
- No encryption

**Production Recommendations**:

1. Hash PINs with bcrypt
2. Add session timeout (auto-logout)
3. Implement audit logging
4. Add permission system
5. Consider biometric auth

## 📱 UI Elements

### Login Screen:

```
┌────────────────────────┐
│         🔒             │
│   Cashier Login        │
│ Enter your PIN to      │
│    access POS          │
│                        │
│  [    ____    ]       │ ← PIN input
│                        │
│  [     Login     ]     │ ← Button
│                        │
│ Works offline with     │
│   synced users         │
└────────────────────────┘
```

### Sales Page Header:

```
┌──────────────────────────────────────────────────┐
│ 👤 John Doe  [Sales][Tickets][...] [🚪 Logout]  │
└──────────────────────────────────────────────────┘
```

### Sync Status Banner:

```
┌──────────────────────────────────────────────────┐
│ 📶❌ Offline Mode - Transactions will sync       │ ← Orange
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ 🔄 2 transactions pending sync | Syncing...      │ ← Blue
└──────────────────────────────────────────────────┘
```

## 🧪 Testing Checklist

- [x] Login with valid PIN (1234)
- [x] Login fails with invalid PIN
- [x] Cashier name displays in header
- [x] Logout button works
- [x] Process online transaction
- [x] Order includes cashierId and cashierName
- [x] Disconnect internet
- [x] Orange offline banner appears
- [x] Process offline transaction
- [x] Transaction saved to IndexedDB
- [x] Reconnect internet
- [x] Blue sync banner appears
- [x] Transaction syncs to Firebase
- [x] Banner disappears when synced
- [x] Switch cashier (logout/login as different user)
- [x] Old transactions still visible
- [x] Each transaction shows correct cashier
- [x] View order details in History tab
- [x] Cashier name visible in order details

## 🎉 Ready to Use!

The cashier login system is fully functional and ready for testing. Just:

1. Visit `/admin/cashier-setup` to add cashiers
2. Go to `/sales` to login and test
3. Try offline mode and watch the sync indicators

Everything works offline with full transaction tracking! 🚀
