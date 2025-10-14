# Sync Status Badge Guide

## Visual Reference

### Status Badges in History

```
┌─────────────────────────────────────────────────────┐
│ Receipt Card                                        │
├─────────────────────────────────────────────────────┤
│ #ORD-20241014-001                    $168.76       │
│ Candy Kush POS                                      │
│                                                     │
│ [SALE] [✓ Synced] [This Device]                   │
│                                                     │
│ Customer: John Doe          Items: 3 lines         │
│ Payments: Cash              Cashier: Jane Smith    │
│                                                     │
│ Completed transaction          [View Details]      │
└─────────────────────────────────────────────────────┘
```

## Badge Types

### 1. Sync Status Badges

#### ✅ Synced (Green)

```
[✓ Synced]
```

- Color: Green (`text-green-600`)
- Icon: CheckCircle
- Meaning: Successfully synced to Loyverse
- When: After successful API call

#### ⏱️ Pending (Yellow)

```
[🕐 Pending]
```

- Color: Yellow (`text-yellow-600`)
- Icon: Clock
- Meaning: Waiting to sync
- When: Queued but not yet synced

#### 📴 Offline (Gray)

```
[📴 Offline]
```

- Color: Gray (`text-gray-500`)
- Icon: WifiOff
- Meaning: Created while offline
- When: No internet during checkout

#### ❌ Failed (Red)

```
[✗ Failed]
```

- Color: Red (`text-red-600`)
- Icon: XCircle
- Meaning: Sync failed with error
- When: API call returned error

#### 📄 From Loyverse (Blue)

```
[📄 From Loyverse]
```

- Color: Blue (`text-blue-600`)
- Icon: Receipt
- Meaning: Receipt originated from Loyverse
- When: No syncStatus field (came from Loyverse sync)

### 2. Source Badges

#### This Device (Purple)

```
[This Device]
```

- Color: Purple (`text-purple-600`)
- Variant: Secondary
- Meaning: Receipt created on current device
- When: `fromThisDevice: true`

#### Loyverse Receipt Number (Blue Outline)

```
[Loyverse #2-1009]
```

- Color: Blue (`text-blue-600`)
- Variant: Outline
- Meaning: Linked Loyverse receipt
- When: `loyverseReceiptNumber` exists

## Receipt Details Modal

```
┌────────────────────────────────────────────────────────┐
│ Receipt Details                                        │
│ Receipt #ORD-20241014-001                             │
├────────────────────────────────────────────────────────┤
│                                                        │
│ ┌────────────────────────────────────────────────┐   │
│ │ Sync Status                                    │   │
│ │ ──────────────────────────────────────────────│   │
│ │ [✓ Synced] [This Device] [Loyverse #2-1009]  │   │
│ │                                                │   │
│ │ Synced: Oct 14, 2024 12:30 PM                 │   │
│ └────────────────────────────────────────────────┘   │
│                                                        │
│ Customer                                               │
│ John Doe                                               │
│                                                        │
│ Items                                                  │
│ Coffee x2 .......................... $100.00          │
│ Ice Cream x1 ....................... $68.76           │
│                                                        │
│ Subtotal ........................... $178.76          │
│ Discount ........................... -$10.00           │
│ Total .............................. $168.76          │
└────────────────────────────────────────────────────────┘
```

### With Sync Error

```
┌────────────────────────────────────────────────────────┐
│ ┌────────────────────────────────────────────────┐   │
│ │ Sync Status                                    │   │
│ │ ──────────────────────────────────────────────│   │
│ │ [✗ Failed] [This Device]                      │   │
│ │                                                │   │
│ │ ┌──────────────────────────────────────────┐ │   │
│ │ │ Sync Error: Invalid variant_id           │ │   │
│ │ │ Product not found in Loyverse            │ │   │
│ │ └──────────────────────────────────────────┘ │   │
│ └────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

## Color Coding Summary

| Status        | Color  | Badge Variant | Icon        |
| ------------- | ------ | ------------- | ----------- |
| Synced        | Green  | Default       | CheckCircle |
| Pending       | Yellow | Secondary     | Clock       |
| Offline       | Gray   | Outline       | WifiOff     |
| Failed        | Red    | Destructive   | XCircle     |
| From Loyverse | Blue   | Secondary     | Receipt     |
| This Device   | Purple | Secondary     | -           |
| Loyverse #    | Blue   | Outline       | -           |

## Badge Combinations

### Scenario 1: Successful Online Sale

```
[SALE] [✓ Synced] [This Device] [Loyverse #2-1009]
```

- Receipt type badge
- Green synced badge
- Purple this device badge
- Blue Loyverse number badge

### Scenario 2: Offline Sale

```
[SALE] [📴 Offline] [This Device]
```

- Receipt type badge
- Gray offline badge
- Purple this device badge
- No Loyverse number (not synced yet)

### Scenario 3: Failed Sync

```
[SALE] [✗ Failed] [This Device]
```

- Receipt type badge
- Red failed badge
- Purple this device badge
- Error message in details modal

### Scenario 4: Receipt from Loyverse

```
[SALE] [📄 From Loyverse]
```

- Receipt type badge
- Blue "From Loyverse" badge
- No "This Device" badge
- Loyverse receipt number in data

## User Instructions

### For Cashiers

**Normal Transaction:**

- Complete sale as usual
- Look for green "✓ Synced" badge in history
- That's it! Receipt is in Loyverse

**If you see "📴 Offline":**

- Normal when internet is down
- Sale still processed locally
- Will sync when internet returns (future feature)

**If you see "✗ Failed":**

- Sale still completed locally
- Notify manager
- Manager can check error details

### For Managers

**Checking Sync Health:**

1. Open POS → History tab
2. Scan for red "Failed" badges
3. Click "View Details" on failed receipts
4. Read error message
5. Common fixes:
   - Product not in Loyverse → Sync products
   - Network error → Check internet
   - Invalid config → Check constants.js

**Verifying Sync:**

1. Complete test transaction
2. Check for green "✓ Synced" badge
3. Note the Loyverse receipt number
4. Open Loyverse dashboard
5. Search for receipt number
6. Verify data matches

## Technical Notes

### Badge Component Structure

```jsx
<Badge variant={variant} className={`text-xs ${color}`}>
  <Icon className="mr-1 h-3 w-3" />
  {text}
</Badge>
```

### Status Logic

```javascript
const getSyncStatusBadge = (receipt) => {
  const syncStatus = receipt.syncStatus || receipt.sync_status;

  if (!syncStatus) {
    return {
      /* From Loyverse */
    };
  }

  switch (syncStatus) {
    case "synced":
      return {
        /* Synced */
      };
    case "pending":
      return {
        /* Pending */
      };
    case "offline":
      return {
        /* Offline */
      };
    case "failed":
      return {
        /* Failed */
      };
    default:
      return {
        /* Unknown */
      };
  }
};
```

## Troubleshooting

### Badge not showing

- Check that receipt has `syncStatus` field
- Verify badge component is rendering
- Check console for React errors

### Wrong color

- Verify `syncStatus` value matches case statement
- Check Tailwind classes are correct
- Ensure shadcn/ui Badge component is imported

### Badge missing icon

- Verify icon is imported from lucide-react
- Check icon component name matches
- Ensure icon is passed to Badge children

## Accessibility

All badges include:

- Color coding for visual users
- Icon for additional visual cue
- Text label for screen readers
- Semantic HTML (Badge component)
- Appropriate contrast ratios

## Responsive Design

Badges automatically:

- Wrap to new line on small screens
- Maintain readable text size
- Stack vertically in narrow containers
- Adjust spacing with flex gap
