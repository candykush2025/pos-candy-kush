# Employee Shifts Section - Quick Reference

## Overview

The **Shifts** tab in the POS system allows employees/cashiers to view their own shift history, sign-in/sign-out records, and cash handling performance.

## Location

**POS Navigation:** Sales → Tickets → Customers → History → **Shifts** → Products → Settings

## Features

### 1. Personal Statistics Dashboard

At the top of the page, employees can see:

- **Total Shifts**: Number of shifts worked with active shift count
- **Total Handled**: Total sales amount processed across all shifts
- **Cash Variance**: Overall surplus or shortage (color coded)
- **Accuracy**: Percentage of perfect cash counts (no discrepancies)

### 2. Shift History List

Each shift card displays:

**Shift Information:**

- Status badge (Active with pulse animation / Completed)
- Start date and time
- Duration (hours and minutes)
- End date and time (if completed)

**Cash Handling Details:**

- Starting Cash: Amount in drawer at shift start
- Cash Sales: Total cash transactions during shift
- Expected Cash: Starting cash + cash sales
- Actual Cash: Physical count at shift end
- Variance: Difference (shortage/surplus/perfect)

**Sales Summary:**

- Transaction count
- Total sales (all payment methods)
- Card sales breakdown
- Other payment methods breakdown

**Visual Indicators:**

- 🟢 **Green border**: Active shift (currently in progress)
- 🔴 **Red border**: Completed shift with shortage
- 🟡 **Yellow border**: Completed shift with surplus
- ⚪ **Normal**: Perfect cash count (no discrepancy)

### 3. Active Shift Indicator

If employee has an active shift, it shows:

- Green "Current Shift" badge with pulse animation
- "Shift in Progress" message
- Note: "This shift will be completed when you log out"
- All current totals (starting cash, sales, expected cash)
- Variance shows "TBD" until shift ends

### 4. Discrepancy Alerts

For completed shifts with cash discrepancies:

- **Shortage Alert (Red)**:
  - Shows amount short
  - Message: "You were short $X.XX at the end of this shift"
- **Surplus Alert (Yellow)**:
  - Shows extra amount
  - Message: "You had $X.XX extra at the end of this shift"

## Use Cases

### For Employees

1. **Track Work History**: See all shifts worked with dates and times
2. **Monitor Performance**: Check accuracy rate and variance trends
3. **Verify Cash Handling**: Review end-of-shift cash counts
4. **Check Active Shift**: See current shift details in real-time
5. **Accountability**: Understand where discrepancies occurred

### For Managers

- Employees can self-review before discussing discrepancies with management
- Transparency in cash handling builds trust
- Employees can identify patterns (e.g., always short on busy days)

## Key Differences from Admin View

| Feature              | Employee View         | Admin View             |
| -------------------- | --------------------- | ---------------------- |
| **Shifts Displayed** | Only own shifts       | All cashiers' shifts   |
| **Statistics**       | Personal totals       | Store-wide totals      |
| **Filtering**        | Not needed (own data) | Filter by cashier/date |
| **Export**           | Not available         | CSV export available   |
| **Access**           | Any logged-in cashier | Admin only             |

## How to Access

1. **Login to POS** with your cashier PIN
2. **Click "Shifts" tab** in the top navigation
3. **View your history** - most recent shifts first

## Privacy & Security

- Employees can **only see their own shifts**
- Cannot view other employees' shift records
- All data stored securely in Firebase
- Shift data tied to employee user ID

## Tips for Employees

1. **Review After Each Shift**: Check your shift record after logout to verify accuracy
2. **Track Patterns**: Notice if discrepancies happen at specific times
3. **Report Issues**: If you notice errors in the system, notify manager
4. **Maintain Accuracy**: Use the variance preview when ending shifts to avoid surprises
5. **Check Active Shift**: Before starting sales, verify your active shift shows correct starting cash

## Technical Details

**Component:** `src/components/pos/ShiftsSection.jsx`

**Data Source:** Firebase `shifts` collection (filtered by employee userId)

**Real-time Updates:** Loads fresh data on each visit to Shifts tab

**Performance:** Only loads shifts for logged-in employee (fast queries)

## Troubleshooting

### Issue: "No shifts found"

- **Solution**: You haven't completed any shifts yet, or you're a new employee

### Issue: Active shift not showing

- **Solution**: Check if you logged in today. If yes, check localStorage for `active_shift`

### Issue: Wrong cash totals

- **Solution**: Only cash payments affect expected cash. Card/crypto/transfer don't.

### Issue: Can't see shift after logout

- **Solution**: Refresh the page or reopen Shifts tab to load latest data

## Related Documentation

- `SHIFTS_SYSTEM_GUIDE.md` - Complete system documentation
- `SHIFTS_SYSTEM_GUIDE.md#user-flow` - Detailed shift lifecycle
- Admin Shifts page: `/admin/shifts` (managers only)

---

**Quick Navigation:**

- POS Home → **Shifts** tab → View your history
- See statistics at top, detailed records below
- Active shift always shown first with green highlight
