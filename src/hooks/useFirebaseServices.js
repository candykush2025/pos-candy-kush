import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  measureAsyncPerformance,
  performanceTracker,
} from "@/lib/performance/measure";

/**
 * Firebase Service Hooks with Dynamic Imports
 * IMPORTANT: Always fetches LATEST data from server (no cached old data)
 * Optimized for fast loading with lazy-loaded Firebase services
 */

// Lazy load Firebase services (only when needed)
let servicesCache = {};

const loadProductsService = async () => {
  if (!servicesCache.productsService) {
    const module = await import("@/lib/firebase/firestore");
    servicesCache.productsService = module.productsService;
  }
  return servicesCache.productsService;
};

const loadCustomersService = async () => {
  if (!servicesCache.customersService) {
    const module = await import("@/lib/firebase/firestore");
    servicesCache.customersService = module.customersService;
  }
  return servicesCache.customersService;
};

const loadCategoriesService = async () => {
  if (!servicesCache.categoriesService) {
    const module = await import("@/lib/firebase/firestore");
    servicesCache.categoriesService = module.categoriesService;
  }
  return servicesCache.categoriesService;
};

const loadCashbackService = async () => {
  if (!servicesCache.cashbackService) {
    const module = await import("@/lib/firebase/cashbackService");
    servicesCache.cashbackRulesService = module.cashbackRulesService;
    servicesCache.pointUsageRulesService = module.pointUsageRulesService;
    servicesCache.customerPointsService = module.customerPointsService;
  }
  return {
    cashbackRulesService: servicesCache.cashbackRulesService,
    pointUsageRulesService: servicesCache.pointUsageRulesService,
    customerPointsService: servicesCache.customerPointsService,
  };
};

const loadDiscountsService = async () => {
  if (!servicesCache.discountsService) {
    const module = await import("@/lib/firebase/discountsService");
    servicesCache.discountsService = module.discountsService;
  }
  return servicesCache.discountsService;
};

const loadShiftsService = async () => {
  if (!servicesCache.shiftsService) {
    const module = await import("@/lib/firebase/shiftsService");
    servicesCache.shiftsService = module.shiftsService;
  }
  return servicesCache.shiftsService;
};

/**
 * Hook: useProducts
 * ALWAYS fetches latest products from server (no cache)
 */
export const useProducts = (options = {}) => {
  return useQuery({
    queryKey: ["products", options],
    queryFn: async () => {
      return measureAsyncPerformance("Load Products", async () => {
        performanceTracker.startQuery("products");
        const service = await loadProductsService();
        const data = await service.getAll(options);
        performanceTracker.endQuery("products", data?.length || 0);
        return data;
      });
    },
    // CRITICAL: No caching - always fetch fresh data
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook: useCustomers
 * ALWAYS fetches latest customers from server (no cache)
 */
export const useCustomers = (options = {}) => {
  return useQuery({
    queryKey: ["customers", options],
    queryFn: async () => {
      return measureAsyncPerformance("Load Customers", async () => {
        performanceTracker.startQuery("customers");
        const service = await loadCustomersService();
        const data = await service.getAll(options);
        performanceTracker.endQuery("customers", data?.length || 0);
        return data;
      });
    },
    // CRITICAL: No caching - always fetch fresh data
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook: useCategories
 * ALWAYS fetches latest categories from server (no cache)
 */
export const useCategories = (options = {}) => {
  return useQuery({
    queryKey: ["categories", options],
    queryFn: async () => {
      return measureAsyncPerformance("Load Categories", async () => {
        performanceTracker.startQuery("categories");
        const service = await loadCategoriesService();
        const data = await service.getAll(options);
        performanceTracker.endQuery("categories", data?.length || 0);
        return data;
      });
    },
    // CRITICAL: No caching - always fetch fresh data
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook: useCashbackRules
 * ALWAYS fetches latest cashback rules from server (no cache)
 */
export const useCashbackRules = () => {
  return useQuery({
    queryKey: ["cashback-rules"],
    queryFn: async () => {
      return measureAsyncPerformance("Load Cashback Rules", async () => {
        performanceTracker.startQuery("cashback-rules");
        const { cashbackRulesService } = await loadCashbackService();
        const data = await cashbackRulesService.getAll();
        performanceTracker.endQuery("cashback-rules", data?.length || 0);
        return data;
      });
    },
    // CRITICAL: No caching - always fetch fresh data
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook: usePointUsageRules
 * ALWAYS fetches latest point usage rules from server (no cache)
 */
export const usePointUsageRules = () => {
  return useQuery({
    queryKey: ["point-usage-rules"],
    queryFn: async () => {
      return measureAsyncPerformance("Load Point Usage Rules", async () => {
        performanceTracker.startQuery("point-usage-rules");
        const { pointUsageRulesService } = await loadCashbackService();
        const data = await pointUsageRulesService.getAll();
        performanceTracker.endQuery("point-usage-rules", data?.length || 0);
        return data;
      });
    },
    // CRITICAL: No caching - always fetch fresh data
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook: useDiscounts
 * ALWAYS fetches latest discounts from server (no cache)
 */
export const useDiscounts = (options = {}) => {
  return useQuery({
    queryKey: ["discounts", options],
    queryFn: async () => {
      return measureAsyncPerformance("Load Discounts", async () => {
        performanceTracker.startQuery("discounts");
        const service = await loadDiscountsService();
        const data = await service.getAll(options);
        performanceTracker.endQuery("discounts", data?.length || 0);
        return data;
      });
    },
    // CRITICAL: No caching - always fetch fresh data
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook: useActiveShift
 * ALWAYS fetches latest active shift from server (no cache)
 */
export const useActiveShift = (userId) => {
  return useQuery({
    queryKey: ["active-shift", userId],
    queryFn: async () => {
      return measureAsyncPerformance("Load Active Shift", async () => {
        performanceTracker.startQuery("active-shift");
        const service = await loadShiftsService();
        const data = await service.getActiveShift(userId);
        performanceTracker.endQuery("active-shift", data ? 1 : 0);
        return data;
      });
    },
    enabled: !!userId,
    // CRITICAL: No caching - always fetch fresh data
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

/**
 * Mutation Hook: useCreateProduct
 * After creating, automatically refetch products to get latest data
 */
export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productData) => {
      const service = await loadProductsService();
      return service.create(productData);
    },
    onSuccess: () => {
      // Force refetch products to get latest data
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

/**
 * Mutation Hook: useUpdateProduct
 * After updating, automatically refetch products to get latest data
 */
export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const service = await loadProductsService();
      return service.update(id, data);
    },
    onSuccess: () => {
      // Force refetch products to get latest data
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

/**
 * Mutation Hook: useDeleteProduct
 * After deleting, automatically refetch products to get latest data
 */
export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId) => {
      const service = await loadProductsService();
      return service.delete(productId);
    },
    onSuccess: () => {
      // Force refetch products to get latest data
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

/**
 * Force refresh all data from server
 */
export const useRefreshAll = () => {
  const queryClient = useQueryClient();

  return () => {
    console.log("🔄 Force refreshing all data from server...");
    queryClient.invalidateQueries();
    queryClient.refetchQueries();
  };
};
