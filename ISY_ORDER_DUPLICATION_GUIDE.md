# ISY Order Duplication Implementation Guide

## Overview

This system automatically duplicates all POS orders to `api.isy.software` in real-time, ensuring the new server always has the latest transaction data. The implementation includes automatic retry mechanisms, offline queue management, and comprehensive error handling.

## Architecture

### Components

1. **Order Duplication Service** (`orderDuplicationService.js`)
   - Handles API communication with ISY server
   - Transforms receipt data to ISY API format
   - Manages authentication tokens
   - Provides retry and batch duplication capabilities

2. **ISY Sync Service** (`isySyncService.js`)
   - Background service that runs every minute
   - Retries failed duplications automatically
   - Manages sync queue in IndexedDB
   - Provides sync statistics and manual triggers

3. **ISY Sync Initializer** (`ISYSyncInitializer.jsx`)
   - React component that starts the sync service
   - Automatically runs on app initialization
   - Handles cleanup on unmount

4. **Sales Section Integration** (`SalesSection.jsx`)
   - Duplicates orders immediately after Firebase save
   - Adds failed duplications to retry queue
   - Non-blocking - doesn't fail checkout if duplication fails

## How It Works

### 1. Order Creation Flow

```
POS Checkout
    ↓
Save to Firebase (existing)
    ↓
Duplicate to ISY API (new)
    ├─ Success → Log success
    └─ Failure → Add to retry queue
```

### 2. Automatic Retry Flow

```
Background Sync Service (runs every 60 seconds)
    ↓
Check IndexedDB for pending duplications
    ↓
Retry failed duplications (max 5 attempts)
    ├─ Success → Mark as completed
    └─ Failure → Increment attempt count
```

### 3. Data Flow

```javascript
// POS Receipt Data (Firebase format)
{
  orderNumber: "POS-2026-001",
  line_items: [...],
  total_money: 45.50,
  customer: {...},
  // ... all receipt fields
}
    ↓ Transform
// ISY API Format (same structure, validated)
{
  orderNumber: "POS-2026-001",
  line_items: [...],
  total_money: 45.50,
  customer: {...},
  // ... all receipt fields
}
    ↓ Send with JWT
POST https://api.isy.software/pos/v1/orders
Authorization: Bearer <jwt_token>
```

## Configuration

### Environment Variables

Add to `.env.local`:

```bash
# ISY API Configuration
NEXT_PUBLIC_ISY_API_URL=https://api.isy.software
NEXT_PUBLIC_ISY_API_ENABLED=true
```

### Enable/Disable Feature

To disable ISY duplication without removing code:

```bash
NEXT_PUBLIC_ISY_API_ENABLED=false
```

## Authentication

### JWT Token Management

The system uses JWT tokens for authentication with the ISY API.

#### Setting the Token

```javascript
import { setISYApiToken } from "@/lib/services/orderDuplicationService";

// After cashier login or when token is received
setISYApiToken("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...");
```

#### Token Storage

- Tokens are stored in `localStorage` as `isy_api_token`
- Automatically included in all API requests
- Should be refreshed before expiration

#### Clearing Token (on logout)

```javascript
import { clearISYApiToken } from "@/lib/services/orderDuplicationService";

clearISYApiToken();
```

## API Endpoint Specification

### Request

```
POST https://api.isy.software/pos/v1/orders
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

### Request Body

See `POS_RECEIPT_API_SPECIFICATION.md` for complete data structure.

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "orderId": "server-generated-id",
    "orderNumber": "POS-2026-001"
  }
}
```

#### Error (400 Bad Request)

```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_FAILED",
  "details": ["orderNumber is required", "total_money is required"]
}
```

#### Error (401 Unauthorized)

```json
{
  "success": false,
  "error": "Invalid authentication token",
  "code": "AUTH_INVALID_TOKEN"
}
```

## Retry Logic

### Automatic Retry

Failed duplications are automatically retried up to 5 times with exponential backoff:

- Attempt 1: Immediate
- Attempt 2: After 2 seconds
- Attempt 3: After 4 seconds
- Attempt 4: After 8 seconds
- Attempt 5: After 10 seconds (capped)

### Retry Conditions

The system will retry when:

- Network errors occur
- Server errors (5xx) are returned
- Timeouts happen

The system will NOT retry when:

- Authentication fails (401)
- Validation fails (400)
- Token is missing

### Manual Retry

You can manually trigger a retry:

```javascript
import { triggerISYSync } from "@/lib/services/isySyncService";

// Manually trigger sync
await triggerISYSync();
```

## Monitoring & Debugging

### Get Sync Statistics

```javascript
import { getISYSyncStats } from "@/lib/services/isySyncService";

const stats = await getISYSyncStats();
console.log(stats);
// {
//   pending: 5,
//   completed: 120,
//   failed: 2,
//   total: 127
// }
```

### Check Configuration

```javascript
import { isISYApiConfigured } from "@/lib/services/orderDuplicationService";

if (isISYApiConfigured()) {
  console.log("✅ ISY API is configured and token is set");
} else {
  console.log("❌ ISY API is not configured or token is missing");
}
```

### Console Logs

The system provides detailed console logging:

```
🔄 Duplicating order to ISY API... POS-2026-001
✅ Order successfully duplicated to ISY API: { orderNumber: "POS-2026-001", isyOrderId: "xyz123" }
```

```
⚠️ Failed to duplicate order to ISY API: Authentication failed
📝 Added ISY order duplication to retry queue
```

```
🔄 Processing 5 pending ISY duplications...
✅ ISY duplication completed: POS-2026-001
⚠️ ISY duplication attempt 2 failed: POS-2026-002
❌ ISY duplication failed after 5 attempts: POS-2026-003
✅ ISY sync batch completed
```

## Offline Support

### Offline Behavior

When the POS is offline:

1. Orders are saved to Firebase (when back online)
2. ISY duplication is attempted when Firebase save succeeds
3. If ISY API is unreachable, order is added to retry queue
4. Background service retries when connection is restored

### Sync Queue

Failed duplications are stored in IndexedDB:

```javascript
{
  type: "isy_order_duplication",
  action: "duplicate",
  data: receiptData,
  status: "pending",
  attempts: 0,
  receiptId: "firebase-receipt-id",
  orderNumber: "POS-2026-001",
  timestamp: "2026-01-25T10:30:00.000Z"
}
```

## Maintenance

### Cleanup Old Sync Tasks

Remove completed sync tasks older than 7 days:

```javascript
import { cleanupCompletedSyncTasks } from "@/lib/services/isySyncService";

// Clean up tasks older than 7 days
const cleaned = await cleanupCompletedSyncTasks(7);
console.log(`Cleaned ${cleaned} old sync tasks`);
```

### Stop Sync Service

To stop the background service:

```javascript
import { stopISYSyncService } from "@/lib/services/isySyncService";

stopISYSyncService();
```

## Error Handling

### Non-Blocking Design

ISY duplication failures DO NOT block checkout:

- Orders always save to Firebase first
- ISY duplication happens after successful Firebase save
- Checkout completes successfully even if ISY duplication fails
- Failed duplications are queued for automatic retry

### Error Types

1. **Authentication Errors**
   - Token expired or invalid
   - User notified to refresh token
   - Not retried automatically

2. **Validation Errors**
   - Invalid data format
   - Missing required fields
   - Logged for investigation
   - Not retried automatically

3. **Network Errors**
   - Connection timeout
   - Server unreachable
   - Added to retry queue
   - Retried automatically

4. **Server Errors**
   - 5xx responses
   - Added to retry queue
   - Retried automatically

## Testing

### Test Order Duplication

1. Set up test environment:

   ```bash
   NEXT_PUBLIC_ISY_API_URL=https://test.api.isy.software
   NEXT_PUBLIC_ISY_API_ENABLED=true
   ```

2. Set test JWT token:

   ```javascript
   setISYApiToken("your-test-token");
   ```

3. Create a test order in POS

4. Check console logs for duplication status

5. Verify order appears in ISY system

### Test Retry Logic

1. Temporarily disable ISY API or use invalid URL
2. Create order - should fail and add to queue
3. Re-enable ISY API
4. Wait 60 seconds for automatic retry
5. Check console logs for retry success

### Test Offline Mode

1. Disconnect internet
2. Create order - should save locally
3. Reconnect internet
4. Order syncs to Firebase
5. ISY duplication attempted
6. If fails, added to retry queue

## Troubleshooting

### Orders Not Duplicating

1. **Check if ISY sync is enabled:**

   ```javascript
   console.log(process.env.NEXT_PUBLIC_ISY_API_ENABLED);
   // Should be "true"
   ```

2. **Check if token is set:**

   ```javascript
   const token = localStorage.getItem("isy_api_token");
   console.log("Token:", token ? "SET" : "NOT SET");
   ```

3. **Check API URL:**

   ```javascript
   console.log(process.env.NEXT_PUBLIC_ISY_API_URL);
   // Should be "https://api.isy.software"
   ```

4. **Check sync service is running:**
   - Open browser console
   - Look for "🚀 Starting ISY order sync service..."
   - Should appear on app load

### Failed Duplications Accumulating

1. **Check sync queue:**

   ```javascript
   import { getISYSyncStats } from "@/lib/services/isySyncService";
   const stats = await getISYSyncStats();
   console.log("Pending:", stats.pending);
   console.log("Failed:", stats.failed);
   ```

2. **Check if token expired:**
   - Look for "⚠️ ISY API token expired" in console
   - Refresh token and restart sync

3. **Check for validation errors:**
   - Look for "❌ ISY API validation failed" in console
   - Check data structure matches API specification

4. **Manually trigger retry:**
   ```javascript
   import { triggerISYSync } from "@/lib/services/isySyncService";
   await triggerISYSync();
   ```

### Authentication Issues

1. **Token expired:**
   - User sees warning toast
   - Obtain new token from ISY API
   - Call `setISYApiToken(newToken)`

2. **Invalid token:**
   - Check token format (should be JWT)
   - Verify token is not corrupted
   - Test token with ISY API directly

3. **Missing permissions:**
   - Token must have `pos:create_receipt` permission
   - Contact ISY API administrator

## Integration Checklist

- [x] Order duplication service created
- [x] Background sync service created
- [x] Sync initializer component created
- [x] Integrated into SalesSection checkout flow
- [x] Added to app layout
- [x] Environment variables configured
- [x] Error handling implemented
- [x] Retry logic implemented
- [x] Offline support added
- [x] Console logging added
- [x] Documentation created

## Next Steps

1. **Obtain ISY API Token**
   - Contact ISY API administrator
   - Get JWT token for your POS device/store
   - Set token using `setISYApiToken()`

2. **Test in Development**
   - Use test API endpoint if available
   - Create test orders
   - Verify duplication works

3. **Deploy to Production**
   - Update environment variables
   - Set production API URL
   - Monitor console logs for first few orders

4. **Monitor Performance**
   - Check sync statistics regularly
   - Clean up old sync tasks weekly
   - Monitor for failed duplications

## Support

For issues or questions:

- Check console logs for detailed error messages
- Verify configuration using troubleshooting steps
- Review sync statistics with `getISYSyncStats()`
- Check API specification in `POS_RECEIPT_API_SPECIFICATION.md`
