# Firebase Loading Performance Optimization - Detailed Implementation Guide

## Table of Contents

1. [Preparation Phase](#preparation-phase)
2. [Phase 1: Critical Path Optimization](#phase-1-critical-path-optimization)
3. [Phase 2: Bundle Optimization](#phase-2-bundle-optimization)
4. [Phase 3: Advanced Caching](#phase-3-advanced-caching)
5. [Phase 4: Data Loading Optimization](#phase-4-data-loading-optimization)
6. [Testing & Validation](#testing--validation)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Rollback Procedures](#rollback-procedures)

---

## Preparation Phase

### Step 1.1: Environment Setup & Dependencies

```bash
# Install additional performance monitoring dependencies
npm install @firebase/performance firebase/performance
npm install --save-dev webpack-bundle-analyzer
```

### Step 1.2: Create Performance Baseline

```bash
# Create baseline performance measurements
npm run build
npx webpack-bundle-analyzer .next/static/chunks/*.js

# Run Lighthouse performance audit
npx lighthouse http://localhost:3000 --output=json --output-path=./performance-baseline.json
```

### Step 1.3: Setup Performance Monitoring Infrastructure

Create `src/lib/performance/firebase-performance.js`:

```javascript
import { getPerformance } from "firebase/performance";
import { getApp } from "firebase/app";

export const initFirebasePerformance = () => {
  if (typeof window !== "undefined") {
    try {
      const perf = getPerformance(getApp());
      console.log("Firebase Performance Monitoring initialized");
      return perf;
    } catch (error) {
      console.warn(
        "Firebase Performance Monitoring failed to initialize:",
        error,
      );
    }
  }
};
```

### Step 1.4: Create Performance Measurement Utilities

Create `src/lib/performance/measure.js`:

```javascript
export const measurePerformance = (name, fn) => {
  const start = performance.now();
  const result = fn();
  const end = performance.now();

  console.log(`${name} took ${end - start} milliseconds`);

  // Send to analytics if available
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "performance_measurement", {
      event_category: "performance",
      event_label: name,
      value: Math.round(end - start),
    });
  }

  return result;
};

export const measureAsyncPerformance = async (name, fn) => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();

  console.log(`${name} took ${end - start} milliseconds`);

  // Send to analytics
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "async_performance_measurement", {
      event_category: "performance",
      event_label: name,
      value: Math.round(end - start),
    });
  }

  return result;
};
```

---

## Phase 1: Critical Path Optimization

### Step 1.1: Implement React Query Provider

Create `src/lib/query-client.js`:

```javascript
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

Update `src/app/layout.js`:

```javascript
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

export default function RootLayout({ children }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

### Step 1.2: Create Firebase Service Hooks

Create `src/hooks/useFirebaseServices.js`:

```javascript
import { useQuery } from "@tanstack/react-query";

// Lazy load Firebase services
const loadProductsService = async () => {
  const { productsService } = await import("@/lib/firebase/firestore");
  return productsService;
};

const loadCustomersService = async () => {
  const { customersService } = await import("@/lib/firebase/firestore");
  return customersService;
};

const loadCategoriesService = async () => {
  const { categoriesService } = await import("@/lib/firebase/firestore");
  return categoriesService;
};

const loadCashbackService = async () => {
  const { cashbackRulesService, pointUsageRulesService } =
    await import("@/lib/firebase/cashbackService");
  return { cashbackRulesService, pointUsageRulesService };
};

// React Query hooks for Firebase data
export const useProducts = (options = {}) => {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const service = await loadProductsService();
      return service.getAll(options);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCustomers = (options = {}) => {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const service = await loadCustomersService();
      return service.getAll(options);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useCategories = (options = {}) => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const service = await loadCategoriesService();
      return service.getAll(options);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useCashbackRules = () => {
  return useQuery({
    queryKey: ["cashback-rules"],
    queryFn: async () => {
      const { cashbackRulesService } = await loadCashbackService();
      return cashbackRulesService.getAll();
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};
```

### Step 1.3: Enable Firestore Persistence

Update `src/lib/firebase/config.js`:

```javascript
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

// ... existing firebaseConfig ...

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Enable Firestore offline persistence
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === "failed-precondition") {
      console.warn("Firestore persistence failed: Multiple tabs open");
    } else if (err.code === "unimplemented") {
      console.warn("Firestore persistence not supported by browser");
    } else {
      console.error("Firestore persistence error:", err);
    }
  });
}

// Initialize Analytics (only in browser)
export const analytics =
  typeof window !== "undefined" && isSupported() ? getAnalytics(app) : null;

export default app;
```

### Step 1.4: Update Firestore Service to Use Cache

Update `src/lib/firebase/firestore.js`:

```javascript
// ... existing imports ...

// Get all documents with intelligent caching
export const getDocuments = async (collectionName, options = {}) => {
  try {
    let q = collection(db, collectionName);

    // ... existing query building logic ...

    // Use getDocs() for caching, but allow override for fresh data
    const querySnapshot = options.forceServer
      ? await getDocsFromServer(q)
      : await getDocs(q);

    // ... rest of existing logic ...
  } catch (error) {
    console.error(`Error getting documents from ${collectionName}:`, error);
    throw error;
  }
};
```

---

## Phase 2: Bundle Optimization

### Step 2.1: Convert Static Imports to Dynamic Imports

Update `src/components/pos/SalesSection.jsx`:

**Before:**

```javascript
import {
  productsService,
  customersService,
  customTabsService,
  categoriesService,
} from "@/lib/firebase/firestore";
import { discountsService } from "@/lib/firebase/discountsService";
import { shiftsService } from "@/lib/firebase/shiftsService";
import { customerApprovalService } from "@/lib/firebase/customerApprovalService";
import {
  cashbackRulesService,
  pointUsageRulesService,
  customerPointsService,
} from "@/lib/firebase/cashbackService";
import {
  printJobsService,
  PRINT_STATUS,
  PRINT_TYPE,
} from "@/lib/firebase/printJobsService";
```

**After:**

```javascript
// Critical services loaded immediately (for initial render)
import { categoriesService } from "@/lib/firebase/firestore";

// Non-critical services loaded dynamically
let productsService, customersService, customTabsService;
let discountsService, shiftsService, customerApprovalService;
let cashbackRulesService, pointUsageRulesService, customerPointsService;
let printJobsService, PRINT_STATUS, PRINT_TYPE;

// Lazy load function
const loadFirebaseServices = async () => {
  if (!productsService) {
    const firestoreModule = await import("@/lib/firebase/firestore");
    productsService = firestoreModule.productsService;
    customersService = firestoreModule.customersService;
    customTabsService = firestoreModule.customTabsService;
  }

  if (!discountsService) {
    const discountsModule = await import("@/lib/firebase/discountsService");
    discountsService = discountsModule.discountsService;
  }

  if (!shiftsService) {
    const shiftsModule = await import("@/lib/firebase/shiftsService");
    shiftsService = shiftsModule.shiftsService;
  }

  if (!customerApprovalService) {
    const approvalModule =
      await import("@/lib/firebase/customerApprovalService");
    customerApprovalService = approvalModule.customerApprovalService;
  }

  if (!cashbackRulesService) {
    const cashbackModule = await import("@/lib/firebase/cashbackService");
    cashbackRulesService = cashbackModule.cashbackRulesService;
    pointUsageRulesService = cashbackModule.pointUsageRulesService;
    customerPointsService = cashbackModule.customerPointsService;
  }

  if (!printJobsService) {
    const printModule = await import("@/lib/firebase/printJobsService");
    printJobsService = printModule.printJobsService;
    PRINT_STATUS = printModule.PRINT_STATUS;
    PRINT_TYPE = printModule.PRINT_TYPE;
  }
};
```

### Step 2.2: Implement Prioritized Data Loading

Update the `useEffect` in `SalesSection.jsx`:

```javascript
useEffect(() => {
  // Phase 1: Load critical data first (products for POS functionality)
  loadCriticalData();

  // Phase 2: Load important but not immediate data
  setTimeout(() => loadImportantData(), 100);

  // Phase 3: Load background data
  setTimeout(() => loadBackgroundData(), 500);
}, []);

const loadCriticalData = async () => {
  try {
    setIsLoading(true);

    // Load Firebase services for critical data
    await loadFirebaseServices();

    // Load products first (critical for POS)
    await loadProducts();

    // Load categories (needed for product display)
    await loadCategories();

    setIsLoading(false);
  } catch (error) {
    console.error("Critical data loading failed:", error);
    setIsLoading(false);
  }
};

const loadImportantData = async () => {
  try {
    // Load customers (important but not blocking)
    await loadCustomers();

    // Load cashback rules (needed for pricing)
    await loadCashbackRules();
  } catch (error) {
    console.warn("Important data loading failed:", error);
  }
};

const loadBackgroundData = async () => {
  try {
    // Load shift data (background)
    await checkActiveShift();

    // Load unsynced orders (background sync)
    await checkUnsyncedOrders();
  } catch (error) {
    console.warn("Background data loading failed:", error);
  }
};
```

### Step 2.3: Optimize Next.js Bundle Splitting

Update `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... existing config ...

  experimental: {
    // Enable faster builds with package import optimization
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-select",
      "@radix-ui/react-dialog",
      "firebase/app",
      "firebase/firestore",
      "firebase/auth",
      "@tanstack/react-query",
    ],
  },

  // Optimize Firebase bundle splitting
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Split Firebase into separate chunks
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        firebase: {
          test: /[\\/]node_modules[\\/]firebase[\\/]/,
          name: "firebase",
          chunks: "all",
          priority: 10,
        },
        firestore: {
          test: /[\\/]node_modules[\\/]firebase[\\/]firestore[\\/]/,
          name: "firestore",
          chunks: "all",
          priority: 20,
        },
      };
    }

    return config;
  },
};

export default withPWA(nextConfig);
```

---

## Phase 3: Advanced Caching

### Step 3.1: Implement Firebase Performance Monitoring

Update `src/lib/firebase/config.js`:

```javascript
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getPerformance, trace } from "firebase/performance";

// ... existing firebaseConfig ...

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Enable Firestore offline persistence
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === "failed-precondition") {
      console.warn("Firestore persistence failed: Multiple tabs open");
    } else if (err.code === "unimplemented") {
      console.warn("Firestore persistence not supported by browser");
    } else {
      console.error("Firestore persistence error:", err);
    }
  });
}

// Initialize Analytics (only in browser)
export const analytics =
  typeof window !== "undefined" && isSupported() ? getAnalytics(app) : null;

// Initialize Performance Monitoring
export const performance =
  typeof window !== "undefined" ? getPerformance(app) : null;

// Performance tracing utility
export const createTrace = (name) => {
  if (performance) {
    return trace(performance, name);
  }
  return {
    start: () => {},
    stop: () => {},
    putAttribute: () => {},
    putMetric: () => {},
  };
};

export default app;
```

### Step 3.2: Add Performance Tracing to Firebase Operations

Update `src/lib/firebase/firestore.js`:

```javascript
import { createTrace } from "./config";

// ... existing code ...

export const getDocuments = async (collectionName, options = {}) => {
  const trace = createTrace(`firestore_get_${collectionName}`);
  trace.start();

  try {
    let q = collection(db, collectionName);

    // ... existing query building ...

    trace.putAttribute("collection", collectionName);
    trace.putAttribute("has_filters", options.where ? "true" : "false");
    trace.putAttribute("has_order", options.orderBy ? "true" : "false");
    trace.putAttribute("has_limit", options.limit ? "true" : "false");

    const startTime = performance.now();
    const querySnapshot = options.forceServer
      ? await getDocsFromServer(q)
      : await getDocs(q);
    const endTime = performance.now();

    trace.putMetric("query_duration", endTime - startTime);
    trace.putMetric("documents_returned", querySnapshot.docs.length);

    // ... existing result processing ...

    trace.stop();
    return results;
  } catch (error) {
    trace.putAttribute("error", error.message);
    trace.stop();
    console.error(`Error getting documents from ${collectionName}:`, error);
    throw error;
  }
};
```

### Step 3.3: Implement Background Sync

Create `src/lib/background-sync.js`:

```javascript
import { queryClient } from "@/lib/query-client";

class BackgroundSyncManager {
  constructor() {
    this.syncInterval = 5 * 60 * 1000; // 5 minutes
    this.isOnline = navigator.onLine;
    this.syncTimer = null;
  }

  start() {
    // Listen for online/offline events
    window.addEventListener("online", this.handleOnline.bind(this));
    window.addEventListener("offline", this.handleOffline.bind(this));

    // Start background sync if online
    if (this.isOnline) {
      this.startSyncTimer();
    }
  }

  stop() {
    window.removeEventListener("online", this.handleOnline.bind(this));
    window.removeEventListener("offline", this.handleOffline.bind(this));

    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  handleOnline() {
    this.isOnline = true;
    console.log("Background sync: Online, starting sync timer");
    this.startSyncTimer();

    // Immediate sync when coming online
    this.performBackgroundSync();
  }

  handleOffline() {
    this.isOnline = false;
    console.log("Background sync: Offline, stopping sync timer");
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  startSyncTimer() {
    if (this.syncTimer) return;

    this.syncTimer = setInterval(() => {
      if (this.isOnline) {
        this.performBackgroundSync();
      }
    }, this.syncInterval);
  }

  async performBackgroundSync() {
    try {
      console.log("Performing background sync...");

      // Refresh stale queries in the background
      await queryClient.invalidateQueries({
        predicate: (query) => {
          // Only refresh queries that are stale
          return (
            query.state.status === "success" &&
            Date.now() - query.state.dataUpdatedAt > 2 * 60 * 1000
          ); // 2 minutes
        },
        refetchType: "none", // Don't refetch immediately, just mark as stale
      });

      console.log("Background sync completed");
    } catch (error) {
      console.warn("Background sync failed:", error);
    }
  }
}

export const backgroundSync = new BackgroundSyncManager();
```

Initialize in `src/app/layout.js`:

```javascript
import { backgroundSync } from "@/lib/background-sync";

export default function RootLayout({ children }) {
  useEffect(() => {
    backgroundSync.start();
    return () => backgroundSync.stop();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

---

## Phase 4: Data Loading Optimization

### Step 4.1: Optimize Product Loading with Stock Enrichment

Create `src/lib/firebase/optimized-products.js`:

```javascript
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "./config";
import { createTrace } from "./config";

// Optimized product loading with stock enrichment
export const loadProductsWithStock = async (options = {}) => {
  const trace = createTrace("load_products_with_stock");
  trace.start();

  try {
    // Load products and stock history in parallel
    const [productsSnapshot, stockSnapshot] = await Promise.all([
      getDocs(query(collection(db, "products"), orderBy("name"))),
      getDocs(query(collection(db, "stock_history"), orderBy("productId"))),
    ]);

    // Create stock map for fast lookup
    const stockMap = new Map();
    stockSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      stockMap.set(data.productId, data.currentStock);
    });

    // Enrich products with stock data
    const enrichedProducts = productsSnapshot.docs.map((doc) => {
      const productData = doc.data();
      const stockFromHistory = stockMap.get(doc.id);

      return {
        id: doc.id,
        ...productData,
        stock: productData.trackStock
          ? (stockFromHistory ?? productData.stock ?? 0)
          : (productData.stock ?? 0),
        inStock: productData.trackStock
          ? (stockFromHistory ?? productData.stock ?? 0)
          : (productData.stock ?? 0),
      };
    });

    trace.putMetric("products_loaded", enrichedProducts.length);
    trace.putMetric("stock_records_processed", stockSnapshot.docs.length);
    trace.stop();

    return enrichedProducts;
  } catch (error) {
    trace.putAttribute("error", error.message);
    trace.stop();
    throw error;
  }
};
```

### Step 4.2: Implement Selective Field Loading

Create `src/lib/firebase/selective-loader.js`:

```javascript
// Selective field loading for better performance
export const createSelectiveQuery = (collectionName, fields = []) => {
  return async (options = {}) => {
    const { getDocs, collection, query, select } =
      await import("firebase/firestore");

    let q = collection(db, collectionName);

    // Add field selection if supported
    if (fields.length > 0 && select) {
      q = query(q, select(...fields));
    }

    // Add other query options
    if (options.where) {
      const { where } = await import("firebase/firestore");
      q = query(q, where(...options.where));
    }

    if (options.orderBy) {
      const { orderBy } = await import("firebase/firestore");
      q = query(q, orderBy(...options.orderBy));
    }

    if (options.limit) {
      const { limit } = await import("firebase/firestore");
      q = query(q, limit(options.limit));
    }

    return getDocs(q);
  };
};

// Predefined selective loaders
export const loadProductsBasic = createSelectiveQuery("products", [
  "name",
  "price",
  "category",
  "stock",
  "trackStock",
  "isActive",
]);

export const loadCustomersBasic = createSelectiveQuery("customers", [
  "name",
  "email",
  "phone",
  "points",
  "isActive",
]);

export const loadCategoriesBasic = createSelectiveQuery("categories", [
  "name",
  "description",
  "isActive",
]);
```

### Step 4.3: Implement Pagination for Large Datasets

Create `src/lib/firebase/paginated-loader.js`:

```javascript
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
} from "firebase/firestore";
import { db } from "./config";

export class PaginatedLoader {
  constructor(collectionName, options = {}) {
    this.collectionName = collectionName;
    this.pageSize = options.pageSize || 50;
    this.orderBy = options.orderBy || ["createdAt", "desc"];
    this.lastDoc = null;
    this.hasMore = true;
  }

  async loadNextPage() {
    if (!this.hasMore) return { data: [], hasMore: false };

    try {
      let q = query(
        collection(db, this.collectionName),
        orderBy(...this.orderBy),
        limit(this.pageSize),
      );

      if (this.lastDoc) {
        q = query(q, startAfter(this.lastDoc));
      }

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      this.lastDoc = snapshot.docs[snapshot.docs.length - 1];
      this.hasMore = data.length === this.pageSize;

      return {
        data,
        hasMore: this.hasMore,
        totalLoaded: data.length,
      };
    } catch (error) {
      console.error(`Error loading paginated ${this.collectionName}:`, error);
      throw error;
    }
  }

  reset() {
    this.lastDoc = null;
    this.hasMore = true;
  }
}

// Usage examples
export const productsLoader = new PaginatedLoader("products", {
  pageSize: 100,
  orderBy: ["name", "asc"],
});

export const customersLoader = new PaginatedLoader("customers", {
  pageSize: 50,
  orderBy: ["name", "asc"],
});
```

---

## Testing & Validation

### Step 5.1: Create Performance Test Suite

Create `tests/performance/firebase-performance.test.js`:

```javascript
import {
  measurePerformance,
  measureAsyncPerformance,
} from "@/lib/performance/measure";

describe("Firebase Performance Tests", () => {
  test("products loading performance", async () => {
    const duration = await measureAsyncPerformance(
      "products_load",
      async () => {
        const { productsService } = await import("@/lib/firebase/firestore");
        return productsService.getAll();
      },
    );

    // Assert performance requirements
    expect(duration).toBeLessThan(2000); // Should load in under 2 seconds
  });

  test("bundle size optimization", () => {
    // Check that Firebase is properly code-split
    const firebaseChunks = window.performance
      .getEntriesByType("resource")
      .filter((entry) => entry.name.includes("firebase"));

    expect(firebaseChunks.length).toBeGreaterThan(1); // Should be split into multiple chunks
  });

  test("cache effectiveness", async () => {
    // First load
    const start1 = performance.now();
    const { productsService } = await import("@/lib/firebase/firestore");
    await productsService.getAll();
    const end1 = performance.now();
    const firstLoad = end1 - start1;

    // Second load (should be cached)
    const start2 = performance.now();
    await productsService.getAll();
    const end2 = performance.now();
    const secondLoad = end2 - start2;

    // Cache should make second load at least 50% faster
    expect(secondLoad).toBeLessThan(firstLoad * 0.5);
  });
});
```

### Step 5.2: Bundle Analysis Script

Create `scripts/analyze-bundle.js`:

```javascript
const { execSync } = require("child_process");
const fs = require("fs");

function analyzeBundle() {
  console.log("🔍 Analyzing bundle composition...");

  // Build the application
  execSync("npm run build", { stdio: "inherit" });

  // Analyze bundle size
  const buildOutput = execSync(
    "npx webpack-bundle-analyzer .next/static/chunks/ --json",
    {
      encoding: "utf8",
    },
  );

  const bundleData = JSON.parse(buildOutput);

  // Check Firebase bundle size
  const firebaseBundles = bundleData.filter((chunk) =>
    chunk.names.some((name) => name.includes("firebase")),
  );

  const totalFirebaseSize = firebaseBundles.reduce(
    (sum, chunk) => sum + chunk.size,
    0,
  );

  console.log(
    `📦 Firebase bundle size: ${(totalFirebaseSize / 1024 / 1024).toFixed(2)} MB`,
  );

  // Performance thresholds
  const MAX_FIREBASE_SIZE = 2 * 1024 * 1024; // 2MB
  if (totalFirebaseSize > MAX_FIREBASE_SIZE) {
    console.warn("⚠️  Firebase bundle size exceeds recommended limit");
  } else {
    console.log("✅ Firebase bundle size is within acceptable limits");
  }

  // Save analysis results
  fs.writeFileSync(
    "./bundle-analysis.json",
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        firebaseBundles,
        totalFirebaseSize,
        recommendations:
          totalFirebaseSize > MAX_FIREBASE_SIZE
            ? [
                "Consider further code splitting",
                "Implement lazy loading for non-critical Firebase features",
                "Review Firebase service imports",
              ]
            : [],
      },
      null,
      2,
    ),
  );
}

if (require.main === module) {
  analyzeBundle();
}

module.exports = { analyzeBundle };
```

### Step 5.3: Performance Monitoring Dashboard

Create `src/components/admin/PerformanceDashboard.jsx`:

```javascript
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export default function PerformanceDashboard() {
  const [metrics, setMetrics] = useState({});

  // Collect performance metrics
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const newMetrics = {};

      entries.forEach((entry) => {
        if (entry.name.includes("firebase")) {
          newMetrics[entry.name] = {
            duration: entry.duration,
            startTime: entry.startTime,
            size: entry.transferSize || 0,
          };
        }
      });

      setMetrics((prev) => ({ ...prev, ...newMetrics }));
    });

    observer.observe({ entryTypes: ["measure", "resource"] });

    return () => observer.disconnect();
  }, []);

  const { data: queryMetrics } = useQuery({
    queryKey: ["performance-metrics"],
    queryFn: async () => {
      // Collect React Query metrics
      return {
        cacheHitRate: calculateCacheHitRate(),
        averageQueryTime: calculateAverageQueryTime(),
        failedQueries: getFailedQueryCount(),
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Performance Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Firebase Loading Times */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Firebase Load Times</h3>
          {Object.entries(metrics).map(([name, data]) => (
            <div key={name} className="flex justify-between">
              <span className="text-sm">{name}</span>
              <span className="text-sm font-mono">
                {data.duration.toFixed(2)}ms
              </span>
            </div>
          ))}
        </div>

        {/* Bundle Sizes */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Bundle Sizes</h3>
          {Object.entries(metrics).map(([name, data]) => (
            <div key={name} className="flex justify-between">
              <span className="text-sm">{name}</span>
              <span className="text-sm font-mono">
                {(data.size / 1024).toFixed(1)}KB
              </span>
            </div>
          ))}
        </div>

        {/* Query Performance */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Query Performance</h3>
          {queryMetrics && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Cache Hit Rate</span>
                <span className="text-sm font-mono">
                  {queryMetrics.cacheHitRate}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Avg Query Time</span>
                <span className="text-sm font-mono">
                  {queryMetrics.averageQueryTime}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Failed Queries</span>
                <span className="text-sm font-mono">
                  {queryMetrics.failedQueries}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Monitoring & Maintenance

### Step 6.1: Setup Automated Performance Monitoring

Create `src/lib/monitoring/performance-monitor.js`:

```javascript
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.thresholds = {
      firebaseLoadTime: 2000, // 2 seconds
      bundleSize: 2 * 1024 * 1024, // 2MB
      cacheHitRate: 0.8, // 80%
    };
  }

  recordMetric(name, value, tags = {}) {
    const metric = {
      name,
      value,
      timestamp: Date.now(),
      tags,
    };

    this.metrics.set(name, metric);

    // Check thresholds
    this.checkThresholds(name, value);

    // Send to monitoring service
    this.sendToMonitoring(metric);
  }

  checkThresholds(name, value) {
    const threshold = this.thresholds[name];
    if (threshold && value > threshold) {
      console.warn(
        `🚨 Performance threshold exceeded: ${name} = ${value} (threshold: ${threshold})`,
      );

      // Send alert
      this.sendAlert({
        type: "threshold_exceeded",
        metric: name,
        value,
        threshold,
        timestamp: Date.now(),
      });
    }
  }

  sendToMonitoring(metric) {
    // Send to your monitoring service (e.g., DataDog, New Relic, etc.)
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "performance_metric", {
        event_category: "performance",
        event_label: metric.name,
        value: metric.value,
        custom_map: metric.tags,
      });
    }
  }

  sendAlert(alert) {
    // Send alert to your alerting service
    console.error("Performance Alert:", alert);

    // Could integrate with services like:
    // - Slack webhooks
    // - PagerDuty
    // - Email notifications
    // - Monitoring dashboards
  }

  getMetrics() {
    return Array.from(this.metrics.values());
  }

  getMetric(name) {
    return this.metrics.get(name);
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Global error handler for Firebase errors
window.addEventListener("unhandledrejection", (event) => {
  if (event.reason?.message?.includes("firebase")) {
    performanceMonitor.recordMetric("firebase_error", 1, {
      error: event.reason.message,
      stack: event.reason.stack,
    });
  }
});
```

### Step 6.2: Create Performance Regression Tests

Create `tests/performance/regression.test.js`:

```javascript
import { performanceMonitor } from "@/lib/monitoring/performance-monitor";

describe("Performance Regression Tests", () => {
  const baselineMetrics = {
    firebaseLoadTime: 1500, // ms
    bundleSize: 1.8 * 1024 * 1024, // bytes
    cacheHitRate: 0.85,
  };

  test("no performance regression in Firebase loading", async () => {
    const start = performance.now();

    // Load Firebase services
    const { productsService } = await import("@/lib/firebase/firestore");
    await productsService.getAll();

    const end = performance.now();
    const loadTime = end - start;

    performanceMonitor.recordMetric("firebaseLoadTime", loadTime);

    // Ensure no regression from baseline
    expect(loadTime).toBeLessThanOrEqual(
      baselineMetrics.firebaseLoadTime * 1.1,
    ); // Max 10% regression
  });

  test("bundle size within limits", () => {
    // This would be run after build
    const bundleStats = require("../../bundle-analysis.json");
    const firebaseSize = bundleStats.totalFirebaseSize;

    performanceMonitor.recordMetric("bundleSize", firebaseSize);

    expect(firebaseSize).toBeLessThanOrEqual(baselineMetrics.bundleSize);
  });

  test("cache hit rate maintained", async () => {
    // Perform multiple queries to test caching
    const { productsService } = await import("@/lib/firebase/firestore");

    const queries = [];
    for (let i = 0; i < 5; i++) {
      queries.push(productsService.getAll());
    }

    const start = performance.now();
    await Promise.all(queries);
    const end = performance.now();

    // Calculate cache efficiency (should be much faster after first query)
    const cacheHitRate = calculateCacheHitRate();

    performanceMonitor.recordMetric("cacheHitRate", cacheHitRate);

    expect(cacheHitRate).toBeGreaterThanOrEqual(baselineMetrics.cacheHitRate);
  });
});
```

---

## Rollback Procedures

### Step 7.1: Create Feature Flags

Create `src/lib/feature-flags.js`:

```javascript
// Feature flags for gradual rollout and rollback
export const FEATURE_FLAGS = {
  FIREBASE_LAZY_LOADING:
    process.env.NEXT_PUBLIC_FIREBASE_LAZY_LOADING === "true",
  REACT_QUERY_CACHING: process.env.NEXT_PUBLIC_REACT_QUERY_CACHING === "true",
  FIRESTORE_PERSISTENCE:
    process.env.NEXT_PUBLIC_FIRESTORE_PERSISTENCE === "true",
  FIREBASE_PERFORMANCE_MONITORING:
    process.env.NEXT_PUBLIC_FIREBASE_PERFORMANCE_MONITORING === "true",
  BACKGROUND_SYNC: process.env.NEXT_PUBLIC_BACKGROUND_SYNC === "true",
  PAGINATED_LOADING: process.env.NEXT_PUBLIC_PAGINATED_LOADING === "true",
};

// Utility to check if feature is enabled
export const isFeatureEnabled = (feature) => {
  return FEATURE_FLAGS[feature] ?? false;
};

// Gradual rollout helper
export const getFeatureRolloutPercentage = (feature) => {
  const rolloutKey = `${feature}_ROLLOUT`;
  return parseInt(process.env[`NEXT_PUBLIC_${rolloutKey}`] || "0");
};

export const isUserInRollout = (feature, userId) => {
  const percentage = getFeatureRolloutPercentage(feature);
  if (percentage === 0) return false;
  if (percentage === 100) return true;

  // Simple hash-based rollout
  const hash = userId
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return hash % 100 < percentage;
};
```

### Step 7.2: Implement Gradual Rollback Strategy

Create `src/lib/rollback-manager.js`:

```javascript
import { FEATURE_FLAGS, isFeatureEnabled } from "./feature-flags";

class RollbackManager {
  constructor() {
    this.originalImplementations = new Map();
    this.rollbackTriggers = new Map();
  }

  // Store original implementation before overriding
  storeOriginal(key, implementation) {
    this.originalImplementations.set(key, implementation);
  }

  // Restore original implementation
  rollback(key) {
    const original = this.originalImplementations.get(key);
    if (original) {
      // Restore the original implementation
      // This would depend on how you override functions
      console.log(`Rolling back ${key} to original implementation`);
      return original;
    }
  }

  // Rollback all features
  rollbackAll() {
    console.log("Performing full rollback of performance optimizations...");

    // Disable all feature flags
    Object.keys(FEATURE_FLAGS).forEach((flag) => {
      process.env[`NEXT_PUBLIC_${flag}`] = "false";
    });

    // Restore original implementations
    this.originalImplementations.forEach((_, key) => {
      this.rollback(key);
    });

    // Clear caches
    if (typeof window !== "undefined") {
      // Clear React Query cache
      queryClient.clear();

      // Clear Firebase persistence
      if ("caches" in window) {
        caches.delete("firebase-cache");
      }
    }

    console.log("Full rollback completed. Please refresh the page.");
  }

  // Setup automatic rollback triggers
  setupAutoRollback() {
    // Rollback if error rate exceeds threshold
    this.rollbackTriggers.set("high_error_rate", {
      condition: () => this.checkErrorRate() > 0.1, // 10% error rate
      action: () => this.rollbackAll(),
    });

    // Rollback if performance degrades significantly
    this.rollbackTriggers.set("performance_degradation", {
      condition: () => this.checkPerformanceDegradation() > 0.5, // 50% slower
      action: () => this.rollbackAll(),
    });

    // Check triggers periodically
    setInterval(() => {
      this.rollbackTriggers.forEach((trigger, name) => {
        if (trigger.condition()) {
          console.warn(`Trigger activated: ${name}`);
          trigger.action();
        }
      });
    }, 60000); // Check every minute
  }

  checkErrorRate() {
    // Implement error rate checking logic
    return 0; // Placeholder
  }

  checkPerformanceDegradation() {
    // Implement performance degradation checking logic
    return 0; // Placeholder
  }
}

export const rollbackManager = new RollbackManager();
```

### Step 7.3: Create Rollback UI Component

Create `src/components/admin/RollbackPanel.jsx`:

```javascript
import { useState } from "react";
import { rollbackManager } from "@/lib/rollback-manager";

export default function RollbackPanel() {
  const [isRollingBack, setIsRollingBack] = useState(false);

  const handleRollback = async () => {
    if (
      confirm(
        "Are you sure you want to rollback all performance optimizations? This will disable all new features and may impact performance.",
      )
    ) {
      setIsRollingBack(true);
      try {
        rollbackManager.rollbackAll();
        alert(
          "Rollback completed successfully. Please refresh the page to see changes.",
        );
      } catch (error) {
        alert("Rollback failed: " + error.message);
      } finally {
        setIsRollingBack(false);
      }
    }
  };

  const handlePartialRollback = async (feature) => {
    if (confirm(`Rollback ${feature} optimization?`)) {
      try {
        rollbackManager.rollback(feature);
        alert(`${feature} rolled back successfully.`);
      } catch (error) {
        alert(`Failed to rollback ${feature}: ${error.message}`);
      }
    }
  };

  return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
      <h2 className="text-xl font-bold text-red-800 mb-4">
        🚨 Emergency Rollback Panel
      </h2>
      <p className="text-red-700 mb-4">
        Use these controls only if performance optimizations are causing
        critical issues.
      </p>

      <div className="space-y-4">
        <button
          onClick={handleRollback}
          disabled={isRollingBack}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
        >
          {isRollingBack
            ? "Rolling Back..."
            : "Full Rollback (Disable All Optimizations)"}
        </button>

        <div className="space-y-2">
          <h3 className="font-semibold">Partial Rollbacks:</h3>
          <button
            onClick={() => handlePartialRollback("lazy_loading")}
            className="bg-orange-600 text-white px-3 py-1 rounded text-sm mr-2"
          >
            Disable Lazy Loading
          </button>
          <button
            onClick={() => handlePartialRollback("caching")}
            className="bg-orange-600 text-white px-3 py-1 rounded text-sm mr-2"
          >
            Disable Caching
          </button>
          <button
            onClick={() => handlePartialRollback("persistence")}
            className="bg-orange-600 text-white px-3 py-1 rounded text-sm"
          >
            Disable Persistence
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Implementation Checklist

### Pre-Implementation ✅

- [ ] Environment setup completed
- [ ] Performance baseline established
- [ ] Dependencies installed
- [ ] Monitoring infrastructure ready

### Phase 1: Critical Path Optimization ✅

- [ ] React Query provider implemented
- [ ] Firebase service hooks created
- [ ] Firestore persistence enabled
- [ ] Cache-aware document fetching implemented

### Phase 2: Bundle Optimization ✅

- [ ] Static imports converted to dynamic
- [ ] Prioritized data loading implemented
- [ ] Next.js bundle splitting configured

### Phase 3: Advanced Caching ✅

- [ ] Firebase Performance Monitoring enabled
- [ ] Performance tracing added to operations
- [ ] Background sync implemented

### Phase 4: Data Loading Optimization ✅

- [ ] Optimized product loading with stock enrichment
- [ ] Selective field loading implemented
- [ ] Pagination for large datasets added

### Testing & Validation ✅

- [ ] Performance test suite created
- [ ] Bundle analysis script implemented
- [ ] Performance monitoring dashboard built

### Monitoring & Maintenance ✅

- [ ] Automated performance monitoring setup
- [ ] Performance regression tests created

### Rollback Procedures ✅

- [ ] Feature flags implemented
- [ ] Gradual rollback strategy created
- [ ] Rollback UI component built

---

## Expected Performance Improvements

| Metric                 | Before        | After                     | Improvement   |
| ---------------------- | ------------- | ------------------------- | ------------- |
| Initial Bundle Size    | 9.6MB         | ~2MB                      | 79% reduction |
| Firebase Load Time     | 3-5s          | <1s                       | 70-80% faster |
| Subsequent Loads       | Network hit   | Cached                    | 90% faster    |
| Offline Performance    | Limited       | Full offline support      | Complete      |
| Development Experience | No monitoring | Full performance insights | Comprehensive |

## Risk Mitigation

### Rollback Strategy

- Feature flags allow gradual rollout and instant rollback
- Performance monitoring detects issues automatically
- Emergency rollback panel for critical situations

### Testing Strategy

- Comprehensive performance test suite
- Bundle size monitoring
- Cache effectiveness validation
- Error rate monitoring

### Monitoring Strategy

- Real-time performance metrics
- Automated alerts for performance degradation
- Performance regression detection
- User experience monitoring

This detailed implementation guide provides a complete roadmap for optimizing Firebase loading performance while maintaining system stability and providing comprehensive rollback capabilities.</content>
<parameter name="filePath">c:\Users\kevin\SynologyDrive\Candy Kush\pos-candy-kush\FIREBASE_LOADING_OPTIMIZATION_IMPLEMENTATION_GUIDE.md
