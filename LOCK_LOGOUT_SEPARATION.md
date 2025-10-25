# Lock vs Logout Separation

## Overview

Changed the POS UX to separate "lock screen for security" from "complete logout". This improves the workflow by allowing cashiers to lock their screen during shifts without ending their session completely.

## Changes Made

### 1. Header Lock Button (`src/app/(pos)/layout.js`)

#### Visual Changes

- **Icon**: Changed from `LogOut` to `Lock`
- **Colors**: Changed from red warning colors to neutral colors
  - Before: `text-red-600 hover:text-red-700 hover:bg-red-50`
  - After: `hover:bg-gray-100 dark:hover:bg-gray-800`
- **Tooltip**: Updated to "Lock screen - Logged in as: {name}"

#### Functional Changes

- **New Function**: `handleLockScreen()` - Locks screen without full data wipe
  ```javascript
  const handleLockScreen = () => {
    console.log("🔒 Locking screen - cashier session cleared");
    setCashier(null);
    localStorage.removeItem("pos_cashier");
    window.dispatchEvent(new Event("cashier-update"));
    toast.info("Screen locked. Enter PIN to continue.");
  };
  ```

#### What Lock Does:

- ✅ Clears cashier state (shows PIN login)
- ✅ Removes only `pos_cashier` from localStorage
- ✅ Keeps shift active in background
- ✅ Preserves all offline data (products, orders, settings)
- ✅ Preserves custom categories and tabs
- ✅ Allows quick re-entry with PIN

#### What Lock Does NOT Do:

- ❌ Does not clear all localStorage
- ❌ Does not clear IndexedDB
- ❌ Does not end active shift
- ❌ Does not clear cart
- ❌ Does not logout admin user

### 2. Settings Logout (`src/components/pos/SettingsSection.jsx`)

#### New Account Settings Card

Added a new red-bordered card at the bottom of Settings with:

- Email/Password change buttons (coming soon - currently disabled)
- Complete Logout section with warning

#### Complete Logout Function

```javascript
const handleCompleteLogout = async () => {
  // Clear ALL localStorage
  localStorage.clear();

  // Clear ALL IndexedDB data
  await dbService.clearAllData();

  // Clear cart store
  clearCart();

  // Logout admin and redirect to login
  logout();
  router.push("/login");
};
```

#### What Complete Logout Does:

- ✅ Clears ALL localStorage (including settings, custom tabs, device_id)
- ✅ Clears ALL IndexedDB (products, orders, customers, etc.)
- ✅ Clears cart store
- ✅ Ends admin session
- ✅ Redirects to login page
- ✅ Shows confirmation toast

#### Visual Design

- Red-themed danger zone
- Warning icon with explanation
- List of what will be cleared:
  - Cached products, orders, and receipts
  - Active shifts and cashier sessions
  - Custom categories and tabs
  - All settings and preferences
- Red "Complete Logout" button

## User Workflows

### Lock Screen Workflow (Quick Security)

1. Cashier clicks Lock button in header
2. Screen shows PIN login immediately
3. Cashier can walk away safely
4. To resume: Enter PIN
5. Returns to exact same state (same shift, same cart, same data)

**Use Case**: Break time, bathroom, stepping away briefly

### Complete Logout Workflow (End Session)

1. Navigate to Settings page
2. Scroll to Account Settings (bottom)
3. Click "Complete Logout" in danger zone
4. All data cleared, redirected to login
5. Next login starts fresh with no cached data

**Use Case**: End of day, change admin user, troubleshooting, clean slate

## Benefits

### Security

- Quick lock during shift without disrupting workflow
- PIN required to resume after lock
- Complete logout available when needed

### User Experience

- Faster to lock/unlock than full logout cycle
- Shift and cart preserved through lock
- Clear separation between security lock and session end

### Data Management

- Lock: Preserves work in progress
- Logout: Clean slate for troubleshooting or user changes

## Technical Notes

### State Management

- **Lock**: Only clears `cashier` state
- **Logout**: Clears all React state, localStorage, IndexedDB

### Event Dispatching

- **Lock**: Dispatches `cashier-update` event only
- **Logout**: Dispatches `cashier-update` and `storage` events

### Shift Handling

- **Lock**: Shift remains active (still clocked in)
- **Logout**: If active shift exists, prompts to end shift first

### Storage Keys Preserved by Lock

- `active_shift` - Current shift data
- `pos_idle_timeout` - Security settings
- `custom_categories` - Custom category data
- `custom_category_products` - Custom tab products
- `device_id` - Device identification
- All IndexedDB tables remain intact

### Storage Cleared by Logout

- **ALL localStorage keys**
- **ALL IndexedDB tables**
- **All React state**
- **Cart store**

## Testing Checklist

### Lock Button Testing

- [ ] Click lock button shows PIN login
- [ ] Shift data persists after lock
- [ ] Cart data persists after lock
- [ ] Custom tabs persist after lock
- [ ] Settings persist after lock
- [ ] Re-enter PIN resumes exact state
- [ ] No console errors on lock

### Logout Button Testing

- [ ] Settings page shows Account Settings card
- [ ] Red danger zone visible at bottom
- [ ] Complete Logout button works
- [ ] All localStorage cleared
- [ ] All IndexedDB cleared
- [ ] Redirects to login page
- [ ] Next login starts fresh
- [ ] No residual data from previous session

### Integration Testing

- [ ] Lock during active shift preserves shift
- [ ] Logout during active shift prompts to end shift
- [ ] Idle timeout still works with lock button
- [ ] Employee switching works with lock button
- [ ] Multiple lock/unlock cycles work correctly

## Future Enhancements

### Settings Page

- [ ] Implement "Change Email" functionality
- [ ] Implement "Change Password" functionality
- [ ] Add "End Current Shift" button to Settings
- [ ] Add shift history viewer

### Lock Screen

- [ ] Add "Logout" option on PIN screen for quick full logout
- [ ] Show active shift info on lock screen
- [ ] Show lock duration timer

### Security

- [ ] Add biometric unlock option
- [ ] Add configurable lock timeout
- [ ] Add failed PIN attempt limits
