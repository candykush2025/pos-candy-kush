# Idle Timeout System

## Overview

The POS system now includes an automatic idle timeout feature that locks the cashier session after a period of inactivity. This security feature requires cashiers to re-enter their PIN to unlock the session.

## Features

- ✅ Automatic session locking after configurable inactivity period
- ✅ Configurable timeout durations (never, 1 min, 5 min, 10 min, 30 min, 1 hr, 2 hr, 3 hr)
- ✅ Activity detection (mouse, keyboard, touch, scroll)
- ✅ PIN verification to unlock
- ✅ Settings stored locally (no Firebase sync)
- ✅ Activity resets the idle timer
- ✅ Visual feedback for current timeout setting
- ✅ Option to logout without unlocking

## Configuration

### Timeout Options

| Duration   | Milliseconds | Use Case                        |
| ---------- | ------------ | ------------------------------- |
| Never      | 0            | No automatic locking            |
| 1 Minute   | 60000        | High security environments      |
| 5 Minutes  | 300000       | **Default** - Balanced security |
| 10 Minutes | 600000       | Moderate traffic                |
| 30 Minutes | 1800000      | Low traffic periods             |
| 1 Hour     | 3600000      | Trusted environment             |
| 2 Hours    | 7200000      | Minimal security needs          |
| 3 Hours    | 10800000     | Very low traffic                |

### Setting Timeout Duration

1. Navigate to **Settings** tab in POS
2. Find **Security** section
3. Click desired timeout duration
4. Setting is saved immediately to localStorage
5. New timeout takes effect for current session

### Storage Location

- **Key**: `pos_idle_timeout`
- **Storage**: localStorage (browser-specific, not synced)
- **Format**: String representation of milliseconds
- **Default**: `"300000"` (5 minutes)

## User Experience

### Normal Operation

1. Cashier logs in with PIN
2. Idle timer starts in background
3. Any activity resets the timer:
   - Mouse movement
   - Mouse clicks
   - Keyboard input
   - Touch events
   - Scrolling
   - Button clicks

### When Timeout Occurs

1. **Session Locks** automatically after inactivity period
2. **Locked Screen** appears with:
   - ⚠️ "Session Locked" warning
   - Cashier name and profile icon
   - PIN input field (4 digits)
   - "Unlock Session" button
   - "Logout Instead" option

### Unlocking Session

1. Enter 4-digit PIN (same as login PIN)
2. Press Enter or click "Unlock Session"
3. ✅ On success: Screen unlocks, timer resets
4. ❌ On failure: Error message, PIN field clears

### Alternative: Logout

- Click "Logout Instead" to end session without unlocking
- If active shift exists, End Shift modal appears
- Follow normal logout flow

## Technical Details

### Files Modified/Created

#### 1. `src/hooks/useIdleTimeout.js` (New)

Custom React hook for idle detection.

```javascript
useIdleTimeout(onIdle, timeout);
```

**Parameters:**

- `onIdle` (function): Callback when idle timeout is reached
- `timeout` (number): Milliseconds of inactivity before calling onIdle

**Monitored Events:**

- `mousedown`, `mousemove`, `keypress`, `scroll`, `touchstart`, `click`

**Behavior:**

- Auto-resets timer on any activity
- Cleans up event listeners on unmount
- Only active when timeout > 0

#### 2. `src/components/pos/SettingsSection.jsx` (Modified)

Added Security Settings card with timeout configuration.

**New State:**

- `idleTimeout`: Current timeout duration (string)

**New Functions:**

- `handleTimeoutChange(value)`: Save timeout to localStorage
- Loads saved timeout on mount

**UI Components:**

- Security card with Lock icon
- Grid of timeout option buttons
- Visual selection indicator (primary vs outline)
- Active timeout warning message

#### 3. `src/app/(pos)/layout.js` (Modified)

Integrated idle timeout detection and locked screen.

**New Imports:**

- `useIdleTimeout` hook

**New State:**

- `isLocked` (boolean): Session lock status
- `unlockPin` (string): PIN entry for unlock

**New Effects:**

- Loads timeout setting from localStorage
- Initializes idle detection when cashier logged in
- Handles session locking on timeout

**New Functions:**

- `handleUnlock()`: Verify PIN and unlock
- `handleUnlockKeyPress(e)`: Handle Enter key

**New UI:**

- Locked Screen Dialog
- PIN input with cashier info
- Unlock and Logout options

## Security Considerations

### PIN Verification

- Uses same PIN as cashier login
- Stored in cashier object from localStorage
- No server verification (offline capable)

### Attack Vectors

- **Brute Force**: Limited by UI (4-digit PIN, no rate limiting)
  - Consider adding delay after failed attempts
- **Session Hijacking**: PIN required even if localStorage accessible
- **Physical Access**: Timeout prevents unauthorized access when left unattended

### Best Practices

1. **Default to 5 minutes** for standard retail environments
2. **Use 1 minute** for high-value transactions
3. **Use 30+ minutes** for low-traffic/trusted environments
4. **Train staff** to manually lock when stepping away
5. **Consider camera surveillance** as additional security layer

## Testing Checklist

### Settings Configuration

- [ ] Can change timeout duration
- [ ] Selection shows visually (primary button)
- [ ] Setting persists after page refresh
- [ ] Toast notification appears on change
- [ ] Works with all 8 timeout options

### Idle Detection

- [ ] Timer starts after cashier login
- [ ] Mouse movement resets timer
- [ ] Keyboard input resets timer
- [ ] Touch events reset timer
- [ ] Scrolling resets timer
- [ ] Button clicks reset timer

### Lock Behavior

- [ ] Screen locks after configured timeout
- [ ] Cannot interact with POS when locked
- [ ] Cashier info displayed correctly
- [ ] PIN input accepts 4 digits

### Unlock Flow

- [ ] Correct PIN unlocks session
- [ ] Incorrect PIN shows error
- [ ] PIN field clears after error
- [ ] Enter key triggers unlock
- [ ] Timer resets after unlock
- [ ] Can resume work immediately

### Edge Cases

- [ ] No timeout when set to "Never"
- [ ] Timeout changes take effect immediately
- [ ] Logout during locked screen works
- [ ] Active shift handled during locked logout
- [ ] Page refresh doesn't auto-lock
- [ ] Multiple tabs don't interfere

## Future Enhancements

### Potential Improvements

1. **Progressive Delays**: Add delay after failed unlock attempts (3 fails = 30s delay)
2. **Lock Counter**: Show failed unlock attempts in admin logs
3. **Auto-Logout**: Logout automatically after X failed attempts
4. **Warning Toast**: Show toast 30s before timeout
5. **Admin Override**: Allow admin to unlock any session
6. **Timeout History**: Log lock/unlock events to Firebase
7. **Biometric**: Support fingerprint/face unlock on compatible devices
8. **Sound Alert**: Play sound when session locks

### Advanced Security

- Add CAPTCHA after 5 failed attempts
- Two-factor authentication option
- Require manager approval for unlock after hours
- Integration with security camera timestamp

## Support

### Common Issues

**Q: Session locks too quickly**
A: Go to Settings → Security, choose longer timeout duration

**Q: Forgot PIN while locked**
A: Click "Logout Instead" to logout, then login with remembered PIN or contact manager

**Q: Timeout not working**
A: Check Settings shows timeout (not "Never"), ensure browser allows localStorage

**Q: Locked immediately after login**
A: Settings may be corrupt, clear browser cache or reset timeout in Settings

**Q: Can't change timeout setting**
A: Ensure you have cashier login, check browser console for errors

### Troubleshooting Steps

1. Check localStorage for `pos_idle_timeout` key
2. Verify timeout is number > 0 (unless "Never")
3. Check browser console for errors
4. Clear cache and test again
5. Try different browser/incognito mode

## Implementation Summary

Total files: **3 files** (1 new hook, 2 modified components)
Lines of code: **~200 lines** (64 hook, 60 settings, 76 layout)
Storage: **localStorage only** (no Firebase sync)
Default timeout: **5 minutes**
Security level: **Medium** (PIN-based, offline-capable)

---

_Document Version: 1.0_
_Last Updated: 2025_
_System: POS Candy Kush - Idle Timeout Security Feature_
