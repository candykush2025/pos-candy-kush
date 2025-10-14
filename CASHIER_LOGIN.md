# Cashier Login System

## Overview

The POS system now includes a dedicated cashier login for the sales page. This allows offline operation and tracks which cashier processed each transaction.

## Features

### 1. **Cashier PIN Login**

- Simple PIN-based authentication (4-6 digits)
- Works completely offline using IndexedDB
- Session persists across page refreshes
- Clean login screen with centered design

### 2. **Offline Operation**

- Cashier data synced from Firebase to IndexedDB
- Login works even without internet connection
- All transactions saved locally and synced when online

### 3. **Transaction Tracking**

- Every order includes `cashierId` and `cashierName`
- Transactions persist even when cashier changes
- View cashier info in order history

### 4. **Sync Status Indicators**

- **Orange banner**: Offline mode active
- **Blue banner**: Shows number of pending transactions
- **Auto-refresh**: Checks sync status every 5 seconds
- Visual feedback when transactions sync successfully

### 5. **Session Management**

- Logout button in tab navigation
- Session saved to localStorage
- Secure PIN validation

## Setup Instructions

### Adding Cashiers to the System

#### Method 1: Direct Database (For Testing)

You can add test users directly to IndexedDB:

1. Open browser DevTools (F12)
2. Go to Application > IndexedDB > PosDB > users
3. Add a new record:

```json
{
  "id": "cashier1",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "cashier",
  "pin": "1234",
  "createdAt": "2025-10-13T00:00:00.000Z"
}
```

#### Method 2: Firebase Console

1. Go to Firestore console
2. Navigate to `users` collection
3. Add a document with:
   - `name`: Cashier's name
   - `email`: Email address
   - `role`: "cashier" or "admin"
   - `pin`: 4-6 digit PIN (string)
   - `createdAt`: Current timestamp

#### Method 3: Admin Panel (Recommended)

Create an admin interface to manage cashiers:

**Location**: `/admin/users`

**Features needed**:

- Add new cashier
- Set/reset PIN
- Enable/disable cashier
- View cashier transaction history

## Security Considerations

### Current Implementation

- PINs stored as plain text (for offline access)
- Session stored in localStorage
- No password complexity requirements

### Recommended Improvements

1. **Hash PINs**: Use bcrypt or similar
2. **Session timeout**: Auto-logout after inactivity
3. **Audit logs**: Track all cashier actions
4. **Permission system**: Limit access to sensitive features
5. **Multi-factor auth**: For high-value operations

## User Experience

### Login Flow

1. Cashier opens sales page
2. Enters 4-6 digit PIN
3. System validates against IndexedDB
4. On success, shows main POS interface
5. Cashier name displayed in tab bar

### Offline Mode

1. System detects offline status
2. Orange banner shows "Offline Mode"
3. Cashier can continue processing sales
4. All transactions saved to IndexedDB
5. When online, blue banner shows sync progress
6. Banner disappears when all synced

### Transaction Process

1. Cashier adds items to cart
2. Selects customer (optional)
3. Completes payment
4. Order saved with:
   - Order details
   - Cashier ID and name
   - Customer info
   - Sync status
5. Receipt can be printed
6. Transaction appears in History tab

## API Reference

### dbService Methods

```javascript
// Get all users (including cashiers)
await dbService.getUsers();

// Get user by PIN
await dbService.getUserByPin("1234");

// Update user
await dbService.upsertUsers([user]);
```

### Order Schema with Cashier Info

```javascript
{
  orderNumber: "ORD-20251013-001",
  items: [...],
  subtotal: 100.00,
  discount: 0,
  total: 100.00,
  userId: "admin123",           // System user (if logged in)
  cashierId: "cashier1",         // Cashier who processed
  cashierName: "John Doe",       // Cashier display name
  customerId: "cust123",         // Customer (optional)
  customerName: "Jane Smith",    // Customer name
  status: "completed",
  paymentMethod: "cash",
  cashReceived: 120.00,
  change: 20.00,
  createdAt: "2025-10-13T10:30:00Z",
  syncStatus: "synced"           // "pending" or "synced"
}
```

## Troubleshooting

### Login Issues

**Problem**: "Invalid PIN or no cashier access"

- **Solution**: Verify PIN is correct, check user role is "cashier" or "admin"

**Problem**: No users found in IndexedDB

- **Solution**: Ensure users are synced from Firebase, or add test user manually

### Sync Issues

**Problem**: Transactions not syncing

- **Solution**: Check internet connection, verify Firebase credentials

**Problem**: Sync count not updating

- **Solution**: Check browser console for errors, verify syncEngine is running

### Session Issues

**Problem**: Logged out unexpectedly

- **Solution**: Check localStorage, may need to re-login after browser restart

## Future Enhancements

1. **Shift Management**

   - Clock in/out
   - Shift reports
   - Cash drawer tracking

2. **Performance Metrics**

   - Transactions per cashier
   - Average transaction time
   - Sales by cashier

3. **Advanced Security**

   - Biometric login (fingerprint)
   - Two-factor authentication
   - Role-based permissions

4. **Multi-terminal Support**
   - Terminal assignment
   - Concurrent sessions
   - Real-time sync

## Testing Checklist

- [ ] Login with valid PIN
- [ ] Login with invalid PIN (should fail)
- [ ] Logout and re-login
- [ ] Process transaction while online
- [ ] Process transaction while offline
- [ ] Verify cashier name in order
- [ ] Check sync status indicator
- [ ] Verify transactions persist after logout
- [ ] Switch cashiers and verify old transactions remain
- [ ] View order history with cashier info
- [ ] Print receipt with cashier name

## Notes

- The cashier session is independent from the main admin auth system
- Multiple cashiers can use the same device by logging out/in
- All transactions are preserved regardless of who's logged in
- Sync happens automatically in the background
- The system works fully offline for 100% uptime
