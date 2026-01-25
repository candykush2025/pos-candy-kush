# ISY Sync - Quick Reference

## 🚀 Quick Start

### Access Debug Page

```
https://your-domain.com/debug/sync
```

### Check Configuration

```env
NEXT_PUBLIC_ISY_API_URL=https://api.isy.software
NEXT_PUBLIC_ISY_API_ENABLED=true
NEXT_PUBLIC_ISY_API_USERNAME=candykush_cashier
NEXT_PUBLIC_ISY_API_PASSWORD=admin123
```

## 📊 Monitoring

### Daily Checklist

- [ ] Check failed sync count (should be < 5%)
- [ ] Review recent error messages
- [ ] Retry failed syncs if network was down
- [ ] Clear old successful logs (weekly)

### Key Statistics

- **Total**: All sync attempts
- **Success**: ✅ Orders synced successfully
- **Failed**: ❌ Need attention/retry
- **Pending**: ⏳ In progress

## 🔧 Common Actions

### Retry Single Failed Sync

1. Find the failed order in the list
2. Click **Retry** button
3. Wait for confirmation toast

### Retry All Failed Syncs

1. Click **Retry All Failed** button
2. Confirm the bulk action
3. Wait for completion (shows count)

### Clear Successful Logs

1. Click **Clear Successful** button
2. Confirm deletion
3. Keeps database clean

### Search for Order

1. Use search bar
2. Type order number
3. Results filter automatically

## 🐛 Troubleshooting

### All Syncs Failing

```bash
# 1. Test API credentials manually
curl -u candykush_cashier:admin123 https://api.isy.software/pos/v1/orders

# 2. Check environment variables
# Restart Next.js server after changing .env.local

# 3. Check API status
# Contact ISY support if API is down
```

### Specific Order Failing

1. Click on the failed order
2. Read error message
3. Common errors:
   - **401**: Wrong credentials
   - **400**: Invalid order data
   - **500**: API server error
   - **Network error**: No internet

### Debug Page Not Loading

1. Check Firebase connection
2. Verify route exists: `/debug/sync`
3. Check browser console
4. Ensure UI components installed

## 📝 Error Messages Guide

| Error              | Cause             | Solution                    |
| ------------------ | ----------------- | --------------------------- |
| "Failed to fetch"  | No internet       | Check network, retry later  |
| "401 Unauthorized" | Wrong credentials | Fix .env.local credentials  |
| "400 Bad Request"  | Invalid data      | Check order data format     |
| "500 Server Error" | API issue         | Contact ISY support         |
| "Timeout"          | Slow connection   | Retry, check internet speed |
| "CORS error"       | API config        | Contact ISY support         |

## 🔍 Where to Find Info

### Sync Logs

- **Location**: Firebase Firestore
- **Collection**: `syncReceipts`
- **Access**: Via debug page or Firebase Console

### Order Data

- **Location**: Firebase Firestore
- **Collection**: `receipts`
- **Contains**: Original order data

### API Documentation

- **File**: `ISY_API_DOCUMENTATION.md`
- **Includes**: Complete API reference

### Implementation Details

- **File**: `ISY_SYNC_IMPLEMENTATION_COMPLETE.md`
- **Includes**: Architecture, flow, code

## 🚨 When to Alert

### Critical (Immediate Action)

- Failed syncs > 10% of total
- All syncs failing for > 1 hour
- Same error on all syncs
- API returning 401/403 (auth issues)

### Warning (Check Soon)

- Failed syncs > 5% of total
- Sync duration > 5 seconds
- Multiple 400 errors (data issues)
- Pattern of failures

### Info (No Immediate Action)

- Occasional failed syncs (< 5%)
- Individual network errors
- Successful syncs

## 🧪 Testing Commands

### Test Single Sync

```javascript
// In browser console on POS page
const {
  duplicateOrderToISY,
} = require("@/lib/services/orderDuplicationService");

// Get a receipt from Firebase
// Then test sync
duplicateOrderToISY(receiptData, currentUser);
```

### Check Firebase Logs

```javascript
// In Firebase Console
// Go to Firestore > syncReceipts
// Filter by status == "failed"
// Review error messages
```

### Verify API Access

```bash
# Terminal test
curl -X POST https://api.isy.software/pos/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic Y2FuZHlrdXNoX2Nhc2hpZXI6YWRtaW4xMjM=" \
  -d '{"test": "data"}'
```

## 📋 Maintenance Schedule

### Daily

- Check debug page statistics
- Review failed syncs
- Retry if appropriate

### Weekly

- Clear successful logs
- Review error patterns
- Update documentation

### Monthly

- Analyze sync performance
- Review data retention
- Update credentials if needed

## 🔐 Security Notes

- Debug page has **customer data** - keep secure
- Don't share sync logs publicly
- Consider adding authentication to `/debug/*`
- Rotate API credentials quarterly

## 📞 Support Contacts

### ISY API Issues

- Contact ISY support team
- Provide error messages from sync logs
- Include order numbers that failed

### POS System Issues

- Check Firebase connection
- Review browser console errors
- Check environment configuration

## 🎯 Success Metrics

### Healthy System

- ✅ Success rate > 95%
- ✅ Average duration < 1 second
- ✅ No recurring error patterns
- ✅ Failed syncs resolved within 24h

### Needs Attention

- ⚠️ Success rate < 95%
- ⚠️ Average duration > 2 seconds
- ⚠️ Same error recurring
- ⚠️ Failed syncs accumulating

## 🔗 Related Files

```
src/
├── lib/services/
│   └── orderDuplicationService.js    # Main sync logic
├── app/
│   └── debug/sync/
│       └── page.jsx                  # Debug UI
└── components/pos/
    └── SalesSection.jsx             # POS integration

Documentation/
├── ISY_API_DOCUMENTATION.md         # API reference
├── ISY_SYNC_DEBUG_GUIDE.md         # Debug page guide
└── ISY_SYNC_IMPLEMENTATION_COMPLETE.md  # Full implementation
```

## 💡 Tips

1. **Keep logs clean**: Clear successful logs regularly
2. **Monitor patterns**: Look for recurring errors
3. **Act quickly**: Retry failed syncs promptly
4. **Document issues**: Note solutions for future reference
5. **Test changes**: After fixing issues, test with a real sale

## 🚀 Quick Commands

### Start Dev Server

```bash
npm run dev
```

### View Debug Page

```bash
# Navigate to:
http://localhost:3000/debug/sync
```

### Check Environment

```bash
# Verify .env.local exists and has:
cat .env.local | grep ISY
```

### View Firebase Logs

```bash
# Firebase Console
# Project > Firestore Database > syncReceipts
```

---

**Need more help?** Check the full documentation:

- `ISY_SYNC_IMPLEMENTATION_COMPLETE.md` - Complete guide
- `ISY_SYNC_DEBUG_GUIDE.md` - Debug page usage
- `ISY_API_DOCUMENTATION.md` - API reference
