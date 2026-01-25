# 🏪 Candy Kush POS - Complete Application Documentation

## 📋 Table of Contents

1. [Application Overview](#application-overview)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [Authentication & Authorization](#authentication--authorization)
4. [Database Structure (Firebase Firestore)](#database-structure-firebase-firestore)
5. [Application Layout Structure](#application-layout-structure)
6. [Complete Menu & Navigation](#complete-menu--navigation)
7. [Feature Documentation by Module](#feature-documentation-by-module)
8. [API Routes & Endpoints](#api-routes--endpoints)
9. [State Management](#state-management)
10. [UI Components Library](#ui-components-library)
11. [Business Logic & Workflows](#business-logic--workflows)
12. [Mobile Responsiveness](#mobile-responsiveness)
13. [PWA Features](#pwa-features)
14. [Performance Optimizations](#performance-optimizations)
15. [Android App Replication Guide](#android-app-replication-guide)

---

## 1. Application Overview

### Purpose

Candy Kush POS is a comprehensive Point of Sale (POS) system designed for retail management, specifically tailored for dispensary operations.

### Core Functionality

- **Sales Management**: Process sales, manage cart, apply discounts
- **Inventory Management**: Track stock, manage products, categories
- **Customer Management**: Customer profiles, cashback/loyalty system
- **Employee Management**: User roles, shift management, performance tracking
- **Financial Reporting**: Sales reports, analytics, expense tracking
- **Multi-device Support**: Web app with PWA capabilities

### User Roles

1. **Admin**: Full system access, all management features
2. **Cashier**: POS operations, customer management
3. **Manager**: Admin + specific operational controls

### Key Metrics

- Real-time inventory tracking
- Sales analytics by product, category, employee, payment method
- Customer loyalty points system
- Shift-based accounting
- Expense tracking and categorization

---

## 2. Architecture & Technology Stack

### Frontend Framework

```
Next.js 16.1.4 (React 19.2.3)
- App Router (not Pages Router)
- Server Components + Client Components
- Turbopack for fast builds
- File-based routing
```

### Styling & UI

```
- Tailwind CSS 4.1.18
- Radix UI Components (Headless UI)
- Lucide React Icons
- shadcn/ui component library
- Dark mode support (next-themes)
```

### State Management

```
- Zustand (global state)
- React Query (TanStack Query 5.90.2)
- Local Storage (persistence)
- IndexedDB (Dexie.js for offline support)
```

### Backend & Database

```
- Firebase 12.8.0
  - Firestore (NoSQL database)
  - Authentication
  - Storage (file uploads)
  - Performance Monitoring
- Server-side API routes (Next.js API routes)
```

### Key Libraries

```json
{
  "@tanstack/react-query": "^5.90.2",
  "firebase": "^12.8.0",
  "next": "^16.1.4",
  "react": "^19.2.3",
  "zustand": "^5.0.8",
  "dexie": "^4.2.1",
  "axios": "^1.13.2",
  "date-fns": "^4.1.0",
  "recharts": "^3.5.1",
  "react-hook-form": "^7.65.0",
  "zod": "^4.3.5",
  "next-pwa": "^5.6.0"
}
```

### Project Structure

```
pos-candy-kush/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth routes group
│   │   ├── (pos)/             # POS routes group
│   │   ├── admin/             # Admin panel
│   │   ├── api/               # API routes
│   │   ├── layout.js          # Root layout
│   │   └── page.js            # Home page
│   ├── components/            # React components
│   │   ├── ui/               # UI primitives
│   │   ├── pos/              # POS-specific
│   │   └── admin/            # Admin-specific
│   ├── lib/                   # Utilities & services
│   │   ├── firebase/         # Firebase services
│   │   ├── performance/      # Performance tracking
│   │   └── utils.js          # Helper functions
│   ├── hooks/                 # Custom React hooks
│   ├── store/                 # Zustand stores
│   └── config/                # Configuration files
├── public/                    # Static assets
├── test/                      # Tests
└── package.json
```

---

## 3. Authentication & Authorization

### Authentication System

#### Provider

```javascript
// Firebase Authentication
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
```

#### Login Flow

```
1. User enters email/password on /login page
2. Firebase Auth validates credentials
3. On success:
   - Generate JWT token (custom)
   - Store user data in Zustand store
   - Persist to localStorage
   - Redirect based on role:
     * Admin → /admin/dashboard
     * Cashier → /sales
```

#### JWT Implementation

```javascript
// src/lib/jwt.js
export const jwtUtils = {
  generate: (payload) => {
    // Create JWT with user data
    // Include: userId, email, role, exp
  },
  decode: (token) => {
    // Decode and return payload
  },
  isValid: (token) => {
    // Check expiration
    // Verify signature
  },
};
```

#### Auth Store (Zustand)

```javascript
// src/store/useAuthStore.js
{
  isAuthenticated: boolean,
  user: {
    id: string,
    email: string,
    role: 'admin' | 'cashier' | 'manager',
    name: string,
    ...
  },
  token: string,
  login: (credentials) => Promise,
  logout: () => void,
  _hasHydrated: boolean  // SSR safety
}
```

### Authorization Levels

#### Route Protection

```javascript
// Admin routes: /admin/*
if (!isAuthenticated || user.role !== "admin") {
  redirect("/login");
}

// POS routes: /sales/*
if (!isAuthenticated) {
  redirect("/login");
}
```

#### Permission Matrix

```
Feature                  | Admin | Manager | Cashier
-------------------------|-------|---------|--------
Dashboard Access         |   ✓   |    ✓    |    ✗
Sales Processing         |   ✓   |    ✓    |    ✓
Product Management       |   ✓   |    ✓    |    ✗
Customer Management      |   ✓   |    ✓    |    ✓
Inventory Management     |   ✓   |    ✓    |    ✗
Reports & Analytics      |   ✓   |    ✓    |    ✗
User Management          |   ✓   |    ✗    |    ✗
Settings                 |   ✓   |    ✗    |    ✗
Shift Management         |   ✓   |    ✓    |    ✓
Expense Tracking         |   ✓   |    ✓    |    ✗
```

---

## 4. Database Structure (Firebase Firestore)

### Collections Overview

```javascript
// src/lib/firebase/firestore.js
export const COLLECTIONS = {
  USERS: "users",
  PRODUCTS: "products",
  CATEGORIES: "categories",
  ORDERS: "receipts",
  RECEIPTS: "receipts",
  CUSTOMERS: "customers",
  SESSIONS: "sessions",
  TICKETS: "tickets",
  SETTINGS: "settings",
  SYNC_HISTORY: "sync_history",
  CUSTOM_TABS: "custom_tabs",
  INVOICES: "invoices",
  PURCHASES: "purchases",
  SUPPLIERS: "suppliers",
  EXPENSES: "expenses",
  EXPENSE_CATEGORIES: "expense_categories",
};
```

### Detailed Collection Schemas

#### 1. **users** Collection

```javascript
{
  id: string,                    // Auto-generated
  email: string,                 // Unique
  name: string,
  role: "admin" | "cashier" | "manager",
  password: string,              // Hashed
  isActive: boolean,
  createdAt: timestamp,
  updatedAt: timestamp,
  permissions: {
    canManageProducts: boolean,
    canViewReports: boolean,
    canManageUsers: boolean,
    ...
  },
  profile: {
    phone: string,
    avatar: string,
    ...
  }
}
```

#### 2. **products** Collection

```javascript
{
  id: string,
  name: string,
  description: string,
  sku: string,                   // Stock Keeping Unit
  barcode: string,
  category: string,              // Category ID
  categoryName: string,
  price: number,
  cost: number,                  // Cost price
  stock: number,                 // Current stock level
  trackStock: boolean,           // Enable stock tracking
  lowStockThreshold: number,
  unit: string,                  // "piece", "gram", "ml", etc.
  images: string[],              // Image URLs
  isActive: boolean,
  isFeatured: boolean,
  variants: [{
    name: string,
    price: number,
    sku: string,
    stock: number
  }],
  tags: string[],
  supplier: string,              // Supplier ID
  cannabisInfo: {                // Specific to dispensary
    strain: string,
    thc: number,
    cbd: number,
    type: "indica" | "sativa" | "hybrid"
  },
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string              // User ID
}
```

#### 3. **categories** Collection

```javascript
{
  id: string,
  name: string,
  description: string,
  parentId: string,              // For nested categories
  icon: string,
  color: string,                 // Hex color
  order: number,                 // Display order
  isActive: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### 4. **receipts** (Orders) Collection

```javascript
{
  id: string,
  receiptNumber: string,         // e.g., "RCP-20260122-001"
  customerId: string,
  customerName: string,
  customerEmail: string,
  customerPhone: string,
  items: [{
    productId: string,
    productName: string,
    quantity: number,
    price: number,              // Unit price
    discount: number,           // Item discount
    total: number,              // (price * quantity) - discount
    categoryId: string,
    categoryName: string
  }],
  subtotal: number,
  discount: number,              // Receipt-level discount
  discountType: "percentage" | "fixed",
  discountReason: string,
  tax: number,
  taxRate: number,
  total: number,                 // Final amount paid
  paymentMethod: "cash" | "card" | "digital" | "mixed",
  paymentDetails: {
    cash: number,
    card: number,
    digital: number,
    change: number
  },
  cashbackEarned: number,        // Points earned
  cashbackUsed: number,          // Points redeemed
  status: "completed" | "pending" | "cancelled" | "refunded",
  shiftId: string,               // Employee shift
  employeeId: string,
  employeeName: string,
  notes: string,
  createdAt: timestamp,
  updatedAt: timestamp,
  completedAt: timestamp,
  refundedAt: timestamp,
  refundReason: string,
  isPrinted: boolean,
  printCount: number
}
```

#### 5. **customers** Collection

```javascript
{
  id: string,
  name: string,
  email: string,
  phone: string,                 // Primary identifier
  dateOfBirth: timestamp,
  address: {
    street: string,
    city: string,
    state: string,
    zipCode: string,
    country: string
  },
  identificationNumber: string,  // Government ID
  identificationType: string,    // "drivers_license", "passport", etc.
  expiryDate: timestamp,         // ID expiry
  points: number,                // Cashback points balance
  totalSpent: number,
  totalOrders: number,
  averageOrderValue: number,
  lastVisit: timestamp,
  firstVisit: timestamp,
  tier: "bronze" | "silver" | "gold" | "platinum",
  notes: string,
  isActive: boolean,
  isBlocked: boolean,
  blockedReason: string,
  tags: string[],
  preferences: {
    emailMarketing: boolean,
    smsMarketing: boolean,
    preferredContact: string
  },
  pendingApproval: boolean,      // For customer approval workflow
  approvedAt: timestamp,
  approvedBy: string,
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string
}
```

#### 6. **sessions** (Shifts) Collection

```javascript
{
  id: string,
  employeeId: string,
  employeeName: string,
  startTime: timestamp,
  endTime: timestamp,
  openingCash: number,           // Starting cash in drawer
  closingCash: number,           // Ending cash in drawer
  expectedCash: number,          // Calculated expected
  cashDifference: number,        // Actual vs expected
  totalSales: number,
  totalTransactions: number,
  paymentBreakdown: {
    cash: number,
    card: number,
    digital: number
  },
  receipts: string[],            // Receipt IDs
  notes: string,
  status: "open" | "closed",
  location: string,
  register: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### 7. **expenses** Collection

```javascript
{
  id: string,
  amount: number,
  categoryId: string,
  categoryName: string,
  description: string,
  vendor: string,
  paymentMethod: "cash" | "card" | "transfer",
  receiptImage: string,          // Storage URL
  date: timestamp,
  employeeId: string,
  employeeName: string,
  status: "pending" | "approved" | "rejected",
  approvedBy: string,
  approvedAt: timestamp,
  notes: string,
  tags: string[],
  recurring: boolean,
  recurringFrequency: "daily" | "weekly" | "monthly",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### 8. **expense_categories** Collection

```javascript
{
  id: string,
  name: string,
  description: string,
  budget: number,                // Monthly budget
  color: string,
  icon: string,
  isActive: boolean,
  order: number,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### 9. **suppliers** Collection

```javascript
{
  id: string,
  name: string,
  contactPerson: string,
  email: string,
  phone: string,
  address: {
    street: string,
    city: string,
    state: string,
    zipCode: string,
    country: string
  },
  products: string[],            // Product IDs
  paymentTerms: string,
  taxId: string,
  notes: string,
  isActive: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### 10. **purchases** (Purchase Orders) Collection

```javascript
{
  id: string,
  orderNumber: string,
  supplierId: string,
  supplierName: string,
  items: [{
    productId: string,
    productName: string,
    quantity: number,
    cost: number,
    total: number
  }],
  subtotal: number,
  tax: number,
  total: number,
  status: "draft" | "ordered" | "received" | "cancelled",
  orderedDate: timestamp,
  expectedDate: timestamp,
  receivedDate: timestamp,
  receivedBy: string,
  notes: string,
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string
}
```

#### 11. **stock_history** Collection

```javascript
{
  id: string,
  productId: string,
  productName: string,
  type: "sale" | "purchase" | "adjustment" | "return",
  quantity: number,              // Can be negative for sales
  previousStock: number,
  newStock: number,
  cost: number,
  reason: string,
  referenceId: string,           // Receipt ID, PO ID, etc.
  employeeId: string,
  employeeName: string,
  timestamp: timestamp,
  createdAt: timestamp
}
```

#### 12. **cashback_rules** Collection

```javascript
{
  id: string,
  name: string,
  description: string,
  type: "percentage" | "fixed",
  value: number,                 // Percentage or fixed amount
  minimumPurchase: number,
  maximumCashback: number,
  applicableCategories: string[],
  applicableProducts: string[],
  startDate: timestamp,
  endDate: timestamp,
  isActive: boolean,
  priority: number,              // Rule priority
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### 13. **point_usage_rules** Collection

```javascript
{
  id: string,
  name: string,
  description: string,
  pointsRequired: number,
  discountValue: number,
  discountType: "percentage" | "fixed",
  minimumPurchase: number,
  isActive: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### 14. **settings** Collection

```javascript
{
  id: "global",                  // Single document
  businessInfo: {
    name: string,
    address: string,
    phone: string,
    email: string,
    taxId: string,
    logo: string
  },
  currency: {
    code: "USD",
    symbol: "$",
    decimalPlaces: 2
  },
  tax: {
    enabled: boolean,
    rate: number,
    name: string,
    inclusive: boolean
  },
  receipt: {
    header: string,
    footer: string,
    showLogo: boolean,
    showTax: boolean,
    paperSize: "58mm" | "80mm"
  },
  notifications: {
    lowStock: boolean,
    dailyReport: boolean,
    email: string
  },
  features: {
    cashback: boolean,
    multiplePayments: boolean,
    customerRequired: boolean,
    stockTracking: boolean
  },
  updatedAt: timestamp,
  updatedBy: string
}
```

### Database Indexes

Required Firestore indexes for optimal performance:

```javascript
// Products
-category(Ascending) +
  isActive(Ascending) -
  isActive(Ascending) +
  name(Ascending) -
  // Receipts
  createdAt(Descending) -
  employeeId(Ascending) +
  createdAt(Descending) -
  customerId(Ascending) +
  createdAt(Descending) -
  status(Ascending) +
  createdAt(Descending) -
  // Customers
  phone(Ascending) -
  Unique -
  email(Ascending) -
  isActive(Ascending) +
  name(Ascending) -
  // Stock History
  productId(Ascending) +
  timestamp(Descending) -
  timestamp(Descending) -
  // Expenses
  categoryId(Ascending) +
  date(Descending) -
  employeeId(Ascending) +
  date(Descending) -
  date(Descending);
```

---

## 5. Application Layout Structure

### Root Layout

```javascript
// src/app/layout.js
<html>
  <head>
    <!-- PWA meta tags -->
    <!-- Fonts -->
  </head>
  <body>
    <OptimizedQueryProvider>    {/* React Query with Firebase optimization */}
      <QueryProvider>           {/* Additional React Query provider */}
        <ThemeProvider>         {/* Dark mode support */}
          <AuthInitializer>     {/* Auth state restoration */}
            {children}
          </AuthInitializer>
          <Toaster />          {/* Toast notifications */}
        </ThemeProvider>
      </QueryProvider>
    </OptimizedQueryProvider>
  </body>
</html>
```

### Layout Hierarchy

```
Root Layout (src/app/layout.js)
│
├── Auth Layout (src/app/(auth)/layout.js)
│   └── Login Page
│
├── POS Layout (src/app/(pos)/layout.js)
│   ├── Sales Page
│   ├── Customers Page
│   └── New Product Page
│
└── Admin Layout (src/app/admin/layout.js)
    ├── Dashboard
    ├── Products
    │   ├── Items List
    │   └── Categories
    ├── Stock Management
    │   ├── Stock Overview
    │   ├── Purchase Orders
    │   ├── Adjustments
    │   └── History
    ├── Sales Reports
    │   ├── Sales Summary
    │   ├── By Item
    │   ├── By Category
    │   ├── By Employee
    │   ├── By Payment
    │   ├── Receipts
    │   ├── Discounts
    │   └── Shifts
    ├── Orders
    ├── Customers
    │   ├── All Customers
    │   └── Customer Detail [id]
    ├── Expenses
    ├── Cashback
    ├── Users
    ├── Analytics
    ├── Integration
    └── Settings
```

### Admin Layout Structure

The admin layout provides:

1. **Sidebar Navigation** (Desktop)
2. **Bottom Navigation** (Mobile)
3. **User Profile Dropdown**
4. **Responsive Design**

```javascript
// Desktop: Left sidebar with collapsible sections
// Mobile: Bottom navigation with 3 main items
```

---

## 6. Complete Menu & Navigation

### Admin Panel Navigation (Desktop)

#### Level 1: Main Menu Items

```javascript
[
  {
    name: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    description: "Overview of business metrics"
  },

  {
    name: "Sales",
    icon: TrendingUp,
    subItems: [...],
    description: "Sales reports and analytics"
  },

  {
    name: "Products",
    icon: Package,
    subItems: [...],
    description: "Product and category management"
  },

  {
    name: "Stock",
    icon: Database,
    subItems: [...],
    description: "Inventory management"
  },

  {
    name: "Orders",
    href: "/admin/orders",
    icon: ShoppingCart,
    description: "View all sales orders"
  },

  {
    name: "Customers",
    href: "/admin/customers",
    icon: UserCircle,
    description: "Customer management"
  },

  {
    name: "Expenses",
    href: "/admin/expenses",
    icon: FileText,
    description: "Expense tracking"
  },

  {
    name: "Cashback",
    href: "/admin/cashback",
    icon: Percent,
    description: "Loyalty program management"
  },

  {
    name: "Users",
    href: "/admin/users",
    icon: Users,
    description: "Employee management"
  },

  {
    name: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    description: "Advanced analytics"
  },

  {
    name: "Integration",
    href: "/admin/integration",
    icon: Link2,
    description: "Third-party integrations"
  },

  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
    description: "System settings"
  }
]
```

#### Level 2: Sub-Menu Items

**Sales Sub-Menu:**

```javascript
[
  {
    name: "Sales Summary",
    href: "/admin/reports/sales-summary",
    icon: BarChart3,
    description: "Overall sales performance",
  },
  {
    name: "Sales by Item",
    href: "/admin/reports/sales-by-item",
    icon: Package,
    description: "Product performance",
  },
  {
    name: "Sales by Category",
    href: "/admin/reports/sales-by-category",
    icon: FolderTree,
    description: "Category performance",
  },
  {
    name: "Sales by Employee",
    href: "/admin/reports/sales-by-employee",
    icon: Users,
    description: "Employee performance",
  },
  {
    name: "Sales by Payment",
    href: "/admin/reports/sales-by-payment",
    icon: CreditCard,
    description: "Payment method breakdown",
  },
  {
    name: "Receipts",
    href: "/admin/reports/receipts",
    icon: Receipt,
    description: "All receipt records",
  },
  {
    name: "Discounts",
    href: "/admin/reports/discounts",
    icon: Percent,
    description: "Discount usage",
  },
  {
    name: "Shifts",
    href: "/admin/reports/shifts",
    icon: Clock,
    description: "Shift reports",
  },
];
```

**Products Sub-Menu:**

```javascript
[
  {
    name: "Item List",
    href: "/admin/products/items",
    icon: List,
    description: "All products",
  },
  {
    name: "Categories",
    href: "/admin/products/categories",
    icon: FolderTree,
    description: "Category management",
  },
];
```

**Stock Sub-Menu:**

```javascript
[
  {
    name: "Stock Management",
    href: "/admin/stock",
    icon: Database,
    description: "Current stock levels",
  },
  {
    name: "Purchase Orders",
    href: "/admin/stock/purchase-orders",
    icon: ShoppingCart,
    description: "Supplier orders",
  },
  {
    name: "Stock Adjustment",
    href: "/admin/stock/adjustments",
    icon: ClipboardList,
    description: "Manual stock adjustments",
  },
  {
    name: "Stock History",
    href: "/admin/stock/history",
    icon: Clock,
    description: "Stock movement history",
  },
];
```

### Mobile Bottom Navigation

```javascript
[
  {
    name: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Products",
    href: "/admin/products/items",
    icon: Package,
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];
```

### POS Navigation

```javascript
// Main POS screen at /sales
// Access to:
- Product Grid
- Cart Management
- Customer Selection
- Payment Processing
- Quick Actions (Customers, New Product)
```

---

## 7. Feature Documentation by Module

### 7.1 Dashboard Module

**Route:** `/admin/dashboard`

**Purpose:** Central hub showing key business metrics

**Features:**

1. **Metrics Cards**

   ```javascript
   - Total Sales (Today)
   - Total Orders (Today)
   - Active Customers
   - Low Stock Items
   - Revenue Trend
   - Top Selling Products
   ```

2. **Time Period Selector**

   ```
   - Today
   - Yesterday
   - Last 7 Days
   - Last 30 Days
   - This Month
   - Last Month
   - Custom Range
   ```

3. **Charts & Visualizations**

   ```javascript
   - Sales Trend (Line Chart)
   - Category Distribution (Pie Chart)
   - Payment Methods (Bar Chart)
   - Hourly Sales (Bar Chart)
   ```

4. **Quick Actions**

   ```
   - New Sale
   - Add Product
   - View Reports
   - Manage Inventory
   ```

5. **Recent Activity**
   ```
   - Latest Orders (5)
   - Low Stock Alerts
   - Pending Approvals
   ```

**API Endpoints Used:**

```javascript
GET /api/dashboard/metrics?period=today
GET /api/dashboard/charts?type=sales&period=week
GET /api/dashboard/activity
```

**Data Sources:**

```javascript
- receipts (aggregated)
- products (stock levels)
- customers (active count)
```

**Mobile Specific:**

- Simplified layout
- Stacked cards
- Touch-optimized charts

---

### 7.2 Sales/POS Module

**Route:** `/sales` (Cashier view)

**Purpose:** Process customer purchases

**Layout Components:**

1. **Left Section: Product Grid**

   ```javascript
   - Category tabs at top
   - Product cards in grid
   - Search bar
   - Quick filters

   Product Card Shows:
   - Product image
   - Name
   - Price
   - Stock level
   - Quick add button
   ```

2. **Right Section: Cart**
   ```javascript
   - Customer selector (dropdown/search)
   - Cart items list
   - Quantity controls (+/-)
   - Remove item button
   - Subtotal
   - Discount controls
   - Tax calculation
   - Total amount
   - Payment method selector
   - Complete sale button
   ```

**Workflow:**

```
1. Select Customer (optional)
   └─ Search by phone/name/email
   └─ Create new customer inline

2. Add Products to Cart
   └─ Click product card
   └─ Scan barcode
   └─ Search product

3. Modify Cart
   └─ Change quantities
   └─ Remove items
   └─ Apply discounts

4. Apply Cashback Points
   └─ View customer balance
   └─ Choose points to redeem
   └─ Calculate discount

5. Select Payment Method
   └─ Cash
   └─ Card
   └─ Digital (QR/NFC)
   └─ Mixed payment

6. Complete Sale
   └─ Validate payment
   └─ Generate receipt
   └─ Update inventory
   └─ Award cashback points
   └─ Print receipt
   └─ Clear cart
```

**Features:**

1. **Product Search**

   ```javascript
   - By name
   - By SKU
   - By barcode
   - Fuzzy matching
   ```

2. **Customer Management**

   ```javascript
   - Quick customer lookup
   - Create customer inline
   - View cashback balance
   - Apply stored points
   ```

3. **Discount System**

   ```javascript
   Types:
   - Percentage discount
   - Fixed amount discount
   - Item-level discount
   - Receipt-level discount
   - Automatic cashback rules
   ```

4. **Payment Processing**

   ```javascript
   Single Payment:
   - Cash (with change calculation)
   - Card
   - Digital wallet

   Split Payment:
   - Multiple payment methods
   - Partial payments
   - Exact split calculation
   ```

5. **Receipt Generation**
   ```javascript
   - Unique receipt number
   - QR code (for digital receipt)
   - Item details
   - Payment breakdown
   - Cashback earned/used
   - Business info
   - Tax details
   ```

**State Management:**

```javascript
// Cart State
{
  items: [
    {
      productId: string,
      name: string,
      price: number,
      quantity: number,
      discount: number,
      total: number
    }
  ],
  customerId: string,
  customerInfo: object,
  subtotal: number,
  discount: number,
  tax: number,
  total: number,
  paymentMethod: string,
  cashbackToUse: number
}
```

**Keyboard Shortcuts:**

```
F1 - Focus product search
F2 - Focus customer search
F3 - Apply discount
F4 - Clear cart
F5 - Complete sale
ESC - Cancel current action
```

**Mobile Adaptations:**

- Full-screen product grid
- Floating cart button
- Swipe gestures
- Touch-optimized buttons
- Simplified payment flow

---

### 7.3 Products Module

**Routes:**

- `/admin/products/items` - Product list
- `/admin/products/categories` - Category management
- `/admin/products/new` - Add new product

#### 7.3.1 Product List

**Features:**

1. **Product Table/Grid**

   ```javascript
   Columns: -Image -
     Name -
     SKU -
     Category -
     Price -
     Cost -
     Stock -
     Status(Active / Inactive) -
     Actions(Edit, Delete, View);
   ```

2. **Filters**

   ```javascript
   - By category
   - By status (Active/Inactive)
   - By stock level (In stock, Low stock, Out of stock)
   - Price range
   - Search by name/SKU
   ```

3. **Bulk Actions**

   ```javascript
   - Select multiple products
   - Bulk activate/deactivate
   - Bulk price update
   - Bulk category change
   - Export to CSV
   ```

4. **Quick Actions**
   ```javascript
   - Add new product
   - Import products (CSV)
   - Print barcode labels
   - Stock report
   ```

**Product Form Fields:**

```javascript
{
  // Basic Info
  name: string (required),
  description: string,
  sku: string (auto-generated or manual),
  barcode: string,

  // Pricing
  price: number (required),
  cost: number,
  compareAtPrice: number (for showing discount),

  // Categorization
  category: string (dropdown),
  tags: string[],

  // Inventory
  trackStock: boolean,
  stock: number,
  lowStockThreshold: number,
  unit: string (piece, gram, ml, etc.),

  // Images
  images: File[] (drag-drop upload),
  primaryImage: number (index),

  // Variants (optional)
  hasVariants: boolean,
  variants: [{
    name: string,
    sku: string,
    price: number,
    stock: number
  }],

  // Cannabis Specific (optional)
  cannabisInfo: {
    strain: string,
    thc: number,
    cbd: number,
    type: string (indica/sativa/hybrid),
    terpenes: string[]
  },

  // Supplier
  supplierId: string,

  // Status
  isActive: boolean,
  isFeatured: boolean
}
```

**Validation Rules:**

```javascript
- Name: required, min 2 chars
- Price: required, > 0
- SKU: unique
- Barcode: unique (if provided)
- Stock: >= 0 if trackStock enabled
```

#### 7.3.2 Categories

**Features:**

1. **Category List**

   ```javascript
   Display:
   - Name
   - Description
   - Product count
   - Icon/Color
   - Status
   - Actions
   ```

2. **Category Tree**

   ```javascript
   - Nested categories (parent/child)
   - Drag-drop reordering
   - Expand/collapse
   ```

3. **Category Form**
   ```javascript
   {
     name: string (required),
     description: string,
     parentId: string (optional, for subcategories),
     icon: string (icon name),
     color: string (hex color),
     order: number (display order),
     isActive: boolean
   }
   ```

**Business Rules:**

- Cannot delete category with products
- Deleting parent moves children to root
- Category names must be unique

---

### 7.4 Stock Management Module

#### 7.4.1 Stock Overview (`/admin/stock`)

**Features:**

1. **Stock Table**

   ```javascript
   Columns:
   - Product name
   - SKU
   - Current stock
   - Low stock threshold
   - Stock value (cost * quantity)
   - Last updated
   - Actions (Adjust, History)
   ```

2. **Stock Alerts**

   ```javascript
   - Low stock items (< threshold)
   - Out of stock items
   - Overstock items
   ```

3. **Quick Filters**

   ```javascript
   - All products
   - Low stock only
   - Out of stock only
   - By category
   ```

4. **Stock Summary Cards**
   ```javascript
   - Total stock value
   - Low stock items count
   - Out of stock items count
   - Total products tracked
   ```

#### 7.4.2 Purchase Orders (`/admin/stock/purchase-orders`)

**Purpose:** Order stock from suppliers

**Workflow:**

```
1. Create Purchase Order
   └─ Select supplier
   └─ Add products
   └─ Set quantities
   └─ Enter costs
   └─ Calculate total

2. Order Status Tracking
   └─ Draft
   └─ Ordered (sent to supplier)
   └─ Received (stock updated)
   └─ Cancelled

3. Receive Order
   └─ Mark as received
   └─ Verify quantities
   └─ Update stock levels
   └─ Record costs
```

**Purchase Order Form:**

```javascript
{
  orderNumber: string (auto-generated),
  supplier: {
    id: string,
    name: string,
    contact: string
  },
  items: [{
    productId: string,
    productName: string,
    quantity: number,
    cost: number,
    total: number
  }],
  subtotal: number,
  tax: number,
  shipping: number,
  total: number,
  status: string,
  orderedDate: date,
  expectedDate: date,
  receivedDate: date,
  notes: string
}
```

**Actions:**

- Create new PO
- Edit draft PO
- Send to supplier (change status)
- Mark as received (update stock)
- Cancel PO
- Print PO
- Export to PDF

#### 7.4.3 Stock Adjustments (`/admin/stock/adjustments`)

**Purpose:** Manually adjust stock levels

**Reasons for Adjustment:**

```javascript
- Damaged goods
- Expired products
- Theft/Loss
- Found inventory
- Count correction
- Return to supplier
- Samples/Giveaways
```

**Adjustment Form:**

```javascript
{
  productId: string,
  productName: string,
  currentStock: number (read-only),
  adjustment: number (+ or -),
  newStock: number (calculated),
  reason: string (dropdown),
  notes: string,
  date: date,
  employeeId: string (auto-filled)
}
```

**Process:**

1. Select product
2. View current stock
3. Enter adjustment (+/-)
4. Select reason
5. Add notes
6. Submit
7. Stock updated instantly
8. History record created

#### 7.4.4 Stock History (`/admin/stock/history`)

**Purpose:** Track all stock movements

**History Table:**

```javascript
Columns:
- Date/Time
- Product
- Type (Sale, Purchase, Adjustment, Return)
- Quantity (+/-)
- Previous stock
- New stock
- Employee
- Reference (Receipt #, PO #, etc.)
- Notes
```

**Filters:**

```javascript
- Date range
- Product
- Type of movement
- Employee
- Reference number
```

**Export Options:**

- CSV export
- PDF report
- Excel format

**Stock Movement Types:**

```javascript
{
  SALE: "Product sold (decreases stock)",
  PURCHASE: "Received from supplier (increases stock)",
  ADJUSTMENT: "Manual correction",
  RETURN: "Customer return (increases stock)",
  DAMAGE: "Damaged/expired (decreases stock)",
  TRANSFER: "Location transfer"
}
```

---

### 7.5 Customer Management Module

**Route:** `/admin/customers`

**Features:**

1. **Customer List**

   ```javascript
   Table Columns:
   - Name
   - Phone
   - Email
   - Points balance
   - Total spent
   - Total orders
   - Last visit
   - Status
   - Actions
   ```

2. **Customer Detail View** (`/admin/customers/[id]`)

   ```javascript
   Tabs:

   1. Overview
      - Personal info
      - ID verification status
      - Points balance
      - Tier level

   2. Purchase History
      - All orders
      - Order details
      - Total spent
      - Average order value

   3. Cashback Activity
      - Points earned history
      - Points redeemed history
      - Current balance

   4. Edit Info
      - Update personal details
      - Update ID info
      - Add notes
   ```

3. **Customer Form**

   ```javascript
   {
     // Personal Info
     name: string (required),
     email: string,
     phone: string (required, unique),
     dateOfBirth: date,

     // Address
     address: {
       street: string,
       city: string,
       state: string,
       zipCode: string,
       country: string
     },

     // Identification (for compliance)
     identificationType: string (dropdown),
     identificationNumber: string,
     expiryDate: date,
     idImage: File (upload),

     // Additional
     notes: string,
     tags: string[],
     preferredContact: string (email/phone/sms),
     marketingOptIn: boolean
   }
   ```

4. **Customer Approval Workflow**

   ```javascript
   For new customers (compliance):

   Status: Pending
   ↓
   Admin reviews ID
   ↓
   Approve/Reject
   ↓
   Status: Active/Blocked

   Pending customers can't make purchases
   ```

5. **Customer Search**

   ```javascript
   Search by:
   - Name (fuzzy)
   - Phone (exact/partial)
   - Email
   - ID number
   ```

6. **Filters**

   ```javascript
   - All customers
   - Active only
   - Pending approval
   - Blocked
   - By tier (Bronze/Silver/Gold/Platinum)
   - By points range
   - By last visit date
   ```

7. **Bulk Actions**
   ```javascript
   - Export to CSV
   - Send bulk email
   - Send bulk SMS
   - Update tier levels
   ```

**Customer Lifecycle:**

```
New Registration
↓
Pending Approval (if required)
↓
Active (can make purchases)
↓
- Accumulate points
- Redeem points
- Tier upgrades
↓
Inactive (no purchases > 90 days)
↓
Blocked (optional, if needed)
```

---

### 7.6 Reports Module

#### 7.6.1 Sales Summary (`/admin/reports/sales-summary`)

**Purpose:** Overall sales performance

**Key Metrics:**

```javascript
- Total Sales Revenue
- Total Orders
- Average Order Value
- Total Items Sold
- Gross Profit
- Net Profit (after expenses)
- Sales Growth (vs previous period)
```

**Visualizations:**

```javascript
1. Sales Trend (Line Chart)
   - X-axis: Time (days/weeks/months)
   - Y-axis: Sales amount
   - Comparison line (previous period)

2. Sales by Hour (Bar Chart)
   - Peak hours identification

3. Sales by Day of Week (Bar Chart)
   - Best performing days

4. Payment Method Distribution (Pie Chart)
   - Cash, Card, Digital breakdown
```

**Filters:**

```javascript
- Date range selector
- Compare with previous period toggle
- Employee filter
- Payment method filter
```

#### 7.6.2 Sales by Item (`/admin/reports/sales-by-item`)

**Purpose:** Product performance analysis

**Table:**

```javascript
Columns:
- Product name
- Quantity sold
- Revenue
- Average price
- Cost of goods sold (COGS)
- Profit
- Profit margin %
- Percentage of total sales
```

**Sorting:**

- By revenue (default)
- By quantity
- By profit
- By margin

**Visualizations:**

```javascript
1. Top 10 Products (Bar Chart)
2. Product Mix (Tree Map)
3. Revenue Distribution (Pareto Chart)
```

**Actions:**

- Export to CSV
- Print report
- View product details
- Adjust pricing

#### 7.6.3 Sales by Category (`/admin/reports/sales-by-category`)

**Purpose:** Category performance

**Metrics per Category:**

```javascript
- Total revenue
- Number of products sold
- Number of transactions
- Average order value
- Percentage of total sales
```

**Visualization:**

```javascript
- Pie Chart (revenue distribution)
- Bar Chart (quantity by category)
- Trend Lines (category growth over time)
```

#### 7.6.4 Sales by Employee (`/admin/reports/sales-by-employee`)

**Purpose:** Employee performance tracking

**Table:**

```javascript
Columns:
- Employee name
- Total sales
- Number of transactions
- Average transaction value
- Items per transaction
- Active shifts
- Sales per hour
```

**Use Cases:**

- Commission calculation
- Performance reviews
- Incentive programs
- Identify training needs

#### 7.6.5 Sales by Payment Method (`/admin/reports/sales-by-payment`)

**Purpose:** Payment analysis

**Breakdown:**

```javascript
- Cash: amount, count, percentage
- Card: amount, count, percentage
- Digital: amount, count, percentage
- Mixed: amount, count, percentage
```

**Useful for:**

- Cash management
- Reconciliation
- Payment processor fees
- Trend analysis

#### 7.6.6 Receipts Report (`/admin/reports/receipts`)

**Purpose:** Detailed receipt listing

**Features:**

```javascript
1. Search & Filter
   - By receipt number
   - By date range
   - By customer
   - By employee
   - By status (completed/cancelled/refunded)
   - By payment method
   - By amount range

2. Receipt Details View
   - Full receipt information
   - Items breakdown
   - Payment details
   - Customer info
   - Cashback earned/used
   - Print receipt
   - Send receipt via email

3. Actions
   - Void receipt (if authorized)
   - Refund processing
   - Reprint
   - Email to customer
   - Add notes
```

**Refund Workflow:**

```
1. Select receipt
2. Choose items to refund (full/partial)
3. Enter refund reason
4. Process refund
5. Update inventory (return stock)
6. Reverse cashback points
7. Record refund transaction
```

#### 7.6.7 Discounts Report (`/admin/reports/discounts`)

**Purpose:** Track discount usage

**Metrics:**

```javascript
- Total discounts given
- Discount as % of sales
- Most used discount types
- Discount by employee
- Discount by customer
```

**Discount Analysis:**

```javascript
Types:
- Manual discounts (employee applied)
- Automatic rules (cashback, promotions)
- Coupon codes
- Bulk discounts

Impact:
- Revenue loss
- Customer acquisition
- Average order value increase
```

#### 7.6.8 Shifts Report (`/admin/reports/shifts`)

**Purpose:** Shift reconciliation and tracking

**Shift Detail:**

```javascript
{
  employee: string,
  startTime: timestamp,
  endTime: timestamp,
  duration: number (hours),

  Cash Drawer:
  - Opening balance
  - Expected closing balance
  - Actual closing balance
  - Difference (over/short)

  Sales:
  - Total sales
  - Number of transactions
  - Average transaction

  Payment Breakdown:
  - Cash received
  - Card payments
  - Digital payments

  Performance:
  - Sales per hour
  - Items per transaction
  - Discounts given
}
```

**Shift Actions:**

```javascript
- View detailed transactions
- Print shift report
- Add notes/explanations
- Mark discrepancies as resolved
```

**Shift Alerts:**

```javascript
- Large cash discrepancies
- Unusually high discounts
- No-sale register opens
- Voided transactions
```

---

### 7.7 Expenses Module

**Route:** `/admin/expenses`

**Purpose:** Track business expenses

**Features:**

1. **Expense List**

   ```javascript
   Table:
   - Date
   - Category
   - Description
   - Vendor
   - Amount
   - Payment method
   - Employee
   - Status (Pending/Approved/Rejected)
   - Receipt image
   - Actions
   ```

2. **Add Expense Form**

   ```javascript
   {
     date: date (default today),
     categoryId: string (dropdown),
     amount: number (required),
     vendor: string,
     description: string (required),
     paymentMethod: string (Cash/Card/Transfer),
     receiptImage: File (upload),
     notes: string,
     tags: string[],
     recurring: boolean,
     recurringFrequency: string (if recurring)
   }
   ```

3. **Expense Categories**

   ```javascript
   Examples:
   - Rent/Utilities
   - Salaries/Wages
   - Inventory purchases
   - Marketing/Advertising
   - Supplies
   - Maintenance
   - Insurance
   - Taxes
   - Professional fees
   - Other

   Each category has:
   - Monthly budget
   - Current spending
   - Budget remaining
   - Color coding
   ```

4. **Expense Analytics**

   ```javascript
   Views:
   - Expenses by category (Pie Chart)
   - Monthly expense trend (Line Chart)
   - Budget vs actual (Bar Chart)
   - Top vendors (Bar Chart)
   ```

5. **Filters**

   ```javascript
   - Date range
   - Category
   - Status
   - Payment method
   - Vendor
   - Employee
   - Amount range
   ```

6. **Approval Workflow**

   ```javascript
   For expenses requiring approval:

   Employee submits expense
   ↓
   Status: Pending
   ↓
   Admin reviews
   ↓
   Approve/Reject (with reason)
   ↓
   Status updated
   ↓
   Employee notified
   ```

7. **Budget Management**
   ```javascript
   Set budgets per category:
   - Monthly limit
   - Alert threshold (80% of budget)
   - Auto-notifications
   - Budget reports
   ```

**Export Options:**

- CSV export
- PDF expense report
- Tax report format
- Monthly summary

---

### 7.8 Cashback/Loyalty Module

**Route:** `/admin/cashback`

**Purpose:** Manage customer loyalty program

**Components:**

#### 1. Cashback Rules

**Earning Rules:**

```javascript
{
  id: string,
  name: string (e.g., "Standard Cashback"),
  type: "percentage" | "fixed",
  value: number,
  minimumPurchase: number,
  maximumCashback: number,
  applicableCategories: string[] (empty = all),
  applicableProducts: string[] (empty = all),
  startDate: date,
  endDate: date,
  isActive: boolean,
  priority: number
}
```

**Example Rules:**

```javascript
Rule 1: Earn 5% on all purchases over $50
Rule 2: Earn 10% on specific category (e.g., Edibles)
Rule 3: Earn $5 for every $100 spent
Rule 4: Earn 2x points on Fridays
```

**Rule Priority:**

- Higher priority rules apply first
- Multiple rules can apply (additive)
- Can set exclusive rules (only one applies)

#### 2. Point Redemption Rules

**Usage Rules:**

```javascript
{
  id: string,
  name: string (e.g., "$5 off with 500 points"),
  pointsRequired: number,
  discountValue: number,
  discountType: "percentage" | "fixed",
  minimumPurchase: number,
  isActive: boolean
}
```

**Example Redemption:**

```javascript
100 points = $1 discount
500 points = $5 off (minimum $25 purchase)
1000 points = 10% off entire order
```

#### 3. Customer Tiers

**Tier System:**

```javascript
{
  Bronze: {
    threshold: 0,
    benefits: "Standard points",
    multiplier: 1.0
  },
  Silver: {
    threshold: 1000,  // Total points earned (lifetime)
    benefits: "1.2x points",
    multiplier: 1.2
  },
  Gold: {
    threshold: 5000,
    benefits: "1.5x points + exclusive offers",
    multiplier: 1.5
  },
  Platinum: {
    threshold: 10000,
    benefits: "2x points + priority support",
    multiplier: 2.0
  }
}
```

**Tier Calculation:**

- Based on lifetime points earned
- Automatic tier upgrades
- Tier benefits apply to future purchases
- Can set tier expiration (optional)

#### 4. Cashback Analytics

**Metrics:**

```javascript
- Total points issued
- Total points redeemed
- Points liability (unredeemed points value)
- Most active customers
- Redemption rate
- Average points per transaction
- Program ROI
```

**Reports:**

```javascript
- Points earned by period
- Points redeemed by period
- Customer engagement (% using points)
- Tier distribution
- Rule effectiveness
```

---

### 7.9 Users (Employee) Module

**Route:** `/admin/users`

**Purpose:** Manage employees and users

**Features:**

1. **User List**

   ```javascript
   Table:
   - Name
   - Email
   - Role (Admin/Manager/Cashier)
   - Status (Active/Inactive)
   - Last login
   - Created date
   - Actions
   ```

2. **Add/Edit User Form**

   ```javascript
   {
     name: string (required),
     email: string (required, unique),
     password: string (required for new),
     role: string (dropdown),
     phone: string,
     avatar: File (upload),

     Permissions:
     - canManageProducts: boolean,
     - canViewReports: boolean,
     - canManageCustomers: boolean,
     - canProcessRefunds: boolean,
     - canGiveDiscounts: boolean,
     - discountLimit: number,
     - canManageInventory: boolean,
     - canManageUsers: boolean (admin only),
     - canAccessSettings: boolean,

     Status:
     - isActive: boolean,
     - notes: string
   }
   ```

3. **Role Definitions**

   ```javascript
   Admin:
   - Full system access
   - All permissions enabled
   - Can manage other users
   - Can access all reports
   - Can modify settings

   Manager:
   - POS access
   - Product management
   - Customer management
   - View reports
   - Limited settings access

   Cashier:
   - POS access only
   - Customer lookup
   - Limited discounts
   - No admin panel access
   - Cannot view reports
   ```

4. **User Activity Log**

   ```javascript
   Track:
   - Login/logout times
   - Sales processed
   - Products added/modified
   - Discounts given
   - Refunds processed
   - Settings changed
   ```

5. **Performance Metrics**
   ```javascript
   Per User:
   - Total sales
   - Number of transactions
   - Average transaction value
   - Active days
   - Average discounts given
   ```

---

### 7.10 Analytics Module

**Route:** `/admin/analytics`

**Purpose:** Advanced business analytics

**Sections:**

#### 1. Business Overview

```javascript
KPIs:
- Revenue (current period)
- Revenue growth % (vs previous)
- Profit margin
- Customer acquisition cost
- Customer lifetime value
- Inventory turnover rate
- Average order value
- Customer retention rate
```

#### 2. Sales Analytics

```javascript
Charts:
- Sales funnel
- Conversion rate
- Cart abandonment rate
- Peak sales times (heatmap)
- Sales by location (if multi-location)
- Sales forecast (predictive)
```

#### 3. Product Analytics

```javascript
Metrics:
- Best sellers
- Worst performers
- Stock turnover by product
- Profit margin by product
- Product bundling opportunities
- Seasonal trends
```

#### 4. Customer Analytics

```javascript
Insights:
- Customer segmentation
- RFM analysis (Recency, Frequency, Monetary)
- Customer churn rate
- Lifetime value by segment
- Purchase frequency distribution
- Average basket size by customer type
```

#### 5. Inventory Analytics

```javascript
Metrics:
- Stock turnover rate
- Days inventory outstanding
- Dead stock identification
- Optimal reorder points
- Stock-out analysis
- Overstock costs
```

#### 6. Financial Analytics

```javascript
Reports:
- Profit & Loss statement
- Cash flow analysis
- Expense breakdown
- Revenue streams
- Break-even analysis
- Budget vs actual
```

---

### 7.11 Integration Module

**Route:** `/admin/integration`

**Purpose:** Third-party system integrations

**Available Integrations:**

1. **Loyverse Integration**

   ```javascript
   Sync with Loyverse POS:
   - Import products
   - Import customers
   - Sync sales data
   - Inventory sync

   Configuration:
   - API token
   - Store ID
   - Sync frequency
   - Sync direction (one-way/two-way)
   ```

2. **Payment Processors**

   ```javascript
   - Stripe
   - Square
   - PayPal
   - Custom payment gateway

   Setup:
   - API credentials
   - Webhook URLs
   - Test mode toggle
   ```

3. **Accounting Software**

   ```javascript
   - QuickBooks
   - Xero
   - FreshBooks

   Sync:
   - Sales data
   - Expenses
   - Inventory valuation
   ```

4. **Email/SMS Marketing**

   ```javascript
   - Mailchimp
   - SendGrid
   - Twilio

   Use cases:
   - Customer receipts
   - Marketing campaigns
   - Low stock alerts
   - Shift reports
   ```

5. **Barcode Scanner**

   ```javascript
   Support for:
   - USB scanners
   - Bluetooth scanners
   - Camera-based scanning (mobile)
   ```

6. **Printer Integration**

   ```javascript
   - Thermal receipt printers
   - Label printers (for barcodes)
   - Network printers

   Print Queue:
   - Automatic printing
   - Manual print
   - Reprint capability
   ```

---

### 7.12 Settings Module

**Route:** `/admin/settings`

**Purpose:** System configuration

**Sections:**

#### 1. Business Information

```javascript
{
  name: string,
  address: {
    street: string,
    city: string,
    state: string,
    zipCode: string,
    country: string
  },
  phone: string,
  email: string,
  website: string,
  taxId: string,
  logo: File (upload),
  favicon: File
}
```

#### 2. Currency & Tax

```javascript
Currency:
- Currency code (USD, EUR, etc.)
- Symbol ($, €, etc.)
- Decimal places
- Thousands separator
- Decimal separator

Tax:
- Enable tax calculation
- Tax rate (%)
- Tax name (VAT, Sales Tax, etc.)
- Tax inclusive/exclusive
- Multiple tax rates (if needed)
```

#### 3. Receipt Settings

```javascript
{
  // Header
  header: string (custom text),
  showLogo: boolean,

  // Content
  showItemDetails: boolean,
  showSKU: boolean,
  showCategory: boolean,
  showTax: boolean,
  showCashback: boolean,

  // Footer
  footer: string (custom text),
  showQRCode: boolean (for digital receipt),
  showReturnPolicy: boolean,
  returnPolicyText: string,

  // Technical
  paperSize: "58mm" | "80mm",
  autoPrint: boolean,
  printCopies: number
}
```

#### 4. Notifications

```javascript
{
  email: {
    enabled: boolean,
    recipients: string[],
    events: {
      lowStock: boolean,
      dailySummary: boolean,
      newCustomer: boolean,
      largeOrder: boolean (threshold)
    }
  },

  push: {
    enabled: boolean,
    events: {
      shiftStart: boolean,
      shiftEnd: boolean,
      systemAlerts: boolean
    }
  },

  sms: {
    enabled: boolean,
    provider: string,
    apiKey: string,
    events: {
      receiptToCustomer: boolean,
      appointmentReminders: boolean
    }
  }
}
```

#### 5. Feature Toggles

```javascript
{
  features: {
    cashbackEnabled: boolean,
    multiplePaymentMethods: boolean,
    customerRequired: boolean,
    stockTracking: boolean,
    barcodeScanning: boolean,
    customerApprovalRequired: boolean,
    tippingEnabled: boolean,
    reservationSystem: boolean
  }
}
```

#### 6. POS Settings

```javascript
{
  defaultCustomer: string (for walk-in sales),
  requireCustomer: boolean,
  allowNegativeStock: boolean,
  maxDiscountPercentage: number,
  requireDiscountReason: boolean,
  autoPrintReceipt: boolean,
  soundEffects: boolean,
  defaultView: "grid" | "list",
  itemsPerPage: number
}
```

#### 7. Security Settings

```javascript
{
  sessionTimeout: number (minutes),
  passwordPolicy: {
    minLength: number,
    requireUppercase: boolean,
    requireLowercase: boolean,
    requireNumbers: boolean,
    requireSpecialChars: boolean
  },
  twoFactorAuth: boolean,
  ipWhitelist: string[],
  maxLoginAttempts: number,
  lockoutDuration: number (minutes)
}
```

#### 8. Backup & Data

```javascript
{
  autoBackup: boolean,
  backupFrequency: "daily" | "weekly" | "monthly",
  backupTime: string (HH:MM),
  backupLocation: string (cloud storage),
  dataRetention: number (days),

  Actions:
  - Backup now
  - Restore from backup
  - Export all data
  - Import data
  - Clear cache
}
```

#### 9. System Information

```javascript
Display:
- App version
- Database size
- Total products
- Total customers
- Total sales (all time)
- System health status
- Last backup date
- License information
```

---

## 8. API Routes & Endpoints

### API Structure

```
src/app/api/
├── apk/
│   ├── route.js           # Upload/manage APK files
│   └── download/
│       └── route.js       # Download APK
├── cart/
│   ├── route.js           # Cart operations
│   └── payment/
│       └── route.js       # Process payment
├── loyverse/
│   └── route.js           # Loyverse integration
├── mobile/
│   └── route.js           # Mobile API endpoints
├── orders/
│   └── submit/
│       └── route.js       # Submit order
├── print/
│   └── route.js           # Print receipt
├── products/
│   └── list/
│       └── route.js       # Get products list
└── stock/
    └── check/
        └── route.js       # Check stock availability
```

### API Endpoint Details

#### 1. **POST /api/cart**

```javascript
Purpose: Manage cart operations

Request:
{
  action: "add" | "remove" | "update" | "clear",
  productId: string,
  quantity: number,
  customerId: string (optional)
}

Response:
{
  success: boolean,
  cart: {
    items: [...],
    subtotal: number,
    tax: number,
    total: number
  }
}
```

#### 2. **POST /api/cart/payment**

```javascript
Purpose: Process payment and complete sale

Request:
{
  customerId: string,
  items: [{
    productId: string,
    quantity: number,
    price: number
  }],
  paymentMethod: string,
  paymentDetails: {
    cash: number,
    card: number,
    digital: number
  },
  discount: number,
  cashbackUsed: number
}

Response:
{
  success: boolean,
  receiptId: string,
  receiptNumber: string,
  total: number,
  change: number,
  cashbackEarned: number,
  message: string
}

Side Effects:
- Create receipt document
- Update product stock
- Update customer points
- Record stock history
- Update shift data
```

#### 3. **GET /api/products/list**

```javascript
Purpose: Get products with filtering

Query Params:
- category: string
- search: string
- active: boolean
- page: number
- limit: number

Response:
{
  success: boolean,
  products: [{
    id: string,
    name: string,
    price: number,
    stock: number,
    category: string,
    image: string,
    ...
  }],
  pagination: {
    page: number,
    limit: number,
    total: number,
    pages: number
  }
}
```

#### 4. **POST /api/stock/check**

```javascript
Purpose: Check product availability

Request:
{
  productId: string,
  quantity: number
}

Response:
{
  success: boolean,
  available: boolean,
  currentStock: number,
  message: string
}
```

#### 5. **POST /api/orders/submit**

```javascript
Purpose: Submit an order (alternative to cart/payment)

Request:
{
  orderData: {
    customer: object,
    items: array,
    payment: object,
    discount: number
  }
}

Response:
{
  success: boolean,
  orderId: string,
  receiptNumber: string
}
```

#### 6. **POST /api/print**

```javascript
Purpose: Print receipt

Request:
{
  receiptId: string,
  printerName: string (optional),
  copies: number (default 1)
}

Response:
{
  success: boolean,
  jobId: string,
  message: string
}
```

#### 7. **GET/POST /api/loyverse**

```javascript
Purpose: Sync with Loyverse POS

GET - Test connection:
Response: {
  success: boolean,
  connected: boolean,
  storeInfo: object
}

POST - Sync data:
Request: {
  syncType: "products" | "customers" | "sales",
  direction: "import" | "export"
}

Response: {
  success: boolean,
  synced: number,
  failed: number,
  errors: array
}
```

#### 8. **GET/POST /api/mobile**

```javascript
Purpose: Mobile app API endpoints

Endpoints:
- GET /api/mobile - Get app info
- POST /api/mobile/login - Mobile login
- GET /api/mobile/products - Get products for mobile
- POST /api/mobile/sync - Sync offline data

Each endpoint returns mobile-optimized data
```

#### 9. **POST /api/apk**

```javascript
Purpose: Upload Android APK

Request: FormData
- apk: File
- version: string
- releaseNotes: string

Response:
{
  success: boolean,
  fileUrl: string,
  version: string
}
```

#### 10. **GET /api/apk/download**

```javascript
Purpose: Download latest APK

Response:
- File download (application/vnd.android.package-archive)
- Or redirect to download URL
```

### API Authentication

```javascript
// All API routes require authentication
// Token passed in header:
Authorization: Bearer <jwt_token>

// Validation in API route:
const token = req.headers.authorization?.split(' ')[1];
const user = jwtUtils.decode(token);

if (!jwtUtils.isValid(token)) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### API Error Handling

```javascript
// Standard error response format:
{
  success: false,
  error: {
    code: string,
    message: string,
    details: any
  }
}

// Common error codes:
- AUTH_REQUIRED: Authentication required
- INVALID_TOKEN: Token expired or invalid
- INSUFFICIENT_PERMISSIONS: User lacks permissions
- VALIDATION_ERROR: Input validation failed
- NOT_FOUND: Resource not found
- CONFLICT: Resource conflict (e.g., duplicate)
- INTERNAL_ERROR: Server error
```

---

## 9. State Management

### Zustand Stores

#### 1. Auth Store (`src/store/useAuthStore.js`)

```javascript
{
  // State
  isAuthenticated: boolean,
  user: object | null,
  token: string | null,
  _hasHydrated: boolean,

  // Actions
  login: async (email, password) => {
    // Firebase auth
    // Generate JWT
    // Update state
    // Persist to localStorage
  },

  logout: () => {
    // Clear state
    // Clear localStorage
    // Redirect to login
  },

  setUser: (user) => {
    // Update user data
  },

  checkAuth: () => {
    // Validate token
    // Return boolean
  }
}

// Persistence:
persist(
  (set, get) => ({...}),
  {
    name: 'auth-storage',
    storage: createJSONStorage(() => localStorage)
  }
)
```

#### 2. Cart Store (if using Zustand for cart)

```javascript
{
  // State
  items: array,
  customerId: string | null,
  subtotal: number,
  tax: number,
  discount: number,
  total: number,

  // Actions
  addItem: (product, quantity) => {
    // Add or increment
    // Recalculate totals
  },

  removeItem: (productId) => {
    // Remove item
    // Recalculate totals
  },

  updateQuantity: (productId, quantity) => {
    // Update quantity
    // Recalculate totals
  },

  setCustomer: (customerId) => {
    // Set customer
    // Calculate customer discounts
  },

  applyDiscount: (amount, type) => {
    // Apply discount
    // Recalculate total
  },

  clearCart: () => {
    // Reset to initial state
  },

  calculateTotals: () => {
    // Calculate subtotal, tax, total
  }
}
```

### React Query (TanStack Query)

Used for server state management:

```javascript
// Query keys structure
queryKeys = {
  products: ["products"],
  productsFiltered: (params) => ["products", params],
  product: (id) => ["product", id],
  customers: ["customers"],
  customer: (id) => ["customer", id],
  receipts: (filters) => ["receipts", filters],
  categories: ["categories"],
  stock: ["stock"],
  expenses: ["expenses"],
};

// Example query:
const { data: products, isLoading } = useQuery({
  queryKey: ["products"],
  queryFn: () => productsService.getAll(),
  staleTime: 0, // Always fresh
  gcTime: 0, // No cache
});

// Example mutation:
const createProduct = useMutation({
  mutationFn: (data) => productsService.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries(["products"]);
    // Automatic refetch
  },
});
```

### Local Storage

```javascript
// Keys used:
localStorage.setItem("auth-storage", JSON.stringify(authState));
localStorage.setItem("theme", "dark" | "light");
localStorage.setItem("pos-settings", JSON.stringify(settings));
localStorage.setItem("recent-customers", JSON.stringify(customerIds));
```

### IndexedDB (Dexie)

Used for offline support:

```javascript
// Database schema
const db = new Dexie('CandyKushPOS');

db.version(1).stores({
  products: 'id, name, category, price, stock',
  customers: 'id, phone, email, name',
  receipts: 'id, receiptNumber, customerId, createdAt',
  sync_queue: '++id, type, data, synced'
});

// Offline queue
- Store transactions when offline
- Auto-sync when back online
- Conflict resolution
```

---

## 10. UI Components Library

### Base Components (from shadcn/ui)

Located in `src/components/ui/`:

```javascript
// Form Components
- Button
- Input
- Textarea
- Select
- Checkbox
- Switch
- Label
- RadioGroup
- Slider

// Layout Components
- Card
- Dialog (Modal)
- Sheet (Sidebar drawer)
- Tabs
- Accordion
- Separator

// Feedback Components
- Toast (via Sonner)
- Alert
- Badge
- Progress
- Skeleton

// Navigation Components
- DropdownMenu
- ContextMenu
- Popover
- HoverCard

// Data Display
- Table
- Avatar
- Calendar
- DatePicker
```

### Custom Components

#### 1. ProductCard

```javascript
// src/components/pos/ProductCard.jsx
<ProductCard
  product={product}
  onAdd={(product) => addToCart(product)}
  variant="grid" | "list"
/>

Features:
- Product image
- Name, price
- Stock indicator
- Quick add button
- Low stock warning
- Out of stock overlay
```

#### 2. CartItem

```javascript
// src/components/pos/CartItem.jsx
<CartItem
  item={item}
  onQuantityChange={(id, qty) => {...}}
  onRemove={(id) => {...}}
/>

Features:
- Product name
- Quantity controls (+/-)
- Price display
- Remove button
- Subtotal calculation
```

#### 3. CustomerSelector

```javascript
// src/components/pos/CustomerSelector.jsx
<CustomerSelector
  onSelect={(customer) => {...}}
  onCreate={(data) => {...}}
/>

Features:
- Searchable dropdown
- Customer info display
- Points balance
- Quick create button
- Recent customers list
```

#### 4. PaymentDialog

```javascript
// src/components/pos/PaymentDialog.jsx
<PaymentDialog
  total={total}
  onComplete={(paymentData) => {...}}
/>

Features:
- Payment method tabs
- Cash calculator (change)
- Card terminal integration
- Split payment option
- Cashback redemption
```

#### 5. ReceiptPrint

```javascript
// src/components/pos/ReceiptPrint.jsx
<ReceiptPrint
  receiptData={receiptData}
  onPrint={() => {...}}
/>

Features:
- Thermal printer formatting
- QR code generation
- Customizable header/footer
- Print preview
- Email option
```

#### 6. DataTable

```javascript
// src/components/admin/DataTable.jsx
<DataTable
  columns={columns}
  data={data}
  onSort={handleSort}
  onFilter={handleFilter}
  onRowClick={handleRowClick}
/>

Features:
- Sortable columns
- Filterable
- Pagination
- Row selection
- Bulk actions
- Export options
```

#### 7. StockBadge

```javascript
// src/components/admin/StockBadge.jsx
<StockBadge
  current={current}
  threshold={threshold}
/>

Features:
- Color-coded (green/yellow/red)
- Stock level indicator
- Low stock warning
- Out of stock display
```

#### 8. StatCard

```javascript
// src/components/admin/StatCard.jsx
<StatCard
  title="Total Sales"
  value="$1,234.56"
  change="+12.5%"
  trend="up"
  icon={TrendingUp}
/>

Features:
- Large value display
- Percentage change
- Trend indicator
- Icon support
- Click to drill-down
```

---

## 11. Business Logic & Workflows

### Sales Transaction Flow

```
1. Cashier Login
   ↓
2. Start/Resume Shift
   - Record opening cash
   ↓
3. Select Customer (optional)
   - Search existing
   - Create new
   ↓
4. Add Products to Cart
   - Click product cards
   - Scan barcode
   - Manual search
   ↓
5. Apply Discounts (optional)
   - Manual discount
   - Coupon code
   - Cashback points
   ↓
6. Review Cart
   - Verify items
   - Check quantities
   - View total
   ↓
7. Select Payment Method
   - Cash
   - Card
   - Digital
   - Split payment
   ↓
8. Process Payment
   - Validate payment
   - Calculate change
   - Award cashback points
   ↓
9. Generate Receipt
   - Create receipt record
   - Update stock levels
   - Update customer data
   ↓
10. Print/Email Receipt
    ↓
11. Complete Transaction
    - Clear cart
    - Ready for next sale
```

### Stock Management Flow

```
Receiving Stock:

1. Create Purchase Order
   - Select supplier
   - Add products
   - Set quantities
   ↓
2. Order from Supplier
   - Mark as "Ordered"
   - Set expected date
   ↓
3. Receive Shipment
   - Verify quantities
   - Check quality
   ↓
4. Mark as Received
   - Update stock levels
   - Record costs
   - Create stock history
   ↓
5. Put Stock on Shelf
   - Products now available for sale
```

```
Stock Adjustment:

1. Identify Need
   - Physical count
   - Damaged goods
   - Theft
   - Found inventory
   ↓
2. Create Adjustment
   - Select product
   - Enter adjustment (+/-)
   - Select reason
   ↓
3. Approve (if required)
   - Manager review
   ↓
4. Apply Adjustment
   - Update stock level
   - Record in history
```

### Customer Lifecycle

```
1. New Customer
   ↓
2. Registration
   - Collect info
   - Verify ID (if required)
   ↓
3. Approval (if required)
   - Admin review
   - Approve/Reject
   ↓
4. Active Customer
   - Make purchases
   - Earn points
   ↓
5. Loyalty Progression
   - Accumulate points
   - Tier upgrades
   - Redeem rewards
   ↓
6. Retention
   - Marketing campaigns
   - Special offers
   - Birthday rewards
```

### Shift Management Flow

```
1. Cashier Login
   ↓
2. Open Shift
   - Count opening cash
   - Record amount
   - System creates shift record
   ↓
3. Process Sales
   - All sales linked to shift
   - Running totals calculated
   ↓
4. Shift Activities
   - Sales
   - Refunds
   - Discounts
   - No-sale opens
   ↓
5. Close Shift
   - Count closing cash
   - System calculates expected
   - Compare actual vs expected
   ↓
6. Reconciliation
   - Explain any discrepancies
   - Print shift report
   - Submit for approval
   ↓
7. Shift Closed
   - Data locked
   - Report generated
```

### Refund Process

```
1. Locate Receipt
   - Search by receipt number
   - Search by customer
   ↓
2. Verify Eligibility
   - Check refund policy
   - Verify time limit
   - Check product condition
   ↓
3. Select Items to Refund
   - Full refund
   - Partial refund
   ↓
4. Enter Reason
   - Required
   - Dropdown selection
   ↓
5. Manager Approval (if required)
   - Review request
   - Approve/Deny
   ↓
6. Process Refund
   - Update receipt status
   - Return stock to inventory
   - Reverse cashback points
   - Process payment refund
   ↓
7. Generate Refund Receipt
   - Print/Email
   ↓
8. Complete Refund
   - Close transaction
```

### Cashback Calculation

```
Purchase Made
↓
Identify Applicable Rules
- Check all active rules
- Apply priority order
- Check minimums/maximums
↓
Calculate Base Points
- For each rule:
  * Check if applicable (category/product)
  * Calculate points
↓
Apply Tier Multiplier
- Get customer tier
- Multiply base points
↓
Apply Caps
- Maximum per transaction
- Maximum per day/month
↓
Award Points
- Add to customer balance
- Record transaction
↓
Customer Notified
- Receipt shows points earned
- Current balance displayed
```

---

## 12. Mobile Responsiveness

### Responsive Breakpoints

```javascript
// Tailwind CSS breakpoints
sm: 640px   // Small tablets
md: 768px   // Tablets
lg: 1024px  // Small desktops
xl: 1280px  // Desktops
2xl: 1536px // Large desktops

// Custom breakpoints used in code
mobile: < 768px
tablet: 768px - 1024px
desktop: > 1024px
```

### Mobile Layout Patterns

#### 1. Admin Panel (Mobile)

```javascript
// Desktop: Sidebar + Content
// Mobile: Bottom Navigation + Full Content

<div className="md:flex">
  {/* Sidebar - Hidden on mobile */}
  <aside className="hidden md:block w-64">
    <Navigation />
  </aside>

  {/* Content - Full width on mobile */}
  <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">{children}</main>

  {/* Bottom Nav - Visible on mobile only */}
  <nav className="md:hidden fixed bottom-0 left-0 right-0">
    <BottomNavigation />
  </nav>
</div>
```

#### 2. POS Screen (Mobile)

```javascript
// Desktop: Side-by-side (Products | Cart)
// Mobile: Tabs or Expandable Cart

// Mobile pattern:
- Products grid (full screen)
- Floating cart button (badge with item count)
- Click to expand cart overlay
- Complete sale from cart overlay
```

#### 3. Data Tables (Mobile)

```javascript
// Desktop: Full table
// Mobile: Card layout

// Mobile transformation:
<div className="hidden md:block">
  <Table>{/* Full table */}</Table>
</div>

<div className="md:hidden">
  {data.map(item => (
    <Card key={item.id}>
      {/* Mobile card layout */}
    </Card>
  ))}
</div>
```

#### 4. Forms (Mobile)

```javascript
// Desktop: Multi-column
// Mobile: Single column

<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <Input label="Name" />
  <Input label="Email" />
</div>

// Becomes single column on mobile
```

### Touch Optimization

```javascript
// Larger touch targets on mobile
<button className="h-10 md:h-8">  // Taller on mobile

// Spacing for easier tapping
<div className="gap-4 md:gap-2">  // More space on mobile

// Prevent double-tap zoom
<meta name="viewport" content="user-scalable=no" />

// Touch-friendly interactions
- Swipe to delete
- Pull to refresh
- Long press for context menu
```

### Mobile-Specific Features

```javascript
1. Camera Integration
   - Barcode scanning
   - Receipt photo upload
   - ID verification photo

2. Geolocation
   - Store location
   - Delivery address validation

3. Push Notifications
   - Shift reminders
   - Low stock alerts
   - New order notifications

4. Offline Mode
   - IndexedDB storage
   - Sync when online
   - Queue transactions

5. Mobile Payment
   - NFC/Tap to pay
   - QR code scanning
   - Mobile wallet integration
```

---

## 13. PWA Features

### Progressive Web App Configuration

#### manifest.json

```json
{
  "name": "Candy Kush POS",
  "short_name": "POS",
  "description": "Point of Sale System",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#22c55e",
  "orientation": "any",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "categories": ["business", "finance", "productivity"],
  "screenshots": [
    {
      "src": "/screenshots/pos-screen.png",
      "sizes": "1280x720",
      "type": "image/png"
    }
  ]
}
```

### Service Worker (via next-pwa)

```javascript
// next.config.mjs
import withPWA from "next-pwa";

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    // Cache strategies defined
    {
      urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "firebase-storage",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
  ],
});
```

### Offline Functionality

```javascript
1. Offline Detection
   - window.navigator.onLine
   - Display offline indicator
   - Queue failed requests

2. Offline Data Access
   - IndexedDB for local storage
   - Cache products, customers
   - View-only mode

3. Offline Transaction Queue
   - Store transactions locally
   - Sync when online
   - Conflict resolution

4. Background Sync
   - Register sync events
   - Retry failed uploads
   - Notification on sync complete
```

### Install Prompt

```javascript
// Capture install prompt
let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Show install button
});

// Trigger install
const installApp = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      // App installed
    }
    deferredPrompt = null;
  }
};
```

### PWA Update Handling

```javascript
// Detect new version
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").then((reg) => {
    reg.addEventListener("updatefound", () => {
      const newWorker = reg.installing;
      newWorker.addEventListener("statechange", () => {
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          // New version available
          showUpdateNotification();
        }
      });
    });
  });
}

// Apply update
const updateApp = () => {
  if (registration && registration.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
    window.location.reload();
  }
};
```

---

## 14. Performance Optimizations

### Firebase Optimization

```javascript
// Always fetch fresh data (no stale cache)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 0,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
    },
  },
});

// Lazy loading Firebase services
const loadProductsService = async () => {
  const module = await import("@/lib/firebase/firestore");
  return module.productsService;
};

// Force server fetch (bypass Firestore cache)
const querySnapshot = await getDocsFromServer(q);
```

### Code Splitting

```javascript
// Next.js automatic code splitting
// Each page is a separate chunk

// Dynamic imports for large components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false
});

// Bundle optimization in next.config.mjs
experimental: {
  optimizePackageImports: [
    "lucide-react",
    "firebase/app",
    "firebase/firestore",
    "@tanstack/react-query"
  ]
},
webpack: (config) => {
  config.optimization.splitChunks.cacheGroups = {
    firebase: {
      test: /[\\/]node_modules[\\/]firebase[\\/]/,
      name: "firebase",
      priority: 10
    }
  };
  return config;
}
```

### Image Optimization

```javascript
// Next.js Image component
import Image from "next/image";

<Image
  src="/product.jpg"
  width={300}
  height={300}
  alt="Product"
  loading="lazy"
  placeholder="blur"
/>;

// Firebase Storage images
// Use resized versions
const imageUrl = `${baseUrl}_300x300.jpg`;
```

### Database Query Optimization

```javascript
// Indexed queries
- Add Firestore indexes for frequently filtered fields
- Limit results with pagination
- Use startAfter for cursor-based pagination

// Composite indexes
receipts: [
  ['employeeId', 'ASC'], ['createdAt', 'DESC']
]

// Limit data fetched
const q = query(
  collection(db, 'products'),
  where('isActive', '==', true),
  orderBy('name'),
  limit(50)
);
```

### Caching Strategy

```javascript
1. React Query caching
   - Smart invalidation
   - Background refetch
   - Optimistic updates

2. Service Worker caching
   - Static assets
   - API responses
   - Images

3. Browser caching
   - localStorage for settings
   - IndexedDB for offline data

4. CDN caching (if deployed)
   - Static files
   - Images
   - Fonts
```

### Performance Monitoring

```javascript
// Firebase Performance Monitoring
import { getPerformance, trace } from "firebase/performance";

const perf = getPerformance();
const t = trace(perf, "load_products");
t.start();
// ... operation ...
t.stop();

// Custom performance tracking
import { performanceTracker } from "@/lib/performance/measure";

performanceTracker.startQuery("products");
const products = await loadProducts();
performanceTracker.endQuery("products", products.length);

// Console logs performance metrics
// ⚡ Load Products took 243ms
// 🔥 Fetched 150 documents from products in 243ms (SERVER)
```

---

## 15. Android App Replication Guide

### 15.1 Technology Stack for Android

**Recommended Approach:**

**Option 1: React Native (Recommended)**

```javascript
Why React Native:
- Reuse React components
- Similar state management (Zustand works in RN)
- React Query works in RN
- Firebase SDK available
- Can wrap in WebView for quick MVP

Tech Stack:
- React Native 0.73+
- React Navigation (routing)
- React Query (state management)
- Firebase SDK for React Native
- AsyncStorage (local storage)
- SQLite (offline database)
- React Native Paper (UI components)
```

**Option 2: Native Android (Kotlin)**

```kotlin
Tech Stack:
- Kotlin
- Jetpack Compose (UI)
- Firebase SDK for Android
- Room (local database)
- Retrofit (API calls)
- Hilt/Dagger (dependency injection)
- Coroutines (async operations)
```

**Option 3: Flutter**

```dart
Tech Stack:
- Flutter/Dart
- Firebase SDK for Flutter
- Provider/Riverpod (state management)
- Sqflite (local database)
- Dio (networking)
```

### 15.2 Architecture Mapping

#### Web App → Android App

```
Web (Next.js)              →  Android (React Native)
---------------------------------------------------------
React Components           →  React Native Components
Next.js routing           →  React Navigation
Firebase Web SDK          →  Firebase RN SDK
localStorage              →  AsyncStorage
IndexedDB                 →  SQLite (react-native-sqlite-storage)
Tailwind CSS              →  StyleSheet/styled-components
Radix UI components       →  React Native Paper
Web PWA                   →  Native Android App

Web (Next.js)              →  Android (Native Kotlin)
---------------------------------------------------------
React Components           →  Jetpack Compose Composables
useState/useEffect        →  State/remember/LaunchedEffect
Firebase Web SDK          →  Firebase Android SDK
API Routes                →  Retrofit API Service
localStorage              →  SharedPreferences
IndexedDB                 →  Room Database
Tailwind classes          →  Compose Modifiers
```

### 15.3 Database Strategy for Android

**Option 1: Firebase Only (Online)**

```
Pros:
- Same database as web
- Real-time sync
- No migration needed

Cons:
- Requires internet
- API costs

Implementation:
- Use Firebase Android SDK
- Same Firestore collections
- Same security rules
```

**Option 2: Hybrid (Firebase + Local SQLite)**

```
Architecture:
- SQLite for offline storage
- Firebase for sync
- Background sync service

Tables mirror Firestore:
- products
- customers
- receipts
- stock_history
- etc.

Sync Strategy:
- Download updates on app start
- Queue offline transactions
- Sync when online
- Conflict resolution
```

**Option 3: REST API + Local Database**

```
Architecture:
- Build REST API (Express/FastAPI)
- Android calls API
- SQLite for offline

Requires:
- API server (separate from Next.js)
- API authentication
- Data sync logic
```

### 15.4 Feature Mapping

#### Core Features to Implement

**Phase 1: Essential POS**

```
✓ Login/Authentication
✓ Product browsing
✓ Cart management
✓ Customer selection
✓ Payment processing
✓ Receipt generation
✓ Offline queue
```

**Phase 2: Inventory**

```
✓ Stock viewing
✓ Stock adjustments
✓ Low stock alerts
✓ Product search
```

**Phase 3: Reporting**

```
✓ Sales summary
✓ Shift reports
✓ Product performance
✓ Export reports
```

**Phase 4: Advanced**

```
✓ Cashback system
✓ Customer management
✓ Expense tracking
✓ Analytics
```

### 15.5 UI Component Mapping

#### Web → React Native

```javascript
// Web
<button className="bg-primary text-white px-4 py-2 rounded">
  Click Me
</button>

// React Native
<TouchableOpacity
  style={styles.button}
  onPress={handlePress}
>
  <Text style={styles.buttonText}>Click Me</Text>
</TouchableOpacity>

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600'
  }
});
```

```javascript
// Web
<input
  type="text"
  className="border rounded px-3 py-2"
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>

// React Native
<TextInput
  style={styles.input}
  value={value}
  onChangeText={setValue}
  placeholder="Enter text"
/>
```

```javascript
// Web: Product Grid
<div className="grid grid-cols-3 gap-4">
  {products.map(product => (
    <ProductCard key={product.id} product={product} />
  ))}
</div>

// React Native
<FlatList
  data={products}
  numColumns={3}
  keyExtractor={item => item.id}
  renderItem={({ item }) => <ProductCard product={item} />}
  contentContainerStyle={styles.grid}
/>
```

### 15.6 Navigation Structure

#### React Native Navigation

```javascript
// Navigation hierarchy
<NavigationContainer>
  <Stack.Navigator>
    {/* Auth */}
    <Stack.Screen name="Login" component={LoginScreen} />

    {/* Main App */}
    <Stack.Screen name="Home" component={TabNavigator} />

    {/* Modals */}
    <Stack.Screen
      name="Payment"
      component={PaymentScreen}
      options={{ presentation: 'modal' }}
    />
  </Stack.Navigator>
</NavigationContainer>

// Tab Navigator (Bottom tabs)
<Tab.Navigator>
  <Tab.Screen name="Sales" component={SalesScreen} />
  <Tab.Screen name="Products" component={ProductsScreen} />
  <Tab.Screen name="Reports" component={ReportsScreen} />
  <Tab.Screen name="Settings" component={SettingsScreen} />
</Tab.Navigator>

// Drawer Navigator (Side menu for admin)
<Drawer.Navigator>
  <Drawer.Screen name="Dashboard" component={DashboardScreen} />
  <Drawer.Screen name="Products" component={ProductsScreen} />
  <Drawer.Screen name="Customers" component={CustomersScreen} />
  {/* ...more screens */}
</Drawer.Navigator>
```

### 15.7 API Integration

```javascript
// API Service (React Native)
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://your-api.com/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Interceptor to add auth token
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API methods
export const productsAPI = {
  getAll: () => api.get("/products/list"),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post("/products", data),
  update: (id, data) => api.put(`/products/${id}`, data),
};

export const salesAPI = {
  processPayment: (data) => api.post("/cart/payment", data),
  getReceipts: (filters) => api.get("/receipts", { params: filters }),
};
```

### 15.8 Offline Strategy

```javascript
// Offline Queue Service
class OfflineQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  async add(action) {
    // Add to queue
    this.queue.push(action);

    // Save to AsyncStorage
    await AsyncStorage.setItem("offline_queue", JSON.stringify(this.queue));

    // Try to process if online
    if (await this.isOnline()) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const action = this.queue[0];

      try {
        await this.executeAction(action);
        this.queue.shift(); // Remove from queue

        // Update AsyncStorage
        await AsyncStorage.setItem("offline_queue", JSON.stringify(this.queue));
      } catch (error) {
        console.error("Failed to process action:", error);
        break; // Stop processing
      }
    }

    this.isProcessing = false;
  }

  async executeAction(action) {
    switch (action.type) {
      case "SALE":
        return salesAPI.processPayment(action.data);
      case "PRODUCT_UPDATE":
        return productsAPI.update(action.id, action.data);
      // ... more actions
    }
  }

  async isOnline() {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected;
  }
}

export const offlineQueue = new OfflineQueue();

// Usage in components
const processSale = async (saleData) => {
  const isOnline = await NetInfo.fetch();

  if (isOnline.isConnected) {
    // Process immediately
    await salesAPI.processPayment(saleData);
  } else {
    // Add to offline queue
    await offlineQueue.add({
      type: "SALE",
      data: saleData,
      timestamp: Date.now(),
    });

    // Save to local database
    await saveToLocalDB(saleData);
  }
};
```

### 15.9 Security Considerations

```javascript
// Secure storage for sensitive data
import * as SecureStore from "expo-secure-store";

// Store auth token securely
await SecureStore.setItemAsync("auth_token", token);

// Retrieve
const token = await SecureStore.getItemAsync("auth_token");

// SSL Pinning (prevent man-in-the-middle)
import { fetch } from "react-native-ssl-pinning";

fetch("https://your-api.com/api", {
  method: "GET",
  timeoutInterval: 10000,
  sslPinning: {
    certs: ["certificate_name"],
  },
});

// Biometric authentication
import * as LocalAuthentication from "expo-local-authentication";

const authenticate = async () => {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (hasHardware && isEnrolled) {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Authenticate to access POS",
    });

    return result.success;
  }

  return false;
};
```

### 15.10 Android-Specific Features

```javascript
// Hardware integration
import { BluetoothManager } from "react-native-bluetooth-manager";
import { NFC } from "react-native-nfc-manager";
import { Camera } from "react-native-camera";

// Bluetooth printer
const printReceipt = async (receiptData) => {
  const printers = await BluetoothManager.list();
  const printer = printers.find((p) => p.name.includes("Star"));

  if (printer) {
    await BluetoothManager.connect(printer.id);
    await BluetoothManager.print(formatReceipt(receiptData));
    await BluetoothManager.disconnect();
  }
};

// NFC payment
const processNFCPayment = async (amount) => {
  await NFC.start();

  return new Promise((resolve, reject) => {
    NFC.setEventListener(NFC.Events.DiscoverTag, (tag) => {
      // Process NFC tag
      resolve(tag);
    });
  });
};

// Barcode scanning
<Camera
  onBarCodeRead={({ data, type }) => {
    // data = barcode value
    // type = barcode format
    handleBarcodeScanned(data);
  }}
/>;

// Cash drawer
import { CashDrawer } from "react-native-cash-drawer";

const openDrawer = async () => {
  await CashDrawer.open();
};
```

### 15.11 Performance Optimization for Android

```javascript
// Image caching
import FastImage from 'react-native-fast-image';

<FastImage
  source={{
    uri: product.image,
    priority: FastImage.priority.normal,
    cache: FastImage.cacheControl.immutable
  }}
  style={styles.image}
/>

// List optimization
<FlatList
  data={products}
  keyExtractor={item => item.id}
  renderItem={renderProduct}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index
  })}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={5}
/>

// Memory management
import { InteractionManager } from 'react-native';

useEffect(() => {
  const task = InteractionManager.runAfterInteractions(() => {
    // Heavy operation after animations complete
    loadInitialData();
  });

  return () => task.cancel();
}, []);

// Bundle size optimization
// Use Hermes engine
// Enable ProGuard for release builds
// Remove console.log in production
```

### 15.12 Testing Strategy

```javascript
// Unit tests (Jest)
test("calculates cart total correctly", () => {
  const cart = {
    items: [
      { price: 10, quantity: 2 },
      { price: 5, quantity: 3 },
    ],
  };

  const total = calculateTotal(cart);
  expect(total).toBe(35);
});

// Component tests (React Native Testing Library)
import { render, fireEvent } from "@testing-library/react-native";

test("adds product to cart", () => {
  const { getByText } = render(<ProductCard product={mockProduct} />);

  const addButton = getByText("Add to Cart");
  fireEvent.press(addButton);

  expect(mockAddToCart).toHaveBeenCalledWith(mockProduct);
});

// E2E tests (Detox)
describe("Sales flow", () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it("should complete a sale", async () => {
    await element(by.id("product-card")).tap();
    await element(by.id("add-to-cart")).tap();
    await element(by.id("checkout-button")).tap();
    await element(by.id("cash-payment")).tap();
    await element(by.id("complete-sale")).tap();

    await expect(element(by.text("Sale Completed"))).toBeVisible();
  });
});
```

### 15.13 Deployment

```javascript
// Build configuration
// android/app/build.gradle

android {
  compileSdkVersion 33

  defaultConfig {
    applicationId "com.candykush.pos"
    minSdkVersion 21
    targetSdkVersion 33
    versionCode 1
    versionName "1.0.0"
  }

  signingConfigs {
    release {
      storeFile file(KEYSTORE_FILE)
      storePassword KEYSTORE_PASSWORD
      keyAlias KEY_ALIAS
      keyPassword KEY_PASSWORD
    }
  }

  buildTypes {
    release {
      minifyEnabled true
      proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
      signingConfig signingConfigs.release
    }
  }
}

// Build commands
// Debug: ./gradlew assembleDebug
// Release: ./gradlew assembleRelease

// Output: android/app/build/outputs/apk/release/app-release.apk
```

---

## 📚 Summary

This documentation covers:

1. ✅ Complete application architecture
2. ✅ All features and modules
3. ✅ Navigation and menu structure
4. ✅ Database schema (Firebase Firestore)
5. ✅ API endpoints
6. ✅ Business logic and workflows
7. ✅ UI components
8. ✅ Mobile responsiveness
9. ✅ PWA features
10. ✅ Performance optimizations
11. ✅ **Complete Android replication guide**

### Key Files for Reference

```
Documentation:
├── COMPLETE_APP_DOCUMENTATION.md (this file)
├── FIREBASE_OPTIMIZATION_COMPLETE.md
├── QUICK_REFERENCE.md
├── MIGRATION_GUIDE.md
└── API documentation (in code comments)

Code Structure:
├── src/app/ (all routes and pages)
├── src/components/ (all UI components)
├── src/lib/firebase/ (Firebase services)
├── src/store/ (Zustand stores)
└── src/hooks/ (custom React hooks)
```

### Next Steps for Android Development

1. **Choose tech stack** (React Native recommended for code reuse)
2. **Setup development environment**
3. **Implement authentication** (Phase 1)
4. **Build POS interface** (Phase 1)
5. **Add offline support** (Phase 2)
6. **Implement reports** (Phase 3)
7. **Add advanced features** (Phase 4)
8. **Testing and deployment**

---

**Document Version:** 1.0  
**Last Updated:** January 22, 2026  
**Status:** ✅ Complete  
**Purpose:** Android app replication reference
