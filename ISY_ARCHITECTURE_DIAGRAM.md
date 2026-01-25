# ISY Order Duplication System - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CANDY KUSH POS SYSTEM                        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        CASHIER CHECKOUT FLOW                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │  Add Items │→ │  Customer  │→ │  Payment   │→ │  Complete  │   │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ORDER PROCESSING (handleCompletePayment)          │
│                                                                       │
│  1. Validate Order Data                                              │
│  2. Generate Order Number                                            │
│  3. Calculate Points/Cashback                                        │
│  4. Update Stock Levels                                              │
│  5. Save to Firebase (receipts) ✓                                    │
│     │                                                                 │
│     └─────────────────────────────────────┐                          │
│                                           ▼                          │
│  6. ┌────────────────────────────────────────────┐                  │
│     │    DUPLICATE TO ISY API (NEW)              │                  │
│     │                                            │                  │
│     │  duplicateOrderToISY(receiptData)         │                  │
│     │                                            │                  │
│     │  ┌──────────────┐  ┌──────────────┐      │                  │
│     │  │   Transform  │→ │  Send to API │      │                  │
│     │  │     Data     │  │  with JWT    │      │                  │
│     │  └──────────────┘  └──────────────┘      │                  │
│     │         │                   │             │                  │
│     │         │                   │             │                  │
│     │         ▼                   ▼             │                  │
│     │  ┌──────────┐        ┌──────────┐        │                  │
│     │  │ Success  │        │ Failure  │        │                  │
│     │  └──────────┘        └──────────┘        │                  │
│     │       │                   │               │                  │
│     │       ▼                   ▼               │                  │
│     │  Log Success      Add to Queue            │                  │
│     │                         │                 │                  │
│     │                         ▼                 │                  │
│     │            ┌────────────────────┐         │                  │
│     │            │  IndexedDB Queue   │         │                  │
│     │            │   (syncQueue)      │         │                  │
│     │            └────────────────────┘         │                  │
│     └────────────────────────────────────────────┘                  │
│                                                                      │
│  7. Update Customer Points                                          │
│  8. Update Shift Totals                                             │
│  9. Show Receipt Modal                                              │
│  10. Clear Cart                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                          ✅ CHECKOUT COMPLETE
```

## Background Sync Service

```
┌─────────────────────────────────────────────────────────────────────┐
│              BACKGROUND SYNC SERVICE (Every 60 seconds)              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────┐
                    │   Check IndexedDB Queue   │
                    │   for pending orders      │
                    └───────────────────────────┘
                                    │
                        ┌───────────┴───────────┐
                        ▼                       ▼
              ┌──────────────┐        ┌──────────────┐
              │   Pending    │        │   No Orders  │
              │   Orders     │        │   Skip       │
              └──────────────┘        └──────────────┘
                        │
                        ▼
              ┌──────────────────────┐
              │  Process Each Order  │
              │  (up to 10 at once)  │
              └──────────────────────┘
                        │
                        ▼
              ┌──────────────────────┐
              │  retryOrderDuplication│
              │  (Exponential Backoff)│
              └──────────────────────┘
                        │
            ┌───────────┴───────────┐
            ▼                       ▼
    ┌───────────┐           ┌───────────┐
    │  Success  │           │  Failure  │
    └───────────┘           └───────────┘
            │                       │
            ▼                       ▼
    Mark Completed        Increment Attempts
                                    │
                        ┌───────────┴───────────┐
                        ▼                       ▼
              ┌──────────────┐        ┌──────────────┐
              │ < 5 Attempts │        │ ≥ 5 Attempts │
              │ Try Again    │        │ Mark Failed  │
              └──────────────┘        └──────────────┘
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         POS RECEIPT DATA                             │
│                                                                       │
│  {                                                                    │
│    orderNumber: "POS-2026-001",                                      │
│    created_at: "2026-01-25T10:30:00Z",                               │
│    line_items: [                                                     │
│      { item_id: "prod-123", name: "Product", qty: 2, price: 10 }    │
│    ],                                                                │
│    total_money: 22.00,                                               │
│    customer: { name: "John Doe", id: "cust-456" },                  │
│    payments: [{ type: "CASH", amount: 22.00 }],                     │
│    cashierId: "cashier-789"                                          │
│  }                                                                    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   ORDER DUPLICATION SERVICE                          │
│                                                                       │
│  transformReceiptData(receiptData, cashier)                          │
│  • Normalize field names                                             │
│  • Add authentication context                                        │
│  • Ensure required fields present                                    │
│  • Format for ISY API                                                │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         HTTP REQUEST                                 │
│                                                                       │
│  POST https://api.isy.software/pos/v1/orders                         │
│  Authorization: Bearer eyJhbGc...                                    │
│  Content-Type: application/json                                      │
│                                                                       │
│  {                                                                    │
│    orderNumber: "POS-2026-001",                                      │
│    created_at: "2026-01-25T10:30:00Z",                               │
│    line_items: [...],                                                │
│    total_money: 22.00,                                               │
│    customer: {...},                                                  │
│    payments: [...]                                                   │
│  }                                                                    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                        ┌───────────┴───────────┐
                        ▼                       ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│    SUCCESS RESPONSE      │      │     ERROR RESPONSE       │
│                          │      │                          │
│  {                       │      │  {                       │
│    success: true,        │      │    success: false,       │
│    data: {               │      │    error: "...",         │
│      orderId: "xyz",     │      │    code: "...",          │
│      orderNumber: "..." }│      │    details: [...]        │
│  }                       │      │  }                       │
└──────────────────────────┘      └──────────────────────────┘
            │                                  │
            ▼                                  ▼
    ✅ Log Success                    ❌ Add to Retry Queue
    Update UI                         Background Service Retries
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          APP LAYOUT                                  │
│  src/app/layout.js                                                   │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              ISYSyncInitializer Component                       │ │
│  │                                                                  │ │
│  │  useEffect(() => {                                              │ │
│  │    startISYSyncService()  // Auto-start on mount                │ │
│  │  }, [])                                                         │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     SERVICES LAYER                                   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  orderDuplicationService.js                                   │  │
│  │  • duplicateOrderToISY()                                      │  │
│  │  • transformReceiptData()                                     │  │
│  │  • setISYApiToken()                                           │  │
│  │  • clearISYApiToken()                                         │  │
│  │  • isISYApiConfigured()                                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  isySyncService.js                                            │  │
│  │  • startISYSyncService()                                      │  │
│  │  • stopISYSyncService()                                       │  │
│  │  • processPendingDuplications()                               │  │
│  │  • getISYSyncStats()                                          │  │
│  │  • triggerISYSync()                                           │  │
│  │  • cleanupCompletedSyncTasks()                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                     │
│                                                                       │
│  ┌──────────────────────┐  ┌──────────────────────┐                │
│  │    localStorage      │  │     IndexedDB        │                │
│  │                      │  │                      │                │
│  │  • isy_api_token     │  │  • syncQueue table   │                │
│  │                      │  │    - type            │                │
│  │                      │  │    - action          │                │
│  │                      │  │    - data            │                │
│  │                      │  │    - status          │                │
│  │                      │  │    - attempts        │                │
│  │                      │  │    - timestamp       │                │
│  └──────────────────────┘  └──────────────────────┘                │
└─────────────────────────────────────────────────────────────────────┘
```

## Admin Panel Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    /admin/isy-sync PAGE                              │
│  src/app/admin/isy-sync/page.jsx                                     │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Configuration Card                                             │ │
│  │  • API URL (read-only)                                          │ │
│  │  • Token status (configured/not configured)                     │ │
│  │  • Token input field                                            │ │
│  │  • Save/Clear buttons                                           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Statistics Cards                                               │ │
│  │  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐                  │ │
│  │  │ Total │  │ Done  │  │Pending│  │Failed │                  │ │
│  │  │  127  │  │  120  │  │   5   │  │   2   │                  │ │
│  │  └───────┘  └───────┘  └───────┘  └───────┘                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Actions Card                                                   │ │
│  │  [Refresh Stats] [Manual Sync] [Cleanup Old Tasks]             │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Alerts (conditional)                                           │ │
│  │  • Not configured warning                                       │ │
│  │  • Pending orders info                                          │ │
│  │  • Failed orders warning                                        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Documentation Links                                            │ │
│  │  • Implementation Guide                                         │ │
│  │  • API Specification                                            │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      DUPLICATION ATTEMPT                             │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────┐
                    │  Send Request to ISY API  │
                    └───────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
    ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
    │   200 OK    │        │   4xx Error │        │   5xx Error │
    └─────────────┘        └─────────────┘        └─────────────┘
            │                       │                       │
            ▼                       ▼                       ▼
    ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
    │   SUCCESS   │        │  BAD REQUEST│        │SERVER ERROR │
    │  Log & Done │        │  NO RETRY   │        │  ADD QUEUE  │
    └─────────────┘        └─────────────┘        └─────────────┘
                                    │                       │
                                    │                       ▼
                                    │              ┌─────────────┐
                                    │              │ Retry Queue │
                                    │              └─────────────┘
                                    │                       │
                        ┌───────────┴───────────┐           │
                        ▼                       ▼           │
                ┌─────────────┐        ┌─────────────┐     │
                │ 401 - Auth  │        │ 400 - Valid │     │
                │ NO RETRY    │        │ NO RETRY    │     │
                └─────────────┘        └─────────────┘     │
                        │                       │           │
                        ▼                       ▼           │
                    Notify User         Log Details         │
                    Token Expired       Fix Data            │
                                                             │
                                                             ▼
                                        ┌───────────────────────────┐
                                        │ Background Service        │
                                        │ Retry with Backoff        │
                                        │ • Attempt 1: Immediate    │
                                        │ • Attempt 2: 2 seconds    │
                                        │ • Attempt 3: 4 seconds    │
                                        │ • Attempt 4: 8 seconds    │
                                        │ • Attempt 5: 10 seconds   │
                                        │ • Max Reached: Mark Failed│
                                        └───────────────────────────┘
```

## Token Management Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TOKEN LIFECYCLE                                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────┐
                    │  Obtain JWT from ISY API  │
                    │      Administrator        │
                    └───────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────┐
                    │    Set Token via          │
                    │    Admin Panel or Code    │
                    │                           │
                    │ setISYApiToken(token)     │
                    └───────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────┐
                    │  Store in localStorage    │
                    │  Key: isy_api_token       │
                    └───────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────┐
                    │   Token Available for     │
                    │   All API Requests        │
                    └───────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
    ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
    │   Valid     │        │   Expired   │        │  Invalid    │
    │   Requests  │        │   Refresh   │        │  Clear &    │
    │   Succeed   │        │   Token     │        │  Get New    │
    └─────────────┘        └─────────────┘        └─────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────┐
                    │  On Logout/Clear          │
                    │  clearISYApiToken()       │
                    └───────────────────────────┘
```

---

## Legend

```
┌─────┐
│ Box │  = Component/Service/Process
└─────┘

   │
   ▼     = Data/Control Flow

  ┌─┐
──┤ ├──  = Decision Point
  └─┘

✅       = Success State
❌       = Error State
⚠️       = Warning State
```

---

**For detailed implementation**, see [ISY_ORDER_DUPLICATION_GUIDE.md](./ISY_ORDER_DUPLICATION_GUIDE.md)

**For quick setup**, see [ISY_QUICK_START.md](./ISY_QUICK_START.md)

**For API details**, see [POS_RECEIPT_API_SPECIFICATION.md](./POS_RECEIPT_API_SPECIFICATION.md)
