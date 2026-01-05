# 🔍 Product Duplication Root Cause Analysis

## Summary

Your products are being duplicated by the **Loyverse Integration Sync** in `/admin/integration`. The sync is working correctly by design, but there are scenarios that can cause duplicates.

---

## 🎯 Root Causes Found

### 1. **Auto-Sync Running Too Frequently** ⚠️ HIGH RISK

**Location:** `src/app/admin/integration/page.js` lines 90-156

```javascript
// Auto-sync check every minute
useEffect(() => {
  if (!autoSyncEnabled) return;

  const checkAutoSync = async () => {
    // If time >= syncIntervalMinutes, run sync
    if (minutesSinceSync >= syncIntervalMinutes) {
      await handleSyncCategories(true);
      await handleSyncItems(true); // ⚠️ THIS SYNCS PRODUCTS
      await handleSyncCustomers(true);
    }
  };

  // Check every 60 seconds
  const interval = setInterval(checkAutoSync, 60000);
}, [autoSyncEnabled, syncIntervalMinutes, syncing]);
```

**Problem:** If `autoSyncEnabled = true`, the system syncs products every X minutes (default 30 min). If Loyverse has duplicate items or the sync runs while another sync is in progress, you get duplicates.

---

### 2. **Manual "Sync All" Button Clicked Multiple Times** ⚠️ MEDIUM RISK

**Location:** `src/app/admin/integration/page.js` line 1481

```javascript
const handleSyncAll = async () => {
  toast.info("Starting full sync...");
  await handleSyncCategories(false);
  await handleSyncItems(false); // ⚠️ Can be triggered multiple times
  await handleSyncCustomers(false);
  toast.success("🎉 Full sync completed!");
};
```

**Problem:** If user clicks "Sync All" or "Sync Items" button multiple times rapidly (double-click, impatient clicking), multiple sync operations run in parallel or sequentially, potentially creating duplicates.

---

### 3. **Loyverse API Returns Duplicate Items** ⚠️ POSSIBLE

**Location:** `src/app/admin/integration/page.js` line 557

```javascript
const response = await loyverseService.getAllItems({
  show_deleted: false,
});
```

**Problem:** If Loyverse API itself has duplicate products (same item with different IDs), the sync will faithfully copy all duplicates into Firebase.

---

### 4. **Race Condition in Batch Processing** ⚠️ LOW RISK

**Location:** `src/app/admin/integration/page.js` lines 306-374

```javascript
const batchSize = 50;
for (let i = 0; i < documents.length; i += batchSize) {
  const batch = documents.slice(i, i + batchSize);
  const promises = batch.map(async (doc) => {
    const docId = doc[idField]; // Uses item.id from Loyverse
    const existing = existingMap.get(docId);

    if (needsUpdate(existing, doc)) {
      await setDocument(collectionName, docId, docToSave); // ⚠️ CREATES NEW IF ID IS NEW
    }
  });
  await Promise.all(promises);
}
```

**Problem:** The sync uses `doc.id` (Loyverse item ID) as the Firebase document ID. If:

- Loyverse changes item IDs (rare but possible)
- API returns temporary/variant IDs instead of item IDs
- Network issues cause partial syncs that retry with different data

Then you get multiple Firebase documents for the same product.

---

## 🔍 How to Identify the Cause

### Check 1: Is Auto-Sync Enabled?

1. Go to `/admin/integration` page
2. Look for "Auto Sync Settings" section
3. Check if toggle is ON (enabled)
4. Check the interval (default 30 minutes)

**If enabled:** Your products are syncing automatically every X minutes!

### Check 2: Check Sync History

1. In `/admin/integration`, scroll to "Sync History" section
2. Look at timestamps - are syncs happening within seconds of each other?
3. Check for "Items" entries with matching timestamps

**Example Problem Pattern:**

```
2025-12-22 10:00:05 - Items: 150 synced (auto)
2025-12-22 10:00:15 - Items: 150 synced (manual)
2025-12-22 10:00:23 - Items: 150 synced (manual)
```

☝️ This shows 3 syncs in 18 seconds = HIGH DUPLICATION RISK

### Check 3: Check Your Duplicates' Created Dates

Use the product duplication scanner at `/debug/product-duplication-scanner`:

1. Look at the "Created Date" column for duplicates
2. If duplicates are created within **seconds** of each other → **Multiple sync clicks**
3. If duplicates are created **30 minutes apart** → **Auto-sync**
4. If duplicates are created **randomly** → **Loyverse API issue**

---

## ✅ Solutions & Fixes

### Solution 1: Disable Auto-Sync (RECOMMENDED)

**File:** Navigate to `/admin/integration` in browser
**Action:** Turn OFF the "Enable Auto Sync" toggle

**Why:** Auto-sync can cause race conditions and unnecessary duplicate syncs.

### Solution 2: Add Sync Lock to Prevent Concurrent Syncs

**File:** `src/app/admin/integration/page.js`

Add this check at the start of `handleSyncItems`:

```javascript
const handleSyncItems = async (isAutoSync = false) => {
  // ✅ PREVENT CONCURRENT SYNCS
  if (syncing.items) {
    console.warn("⚠️ Sync already in progress, skipping...");
    if (!isAutoSync) {
      toast.warning("Sync already in progress. Please wait...");
    }
    return;
  }

  setSyncing({ ...syncing, items: true });
  // ... rest of sync code
};
```

### Solution 3: Add Duplicate Detection Before Syncing

**File:** `src/app/admin/integration/page.js`

Modify the `smartSync` function to check for duplicates by **name + SKU + barcode**:

```javascript
const smartSync = async (collectionName, documents, idField = "id") => {
  // ... existing code ...

  // NEW: Build name/sku/barcode map to detect Loyverse duplicates
  if (collectionName === COLLECTIONS.PRODUCTS) {
    const seenProducts = new Map();
    const duplicates = [];

    documents.forEach((doc) => {
      const key = `${doc.name}|${doc.sku}|${doc.barcode}`.toLowerCase();
      if (seenProducts.has(key)) {
        duplicates.push({
          original: seenProducts.get(key),
          duplicate: doc,
        });
      } else {
        seenProducts.set(key, doc);
      }
    });

    if (duplicates.length > 0) {
      console.warn(
        `⚠️ Found ${duplicates.length} duplicate products in Loyverse data!`
      );
      console.table(
        duplicates.map((d) => ({
          name: d.duplicate.name,
          sku: d.duplicate.sku,
          originalId: d.original.id,
          duplicateId: d.duplicate.id,
        }))
      );
    }
  }

  // ... continue with sync ...
};
```

### Solution 4: Add Debouncing to Sync Buttons

**File:** `src/app/admin/integration/page.js`

```javascript
const [syncButtonDisabled, setSyncButtonDisabled] = useState(false);

const handleSyncItems = async (isAutoSync = false) => {
  if (syncButtonDisabled && !isAutoSync) {
    toast.warning("Please wait before syncing again");
    return;
  }

  setSyncButtonDisabled(true);
  setSyncing({ ...syncing, items: true });

  try {
    // ... sync code ...
  } finally {
    setSyncing({ ...syncing, items: false });
    setTimeout(() => setSyncButtonDisabled(false), 5000); // 5 second cooldown
  }
};
```

### Solution 5: Use Composite Key for Product Identification

**File:** `src/app/admin/integration/page.js`

Instead of using Loyverse `item.id`, use a composite key:

```javascript
const items = response.items.map((item) => {
  const primaryVariant = item.variants?.[0] || {};

  // ✅ CREATE STABLE ID FROM NAME + SKU
  const stableId = `${item.item_name}_${primaryVariant.sku}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_");

  return {
    id: stableId, // Use stable ID instead of Loyverse ID
    loyverseId: item.id, // Keep original ID as reference
    // ... rest of fields
  };
});
```

---

## 🚨 Immediate Action Plan

1. **RIGHT NOW:**

   - Go to `/admin/integration`
   - Check if "Enable Auto Sync" is ON
   - If YES, turn it OFF immediately

2. **Check Your Data:**

   - Go to `/debug/product-duplication-scanner`
   - Look at created dates of duplicates
   - Note the time differences

3. **Clean Up:**

   - Use the bulk delete feature in the scanner
   - Select all duplicate products (keep oldest/newest)
   - Delete them

4. **Prevent Future Duplicates:**
   - Apply **Solution 2** (Sync Lock)
   - Apply **Solution 4** (Debouncing)
   - Test by clicking sync multiple times rapidly

---

## 📊 Expected Results After Fixes

### Before Fixes:

- Multiple sync operations run concurrently
- Products duplicated every 30 minutes (if auto-sync on)
- Button clicks create instant duplicates
- 100+ duplicate products in database

### After Fixes:

- Only one sync can run at a time
- Auto-sync disabled (or properly controlled)
- Buttons have 5-second cooldown
- Clean product database with no duplicates

---

## 🔧 How to Test the Fix

1. Enable your fixes in `integration/page.js`
2. Go to `/admin/integration`
3. Click "Sync Items" button **5 times rapidly**
4. Expected: Only ONE sync runs, others are ignored
5. Check console: Should see "Sync already in progress" messages
6. Go to `/debug/product-duplication-scanner`
7. Expected: NO new duplicates created

---

## 📝 Monitoring Checklist

After applying fixes, monitor for 24 hours:

- [ ] Check sync history - no duplicate timestamps
- [ ] Check product count - should stabilize, not grow
- [ ] Check console logs - no "Sync already in progress" spam
- [ ] Check duplication scanner - no new duplicates
- [ ] Test manual sync - button cooldown works
- [ ] Test auto-sync (if enabled) - runs at correct intervals

---

## 🎯 Summary

**The Problem:** Your integration sync creates duplicate products when:

1. Auto-sync is enabled and runs every 30 minutes
2. User clicks sync buttons multiple times
3. Multiple syncs run concurrently
4. Loyverse API returns duplicate items

**The Solution:**

1. Disable auto-sync (immediate fix)
2. Add sync lock to prevent concurrent operations
3. Add button debouncing
4. Add duplicate detection in sync logic

**Priority Actions:**

1. ✅ Disable auto-sync NOW
2. ✅ Clean existing duplicates with scanner
3. ✅ Apply sync lock fix (Solution 2)
4. ✅ Apply debouncing fix (Solution 4)
5. ✅ Test thoroughly before re-enabling auto-sync

---

**Questions? Check:**

- Sync History: `/admin/integration` → Scroll down
- Product Duplicates: `/debug/product-duplication-scanner`
- Console Logs: Browser DevTools → Console tab
