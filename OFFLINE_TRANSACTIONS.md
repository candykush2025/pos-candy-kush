# Offline Transactions Feature

## Overview

The POS system now supports **offline transaction processing** with automatic synchronization when the internet connection is restored. This ensures that sales can continue uninterrupted even without an internet connection.

## How It Works

### 1. **Offline Detection**

- The system automatically detects when the device goes offline
- An orange status bar appears at the top: "Offline Mode - Transactions will sync when online"

### 2. **Transaction Processing (Offline)**

When offline, transactions are:

- ✅ **Saved locally** to IndexedDB (browser database)
- ✅ **Added to sync queue** for later synchronization
- ✅ **Marked with "pending" sync status**
- ✅ **Updated in active shift** (locally)
- ✅ **Stock levels updated** (locally)

### 3. **Automatic Sync (When Back Online)**

When internet connection is restored:

- 📶 System detects online status automatically
- 🔄 Pending transactions are synced to Firebase
- ✅ Receipt status changes from "pending" to "synced"
- 🔔 User receives confirmation: "Sync completed successfully"

### 4. **Sync Queue Management**

- **Pending Badge**: Shows number of unsynced transactions
- **Automatic Retry**: Failed syncs are retried automatically
- **Background Processing**: Syncs happen in the background without interrupting work

## User Experience

### Offline Mode

```
┌─────────────────────────────────────────────┐
│ 📵 Offline Mode - Transactions will sync   │
│    when online                              │
└─────────────────────────────────────────────┘
```

- Cashiers can continue making sales normally
- Transactions are saved locally with "pending" status
- Toast notification: "Offline mode - Transaction will sync when online"

### Syncing Mode

```
┌─────────────────────────────────────────────┐
│ 🔄 3 transactions pending sync   [Syncing...]│
└─────────────────────────────────────────────┘
```

- Shows number of pending transactions
- Spinning icon indicates active sync
- Automatically disappears when complete

### Online Mode (No Pending)

```
[No status bar shown - all transactions synced]
```

## Technical Details

### Data Flow

#### Offline Transaction

```
1. User completes payment
2. Receipt saved to IndexedDB (local)
   - syncStatus: "pending"
   - syncedAt: null
3. Added to sync queue
4. Local shift updated
5. Stock updated locally
6. Transaction complete ✅
```

#### Online Transaction

```
1. User completes payment
2. Receipt saved to Firebase immediately
   - syncStatus: "synced"
   - syncedAt: [timestamp]
3. Also saved to IndexedDB (backup)
4. Shift updated in Firebase
5. Stock updated in Firebase
6. Transaction complete ✅
```

#### Sync Process (When Back Online)

```
1. Device comes online
2. System detects online status
3. Sync engine processes queue:
   - Get all "pending" receipts
   - Upload to Firebase one by one
   - Update local status to "synced"
   - Remove from sync queue
4. UI updated (badge removed)
5. User notified ✅
```

### Database Schema

#### IndexedDB (Local Storage)

**Orders Table**

```javascript
{
  orderNumber: "ORD-2024-001",
  status: "completed",
  total: 150.00,
  syncStatus: "pending", // or "synced"
  syncedAt: null,         // or ISO timestamp
  createdAt: "2024-11-18T10:30:00Z"
  // ... other fields
}
```

**Sync Queue Table**

```javascript
{
  type: "receipt",
  action: "create",
  data: { /* full receipt data */ },
  timestamp: "2024-11-18T10:30:00Z",
  status: "pending",
  attempts: 0,
  orderId: 123
}
```

#### Firebase (Cloud Storage)

**receipts Collection**

```javascript
{
  receipt_number: "ORD-2024-001",
  total_money: 150.00,
  syncStatus: "synced",
  syncedAt: Timestamp,
  created_at: Timestamp,
  // ... other fields
}
```

## Error Handling

### Scenarios Covered

1. **No Internet Connection**

   - ✅ Transactions saved locally
   - ✅ User can continue working
   - ✅ Auto-sync when online

2. **Intermittent Connection**

   - ✅ Attempts to sync immediately
   - ✅ Falls back to offline if fails
   - ✅ Retries automatically

3. **Firebase Unavailable**

   - ✅ Saves locally
   - ✅ Queues for sync
   - ✅ Retries with exponential backoff

4. **Sync Failure**
   - ✅ Marked as "error" in queue
   - ✅ Retried up to 3 times
   - ✅ Admin can manually retry

## Benefits

### For Cashiers

- ✅ **No interruption** during sales
- ✅ **Clear feedback** on sync status
- ✅ **Peace of mind** - data is safe locally

### For Business Owners

- ✅ **No lost sales** due to connection issues
- ✅ **Accurate records** - all transactions saved
- ✅ **Real-time visibility** of sync status

### Technical

- ✅ **Robust offline support**
- ✅ **Automatic conflict resolution**
- ✅ **Data integrity maintained**
- ✅ **Background synchronization**

## Testing

### Manual Test Scenarios

1. **Basic Offline Transaction**

   ```
   1. Turn off WiFi
   2. Make a sale
   3. Verify "pending" status
   4. Turn on WiFi
   5. Verify auto-sync occurs
   ```

2. **Multiple Offline Transactions**

   ```
   1. Turn off WiFi
   2. Make 5 sales
   3. Check sync queue shows "5 pending"
   4. Turn on WiFi
   5. Verify all 5 sync
   ```

3. **Shift Management Offline**
   ```
   1. Start shift (online)
   2. Turn off WiFi
   3. Make sales
   4. Verify shift totals update locally
   5. Turn on WiFi
   6. Verify shift syncs correctly
   ```

## Future Enhancements

- [ ] Conflict resolution UI for duplicate transactions
- [ ] Manual sync trigger button
- [ ] Sync history/audit log
- [ ] Batch upload optimization
- [ ] Progressive Web App (PWA) offline improvements
- [ ] Service Worker caching for assets

## Related Files

### Modified Files

- `src/components/pos/SalesSection.jsx` - Transaction processing logic
- `src/lib/sync/syncEngine.js` - Sync queue processing
- `src/lib/db/dbService.js` - IndexedDB operations
- `src/hooks/useOnlineStatus.js` - Online/offline detection

### Key Functions

- `handleCompletePayment()` - Transaction creation with offline support
- `processSyncItem()` - Sync queue item processing
- `pushPendingChanges()` - Batch sync execution
- `checkUnsyncedOrders()` - UI status updates

## Support

For issues or questions about offline transactions:

1. Check browser console for sync errors
2. Review IndexedDB for pending transactions
3. Verify Firebase connectivity
4. Check sync queue status in DevTools

---

**Version**: 1.0  
**Last Updated**: November 18, 2025  
**Status**: ✅ Production Ready
