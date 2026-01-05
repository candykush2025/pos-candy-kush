# AI Agent Development Guide

This guide provides instructions for AI agents to continue developing the Candy Kush POS system.

## Project Overview

A modern Point of Sale (POS) system built with Next.js, designed for:

- Multi-device support (tablets, phones, iOS, Android)
- Offline-first architecture with automatic synchronization
- Role-based access control (Cashier, Manager, Admin)
- Cannabis dispensary operations

## Current Implementation Status

### ✅ Completed

1. **Foundation & Configuration**

   - Next.js 15 with App Router
   - Tailwind CSS styling
   - shadcn/ui components
   - Environment configuration

2. **State Management**

   - Zustand stores for cart, tickets, auth, and sync
   - Persistent authentication state
   - Cart management with calculations

3. **Offline Storage**

   - IndexedDB setup with Dexie.js
   - Database schema for products, orders, tickets, customers
   - Database service with CRUD operations
   - Sync queue for offline changes

4. **Synchronization**

   - Sync engine for background data synchronization
   - Online/offline status detection
   - Automatic retry logic
   - Conflict resolution framework

5. **Authentication & Authorization**

   - Login page with role-based auth
   - JWT token management with refresh
   - Permission system (RBAC)
   - usePermissions hook

6. **API Integration**

   - Axios-based API client
   - Request/response interceptors
   - Token refresh logic
   - Offline error handling
   - API endpoint definitions

7. **UI Components**

   - Login page
   - POS layout with header, navigation
   - Sales screen with product grid and cart
   - Sync status indicators
   - User menu

8. **Utilities**
   - Format functions (currency, date, phone)
   - Calculation functions (totals, discounts, tax)
   - Helper functions

### 🚧 In Progress / TODO

1. **Payment Processing**

   - Payment modal component
   - Multiple payment method selection
   - Change calculation
   - Receipt generation

2. **Ticket Management**

   - Ticket list page
   - Load/resume ticket functionality
   - Delete tickets
   - Ticket details view

3. **Reports & Analytics**

   - Sales reports
   - Daily summaries
   - Staff performance
   - Inventory reports

4. **Additional Pages**

   - Products page
   - Settings page
   - Dashboard/overview

5. **Advanced Features**
   - Barcode scanning (camera)
   - Receipt printing
   - Customer management
   - Discount modal
   - Hardware integration

## Development Workflow

### Adding New Features

1. **Review existing code** in relevant areas
2. **Check constants** in `src/config/constants.js`
3. **Update stores** if new state needed
4. **Create components** in appropriate directories
5. **Add API endpoints** if backend needed
6. **Test offline functionality**
7. **Update documentation**

### Key Principles

- **Offline-first**: All features must work offline
- **Touch-optimized**: Minimum 44px touch targets
- **Responsive**: Support all device sizes
- **Accessible**: Use semantic HTML and ARIA
- **Performance**: Lazy load, virtualize lists
- **Security**: Always validate permissions

## File Organization

```
src/
├── app/                    # Pages (Next.js App Router)
├── components/             # React components
│   ├── ui/                # Base UI components (shadcn/ui)
│   ├── pos/               # POS-specific components
│   ├── layout/            # Layout components
│   └── common/            # Shared components
├── config/                # Configuration
├── hooks/                 # Custom hooks
├── lib/                   # Utilities
│   ├── api/              # API client
│   ├── db/               # Database
│   ├── sync/             # Sync engine
│   └── utils/            # Helpers
├── services/             # Business logic
└── store/                # State management
```

## Adding New Components

### Pattern to Follow

```javascript
"use client"; // If using hooks/state

import { useState } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
// ... other imports

export default function ComponentName() {
  const { can } = usePermissions();
  const [state, setState] = useState(null);

  // Component logic

  return <div>{/* UI */}</div>;
}
```

### Creating a New Page

1. Create folder in `src/app/(pos)/`
2. Add `page.js` file
3. Implement page component
4. Add navigation link in layout
5. Check permissions if restricted

### Adding API Endpoints

1. Open `src/lib/api/endpoints.js`
2. Add methods to appropriate API section
3. Update types/documentation
4. Test with offline mode

## Common Tasks

### Task: Add Payment Modal

**Location**: `src/components/pos/PaymentModal/`

**Steps**:

1. Create PaymentModal component
2. Import payment methods from constants
3. Add change calculation
4. Handle multiple payment types
5. Create order in database
6. Clear cart on success
7. Print/show receipt

**Files to modify**:

- Create `src/components/pos/PaymentModal/index.js`
- Update `src/app/(pos)/sales/page.js` to use modal
- Add to `src/lib/db/dbService.js` if needed

### Task: Add Barcode Scanner

**Location**: `src/components/pos/BarcodeScanner/`

**Steps**:

1. Use device camera API
2. Integrate barcode detection library
3. Search product by barcode
4. Add to cart automatically
5. Show feedback on success/error

**Libraries**:

- `react-webcam` or `@zxing/library`

### Task: Implement Reporting

**Location**: `src/app/(pos)/reports/page.js`

**Steps**:

1. Create reports page layout
2. Add date range filters
3. Fetch data from IndexedDB
4. Calculate metrics
5. Display charts (recharts or chart.js)
6. Export to CSV/PDF

## Testing Checklist

When implementing features, test:

- [ ] Works in online mode
- [ ] Works in offline mode
- [ ] Data syncs when reconnected
- [ ] Works on mobile/tablet
- [ ] Touch interactions work
- [ ] Permissions enforced
- [ ] Loading states shown
- [ ] Errors handled gracefully
- [ ] Accessible (keyboard, screen reader)

## API Contract

### Expected Backend Structure

```javascript
// Login Response
{
  user: { id, name, role, email, permissions },
  token: "jwt-token",
  refreshToken: "refresh-token"
}

// Product Response
{
  id, name, price, stock, barcode, sku,
  category, categoryId, description, image
}

// Order Request
{
  items: [{ productId, quantity, price, discount }],
  subtotal, discount, tax, total,
  paymentMethod, amountPaid, change,
  customerId, userId, notes
}
```

## Performance Optimization

- Use `React.memo` for expensive components
- Implement virtual scrolling for large lists
- Lazy load images
- Debounce search inputs
- Cache API responses
- Use IndexedDB indexes for queries

## Security Considerations

- Validate user permissions on all actions
- Sanitize user inputs
- Use HTTPS in production
- Rotate JWT tokens
- Encrypt sensitive data in IndexedDB
- Implement rate limiting on API

## Deployment Checklist

- [ ] Environment variables configured
- [ ] API endpoints updated
- [ ] PWA manifest created
- [ ] Service worker registered
- [ ] Icons generated (all sizes)
- [ ] Build tested
- [ ] Performance audited
- [ ] Security reviewed
- [ ] Backup strategy in place

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Zustand](https://github.com/pmndrs/zustand)
- [Dexie.js](https://dexie.org)
- [Loyverse POS](https://loyverse.com) - Inspiration

## Common Issues & Solutions

### Issue: "localStorage is not defined"

**Solution**: Use `typeof window !== 'undefined'` check or `'use client'` directive

### Issue: IndexedDB not working

**Solution**: Check browser support, ensure proper initialization, check console for errors

### Issue: Sync conflicts

**Solution**: Implement last-write-wins or manual conflict resolution

### Issue: Slow rendering

**Solution**: Use React DevTools Profiler, implement memoization, reduce re-renders

## Next Priority Features

1. **Payment Modal** - Critical for MVP
2. **Ticket Management Page** - High value
3. **Receipt Printing** - Customer requirement
4. **Reports Dashboard** - Business analytics
5. **Barcode Scanner** - Efficiency improvement
6. **Customer Management** - Loyalty features
7. **PWA Manifest** - App installation
8. **Advanced Sync** - Better offline handling

## Contact & Support

- Review DEVELOPMENT_PLAN.md for roadmap
- Check PROJECT_STRUCTURE.md for architecture
- See CONSTANTS.md for configuration values
- All stores in `src/store/` for state management
- All API calls in `src/lib/api/endpoints.js`

---

**Remember**: This is an offline-first POS system. Every feature must work without internet connection!
