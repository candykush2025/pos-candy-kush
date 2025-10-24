"use client";

import { useState, useEffect, useRef } from "react";
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
  ArrowLeftRight,
  Bitcoin,
  Folder,
  ArrowLeft,
  Percent,
  Tag,
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
        onClick={!isDragMode ? onClick : undefined}
        onMouseDown={!isDragMode ? onLongPressStart : undefined}
        onMouseUp={!isDragMode ? onLongPressEnd : undefined}
        onMouseLeave={!isDragMode ? onLongPressEnd : undefined}
        onTouchStart={!isDragMode ? onLongPressStart : undefined}
        onTouchEnd={!isDragMode ? onLongPressEnd : undefined}
        className={cn(
          "px-8 py-4 text-xl font-medium border-r border-gray-300 whitespace-nowrap transition-colors w-full",
          isSelected
            ? "bg-white text-gray-900 border-t-2 border-t-green-600"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          isDragMode && "ring-2 ring-blue-400 cursor-move"
        )}
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
    getSubtotal,
    getDiscountAmount,
    getTotal,
    getItemCount,
    getCartData,
    customer: cartCustomer,
    setCustomer: setCartCustomer,
    setDiscount,
    discount: cartDiscount,
  } = useCartStore();

  const { createTicket } = useTicketStore();
  const { pendingCount } = useSyncStore();
  const isOnline = useOnlineStatus();

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [unsyncedOrders, setUnsyncedOrders] = useState(0);
  const [categories, setCategories] = useState([]); // category names for tabs
  const [categoriesData, setCategoriesData] = useState([]); // full category objects from Firebase
  const [selectedCategory, setSelectedCategory] = useState("all");
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
        console.log("Generated new device ID:", deviceId);
      }
    }
  }, []);

  // Load products and customers
  useEffect(() => {
    loadProducts();
    loadCustomers();
    checkUnsyncedOrders();
  }, []);

  // Reload custom tabs when user changes (login/logout)
  useEffect(() => {
    if (userId && products.length > 0) {
      loadCustomTabsFromUser();
    }
  }, [userId]);

  const loadCustomTabsFromUser = async () => {
    if (!userId || products.length === 0) return;

    try {
      const firebaseTabs = await customTabsService.getUserTabs(userId);

      if (firebaseTabs) {
        setCustomCategories(firebaseTabs.categories || []);

        // Convert slot IDs back to full objects
        const productMap = {};
        products.forEach((p) => (productMap[p.id] = p));

        const resolvedSlots = {};
        Object.keys(firebaseTabs.categoryProducts || {}).forEach((category) => {
          const slots = firebaseTabs.categoryProducts[category];
          resolvedSlots[category] = slots.map((slot) => {
            if (!slot) return null;

            if (slot.type === "product") {
              const product = productMap[slot.id];
              return product
                ? { type: "product", id: slot.id, data: product }
                : null;
            } else if (slot.type === "category") {
              return { type: "category", id: slot.id, data: { name: slot.id } };
            }
            return null;
          });
        });
        setCustomCategoryProducts(resolvedSlots);

        // Also save to localStorage as backup
        localStorage.setItem(
          "custom_categories",
          JSON.stringify(firebaseTabs.categories || [])
        );
        localStorage.setItem(
          "custom_category_products",
          JSON.stringify(resolvedProducts)
        );

        toast.success("Custom tabs loaded from cloud");
      }
    } catch (error) {
      console.error("Error loading custom tabs from Firebase:", error);
      toast.error("Failed to load custom tabs from cloud");
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
  }, [searchQuery, products, selectedCategory]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);

      // Load products and categories from Firebase in parallel
      const [productsData, categoriesData] = await Promise.all([
        productsService.getAll(),
        categoriesService.getAll(),
      ]);

      setProducts(productsData);
      setFilteredProducts(productsData);

      // Store full category objects and filter out deleted ones
      const activeCategories = categoriesData.filter(
        (cat) => cat.name && !cat.deletedAt
      );
      setCategoriesData(activeCategories);

      // Set category names for modal selection
      const categoryNames = activeCategories.map((cat) => cat.name).sort();
      setCategories(categoryNames);

      // Load custom tabs from Firebase if user is logged in
      if (userId) {
        try {
          const firebaseTabs = await customTabsService.getUserTabs(userId);

          if (firebaseTabs) {
            setCustomCategories(firebaseTabs.categories || []);
            // Convert slot IDs back to full objects
            const productMap = {};
            productsData.forEach((p) => (productMap[p.id] = p));

            // Create category map for resolving category slots
            const categoryMap = {};
            activeCategories.forEach((cat) => (categoryMap[cat.id] = cat));

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
            console.log("No Firebase data found, loading from localStorage");
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

      // Sync to IndexedDB for offline access
      if (productsData.length > 0) {
        await dbService.upsertProducts(productsData);
      }

      // Debug: Log heights after products load
      setTimeout(() => {
        const mainContent = document.querySelector(".main-content-debug");
        const productsSection = document.querySelector(
          ".products-section-debug"
        );
        const productsGrid = document.querySelector(".products-grid-debug");
        const cartSection = document.querySelector(".cart-section-debug");

        console.log("=== HEIGHT DEBUG ===");
        console.log("Viewport Height:", window.innerHeight);
        console.log("Main Content:", mainContent?.offsetHeight, "px");
        console.log("Products Section:", productsSection?.offsetHeight, "px");
        console.log(
          "Products Grid:",
          productsGrid?.scrollHeight,
          "px (scroll height)"
        );
        console.log("Products Grid Visible:", productsGrid?.offsetHeight, "px");
        console.log("Cart Section:", cartSection?.offsetHeight, "px");
        console.log("Total Products:", productsData.length);
        console.log("==================");
      }, 100);
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
      const customersData = await customersService.getAll({
        orderBy: ["name", "asc"],
      });
      setCustomers(customersData);
    } catch (error) {
      console.error("Error loading customers:", error);
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
    if (!product) return null;
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
    const direct = toNumber(product.stock, Number.NaN);
    if (!Number.isNaN(direct)) return direct;

    const firstVariant = Array.isArray(product.variants)
      ? product.variants[0]
      : null;

    if (firstVariant) {
      const variantStock = toNumber(
        firstVariant.stock ??
          firstVariant.quantity ??
          firstVariant.inventory ??
          firstVariant.available_stock,
        Number.NaN
      );
      if (!Number.isNaN(variantStock)) return variantStock;

      const firstStore = Array.isArray(firstVariant.stores)
        ? firstVariant.stores[0]
        : null;
      if (firstStore) {
        const storeStock = toNumber(
          firstStore.stock ?? firstStore.available_stock,
          Number.NaN
        );
        if (!Number.isNaN(storeStock)) return storeStock;
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

    addItem(product, 1);
    toast.success(`Added ${product.name} to cart`);
  };

  // Helper function to save custom tabs to Firebase
  const saveCustomTabsToFirebase = async (categories, categoryProducts) => {
    if (!userId) {
      localStorage.setItem("custom_categories", JSON.stringify(categories));
      localStorage.setItem(
        "custom_category_products",
        JSON.stringify(categoryProducts)
      );
      return;
    }

    try {
      // Convert slots to minimal structure (type and id only)
      const slotIds = {};
      Object.keys(categoryProducts).forEach((category) => {
        slotIds[category] = categoryProducts[category].map((slot) => {
          if (!slot) return null;
          return {
            type: slot.type,
            id: slot.id,
          };
        });
      });

      await customTabsService.saveUserTabs(userId, {
        categories,
        categoryProducts: slotIds,
      });

      toast.success("Custom tabs synced to cloud");

      // Also save to localStorage as backup
      localStorage.setItem("custom_categories", JSON.stringify(categories));
      localStorage.setItem(
        "custom_category_products",
        JSON.stringify(categoryProducts)
      );
    } catch (error) {
      console.error("Error saving to Firebase:", error);
      toast.error("Failed to sync to cloud, saved locally only");
      // Fallback to localStorage only
      localStorage.setItem("custom_categories", JSON.stringify(categories));
      localStorage.setItem(
        "custom_category_products",
        JSON.stringify(categoryProducts)
      );
    }
  };

  const handleAddCustomCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    const updatedCategories = [...customCategories, newCategoryName.trim()];
    setCustomCategories(updatedCategories);

    try {
      await saveCustomTabsToFirebase(updatedCategories, customCategoryProducts);
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
    await saveCustomTabsToFirebase(updatedCategories, customCategoryProducts);
    if (selectedCategory === categoryName) {
      setSelectedCategory("all");
    }
    toast.success(`Category "${categoryName}" deleted`);
  };

  // Custom category product slot handlers
  const slotLongPressTimer = useRef(null);
  const isLongPress = useRef(false);

  const handleSlotLongPressStart = (index) => {
    isLongPress.current = false;
    slotLongPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      const currentSlots = customCategoryProducts[selectedCategory] || [];
      const currentSlot = currentSlots[index];

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
      const currentSlots =
        customCategoryProducts[selectedCategory] || Array(20).fill(null);
      const updatedSlots = [...currentSlots];

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
      const currentSlots =
        customCategoryProducts[selectedCategory] || Array(20).fill(null);
      const updatedSlots = [...currentSlots];
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

    saveCustomTabsToFirebase(newOrder, customCategoryProducts)
      .then(() => toast.success("Tab order updated"))
      .catch((error) => {
        console.error("Failed to save order:", error);
        toast.error("Failed to save tab order");
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
    let updatedProducts = customCategoryProducts;
    if (customCategoryProducts[categoryToDelete]) {
      updatedProducts = { ...customCategoryProducts };
      delete updatedProducts[categoryToDelete];
      setCustomCategoryProducts(updatedProducts);
    }

    await saveCustomTabsToFirebase(updatedCategories, updatedProducts);

    if (selectedCategory === categoryToDelete) {
      setSelectedCategory("all");
    }

    setShowTabMenu(false);
    toast.success(`Category "${categoryToDelete}" deleted`);
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

    // Apply discount to cart
    setDiscount(discount.type, discount.value);
    setSelectedDiscount(discount);
    setShowDiscountModal(false);

    toast.success(`Discount "${discount.name}" applied!`);
  };

  // Remove discount
  const handleRemoveDiscount = () => {
    setDiscount("percentage", 0);
    setSelectedDiscount(null);
    toast.success("Discount removed");
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
      const { loyverseService } = await import("@/lib/api/loyverse");
      const { LOYVERSE_CONFIG, FEATURES } = await import("@/config/constants");

      const orderNumber = generateOrderNumber();
      const now = new Date();

      // Get payment type details based on selected payment method
      const { LOYVERSE_PAYMENT_TYPES } = await import("@/config/constants");
      let selectedPaymentType;
      switch (paymentMethod) {
        case "cash":
          selectedPaymentType = LOYVERSE_PAYMENT_TYPES.CASH;
          break;
        case "card":
          selectedPaymentType = LOYVERSE_PAYMENT_TYPES.CARD;
          break;
        case "crypto":
          selectedPaymentType = LOYVERSE_PAYMENT_TYPES.CRYPTO;
          break;
        case "transfer":
          selectedPaymentType = LOYVERSE_PAYMENT_TYPES.TRANSFER;
          break;
        default:
          selectedPaymentType = LOYVERSE_PAYMENT_TYPES.CASH;
      }

      // Prepare line items for Loyverse format
      // According to Loyverse API: ONLY variant_id and quantity are REQUIRED
      // Optional fields: price, cost, line_note, line_discounts, line_taxes, line_modifiers
      const lineItems = items.map((item) => {
        const lineItem = {
          variant_id: item.variantId || item.variant_id || item.productId,
          quantity: item.quantity,
        };

        // Only add optional fields if you want to override Loyverse defaults
        if (item.price !== undefined) {
          lineItem.price = item.price;
        }
        if (item.cost !== undefined) {
          lineItem.cost = item.cost;
        }

        return lineItem;
      });

      // Prepare payment data with correct payment type ID
      const payments = [
        {
          payment_type_id: selectedPaymentType.id,
          paid_at: now.toISOString(),
        },
      ];

      // Sync status tracking
      let loyverseReceipt = null;
      let syncStatus = "pending";
      let syncError = null;

      // Try to sync to Loyverse if feature is enabled and online
      if (FEATURES.LOYVERSE_SYNC && navigator.onLine) {
        try {
          // Create receipt in Loyverse
          const loyverseData = {
            store_id: LOYVERSE_CONFIG.STORE_ID,
            employee_id: cashier?.loyverseId || null,
            order: orderNumber,
            customer_id: cartCustomer?.loyverseId || null,
            source: LOYVERSE_CONFIG.SOURCE_NAME,
            receipt_date: now.toISOString(),
            note: `Transaction from ${LOYVERSE_CONFIG.SOURCE_NAME}`,
            line_items: lineItems,
            payments: payments,
          };

          loyverseReceipt = await loyverseService.createReceipt(loyverseData);
          syncStatus = "synced";

          toast.success("Transaction synced to Loyverse!");
        } catch (error) {
          console.error("Loyverse sync error:", error);
          syncStatus = "failed";
          syncError = error.message;
          toast.warning(
            "Transaction saved locally. Sync failed: " + error.message
          );
        }
      } else if (!navigator.onLine) {
        syncStatus = "offline";
        toast.info("Offline mode: Transaction will sync when online");
      }

      // Create receipt data for Firebase (in Loyverse-compatible format)
      const receiptData = {
        // Local identifiers
        orderNumber: orderNumber,
        deviceId:
          typeof window !== "undefined"
            ? localStorage.getItem("device_id") || "unknown"
            : "unknown",
        fromThisDevice: true,

        // Loyverse format
        receipt_number: loyverseReceipt?.receipt_number || null,
        receipt_type: "SALE",
        order: orderNumber,
        source: LOYVERSE_CONFIG.SOURCE_NAME,

        // Dates
        created_at: now.toISOString(),
        receipt_date: now.toISOString(),
        updated_at: now.toISOString(),

        // Money amounts
        total_money: cartData.total,
        total_tax: 0, // Add tax calculation if needed
        total_discount: cartData.discountAmount,
        subtotal: cartData.subtotal,
        tip: 0,
        surcharge: 0,

        // Points (if customer has loyalty program)
        points_earned: cartCustomer ? Math.floor(total) : 0,
        points_deducted: 0,
        points_balance: cartCustomer
          ? (cartCustomer.points || 0) + Math.floor(total)
          : 0,

        // IDs
        store_id: LOYVERSE_CONFIG.STORE_ID,
        employee_id: cashier?.loyverseId || null,
        customer_id: cartCustomer?.loyverseId || null,
        pos_device_id: null,

        // Additional info
        cashierId: cashier?.id || null,
        cashierName: cashier?.name || "Unknown Cashier",
        userId: user?.id || null,
        customerId: cartCustomer?.id || null,
        customerName: cartCustomer?.name || null,

        // Status and sync
        status: "completed",
        cancelled_at: null,

        // Sync tracking
        syncStatus: syncStatus,
        syncError: syncError,
        syncedAt: syncStatus === "synced" ? now.toISOString() : null,
        loyverseReceiptNumber: loyverseReceipt?.receipt_number || null,
        loyverseResponse: loyverseReceipt || null,

        // Line items in Loyverse format
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
      };

      // Save to Firebase
      await receiptsService.create(receiptData);

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
        await db.transaction("rw", db.orders, db.orderItems, async () => {
          const localOrderId = await db.orders.add({
            orderNumber: orderNumber,
            status: "completed",
            total: total,
            subtotal: cartData.subtotal,
            discount: cartData.discountAmount,
            tax: 0,
            userId: user?.id || null,
            cashierId: cashier?.id || null,
            cashierName: cashier?.name || "Unknown Cashier",
            customerId: cartCustomer?.id || null,
            customerName: cartCustomer?.name || null,
            paymentMethod,
            cashReceived: paymentMethod === "cash" ? cashAmount : total,
            change: paymentMethod === "cash" ? cashAmount - total : 0,
            createdAt: now.toISOString(),
            syncStatus: syncStatus,
            loyverseReceiptNumber: loyverseReceipt?.receipt_number || null,
          });

          const orderItemsWithOrderId = items.map((item) => ({
            ...item,
            orderId: localOrderId,
          }));

          await db.orderItems.bulkAdd(orderItemsWithOrderId);
        });
      } catch (error) {
        console.error("Error saving to IndexedDB:", error);
        // Don't fail the checkout if IndexedDB fails
      }

      // Store completed order and show receipt modal
      setCompletedOrder(receiptData);
      setShowPaymentModal(false);
      setShowReceiptModal(true);

      if (syncStatus === "synced") {
        toast.success("Payment completed and synced to Loyverse!");
      } else {
        toast.success("Payment completed successfully!");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to complete order");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!completedOrder) return;

    // Generate receipt HTML for thermal printer (58mm)
    const receiptHTML = generateThermalReceipt(completedOrder);

    // Open in new window
    const printWindow = window.open("", "_blank", "width=300,height=600");
    if (!printWindow) {
      toast.error("Please allow pop-ups to print receipt");
      return;
    }

    printWindow.document.write(receiptHTML);
    printWindow.document.close();

    // Auto print after content loads
    printWindow.onload = () => {
      printWindow.print();

      // Listen for after print event
      printWindow.onafterprint = () => {
        printWindow.close();
        // Start new transaction after printing
        handleNewTransaction();
      };

      // Fallback: close after delay if onafterprint doesn't fire
      setTimeout(() => {
        if (!printWindow.closed) {
          printWindow.close();
          handleNewTransaction();
        }
      }, 2000);
    };
  };

  const handleNewTransaction = () => {
    setShowReceiptModal(false);
    setCompletedOrder(null);
    clearCart(); // This will also clear the customer in cart store
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
  const generateThermalReceipt = (order) => {
    const receiptDate = new Date().toLocaleString();

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt - ${order.orderNumber}</title>
        <style>
          @media print {
            @page {
              size: 58mm auto;
              margin: 0;
            }
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            width: 58mm;
            font-family: 'Courier New', monospace;
            font-size: 10px;
            padding: 5mm;
            background: white;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .store-name {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .order-info {
            margin: 10px 0;
            font-size: 9px;
          }
          .items {
            margin: 10px 0;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 10px 0;
          }
          .item {
            margin: 5px 0;
          }
          .item-name {
            font-weight: bold;
          }
          .item-detail {
            display: flex;
            justify-content: space-between;
            font-size: 9px;
          }
          .totals {
            margin: 10px 0;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .total-row.grand {
            font-size: 12px;
            font-weight: bold;
            border-top: 1px solid #000;
            padding-top: 5px;
            margin-top: 5px;
          }
          .payment-info {
            margin: 10px 0;
            border-top: 1px dashed #000;
            padding-top: 10px;
          }
          .footer {
            text-align: center;
            margin-top: 15px;
            border-top: 1px dashed #000;
            padding-top: 10px;
            font-size: 9px;
          }
          .change-highlight {
            background: #000;
            color: #fff;
            padding: 5px;
            text-align: center;
            font-size: 11px;
            font-weight: bold;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="store-name">CANDY KUSH POS</div>
          <div>Thank you for your purchase!</div>
        </div>

        <div class="order-info">
          <div>Order: ${order.orderNumber}</div>
          <div>Date: ${receiptDate}</div>
          <div>Cashier: ${user?.name || "Staff"}</div>
        </div>

        <div class="items">
          ${order.items
            .map(
              (item) => `
            <div class="item">
              <div class="item-name">${item.name}</div>
              <div class="item-detail">
                <span>${item.quantity} x ${formatCurrency(item.price)}</span>
                <span>${formatCurrency(item.total)}</span>
              </div>
            </div>
          `
            )
            .join("")}
        </div>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(order.subtotal)}</span>
          </div>
          ${
            order.discount > 0
              ? `
            <div class="total-row">
              <span>Discount:</span>
              <span>-${formatCurrency(order.discount)}</span>
            </div>
          `
              : ""
          }
          <div class="total-row grand">
            <span>TOTAL:</span>
            <span>${formatCurrency(order.total)}</span>
          </div>
        </div>

        <div class="payment-info">
          <div class="total-row">
            <span>Payment Method:</span>
            <span>${
              order.paymentTypeName || order.paymentMethod.toUpperCase()
            }</span>
          </div>
          ${
            order.paymentMethod === "cash"
              ? `
            <div class="total-row">
              <span>Cash Received:</span>
              <span>${formatCurrency(order.cashReceived)}</span>
            </div>
            ${
              order.change > 0
                ? `
              <div class="change-highlight">
                CHANGE: ${formatCurrency(order.change)}
              </div>
            `
                : ""
            }
          `
              : ""
          }
        </div>

        <div class="footer">
          <div>Thank you for your business!</div>
          <div>Please come again</div>
        </div>

        <script>
          // Auto print on load
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;
  };

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
      <div className="flex-1 flex overflow-hidden min-h-0 main-content-debug">
        {/* Products Section */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 products-section-debug">
          {/* Back Button - Show when viewing category */}
          {viewingCategoryId && (
            <div className="flex items-center gap-4 p-4 pb-2 flex-shrink-0 bg-blue-50 border-b">
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
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to {previousCustomCategory || "Custom Page"}
              </Button>
              <h2 className="text-xl font-semibold">{viewingCategoryName}</h2>
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
                    className="pl-10 h-12 text-lg"
                  />
                </div>
              </div>
            )}

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pt-4 min-h-0 products-grid-debug">
            {viewingCategoryId ? (
              /* Category Products View - Regular Grid of Products from Category */
              <div className="grid gap-4 grid-cols-5 auto-rows-fr">
                {products
                  .filter((product) => product.categoryId === viewingCategoryId)
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
                          "p-0 group overflow-hidden border bg-white transition-all cursor-pointer hover:border-primary/50 hover:shadow-md",
                          !canSell && "cursor-not-allowed opacity-70"
                        )}
                        onClick={handleCardClick}
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
                {(
                  customCategoryProducts[selectedCategory] ||
                  Array(20).fill(null)
                ).map((slot, index) => (
                  <Card
                    key={index}
                    className="p-0 group overflow-hidden border bg-white transition-all cursor-pointer hover:border-primary/50 hover:shadow-md"
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
                    onMouseDown={() => handleSlotLongPressStart(index)}
                    onMouseUp={handleSlotLongPressEnd}
                    onMouseLeave={handleSlotLongPressEnd}
                    onTouchStart={() => handleSlotLongPressStart(index)}
                    onTouchEnd={handleSlotLongPressEnd}
                  >
                    <div className="relative w-full pt-[100%] overflow-hidden">
                      <div className="absolute inset-0">
                        {slot ? (
                          <>
                            {slot.type === "category" ? (
                              /* Category Slot */
                              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 relative">
                                <h3 className="text-lg font-bold text-white text-center px-2">
                                  {slot.data.name}
                                </h3>
                                <div className="absolute top-2 right-2 bg-white/20 px-2 py-0.5 rounded text-xs text-white">
                                  Category
                                </div>
                              </div>
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
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors">
                            <Plus className="h-12 w-12 text-gray-400" />
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
                        "p-0 group overflow-hidden border bg-white transition-all cursor-pointer hover:border-primary/50 hover:shadow-md",
                        !canSell && "cursor-not-allowed opacity-70"
                      )}
                      onClick={handleCardClick}
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
          <div className="flex-shrink-0 bg-gray-100 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center overflow-x-auto scrollbar-hide flex-1">
                {/* All Tab */}
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={cn(
                    "px-8 py-4 text-xl font-medium border-r border-gray-300 whitespace-nowrap transition-colors",
                    selectedCategory === "all"
                      ? "bg-white text-gray-900 border-t-2 border-t-green-600"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
                      <button className="px-8 py-4 text-xl font-medium border-r border-gray-300 whitespace-nowrap bg-white text-gray-900 border-t-2 border-t-green-600 shadow-lg">
                        {activeId}
                      </button>
                    ) : null}
                  </DragOverlay>
                </DndContext>

                {/* Add Button */}
                <button
                  onClick={() => setShowAddCategoryModal(true)}
                  className="px-6 py-4 text-xl font-medium border-r border-gray-300 bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-1"
                  title="Add new category"
                >
                  <Plus className="h-6 w-6" />
                </button>
              </div>

              {/* Done Button for Drag Mode */}
              {isDragMode && (
                <button
                  onClick={handleExitDragMode}
                  className="px-6 py-4 text-xl font-medium bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-2 border-l border-gray-300"
                >
                  <CheckCircle className="h-5 w-5" />
                  Done
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Cart Section */}
        <div className="w-96 bg-white border-l flex flex-col min-h-0 cart-section-debug">
          {/* Cart Header */}
          <div className="p-4 border-b space-y-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="h-6 w-6" />
                <h2 className="text-xl font-bold">Cart</h2>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {getItemCount()} items
              </Badge>
            </div>

            {/* Customer Selection */}
            <div className="flex items-center gap-2">
              {cartCustomer ? (
                <div className="flex-1 flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        {cartCustomer.name}
                      </p>
                      <p className="text-xs text-green-600">
                        {cartCustomer.customerCode}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCartCustomer(null)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCustomerSelectModal(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
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
              items.map((item) => (
                <Card key={item.id} className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-sm text-gray-500">
                        {formatCurrency(item.price)} each
                      </p>
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
                    </div>
                    <p className="font-bold text-lg">
                      {formatCurrency(item.total)}
                    </p>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Cart Summary */}
          <div className="border-t p-4 space-y-3 flex-shrink-0">
            <div className="space-y-2">
              {/* Show applied discount */}
              {selectedDiscount && (
                <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        {selectedDiscount.name}
                      </p>
                      <p className="text-xs text-green-600">
                        {selectedDiscount.type === "percentage"
                          ? `${selectedDiscount.value}% off`
                          : `${formatCurrency(selectedDiscount.value)} off`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveDiscount}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Only show Subtotal and Discount when discount is applied */}
              {getDiscountAmount() > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatCurrency(getSubtotal())}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Discount</span>
                    <span className="text-red-600">
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
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={handleSaveTicket}
                disabled={items.length === 0}
              >
                <Save className="mr-2 h-5 w-5" />
                Save Ticket
              </Button>
            </div>
          </div>
        </div>

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
                <div className="text-3xl font-bold">
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
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                  <div className="text-sm text-blue-700 dark:text-blue-400">
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
                        {formatCurrency(completedOrder.total)}
                      </span>
                    </div>

                    {completedOrder.paymentMethod === "cash" && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            Cash Received:
                          </span>
                          <span className="font-medium">
                            {formatCurrency(completedOrder.cashReceived)}
                          </span>
                        </div>
                        {completedOrder.change > 0 && (
                          <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 p-3 rounded mt-2">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-yellow-800 dark:text-yellow-200">
                                Change to Return:
                              </span>
                              <span className="font-bold text-xl text-yellow-800 dark:text-yellow-200">
                                {formatCurrency(completedOrder.change)}
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Order Items Summary */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg max-h-48 overflow-y-auto">
                  <div className="text-sm font-semibold mb-2">
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
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                          : "border-gray-200 hover:border-green-300 hover:bg-gray-50"
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
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Customer to Cart</DialogTitle>
              <DialogDescription>
                Link this sale to a customer for purchase history tracking
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
                      className="p-4 border rounded-lg cursor-pointer transition-colors hover:border-green-300 hover:bg-gray-50"
                      onClick={() => {
                        setCartCustomer(customer);
                        setShowCustomerSelectModal(false);
                        setCustomerSearchQuery("");
                        toast.success(
                          `Customer ${customer.name} added to cart`
                        );
                      }}
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
                          {/* Customer Stats */}
                          <div className="mt-2 flex gap-3 text-xs">
                            <span className="text-green-600 font-medium">
                              {customer.points || 0} pts
                            </span>
                            <span className="text-blue-600 font-medium">
                              {customer.visits || 0} visits
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {customers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <User className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>No customers found</p>
                  <p className="text-sm">
                    Go to Customers page to add customers
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Discount Selection Modal */}
        <Dialog open={showDiscountModal} onOpenChange={setShowDiscountModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Available Discounts</DialogTitle>
              <DialogDescription>
                Select a discount to apply to your cart. Subtotal:{" "}
                {formatCurrency(getSubtotal())}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
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
                        statusColor = "bg-blue-100 text-blue-700";
                        statusText = "Upcoming";
                      } else if (validTo && now > validTo) {
                        statusColor = "bg-gray-100 text-gray-700";
                        statusText = "Expired";
                      }

                      const isDisabled = !applicability.valid;

                      return (
                        <div
                          key={discount.id}
                          className={`p-4 border rounded-lg transition-colors ${
                            isDisabled
                              ? "opacity-50 cursor-not-allowed bg-gray-50"
                              : "cursor-pointer hover:border-green-300 hover:bg-green-50"
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
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>
                Select for Slot{" "}
                {selectedSlotIndex !== null ? selectedSlotIndex + 1 : ""}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Type Toggle */}
              <div className="flex gap-2 border-b pb-2">
                <Button
                  variant={selectionType === "product" ? "default" : "outline"}
                  onClick={() => setSelectionType("product")}
                  className="flex-1"
                >
                  Product
                </Button>
                <Button
                  variant={selectionType === "category" ? "default" : "outline"}
                  onClick={() => setSelectionType("category")}
                  className="flex-1"
                >
                  Category
                </Button>
              </div>

              {selectionType === "product" ? (
                <>
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      placeholder="Search products by name, barcode, or SKU..."
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      className="pl-10"
                      autoFocus
                    />
                  </div>

                  {/* Products List */}
                  <div className="max-h-96 overflow-y-auto border rounded-lg">
                    <div className="grid gap-2 p-2">
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
                              className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg transition-colors text-left w-full"
                            >
                              {/* Product Image/Color Preview */}
                              <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden border">
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
                                    <span className="text-2xl font-semibold text-white">
                                      {product.name?.charAt(0).toUpperCase() ||
                                        "?"}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Product Info */}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 truncate">
                                  {product.name}
                                </h3>
                                <p className="text-sm text-gray-500">
                                  {product.sku && `SKU: ${product.sku}`}
                                  {product.barcode &&
                                    ` | Barcode: ${product.barcode}`}
                                </p>
                                <p className="text-sm font-medium text-gray-700">
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
                <div className="max-h-96 overflow-y-auto border rounded-lg">
                  <div className="grid gap-2 p-2">
                    {isLoading ? (
                      <div className="text-center py-8 text-gray-500">
                        <RefreshCw className="w-12 h-12 mx-auto mb-2 text-gray-300 animate-spin" />
                        <p>Loading categories...</p>
                      </div>
                    ) : categories.length > 0 ? (
                      categories.map((category) => (
                        <button
                          key={category}
                          onClick={() => handleItemSelect(category)}
                          className="p-4 hover:bg-blue-50 rounded-lg transition-colors text-left w-full border"
                        >
                          <h3 className="font-semibold text-gray-900">
                            {category}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Click to browse products from this category
                          </p>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p className="font-medium mb-1">
                          No categories available
                        </p>
                        <p className="text-sm">
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
              className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg py-2 min-w-[150px]"
              style={{
                left: `${menuPosition.x}px`,
                top: `${menuPosition.y}px`,
              }}
            >
              <button
                onClick={handleEditCategory}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
              >
                <span>Edit</span>
              </button>
              <button
                onClick={handleEnterDragMode}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
              >
                <span>Reorder</span>
              </button>
              <button
                onClick={handleDeleteCategoryFromMenu}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 text-red-600 flex items-center gap-2"
              >
                <span>Delete</span>
              </button>
            </div>
          </>
        )}

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
