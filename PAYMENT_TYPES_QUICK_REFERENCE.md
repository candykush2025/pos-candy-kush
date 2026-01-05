# Payment Types - Quick Reference Guide

## Payment Options in POS

When you click **Checkout** in the POS, you'll see 4 payment options:

```
┌─────────────────────┬─────────────────────┐
│   💵 Cash           │   💳 Card           │
│   Traditional       │   Card Terminal     │
│   Cash Payment      │   Payment           │
└─────────────────────┴─────────────────────┘
┌─────────────────────┬─────────────────────┐
│   ₿ Crypto          │   ⇄ Transfer        │
│   Cryptocurrency    │   Bank Transfer     │
│   Payment           │   Payment           │
└─────────────────────┴─────────────────────┘
```

## How to Use Each Payment Type

### 💵 Cash Payment

1. Click **Cash** button
2. Enter amount received from customer
3. Or use quick cash buttons ($20, $50, $100, etc.)
4. System calculates change automatically
5. Click **Complete Payment**
6. **Change amount shown in green box**

**Example:**

- Total: $45.50
- Cash Received: $50.00
- Change: $4.50 ← Displayed prominently

### 💳 Card Payment

1. Click **Card** button
2. **Process payment on your card terminal first**
3. Wait for approval
4. Click **Complete Payment** in POS
5. Receipt printed/saved

**Note:** Blue message reminds you to process at terminal

### ₿ Crypto Payment (Cryptocurrency)

1. Click **Crypto** button
2. **Process cryptocurrency transfer**
3. Wait for blockchain confirmation
4. Verify amount received
5. Click **Complete Payment**
6. Receipt shows "Crypto transfer"

**Note:** Purple message reminds you to confirm crypto received

### ⇄ Transfer Payment (Bank Transfer)

1. Click **Transfer** button
2. **Process bank transfer**
3. Verify transfer received in bank account
4. Note reference number
5. Click **Complete Payment**
6. Receipt shows "Transfer"

**Note:** Indigo message reminds you to confirm transfer

## Payment Type Details

| Icon | Name     | When to Use                | Shows Change? |
| ---- | -------- | -------------------------- | ------------- |
| 💵   | Cash     | Physical cash payment      | ✅ Yes        |
| 💳   | Card     | Credit/Debit card terminal | ❌ No         |
| ₿    | Crypto   | Bitcoin, Ethereum, etc.    | ❌ No         |
| ⇄    | Transfer | Bank transfer              | ❌ No         |

## Receipt Display

### On Screen Receipt

```
✓ Payment Completed
  Cash                    ← Payment type name shown here

Total Amount:  $45.50
Cash Received: $50.00
Change:        $4.50     ← Only for cash
```

### Printed Receipt

```
=====================
CANDY KUSH POS
=====================
Order: ORD-20241014-001

Items:
- Coffee x2      $10.00
- Snack x1        $5.50
                -------
Subtotal:        $15.50

TOTAL:           $15.50

Payment Method: Cash    ← Shows actual payment type
Cash Received:  $20.00
CHANGE:         $4.50
=====================
```

## Loyverse Integration

Each payment type syncs to Loyverse with the correct payment type ID:

```
POS Selection → Loyverse Payment Type
─────────────────────────────────────
Cash          → Cash (CASH)
Card          → Card (NONINTEGRATEDCARD)
Crypto        → Crypto transfer (OTHER)
Transfer      → Transfer (OTHER)
```

### Sync Status Badges

In History tab, you'll see:

- 🟢 **Synced** - Successfully sent to Loyverse
- 🟡 **Pending** - Waiting to sync
- 🔴 **Failed** - Sync error (click for details)
- ⚪ **Offline** - Created offline, will sync later

## Quick Tips

### ✅ Do's

- ✅ Select correct payment type before completing
- ✅ Wait for external confirmation (card, crypto, transfer)
- ✅ Count cash carefully and verify amount
- ✅ Print receipt for customer
- ✅ Check sync status in History

### ❌ Don'ts

- ❌ Don't click "Complete Payment" before processing external payments
- ❌ Don't select wrong payment type (affects reports)
- ❌ Don't skip cash counting
- ❌ Don't ignore sync errors
- ❌ Don't forget to give change to customer

## Troubleshooting

### "Insufficient cash received" error

**Cause:** Cash amount entered is less than total
**Fix:** Enter correct cash amount (must be ≥ total)

### Payment type shows "undefined"

**Cause:** Old receipt without payment type name
**Fix:** No action needed, only affects old receipts

### Sync failed

**Cause:** No internet connection or Loyverse API error
**Fix:**

1. Check internet connection
2. Receipt saved locally
3. Will auto-retry when online
4. Or manually retry in History

### Wrong payment type in Loyverse

**Cause:** Payment type IDs don't match your account
**Fix:**

1. Go to Admin → Integration
2. Click "Get Payment Types"
3. Copy your payment type IDs
4. Contact admin to update configuration

## Keyboard Shortcuts

### Payment Modal

- **Tab** - Navigate between fields
- **Enter** - Complete payment (when valid)
- **Esc** - Cancel payment modal

### Quick Cash (Cash Payment Only)

- Click quick cash buttons for common amounts
- Buttons available: $20, $50, $100, $200, $500

## Common Scenarios

### Scenario 1: Customer pays exact amount (Cash)

1. Total: $25.00
2. Customer gives: $25.00
3. Enter: 25.00
4. Change: $0.00
5. Complete payment ✓

### Scenario 2: Customer pays with card

1. Total: $75.50
2. Select: Card
3. Process at terminal
4. Wait for approval
5. Complete payment ✓

### Scenario 3: Customer pays with crypto

1. Total: $100.00
2. Select: Crypto
3. Customer sends crypto
4. Wait for confirmation (1-3 confirmations)
5. Verify amount received
6. Complete payment ✓

### Scenario 4: Customer will bank transfer

1. Total: $500.00
2. Select: Transfer
3. Customer initiates transfer
4. Verify transfer received in bank
5. Note reference number
6. Complete payment ✓

## Best Practices

### Cash Handling

- Count cash received in front of customer
- Count change back to customer
- Keep large bills separate until transaction complete
- Balance cash drawer at end of shift

### Card Payments

- Process card at terminal first
- Keep card terminal receipts for reconciliation
- Match POS totals with card terminal totals daily

### Crypto Payments

- Wait for blockchain confirmations (usually 1-3)
- Note transaction hash/ID for records
- Account for network fees in pricing
- Verify correct wallet address

### Bank Transfers

- Get transfer reference number from customer
- Verify transfer received before completing
- Keep transfer receipts for records
- Account for bank processing time (same day vs next day)

## Need Help?

### Documentation

- Full guide: `PAYMENT_TYPES_INTEGRATION.md`
- Implementation: `PAYMENT_TYPES_IMPLEMENTATION_SUMMARY.md`
- API docs: `PAYMENT_TYPES_API.md`
- Sync guide: `LOYVERSE_RECEIPT_SYNC.md`

### Support

- Check sync status in History tab
- Review sync errors in receipt details
- Contact admin for configuration issues
- Refer to Loyverse dashboard for payment type verification

---

**Last Updated:** October 14, 2025
**Version:** 1.0.0
