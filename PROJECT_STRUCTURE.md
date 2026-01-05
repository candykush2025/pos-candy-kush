# Project Structure

```
pos-candy-kush/
├── public/
│   ├── icons/              # PWA icons
│   ├── images/             # Static images
│   └── manifest.json       # PWA manifest
│
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── (auth)/         # Authentication routes
│   │   │   ├── login/
│   │   │   └── layout.js
│   │   │
│   │   ├── (pos)/          # Main POS interface
│   │   │   ├── dashboard/
│   │   │   ├── sales/
│   │   │   ├── tickets/
│   │   │   ├── reports/
│   │   │   ├── products/
│   │   │   ├── settings/
│   │   │   └── layout.js
│   │   │
│   │   ├── api/            # API routes (if needed)
│   │   ├── layout.js       # Root layout
│   │   ├── page.js         # Home redirect
│   │   └── globals.css     # Global styles
│   │
│   ├── components/         # React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── pos/            # POS-specific components
│   │   │   ├── Cart/
│   │   │   ├── ProductGrid/
│   │   │   ├── PaymentModal/
│   │   │   ├── TicketList/
│   │   │   └── CustomerDisplay/
│   │   ├── layout/         # Layout components
│   │   │   ├── Header/
│   │   │   ├── Sidebar/
│   │   │   └── Footer/
│   │   └── common/         # Reusable components
│   │       ├── SearchBar/
│   │       ├── LoadingSpinner/
│   │       └── ErrorBoundary/
│   │
│   ├── lib/                # Utility libraries
│   │   ├── api/            # API client
│   │   │   ├── client.js
│   │   │   ├── endpoints/
│   │   │   └── interceptors.js
│   │   ├── db/             # IndexedDB setup (Dexie)
│   │   │   ├── schema.js
│   │   │   ├── migrations.js
│   │   │   └── index.js
│   │   ├── sync/           # Offline sync logic
│   │   │   ├── syncEngine.js
│   │   │   ├── conflictResolver.js
│   │   │   └── queue.js
│   │   ├── auth/           # Authentication utilities
│   │   │   ├── token.js
│   │   │   └── permissions.js
│   │   └── utils/          # Helper functions
│   │       ├── format.js
│   │       ├── calculations.js
│   │       └── validation.js
│   │
│   ├── store/              # Zustand stores
│   │   ├── useCartStore.js
│   │   ├── useProductStore.js
│   │   ├── useTicketStore.js
│   │   ├── useAuthStore.js
│   │   ├── useSyncStore.js
│   │   └── useSettingsStore.js
│   │
│   ├── hooks/              # Custom React hooks
│   │   ├── useOnlineStatus.js
│   │   ├── useSync.js
│   │   ├── usePermissions.js
│   │   ├── useBarcode.js
│   │   └── useLocalStorage.js
│   │
│   ├── types/              # Type definitions
│   │   ├── product.js
│   │   ├── order.js
│   │   ├── user.js
│   │   └── api.js
│   │
│   ├── config/             # Configuration files
│   │   ├── constants.js
│   │   ├── api.config.js
│   │   ├── permissions.js
│   │   └── pwa.config.js
│   │
│   └── services/           # Business logic services
│       ├── productService.js
│       ├── orderService.js
│       ├── paymentService.js
│       ├── inventoryService.js
│       └── reportService.js
│
├── .env.local              # Environment variables
├── .env.example            # Example environment variables
├── next.config.mjs         # Next.js configuration
├── tailwind.config.js      # Tailwind configuration
├── jsconfig.json           # JavaScript configuration
└── package.json            # Dependencies
```

## Component Organization

### POS Components

- **Cart**: Shopping cart display and management
- **ProductGrid**: Product catalog with search/filter
- **PaymentModal**: Payment processing interface
- **TicketList**: Multiple ticket management
- **CustomerDisplay**: Secondary display output

### Layout Components

- **Header**: Top navigation with user info, sync status
- **Sidebar**: Main navigation menu
- **Footer**: Status bar with connection info

### Common Components

- **SearchBar**: Universal search component
- **LoadingSpinner**: Loading states
- **ErrorBoundary**: Error handling wrapper
