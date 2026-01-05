# PWA Screen Lock Security

## Overview

Automatically locks the POS when the device screen is locked or the app goes into the background. This is essential for tablet/PWA security in retail environments.

## Implementation

### Detection Method

Uses the **Page Visibility API** to detect when the PWA becomes hidden:

```javascript
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    // Screen locked, app minimized, or switched away
    lockPOS();
  }
});
```

### What Triggers POS Lock

#### On Tablets/Mobile Devices:

1. **Screen Lock Button** - Pressing power button to lock screen
2. **Auto Screen Lock** - Screen timeout (e.g., 30 seconds, 1 minute)
3. **App Switch** - Switching to another app
4. **Home Button** - Going to home screen

#### On Desktop/Laptop:

1. **Tab Switch** - Switching to another browser tab
2. **Window Minimize** - Minimizing the browser window
3. **Screen Lock** - Windows+L (Windows) or Control+Command+Q (Mac)
4. **Screen Sleep** - System sleep mode

### What POS Lock Does

#### Security Actions:

- ✅ Clears `cashier` state (shows PIN login)
- ✅ Removes `pos_cashier` from localStorage
- ✅ Dispatches `cashier-update` event
- ✅ Shows warning toast on return

#### Data Preserved:

- ✅ Active shift remains in background
- ✅ Cart contents preserved
- ✅ Offline data intact
- ✅ Custom tabs and settings preserved
- ✅ IndexedDB not cleared

## Code Location

**File**: `src/app/(pos)/layout.js`

**Lines**: ~110-142

```javascript
// Screen lock detection - Lock POS when device screen is locked (PWA)
useEffect(() => {
  if (!cashier) return; // Only if cashier is logged in

  const handleVisibilityChange = () => {
    // When page becomes hidden (screen lock, minimize, etc.)
    if (document.hidden) {
      console.log("🔒 Screen locked/hidden - Locking POS");

      // Clear cashier to show PIN login screen
      setCashier(null);
      localStorage.removeItem("pos_cashier");
      window.dispatchEvent(new Event("cashier-update"));

      // Show toast when they return
      setTimeout(() => {
        if (!document.hidden) {
          toast.warning("Screen was locked. Please enter PIN to continue.");
        }
      }, 100);
    }
  };

  // Listen for page visibility changes
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}, [cashier]);
```

## User Experience

### Scenario 1: Tablet Screen Lock

```
1. Cashier is using POS
2. Presses power button (or auto-lock triggers)
3. Screen turns off
4. POS immediately locks
5. Unlock tablet → See PIN login screen
6. Enter PIN → Resume where they left off
```

### Scenario 2: App Switch on Tablet

```
1. Cashier using POS
2. Switches to another app (calculator, etc.)
3. POS locks immediately
4. Return to POS app → PIN login required
5. Enter PIN → Resume work
```

### Scenario 3: Browser Tab Switch (Desktop)

```
1. Admin/Manager using POS in browser
2. Switches to another tab
3. POS locks
4. Return to POS tab → PIN login required
5. Enter PIN → Continue
```

## Security Benefits

### Physical Security

- **Prevents unauthorized access** when device left unattended
- **Instant lock** - no delay or timer
- **No manual action required** - automatic on screen lock

### Multi-User Environment

- **Quick employee switching** - Each user must authenticate
- **Prevents accidental operations** - Can't accidentally charge customers
- **Audit trail maintained** - Shift data shows who did what

### Compliance

- **PCI DSS compliance** - Automatic session lock when unattended
- **Data protection** - Prevents unauthorized viewing of customer data
- **Retail best practices** - Industry standard security measure

## Combined Security Features

The POS now has **3 layers of security**:

### 1. Manual Lock (Header Button)

- Click lock icon in header
- Immediate PIN screen
- Use when: Taking break, stepping away briefly

### 2. Idle Timeout (Configurable)

- Auto-lock after inactivity (1min - 3hr, or never)
- Configurable in Settings
- Use when: Forgot to lock manually

### 3. Screen Lock Detection (Automatic)

- Locks when device/screen locks
- No configuration needed
- Use when: Natural device usage (pocket, sleep, etc.)

## Testing

### Test on Tablet/PWA:

- [ ] Lock tablet screen → POS locks
- [ ] Unlock tablet → PIN login shown
- [ ] Enter PIN → Resume with preserved shift/cart
- [ ] Switch to another app → POS locks
- [ ] Return to POS app → PIN required
- [ ] Toast message shows on return

### Test on Desktop Browser:

- [ ] Switch to another tab → POS locks
- [ ] Return to POS tab → PIN required
- [ ] Minimize browser → POS locks
- [ ] Restore window → PIN required
- [ ] Lock computer (Win+L) → POS locks
- [ ] Unlock computer → PIN required

### Test Data Preservation:

- [ ] Active shift persists through lock
- [ ] Cart items remain after unlock
- [ ] Custom tabs intact
- [ ] Settings preserved
- [ ] No data loss

### Test Multiple Locks:

- [ ] Lock screen multiple times → Each requires PIN
- [ ] Lock + idle timeout combo works
- [ ] Lock + manual lock button works
- [ ] Different employees can lock/unlock

## Browser Compatibility

### Page Visibility API Support:

- ✅ Chrome/Edge (all versions)
- ✅ Firefox (all versions)
- ✅ Safari (all versions)
- ✅ Mobile Safari (iOS)
- ✅ Chrome Mobile (Android)
- ✅ Samsung Internet
- ✅ PWA on all platforms

**Note**: This is a standard web API with excellent browser support.

## Configuration

### No Configuration Needed

This feature is **always active** when:

- Cashier is logged in
- PWA/browser is running

### To Disable (Not Recommended)

If you need to disable for testing, comment out the useEffect in `layout.js`:

```javascript
// Screen lock detection - DISABLED FOR TESTING
// useEffect(() => {
//   ... visibility change handler ...
// }, [cashier]);
```

## Best Practices

### For Cashiers:

- Don't leave tablet unlocked and unattended
- Screen lock provides instant security
- Re-entering PIN is quick and easy
- Shift data is always preserved

### For Managers:

- Educate staff about automatic locking
- Ensure all devices have screen lock enabled
- Set reasonable auto-lock timeouts (30s - 2min)
- Test lock behavior during training

### For IT/Setup:

- Enable device screen lock on all tablets
- Set auto-lock timeout (recommended: 30-60 seconds)
- Test PWA installation includes lock detection
- Verify lock works offline

## Troubleshooting

### POS Not Locking on Screen Lock

**Check**:

1. Is cashier logged in? (Only locks when logged in)
2. Browser console - look for "🔒 Screen locked/hidden" message
3. Try manually: `document.hidden` in console should return `true` when locked

### POS Locking Too Often

**Possible Causes**:

- Tab switching counts as "hidden"
- Screen saver activating
- Background app stealing focus

**Solutions**:

- This is expected behavior for security
- Use manual lock button if you need to keep session active
- Adjust device auto-lock timeout

### PIN Not Required After Unlock

**Check**:

1. Cashier was logged in before lock
2. Browser console for errors
3. localStorage - `pos_cashier` should be removed on lock

## Future Enhancements

### Possible Additions:

- [ ] Configurable option to disable screen lock detection
- [ ] Show "Locked by screen lock" vs "Locked by idle timeout" message
- [ ] Count lock events in shift report
- [ ] Add "Lock on blur" option separate from "Lock on hidden"
- [ ] Biometric unlock option (fingerprint, face)
- [ ] Remember lock reason for analytics

### Advanced Features:

- [ ] Geofencing - Auto-lock when leaving premises
- [ ] Time-based rules - Different timeouts by time of day
- [ ] Role-based lock rules - Managers vs cashiers
- [ ] Network-based lock - Lock when disconnected

## Related Documentation

- `LOCK_LOGOUT_SEPARATION.md` - Lock vs logout UX
- `IDLE_TIMEOUT_SYSTEM.md` - Configurable idle timeout
- `SHIFTS_SYSTEM_GUIDE.md` - Shift preservation through locks
- `PWA_SETUP.md` - PWA installation guide
- `SECURITY_MIGRATION.md` - Overall security implementation
