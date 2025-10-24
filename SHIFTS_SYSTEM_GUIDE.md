# Shift Management System - Complete Guide

## Overview

The Shift Management System tracks cashier shifts with cash reconciliation and variance tracking. It records starting cash, tracks all cash transactions, and calculates the difference between expected and actual cash at the end of the shift.

## Features

- ✅ Starting cash entry at shift start
- ✅ Automatic transaction tracking during sales
- ✅ Ending cash entry with variance calculation
- ✅ Real-time variance preview (shortage/surplus/perfect)
- ✅ Firebase storage for manager review
- ✅ Admin section to view all shift records
- ✅ Statistics dashboard with totals and discrepancies
- ✅ Export to CSV functionality
- ✅ Filter by status and search by cashier

## User Flow

### 1. Cashier Login & Shift Start

**Location:** `/sales` page

**Flow:**

1. Cashier enters PIN
2. System checks for active shift:
   - **If active shift exists:** Resume shift and login immediately
   - **If no active shift:** Show "Starting Cash" modal

**Starting Cash Modal:**

- Input field for starting cash amount (e.g., $100, $200)
- "Cancel" button - Returns to login screen
- "Start Shift" button - Creates shift and logs in

**Code Location:** `src/app/(pos)/sales/page.js`

- Lines 37-108: `handleLogin` function
- Lines 142-165: `handleStartShift` function
- Lines 210-259: Starting Cash Modal JSX

### 2. During Shift - Transaction Tracking

**Location:** POS sales interface

**Flow:**

1. Cashier makes sales throughout the day
2. For **cash payments only**, the system:
   - Records the transaction in the active shift
   - Updates `totalCashSales`
   - Recalculates `expectedCash = startingCash + totalCashSales`

**Note:** Card, crypto, and transfer payments do NOT affect expected cash since they don't go in the cash drawer.

**Code Location:** `src/components/pos/SalesSection.jsx`

- After line 1348: Shift transaction tracking in `handleCompletePayment`

### 3. Cashier Logout & Shift End

**Location:** POS layout logout button

**Flow:**

1. Cashier clicks logout
2. System checks for active shift:
   - **If no active shift:** Logout immediately
   - **If active shift exists:** Show "End Shift" modal

**End Shift Modal:**

- **Shift Summary Card:**
  - Starting Cash
  - Cash Sales (total cash transactions)
  - Expected Cash (starting + sales)
- **Actual Cash Input:**
  - Input field to enter physical cash count
- **Live Variance Preview:**
  - Shows difference: `Actual - Expected`
  - Color coded:
    - 🟢 Green = Perfect match (0 difference)
    - 🔴 Red = Shortage (negative)
    - 🟡 Yellow = Surplus (positive)
- **Actions:**
  - "Cancel" - Close modal, return to POS
  - "End Shift & Logout" - Save shift and logout

**Toast Notification:**

- Shows result: "Perfect match! ✓" or "Shortage: $10.00" or "Surplus: $5.00"

**Code Location:** `src/app/(pos)/layout.js`

- Lines 134-186: `handleCashierLogout` and `handleEndShift`
- Lines 405-501: End Shift Modal JSX

### 4. Admin View - Shift Records

**Location:** `/admin/shifts` page

**Features:**

**Statistics Cards:**

- Total Shifts (with active count)
- Total Sales from all completed shifts
- Total Variance (cumulative shortage/surplus)
- Shifts with Discrepancy (count of shorts + surpluses)

**Filters:**

- Search by cashier name or shift ID
- Filter by status: All / Active / Completed

**Shift Records:**
Each shift displays:

- Cashier name and shift ID
- Status badge (Active with pulse animation / Completed)
- Start date/time and duration
- Starting cash
- Expected cash
- Actual cash
- Variance with color coding
- Total sales breakdown (cash/card/other)
- Transaction count
- Notes (if any)

**Discrepancy Highlighting:**

- Shifts with shortage: Red border and background
- Shifts with surplus: Yellow border and background
- Perfect shifts: Normal appearance

**Export:**

- "Export CSV" button
- Downloads all filtered shifts with full details

**Code Location:** `src/app/admin/shifts/page.js`

## Firebase Data Structure

**Collection:** `shifts`

**Document Fields:**

```javascript
{
  id: "auto-generated",
  userId: "cashier user ID",
  userName: "Cashier Name",

  // Timestamps
  startTime: Firestore.Timestamp,
  endTime: Firestore.Timestamp | null,
  createdAt: Firestore.Timestamp,
  updatedAt: Firestore.Timestamp,

  // Cash Tracking
  startingCash: 100,              // Initial drawer amount
  expectedCash: 350,              // startingCash + totalCashSales
  actualCash: 345,                // Physical count at end
  variance: -5,                   // actualCash - expectedCash

  // Sales Totals
  totalSales: 500,                // All sales combined
  totalCashSales: 250,            // Cash only (affects expected)
  totalCardSales: 200,            // Card payments
  totalOtherSales: 50,            // Crypto/transfer
  transactionCount: 15,           // Number of orders

  // Transaction Log
  transactions: [
    {
      id: "order_id_1",
      amount: 25,
      paymentMethod: "cash",
      timestamp: Firestore.Timestamp
    }
  ],

  // Status
  status: "active" | "completed",

  // Optional
  notes: "Optional notes"
}
```

## Service Methods

**File:** `src/lib/firebase/shiftsService.js`

### Core Operations

**1. createShift(shiftData, userId, userName)**

- Creates new shift with starting cash
- Sets status to "active"
- Initializes all totals to 0
- Returns shift object

**2. addTransaction(shiftId, transaction)**

- Adds transaction to shift
- Updates totals based on payment method
- Recalculates expectedCash
- Returns updated shift

**3. endShift(shiftId, endingData, userId, userName)**

- Sets endTime
- Records actualCash
- Calculates variance
- Sets status to "completed"
- Returns final shift object

### Query Operations

**4. getAll(options)**

- Gets all shifts
- Options: orderBy, limit
- Returns array of shifts

**5. getByUser(userId, options)**

- Gets shifts for specific user
- Options: orderBy, limit
- Returns array of shifts

**6. getActiveShift(userId)**

- Gets user's currently active shift
- Returns shift object or null

**7. getById(id)**

- Gets single shift by ID
- Returns shift object

**8. getByDateRange(startDate, endDate)**

- Gets shifts within date range
- Returns array of shifts

**9. getStatistics(userId)**

- Calculates statistics for all shifts or specific user
- Returns:
  - totalShifts
  - activeShifts
  - totalSales
  - totalVariance
  - shiftsWithShortage
  - shiftsWithSurplus
  - averageVariance

**10. updateNotes(id, notes)**

- Updates shift notes
- Returns success boolean

## Variance Calculation

```javascript
// Formula
variance = actualCash - expectedCash;

// Where:
expectedCash = startingCash + totalCashSales;

// Interpretation:
variance === 0; // Perfect match ✓
variance < 0; // Shortage (missing money)
variance > 0; // Surplus (extra money)
```

## Testing Guide

### Test Flow #1: Complete Shift

1. **Login as cashier**

   - Enter PIN
   - Should see "Starting Cash" modal

2. **Enter starting cash**

   - Input: $100
   - Click "Start Shift"
   - Should login to POS

3. **Make cash sales**

   - Create order for $25 (cash payment)
   - Create order for $50 (cash payment)
   - Total cash sales: $75
   - Expected cash: $175

4. **Make non-cash sales (optional)**

   - Create order for $30 (card payment)
   - This should NOT affect expected cash

5. **Logout**

   - Click logout button
   - Should see "End Shift" modal
   - Shift summary should show:
     - Starting Cash: $100
     - Cash Sales: $75
     - Expected Cash: $175

6. **Enter actual cash**

   - **Test Perfect Match:** Input $175

     - Variance preview: 🟢 "Perfect match!"
     - Click "End Shift & Logout"
     - Toast: "Perfect match! ✓"

   - **Test Shortage:** Input $170

     - Variance preview: 🔴 "↓ $5.00 short"
     - Click "End Shift & Logout"
     - Toast: "Shortage: $5.00"

   - **Test Surplus:** Input $180
     - Variance preview: 🟡 "↑ $5.00 over"
     - Click "End Shift & Logout"
     - Toast: "Surplus: $5.00"

7. **Verify in Admin**
   - Login as admin
   - Go to "Shifts" section
   - Find completed shift
   - Verify all data matches

### Test Flow #2: Resume Shift

1. **Start shift** (follow steps 1-3 above)
2. **Refresh page** without logging out
3. **Login again** with same PIN
4. Should resume shift without "Starting Cash" modal
5. Active shift should show in localStorage
6. Continue making sales - should update same shift

### Test Flow #3: Admin View

1. **Login as admin**
2. **Navigate to Shifts**
3. **Verify statistics:**

   - Total shifts count
   - Total sales
   - Total variance
   - Discrepancy counts

4. **Test filters:**

   - Click "Active" - should show only active shifts
   - Click "Completed" - should show only completed
   - Search by cashier name
   - Search by shift ID

5. **Test export:**

   - Click "Export CSV"
   - Verify CSV contains all shift data

6. **Verify highlighting:**
   - Shifts with shortage: Red border
   - Shifts with surplus: Yellow border
   - Perfect shifts: Normal

## localStorage Keys

**1. `pos_cashier`**

- Stores logged-in cashier object
- Structure: `{ id, name, pin, role }`

**2. `active_shift`**

- Stores current active shift object
- Synced after each transaction
- Cleared on logout

## Error Handling

### Transaction Tracking

- Wrapped in try/catch
- Errors logged to console
- Does NOT fail checkout if shift update fails

### Shift End

- Validates ending cash >= 0
- Shows error toast if validation fails
- Prevents logout if validation fails

### Admin View

- Shows error toast if shifts fail to load
- Handles missing/null data gracefully
- Shows "Loading..." during data fetch

## Security Considerations

1. **Authentication Required:**

   - Cashiers must login with PIN to start shift
   - Admins must login to view shifts

2. **User Association:**

   - Shifts tied to specific userId
   - Can only resume own shifts

3. **Firebase Rules:**
   - Ensure cashiers can only create/update own shifts
   - Ensure admins can read all shifts
   - Example rules needed:
   ```javascript
   match /shifts/{shiftId} {
     // Cashiers can create and update their own shifts
     allow create: if request.auth.uid == request.resource.data.userId;
     allow update: if request.auth.uid == resource.data.userId;

     // Admins can read all shifts
     allow read: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
   }
   ```

## Troubleshooting

### Issue: Starting Cash modal doesn't appear

**Solution:** Check that no active shift exists in localStorage. Clear `active_shift` if needed.

### Issue: Transactions not updating shift

**Solution:**

- Verify shift is "active" status
- Check that payment method is "cash"
- Look for errors in browser console

### Issue: Variance calculation wrong

**Solution:**

- Verify expectedCash = startingCash + totalCashSales
- Check that only cash sales are counted
- Ensure card/crypto/transfer sales are excluded

### Issue: Can't see shift in admin panel

**Solution:**

- Check Firebase connection
- Verify shift was created successfully
- Check browser console for errors
- Verify admin authentication

### Issue: Shift persists after logout

**Solution:**

- Ensure `performLogout` in layout clears both `pos_cashier` and `active_shift`
- Check that handleEndShift is called on logout

## File Summary

**Created:**

- `src/lib/firebase/shiftsService.js` (234 lines)
- `src/app/admin/shifts/page.js` (503 lines)

**Modified:**

- `src/components/pos/SalesSection.jsx` - Added transaction tracking
- `src/app/(pos)/sales/page.js` - Added shift start modal
- `src/app/(pos)/layout.js` - Added shift end modal
- `src/app/admin/layout.js` - Added Shifts navigation

## Navigation Structure

**Admin Menu:**

```
Dashboard
Products
  → Item List
  → Categories
Stock
Orders
Customers
Users
Shifts ← NEW
Analytics
Integration
Settings
```

## Future Enhancements (Optional)

1. **Shift Notes:** Allow cashiers to add notes when ending shift
2. **Discrepancy Reasons:** Dropdown for common reasons (change error, theft, etc.)
3. **Shift Reports:** Generate PDF reports for individual shifts
4. **Notifications:** Alert managers when variance exceeds threshold
5. **Shift Scheduling:** Pre-plan shifts and assign cashiers
6. **Break Tracking:** Record break times within shifts
7. **Drawer Counts:** Multiple mid-shift cash counts
8. **Signature Capture:** Digital signature on shift end
9. **Shift Handoff:** Transfer drawer between cashiers
10. **Historical Trends:** Charts showing variance patterns over time

## Support

For issues or questions:

1. Check browser console for error messages
2. Verify Firebase connection and rules
3. Test with a fresh login
4. Check that all files are properly saved
5. Verify Next.js dev server is running

---

**System Status:** ✅ **FULLY OPERATIONAL**

All shift management features are implemented and ready for testing.
