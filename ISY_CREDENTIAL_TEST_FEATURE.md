# ISY Credential Test Feature

## Overview

The debug page now includes a **credential testing feature** that verifies if your ISY API credentials are working correctly before attempting to sync orders.

## Location

**Debug Page:** `http://localhost:3000/debug/sync`

## Features

### 1. Automatic Credential Check on Page Load

- Credentials are automatically tested when you open the debug page
- Shows immediate feedback on credential status

### 2. Manual Test Button

- Click **"Test Credentials"** button to manually verify credentials
- Useful after updating environment variables
- No need to refresh the entire page

### 3. Visual Status Indicators

#### ✅ Valid Credentials (Green)

- **Card Color:** Green background
- **Icon:** Green checkmark
- **Message:** "Credentials Valid - API credentials are working correctly"
- **Badge:** "✓ Connected" in configuration section

#### ❌ Invalid Credentials (Red)

- **Card Color:** Red background
- **Icon:** Red X
- **Message:** Shows specific error (auth failed, network error, etc.)
- **Badge:** "✗ Not Connected" in configuration section
- **Quick Fixes:** Displays troubleshooting steps

#### ⏳ Checking (Yellow)

- **Card Color:** Yellow background
- **Icon:** Spinning clock
- **Message:** "Checking Credentials..."
- **Button:** Disabled during check

## How It Works

### Test Process

1. Retrieves configuration from environment variables
2. Validates that URL, username, and password are set
3. Sends a GET request to `{API_URL}/pos/v1/orders` with Basic Auth
4. Interprets the response:
   - **200 OK / 404**: Credentials valid (auth successful)
   - **401/403**: Invalid credentials
   - **Other codes**: API might be down
   - **Network error**: Cannot reach server

### Status Codes

| HTTP Status   | Meaning               | Status                     |
| ------------- | --------------------- | -------------------------- |
| 200, 404      | Auth successful       | ✅ Valid                   |
| 401, 403      | Authentication failed | ❌ Invalid                 |
| 500-599       | Server error          | ❌ Invalid (API down)      |
| Network Error | Cannot connect        | ❌ Invalid (No connection) |

## Configuration Display

### What's Shown

```
API URL: https://api.isy.software
Username: candykush_cashier
Password: •••••••• (masked)
Sync Enabled: ✅ Yes
```

### Password Security

- Password is **masked** (shown as ••••••••)
- Only shows "Not set" if missing
- Actual password never displayed in UI

## Error Messages

### Missing Configuration

```
❌ Missing configuration: API URL, username, or password not set in environment variables

Quick fixes:
• Check environment variables in .env.local
• Verify NEXT_PUBLIC_ISY_API_USERNAME and NEXT_PUBLIC_ISY_API_PASSWORD
• Ensure API server is accessible
• Contact ISY support if credentials are correct
```

### Authentication Failed

```
❌ Authentication failed: Invalid credentials

Quick fixes:
• Check environment variables in .env.local
• Verify NEXT_PUBLIC_ISY_API_USERNAME and NEXT_PUBLIC_ISY_API_PASSWORD
• Ensure API server is accessible
• Contact ISY support if credentials are correct
```

### Network Error

```
❌ Network error: Cannot reach API server. Check your internet connection or API URL.

Quick fixes:
• Check environment variables in .env.local
• Verify NEXT_PUBLIC_ISY_API_USERNAME and NEXT_PUBLIC_ISY_API_PASSWORD
• Ensure API server is accessible
• Contact ISY support if credentials are correct
```

## Toast Notifications

### Testing

- 🔵 **Info:** "Testing API credentials..."

### Success

- 🟢 **Success:** "✅ Credentials are valid! API connection successful."

### Failures

- 🔴 **Error:** Shows specific error message
- 🟡 **Warning:** For API server issues

## Use Cases

### 1. First-Time Setup

1. Configure environment variables in `.env.local`
2. Open debug page
3. Check credential status automatically
4. If invalid, fix variables and click "Test Credentials"

### 2. Troubleshooting Sync Failures

1. Notice many failed syncs
2. Check credential status
3. If invalid, fix the issue
4. Test credentials to verify fix
5. Retry failed syncs

### 3. After Configuration Changes

1. Update `.env.local` with new credentials
2. Restart Next.js server
3. Open debug page
4. Click "Test Credentials" to verify
5. Check for green "Valid" status

### 4. Regular Monitoring

1. Open debug page daily
2. Glance at credential status
3. Green = all good
4. Red = needs attention

## Integration with Environment Variables

### Required Variables

```env
# In .env.local
NEXT_PUBLIC_ISY_API_URL=https://api.isy.software
NEXT_PUBLIC_ISY_API_ENABLED=true
NEXT_PUBLIC_ISY_API_USERNAME=candykush_cashier
NEXT_PUBLIC_ISY_API_PASSWORD=admin123
```

### Validation

- Checks if all three are set (URL, username, password)
- Shows "Not set" for missing values
- Tests actual connection with real request

## Security Considerations

### Safe Practices

- ✅ Password masked in UI
- ✅ Credentials checked server-side (via API call)
- ✅ HTTPS required for Basic Auth
- ✅ No credential logging in browser

### What to Avoid

- ❌ Don't share screenshots with credential status
- ❌ Don't expose debug page to public
- ❌ Don't test with production credentials on development
- ❌ Don't share .env.local file

## Troubleshooting

### Credentials Show as Invalid But Are Correct

**Possible Causes:**

1. API server is down
2. Network firewall blocking requests
3. CORS issues
4. API endpoint changed

**Solutions:**

1. Test API manually with curl:
   ```bash
   curl -u candykush_cashier:admin123 https://api.isy.software/pos/v1/orders
   ```
2. Check API status with ISY support
3. Verify URL is correct
4. Check network connectivity

### Credentials Valid But Syncs Still Failing

**This means:**

- Authentication is working
- Problem is with order data format or API logic

**Next Steps:**

1. Check failed sync error messages
2. Review order data structure
3. Compare with API documentation
4. Contact ISY support with specific error

### Test Button Not Working

**Possible Causes:**

1. JavaScript error in browser console
2. Environment variables not loaded
3. Network issue

**Solutions:**

1. Check browser console for errors
2. Restart Next.js server
3. Hard refresh page (Ctrl+Shift+R)
4. Verify environment variables exist

## Best Practices

### Daily Routine

1. Open debug page
2. Check credential status (should be green)
3. If red, investigate immediately
4. Fix and retest

### After Updates

1. Update credentials in .env.local
2. Restart server
3. Test credentials
4. Verify green status
5. Test with a real sync

### Before Going Live

1. Test credentials on production
2. Verify green status
3. Complete a test sale
4. Check sync log for success
5. Monitor for 24 hours

## Credential Status States

### State: `null`

- **When:** Page just loaded
- **Display:** Configuration section only
- **Action:** Automatic check in progress

### State: `'checking'`

- **When:** Test in progress
- **Display:** Yellow card with spinning icon
- **Button:** Disabled
- **Action:** Wait for result

### State: `'valid'`

- **When:** Credentials work
- **Display:** Green card with checkmark
- **Button:** Enabled
- **Action:** None needed - system healthy

### State: `'invalid'`

- **When:** Test failed
- **Display:** Red card with error
- **Button:** Enabled
- **Action:** Fix credentials and retest

## Related Documentation

- [ISY_SYNC_DEBUG_GUIDE.md](./ISY_SYNC_DEBUG_GUIDE.md) - Full debug page guide
- [ISY_SYNC_IMPLEMENTATION_COMPLETE.md](./ISY_SYNC_IMPLEMENTATION_COMPLETE.md) - Implementation details
- [ISY_SYNC_QUICK_REFERENCE.md](./ISY_SYNC_QUICK_REFERENCE.md) - Quick reference

## API Test Request

### What Gets Sent

```http
GET {API_URL}/pos/v1/orders HTTP/1.1
Authorization: Basic Y2FuZHlrdXNoX2Nhc2hpZXI6YWRtaW4xMjM=
Content-Type: application/json
```

### Expected Responses

#### Success (Valid Auth)

```http
HTTP/1.1 200 OK
or
HTTP/1.1 404 Not Found
```

Both indicate credentials are valid.

#### Failed (Invalid Auth)

```http
HTTP/1.1 401 Unauthorized
or
HTTP/1.1 403 Forbidden
```

## Future Enhancements

### Planned

- [ ] Show last test timestamp
- [ ] Credential test history
- [ ] Auto-retest on interval
- [ ] Test multiple endpoints

### Under Consideration

- [ ] Detailed connection diagnostics
- [ ] API latency measurement
- [ ] Credential expiry warnings
- [ ] Email alerts for credential issues

## Summary

The credential test feature provides:

- ✅ Instant feedback on API connection
- ✅ Clear error messages
- ✅ Visual status indicators
- ✅ Manual and automatic testing
- ✅ Security (masked passwords)
- ✅ Quick troubleshooting

This helps developers ensure credentials are working before investigating sync issues, saving time and reducing confusion.
