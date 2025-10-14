# Quick Start: Loyverse Receipt Sync

## 🚀 What's New?

Every sale in your POS now automatically syncs to Loyverse! You'll see sync status badges in the History tab showing whether each transaction successfully synced.

## ✅ Setup (5 minutes)

### Step 1: Update Store Configuration

Edit `src/config/constants.js`:

```javascript
export const LOYVERSE_CONFIG = {
  STORE_ID: "YOUR-ACTUAL-STORE-ID", // ← Change this
  DEFAULT_PAYMENT_TYPE_ID: "YOUR-PAYMENT-ID", // ← And this
  SOURCE_NAME: "Candy Kush POS",
};
```

**How to get your IDs:**

1. Open Loyverse Dashboard
2. Go to Settings → Stores
3. Copy your Store ID
4. For Payment ID, use existing payment type or create one

### Step 2: Test the Integration

1. Start your POS system
2. Complete a test sale
3. Check the History tab
4. Look for green "✓ Synced" badge
5. Click "View Details" to see Loyverse receipt number
6. Verify in Loyverse Dashboard

## 📱 Using the Feature

### For Cashiers

**Normal Sale:**

1. Complete sale as usual
2. System automatically syncs to Loyverse
3. Receipt shows in History with sync status

**What the badges mean:**

- ✅ **Green "Synced"** = Successfully in Loyverse ✓
- ⏱️ **Yellow "Pending"** = Waiting to sync
- 📴 **Gray "Offline"** = Created while offline
- ❌ **Red "Failed"** = Sync error (notify manager)

### For Managers

**Check Sync Health:**

1. Open POS → History tab
2. Scan for red "Failed" badges
3. Click "View Details" on failed receipts
4. Read error message
5. Take appropriate action

**Common Issues:**

| Error               | Solution                                      |
| ------------------- | --------------------------------------------- |
| Invalid variant_id  | Product not in Loyverse - sync products       |
| Network timeout     | Check internet connection                     |
| Invalid store_id    | Update STORE_ID in constants.js               |
| Rate limit exceeded | Wait a few minutes, reduce transaction volume |

## 🎯 What Happens During Checkout

```
1. Cashier clicks "Complete Payment"
   ↓
2. System sends receipt to Loyverse API
   ↓
3. Success? Set status = "synced" ✓
   Failed? Set status = "failed" with error
   Offline? Set status = "offline"
   ↓
4. Save to Firebase (always, regardless of sync)
   ↓
5. Save to IndexedDB (local backup)
   ↓
6. Show receipt to cashier
```

## 🔍 Viewing Sync Status

### In History List

Each receipt card shows:

```
┌─────────────────────────────────────┐
│ #ORD-20241014-001      $168.76     │
│ Candy Kush POS                      │
│                                     │
│ [SALE] [✓ Synced] [This Device]   │
│         ↑         ↑                 │
│    Sync status   Local receipt     │
└─────────────────────────────────────┘
```

### In Receipt Details

Click "View Details" to see:

```
┌─────────────────────────────────────┐
│ Sync Status                         │
│ ─────────────────────────────────── │
│ [✓ Synced]                         │
│ [This Device]                       │
│ [Loyverse #2-1009]                 │
│                                     │
│ Synced: Oct 14, 2024 12:30 PM     │
└─────────────────────────────────────┘
```

With error:

```
┌─────────────────────────────────────┐
│ [✗ Failed] [This Device]           │
│                                     │
│ ┌─────────────────────────────────┐│
│ │ Sync Error:                     ││
│ │ Invalid variant_id              ││
│ └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

## 🛠️ Troubleshooting

### Problem: All receipts show "Failed"

**Check:**

1. Is STORE_ID correct in constants.js?
2. Is internet connected?
3. Is Loyverse API access token valid?

**Fix:**

1. Verify store ID matches your Loyverse account
2. Test internet: `ping api.loyverse.com`
3. Check API token in `/src/app/api/loyverse/route.js`

### Problem: Receipts show "Offline" but internet is working

**Possible causes:**

1. Browser thinks it's offline
2. Firewall blocking API calls
3. API endpoint unreachable

**Fix:**

1. Check `navigator.onLine` in browser console
2. Check browser's network inspector
3. Try accessing Loyverse API directly

### Problem: Sync works but data is wrong in Loyverse

**Check:**

1. Are products synced from Loyverse first?
2. Are variant IDs correct?
3. Is store ID correct?

**Fix:**

1. Run full product sync from Integration page
2. Verify variant_id matches Loyverse
3. Double-check STORE_ID

## 📊 Monitoring

### Daily Checklist

- [ ] Check History for failed syncs
- [ ] Review any error messages
- [ ] Verify recent sales appear in Loyverse
- [ ] Check sync success rate

### Weekly Review

- [ ] Count failed vs successful syncs
- [ ] Identify patterns in failures
- [ ] Update product data if needed
- [ ] Review Loyverse dashboard for accuracy

## 🔐 Security Notes

- ✅ Access token stored server-side only
- ✅ Never exposed to client
- ✅ All API calls proxied through Next.js
- ✅ No sensitive data in browser storage

## 🎓 Training Resources

### For New Cashiers (5 min)

1. Show sync status badges in History
2. Explain what each color means
3. What to do if they see red "Failed"
4. Normal: green "Synced" is good ✓

### For Managers (15 min)

1. How to check sync health
2. Reading error messages
3. Common fixes
4. When to contact support
5. Verifying data in Loyverse

## 📞 Support

### Quick Fixes

1. **Failed sync** → Check error in details, verify product in Loyverse
2. **Offline** → Normal if internet down, will need manual sync later
3. **Pending** → Wait a moment, refresh History
4. **All failed** → Check constants.js configuration

### Need Help?

1. Check error message in receipt details
2. Review documentation in `/LOYVERSE_RECEIPT_SYNC.md`
3. Check Loyverse API status
4. Review sync logs in browser console

## ⚙️ Configuration Reference

### Required Settings

In `src/config/constants.js`:

```javascript
export const LOYVERSE_CONFIG = {
  STORE_ID: "42dc2cec-6f40-11ea-bde9-1269e7c5a22d",
  DEFAULT_PAYMENT_TYPE_ID: "42dd2a55-6f40-11ea-bde9-1269e7c5a22d",
  SOURCE_NAME: "Candy Kush POS",
};

export const FEATURES = {
  LOYVERSE_SYNC: true, // Set to false to disable
};
```

### Disabling Sync (Emergency)

If you need to temporarily disable sync:

```javascript
export const FEATURES = {
  LOYVERSE_SYNC: false, // Disable sync
};
```

This will:

- ✅ Stop API calls to Loyverse
- ✅ Still save receipts to Firebase
- ✅ Keep all other functionality working
- ✅ No data loss

## 📈 Success Metrics

Track these to ensure healthy sync:

- ✅ 95%+ receipts showing "Synced" status
- ✅ Less than 5% "Failed" status
- ✅ Zero "Pending" older than 5 minutes
- ✅ Average sync time under 2 seconds

## 🎯 Next Steps

### Immediate (Today)

1. ✅ Update STORE_ID and PAYMENT_TYPE_ID
2. ✅ Test with sample transaction
3. ✅ Verify in Loyverse Dashboard
4. ✅ Train cashiers on new badges

### This Week

1. Monitor sync success rate
2. Review any failed syncs
3. Optimize configuration if needed
4. Gather user feedback

### This Month

1. Implement background sync queue
2. Add auto-retry for failed syncs
3. Create sync management dashboard
4. Link customers/employees

## 📚 Related Documentation

- **Full Feature Guide**: `/LOYVERSE_RECEIPT_SYNC.md`
- **Implementation Details**: `/IMPLEMENTATION_SUMMARY.md`
- **Badge Reference**: `/SYNC_STATUS_BADGES.md`
- **Future Enhancements**: `/SYNC_TODO.md`
- **Loyverse API Docs**: https://developer.loyverse.com/

## ✨ That's It!

You're all set! Every sale now automatically syncs to Loyverse with full status tracking. Watch for those green "✓ Synced" badges in History! 🎉
