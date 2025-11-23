"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCartStore } from "@/store/useCartStore";
import { useTicketStore } from "@/store/useTicketStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useSyncStore } from "@/store/useSyncStore";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  productsService,
  customersService,
  customTabsService,
  categoriesService,
} from "@/lib/firebase/firestore";
import { discountsService } from "@/lib/firebase/discountsService";
import { shiftsService } from "@/lib/firebase/shiftsService";
import { customerApprovalService } from "@/lib/firebase/customerApprovalService";
import { dbService } from "@/lib/db/dbService";
import db from "@/lib/db/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Save,
  CreditCard,
  Grid,
  List,
  Printer,
  Banknote,
  Wallet,
  User,
  UserPlus,
  X,
  Wifi,
  WifiOff,
  CloudOff,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ArrowLeftRight,
  Bitcoin,
  Folder,
  ArrowLeft,
  Percent,
  Tag,
  Mail,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import { toast } from "sonner";

// Sortable Tab Component
function SortableTab({
  id,
  category,
  isSelected,
  onClick,
  onLongPressStart,
  onLongPressEnd,
  isDragMode,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isDragMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragMode && "touch-none")}
      {...(isDragMode ? { ...attributes, ...listeners } : {})}
    >
      <button
        type="button"
        onClick={!isDragMode ? onClick : undefined}
        onMouseDown={!isDragMode ? onLongPressStart : undefined}
        onMouseUp={!isDragMode ? onLongPressEnd : undefined}
        onMouseLeave={!isDragMode ? onLongPressEnd : undefined}
        onTouchStart={!isDragMode ? onLongPressStart : undefined}
        onTouchEnd={!isDragMode ? onLongPressEnd : undefined}
        onContextMenu={(e) => e.preventDefault()}
        className={cn(
          "px-8 py-4 text-xl font-medium border-r border-gray-300 dark:border-gray-700 whitespace-nowrap transition-colors w-full select-none touch-manipulation",
          isSelected
            ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-t-2"
            : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-800 dark:hover:bg-gray-800",
          isDragMode && "ring-2 ring-blue-400 cursor-move"
        )}
        style={{
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          borderTopColor: isSelected ? "#16a34a" : undefined,
        }}
      >
        {category}
      </button>
    </div>
  );
}

export default function SalesSection({ cashier }) {
  // Use cashier for Firebase operations (cashier.id is the user ID)
  const userId = cashier?.id;

  const {
    items,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    processPayment,
    getSubtotal,
    getDiscountAmount,
    getTotal,
    getItemCount,
    getCartData,
    customer: cartCustomer,
    setCustomer: setCartCustomer,
    setDiscount,
    discount: cartDiscount,
    discounts: cartDiscounts,
    addDiscount,
    removeDiscount,
    clearDiscounts,
  } = useCartStore();

  const { createTicket } = useTicketStore();
  const { pendingCount } = useSyncStore();
  const isOnline = useOnlineStatus();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [unsyncedOrders, setUnsyncedOrders] = useState(0);
  const [hasActiveShift, setHasActiveShift] = useState(false);
  const [categories, setCategories] = useState([]); // category names for tabs
  const [categoriesData, setCategoriesData] = useState([]); // full category objects from Firebase
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("tab") || "all"
  );
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [customCategories, setCustomCategories] = useState([]);

  // Custom category products: { categoryName: [20 slots with {type, id, data}] }
  const [customCategoryProducts, setCustomCategoryProducts] = useState({});
  const [showProductSelectModal, setShowProductSelectModal] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(null);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [selectionType, setSelectionType] = useState("product"); // 'product' or 'category'

  // Category view state (when viewing category from slot click)
  const [viewingCategoryId, setViewingCategoryId] = useState(null);
  const [viewingCategoryName, setViewingCategoryName] = useState(null);
  const [previousCustomCategory, setPreviousCustomCategory] = useState(null);

  // Long press menu state
  const [showTabMenu, setShowTabMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedTabForMenu, setSelectedTabForMenu] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [isDragMode, setIsDragMode] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const longPressTimer = useRef(null);

  // Category SLOT colors (for boxes in grid) - key: "categoryName-index-categoryId"
  const [categorySlotColors, setCategorySlotColors] = useState({});
  const [showSlotColorPicker, setShowSlotColorPicker] = useState(false);
  const [selectedSlotForColor, setSelectedSlotForColor] = useState(null);

  const CATEGORY_COLORS = [
    "#3b82f6", // Blue
    "#ef4444", // Red
    "#10b981", // Green
    "#f59e0b", // Orange
    "#8b5cf6", // Purple
    "#ec4899", // Pink
    "#06b6d4", // Cyan
    "#84cc16", // Lime
  ];

  // Weight input modal state
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [selectedWeightProduct, setSelectedWeightProduct] = useState(null);
  const [weightInput, setWeightInput] = useState("");

  // Prevent mobile pull-to-refresh on iOS (fallback for browsers that don't support overscroll-behavior)
  useEffect(() => {
    let startY = 0;
    let maybePrevent = false;

    const onTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      startY = e.touches[0].clientY;
      // If the document is scrolled to the top, we may need to prevent pull-to-refresh
      maybePrevent =
        window.scrollY === 0 || document.documentElement.scrollTop === 0;
    };

    const onTouchMove = (e) => {
      if (!maybePrevent) return;
      const currentY = e.touches[0].clientY;
      const diffY = currentY - startY;
      // if user is pulling down (positive diff) while at page top, prevent default to stop refresh
      if (diffY > 0) {
        e.preventDefault();
      }
    };

    // Use passive: false so we can call preventDefault()
    document.addEventListener("touchstart", onTouchStart, { passive: false });
    document.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  // DnD Kit sensors
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: isDragMode
      ? undefined
      : {
          distance: 8,
        },
  });

  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });

  const sensors = useSensors(pointerSensor, keyboardSensor);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Receipt modal state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  // Customer selection state (modals only - actual customer is in cart store)
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCustomerSelectModal, setShowCustomerSelectModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");

  // Discount state
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [availableDiscounts, setAvailableDiscounts] = useState([]);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [showCustomDiscountForm, setShowCustomDiscountForm] = useState(false);
  const [customDiscountTitle, setCustomDiscountTitle] = useState("");
  const [customDiscountType, setCustomDiscountType] = useState("percentage");
  const [customDiscountValue, setCustomDiscountValue] = useState("");

  // Barcode scanner state
  const [barcodeBuffer, setBarcodeBuffer] = useState("");
  const [lastKeyTime, setLastKeyTime] = useState(0);

  // Initialize device ID on first load
  useEffect(() => {
    if (typeof window !== "undefined") {
      let deviceId = localStorage.getItem("device_id");
      if (!deviceId) {
        // Generate unique device ID
        deviceId = `device-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        localStorage.setItem("device_id", deviceId);
      }
    }
  }, []);

  // Sync selectedCategory with URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (selectedCategory === "all") {
      // Remove tab parameter if "all" is selected
      params.delete("tab");
    } else {
      // Set tab parameter
      params.set("tab", selectedCategory);
    }
    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  }, [selectedCategory, router]);

  // Load products and customers
  useEffect(() => {
    loadProducts();
    loadCustomers();
    checkUnsyncedOrders();
    checkActiveShift();
  }, []);

  // Check for active shift
  const checkActiveShift = () => {
    try {
      const savedShift = localStorage.getItem("active_shift");
      if (savedShift) {
        const activeShift = JSON.parse(savedShift);
        setHasActiveShift(activeShift && activeShift.status === "active");
      } else {
        setHasActiveShift(false);
      }
    } catch (error) {
      console.error("Error checking active shift:", error);
      setHasActiveShift(false);
    }
  };

  // Reload data when cashier changes
  useEffect(() => {
    if (cashier?.id) {
      // Clear old categories first
      setCategories([]);
      setCategoriesData([]);
      setCustomCategories([]);
      setCustomCategoryProducts({});

      // Reload products and categories
      loadProducts();

      // Check for active shift
      checkActiveShift();
    }
  }, [cashier?.id]);

  // When connection returns online, always refetch fresh data from Firebase
  useEffect(() => {
    if (isOnline) {
      loadProducts();
      loadCustomers();
    }
    // Intentionally only listen to isOnline changes
  }, [isOnline]);

  // Listen for cashier-update events from other components
  useEffect(() => {
    const handleCashierUpdate = () => {
      if (cashier?.id) {
        loadProducts();
        checkActiveShift();
      }
    };

    const handleForceRefresh = () => {
      // Force-reload from IndexedDB (after layout triggers a full refresh)
      if (cashier?.id) {
        loadProducts();
        loadCustomers();
      }
    };

    window.addEventListener("cashier-update", handleCashierUpdate);
    window.addEventListener("force-refresh-data", handleForceRefresh);
    return () => {
      window.removeEventListener("cashier-update", handleCashierUpdate);
      window.removeEventListener("force-refresh-data", handleForceRefresh);
    };
  }, [cashier?.id]);

  // Reload custom tabs when user changes (login/logout) - only once when products are ready
  useEffect(() => {
    if (userId && products.length > 0 && categoriesData.length > 0) {
      loadCustomTabsFromUser();
    }
  }, [userId]); // Only reload when userId changes, not on every product change

  // Sync selectedCategory with URL parameter
  useEffect(() => {
    if (selectedCategory && selectedCategory !== "all") {
      // Update URL without reloading the page
      const url = new URL(window.location);
      url.searchParams.set("tab", selectedCategory);
      window.history.replaceState({}, "", url);
    } else {
      // Remove tab parameter when "all" is selected
      const url = new URL(window.location);
      url.searchParams.delete("tab");
      window.history.replaceState({}, "", url);
    }
  }, [selectedCategory]);

  // Barcode scanner listener
  useEffect(() => {
    const handleKeyDown = (event) => {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;

      // If more than 100ms since last keypress, start new barcode scan
      if (timeDiff > 100) {
        setBarcodeBuffer(event.key);
      } else {
        // Continue building barcode
        setBarcodeBuffer((prev) => prev + event.key);
      }
      setLastKeyTime(currentTime);

      // Check for Enter key (barcode scan complete)
      if (event.key === "Enter") {
        const scannedCode = barcodeBuffer.trim();
        if (scannedCode) {
          processScannedBarcode(scannedCode);
        }
        setBarcodeBuffer("");
      }
    };

    // Only listen when component is mounted and customers are loaded
    if (customers.length > 0) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [customers, barcodeBuffer, lastKeyTime]);

  // Cart clearing timer - check every 10 seconds if cart is empty and clear API cart
  useEffect(() => {
    const cartClearingTimer = setInterval(async () => {
      // Check if cart is empty (no items and no customer)
      const isCartEmpty = items.length === 0 && !cartCustomer;

      if (isCartEmpty) {
        try {
          // Clear the cart API
          const response = await fetch("/api/cart", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            console.log("Cart API cleared due to empty local cart");
          } else {
            console.warn("Failed to clear cart API:", response.status);
          }
        } catch (error) {
          console.error("Error clearing cart API:", error);
        }
      }
    }, 10000); // 10 seconds

    return () => {
      clearInterval(cartClearingTimer);
    };
  }, [items.length, cartCustomer]);

  const loadCustomTabsFromUser = async () => {
    if (!userId || products.length === 0) return;

    // CLEAR OLD localStorage data FIRST!
    localStorage.removeItem("custom_category_products");
    localStorage.removeItem("category_slot_colors");
    localStorage.removeItem("custom_categories");

    try {
      // Load ALL custom tabs from all users in Firebase (shared across all users)
      const firebaseTabs = await customTabsService.getAllCustomTabs();

      if (firebaseTabs && firebaseTabs.categories) {
        setCustomCategories(firebaseTabs.categories || []);

        // Convert slot IDs back to full objects
        const productMap = {};
        products.forEach((p) => (productMap[p.id] = p));

        const categoryMap = {};
        categoriesData.forEach((c) => (categoryMap[c.id] = c));

        const resolvedSlots = {};
        const loadedColors = {}; // Still extract for backward compatibility with old color picker

        Object.keys(firebaseTabs.categoryProducts || {}).forEach((category) => {
          const slots = firebaseTabs.categoryProducts[category];
          const resolvedArray = slots.map((slot, index) => {
            if (!slot) return null;

            // Extract color for state (needed for color picker)
            if (slot.color) {
              const slotKey = `${category}-${index}-${slot.id}`;
              loadedColors[slotKey] = slot.color;
            }

            if (slot.type === "product") {
              const product = productMap[slot.id];
              return product
                ? { type: "product", id: slot.id, data: product }
                : null;
            } else if (slot.type === "category") {
              const categoryData = categoryMap[slot.id];

              if (categoryData) {
                return {
                  type: "category",
                  id: slot.id,
                  color: slot.color, // ✅ KEEP COLOR IN SLOT!
                  data: {
                    name: categoryData.name,
                    categoryId: slot.id,
                  },
                };
              } else {
                // Fallback: use slot.id as name if category not found
                return {
                  type: "category",
                  id: slot.id,
                  color: slot.color, // ✅ KEEP COLOR IN SLOT!
                  data: {
                    name: slot.id,
                    categoryId: slot.id,
                  },
                };
              }
            }
            return null;
          });

          // Ensure array is always 20 slots (pad with null if shorter)
          resolvedSlots[category] = Array.from({ length: 20 }, (_, i) =>
            resolvedArray[i] !== undefined ? resolvedArray[i] : null
          );
        });

        // Set colors state (for color picker)
        setCategorySlotColors(loadedColors);
        localStorage.setItem(
          "category_slot_colors",
          JSON.stringify(loadedColors)
        );

        setCustomCategoryProducts(resolvedSlots);

        // Also save to localStorage as backup
        localStorage.setItem(
          "custom_categories",
          JSON.stringify(firebaseTabs.categories || [])
        );
        localStorage.setItem(
          "custom_category_products",
          JSON.stringify(resolvedSlots)
        );
      }
    } catch (error) {
      console.error("Error loading custom tabs from Firebase:", error);
    }
  };

  // Check for unsynced orders periodically
  useEffect(() => {
    const interval = setInterval(checkUnsyncedOrders, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const checkUnsyncedOrders = async () => {
    try {
      const queue = await dbService.getSyncQueue();
      const orderQueue = queue.filter((item) => item.type === "order");
      setUnsyncedOrders(orderQueue.length);
    } catch (error) {
      console.error("Error checking unsynced orders:", error);
    }
  };

  // Filter products based on search and category
  useEffect(() => {
    let filtered = products;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => {
        const productCategory = getProductCategory(p);
        return productCategory === selectedCategory;
      });
    }

    // Filter by search query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          p.barcode?.includes(query) ||
          p.sku?.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered);
  }, [searchQuery, products, selectedCategory, categoriesData]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);

      // If offline, load from IndexedDB only (fallback)
      if (!isOnline) {
        const productsData = await dbService.getProducts();
        setProducts(productsData);
        setFilteredProducts(productsData);

        // Try to load categories from IndexedDB as well
        try {
          const cats = await dbService.getCategories();
          const allCategories = cats.filter(
            (cat) => cat.name && !cat.deletedAt
          );
          setCategoriesData(allCategories);
          setCategories(allCategories.map((c) => c.name).sort());
        } catch (catErr) {
          console.warn("Failed to load categories from IndexedDB:", catErr);
        }

        setIsLoading(false);
        return;
      }

      // Online: Load products and categories from Firebase in parallel (always prefer fresh server data)
      const [productsData, categoriesData] = await Promise.all([
        productsService.getAll(),
        categoriesService.getAll(),
      ]);

      // Enrich products with latest stock from stock history (so Sales shows correct stock)
      let finalProducts = productsData;
      try {
        const { stockHistoryService } = await import(
          "@/lib/firebase/stockHistoryService"
        );

        const enriched = await Promise.all(
          productsData.map(async (product) => {
            if (product.trackStock) {
              try {
                const history = await stockHistoryService.getProductHistory(
                  product.id,
                  1
                );
                if (
                  history &&
                  history.length > 0 &&
                  history[0].newStock !== undefined
                ) {
                  return {
                    ...product,
                    stock: history[0].newStock,
                    inStock: history[0].newStock,
                  };
                }
              } catch (err) {
                console.warn(
                  `Failed to fetch stock history for product ${product.id}:`,
                  err
                );
              }
            }

            return {
              ...product,
              stock: product.stock || product.inStock || 0,
              inStock: product.inStock || product.stock || 0,
            };
          })
        );

        finalProducts = enriched;
      } catch (err) {
        console.warn(
          "Stock history enrichment failed, using raw products:",
          err
        );
        finalProducts = productsData;
      }

      setProducts(finalProducts);
      setFilteredProducts(finalProducts);

      // Get ALL categories from Firebase (not filtered by user)
      const allCategories = categoriesData.filter(
        (cat) => cat.name && !cat.deletedAt
      );

      // If still no categories, extract from products as fallback
      let finalCategories = allCategories;
      if (finalCategories.length === 0 && productsData.length > 0) {
        const categorySet = new Set();
        productsData.forEach((product) => {
          const categoryName =
            product.categoryName ||
            product.category ||
            product.categoryLabel ||
            product.category_name ||
            "Uncategorized";
          if (categoryName && categoryName.trim()) {
            categorySet.add(categoryName.trim());
          }
        });

        // Create category objects from extracted names
        finalCategories = Array.from(categorySet).map((name, index) => ({
          id: `extracted-${index}`,
          name: name,
          description: `Products in ${name}`,
          userId: userId || null,
        }));
      }

      setCategoriesData(finalCategories);

      // Set category names for modal selection
      const categoryNames = finalCategories.map((cat) => cat.name).sort();
      setCategories(categoryNames);

      // Load custom tabs from Firebase if user is logged in
      if (userId) {
        try {
          // Load ALL custom tabs from all users in Firebase (shared across all users)
          const firebaseTabs = await customTabsService.getAllCustomTabs();

          if (firebaseTabs && firebaseTabs.categories) {
            setCustomCategories(firebaseTabs.categories || []);
            // Convert slot IDs back to full objects
            const productMap = {};
            productsData.forEach((p) => (productMap[p.id] = p));

            // Create category map for resolving category slots
            const categoryMap = {};
            finalCategories.forEach((cat) => (categoryMap[cat.id] = cat));

            const resolvedSlots = {};
            Object.keys(firebaseTabs.categoryProducts || {}).forEach(
              (category) => {
                const slots = firebaseTabs.categoryProducts[category];
                resolvedSlots[category] = slots.map((slot) => {
                  if (!slot) return null;

                  if (slot.type === "product") {
                    const product = productMap[slot.id];
                    return product
                      ? { type: "product", id: slot.id, data: product }
                      : null;
                  } else if (slot.type === "category") {
                    // Resolve category from categoryMap
                    const categoryData = categoryMap[slot.id];
                    return categoryData
                      ? {
                          type: "category",
                          id: slot.id,
                          color: slot.color, // ✅ KEEP COLOR IN SLOT!
                          data: {
                            name: categoryData.name,
                            categoryId: slot.id,
                          },
                        }
                      : null;
                  }
                  return null;
                });
              }
            );
            setCustomCategoryProducts(resolvedSlots);

            // Also save to localStorage as backup
            localStorage.setItem(
              "custom_categories",
              JSON.stringify(firebaseTabs.categories || [])
            );
            localStorage.setItem(
              "custom_category_products",
              JSON.stringify(resolvedSlots)
            );
          } else {
            // Fallback to localStorage if no Firebase data
            const savedCustomCategories =
              localStorage.getItem("custom_categories");
            if (savedCustomCategories) {
              setCustomCategories(JSON.parse(savedCustomCategories));
            }

            const savedCustomCategoryProducts = localStorage.getItem(
              "custom_category_products"
            );
            if (savedCustomCategoryProducts) {
              setCustomCategoryProducts(
                JSON.parse(savedCustomCategoryProducts)
              );
            }
          }
        } catch (error) {
          console.error("Error loading custom tabs from Firebase:", error);
          // Fallback to localStorage
          const savedCustomCategories =
            localStorage.getItem("custom_categories");
          if (savedCustomCategories) {
            setCustomCategories(JSON.parse(savedCustomCategories));
          }

          const savedCustomCategoryProducts = localStorage.getItem(
            "custom_category_products"
          );
          if (savedCustomCategoryProducts) {
            setCustomCategoryProducts(JSON.parse(savedCustomCategoryProducts));
          }
        }
      } else {
        // Not logged in, use localStorage only
        const savedCustomCategories = localStorage.getItem("custom_categories");
        if (savedCustomCategories) {
          setCustomCategories(JSON.parse(savedCustomCategories));
        }

        const savedCustomCategoryProducts = localStorage.getItem(
          "custom_category_products"
        );
        if (savedCustomCategoryProducts) {
          setCustomCategoryProducts(JSON.parse(savedCustomCategoryProducts));
        }
      }

      // Clear local products and rewrite with fresh Firebase data so local exactly matches server
      try {
        const localProds = await dbService.getProducts();
        const localIds = localProds.map((p) => p.id);
        if (localIds.length > 0) {
          await dbService.bulkDeleteProducts(localIds);
        }

        if (finalProducts.length > 0) {
          await dbService.upsertProducts(finalProducts);
        }
      } catch (syncErr) {
        console.warn("Failed to clear-and-rewrite products:", syncErr);
      }

      // Also clear local categories and rewrite to match Firebase finalCategories
      try {
        const localCats = await dbService.getCategories();
        const localCatIds = localCats.map((c) => c.id);
        for (const cid of localCatIds) {
          try {
            await dbService.deleteCategory(cid);
          } catch (e) {
            console.warn(`Failed to delete local category ${cid}:`, e);
          }
        }
        if (finalCategories && finalCategories.length > 0) {
          await dbService.upsertCategories(finalCategories);
        }
      } catch (catSyncErr) {
        console.warn("Failed to clear-and-rewrite categories:", catSyncErr);
      }

      // Debug logging removed
    } catch (error) {
      console.error(
        "Failed to load products from Firebase, trying IndexedDB:",
        error
      );

      // Fallback to IndexedDB if Firebase fails (offline mode)
      try {
        const productsData = await dbService.getProducts();
        setProducts(productsData);
        setFilteredProducts(productsData);
        toast.info("Loading products from offline storage");
      } catch (dbError) {
        console.error("Failed to load products:", dbError);
        toast.error("Failed to load products");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      // If online, fetch from Firebase and sync to IndexedDB
      if (isOnline) {
        const firebaseCustomers = await customersService.getAll({
          orderBy: ["name", "asc"],
        });

        // Replace local customers by clearing local storage first then writing fresh Firebase data
        try {
          const localCustomers = await dbService.getCustomers();
          const localCustIds = localCustomers.map((c) => c.id);
          for (const uid of localCustIds) {
            try {
              await dbService.deleteCustomer(uid);
            } catch (e) {
              console.warn(`Failed to delete local customer ${uid}:`, e);
            }
          }
          if (firebaseCustomers.length > 0) {
            await dbService.upsertCustomers(firebaseCustomers);
          }
        } catch (custSyncErr) {
          console.warn("Failed to clear-and-rewrite customers:", custSyncErr);
        }

        setCustomers(firebaseCustomers);
      } else {
        // If offline, load from IndexedDB
        const offlineCustomers = await dbService.getAllCustomers();
        setCustomers(offlineCustomers);
      }
    } catch (error) {
      console.error("Error loading customers:", error);
      toast.error("Failed to load customers");
    }
  };

  // Process scanned barcode to find matching customer
  const processScannedBarcode = (scannedCode) => {
    if (!scannedCode || !customers.length) return;

    // Look for customer where customerId or memberId matches the scanned code
    const matchingCustomer = customers.find(
      (customer) =>
        customer.customerId === scannedCode || customer.memberId === scannedCode
    );

    if (matchingCustomer) {
      // Set the customer in the cart
      setCartCustomer(matchingCustomer);
      toast.success(
        `Customer "${matchingCustomer.name}" selected via barcode scan`
      );
      console.log("Barcode scan matched customer:", matchingCustomer);
    } else {
      console.log("No customer found for barcode:", scannedCode);
      // Optional: Could show a subtle notification that no customer was found
      // toast.info("Customer not found for scanned barcode");
    }
  };

  const parseBoolean = (value, fallback = false) => {
    if (value === undefined || value === null) return fallback;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true") return true;
      if (normalized === "false") return false;
    }
    if (typeof value === "number") return value !== 0;
    return fallback;
  };

  const toNumber = (value, fallback = 0) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
  };

  // Helper to safely get customer points (handles both number and object types)
  const getCustomerPoints = (customer) => {
    if (!customer) return 0;

    // Try customPoints first
    if (customer.customPoints !== undefined && customer.customPoints !== null) {
      if (typeof customer.customPoints === "number") {
        return customer.customPoints;
      }
      if (
        typeof customer.customPoints === "object" &&
        customer.customPoints.amount !== undefined
      ) {
        return toNumber(customer.customPoints.amount, 0);
      }
    }

    // Try points next
    if (customer.points !== undefined && customer.points !== null) {
      if (typeof customer.points === "number") {
        return customer.points;
      }
      if (
        typeof customer.points === "object" &&
        customer.points.amount !== undefined
      ) {
        return toNumber(customer.points.amount, 0);
      }
    }

    return 0;
  };

  const getProductImage = (product) => {
    if (!product) return null;
    return (
      product.imageUrl ||
      product.image_url ||
      product.image ||
      product.thumbnailUrl ||
      product.thumbnail ||
      (Array.isArray(product.images) && product.images[0]?.url) ||
      null
    );
  };

  const getProductCategory = (product) => {
    if (!product) {
      return null;
    }

    // If product has categoryId, look up the category name from categoriesData
    if (product.categoryId && categoriesData.length > 0) {
      const category = categoriesData.find(
        (cat) => cat.id === product.categoryId
      );

      if (category) {
        return category.name;
      }
    }

    // Fallback to direct category name fields
    return (
      product.categoryName ||
      product.category ||
      product.categoryLabel ||
      product.category_name ||
      null
    );
  };

  const getProductColor = (product) => {
    return product?.color || null;
  };

  const getColorClasses = (color) => {
    if (!color) return null;

    const colorMap = {
      GREY: "bg-gray-400",
      RED: "bg-red-500",
      PINK: "bg-pink-500",
      ORANGE: "bg-orange-500",
      YELLOW: "bg-yellow-400",
      GREEN: "bg-green-500",
      BLUE: "bg-blue-500",
      PURPLE: "bg-purple-500",
    };

    return colorMap[color.toUpperCase()] || null;
  };

  const getProductSku = (product) => {
    return (
      product.sku ||
      product.referenceId ||
      product.reference_id ||
      (Array.isArray(product.variants) && product.variants[0]?.sku) ||
      null
    );
  };

  const getProductStock = (product) => {
    if (!product) return 0;

    // Try multiple top-level stock-like fields used across integrations
    const topLevelFields = [
      "stock",
      "inStock",
      "in_stock",
      "stock_quantity",
      "quantity",
      "inventory",
      "available_stock",
      "availableStock",
    ];

    for (const f of topLevelFields) {
      const v = product[f];
      const n = toNumber(v, Number.NaN);
      if (!Number.isNaN(n)) return n;
    }

    // Check first variant if present (many systems store stock on variants)
    const firstVariant = Array.isArray(product.variants)
      ? product.variants[0]
      : null;

    if (firstVariant) {
      const variantFields = [
        "stock",
        "inStock",
        "stock_quantity",
        "quantity",
        "inventory",
        "available_stock",
        "availableStock",
      ];

      for (const f of variantFields) {
        const v = firstVariant[f];
        const n = toNumber(v, Number.NaN);
        if (!Number.isNaN(n)) return n;
      }

      // Check nested stores on variant
      const firstStore = Array.isArray(firstVariant.stores)
        ? firstVariant.stores[0]
        : null;
      if (firstStore) {
        const storeFields = [
          "stock",
          "available_stock",
          "availableStock",
          "quantity",
        ];
        for (const f of storeFields) {
          const v = firstStore[f];
          const n = toNumber(v, Number.NaN);
          if (!Number.isNaN(n)) return n;
        }
      }
    }

    return 0;
  };

  const isProductAvailable = (product) => {
    const directAvailability = parseBoolean(product.availableForSale, true);
    if (!directAvailability) return false;

    const firstVariant = Array.isArray(product.variants)
      ? product.variants[0]
      : null;
    if (!firstVariant) return true;

    const firstStore = Array.isArray(firstVariant.stores)
      ? firstVariant.stores[0]
      : null;
    if (!firstStore || firstStore.available_for_sale === undefined) return true;

    return parseBoolean(firstStore.available_for_sale, true);
  };

  const handleAddToCart = (product) => {
    const trackStock = parseBoolean(product.trackStock, true);
    const availableForSale = isProductAvailable(product);
    const stock = getProductStock(product);

    if (!availableForSale) {
      toast.error("Product is not available for sale");
      return;
    }

    if (trackStock && stock <= 0) {
      toast.error("Product out of stock");
      return;
    }

    // Check if product is sold by weight
    if (product.soldBy === "weight") {
      setSelectedWeightProduct(product);
      setWeightInput("");
      setShowWeightModal(true);
      return;
    }

    addItem(product, 1);
  };

  const handleWeightKeypad = (value) => {
    if (value === "clear") {
      setWeightInput("");
    } else if (value === "backspace") {
      setWeightInput((prev) => prev.slice(0, -1));
    } else if (value === ",") {
      // Only allow one comma
      if (!weightInput.includes(",")) {
        setWeightInput((prev) => prev + ",");
      }
    } else {
      // Number button
      setWeightInput((prev) => prev + value);
    }
  };

  const handleConfirmWeight = () => {
    if (!weightInput || weightInput === "" || weightInput === ",") {
      toast.error("Please enter weight");
      return;
    }

    // Convert comma to dot for decimal
    const weight = parseFloat(weightInput.replace(",", "."));

    if (isNaN(weight) || weight <= 0) {
      toast.error("Please enter valid weight");
      return;
    }

    // Find cart item by productId (cart item.id !== product.id)
    const cartItem = items.find(
      (it) => it.productId === selectedWeightProduct.id
    );

    if (cartItem) {
      // Update the cart item using the cart item's id
      updateQuantity(cartItem.id, weight);
      toast.success(`Updated to ${weight} kg`);
    } else {
      // Add to cart with weight as quantity
      addItem(selectedWeightProduct, weight);
      toast.success(`Added ${weight} kg to cart`);
    }

    setShowWeightModal(false);
    setSelectedWeightProduct(null);
    setWeightInput("");
  };

  // Helper to ALWAYS ensure array is exactly 20 slots
  const ensureTwentySlots = (slots) => {
    if (!slots) return Array(20).fill(null);
    return Array.from({ length: 20 }, (_, i) =>
      slots[i] !== undefined ? slots[i] : null
    );
  };

  // Helper function to save custom tabs to Firebase
  const saveCustomTabsToFirebase = async (categories, categoryProducts) => {
    // Always save to localStorage immediately as backup
    localStorage.setItem("custom_categories", JSON.stringify(categories));
    localStorage.setItem(
      "custom_category_products",
      JSON.stringify(categoryProducts)
    );

    if (!userId) {
      return;
    }

    // If online, save to Firebase immediately
    if (!isOnline) {
      toast.warning("Offline - changes saved locally");
      return;
    }

    try {
      // Convert slots to minimal structure (type, id, and color) - ALWAYS 20 slots
      const slotIds = {};
      Object.keys(categoryProducts).forEach((category) => {
        const slots = ensureTwentySlots(categoryProducts[category]);
        slotIds[category] = slots.map((slot, index) => {
          if (!slot) return null;

          // Include color if this is a category slot and has a custom color
          const slotKey = `${category}-${index}-${slot.id}`;
          const color = categorySlotColors[slotKey];

          return {
            type: slot.type,
            id: slot.id,
            ...(color && { color }), // Only include color if it exists
          };
        });
      });

      // Save to Firebase immediately (no separate categorySlotColors needed!)
      await customTabsService.saveUserTabs(userId, {
        categories,
        categoryProducts: slotIds,
      });

      toast.success("Changes synced to cloud");
    } catch (error) {
      console.error("❌ Error saving to Firebase:", error);
      console.error("Error details:", error.message, error.stack);
      toast.error("Failed to sync to cloud, saved locally only");
    }
  };

  const handleAddCustomCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    const updatedCategories = [...customCategories, newCategoryName.trim()];
    setCustomCategories(updatedCategories);

    // Initialize with 20 empty slots for the new category
    const updatedCategoryProducts = {
      ...customCategoryProducts,
      [newCategoryName.trim()]: Array(20).fill(null),
    };
    setCustomCategoryProducts(updatedCategoryProducts);

    try {
      await saveCustomTabsToFirebase(
        updatedCategories,
        updatedCategoryProducts
      );
      toast.success(
        `Category "${newCategoryName.trim()}" added and synced to cloud`
      );
    } catch (error) {
      toast.error(`Category added but failed to sync to cloud`);
    }

    setSelectedCategory(newCategoryName.trim());
    setNewCategoryName("");
    setShowAddCategoryModal(false);
  };

  const handleDeleteCustomCategory = async (categoryName) => {
    const updatedCategories = customCategories.filter(
      (c) => c !== categoryName
    );
    setCustomCategories(updatedCategories);

    // Remove category products
    const updatedProducts = { ...customCategoryProducts };
    delete updatedProducts[categoryName];
    setCustomCategoryProducts(updatedProducts);

    // Delete from ALL users in Firebase (shared tabs)
    if (userId) {
      await customTabsService.deleteCategoryFromAllUsers(categoryName);
    } else {
      // Fallback to localStorage if not logged in
      localStorage.setItem(
        "custom_categories",
        JSON.stringify(updatedCategories)
      );
      localStorage.setItem(
        "custom_category_products",
        JSON.stringify(updatedProducts)
      );
    }

    if (selectedCategory === categoryName) {
      setSelectedCategory("all");
    }
    toast.success(`Category "${categoryName}" deleted for all users`);
  };

  // Custom category product slot handlers
  const slotLongPressTimer = useRef(null);
  const isLongPress = useRef(false);

  const handleSlotLongPressStart = (index, event) => {
    isLongPress.current = false;

    slotLongPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      const currentSlots = ensureTwentySlots(
        customCategoryProducts[selectedCategory]
      );
      const currentSlot = currentSlots[index];

      // Show product select modal for all slots
      setSelectedSlotIndex(index);
      setShowProductSelectModal(true);
      setProductSearchQuery("");

      // Set selection type based on current slot type, or default to product
      if (currentSlot && currentSlot.type === "category") {
        setSelectionType("category");
      } else {
        setSelectionType("product");
      }
    }, 500); // 500ms long press
  };

  const handleSlotLongPressEnd = () => {
    if (slotLongPressTimer.current) {
      clearTimeout(slotLongPressTimer.current);
      slotLongPressTimer.current = null;
    }
  };

  const handleItemSelect = async (item) => {
    if (
      selectedSlotIndex !== null &&
      customCategories.includes(selectedCategory)
    ) {
      // ALWAYS ensure array is exactly 20 slots
      const updatedSlots = ensureTwentySlots(
        customCategoryProducts[selectedCategory]
      );

      // Store as object with type and data
      if (selectionType === "product") {
        updatedSlots[selectedSlotIndex] = {
          type: "product",
          id: item.id,
          data: item,
        };
      } else {
        // item is category name, find the full category object
        const categoryObj = categoriesData.find((cat) => cat.name === item);
        updatedSlots[selectedSlotIndex] = {
          type: "category",
          id: categoryObj?.id || item,
          data: { name: item, categoryId: categoryObj?.id },
        };
      }

      const updatedCategories = {
        ...customCategoryProducts,
        [selectedCategory]: updatedSlots,
      };

      setCustomCategoryProducts(updatedCategories);
      await saveCustomTabsToFirebase(customCategories, updatedCategories);

      const itemName = selectionType === "product" ? item.name : item;
      toast.success(`${itemName} added to slot ${selectedSlotIndex + 1}`);

      setShowProductSelectModal(false);
      setSelectedSlotIndex(null);
    }
  };

  const handleRemoveFromSlot = async (index, e) => {
    e.stopPropagation();
    if (customCategories.includes(selectedCategory)) {
      // ALWAYS ensure array is exactly 20 slots
      const updatedSlots = ensureTwentySlots(
        customCategoryProducts[selectedCategory]
      );
      updatedSlots[index] = null;

      const updatedCategories = {
        ...customCategoryProducts,
        [selectedCategory]: updatedSlots,
      };

      setCustomCategoryProducts(updatedCategories);

      try {
        await saveCustomTabsToFirebase(customCategories, updatedCategories);
        toast.success("Product removed and synced");
      } catch (error) {
        toast.error("Product removed but failed to sync to cloud");
      }
    }
  };

  // Long press handlers for tab menu
  const handleTabLongPressStart = (category, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    longPressTimer.current = setTimeout(() => {
      setSelectedTabForMenu(category);
      setMenuPosition({
        x: rect.left,
        y: rect.top - 150, // Position menu above the tab
      });
      setShowTabMenu(true);
    }, 500); // 500ms long press
  };

  const handleTabLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleEnterDragMode = () => {
    setIsDragMode(true);
    setShowTabMenu(false);
    toast.success("Drag mode enabled - Reorder your tabs");
  };

  const handleExitDragMode = () => {
    setIsDragMode(false);
    toast.success("Drag mode disabled");
  };

  // Track active id when dragging starts
  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active?.id ?? null);
  };

  // Optimistically reorder while dragging to avoid snap-back
  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = customCategories.indexOf(active.id);
    const newIndex = customCategories.indexOf(over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(customCategories, oldIndex, newIndex);
    setCustomCategories(next);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    const oldIndex = customCategories.indexOf(active.id);
    const newIndex = customCategories.indexOf(over.id);
    if (oldIndex === -1 || newIndex === -1) {
      setActiveId(null);
      return;
    }

    const newOrder = arrayMove(customCategories, oldIndex, newIndex);
    setCustomCategories(newOrder);
    setActiveId(null);

    // Save immediately to Firebase (saveCustomTabsToFirebase already handles online check)
    saveCustomTabsToFirebase(newOrder, customCategoryProducts)
      .then(() => {
        toast.success("Tab order synced to cloud");
      })
      .catch((error) => {
        console.error("❌ Failed to save tab order:", error);
        toast.error("Failed to sync tab order");
      });
  };

  const handleEditCategory = () => {
    setEditCategoryName(selectedTabForMenu);
    setShowEditModal(true);
    setShowTabMenu(false);
  };

  const handleSaveEditCategory = async () => {
    if (!editCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    const oldName = selectedTabForMenu;
    const newName = editCategoryName.trim();

    if (oldName === newName) {
      setShowEditModal(false);
      return;
    }

    if (customCategories.includes(newName)) {
      toast.error("Category name already exists");
      return;
    }

    // Update category name in the list
    const updatedCategories = customCategories.map((cat) =>
      cat === oldName ? newName : cat
    );
    setCustomCategories(updatedCategories);

    // Update products mapping if exists
    let updatedProducts = customCategoryProducts;
    if (customCategoryProducts[oldName]) {
      updatedProducts = { ...customCategoryProducts };
      updatedProducts[newName] = updatedProducts[oldName];
      delete updatedProducts[oldName];
      setCustomCategoryProducts(updatedProducts);
    }

    await saveCustomTabsToFirebase(updatedCategories, updatedProducts);

    // Update selected category if it was the renamed one
    if (selectedCategory === oldName) {
      setSelectedCategory(newName);
    }

    setShowEditModal(false);
    setEditCategoryName("");
    toast.success(`Category renamed to "${newName}"`);
  };

  const handleDeleteCategoryFromMenu = async () => {
    const categoryToDelete = selectedTabForMenu;

    const updatedCategories = customCategories.filter(
      (c) => c !== categoryToDelete
    );
    setCustomCategories(updatedCategories);

    // Remove products for this category
    const updatedProducts = { ...customCategoryProducts };
    delete updatedProducts[categoryToDelete];
    setCustomCategoryProducts(updatedProducts);

    // Delete from ALL users in Firebase (shared tabs)
    if (userId) {
      await customTabsService.deleteCategoryFromAllUsers(categoryToDelete);
    } else {
      // Fallback to localStorage if not logged in
      localStorage.setItem(
        "custom_categories",
        JSON.stringify(updatedCategories)
      );
      localStorage.setItem(
        "custom_category_products",
        JSON.stringify(updatedProducts)
      );
    }

    if (selectedCategory === categoryToDelete) {
      setSelectedCategory("all");
    }

    setShowTabMenu(false);
    toast.success(`Category "${categoryToDelete}" deleted for all users`);
  };

  // Handle category SLOT color change (for boxes in grid)
  const saveCategorySlotColor = async (slotKey, color) => {
    const updatedColors = {
      ...categorySlotColors,
      [slotKey]: color,
    };
    setCategorySlotColors(updatedColors);

    // Save to localStorage immediately
    localStorage.setItem("category_slot_colors", JSON.stringify(updatedColors));

    // Save to Firebase with updated colors
    if (!userId) {
      setShowSlotColorPicker(false);
      setSelectedSlotForColor(null);
      return;
    }

    if (!isOnline) {
      toast.warning("Offline - color saved locally");
      setShowSlotColorPicker(false);
      setSelectedSlotForColor(null);
      return;
    }

    try {
      // Convert slots to minimal structure (type, id, and color) - ALWAYS 20 slots
      const slotIds = {};
      Object.keys(customCategoryProducts).forEach((category) => {
        const slots = ensureTwentySlots(customCategoryProducts[category]);
        slotIds[category] = slots.map((slot, index) => {
          if (!slot) return null;

          // Include color if this slot has a custom color (use updatedColors!)
          const slotKey = `${category}-${index}-${slot.id}`;
          const color = updatedColors[slotKey];

          return {
            type: slot.type,
            id: slot.id,
            ...(color && { color }), // Only include color if it exists
          };
        });
      });

      // Save to Firebase with colors INSIDE slots
      await customTabsService.saveUserTabs(userId, {
        categories: customCategories,
        categoryProducts: slotIds,
      });

      toast.success("Color synced to cloud");
    } catch (error) {
      console.error("❌ Error saving color to Firebase:", error);
      console.error("Error details:", error.message, error.stack);
      toast.error("Failed to sync color, saved locally only");
    }

    setShowSlotColorPicker(false);
    setSelectedSlotForColor(null);
  };

  // Load available discounts
  const loadDiscounts = async () => {
    try {
      const discounts = await discountsService.getAll();
      setAvailableDiscounts(discounts);
    } catch (error) {
      console.error("Error loading discounts:", error);
      toast.error("Failed to load discounts");
    }
  };

  // Handle discount button click
  const handleShowDiscounts = () => {
    loadDiscounts();
    setShowDiscountModal(true);
  };

  // Handle discount selection
  const handleApplyDiscount = (discount) => {
    const subtotal = getSubtotal();

    // Check if discount is applicable
    const isApplicable = discountsService.isApplicable(discount, subtotal);

    if (!isApplicable.valid) {
      toast.error(isApplicable.reason);
      return;
    }

    // Add discount to cart (supports multiple)
    addDiscount({
      id: discount.id,
      name: discount.name,
      type: discount.type,
      value: discount.value,
      isCustom: false,
    });

    toast.success(
      `Discount "${discount.name}" applied! (${
        cartDiscounts.length + 1
      } total discounts)`
    );
  };

  // Handle custom discount
  const handleApplyCustomDiscount = () => {
    // Validate inputs
    if (!customDiscountTitle.trim()) {
      toast.error("Please enter a discount title");
      return;
    }

    const value = parseFloat(customDiscountValue);
    if (isNaN(value) || value <= 0) {
      toast.error("Please enter a valid discount value");
      return;
    }

    if (customDiscountType === "percentage" && value > 100) {
      toast.error("Percentage discount cannot exceed 100%");
      return;
    }

    const subtotal = getSubtotal();
    if (customDiscountType === "amount" && value > subtotal) {
      toast.error("Discount amount cannot exceed subtotal");
      return;
    }

    // Add custom discount to cart
    addDiscount({
      name: customDiscountTitle,
      type: customDiscountType,
      value: value,
      isCustom: true,
    });

    // Reset form
    setCustomDiscountTitle("");
    setCustomDiscountValue("");
    setCustomDiscountType("percentage");
    setShowCustomDiscountForm(false);

    toast.success(
      `Custom discount "${customDiscountTitle}" applied! (${
        cartDiscounts.length + 1
      } total discounts)`
    );
  };

  // Remove a specific discount
  const handleRemoveDiscount = (discountId) => {
    removeDiscount(discountId);
    toast.success("Discount removed");
  };

  // Remove all discounts
  const handleRemoveAllDiscounts = () => {
    clearDiscounts();
    setSelectedDiscount(null);
    toast.success("All discounts removed");
  };

  const handleSaveTicket = () => {
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    // Open customer selection modal
    setShowCustomerModal(true);
  };

  const handleConfirmSaveTicket = async (customer) => {
    const cartData = getCartData();
    const ticketId = createTicket(cartData, user.id);

    // Save to IndexedDB with customer info
    await dbService.createTicket(
      {
        ticketNumber: `T${Date.now()}`,
        userId: user.id,
        customerId: customer?.id || null,
        customerName: customer?.name || null,
        status: "parked",
        total: cartData.total,
      },
      items
    );

    clearCart();
    setShowCustomerModal(false);
    toast.success(
      customer
        ? `Ticket saved for ${customer.name}`
        : "Ticket saved successfully"
    );
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    // Check if cashier has an active shift
    const savedShift = localStorage.getItem("active_shift");
    if (!savedShift) {
      toast.error(
        "No active shift! Please start a shift to make transactions."
      );
      return;
    }

    try {
      const activeShift = JSON.parse(savedShift);
      if (!activeShift || activeShift.status !== "active") {
        toast.error(
          "No active shift! Please start a shift to make transactions."
        );
        return;
      }
    } catch (error) {
      console.error("Error parsing active shift:", error);
      toast.error(
        "No active shift! Please start a shift to make transactions."
      );
      return;
    }

    // Check if customer is expired
    if (cartCustomer && cartCustomer.expiryDate) {
      if (customerApprovalService.isCustomerExpired(cartCustomer.expiryDate)) {
        toast.error(
          `Customer "${cartCustomer.name}" membership has expired! Please extend the expiry date before checkout.`,
          { duration: 5000 }
        );
        return;
      }

      // Warn if expiring soon
      if (customerApprovalService.isExpiringSoon(cartCustomer.expiryDate)) {
        const expiryStatus = customerApprovalService.getExpiryStatus(
          cartCustomer.expiryDate
        );
        toast.warning(
          `Customer "${
            cartCustomer.name
          }" ${expiryStatus.message.toLowerCase()}`,
          { duration: 4000 }
        );
      }
    }

    // Open payment modal
    setShowPaymentModal(true);
    setPaymentMethod("cash");
    setCashReceived("");
  };

  const handleCompletePayment = async () => {
    if (paymentMethod === "cash" && !cashReceived) {
      toast.error("Please enter cash received");
      return;
    }

    const total = getTotal();
    const cashAmount = parseFloat(cashReceived) || 0;

    if (paymentMethod === "cash" && cashAmount < total) {
      toast.error("Insufficient cash received");
      return;
    }

    try {
      setIsProcessing(true);
      const cartData = getCartData();
      const { receiptsService } = await import("@/lib/firebase/firestore");
      const { generateOrderNumber } = await import("@/lib/utils/format");

      const orderNumber = generateOrderNumber();
      const now = new Date();
      const isOnlineNow = navigator.onLine;

      // Map payment method to payment type
      const paymentTypeMap = {
        cash: { id: "cash", name: "Cash", type: "CASH" },
        card: { id: "card", name: "Card", type: "CARD" },
        crypto: { id: "crypto", name: "Crypto", type: "CUSTOM" },
        transfer: { id: "transfer", name: "Transfer", type: "CUSTOM" },
      };

      const selectedPaymentType =
        paymentTypeMap[paymentMethod] || paymentTypeMap.cash;

      // Create receipt data for Firebase
      const receiptData = {
        // Local identifiers
        orderNumber: orderNumber,
        deviceId:
          typeof window !== "undefined"
            ? localStorage.getItem("device_id") || "unknown"
            : "unknown",
        fromThisDevice: true,

        // Receipt info
        receipt_number: orderNumber,
        receipt_type: "SALE",
        order: orderNumber,
        source: "POS System",

        // Dates
        created_at: now.toISOString(),
        receipt_date: now.toISOString(),
        updated_at: now.toISOString(),

        // Money amounts
        total_money: cartData.total,
        total_tax: 0,
        total_discount: cartData.discountAmount,
        discounts: cartData.discounts || [], // Store multiple discounts
        subtotal: cartData.subtotal,
        tip: 0,
        surcharge: 0,

        // Points (if customer has loyalty program)
        points_earned: cartCustomer ? Math.floor(total) : 0,
        points_deducted: 0,
        points_balance: cartCustomer
          ? (cartCustomer.points || 0) + Math.floor(total)
          : 0,

        // Additional info
        cashierId: cashier?.id || null,
        cashierName: cashier?.name || "Unknown Cashier",
        userId: cashier?.id || null,
        customerId: cartCustomer?.id || null,
        customerName: cartCustomer?.name || null,

        // Status
        status: "completed",
        cancelled_at: null,

        // Line items
        line_items: items.map((item) => ({
          id: item.id || null,
          item_id: item.itemId || item.productId,
          variant_id: item.variantId || item.productId,
          item_name: item.name,
          variant_name: item.variant || null,
          sku: item.sku || null,
          quantity: item.quantity,
          price: item.price,
          gross_total_money: item.total,
          total_money: item.total,
          cost: item.cost || 0,
          cost_total: (item.cost || 0) * item.quantity,
          line_note: null,
          line_taxes: [],
          line_discounts: [],
          line_modifiers: [],
          total_discount: 0,
        })),

        // Payment info
        paymentMethod: paymentMethod,
        paymentTypeName: selectedPaymentType.name,
        cashReceived: paymentMethod === "cash" ? cashAmount : total,
        change: paymentMethod === "cash" ? cashAmount - total : 0,

        payments: [
          {
            payment_type_id: selectedPaymentType.id,
            name: selectedPaymentType.name,
            type: selectedPaymentType.type,
            money_amount: total,
            paid_at: now.toISOString(),
            payment_details: null,
          },
        ],

        // Add sync status
        syncStatus: isOnlineNow ? "synced" : "pending",
        syncedAt: isOnlineNow ? now.toISOString() : null,
      };

      // Try to save to Firebase if online
      let firebaseSaved = false;
      if (isOnlineNow) {
        try {
          await receiptsService.create(receiptData);
          firebaseSaved = true;
          receiptData.syncStatus = "synced";
          receiptData.syncedAt = now.toISOString();
        } catch (error) {
          console.error("❌ Failed to save to Firebase:", error);
          // Mark as pending for sync later
          receiptData.syncStatus = "pending";
          receiptData.syncedAt = null;
          toast.warning("Saved locally - will sync when online");
        }
      } else {
        toast.info("Offline mode - Transaction will sync when online");
      }

      // Update stock levels and log history for items that track stock
      try {
        const { stockHistoryService } = await import(
          "@/lib/firebase/stockHistoryService"
        );

        for (const item of items) {
          // Fetch full product details to check if it tracks stock
          const product = await productsService.get(item.productId);

          if (!product) {
            console.warn("⚠️ Product not found:", item.productId);
            continue;
          }

          if (!product.trackStock) {
            continue;
          }

          // Check both stock and inStock fields (for compatibility)
          const currentStock = product.stock ?? product.inStock ?? 0;

          // Warn if stock is 0 or would go negative
          if (currentStock === 0) {
            console.warn("⚠️ WARNING: Selling from 0 stock!", {
              product: product.name,
              sellQuantity: item.quantity,
            });
          }

          if (currentStock < item.quantity) {
            console.warn("⚠️ WARNING: Selling more than available stock!", {
              product: product.name,
              currentStock,
              sellQuantity: item.quantity,
              shortage: item.quantity - currentStock,
            });
          }
          const newStock = Math.max(0, currentStock - item.quantity);

          // Update product stock
          await productsService.update(product.id, {
            stock: newStock,
          });

          // Log stock history
          await stockHistoryService.logStockMovement({
            productId: product.id,
            productName: product.name,
            sku: product.sku || null,
            type: "sale",
            quantity: -item.quantity, // Negative for sale
            previousStock: currentStock,
            newStock: newStock,
            referenceId: orderNumber,
            referenceType: "receipt",
            userId: cashier?.id || null,
            userName: cashier?.name || "Unknown",
            notes: `Sale: ${item.quantity}x ${product.name}`,
          });
        }
      } catch (error) {
        console.error("❌ Error updating stock:", error);
        console.error("Error details:", error.message, error.stack);
        // Don't fail the checkout if stock update fails
        toast.warning("Sale completed but stock update failed");
      }

      // Update customer stats if customer is selected
      if (cartCustomer) {
        try {
          await customersService.update(cartCustomer.id, {
            visits: (cartCustomer.visits || 0) + 1,
            lastVisit: new Date(),
            points: (cartCustomer.points || 0) + Math.floor(total), // Add 1 point per dollar
          });
        } catch (error) {
          console.error("Error updating customer stats:", error);
        }
      }

      // Also save to IndexedDB for local cache
      try {
        await db.transaction(
          "rw",
          db.orders,
          db.orderItems,
          db.syncQueue,
          async () => {
            const localOrderId = await db.orders.add({
              orderNumber: orderNumber,
              status: "completed",
              total: total,
              subtotal: cartData.subtotal,
              discount: cartData.discountAmount,
              tax: 0,
              userId: cashier?.id || null,
              cashierId: cashier?.id || null,
              cashierName: cashier?.name || "Unknown Cashier",
              customerId: cartCustomer?.id || null,
              customerName: cartCustomer?.name || null,
              paymentMethod,
              cashReceived: paymentMethod === "cash" ? cashAmount : total,
              change: paymentMethod === "cash" ? cashAmount - total : 0,
              createdAt: now.toISOString(),
              syncStatus: receiptData.syncStatus,
              syncedAt: receiptData.syncedAt,
            });

            const orderItemsWithOrderId = items.map((item) => ({
              ...item,
              orderId: localOrderId,
            }));

            await db.orderItems.bulkAdd(orderItemsWithOrderId);

            // Add to sync queue if not synced to Firebase
            if (!firebaseSaved) {
              await db.syncQueue.add({
                type: "receipt",
                action: "create",
                data: receiptData,
                timestamp: now.toISOString(),
                status: "pending",
                attempts: 0,
                orderId: localOrderId,
              });
            }
          }
        );

        // Trigger sync check to update UI badge
        checkUnsyncedOrders();
      } catch (error) {
        console.error("Error saving to IndexedDB:", error);
        // Don't fail the checkout if IndexedDB fails
      }

      // Update shift if cashier has an active shift and payment is cash
      if (cashier && paymentMethod === "cash") {
        try {
          const savedShift = localStorage.getItem("active_shift");
          if (savedShift) {
            const activeShift = JSON.parse(savedShift);
            if (activeShift && activeShift.status === "active") {
              // Add transaction to shift (works both online and offline)
              if (isOnlineNow) {
                try {
                  await shiftsService.addTransaction(activeShift.id, {
                    id: receiptData.orderNumber,
                    total: total,
                    paymentMethod: paymentMethod,
                    createdAt: now.toISOString(),
                  });

                  // Refresh shift data
                  const updatedShift = await shiftsService.getById(
                    activeShift.id
                  );
                  localStorage.setItem(
                    "active_shift",
                    JSON.stringify(updatedShift)
                  );
                } catch (error) {
                  console.error("Error updating shift online:", error);
                  // Update locally if online update fails
                  activeShift.transactions = activeShift.transactions || [];
                  activeShift.transactions.push({
                    id: receiptData.orderNumber,
                    total: total,
                    paymentMethod: paymentMethod,
                    createdAt: now.toISOString(),
                  });
                  localStorage.setItem(
                    "active_shift",
                    JSON.stringify(activeShift)
                  );
                }
              } else {
                // Offline mode - update shift locally
                activeShift.transactions = activeShift.transactions || [];
                activeShift.transactions.push({
                  id: receiptData.orderNumber,
                  total: total,
                  paymentMethod: paymentMethod,
                  createdAt: now.toISOString(),
                });
                localStorage.setItem(
                  "active_shift",
                  JSON.stringify(activeShift)
                );
              }

              // Notify layout to reload shift data
              window.dispatchEvent(new Event("cashier-update"));
            }
          }
        } catch (error) {
          console.error("Error updating shift:", error);
          // Don't fail checkout if shift update fails
        }
      }

      // Store completed order and show receipt modal
      setCompletedOrder(receiptData);
      setShowPaymentModal(false);
      setShowReceiptModal(true);

      // Process payment via API and clear cart
      await processPayment({
        amount: total,
        method: paymentMethod,
        transactionId: orderNumber,
      });
      setCashReceived("");
      setPaymentMethod("cash");

      // Update kiosk order status if this was from kiosk
      if (cartData.kioskOrderId) {
        try {
          const { doc, updateDoc, serverTimestamp } = await import(
            "firebase/firestore"
          );
          const { db } = await import("@/lib/firebase");

          const kioskOrderRef = doc(db, "kioskOrders", cartData.kioskOrderId);
          await updateDoc(kioskOrderRef, {
            status: "completed",
            completedAt: serverTimestamp(),
            finalReceiptNumber: orderNumber,
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          console.error("Error updating kiosk order:", error);
          // Don't fail checkout if kiosk order update fails
        }
      }

      toast.success("Payment completed successfully!");

      // Clear cart immediately after successful payment
      clearCart();
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to complete order");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (!completedOrder) return;

    try {
      // Send receipt data to print API for Android printing
      const response = await fetch("/api/print", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            order: completedOrder,
            cashier: cashier?.name || completedOrder.cashierName || "Staff",
            timestamp: new Date().toISOString(),
            type: "receipt",
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Receipt sent to printer");
        // Start new transaction after sending to printer
        handleNewTransaction();
      } else {
        toast.error("Failed to send receipt to printer");
        console.error("Print API error:", result.error);
      }
    } catch (error) {
      console.error("Error sending receipt to printer:", error);
      toast.error("Failed to send receipt to printer");
    }
  };

  const handleNewTransaction = () => {
    setShowReceiptModal(false);
    setCompletedOrder(null);
    // Cart is already cleared after successful checkout
    // Just ensure everything is reset
    clearCart();
    setCashReceived("");
    setPaymentMethod("cash");
    toast.success("Ready for new transaction");
  };

  const calculateChange = () => {
    const total = getTotal();
    const cashAmount = parseFloat(cashReceived) || 0;
    return Math.max(0, cashAmount - total);
  };

  // Handle quick cash button click - set amount and auto-complete payment
  const handleQuickCash = (amount) => {
    // Set the cash received amount
    setCashReceived(amount.toString());

    // Auto-complete payment after state update
    // Use setTimeout to ensure state is updated
    setTimeout(() => {
      const completeButton = document.querySelector(
        '[data-quick-complete="true"]'
      );
      if (completeButton && !completeButton.disabled) {
        completeButton.click();
      }
    }, 50);
  };

  // Generate smart quick cash amounts based on total
  const getQuickCashAmounts = () => {
    const total = getTotal();

    // Standard denominations
    const denominations = [20, 50, 100, 200, 500, 1000, 2000, 5000];

    // Find the nearest higher denomination
    const amounts = [];

    // Add exact amount as first option
    amounts.push(Math.ceil(total));

    // Add next 3 denominations that are >= total
    let added = 0;
    for (const denom of denominations) {
      if (denom >= total && added < 3) {
        if (!amounts.includes(denom)) {
          amounts.push(denom);
          added++;
        }
      }
    }

    // If we don't have 4 amounts yet, add higher denominations
    while (amounts.length < 4) {
      const lastAmount = amounts[amounts.length - 1];
      let nextAmount = lastAmount;

      // Find next denomination
      for (const denom of denominations) {
        if (denom > lastAmount) {
          nextAmount = denom;
          break;
        }
      }

      // If no denomination found, just add multiples
      if (nextAmount === lastAmount) {
        if (lastAmount < 100) {
          nextAmount = lastAmount + 50;
        } else if (lastAmount < 1000) {
          nextAmount = lastAmount + 100;
        } else {
          nextAmount = lastAmount + 500;
        }
      }

      amounts.push(nextAmount);
    }

    return amounts.slice(0, 4);
  };

  const quickCashAmounts = getQuickCashAmounts();

  // Generate thermal receipt HTML (58mm width)
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Sync Status Bar */}
      {(!isOnline || unsyncedOrders > 0) && (
        <div
          className={`px-4 py-2 flex items-center justify-between ${
            !isOnline
              ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
              : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {!isOnline ? (
              <>
                <WifiOff className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Offline Mode - Transactions will sync when online
                </span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">
                  {unsyncedOrders} transaction{unsyncedOrders !== 1 ? "s" : ""}{" "}
                  pending sync
                </span>
              </>
            )}
          </div>
          {unsyncedOrders > 0 && isOnline && (
            <Badge variant="secondary" className="bg-blue-200 text-blue-800">
              Syncing...
            </Badge>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0 main-content-debug bg-white dark:bg-gray-950">
        {/* Products Section */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 products-section-debug bg-white dark:bg-gray-950">
          {/* Back Button - Show when viewing category */}
          {viewingCategoryId && (
            <div className="flex items-center gap-4 p-4 pb-2 flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setViewingCategoryId(null);
                  setViewingCategoryName(null);
                  if (previousCustomCategory) {
                    setSelectedCategory(previousCustomCategory);
                    setPreviousCustomCategory(null);
                  }
                }}
                className="flex items-center gap-2 select-none"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to {previousCustomCategory || "Custom Page"}
              </Button>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {viewingCategoryName}
              </h2>
            </div>
          )}

          {/* Search Bar - Only show for non-custom categories and not viewing category */}
          {!customCategories.includes(selectedCategory) &&
            !viewingCategoryId && (
              <div className="flex items-center space-x-2 p-4 pb-0 flex-shrink-0">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Search products by name, barcode, or SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10 h-12 text-lg"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      type="button"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            )}

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pt-4 min-h-0 products-grid-debug">
            {viewingCategoryId ? (
              /* Category Products View - Regular Grid of Products from Category */
              <div className="grid gap-4 grid-cols-5 auto-rows-fr">
                {products
                  .filter((product) => {
                    // Smart category matching: match by ID first, then by name
                    if (product.categoryId === viewingCategoryId) return true;

                    // Also match by name if categoryId doesn't match
                    const productCategory = getProductCategory(product);
                    return productCategory === viewingCategoryName;
                  })
                  .map((product) => {
                    const availableForSale =
                      product.available_for_sale !== false;
                    const hasVariants =
                      product.variants && product.variants.length > 0;
                    const isOutOfStock = hasVariants
                      ? product.variants.every(
                          (v) =>
                            !v.sku ||
                            (v.stock_quantity !== undefined &&
                              v.stock_quantity === 0)
                        )
                      : product.stock_quantity !== undefined &&
                        product.stock_quantity === 0;
                    const canSell = availableForSale && !isOutOfStock;
                    const imageUrl = getProductImage(product);
                    const productColor = getProductColor(product);
                    const colorClass = getColorClasses(productColor);

                    const handleCardClick = () => {
                      if (!canSell) return;
                      handleAddToCart(product);
                    };

                    return (
                      <Card
                        key={product.id || product.sku}
                        className={cn(
                          "p-0 group overflow-hidden border bg-white dark:bg-gray-900 transition-all cursor-pointer hover:border-primary/50 hover:shadow-md select-none touch-manipulation",
                          !canSell && "cursor-not-allowed opacity-70"
                        )}
                        style={{
                          WebkitTouchCallout: "none",
                          WebkitUserSelect: "none",
                        }}
                        onClick={handleCardClick}
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        {/* 1:1 Ratio Container */}
                        <div className="relative w-full pt-[100%] overflow-hidden">
                          {/* Content positioned absolutely to maintain 1:1 ratio */}
                          <div className="absolute inset-0">
                            {imageUrl ? (
                              <>
                                {/* Image fills entire 1:1 container */}
                                <img
                                  src={imageUrl}
                                  alt={product.name || "Product image"}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  loading="lazy"
                                  onContextMenu={(e) => e.preventDefault()}
                                  draggable="false"
                                  style={{
                                    WebkitTouchCallout: "none",
                                    WebkitUserSelect: "none",
                                  }}
                                />
                                {/* Title overlay at bottom with source badge */}
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1.5">
                                  <div className="flex items-center justify-between gap-1">
                                    <h3 className="text-xs font-semibold text-white flex-1 line-clamp-2">
                                      {product.name}
                                    </h3>
                                    {product.source && (
                                      <Badge
                                        variant="secondary"
                                        className={cn(
                                          "text-[10px] px-1 py-0 h-4 flex-shrink-0",
                                          product.source === "kiosk" &&
                                            "bg-green-500 text-white border-0",
                                          product.source === "local" &&
                                            "bg-purple-500 text-white border-0",
                                          product.source === "loyverse" &&
                                            "bg-gray-500 text-white border-0"
                                        )}
                                      >
                                        {product.source === "kiosk"
                                          ? "K"
                                          : product.source === "local"
                                          ? "L"
                                          : "LV"}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </>
                            ) : colorClass ? (
                              /* Color background with centered title */
                              <div
                                className={cn(
                                  "w-full h-full flex items-center justify-center",
                                  colorClass
                                )}
                              >
                                <h3 className="text-lg font-bold text-white text-center px-4 line-clamp-3">
                                  {product.name}
                                </h3>
                              </div>
                            ) : (
                              /* Fallback: gradient with initial */
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400">
                                <div className="text-center">
                                  <div className="text-4xl font-semibold text-white mb-2">
                                    {product.name?.charAt(0).toUpperCase() ||
                                      "?"}
                                  </div>
                                  <h3 className="text-sm font-semibold text-white px-4 line-clamp-2">
                                    {product.name}
                                  </h3>
                                </div>
                              </div>
                            )}

                            {/* Out of stock overlay */}
                            {(!availableForSale || isOutOfStock) && (
                              <>
                                <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="rounded bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                                    {!availableForSale
                                      ? "Unavailable"
                                      : "Out of Stock"}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
              </div>
            ) : customCategories.includes(selectedCategory) ? (
              /* Custom Category - 5x4 Grid of Product Slots */
              <div className="grid gap-4 grid-cols-5 grid-rows-4">
                {ensureTwentySlots(
                  customCategoryProducts[selectedCategory]
                ).map((slot, index) => (
                  <Card
                    key={index}
                    className="p-0 group overflow-hidden border bg-white dark:bg-gray-900 transition-all cursor-pointer hover:border-primary/50 hover:shadow-md select-none touch-manipulation"
                    style={{
                      WebkitTouchCallout: "none",
                      WebkitUserSelect: "none",
                    }}
                    onClick={
                      slot
                        ? () => {
                            // Skip click action if it was a long press
                            if (isLongPress.current) {
                              isLongPress.current = false;
                              return;
                            }

                            if (slot.type === "product") {
                              handleAddToCart(slot.data);
                            } else if (slot.type === "category") {
                              // Navigate to category view
                              setPreviousCustomCategory(selectedCategory);
                              setViewingCategoryId(slot.data.categoryId);
                              setViewingCategoryName(slot.data.name);
                            }
                          }
                        : undefined
                    }
                    onMouseDown={(e) => handleSlotLongPressStart(index, e)}
                    onMouseUp={handleSlotLongPressEnd}
                    onMouseLeave={handleSlotLongPressEnd}
                    onTouchStart={(e) => handleSlotLongPressStart(index, e)}
                    onTouchEnd={handleSlotLongPressEnd}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <div className="relative w-full pt-[100%] overflow-hidden">
                      <div className="absolute inset-0">
                        {slot ? (
                          <>
                            {slot.type === "category" ? (
                              /* Category Slot */
                              (() => {
                                // NEW SIMPLE WAY: Read color directly from slot data!
                                const customColor = slot.color;

                                // Generate gradient colors from custom color or use default blue
                                const baseColor = customColor || "#3b82f6";

                                return (
                                  <div
                                    className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br relative"
                                    style={{
                                      backgroundImage: customColor
                                        ? `linear-gradient(to bottom right, ${customColor}, ${customColor}dd, ${customColor}bb)`
                                        : "linear-gradient(to bottom right, rgb(59, 130, 246), rgb(37, 99, 235), rgb(29, 78, 216))",
                                    }}
                                  >
                                    <h3 className="text-lg font-bold text-white text-center px-2">
                                      {slot.data.name}
                                    </h3>
                                    <div className="absolute top-2 right-2 bg-white/20 px-2 py-0.5 rounded text-xs text-white">
                                      Category
                                    </div>
                                  </div>
                                );
                              })()
                            ) : slot.type === "product" && slot.data ? (
                              /* Product Slot */
                              <>
                                {(() => {
                                  const product = slot.data;
                                  const imageUrl = getProductImage(product);
                                  const productColor = getProductColor(product);
                                  const colorClass =
                                    getColorClasses(productColor);

                                  return imageUrl ? (
                                    <>
                                      <img
                                        src={imageUrl}
                                        alt={product.name || "Product image"}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        loading="lazy"
                                        onContextMenu={(e) =>
                                          e.preventDefault()
                                        }
                                        draggable="false"
                                        style={{
                                          WebkitTouchCallout: "none",
                                          WebkitUserSelect: "none",
                                        }}
                                      />
                                      <div className="absolute bottom-0 left-0 right-0 bg-black/80 px-2 py-1.5">
                                        <h3 className="text-xs font-semibold text-white text-center line-clamp-2">
                                          {product.name}
                                        </h3>
                                      </div>
                                    </>
                                  ) : colorClass ? (
                                    <div
                                      className={cn(
                                        "w-full h-full flex items-center justify-center",
                                        colorClass
                                      )}
                                    >
                                      <h3 className="text-lg font-bold text-white text-center px-4 line-clamp-3">
                                        {product.name}
                                      </h3>
                                    </div>
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400">
                                      <div className="text-center">
                                        <div className="text-4xl font-semibold text-white mb-2">
                                          {product.name
                                            ?.charAt(0)
                                            .toUpperCase() || "?"}
                                        </div>
                                        <h3 className="text-sm font-semibold text-white px-4 line-clamp-2">
                                          {product.name}
                                        </h3>
                                      </div>
                                    </div>
                                  );
                                })()}
                                {/* Remove button on hover */}
                                <button
                                  onClick={(e) =>
                                    handleRemoveFromSlot(index, e)
                                  }
                                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-red-500 hover:bg-red-600 rounded"
                                  title="Remove from slot"
                                >
                                  <X className="h-4 w-4 text-white" />
                                </button>
                              </>
                            ) : null}
                          </>
                        ) : (
                          /* Empty slot with + icon */
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-700 dark:hover:bg-gray-700 transition-colors">
                            <Plus className="h-12 w-12 text-gray-500 dark:text-gray-500" />
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center min-h-full">
                <p className="text-gray-500">Loading products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex items-center justify-center min-h-full">
                <p className="text-gray-500">No products found</p>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-5">
                {filteredProducts.map((product) => {
                  const trackStock = parseBoolean(product.trackStock, true);
                  const availableForSale = isProductAvailable(product);
                  const stock = getProductStock(product);
                  const isOutOfStock = trackStock && stock <= 0;
                  const canSell = availableForSale && !isOutOfStock;
                  const imageUrl = getProductImage(product);
                  const productColor = getProductColor(product);
                  const colorClass = getColorClasses(productColor);

                  const handleCardClick = () => {
                    if (!canSell) return;
                    handleAddToCart(product);
                  };

                  return (
                    <Card
                      key={product.id || product.sku}
                      className={cn(
                        "p-0 group overflow-hidden border bg-white dark:bg-gray-900 transition-all cursor-pointer hover:border-primary/50 hover:shadow-md select-none touch-manipulation",
                        !canSell && "cursor-not-allowed opacity-70"
                      )}
                      style={{
                        WebkitTouchCallout: "none",
                        WebkitUserSelect: "none",
                      }}
                      onClick={handleCardClick}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      {/* 1:1 Ratio Container */}
                      <div className="relative w-full pt-[100%] overflow-hidden">
                        {/* Content positioned absolutely to maintain 1:1 ratio */}
                        <div className="absolute inset-0">
                          {imageUrl ? (
                            <>
                              {/* Image fills entire 1:1 container */}
                              <img
                                src={imageUrl}
                                alt={product.name || "Product image"}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy"
                                onContextMenu={(e) => e.preventDefault()}
                                draggable="false"
                                style={{
                                  WebkitTouchCallout: "none",
                                  WebkitUserSelect: "none",
                                }}
                              />
                              {/* Title overlay at bottom */}
                              <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1.5">
                                <h3 className="text-xs font-semibold text-white text-center line-clamp-2">
                                  {product.name}
                                </h3>
                              </div>
                            </>
                          ) : colorClass ? (
                            /* Color background with centered title */
                            <div
                              className={cn(
                                "w-full h-full flex items-center justify-center",
                                colorClass
                              )}
                            >
                              <h3 className="text-lg font-bold text-white text-center px-4 line-clamp-3">
                                {product.name}
                              </h3>
                            </div>
                          ) : (
                            /* Fallback: gradient with initial */
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400">
                              <div className="text-center">
                                <div className="text-4xl font-semibold text-white mb-2">
                                  {product.name?.charAt(0).toUpperCase() || "?"}
                                </div>
                                <h3 className="text-sm font-semibold text-white px-4 line-clamp-2">
                                  {product.name}
                                </h3>
                              </div>
                            </div>
                          )}

                          {/* Out of stock overlay */}
                          {(!availableForSale || isOutOfStock) && (
                            <>
                              <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="rounded bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                                  {!availableForSale
                                    ? "Not for sale"
                                    : "Out of stock"}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Excel-Style Category Tabs (Bottom) */}
          <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-t border-gray-300 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center overflow-x-auto scrollbar-hide flex-1">
                {/* All Tab */}
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={cn(
                    "px-8 py-4 text-xl font-medium border-r border-gray-300 dark:border-gray-700 whitespace-nowrap transition-colors",
                    selectedCategory === "all"
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-t-2 border-t-green-600"
                      : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-800 dark:hover:bg-gray-800"
                  )}
                >
                  All
                </button>

                {/* Custom Categories with Drag & Drop */}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={customCategories}
                    strategy={horizontalListSortingStrategy}
                  >
                    {customCategories.map((category) => (
                      <SortableTab
                        key={category}
                        id={category}
                        category={category}
                        isSelected={selectedCategory === category}
                        onClick={() => setSelectedCategory(category)}
                        onLongPressStart={(e) =>
                          handleTabLongPressStart(category, e)
                        }
                        onLongPressEnd={handleTabLongPressEnd}
                        isDragMode={isDragMode}
                      />
                    ))}
                  </SortableContext>
                  <DragOverlay>
                    {activeId ? (
                      <button className="px-8 py-4 text-xl font-medium border-r border-gray-300 dark:border-gray-700 whitespace-nowrap bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-t-2 border-t-green-600 shadow-lg">
                        {activeId}
                      </button>
                    ) : null}
                  </DragOverlay>
                </DndContext>

                {/* Add Button */}
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(true)}
                  className="px-6 py-4 text-xl font-medium border-r border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-800 dark:hover:bg-gray-800 transition-colors flex items-center gap-1 select-none"
                  title="Add new category"
                >
                  <Plus className="h-6 w-6" />
                </button>
              </div>

              {/* Done Button for Drag Mode */}
              {isDragMode && (
                <button
                  type="button"
                  onClick={handleExitDragMode}
                  className="px-6 py-4 text-xl font-medium bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-2 border-l border-gray-300 select-none"
                >
                  <CheckCircle className="h-5 w-5" />
                  Done
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Cart Section */}
        <div className="w-96 bg-white dark:bg-gray-900 border-l border-gray-300 dark:border-gray-700 flex flex-col min-h-0 cart-section-debug">
          {/* Cart Header */}
          <div className="p-4 border-b border-gray-300 dark:border-gray-700 space-y-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Cart
                </h2>
              </div>
              <Badge
                variant="secondary"
                className="text-lg px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                {getItemCount()} items
              </Badge>
            </div>

            {/* Customer Selection */}
            <div className="flex items-center gap-2">
              {cartCustomer ? (
                <div className="flex-1 flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                          {cartCustomer.name}
                        </p>
                        {cartCustomer.source && (
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              cartCustomer.source === "kiosk" &&
                                "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
                              cartCustomer.source === "local" &&
                                "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100"
                            )}
                          >
                            {cartCustomer.source}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {cartCustomer.customerId ? (
                          <p className="text-xs font-mono text-primary">
                            {cartCustomer.customerId}
                          </p>
                        ) : cartCustomer.customerCode ? (
                          <p className="text-xs text-neutral-500">
                            {cartCustomer.customerCode}
                          </p>
                        ) : null}
                        <span className="text-xs text-neutral-400">•</span>
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                          {getCustomerPoints(cartCustomer)} pts
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCartCustomer(null)}
                    className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/30 flex-shrink-0"
                  >
                    <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={() => setShowCustomerSelectModal(true)}
                >
                  <UserPlus className="h-5 w-5 mr-2" />
                  Add Customer
                </Button>
              )}
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 min-h-0">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-full text-gray-400">
                <ShoppingCart className="h-16 w-16 mb-2" />
                <p>Cart is empty</p>
              </div>
            ) : (
              items.map((item) => {
                // Check if we should show member pricing
                const hasCustomer = !!cartCustomer;
                const hasMemberPrice =
                  item.source === "kiosk" &&
                  item.memberPrice &&
                  item.originalPrice &&
                  item.memberPrice < item.originalPrice;
                const showMemberPrice = hasCustomer && hasMemberPrice;
                const displayPrice = showMemberPrice
                  ? item.memberPrice
                  : item.price;

                return (
                  <Card key={item.id} className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.name}</h3>
                        {showMemberPrice ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm text-gray-400 line-through">
                              {formatCurrency(item.originalPrice || item.price)}{" "}
                              {item.soldBy === "weight" ? "/kg" : "each"}
                            </p>
                            <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                              {formatCurrency(displayPrice)}{" "}
                              {item.soldBy === "weight" ? "/kg" : "each"}
                            </p>
                            <Badge
                              variant="secondary"
                              className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                            >
                              Member
                            </Badge>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">
                            {formatCurrency(item.price)}{" "}
                            {item.soldBy === "weight" ? "/kg" : "each"}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {item.soldBy === "weight" ? (
                          // For weight products, show text with kg
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedWeightProduct(item);
                                setWeightInput(
                                  item.quantity.toString().replace(".", ",")
                                );
                                setShowWeightModal(true);
                              }}
                              className="h-8"
                            >
                              Edit
                            </Button>
                            <span className="font-semibold">
                              {item.quantity} kg
                            </span>
                          </div>
                        ) : (
                          // For regular products, show +/- buttons
                          <>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                updateQuantity(item.id, item.quantity - 1)
                              }
                              className="h-8 w-8"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-12 text-center font-semibold">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                updateQuantity(item.id, item.quantity + 1)
                              }
                              className="h-8 w-8"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                      <p className="font-bold text-lg">
                        {formatCurrency(item.total)}
                      </p>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {/* Cart Summary */}
          <div className="border-t p-4 space-y-3 flex-shrink-0">
            <div className="space-y-2">
              {/* Show applied discounts */}
              {cartDiscounts && cartDiscounts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Applied Discounts ({cartDiscounts.length})
                    </span>
                    {cartDiscounts.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveAllDiscounts}
                        className="h-6 text-xs text-red-600 hover:text-red-700"
                      >
                        Remove All
                      </Button>
                    )}
                  </div>
                  {cartDiscounts.map((discount) => (
                    <div
                      key={discount.id}
                      className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-green-900 dark:text-green-100">
                            {discount.name}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-400">
                            {discount.type === "percentage"
                              ? `${discount.value}% off`
                              : `${formatCurrency(discount.value)} off`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDiscount(discount.id)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Only show Subtotal and Discount when discount is applied */}
              {getDiscountAmount() > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatCurrency(getSubtotal())}</span>
                  </div>

                  {/* Show individual discount breakdown */}
                  {cartDiscounts &&
                    cartDiscounts.length > 0 &&
                    cartDiscounts.map((discount, index) => {
                      // Calculate this discount's amount
                      let discountAmount = 0;
                      if (discount.type === "percentage") {
                        const subtotal = getSubtotal();
                        discountAmount = (subtotal * discount.value) / 100;
                      } else {
                        discountAmount = discount.value;
                      }

                      return (
                        <div
                          key={discount.id}
                          className="flex justify-between text-xs text-gray-600 dark:text-gray-400 pl-2"
                        >
                          <span>• {discount.name}</span>
                          <span className="text-red-600 dark:text-red-400">
                            -{formatCurrency(discountAmount)}
                          </span>
                        </div>
                      );
                    })}

                  <div className="flex justify-between text-sm font-medium">
                    <span>Total Discount</span>
                    <span className="text-red-600 dark:text-red-400">
                      -{formatCurrency(getDiscountAmount())}
                    </span>
                  </div>
                  <Separator />
                </>
              )}
              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span>{formatCurrency(getTotal())}</span>
              </div>
            </div>

            <div className="space-y-2">
              {/* No Shift Warning */}
              {!hasActiveShift && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                        View-Only Mode
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                        Start a shift to make transactions
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Discount button row */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 flex-shrink-0"
                  onClick={handleShowDiscounts}
                  disabled={items.length === 0}
                  title="Apply Discount"
                >
                  <Percent className="h-5 w-5" />
                </Button>
                <Button
                  className="flex-1 h-12 text-lg"
                  onClick={handleCheckout}
                  disabled={items.length === 0}
                >
                  <CreditCard className="mr-2 h-5 w-5" />
                  Checkout
                </Button>
              </div>
              {cartCustomer && (
                <Button
                  variant="outline"
                  className="w-full h-12"
                  onClick={handleSaveTicket}
                  disabled={items.length === 0}
                >
                  <Save className="mr-2 h-5 w-5" />
                  Save Ticket
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Weight Input Modal */}
        <Dialog open={showWeightModal} onOpenChange={setShowWeightModal}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Enter Weight</DialogTitle>
              <DialogDescription>
                {selectedWeightProduct?.name} - How many kg?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Weight Display */}
              <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 text-center">
                  Weight (kg)
                </div>
                <div className="text-4xl font-bold text-gray-900 dark:text-gray-100 text-center min-h-[3rem] flex items-center justify-center">
                  {weightInput || "0"}
                </div>
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-3">
                {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
                  <Button
                    key={num}
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-16 text-2xl font-semibold"
                    onClick={() => handleWeightKeypad(num.toString())}
                  >
                    {num}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-16 text-2xl font-semibold"
                  onClick={() => handleWeightKeypad(",")}
                >
                  ,
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-16 text-2xl font-semibold"
                  onClick={() => handleWeightKeypad("0")}
                >
                  0
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-16"
                  onClick={() => handleWeightKeypad("backspace")}
                >
                  ←
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleWeightKeypad("clear")}
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  variant="default"
                  className="flex-1"
                  onClick={handleConfirmWeight}
                  disabled={
                    !weightInput || weightInput === "" || weightInput === ","
                  }
                >
                  Add to Cart
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Payment Modal */}
        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Complete Payment</DialogTitle>
              <DialogDescription>
                Select payment method and complete the transaction
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Total Amount */}
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Total Amount
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(getTotal())}
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={paymentMethod === "cash" ? "default" : "outline"}
                    className="h-20 flex flex-col"
                    onClick={() => setPaymentMethod("cash")}
                  >
                    <Banknote className="h-6 w-6 mb-1" />
                    Cash
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === "card" ? "default" : "outline"}
                    className="h-20 flex flex-col"
                    onClick={() => setPaymentMethod("card")}
                  >
                    <CreditCard className="h-6 w-6 mb-1" />
                    Card
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === "crypto" ? "default" : "outline"}
                    className="h-20 flex flex-col"
                    onClick={() => setPaymentMethod("crypto")}
                  >
                    <Bitcoin className="h-6 w-6 mb-1" />
                    Crypto
                  </Button>
                  <Button
                    type="button"
                    variant={
                      paymentMethod === "transfer" ? "default" : "outline"
                    }
                    className="h-20 flex flex-col"
                    onClick={() => setPaymentMethod("transfer")}
                  >
                    <ArrowLeftRight className="h-6 w-6 mb-1" />
                    Transfer
                  </Button>
                </div>
              </div>

              {/* Cash Payment Details */}
              {paymentMethod === "cash" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cash Received</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      className="text-2xl h-14 text-right"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  {/* Quick Cash Buttons */}
                  <div className="grid grid-cols-4 gap-2">
                    {quickCashAmounts.map((amount) => (
                      <Button
                        key={amount}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickCash(amount)}
                      >
                        ${amount}
                      </Button>
                    ))}
                  </div>

                  {/* Change Calculation */}
                  {cashReceived && parseFloat(cashReceived) >= getTotal() && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                      <div className="text-sm text-green-700 dark:text-green-400 mb-1">
                        Change
                      </div>
                      <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                        {formatCurrency(calculateChange())}
                      </div>
                    </div>
                  )}

                  {cashReceived && parseFloat(cashReceived) < getTotal() && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg">
                      <div className="text-sm text-red-700 dark:text-red-400">
                        Insufficient amount. Need{" "}
                        {formatCurrency(getTotal() - parseFloat(cashReceived))}{" "}
                        more.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Card Payment Note */}
              {paymentMethod === "card" && (
                <div className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Process card payment using your card terminal
                  </div>
                </div>
              )}

              {/* Crypto Payment Note */}
              {paymentMethod === "crypto" && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-4 rounded-lg">
                  <div className="text-sm text-purple-700 dark:text-purple-400">
                    Process cryptocurrency transfer and confirm payment received
                  </div>
                </div>
              )}

              {/* Transfer Payment Note */}
              {paymentMethod === "transfer" && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-4 rounded-lg">
                  <div className="text-sm text-indigo-700 dark:text-indigo-400">
                    Process bank transfer and confirm payment received
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPaymentModal(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleCompletePayment}
                data-quick-complete="true"
                disabled={
                  isProcessing ||
                  (paymentMethod === "cash" &&
                    (!cashReceived || parseFloat(cashReceived) < getTotal()))
                }
              >
                {isProcessing ? "Processing..." : "Complete Payment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Receipt Modal */}
        <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Payment Successful</DialogTitle>
              <DialogDescription>
                Order {completedOrder?.orderNumber}
              </DialogDescription>
            </DialogHeader>

            {completedOrder && (
              <div className="space-y-4 py-4">
                {/* Payment Summary */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-green-800 dark:text-green-200">
                        Payment Completed
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-400">
                        {completedOrder.paymentTypeName ||
                          completedOrder.paymentMethod}
                      </div>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Total Amount:
                      </span>
                      <span className="font-bold text-lg">
                        {formatCurrency(
                          completedOrder.total_money ||
                            completedOrder.total ||
                            0
                        )}
                      </span>
                    </div>

                    {completedOrder.paymentMethod === "cash" && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            Cash Received:
                          </span>
                          <span className="font-medium">
                            {formatCurrency(completedOrder.cashReceived || 0)}
                          </span>
                        </div>
                        {(completedOrder.change || 0) > 0 && (
                          <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 p-3 rounded mt-2">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-yellow-800 dark:text-yellow-200">
                                Change to Return:
                              </span>
                              <span className="font-bold text-xl text-yellow-800 dark:text-yellow-200">
                                {formatCurrency(completedOrder.change || 0)}
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Order Items Summary */}
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg max-h-48 overflow-y-auto">
                  <div className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
                    Order Items ({completedOrder.line_items?.length || 0})
                  </div>
                  <div className="space-y-1">
                    {completedOrder.line_items?.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>
                          {item.quantity}x {item.item_name}
                        </span>
                        <span>{formatCurrency(item.total_money)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button
                className="w-full h-12 text-lg"
                onClick={handlePrintReceipt}
              >
                <Printer className="h-5 w-5 mr-2" />
                Print Receipt
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleNewTransaction}
              >
                New Transaction
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Customer Selection Modal */}
        <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Select Customer for Ticket</DialogTitle>
              <DialogDescription>
                Choose an existing customer or save without customer
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search customers by name, email, or phone..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Customer List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {customers
                  .filter((c) => {
                    if (!customerSearchQuery) return true;
                    const query = customerSearchQuery.toLowerCase();
                    return (
                      c.name?.toLowerCase().includes(query) ||
                      c.email?.toLowerCase().includes(query) ||
                      c.phone?.includes(query) ||
                      c.customerCode?.toLowerCase().includes(query)
                    );
                  })
                  .map((customer) => (
                    <div
                      key={customer.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        cartCustomer?.id === customer.id
                          ? "border-green-500 bg-green-900/30 dark:bg-green-900/30"
                          : "border-gray-300 dark:border-gray-700 hover:border-green-300 hover:bg-gray-800 dark:hover:bg-gray-800"
                      }`}
                      onClick={() => setCartCustomer(customer)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="font-semibold">
                              {customer.name}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {customer.customerCode}
                            </Badge>
                          </div>
                          <div className="mt-1 text-sm text-gray-600 space-y-0.5">
                            {customer.email && <div>📧 {customer.email}</div>}
                            {customer.phone && <div>📱 {customer.phone}</div>}
                          </div>
                        </div>
                        {cartCustomer?.id === customer.id && (
                          <div className="text-green-600 font-semibold">
                            ✓ Selected
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleConfirmSaveTicket(null)}
                >
                  Save Without Customer
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleConfirmSaveTicket(cartCustomer)}
                  disabled={!cartCustomer}
                >
                  Save with Selected Customer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Customer Selection Modal for Cart */}
        <Dialog
          open={showCustomerSelectModal}
          onOpenChange={setShowCustomerSelectModal}
        >
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                Add Customer to Cart
              </DialogTitle>
              <DialogDescription>
                Link this sale to a customer for purchase history tracking and
                loyalty rewards
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
                <Input
                  placeholder="Search by name, customer ID, member ID, email, or phone..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>

              {/* Customer List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {customers
                  .filter((c) => {
                    if (!customerSearchQuery) return true;
                    const query = customerSearchQuery.toLowerCase();
                    return (
                      c.name?.toLowerCase().includes(query) ||
                      c.customerId?.toLowerCase().includes(query) ||
                      c.memberId?.toLowerCase().includes(query) ||
                      c.email?.toLowerCase().includes(query) ||
                      c.phone?.includes(query) ||
                      c.cell?.includes(query) ||
                      c.customerCode?.toLowerCase().includes(query)
                    );
                  })
                  .map((customer) => (
                    <div
                      key={customer.id}
                      className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg cursor-pointer transition-all hover:border-primary hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:shadow-md"
                      onClick={() => {
                        setCartCustomer(customer);
                        setShowCustomerSelectModal(false);
                        setCustomerSearchQuery("");
                        toast.success(
                          `Customer ${customer.name} added to cart`
                        );
                      }}
                    >
                      <div className="flex items-start gap-4">
                        {/* Customer Icon */}
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                        </div>

                        {/* Customer Info */}
                        <div className="flex-1 min-w-0">
                          {/* Name and Badges */}
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="font-semibold text-lg">
                              {customer.name}
                            </h3>

                            {/* Source Badge */}
                            {customer.source && (
                              <Badge
                                variant={
                                  customer.source === "loyverse"
                                    ? "secondary"
                                    : customer.source === "kiosk"
                                    ? "default"
                                    : "outline"
                                }
                                className={
                                  customer.source === "kiosk"
                                    ? "text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                                    : customer.source === "local"
                                    ? "text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100"
                                    : "text-xs"
                                }
                              >
                                {customer.source}
                              </Badge>
                            )}

                            {/* Member Badge */}
                            {customer.isMember && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-blue-50 dark:bg-blue-950 border-blue-500 text-blue-700 dark:text-blue-400"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Member
                              </Badge>
                            )}
                          </div>

                          {/* Customer ID / Code */}
                          <div className="flex items-center gap-2 mb-3">
                            {customer.customerId ? (
                              <span className="font-mono text-sm font-semibold text-primary">
                                ID: {customer.customerId}
                              </span>
                            ) : customer.customerCode ? (
                              <Badge variant="secondary" className="text-xs">
                                {customer.customerCode}
                              </Badge>
                            ) : null}
                            {customer.memberId && (
                              <span className="font-mono text-sm text-neutral-500">
                                Member: {customer.memberId}
                              </span>
                            )}
                          </div>

                          {/* Contact Information */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                            {customer.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">
                                  {customer.email}
                                </span>
                              </div>
                            )}
                            {customer.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 flex-shrink-0" />
                                <span>{customer.phone}</span>
                              </div>
                            )}
                          </div>

                          {/* Stats */}
                          <div className="flex gap-4 text-sm">
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <ShoppingCart className="h-4 w-4" />
                              <span className="font-medium">
                                {getCustomerPoints(customer)} pts
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                              <User className="h-4 w-4" />
                              <span className="font-medium">
                                {customer.totalVisits || customer.visits || 0}{" "}
                                visits
                              </span>
                            </div>
                            {(customer.totalSpent || customer.spent) && (
                              <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                                <CreditCard className="h-4 w-4" />
                                <span className="font-medium">
                                  {formatCurrency(
                                    customer.totalSpent || customer.spent || 0
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                {/* Empty State */}
                {customers.length === 0 && (
                  <div className="text-center py-12 text-neutral-500">
                    <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                      <User className="h-8 w-8 text-neutral-400" />
                    </div>
                    <p className="text-lg font-medium mb-2">
                      No customers found
                    </p>
                    <p className="text-sm">
                      Go to Customers page to add customers
                    </p>
                  </div>
                )}

                {/* No Results State */}
                {customers.length > 0 &&
                  customers.filter((c) => {
                    if (!customerSearchQuery) return true;
                    const query = customerSearchQuery.toLowerCase();
                    return (
                      c.name?.toLowerCase().includes(query) ||
                      c.customerId?.toLowerCase().includes(query) ||
                      c.memberId?.toLowerCase().includes(query) ||
                      c.email?.toLowerCase().includes(query) ||
                      c.phone?.includes(query) ||
                      c.cell?.includes(query) ||
                      c.customerCode?.toLowerCase().includes(query)
                    );
                  }).length === 0 && (
                    <div className="text-center py-12 text-neutral-500">
                      <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                        <Search className="h-8 w-8 text-neutral-400" />
                      </div>
                      <p className="text-lg font-medium mb-2">
                        No results found
                      </p>
                      <p className="text-sm">
                        Try searching with different keywords
                      </p>
                    </div>
                  )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Discount Selection Modal */}
        <Dialog open={showDiscountModal} onOpenChange={setShowDiscountModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Available Discounts</DialogTitle>
              <DialogDescription>
                Select discounts to apply to your cart. You can apply multiple
                discounts. Subtotal: {formatCurrency(getSubtotal())}
                {cartDiscounts && cartDiscounts.length > 0 && (
                  <span className="ml-2 text-green-600 dark:text-green-400 font-medium">
                    ({cartDiscounts.length} discount
                    {cartDiscounts.length !== 1 ? "s" : ""} applied)
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Custom Discount Button */}
              <Button
                variant="outline"
                className="w-full border-dashed border-2 border-green-600 text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                onClick={() =>
                  setShowCustomDiscountForm(!showCustomDiscountForm)
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Custom Discount
              </Button>

              {/* Custom Discount Form */}
              {showCustomDiscountForm && (
                <div className="p-4 border border-green-300 dark:border-green-700 rounded-lg bg-green-50 dark:bg-green-900/10 space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Tag className="h-5 w-5 text-green-600" />
                    Custom Discount
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Discount Title
                      </label>
                      <Input
                        placeholder="e.g., Special Customer Discount"
                        value={customDiscountTitle}
                        onChange={(e) => setCustomDiscountTitle(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Discount Type
                        </label>
                        <select
                          className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800"
                          value={customDiscountType}
                          onChange={(e) =>
                            setCustomDiscountType(e.target.value)
                          }
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="amount">Fixed Amount</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Discount Value
                        </label>
                        <Input
                          type="number"
                          placeholder={
                            customDiscountType === "percentage"
                              ? "e.g., 10"
                              : "e.g., 5000"
                          }
                          value={customDiscountValue}
                          onChange={(e) =>
                            setCustomDiscountValue(e.target.value)
                          }
                          min="0"
                          step={
                            customDiscountType === "percentage" ? "1" : "100"
                          }
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setShowCustomDiscountForm(false);
                          setCustomDiscountTitle("");
                          setCustomDiscountValue("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={handleApplyCustomDiscount}
                      >
                        Apply Custom Discount
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Discount List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {availableDiscounts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Tag className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No discounts available</p>
                    <p className="text-sm">
                      Create discounts in Products section
                    </p>
                  </div>
                ) : (
                  availableDiscounts
                    .filter((discount) => discount.isActive)
                    .map((discount) => {
                      const subtotal = getSubtotal();
                      const applicability = discountsService.isApplicable(
                        discount,
                        subtotal
                      );
                      const now = new Date();
                      const validFrom = discount.validFrom?.toDate
                        ? discount.validFrom.toDate()
                        : discount.validFrom
                        ? new Date(discount.validFrom)
                        : null;
                      const validTo = discount.validTo?.toDate
                        ? discount.validTo.toDate()
                        : discount.validTo
                        ? new Date(discount.validTo)
                        : null;

                      // Determine status badge
                      let statusColor = "bg-green-100 text-green-700";
                      let statusText = "Active";

                      if (validFrom && now < validFrom) {
                        statusColor = "bg-blue-900/30 text-blue-400";
                        statusText = "Upcoming";
                      } else if (validTo && now > validTo) {
                        statusColor = "bg-gray-800 text-gray-400";
                        statusText = "Expired";
                      }

                      const isDisabled = !applicability.valid;

                      return (
                        <div
                          key={discount.id}
                          className={`p-4 border rounded-lg transition-colors ${
                            isDisabled
                              ? "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                              : "cursor-pointer hover:border-green-300 hover:bg-green-900/30 dark:hover:bg-green-900/30 border-gray-300 dark:border-gray-700"
                          }`}
                          onClick={() =>
                            !isDisabled && handleApplyDiscount(discount)
                          }
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Percent className="h-5 w-5 text-green-600" />
                                <span className="font-semibold text-lg">
                                  {discount.name}
                                </span>
                                <Badge className={statusColor}>
                                  {statusText}
                                </Badge>
                              </div>

                              <div className="space-y-1 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-green-700">
                                    {discount.type === "percentage"
                                      ? `${discount.value}% OFF`
                                      : `${formatCurrency(discount.value)} OFF`}
                                  </span>
                                </div>

                                {discount.minPurchase > 0 && (
                                  <div>
                                    Min. Purchase:{" "}
                                    {formatCurrency(discount.minPurchase)}
                                  </div>
                                )}

                                {(validFrom || validTo) && (
                                  <div className="text-xs">
                                    {validFrom && (
                                      <span>
                                        From: {validFrom.toLocaleDateString()}
                                      </span>
                                    )}
                                    {validFrom && validTo && <span> • </span>}
                                    {validTo && (
                                      <span>
                                        To: {validTo.toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {!applicability.valid && (
                                <div className="mt-2 text-xs text-red-600 font-medium">
                                  ⚠ {applicability.reason}
                                </div>
                              )}
                            </div>

                            {!isDisabled && (
                              <div className="text-green-600 font-semibold ml-4">
                                Apply →
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Category Modal */}
        <Dialog
          open={showAddCategoryModal}
          onOpenChange={setShowAddCategoryModal}
        >
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Add New Category Tab</DialogTitle>
              <DialogDescription>
                Create a custom category to organize your products
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category Name</label>
                <Input
                  placeholder="Enter category name..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddCustomCategory();
                    }
                  }}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowAddCategoryModal(false);
                  setNewCategoryName("");
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleAddCustomCategory}
                disabled={!newCategoryName.trim()}
              >
                Add Category
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Product/Category Select Modal for Custom Tab Slots */}
        <Dialog
          open={showProductSelectModal}
          onOpenChange={setShowProductSelectModal}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] w-[95vw] sm:w-full overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-base sm:text-lg">
                Select for Slot{" "}
                {selectedSlotIndex !== null ? selectedSlotIndex + 1 : ""}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 sm:space-y-4 py-2 sm:py-4 flex-1 overflow-hidden flex flex-col">
              {/* Current slot info and actions */}
              {selectedSlotIndex !== null &&
                (() => {
                  const currentSlots = ensureTwentySlots(
                    customCategoryProducts[selectedCategory]
                  );
                  const currentSlot = currentSlots[selectedSlotIndex];

                  if (currentSlot && currentSlot.type === "category") {
                    const slotKey = `${selectedCategory}-${selectedSlotIndex}-${currentSlot.data.categoryId}`;
                    return (
                      <div className="flex gap-2 pb-2 border-b flex-shrink-0">
                        <div className="flex-1 px-3 py-2 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Current:
                          </div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {currentSlot.data.name}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowProductSelectModal(false);
                            setSelectedSlotForColor({
                              key: slotKey,
                              name: currentSlot.data.name,
                            });
                            setShowSlotColorPicker(true);
                          }}
                          className="px-4"
                        >
                          🎨 Change Color
                        </Button>
                      </div>
                    );
                  }
                  return null;
                })()}

              {/* Type Toggle */}
              <div className="flex gap-2 border-b pb-2 flex-shrink-0">
                <Button
                  variant={selectionType === "product" ? "default" : "outline"}
                  onClick={() => setSelectionType("product")}
                  className="flex-1 text-sm sm:text-base"
                >
                  Product
                </Button>
                <Button
                  variant={selectionType === "category" ? "default" : "outline"}
                  onClick={() => setSelectionType("category")}
                  className="flex-1 text-sm sm:text-base"
                >
                  Category
                </Button>
              </div>

              {selectionType === "product" ? (
                <>
                  {/* Search */}
                  <div className="relative flex-shrink-0">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    <Input
                      placeholder="Search products..."
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      className="pl-9 sm:pl-10 text-sm sm:text-base h-9 sm:h-10"
                      autoFocus
                    />
                  </div>

                  {/* Products List */}
                  <div className="flex-1 overflow-y-auto border rounded-lg min-h-0">
                    <div className="grid gap-1.5 sm:gap-2 p-1.5 sm:p-2">
                      {products
                        .filter((product) => {
                          const query = productSearchQuery.toLowerCase();
                          return (
                            product.name?.toLowerCase().includes(query) ||
                            product.sku?.toLowerCase().includes(query) ||
                            product.barcode?.toLowerCase().includes(query)
                          );
                        })
                        .map((product) => {
                          const imageUrl = getProductImage(product);
                          const productColor = getProductColor(product);
                          const colorClass = getColorClasses(productColor);

                          return (
                            <button
                              key={product.id || product.sku}
                              onClick={() => handleItemSelect(product)}
                              className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-left w-full"
                            >
                              {/* Product Image/Color Preview */}
                              <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 rounded overflow-hidden border border-gray-300 dark:border-gray-700">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : colorClass ? (
                                  <div
                                    className={cn("w-full h-full", colorClass)}
                                  ></div>
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 flex items-center justify-center">
                                    <span className="text-lg sm:text-2xl font-semibold text-white">
                                      {product.name?.charAt(0).toUpperCase() ||
                                        "?"}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Product Info */}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">
                                  {product.name}
                                </h3>
                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                                  {product.sku && `SKU: ${product.sku}`}
                                  {product.barcode && ` | ${product.barcode}`}
                                </p>
                                <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {formatCurrency(product.price || 0)}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </>
              ) : (
                /* Category Selection */
                <div className="flex-1 overflow-y-auto border rounded-lg min-h-0">
                  <div className="grid gap-1.5 sm:gap-2 p-1.5 sm:p-2">
                    {isLoading ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <RefreshCw className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 text-gray-300 animate-spin" />
                        <p className="text-sm sm:text-base">
                          Loading categories...
                        </p>
                      </div>
                    ) : categoriesData.length > 0 ? (
                      categoriesData.map((categoryObj) => (
                        <button
                          key={categoryObj.id || categoryObj.name}
                          onClick={() => handleItemSelect(categoryObj.name)}
                          className="p-3 sm:p-4 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-left w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                        >
                          <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">
                            {categoryObj.name}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {categoryObj.description ||
                              "Click to browse products from this category"}
                          </p>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <p className="font-medium mb-1 text-sm sm:text-base">
                          No categories available
                        </p>
                        <p className="text-xs sm:text-sm">
                          Categories are automatically extracted from your
                          products.
                        </p>
                        <p className="text-sm mt-2">
                          Make sure your products have category information.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowProductSelectModal(false);
                  setSelectedSlotIndex(null);
                  setProductSearchQuery("");
                }}
              >
                Cancel
              </Button>
              {/* Show delete button if slot already has content */}
              {selectedSlotIndex !== null &&
                customCategoryProducts[selectedCategory]?.[
                  selectedSlotIndex
                ] && (
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={async () => {
                      const updatedSlots = ensureTwentySlots(
                        customCategoryProducts[selectedCategory]
                      );
                      updatedSlots[selectedSlotIndex] = null;

                      const updatedCategories = {
                        ...customCategoryProducts,
                        [selectedCategory]: updatedSlots,
                      };

                      setCustomCategoryProducts(updatedCategories);
                      await saveCustomTabsToFirebase(
                        customCategories,
                        updatedCategories
                      );

                      toast.success(
                        `Removed from slot ${selectedSlotIndex + 1}`
                      );
                      setShowProductSelectModal(false);
                      setSelectedSlotIndex(null);
                      setProductSearchQuery("");
                    }}
                  >
                    Delete from Slot
                  </Button>
                )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Tab Context Menu */}
        {showTabMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowTabMenu(false)}
            />
            <div
              className="fixed z-50 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg py-2 min-w-[150px]"
              style={{
                left: `${menuPosition.x}px`,
                top: `${menuPosition.y}px`,
              }}
            >
              <button
                onClick={handleEditCategory}
                className="w-full px-4 py-2 text-left hover:bg-gray-800 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-700 dark:text-gray-300"
              >
                <span>Edit</span>
              </button>
              <button
                onClick={handleEnterDragMode}
                className="w-full px-4 py-2 text-left hover:bg-gray-800 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-700 dark:text-gray-300"
              >
                <span>Reorder</span>
              </button>
              <button
                onClick={handleDeleteCategoryFromMenu}
                className="w-full px-4 py-2 text-left hover:bg-gray-800 dark:hover:bg-gray-800 text-red-400 flex items-center gap-2"
              >
                <span>Delete</span>
              </button>
            </div>
          </>
        )}

        {/* Category SLOT Color Picker Dialog (for boxes in grid) */}
        <Dialog
          open={showSlotColorPicker}
          onOpenChange={setShowSlotColorPicker}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Select Box Color</DialogTitle>
              <DialogDescription>
                Choose a color for category box:{" "}
                <strong>{selectedSlotForColor?.name}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Color Palette */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  Select from palette:
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {CATEGORY_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() =>
                        saveCategorySlotColor(selectedSlotForColor?.key, color)
                      }
                      className="h-16 w-full rounded-lg border-2 transition-all hover:scale-105 border-gray-200 dark:border-gray-700"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Custom Color Picker */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  Or choose custom color:
                </label>
                <Input
                  type="color"
                  value={
                    categorySlotColors[selectedSlotForColor?.key] || "#3b82f6"
                  }
                  onChange={(e) =>
                    saveCategorySlotColor(
                      selectedSlotForColor?.key,
                      e.target.value
                    )
                  }
                  className="h-16 cursor-pointer"
                />
              </div>

              {/* Reset Button */}
              <Button
                variant="outline"
                onClick={() => {
                  const updatedColors = { ...categorySlotColors };
                  delete updatedColors[selectedSlotForColor?.key];
                  setCategorySlotColors(updatedColors);
                  saveCustomTabsToFirebase(
                    customCategories,
                    customCategoryProducts
                  );
                  toast.success("Color reset to default blue");
                  setShowSlotColorPicker(false);
                  setSelectedSlotForColor(null);
                }}
                className="w-full"
              >
                Reset to Default Blue
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Category Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category Name</label>
                <Input
                  placeholder="Enter category name..."
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveEditCategory();
                    }
                  }}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowEditModal(false);
                  setEditCategoryName("");
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveEditCategory}
                disabled={!editCategoryName.trim()}
              >
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
