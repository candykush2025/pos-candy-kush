/**
 * React Query configuration for optimal caching
 */

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes
      staleTime: 5 * 60 * 1000, // 5 minutes

      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime in v4)

      // Retry failed requests
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Don't refetch on window focus for reports (user-triggered refresh instead)
      refetchOnWindowFocus: false,

      // Don't refetch on mount if data is fresh
      refetchOnMount: false,

      // Keep previous data while fetching new data (instant UX)
      placeholderData: (previousData) => previousData,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
});

// Query keys for consistent cache management
export const QUERY_KEYS = {
  RECEIPTS: "receipts",
  RECEIPTS_ALL: ["receipts", "all"],
  RECEIPTS_RANGE: (startDate, endDate) => [
    "receipts",
    "range",
    startDate,
    endDate,
  ],

  PRODUCTS: "products",
  PRODUCTS_ALL: ["products", "all"],

  CATEGORIES: "categories",
  CATEGORIES_ALL: ["categories", "all"],

  EMPLOYEES: "employees",
  EMPLOYEES_ALL: ["employees", "all"],

  SHIFTS: "shifts",
  SHIFTS_ALL: ["shifts", "all"],

  REPORT_SALES_SUMMARY: (dateRange, employees) => [
    "report",
    "sales-summary",
    dateRange,
    employees,
  ],
  REPORT_SALES_BY_ITEM: (dateRange, employees) => [
    "report",
    "sales-by-item",
    dateRange,
    employees,
  ],
  REPORT_SALES_BY_CATEGORY: (dateRange, employees) => [
    "report",
    "sales-by-category",
    dateRange,
    employees,
  ],
  REPORT_SALES_BY_EMPLOYEE: (dateRange) => [
    "report",
    "sales-by-employee",
    dateRange,
  ],
  REPORT_SALES_BY_PAYMENT: (dateRange, employees) => [
    "report",
    "sales-by-payment",
    dateRange,
    employees,
  ],
};

// Prefetch common report data
export const prefetchReportData = async (client = queryClient) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Prefetch receipts from last 30 days
  await client.prefetchQuery({
    queryKey: QUERY_KEYS.RECEIPTS_RANGE(thirtyDaysAgo, now),
    queryFn: async () => {
      const { receiptsService } = await import("@/lib/firebase/firestore");
      return receiptsService.getAll({ orderBy: ["createdAt", "desc"] });
    },
    staleTime: 5 * 60 * 1000,
  });

  // Prefetch products
  await client.prefetchQuery({
    queryKey: QUERY_KEYS.PRODUCTS_ALL,
    queryFn: async () => {
      const { productsService } = await import("@/lib/firebase/firestore");
      return productsService.getAll();
    },
    staleTime: 30 * 60 * 1000, // Products change less frequently
  });

  // Prefetch categories
  await client.prefetchQuery({
    queryKey: QUERY_KEYS.CATEGORIES_ALL,
    queryFn: async () => {
      const { categoriesService } = await import("@/lib/firebase/firestore");
      return categoriesService.getAll();
    },
    staleTime: 60 * 60 * 1000, // Categories change even less frequently
  });
};

// Invalidate all report caches (call after new receipt/transaction)
export const invalidateReportCaches = (client = queryClient) => {
  client.invalidateQueries({ queryKey: [QUERY_KEYS.RECEIPTS] });
  client.invalidateQueries({ queryKey: ["report"] });
};
