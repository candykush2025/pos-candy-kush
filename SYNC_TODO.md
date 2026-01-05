# Loyverse Sync - Future Enhancements

## Priority 1: Critical Features (Next Sprint)

### 1. Background Sync Queue

**Priority: HIGH**  
**Effort: Medium**  
**Impact: High**

- [ ] Create sync queue service
- [ ] Store failed/offline receipts in queue
- [ ] Auto-retry every 5 minutes
- [ ] Max 3 retry attempts
- [ ] UI indicator for queue size
- [ ] Manual retry button in history

**Files to modify:**

- Create: `src/lib/sync/loyverseSyncQueue.js`
- Modify: `src/components/pos/SalesSection.jsx`
- Modify: `src/components/pos/HistorySection.jsx`

**Implementation notes:**

```javascript
// Add to IndexedDB
const syncQueue = await db.syncQueue.add({
  type: "receipt",
  receiptId: receipt.id,
  data: receiptData,
  attempts: 0,
  lastAttempt: null,
  error: null,
  createdAt: new Date(),
});

// Background worker
setInterval(async () => {
  const pending = await db.syncQueue.where("attempts").below(3).toArray();

  for (const item of pending) {
    await retrySync(item);
  }
}, 5 * 60 * 1000); // Every 5 minutes
```

---

### 2. Offline-to-Online Auto-Sync

**Priority: HIGH**  
**Effort: Low**  
**Impact: High**

- [ ] Listen for online event
- [ ] Auto-sync all offline receipts
- [ ] Show sync progress notification
- [ ] Update receipt status after sync
- [ ] Real-time UI updates

**Files to modify:**

- Modify: `src/components/pos/SalesSection.jsx`
- Modify: `src/hooks/useOnlineStatus.js`

**Implementation notes:**

```javascript
useEffect(() => {
  const handleOnline = async () => {
    const offlineReceipts = await receiptsService.getAll({
      where: [["syncStatus", "==", "offline"]],
    });

    toast.info(`Syncing ${offlineReceipts.length} offline receipts...`);

    for (const receipt of offlineReceipts) {
      await retrySyncReceipt(receipt);
    }

    toast.success("Offline receipts synced!");
  };

  window.addEventListener("online", handleOnline);
  return () => window.removeEventListener("online", handleOnline);
}, []);
```

---

### 3. Manual Retry for Failed Syncs

**Priority: MEDIUM**  
**Effort: Low**  
**Impact: Medium**

- [ ] Add "Retry Sync" button in receipt details
- [ ] Show retry in progress
- [ ] Update status after retry
- [ ] Show success/error toast

**Files to modify:**

- Modify: `src/components/pos/HistorySection.jsx`

**Implementation notes:**

```javascript
const handleRetrySync = async (receipt) => {
  setIsRetrying(true);

  try {
    const result = await loyverseService.createReceipt(receipt);

    await receiptsService.update(receipt.id, {
      syncStatus: "synced",
      syncedAt: new Date().toISOString(),
      loyverseReceiptNumber: result.receipt_number,
      syncError: null,
    });

    toast.success("Receipt synced successfully!");
    loadReceipts(); // Refresh
  } catch (error) {
    toast.error("Sync failed: " + error.message);
  } finally {
    setIsRetrying(false);
  }
};
```

---

## Priority 2: Important Features (Next Month)

### 4. Customer Linking

**Priority: MEDIUM**  
**Effort: High**  
**Impact: High**

- [ ] Create customer mapping table (Local ID ↔ Loyverse ID)
- [ ] UI to link customers during creation
- [ ] Auto-match by email/phone
- [ ] Use Loyverse customer_id in receipts
- [ ] Sync customer stats both ways

**Database schema:**

```javascript
// Firebase collection: customer_mappings
{
  localCustomerId: "abc123",
  loyverseCustomerId: "c71758a2-79bf-11ea-bde9-1269e7c5a22d",
  email: "customer@example.com",
  phone: "+1234567890",
  createdAt: "2024-10-14T12:00:00Z"
}
```

---

### 5. Employee Linking

**Priority: MEDIUM**  
**Effort: Medium**  
**Impact: Medium**

- [ ] Create employee mapping table
- [ ] Link cashiers to Loyverse employees
- [ ] Add loyverseId field to user profile
- [ ] Use employee_id in receipts
- [ ] Admin UI to manage mappings

**Implementation:**

```javascript
// Add to user document
{
  id: "local-user-123",
  loyverseId: "employee-abc-xyz",
  name: "Jane Smith",
  role: "cashier"
}

// In receipt creation
{
  employee_id: cashier?.loyverseId || null
}
```

---

### 6. Sync Management Dashboard

**Priority: MEDIUM**  
**Effort: High**  
**Impact: Medium**

- [ ] Create admin page: `/admin/sync`
- [ ] Display sync statistics
- [ ] Show recent syncs (last 100)
- [ ] Filter by status
- [ ] Bulk retry operations
- [ ] Export sync logs

**Dashboard features:**

- Sync success rate chart
- Failed syncs table with details
- Bulk actions (retry all, delete failed, etc.)
- Sync queue status
- Real-time updates

---

## Priority 3: Nice-to-Have Features (Future)

### 7. Payment Type Mapping

**Priority: LOW**  
**Effort: Medium**  
**Impact: Low**

- [ ] Map POS payment methods to Loyverse payment types
- [ ] Create payment type mapping table
- [ ] UI to configure mappings
- [ ] Use correct payment_type_id per method

**Mapping example:**

```javascript
const paymentTypeMap = {
  cash: "42dd2a55-6f40-11ea-bde9-1269e7c5a22d",
  credit_card: "xyz-payment-type-id",
  debit_card: "abc-payment-type-id",
};
```

---

### 8. Inventory Sync on Sale

**Priority: LOW**  
**Effort: High**  
**Impact: Medium**

- [ ] Update Loyverse inventory after sale
- [ ] Handle variant stock levels
- [ ] Batch inventory updates
- [ ] Conflict resolution (if Loyverse also updated)

**Challenges:**

- Race conditions
- Stock discrepancies
- Network failures mid-update

---

### 9. Discount Sync

**Priority: LOW**  
**Effort: Medium**  
**Impact: Low**

- [ ] Map POS discounts to Loyverse discounts
- [ ] Support receipt-level and line-item discounts
- [ ] Create discount mapping
- [ ] Include discount IDs in receipts

---

### 10. Tax Calculation Integration

**Priority: LOW**  
**Effort: Medium**  
**Impact: Low**

- [ ] Calculate taxes based on Loyverse tax rules
- [ ] Include tax breakdown in receipts
- [ ] Support multiple tax rates
- [ ] Tax by location/product

---

### 11. Receipt Modifiers

**Priority: LOW**  
**Effort: Medium**  
**Impact: Low**

- [ ] Support product modifiers (add-ons)
- [ ] Map to Loyverse modifier_option_id
- [ ] Include in line items
- [ ] Calculate modifier prices

---

### 12. Refund Sync

**Priority: LOW**  
**Effort: High**  
**Impact: Medium**

- [ ] Create refund receipts in Loyverse
- [ ] Link to original receipt
- [ ] Update inventory on refund
- [ ] Handle partial refunds

---

## Technical Debt

### Code Quality

- [ ] Add unit tests for sync functions
- [ ] Add integration tests for Loyverse API
- [ ] Error boundary for sync components
- [ ] Type definitions (if using TypeScript)
- [ ] Code documentation

### Performance

- [ ] Implement caching for Loyverse lookups
- [ ] Batch API calls where possible
- [ ] Optimize receipt queries
- [ ] Add indexes to Firebase collections

### Security

- [ ] Validate receipt data before sending
- [ ] Sanitize user inputs
- [ ] Rate limiting for API calls
- [ ] Audit log for sync operations

---

## Monitoring & Analytics

### Metrics to Track

- [ ] Sync success rate (%)
- [ ] Average sync time (ms)
- [ ] Failed syncs per day
- [ ] Offline receipts created
- [ ] Queue size over time
- [ ] Most common errors

### Alerting

- [ ] Alert if success rate drops below 90%
- [ ] Alert if queue size exceeds 50
- [ ] Daily sync report email
- [ ] Slack notifications for critical errors

---

## Documentation Improvements

- [ ] API rate limit documentation
- [ ] Error code reference guide
- [ ] Video tutorial for managers
- [ ] Troubleshooting flowchart
- [ ] Customer/employee linking guide
- [ ] Performance optimization guide

---

## Testing Requirements

### Manual Testing

- [ ] Test all sync statuses
- [ ] Test offline → online flow
- [ ] Test error scenarios
- [ ] Test with real Loyverse account
- [ ] Test on multiple devices

### Automated Testing

- [ ] Unit tests for sync functions
- [ ] Integration tests with mock API
- [ ] E2E tests for complete flow
- [ ] Performance tests (stress testing)
- [ ] Load tests (concurrent syncs)

---

## Estimated Timeline

| Feature                     | Priority | Effort | Timeline  |
| --------------------------- | -------- | ------ | --------- |
| Background Sync Queue       | HIGH     | Medium | Week 1-2  |
| Offline-to-Online Auto-Sync | HIGH     | Low    | Week 1    |
| Manual Retry                | MEDIUM   | Low    | Week 1    |
| Customer Linking            | MEDIUM   | High   | Week 3-4  |
| Employee Linking            | MEDIUM   | Medium | Week 2-3  |
| Sync Dashboard              | MEDIUM   | High   | Week 4-6  |
| Other Features              | LOW      | Varies | Month 2-3 |

---

## Notes

- Focus on Priority 1 features first
- Customer feedback will guide Priority 2 timing
- Priority 3 features are optional enhancements
- Some features may require Loyverse API upgrades
- Consider user adoption before major changes
