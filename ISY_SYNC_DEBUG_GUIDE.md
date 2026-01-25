# ISY Sync Debug Guide

## Overview

The ISY Sync Debug page is a developer-only tool for monitoring and managing order synchronization between the POS system and api.isy.software.

**Access:** `https://your-domain.com/debug/sync`

## Purpose

- Monitor all order sync attempts (success and failures)
- Retry failed synchronizations
- View detailed error logs
- Manage sync history
- Track sync statistics

## Features

### 1. Statistics Dashboard

Shows real-time statistics:

- **Total Syncs**: All sync attempts
- **Successful**: Successfully synced orders
- **Failed**: Failed sync attempts that need attention
- **Pending**: Syncs in progress

### 2. Filter Options

Filter sync logs by status:

- **All**: View all sync attempts
- **Success**: Only successful syncs
- **Failed**: Only failed syncs
- **Pending**: Only pending/in-progress syncs

### 3. Search

Search for specific orders by order number using the search bar.

### 4. Action Buttons

#### Refresh

- Reloads sync logs from Firebase
- Updates statistics
- Click when you want to see the latest sync status

#### Retry All Failed

- Retries all failed sync attempts in bulk
- Shows progress with toast notifications
- Useful after fixing API issues or network problems
- Automatically creates new sync logs for each retry attempt

#### Clear Successful

- Removes all successful sync logs from Firebase
- Helps keep the database clean
- Only removes successful logs, keeps failed ones for debugging

### 5. Individual Sync Log Actions

Each sync log entry shows:

**Status Badge:**

- 🟢 **Success**: Order successfully synced to ISY API
- 🔴 **Failed**: Sync attempt failed
- 🟡 **Pending**: Sync in progress

**Information Displayed:**

- Order number
- Attempt timestamp
- Duration (in milliseconds)
- Error message (if failed)
- HTTP status code
- ISY Order ID (if successful)

**Action Buttons:**

- **Retry**: Retry a single failed sync (only visible for failed syncs)
- **Delete**: Remove the sync log from Firebase

## Sync Log Structure

Each sync log in Firebase `syncReceipts` collection contains:

```javascript
{
  // Identification
  orderNumber: "ORD-2024-001",
  receiptId: "firebase_receipt_id",

  // Timing
  attemptedAt: "2024-01-15T10:30:00Z",
  createdAt: Timestamp,
  duration: 1234, // milliseconds

  // Status
  status: "success" | "failed" | "pending",

  // API Details
  apiUrl: "https://api.isy.software/pos/v1/orders",
  httpStatus: 200,

  // Success Details
  isyOrderId: "ISY-12345", // Only if successful

  // Error Details (if failed)
  error: "Connection timeout",
  errorCode: "ECONNABORTED",
  errorDetails: {},

  // Retry Data (stored for retry functionality)
  orderData: { /* full order data */ },
  cashierId: "cashier_id",
  cashierName: "John Doe"
}
```

## Use Cases

### 1. Monitor Sync Health

Check the statistics to see if orders are syncing properly:

- High success rate = healthy sync
- Many failures = investigate connectivity or API issues

### 2. Retry Failed Syncs

When syncs fail due to temporary issues:

1. Check the error message to understand why it failed
2. Fix the underlying issue (network, API credentials, etc.)
3. Click "Retry All Failed" to resync all failed orders
4. Or click "Retry" on individual orders

### 3. Debug API Issues

When investigating sync problems:

1. Filter by "Failed" status
2. Look at error messages and HTTP status codes
3. Check duration to identify timeout issues
4. Verify API credentials in Configuration section

### 4. Clean Up Old Logs

To keep the database clean:

1. Click "Clear Successful" to remove old successful sync logs
2. Delete individual logs that are no longer needed
3. Failed logs should be kept until resolved or investigated

## Common Error Scenarios

### Network Errors

- **Error**: "Failed to fetch" or "Network request failed"
- **Cause**: No internet connection or API server unreachable
- **Solution**: Check network connection, verify API URL

### Authentication Errors

- **HTTP 401**: Invalid credentials
- **Cause**: Wrong username/password in environment variables
- **Solution**: Verify NEXT_PUBLIC_ISY_API_USERNAME and NEXT_PUBLIC_ISY_API_PASSWORD

### Server Errors

- **HTTP 500-599**: Server-side error
- **Cause**: API server issue
- **Solution**: Contact ISY API support, retry later

### Timeout Errors

- **Error**: "ECONNABORTED" or "Timeout"
- **Cause**: Request took too long
- **Solution**: Check internet speed, retry

### Validation Errors

- **HTTP 400**: Bad request
- **Cause**: Invalid order data format
- **Solution**: Check order data structure matches API requirements

## Configuration Section

Shows current configuration:

- **API URL**: The ISY API endpoint
- **Username**: Authentication username
- **Sync Enabled**: Whether sync is active

## Best Practices

1. **Regular Monitoring**: Check the debug page daily during initial deployment
2. **Clean Up**: Clear successful logs weekly to keep database lean
3. **Investigate Failures**: Don't ignore failed syncs - investigate and retry
4. **Test Retries**: Test retry functionality with a single failed order first
5. **Document Patterns**: Note recurring errors and address root causes

## Silent Operation

Important: This sync happens **silently in the background**:

- Cashiers see no sync UI or notifications
- All sync status is logged to Firebase
- Only developers access this debug page
- Customers are unaffected by sync status

## Troubleshooting

### Sync logs not appearing

- Check if NEXT_PUBLIC_ISY_API_ENABLED is set to "true"
- Verify Firebase connection
- Check browser console for errors

### Retry not working

- Ensure orderData is stored in the sync log
- Check API credentials in .env.local
- Verify network connection

### Statistics not updating

- Click "Refresh" button
- Check Firebase read permissions
- Verify Firestore security rules

## Security Notes

- This page should only be accessible to developers/administrators
- Consider adding authentication to /debug/\* routes
- Don't share sync logs publicly (may contain customer data)
- Regularly clean up old logs to minimize data exposure

## Integration

The debug page integrates with:

- **Firebase Firestore**: Stores sync logs in `syncReceipts` collection
- **orderDuplicationService**: Handles retry logic
- **ISY API**: Endpoint for order synchronization

## Future Enhancements

Potential improvements:

- Real-time updates using Firebase listeners
- Export logs to CSV
- Advanced filtering (date range, cashier, etc.)
- Sync performance analytics
- Automatic retry scheduling
- Email alerts for sync failures
