# ISY Order Duplication - Quick Start

## What Was Implemented

✅ **Automatic Order Duplication** - Every POS order is now automatically sent to `api.isy.software`
✅ **Real-time Sync** - Orders duplicate immediately after checkout
✅ **Automatic Retry** - Failed duplications retry automatically (up to 5 attempts)
✅ **Offline Support** - Orders queue when offline and sync when back online
✅ **Background Service** - Runs every 60 seconds to process pending duplications
✅ **Admin Panel** - Monitor sync status and manage configuration at `/admin/isy-sync`

## Files Created/Modified

### New Files

1. `src/lib/services/orderDuplicationService.js` - Main duplication logic
2. `src/lib/services/isySyncService.js` - Background retry service
3. `src/components/ISYSyncInitializer.jsx` - Auto-start component
4. `src/app/admin/isy-sync/page.jsx` - Admin monitoring panel
5. `ISY_ORDER_DUPLICATION_GUIDE.md` - Complete documentation

### Modified Files

1. `src/components/pos/SalesSection.jsx` - Added duplication call after Firebase save
2. `src/app/layout.js` - Added ISYSyncInitializer component
3. `.env.local` - Added ISY API configuration

## Quick Setup

### 1. Configuration

The system is pre-configured with:

```bash
NEXT_PUBLIC_ISY_API_URL=https://api.isy.software
NEXT_PUBLIC_ISY_API_ENABLED=true
```

### 2. Set JWT Token

Get JWT token from ISY API administrator, then either:

**Option A: Via Admin Panel (Recommended)**

1. Go to `/admin/isy-sync`
2. Enter JWT token in "JWT Token" field
3. Click "Save Token"

**Option B: Via Code**

```javascript
import { setISYApiToken } from "@/lib/services/orderDuplicationService";
setISYApiToken("your-jwt-token-here");
```

### 3. Test

1. Create a test order in POS
2. Check browser console for:
   ```
   🔄 Duplicating order to ISY API... POS-2026-XXX
   ✅ Order successfully duplicated to ISY API
   ```
3. Verify order appears in ISY system

## How It Works

```
Customer Checkout
    ↓
Save to Firebase ✓
    ↓
Duplicate to ISY API
    ├─ Success ✅
    └─ Failure → Add to Queue
            ↓
    Background Service (every 60s)
            ↓
    Retry (up to 5 times)
            ├─ Success ✅
            └─ Max Retries → Mark Failed ❌
```

## Monitoring

### Admin Panel

Access: `/admin/isy-sync`

Features:

- View sync statistics (pending, completed, failed)
- Manual sync trigger
- Token management
- Cleanup old tasks

### Browser Console

The system logs all activities:

- `✅` Success messages
- `⚠️` Warning messages
- `❌` Error messages
- `🔄` Sync activities

## API Endpoint

```
POST https://api.isy.software/pos/v1/orders
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:** Complete POS receipt data (see `POS_RECEIPT_API_SPECIFICATION.md`)

**Response:**

```json
{
  "success": true,
  "data": {
    "orderId": "server-id",
    "orderNumber": "POS-2026-001"
  }
}
```

## Retry Logic

- **Automatic:** Up to 5 attempts with exponential backoff
- **Interval:** Background service runs every 60 seconds
- **Will Retry:** Network errors, server errors (5xx)
- **Won't Retry:** Auth errors (401), validation errors (400)

## Data Flow

Every order includes:

- Order details (number, totals, items)
- Customer information
- Payment details
- Points & cashback
- Employee/cashier info
- Timestamps

Complete data structure: See `ORDER_DUPLICATION_API_DOCUMENTATION.md`

## Troubleshooting

### Orders Not Duplicating?

1. **Check token is set:**
   - Go to `/admin/isy-sync`
   - Status should show "Configured"

2. **Check console logs:**
   - Look for duplication messages
   - Check for error details

3. **Manual sync:**
   - Go to `/admin/isy-sync`
   - Click "Manual Sync"

### Common Issues

**Token Expired**

- Symptom: "⚠️ ISY API token expired"
- Solution: Get new token and set via admin panel

**Validation Failed**

- Symptom: "❌ ISY API validation failed"
- Solution: Check data structure in console logs

**Network Error**

- Symptom: "Network error" in console
- Solution: Orders auto-queue and retry when online

## Next Steps

1. ✅ Set JWT token via `/admin/isy-sync`
2. ✅ Test with a few orders
3. ✅ Monitor sync statistics
4. ✅ Verify orders in ISY system
5. ✅ Enable in production

## Support

- **Documentation:** See `ISY_ORDER_DUPLICATION_GUIDE.md`
- **API Spec:** See `POS_RECEIPT_API_SPECIFICATION.md`
- **Admin Panel:** `/admin/isy-sync`
- **Console Logs:** F12 → Console tab

## Important Notes

⚠️ **Non-Blocking Design**

- Checkout always completes successfully
- ISY duplication happens in background
- Failed duplications don't affect POS operations

⚠️ **Token Security**

- Tokens stored in localStorage
- Clear token on logout
- Refresh before expiration

⚠️ **Offline Mode**

- Orders queue automatically
- Sync when connection restored
- No data loss

## Success Indicators

✅ Console shows "✅ Order successfully duplicated"
✅ Admin panel shows increasing "Completed" count
✅ Orders appear in ISY system
✅ No pending or failed duplications accumulating

---

**Status:** Ready for Production ✅
**Last Updated:** January 25, 2026
