/**
 * Optimized data hooks for reports
 * Uses React Query + IndexedDB caching for instant loading
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  receiptsService,
  productsService,
  categoriesService,
} from "@/lib/firebase/firestore";
import { reportsCacheDB } from "@/lib/cache/reportsCacheDB";
import { QUERY_KEYS } from "@/lib/cache/queryClient";

/**
 * Hook to load all receipts with caching
 */
export const useReceipts = (options = {}) => {
  return useQuery({
    queryKey: QUERY_KEYS.RECEIPTS_ALL,
    queryFn: async () => {
      console.log("🔍 Fetching receipts...");

      // Try cache first
      const cachedReceipts = await reportsCacheDB.getCachedReceipts();
      if (cachedReceipts && cachedReceipts.length > 0) {
        console.log("⚡ Using cached receipts");
        return cachedReceipts;
      }

      // Fetch from Firebase
      console.log("🔥 Fetching from Firebase...");
      const receipts = await receiptsService.getAll({
        orderBy: ["createdAt", "desc"],
      });

      // Cache for next time
      if (receipts && receipts.length > 0) {
        await reportsCacheDB.cacheReceipts(receipts, 5); // 5 min cache
      }

      return receipts || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};

/**
 * Hook to load receipts within a date range
 */
export const useReceiptsInRange = (startDate, endDate, options = {}) => {
  const queryKey =
    startDate && endDate
      ? QUERY_KEYS.RECEIPTS_RANGE(
          startDate.toISOString(),
          endDate.toISOString()
        )
      : QUERY_KEYS.RECEIPTS_ALL;

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!startDate || !endDate) {
        return [];
      }

      console.log("🔍 Fetching receipts in range...");

      // Try cache first
      const cachedReceipts = await reportsCacheDB.getReceiptsInRange(
        startDate,
        endDate
      );
      if (cachedReceipts && cachedReceipts.length > 0) {
        console.log("⚡ Using cached receipts (range)");
        return cachedReceipts;
      }

      // If no cache, fetch all and filter
      // (In production, you'd add date filtering to Firestore query)
      const allReceipts = await receiptsService.getAll({
        orderBy: ["createdAt", "desc"],
      });

      // Cache all receipts
      if (allReceipts && allReceipts.length > 0) {
        await reportsCacheDB.cacheReceipts(allReceipts, 5);
      }

      // Filter by date range
      const filteredReceipts = (allReceipts || []).filter((receipt) => {
        const receiptDate = getReceiptDate(receipt);
        return receiptDate >= startDate && receiptDate <= endDate;
      });

      return filteredReceipts;
    },
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to load all products with caching
 */
export const useProducts = (options = {}) => {
  return useQuery({
    queryKey: QUERY_KEYS.PRODUCTS_ALL,
    queryFn: async () => {
      console.log("🔍 Fetching products...");

      // Try cache first
      const cachedProducts = await reportsCacheDB.getCachedProducts();
      if (cachedProducts && cachedProducts.length > 0) {
        console.log("⚡ Using cached products");
        return cachedProducts;
      }

      // Fetch from Firebase
      console.log("🔥 Fetching products from Firebase...");
      const products = await productsService.getAll();

      // Cache for next time
      if (products && products.length > 0) {
        await reportsCacheDB.cacheProducts(products, 30); // 30 min cache (products change less)
      }

      return products || [];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes (products don't change as often)
    gcTime: 60 * 60 * 1000, // 1 hour
    ...options,
  });
};

/**
 * Hook to load all categories with caching
 */
export const useCategories = (options = {}) => {
  return useQuery({
    queryKey: QUERY_KEYS.CATEGORIES_ALL,
    queryFn: async () => {
      console.log("🔍 Fetching categories...");

      // Try cache first
      const cachedCategories = await reportsCacheDB.getCachedCategories();
      if (cachedCategories && cachedCategories.length > 0) {
        console.log("⚡ Using cached categories");
        return cachedCategories;
      }

      // Fetch from Firebase
      console.log("🔥 Fetching categories from Firebase...");
      const categories = await categoriesService.getAll();

      // Cache for next time
      if (categories && categories.length > 0) {
        await reportsCacheDB.cacheCategories(categories, 60); // 60 min cache
      }

      return categories || [];
    },
    staleTime: 60 * 60 * 1000, // 1 hour (categories rarely change)
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    ...options,
  });
};

/**
 * Hook to load all report data at once (receipts + products + categories)
 */
export const useReportData = (options = {}) => {
  const receiptsQuery = useReceipts(options);
  const productsQuery = useProducts(options);
  const categoriesQuery = useCategories(options);

  return {
    receipts: receiptsQuery.data || [],
    products: productsQuery.data || [],
    categories: categoriesQuery.data || [],
    isLoading:
      receiptsQuery.isLoading ||
      productsQuery.isLoading ||
      categoriesQuery.isLoading,
    isFetching:
      receiptsQuery.isFetching ||
      productsQuery.isFetching ||
      categoriesQuery.isFetching,
    isError:
      receiptsQuery.isError || productsQuery.isError || categoriesQuery.isError,
    error: receiptsQuery.error || productsQuery.error || categoriesQuery.error,
    refetch: () => {
      receiptsQuery.refetch();
      productsQuery.refetch();
      categoriesQuery.refetch();
    },
  };
};

/**
 * Hook to invalidate and refresh all report data
 */
export const useInvalidateReports = () => {
  const queryClient = useQueryClient();

  return async () => {
    // Clear IndexedDB cache
    await reportsCacheDB.invalidateAll();

    // Invalidate React Query caches
    await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RECEIPTS] });
    await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTS] });
    await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORIES] });
    await queryClient.invalidateQueries({ queryKey: ["report"] });

    console.log("✅ All report caches invalidated");
  };
};

/**
 * Helper to get receipt date (handles various date field formats)
 */
const getReceiptDate = (receipt) => {
  if (receipt.receipt_date) {
    return receipt.receipt_date?.toDate
      ? receipt.receipt_date.toDate()
      : new Date(receipt.receipt_date);
  } else if (receipt.receiptDate) {
    return receipt.receiptDate?.toDate
      ? receipt.receiptDate.toDate()
      : new Date(receipt.receiptDate);
  } else {
    const fallbackDate = receipt.created_at || receipt.createdAt;
    return fallbackDate?.toDate
      ? fallbackDate.toDate()
      : new Date(fallbackDate);
  }
};
