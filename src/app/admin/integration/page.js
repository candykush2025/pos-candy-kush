"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Link2,
  RefreshCw,
  Database,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  Package,
  Users,
  ShoppingCart,
  FolderTree,
  Clock,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { loyverseService } from "@/lib/api/loyverse";
import { dbService } from "@/lib/db/dbService";
import {
  setDocument,
  getDocuments,
  getDocument,
  updateDocument,
  COLLECTIONS,
} from "@/lib/firebase/firestore";
import { formatDate } from "@/lib/utils/format";

export default function IntegrationPage() {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState({
    categories: false,
    items: false,
    customers: false,
    receipts: false,
    paymentTypes: false,
    stock: false,
  });

  const [syncResults, setSyncResults] = useState({
    categories: null,
    items: null,
    customers: null,
    receipts: null,
    paymentTypes: null,
    stock: null,
  });

  // Last sync info for each type
  const [lastSyncInfo, setLastSyncInfo] = useState({
    categories: null,
    items: null,
    customers: null,
    receipts: null,
  });

  const [syncHistory, setSyncHistory] = useState([]);
  const [syncProgress, setSyncProgress] = useState({
    categories: { current: 0, total: 0, percentage: 0, status: "" },
    items: { current: 0, total: 0, percentage: 0, status: "" },
    customers: { current: 0, total: 0, percentage: 0, status: "" },
    receipts: { current: 0, total: 0, percentage: 0 },
    stock: { current: 0, total: 0, percentage: 0, status: "" },
  });
  // Default automatic sync to disabled in admin unless explicitly enabled in settings
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncIntervalMinutes, setSyncIntervalMinutes] = useState(30);
  const [isEditingInterval, setIsEditingInterval] = useState(false);
  const [lastAutoSyncCheck, setLastAutoSyncCheck] = useState(null);

  const [debugData, setDebugData] = useState(null);
  const [showDebugData, setShowDebugData] = useState(false);
  const [paymentTypes, setPaymentTypes] = useState(null);

  // Load sync settings and history on mount
  useEffect(() => {
    loadSyncSettings();
    loadSyncHistory();
    loadLastSyncInfo();
  }, []);

  // Auto-sync check every minute
  useEffect(() => {
    if (!autoSyncEnabled) return;

    const checkAutoSync = async () => {
      // Don't auto-sync if already syncing
      if (
        syncing.categories ||
        syncing.items ||
        syncing.customers ||
        syncing.receipts
      ) {
        console.log("⏭️ Skipping auto-sync: Sync already in progress");
        return;
      }

      const history = await loadSyncHistory();
      if (history.length === 0) {
        console.log("ℹ️ No sync history found, running first auto-sync");
        toast.info("Running first auto-sync from Loyverse...");
        await handleSyncCategories(true);
        await handleSyncItems(true);
        await handleSyncCustomers(true);
        return;
      }

      // Find the most recent successful sync
      const lastSuccess = history.find((h) => h.success);
      if (!lastSuccess) {
        console.log("ℹ️ No successful sync found in history");
        return;
      }

      const lastSyncTime = new Date(lastSuccess.timestamp);
      const now = new Date();
      const minutesSinceSync = (now - lastSyncTime) / (1000 * 60);

      setLastAutoSyncCheck(now);

      console.log(
        `⏱️ Time since last sync: ${minutesSinceSync.toFixed(
          1
        )} minutes (interval: ${syncIntervalMinutes} minutes)`
      );

      if (minutesSinceSync >= syncIntervalMinutes) {
        console.log(
          `🔄 Auto-sync triggered: ${minutesSinceSync.toFixed(
            1
          )} minutes since last sync (threshold: ${syncIntervalMinutes} minutes)`
        );
        toast.info("Auto-syncing data from Loyverse...");

        // Auto-sync all data sequentially
        try {
          await handleSyncCategories(true);
          await handleSyncItems(true);
          await handleSyncCustomers(true);
          console.log("✅ Auto-sync completed successfully");
        } catch (error) {
          console.error("❌ Auto-sync failed:", error);
        }
      }
    };

    // Run immediately on mount
    checkAutoSync();

    // Then check every minute
    const interval = setInterval(checkAutoSync, 60000);

    return () => clearInterval(interval);
  }, [autoSyncEnabled, syncIntervalMinutes, syncing]);

  // Load sync settings from Firebase
  const loadSyncSettings = async () => {
    try {
      const settings = await getDocument(COLLECTIONS.SETTINGS, "sync_settings");
      if (settings) {
        // If settings don't include the flag, default to disabled for safety
        setAutoSyncEnabled(settings.autoSyncEnabled ?? false);
        setSyncIntervalMinutes(settings.syncIntervalMinutes ?? 30);
      }
    } catch (error) {
      console.error("Error loading sync settings:", error);
    }
  };

  // Save sync settings to Firebase
  const saveSyncSettings = async () => {
    try {
      await setDocument(COLLECTIONS.SETTINGS, "sync_settings", {
        autoSyncEnabled,
        syncIntervalMinutes,
        updatedAt: new Date().toISOString(),
      });
      toast.success("Sync settings saved!");
      setIsEditingInterval(false);
    } catch (error) {
      console.error("Error saving sync settings:", error);
      toast.error("Failed to save settings");
    }
  };

  // Load last sync info for each type
  const loadLastSyncInfo = async () => {
    try {
      const history = await getDocuments(COLLECTIONS.SYNC_HISTORY, {
        orderBy: ["timestamp", "desc"],
        limit: 100, // Get more to find last of each type
      });

      const lastSync = {
        categories: history.find((h) => h.type === "categories"),
        items: history.find((h) => h.type === "items"),
        customers: history.find((h) => h.type === "customers"),
        receipts: history.find((h) => h.type === "receipts"),
      };

      setLastSyncInfo(lastSync);
    } catch (error) {
      console.error("Error loading last sync info:", error);
    }
  };

  // Load sync history from Firebase
  const loadSyncHistory = async () => {
    try {
      const history = await getDocuments(COLLECTIONS.SYNC_HISTORY, {
        orderBy: ["timestamp", "desc"],
        limit: 20,
      });
      setSyncHistory(history);
      return history;
    } catch (error) {
      console.error("Error loading sync history:", error);
      return [];
    }
  };

  // Save sync history to Firebase
  const saveSyncHistory = async (
    type,
    success,
    count,
    error = null,
    isAutoSync = false
  ) => {
    try {
      const historyEntry = {
        type,
        success,
        count: count || 0,
        error: error || null,
        timestamp: new Date().toISOString(),
        autoSync: isAutoSync,
      };

      await setDocument(
        COLLECTIONS.SYNC_HISTORY,
        `${type}-${Date.now()}`,
        historyEntry
      );

      await loadSyncHistory();
      await loadLastSyncInfo(); // Update last sync info
    } catch (err) {
      console.error("Error saving sync history:", err);
    }
  };

  // Helper function to check if data needs update
  const needsUpdate = (existing, newData) => {
    if (!existing) return true; // No existing data, needs insert

    // Check if updatedAt is different (Loyverse timestamp)
    if (existing.updatedAt !== newData.updatedAt) return true;

    // For products, also check key fields that might change
    if (newData.price !== undefined && existing.price !== newData.price)
      return true;
    if (newData.name !== undefined && existing.name !== newData.name)
      return true;
    if (
      newData.categoryId !== undefined &&
      existing.categoryId !== newData.categoryId
    )
      return true;

    return false; // No significant changes detected
  };

  // Smart sync: Only update changed documents (OPTIMIZED - Batch reads)
  const smartSync = async (collectionName, documents, idField = "id") => {
    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    try {
      // OPTIMIZATION: Fetch ALL existing documents at once instead of one-by-one
      console.log(
        `📥 Fetching existing ${collectionName} documents for comparison...`
      );
      const existingDocs = await getDocuments(collectionName);

      // Create a hash map for O(1) lookups
      const existingMap = new Map();
      existingDocs.forEach((doc) => {
        existingMap.set(doc[idField], doc);
      });

      console.log(
        `✅ Loaded ${existingDocs.length} existing documents into memory`
      );

      // Process documents in batches for better performance
      const batchSize = 50;
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        const promises = batch.map(async (doc) => {
          try {
            const docId = doc[idField];
            const existing = existingMap.get(docId);

            if (needsUpdate(existing, doc)) {
              // For products collection: preserve stock data
              let docToSave = { ...doc };
              if (collectionName === COLLECTIONS.PRODUCTS && existing) {
                // Preserve existing stock if:
                // 1. Product was manually synced (has lastInventorySync), OR
                // 2. Product has existing stock value and new sync doesn't include stock data
                const hasManualSync = existing.lastInventorySync;
                const hasExistingStock =
                  existing.stock !== undefined && existing.stock !== null;
                const newSyncHasNoStock =
                  doc.stock === undefined || doc.stock === null;

                if (hasManualSync || (hasExistingStock && newSyncHasNoStock)) {
                  docToSave.stock = existing.stock;
                  if (
                    existing.inStock !== undefined &&
                    existing.inStock !== null
                  )
                    docToSave.inStock = existing.inStock;
                  if (
                    existing.inventoryLevels !== undefined &&
                    existing.inventoryLevels !== null
                  )
                    docToSave.inventoryLevels = existing.inventoryLevels;
                  if (
                    existing.lastInventorySync !== undefined &&
                    existing.lastInventorySync !== null
                  )
                    docToSave.lastInventorySync = existing.lastInventorySync;
                }
              }

              await setDocument(collectionName, docId, docToSave);
              if (existing) {
                return { type: "updated" };
              } else {
                return { type: "new" };
              }
            } else {
              return { type: "skipped" };
            }
          } catch (error) {
            console.error(`Error syncing document ${doc[idField]}:`, error);
            return { type: "error" };
          }
        });

        const results = await Promise.all(promises);

        // Count results
        results.forEach((result) => {
          if (result.type === "new") newCount++;
          else if (result.type === "updated") updatedCount++;
          else if (result.type === "skipped") skippedCount++;
        });

        console.log(
          `📦 Processed batch ${Math.floor(i / batchSize) + 1}: ${
            results.length
          } documents (New: ${newCount}, Updated: ${updatedCount}, Skipped: ${skippedCount})`
        );
      }
    } catch (error) {
      console.error("Error in smartSync:", error);
      throw error;
    }

    return { newCount, updatedCount, skippedCount, total: documents.length };
  };

  // Test API Connection
  const handleTestConnection = async () => {
    setLoading(true);
    try {
      const response = await loyverseService.getCategories({ limit: 1 });
      toast.success("✅ Connection successful!");
      console.log("Loyverse API Test Response:", response);
      setDebugData(response);
      setShowDebugData(true);
    } catch (error) {
      console.error("Connection test failed:", error);
      toast.error(`❌ Connection failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Sync Categories
  const handleSyncCategories = async (isAutoSync = false) => {
    setSyncing({ ...syncing, categories: true });
    setSyncProgress({
      ...syncProgress,
      categories: {
        current: 0,
        total: 0,
        percentage: 0,
        status: "Starting...",
      },
    });

    try {
      // Update progress: Fetching
      setSyncProgress({
        ...syncProgress,
        categories: {
          current: 0,
          total: 0,
          percentage: 10,
          status: "Fetching from Loyverse...",
        },
      });

      // Fetch all categories from Loyverse
      const response = await loyverseService.getAllCategories({
        show_deleted: false,
      });

      console.log("Loyverse Categories:", response);

      // Update progress: Transforming
      const totalCategories = response.categories.length;
      setSyncProgress({
        ...syncProgress,
        categories: {
          current: 0,
          total: totalCategories,
          percentage: 30,
          status: `Transforming ${totalCategories} categories...`,
        },
      });

      // Transform to our format
      const categories = response.categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        color: cat.color || "#808080",
        createdAt: cat.created_at,
        updatedAt: cat.updated_at,
        deletedAt: cat.deleted_at,
        source: "loyverse",
      }));

      // Update progress: Syncing
      setSyncProgress({
        ...syncProgress,
        categories: {
          current: 0,
          total: totalCategories,
          percentage: 50,
          status: `Syncing ${totalCategories} categories to Firebase...`,
        },
      });

      // Smart sync: Only update changed documents
      console.log(
        `📤 Smart syncing ${categories.length} categories to Firebase...`
      );
      const syncStats = await smartSync(COLLECTIONS.CATEGORIES, categories);

      // Update progress: Complete
      setSyncProgress({
        ...syncProgress,
        categories: {
          current: totalCategories,
          total: totalCategories,
          percentage: 100,
          status: "Sync complete!",
        },
      });

      console.log(
        `✅ Sync complete: ${syncStats.newCount} new, ${syncStats.updatedCount} updated, ${syncStats.skippedCount} skipped`
      );

      const result = {
        success: true,
        count: categories.length,
        newCount: syncStats.newCount,
        updatedCount: syncStats.updatedCount,
        skippedCount: syncStats.skippedCount,
        timestamp: new Date().toISOString(),
      };

      setSyncResults({
        ...syncResults,
        categories: result,
      });

      // Save to history
      await saveSyncHistory(
        "categories",
        true,
        syncStats.newCount + syncStats.updatedCount,
        null,
        isAutoSync
      );

      if (!isAutoSync) {
        toast.success(
          `✅ Synced categories: ${syncStats.newCount} new, ${syncStats.updatedCount} updated, ${syncStats.skippedCount} unchanged`
        );
      }
      setDebugData(response);
      setShowDebugData(true);
    } catch (error) {
      console.error("Category sync failed:", error);

      const result = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };

      setSyncResults({
        ...syncResults,
        categories: result,
      });

      // Save error to history
      await saveSyncHistory("categories", false, 0, error.message, isAutoSync);

      if (!isAutoSync) {
        toast.error(`❌ Sync failed: ${error.message}`);
      }
    } finally {
      setSyncing({ ...syncing, categories: false });
      // Reset progress after a delay
      setTimeout(() => {
        setSyncProgress((prev) => ({
          ...prev,
          categories: { current: 0, total: 0, percentage: 0, status: "" },
        }));
      }, 3000);
    }
  };

  // Sync Items (Products)
  const handleSyncItems = async (isAutoSync = false) => {
    setSyncing({ ...syncing, items: true });
    setSyncProgress({
      ...syncProgress,
      items: { current: 0, total: 0, percentage: 0, status: "Starting..." },
    });

    try {
      // Update progress: Fetching
      setSyncProgress({
        ...syncProgress,
        items: {
          current: 0,
          total: 0,
          percentage: 10,
          status: "Fetching from Loyverse...",
        },
      });

      const response = await loyverseService.getAllItems({
        show_deleted: false,
      });

      console.log("Loyverse Items:", response);

      // Update progress: Transforming
      const totalItems = response.items.length;
      setSyncProgress({
        ...syncProgress,
        items: {
          current: 0,
          total: totalItems,
          percentage: 30,
          status: `Transforming ${totalItems} items...`,
        },
      });

      // Transform to our format (matching Loyverse Items API)
      const items = response.items.map((item) => {
        // Get the first variant (most items have at least one)
        const primaryVariant = item.variants?.[0] || {};

        return {
          // Item basic info
          id: item.id,
          handle: item.handle || "",
          name: item.item_name || "",
          description: item.description || "",
          referenceId: item.reference_id || "",

          // Category and tracking
          categoryId: item.category_id || null,
          trackStock: item.track_stock || false,
          soldByWeight: item.sold_by_weight || false,
          isComposite: item.is_composite || false,
          useProduction: item.use_production || false,

          // Visual and organization
          form: item.form || null,
          color: item.color || null,
          imageUrl: item.image_url || null,

          // Options
          option1Name: item.option1_name || null,
          option2Name: item.option2_name || null,
          option3Name: item.option3_name || null,

          // Primary variant data (for quick access)
          variantId: primaryVariant.variant_id || null,
          sku: primaryVariant.sku || "",
          barcode: primaryVariant.barcode || "",
          price: parseFloat(primaryVariant.default_price || 0),
          cost: parseFloat(primaryVariant.cost || 0),
          purchaseCost: parseFloat(primaryVariant.purchase_cost || 0),
          pricingType: primaryVariant.default_pricing_type || "FIXED",

          // Stock info - only set if stock tracking is enabled AND stock data exists
          // This prevents overwriting existing stock with 0 when Loyverse doesn't have stock data
          ...(item.track_stock &&
          primaryVariant.stores?.[0]?.stock_quantity !== undefined
            ? { stock: primaryVariant.stores[0].stock_quantity }
            : {}),
          availableForSale:
            primaryVariant.stores?.[0]?.available_for_sale !== false,

          // All variants data (for multi-variant items)
          variants: item.variants || [],

          // IDs references
          primarySupplierId: item.primary_supplier_id || null,
          taxIds: item.tax_ids || [],
          modifiersIds: item.modifiers_ids || [],
          components: item.components || [],

          // Timestamps
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          deletedAt: item.deleted_at || null,

          // Source tracking
          source: "loyverse",
        };
      });

      // Update progress: Syncing
      setSyncProgress({
        ...syncProgress,
        items: {
          current: 0,
          total: totalItems,
          percentage: 50,
          status: `Syncing ${totalItems} items to Firebase...`,
        },
      });

      // Smart sync: Only update changed documents
      console.log(`📤 Smart syncing ${items.length} items to Firebase...`);
      const syncStats = await smartSync(COLLECTIONS.PRODUCTS, items);

      // Update progress: Complete
      setSyncProgress({
        ...syncProgress,
        items: {
          current: totalItems,
          total: totalItems,
          percentage: 100,
          status: "Sync complete!",
        },
      });

      console.log(
        `✅ Sync complete: ${syncStats.newCount} new, ${syncStats.updatedCount} updated, ${syncStats.skippedCount} skipped`
      );

      const result = {
        success: true,
        count: items.length,
        newCount: syncStats.newCount,
        updatedCount: syncStats.updatedCount,
        skippedCount: syncStats.skippedCount,
        timestamp: new Date().toISOString(),
      };

      setSyncResults({
        ...syncResults,
        items: result,
      });

      // Save to history
      await saveSyncHistory(
        "items",
        true,
        syncStats.newCount + syncStats.updatedCount,
        null,
        isAutoSync
      );

      if (!isAutoSync) {
        toast.success(
          `✅ Synced items: ${syncStats.newCount} new, ${syncStats.updatedCount} updated, ${syncStats.skippedCount} unchanged`
        );
      }
      setDebugData(response);
      setShowDebugData(true);
    } catch (error) {
      console.error("Items sync failed:", error);

      const result = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };

      setSyncResults({
        ...syncResults,
        items: result,
      });

      // Save error to history
      await saveSyncHistory("items", false, 0, error.message, isAutoSync);

      if (!isAutoSync) {
        toast.error(`❌ Sync failed: ${error.message}`);
      }
    } finally {
      setSyncing({ ...syncing, items: false });
      // Reset progress after a delay
      setTimeout(() => {
        setSyncProgress((prev) => ({
          ...prev,
          items: { current: 0, total: 0, percentage: 0, status: "" },
        }));
      }, 3000);
    }
  };

  // Sync Customers
  const handleSyncCustomers = async (isAutoSync = false) => {
    setSyncing({ ...syncing, customers: true });
    setSyncProgress({
      ...syncProgress,
      customers: { current: 0, total: 0, percentage: 0, status: "Starting..." },
    });

    try {
      // Update progress: Fetching
      setSyncProgress({
        ...syncProgress,
        customers: {
          current: 0,
          total: 0,
          percentage: 10,
          status: "Fetching from Loyverse...",
        },
      });

      const response = await loyverseService.getAllCustomers();

      console.log("Loyverse Customers:", response);

      // Update progress: Transforming
      const totalCustomers = response.customers.length;
      setSyncProgress({
        ...syncProgress,
        customers: {
          current: 0,
          total: totalCustomers,
          percentage: 30,
          status: `Transforming ${totalCustomers} customers...`,
        },
      });

      // Transform to our format (matching Loyverse API response structure)
      const customers = response.customers.map((cust) => ({
        id: cust.id,
        name: cust.name || "",
        customerCode: cust.customer_code || "",
        email: cust.email || "",
        phone: cust.phone_number || "",
        address: cust.address || "",
        city: cust.city || "",
        province: cust.region || "",
        postalCode: cust.postal_code || "",
        countryCode: cust.country_code || "",
        note: cust.note || "",
        // Visit and spending data
        firstVisit: cust.first_visit || null,
        lastVisit: cust.last_visit || null,
        totalVisits: parseInt(cust.total_visits || 0),
        totalSpent: parseFloat(cust.total_spent || 0),
        totalPoints: parseFloat(cust.total_points || 0),
        // Timestamps
        createdAt: cust.created_at,
        updatedAt: cust.updated_at,
        deletedAt: cust.deleted_at || null,
        permanentDeletionAt: cust.permanent_deletion_at || null,
        // Source tracking
        source: "loyverse",
      }));

      // Update progress: Syncing
      setSyncProgress({
        ...syncProgress,
        customers: {
          current: 0,
          total: totalCustomers,
          percentage: 50,
          status: `Syncing ${totalCustomers} customers to Firebase...`,
        },
      });

      // Smart sync: Only update changed documents
      console.log(
        `📤 Smart syncing ${customers.length} customers to Firebase...`
      );
      const syncStats = await smartSync(COLLECTIONS.CUSTOMERS, customers);

      // Also save to IndexedDB for offline access
      console.log(`💾 Saving ${customers.length} customers to IndexedDB...`);
      await dbService.upsertCustomers(customers);

      // Update progress: Complete
      setSyncProgress({
        ...syncProgress,
        customers: {
          current: totalCustomers,
          total: totalCustomers,
          percentage: 100,
          status: "Sync complete!",
        },
      });

      console.log(
        `✅ Sync complete: ${syncStats.newCount} new, ${syncStats.updatedCount} updated, ${syncStats.skippedCount} skipped`
      );

      const result = {
        success: true,
        count: customers.length,
        newCount: syncStats.newCount,
        updatedCount: syncStats.updatedCount,
        skippedCount: syncStats.skippedCount,
        timestamp: new Date().toISOString(),
      };

      setSyncResults({
        ...syncResults,
        customers: result,
      });

      // Save to history
      await saveSyncHistory(
        "customers",
        true,
        syncStats.newCount + syncStats.updatedCount,
        null,
        isAutoSync
      );

      if (!isAutoSync) {
        toast.success(
          `✅ Synced customers: ${syncStats.newCount} new, ${syncStats.updatedCount} updated, ${syncStats.skippedCount} unchanged`
        );
      }
      setDebugData(response);
      setShowDebugData(true);
    } catch (error) {
      console.error("Customers sync failed:", error);

      const result = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };

      setSyncResults({
        ...syncResults,
        customers: result,
      });

      // Save error to history
      await saveSyncHistory("customers", false, 0, error.message, isAutoSync);

      if (!isAutoSync) {
        toast.error(`❌ Sync failed: ${error.message}`);
      }
    } finally {
      setSyncing({ ...syncing, customers: false });
      // Reset progress after a delay
      setTimeout(() => {
        setSyncProgress((prev) => ({
          ...prev,
          customers: { current: 0, total: 0, percentage: 0, status: "" },
        }));
      }, 3000);
    }
  };

  // Sync Stock from Loyverse
  const handleSyncStock = async (isAutoSync = false) => {
    setSyncing({ ...syncing, stock: true });
    setSyncProgress({
      ...syncProgress,
      stock: { current: 0, total: 0, percentage: 0, status: "Starting..." },
    });

    try {
      // Step 1: Fetch inventory from Loyverse (using Inventory API, not Items API)
      setSyncProgress({
        ...syncProgress,
        stock: {
          current: 0,
          total: 0,
          percentage: 10,
          status: "Fetching inventory from Loyverse...",
        },
      });

      const inventoryResponse = await loyverseService.getAllInventory();

      console.log(
        `📦 Fetched ${inventoryResponse.total} inventory levels from Loyverse`
      );

      // Step 2: Fetch products from Firebase
      setSyncProgress({
        ...syncProgress,
        stock: {
          current: 0,
          total: inventoryResponse.total,
          percentage: 20,
          status: "Loading products from Firebase...",
        },
      });

      const firebaseProducts = await getDocuments(COLLECTIONS.PRODUCTS);

      // Create a map of products by variant_id for quick lookup
      const productByVariantId = {};
      const productByItemId = {};

      firebaseProducts.forEach((prod) => {
        if (prod.variantId) {
          productByVariantId[prod.variantId] = prod;
        }
        productByItemId[prod.id] = prod;
      });

      let adjustedCount = 0;
      let unchangedCount = 0;
      let notFoundCount = 0;
      const adjustments = [];

      // Import stockHistoryService
      const { stockHistoryService } = await import(
        "@/lib/firebase/stockHistoryService"
      );

      // Step 3: Process inventory levels
      setSyncProgress({
        ...syncProgress,
        stock: {
          current: 0,
          total: inventoryResponse.total,
          percentage: 30,
          status: "Comparing stock levels...",
        },
      });

      // Group inventory by variant_id and sum stock across all stores
      const variantStockMap = {};
      inventoryResponse.inventory_levels.forEach((inv) => {
        if (!variantStockMap[inv.variant_id]) {
          variantStockMap[inv.variant_id] = 0;
        }
        variantStockMap[inv.variant_id] += inv.in_stock || 0;
      });

      const variantIds = Object.keys(variantStockMap);
      const totalVariants = variantIds.length;

      console.log(
        `📊 Processing ${totalVariants} unique variants (${inventoryResponse.total} total inventory levels)`
      );

      // Compare stock levels and adjust
      for (let i = 0; i < variantIds.length; i++) {
        const variantId = variantIds[i];
        const loyverseStock = variantStockMap[variantId];

        // Update progress
        const currentProgress = 30 + (i / totalVariants) * 60;
        setSyncProgress({
          ...syncProgress,
          stock: {
            current: i + 1,
            total: totalVariants,
            percentage: Math.round(currentProgress),
            status: `Processing ${i + 1}/${totalVariants} variants...`,
          },
        });

        // Find the product in Firebase by variant_id
        const firebaseProduct = productByVariantId[variantId];

        if (!firebaseProduct) {
          console.warn(
            `⚠️ Product not found for variant_id: ${variantId} (stock: ${loyverseStock})`
          );
          notFoundCount++;
          continue;
        }

        const firebaseStock = firebaseProduct.stock || 0;

        // Check if stock differs
        if (loyverseStock !== firebaseStock) {
          const difference = loyverseStock - firebaseStock;

          // Update stock in Firebase
          await updateDocument(COLLECTIONS.PRODUCTS, firebaseProduct.id, {
            stock: loyverseStock,
            inStock: loyverseStock,
            lastInventorySync: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          // Log stock adjustment in history
          await stockHistoryService.logStockMovement({
            productId: firebaseProduct.id,
            productName: firebaseProduct.name || "",
            productSku: firebaseProduct.sku || "",
            type: "adjustment",
            quantity: difference,
            previousStock: firebaseStock,
            newStock: loyverseStock,
            reason: "Stock sync from Loyverse",
            referenceId: `loyverse-sync-${new Date().getTime()}`,
            userId: "system",
            userName: "Auto Sync",
          });

          adjustments.push({
            id: firebaseProduct.id,
            name: firebaseProduct.name,
            sku: firebaseProduct.sku,
            oldStock: firebaseStock,
            newStock: loyverseStock,
            difference,
          });

          adjustedCount++;
        } else {
          unchangedCount++;
        }
      }

      // Step 4: Finalizing
      setSyncProgress({
        ...syncProgress,
        stock: {
          current: totalVariants,
          total: totalVariants,
          percentage: 95,
          status: "Saving sync history...",
        },
      });

      const result = {
        success: true,
        total: totalVariants,
        adjustedCount,
        unchangedCount,
        notFoundCount,
        adjustments,
        timestamp: new Date().toISOString(),
      };

      setSyncResults({
        ...syncResults,
        stock: result,
      });

      // Save to history
      await saveSyncHistory("stock", true, adjustedCount, null, isAutoSync);

      // Step 5: Complete
      setSyncProgress({
        ...syncProgress,
        stock: {
          current: totalVariants,
          total: totalVariants,
          percentage: 100,
          status: "Complete!",
        },
      });

      if (!isAutoSync) {
        if (adjustedCount > 0) {
          toast.success(
            `✅ Stock sync complete: ${adjustedCount} adjusted, ${unchangedCount} unchanged${
              notFoundCount > 0
                ? `, ${notFoundCount} not found in Firebase`
                : ""
            }`
          );
        } else {
          toast.success(`✅ Stock sync complete: All stock levels match`);
        }
      }
    } catch (error) {
      console.error("Stock sync failed:", error);

      setSyncProgress({
        ...syncProgress,
        stock: {
          current: 0,
          total: 0,
          percentage: 0,
          status: `Error: ${error.message}`,
        },
      });

      const result = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };

      setSyncResults({
        ...syncResults,
        stock: result,
      });

      // Save error to history
      await saveSyncHistory("stock", false, 0, error.message, isAutoSync);

      if (!isAutoSync) {
        toast.error(`❌ Stock sync failed: ${error.message}`);
      }
    } finally {
      setSyncing({ ...syncing, stock: false });
    }
  };

  // Sync Receipts (Orders)
  const handleSyncReceipts = async (quickSync = false) => {
    setSyncing({ ...syncing, receipts: true });
    setSyncProgress({
      ...syncProgress,
      receipts: { current: 0, total: 0, percentage: 0 },
    });

    try {
      // Determine sync mode
      let created_at_min = null;

      if (quickSync) {
        // Quick sync: Only fetch receipts since last sync
        const lastSync = await getDocument(
          COLLECTIONS.SYNC_HISTORY,
          "latest_receipt_sync"
        );

        if (lastSync && lastSync.timestamp) {
          created_at_min = lastSync.timestamp;
          console.log(
            `⚡ Quick sync: Fetching receipts created after ${created_at_min}`
          );
          toast.info("Quick syncing latest receipts only...", {
            id: "receipt-fetch",
          });
        } else {
          console.log("ℹ️ No previous sync found, doing full sync");
          toast.info("No previous sync found. Doing full sync...", {
            id: "receipt-fetch",
          });
          quickSync = false; // Force full sync if no history
        }
      } else {
        console.log("🔄 Starting full receipt sync with progress tracking...");
        toast.info("Fetching all receipts from Loyverse...", {
          id: "receipt-fetch",
        });
      }

      const allReceipts = [];
      let cursor = null;
      let hasMore = true;

      while (hasMore) {
        const requestParams = {
          limit: 250,
          cursor: cursor,
        };

        // Add created_at_min for quick sync
        if (created_at_min) {
          requestParams.created_at_min = created_at_min;
        }

        const response = await loyverseService.getReceipts(requestParams);

        const receipts = response.receipts || [];
        allReceipts.push(...receipts);

        // Update progress
        const currentCount = allReceipts.length;
        setSyncProgress({
          ...syncProgress,
          receipts: {
            current: currentCount,
            total: currentCount, // We don't know total yet
            percentage: 0,
          },
        });

        toast.info(`Fetching receipts: ${currentCount} fetched...`, {
          id: "receipt-fetch",
        });

        // Check if there are more pages
        cursor = response.cursor || null;
        hasMore = !!cursor;
      }

      toast.dismiss("receipt-fetch");
      console.log(`✅ Fetched ${allReceipts.length} receipts from Loyverse`);

      // Now save to Firebase with progress
      const totalReceipts = allReceipts.length;
      let savedCount = 0;

      toast.info("Saving receipts to Firebase...", { id: "receipt-save" });

      // Transform and save receipts to Firebase
      const receipts = allReceipts.map((receipt) => ({
        // Receipt identification
        receiptNumber: receipt.receipt_number,
        receiptType: receipt.receipt_type,
        refundFor: receipt.refund_for || null,
        order: receipt.order || null,

        // Dates
        createdAt: receipt.created_at,
        receiptDate: receipt.receipt_date,
        updatedAt: receipt.updated_at,
        cancelledAt: receipt.cancelled_at || null,

        // Source and location
        source: receipt.source || "loyverse",
        storeId: receipt.store_id,
        posDeviceId: receipt.pos_device_id || null,
        diningOption: receipt.dining_option || null,

        // Totals
        totalMoney: parseFloat(receipt.total_money || 0),
        totalTax: parseFloat(receipt.total_tax || 0),
        totalDiscount: parseFloat(receipt.total_discount || 0),
        tip: parseFloat(receipt.tip || 0),
        surcharge: parseFloat(receipt.surcharge || 0),

        // Customer and employee
        customerId: receipt.customer_id || null,
        employeeId: receipt.employee_id || null,

        // Points
        pointsEarned: parseFloat(receipt.points_earned || 0),
        pointsDeducted: parseFloat(receipt.points_deducted || 0),
        pointsBalance: parseFloat(receipt.points_balance || 0),

        // Details
        note: receipt.note || null,
        lineItems: receipt.line_items || [],
        payments: receipt.payments || [],
        totalDiscounts: receipt.total_discounts || [],
        totalTaxes: receipt.total_taxes || [],

        // Metadata
        syncedAt: new Date().toISOString(),
      }));

      // Save to Firebase Firestore (receipts collection) with progress tracking
      console.log(
        `📤 Smart syncing ${receipts.length} receipts to Firebase...`
      );

      let newCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      for (let i = 0; i < receipts.length; i++) {
        const receipt = receipts[i];

        // Check if receipt already exists and needs update
        const existing = await getDocument(
          COLLECTIONS.RECEIPTS,
          receipt.receiptNumber
        );

        if (needsUpdate(existing, receipt)) {
          await setDocument(
            COLLECTIONS.RECEIPTS,
            receipt.receiptNumber,
            receipt
          );
          if (existing) {
            updatedCount++;
          } else {
            newCount++;
          }
        } else {
          skippedCount++;
        }

        savedCount++;
        const percentage = Math.round((savedCount / totalReceipts) * 100);

        // Update progress state
        setSyncProgress({
          ...syncProgress,
          receipts: {
            current: savedCount,
            total: totalReceipts,
            percentage: percentage,
          },
        });

        // Update toast every 10% or on last item
        if (
          savedCount % Math.ceil(totalReceipts / 10) === 0 ||
          savedCount === totalReceipts
        ) {
          toast.info(
            `Syncing receipts: ${percentage}% (${savedCount}/${totalReceipts})`,
            {
              id: "receipt-save",
            }
          );
        }
      }

      toast.dismiss("receipt-save");
      console.log(
        `✅ Sync complete: ${newCount} new, ${updatedCount} updated, ${skippedCount} skipped`
      );

      const syncTimestamp = new Date().toISOString();

      const result = {
        success: true,
        count: receipts.length,
        newCount,
        updatedCount,
        skippedCount,
        timestamp: syncTimestamp,
        syncType: quickSync ? "quick" : "full",
      };

      setSyncResults({
        ...syncResults,
        receipts: result,
      });

      // Save to history
      await saveSyncHistory(
        "receipts",
        true,
        newCount + updatedCount,
        null,
        false
      );

      // Save latest receipt sync timestamp for quick sync
      await setDocument(COLLECTIONS.SYNC_HISTORY, "latest_receipt_sync", {
        timestamp: syncTimestamp,
        count: receipts.length,
        newCount,
        updatedCount,
        skippedCount,
        syncType: quickSync ? "quick" : "full",
      });

      console.log(`💾 Saved latest receipt sync timestamp: ${syncTimestamp}`);

      // Reset progress
      setSyncProgress({
        ...syncProgress,
        receipts: { current: 0, total: 0, percentage: 0 },
      });

      const syncTypeLabel = quickSync ? "⚡ Quick sync" : "✅ Full sync";
      toast.success(
        `${syncTypeLabel} complete: ${newCount} new, ${updatedCount} updated, ${skippedCount} unchanged`
      );
      setDebugData({ receipts: allReceipts });
      setShowDebugData(true);
    } catch (error) {
      console.error("Receipts sync failed:", error);

      const result = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };

      setSyncResults({
        ...syncResults,
        receipts: result,
      });

      // Save error to history
      await saveSyncHistory("receipts", false, 0, error.message, false);

      // Reset progress
      setSyncProgress({
        ...syncProgress,
        receipts: { current: 0, total: 0, percentage: 0 },
      });

      toast.error(`❌ Sync failed: ${error.message}`);
    } finally {
      setSyncing({ ...syncing, receipts: false });
    }
  };

  // Get Payment Types
  const handleGetPaymentTypes = async () => {
    setSyncing({ ...syncing, paymentTypes: true });
    try {
      console.log("📡 Fetching payment types from Loyverse...");
      const response = await loyverseService.getAllPaymentTypes({
        show_deleted: false,
      });

      console.log("Loyverse Payment Types:", response);
      setPaymentTypes(response.payment_types);

      setSyncResults({
        ...syncResults,
        paymentTypes: {
          success: true,
          count: response.payment_types?.length || 0,
          timestamp: new Date().toISOString(),
        },
      });

      toast.success(
        `✅ Found ${response.payment_types?.length || 0} payment types`
      );
      setDebugData(response);
      setShowDebugData(true);
    } catch (error) {
      console.error("Payment types fetch failed:", error);
      toast.error(`❌ Failed: ${error.message}`);
      setSyncResults({
        ...syncResults,
        paymentTypes: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    } finally {
      setSyncing({ ...syncing, paymentTypes: false });
    }
  };

  // Sync All
  const handleSyncAll = async () => {
    toast.info("Starting full sync...");
    await handleSyncCategories(false);
    await handleSyncItems(false);
    await handleSyncCustomers(false);
    // Note: Not including receipts in auto-sync due to large dataset
    toast.success("🎉 Full sync completed!");
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Link2 className="h-6 w-6 md:h-8 md:w-8 text-primary" />
          Loyverse Integration
        </h1>
        <p className="text-sm md:text-base text-neutral-500 mt-1 md:mt-2">
          Sync data from Loyverse POS to your local database
        </p>
      </div>

      {/* API Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-base md:text-lg">
              <Database className="h-5 w-5 md:h-6 md:w-6" />
              API Connection
            </span>
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-800 text-sm"
            >
              Ready
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-neutral-500 mb-1">API Endpoint:</p>
              <p className="font-mono text-xs break-all">
                https://api.loyverse.com/v1.0
              </p>
            </div>
            <div>
              <p className="text-neutral-500 mb-1">Access Token:</p>
              <p className="font-mono text-xs">d390d2...c2b8 ✅</p>
            </div>
          </div>
          <Button
            onClick={handleTestConnection}
            disabled={loading}
            variant="outline"
            className="w-full h-12 md:h-10 text-base"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 md:h-4 md:w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                Test Connection
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Auto-Sync Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-base md:text-lg">
              <Clock className="h-5 w-5 md:h-6 md:w-6" />
              Automatic Sync
            </span>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-neutral-600">
                {autoSyncEnabled ? "Enabled" : "Disabled"}
              </span>
              <input
                type="checkbox"
                checked={autoSyncEnabled}
                onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                className="w-10 h-6 rounded-full appearance-none bg-neutral-300 checked:bg-green-500 relative transition-colors cursor-pointer
                  after:content-[''] after:absolute after:top-1 after:left-1 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform
                  checked:after:translate-x-4"
              />
            </label>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center gap-4">
              <span className="text-neutral-600">Sync Interval:</span>
              {isEditingInterval ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="1440"
                    value={syncIntervalMinutes}
                    onChange={(e) =>
                      setSyncIntervalMinutes(parseInt(e.target.value) || 30)
                    }
                    className="w-20 h-8 text-sm"
                  />
                  <span className="text-xs text-neutral-500">min</span>
                  <Button
                    size="sm"
                    onClick={saveSyncSettings}
                    className="h-8 px-3"
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditingInterval(false);
                      loadSyncSettings();
                    }}
                    className="h-8 px-3"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingInterval(true)}
                  className="font-medium text-blue-600 hover:text-blue-700"
                >
                  {syncIntervalMinutes} minutes ✏️
                </button>
              )}
            </div>
            {syncHistory.length > 0 && syncHistory.find((h) => h.success) && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">
                    Last Successful Sync:
                  </span>
                  <span className="font-medium text-xs md:text-sm">
                    {(() => {
                      const lastSuccess = syncHistory.find((h) => h.success);
                      if (!lastSuccess) return "Never";
                      const lastTime = new Date(lastSuccess.timestamp);
                      const now = new Date();
                      const diffMinutes = Math.floor(
                        (now - lastTime) / (1000 * 60)
                      );
                      return diffMinutes < 60
                        ? `${diffMinutes} min ago`
                        : `${Math.floor(diffMinutes / 60)}h ${
                            diffMinutes % 60
                          }m ago`;
                    })()}
                  </span>
                </div>
                {autoSyncEnabled && (
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Next Auto-Sync:</span>
                    <span className="font-medium text-xs md:text-sm text-green-600">
                      {(() => {
                        const lastSuccess = syncHistory.find((h) => h.success);
                        if (!lastSuccess) return "Soon...";
                        const lastTime = new Date(lastSuccess.timestamp);
                        const now = new Date();
                        const diffMinutes = Math.floor(
                          (now - lastTime) / (1000 * 60)
                        );
                        const minutesUntilNext =
                          syncIntervalMinutes - diffMinutes;

                        if (minutesUntilNext <= 0) {
                          return "Due now! 🔄";
                        }

                        return minutesUntilNext < 60
                          ? `in ${minutesUntilNext} min`
                          : `in ${Math.floor(minutesUntilNext / 60)}h ${
                              minutesUntilNext % 60
                            }m`;
                      })()}
                    </span>
                  </div>
                )}
              </>
            )}
            <p className="text-xs text-neutral-500 pt-2 border-t">
              {autoSyncEnabled
                ? `Auto-syncs categories, items, and customers every ${syncIntervalMinutes} minutes when enabled. Check console for sync logs.`
                : "Enable to automatically sync data at regular intervals."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sync History */}
      {syncHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <History className="h-5 w-5 md:h-6 md:w-6" />
              Sync History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {syncHistory.map((entry, index) => {
                const entryDate = new Date(entry.timestamp);
                const icon =
                  entry.type === "categories"
                    ? FolderTree
                    : entry.type === "items"
                    ? Package
                    : entry.type === "customers"
                    ? Users
                    : ShoppingCart;
                const Icon = icon;

                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg border dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <Icon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm capitalize">
                          {entry.type}
                        </span>
                        {entry.autoSync && (
                          <Badge variant="outline" className="text-xs">
                            Auto
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500">
                        {entryDate.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.success ? (
                        <>
                          <span className="text-sm font-medium text-green-700">
                            {entry.count}
                          </span>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </>
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <FolderTree className="h-6 w-6 md:h-5 md:w-5 text-purple-600" />
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Last Sync Info */}
            {lastSyncInfo.categories && (
              <div className="p-3 rounded-lg border bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-700">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-neutral-600 dark:text-neutral-400">
                    Last Sync:
                  </span>
                  <span
                    className={
                      lastSyncInfo.categories.success
                        ? "text-green-600 dark:text-green-400 font-medium"
                        : "text-red-600 dark:text-red-400 font-medium"
                    }
                  >
                    {lastSyncInfo.categories.success ? "✓ Success" : "✗ Failed"}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {new Date(lastSyncInfo.categories.timestamp).toLocaleString()}
                </p>
                {lastSyncInfo.categories.success && (
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                    {lastSyncInfo.categories.count} items synced
                  </p>
                )}
              </div>
            )}

            {lastSyncInfo.categories && (
              <div className="p-3 rounded-lg border bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-700">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-neutral-600 dark:text-neutral-400">
                    Last Sync:
                  </span>
                  <span
                    className={
                      lastSyncInfo.categories.success
                        ? "text-green-600 dark:text-green-400 font-medium"
                        : "text-red-600 dark:text-red-400 font-medium"
                    }
                  >
                    {lastSyncInfo.categories.success ? "✓ Success" : "✗ Failed"}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {new Date(lastSyncInfo.categories.timestamp).toLocaleString()}
                </p>
                {lastSyncInfo.categories.success && (
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                    {lastSyncInfo.categories.count} categories synced
                  </p>
                )}
              </div>
            )}

            {/* Progress Bar */}
            {syncing.categories && syncProgress.categories && (
              <div className="space-y-2 p-3 rounded-lg border bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-purple-700 dark:text-purple-300 font-medium">
                    {syncProgress.categories.status}
                  </span>
                  <span className="text-purple-700 dark:text-purple-300 font-medium">
                    {syncProgress.categories.percentage}%
                  </span>
                </div>
                <div className="w-full bg-purple-200 dark:bg-purple-950 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-purple-600 dark:bg-purple-500 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${syncProgress.categories.percentage}%` }}
                  />
                </div>
                {syncProgress.categories.current > 0 &&
                  syncProgress.categories.total > 0 && (
                    <p className="text-xs text-purple-600 dark:text-purple-400">
                      {syncProgress.categories.current} /{" "}
                      {syncProgress.categories.total} categories processed
                    </p>
                  )}
              </div>
            )}

            {syncResults.categories && (
              <div
                className={`p-3 md:p-4 rounded-lg ${
                  syncResults.categories.success
                    ? "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
                }`}
              >
                <div className="flex items-center gap-2 text-sm md:text-base">
                  {syncResults.categories.success ? (
                    <CheckCircle className="h-5 w-5 md:h-4 md:w-4" />
                  ) : (
                    <AlertCircle className="h-5 w-5 md:h-4 md:w-4" />
                  )}
                  <span className="font-medium">
                    {syncResults.categories.success
                      ? `${syncResults.categories.count} total`
                      : "Sync failed"}
                  </span>
                </div>
                {syncResults.categories.success &&
                  syncResults.categories.newCount !== undefined && (
                    <div className="text-xs mt-2 space-y-1">
                      <div>🆕 {syncResults.categories.newCount} new</div>
                      <div>
                        🔄 {syncResults.categories.updatedCount} updated
                      </div>
                      <div>
                        ⏭️ {syncResults.categories.skippedCount} unchanged
                      </div>
                    </div>
                  )}
                <p className="text-xs md:text-sm mt-1">
                  {new Date(syncResults.categories.timestamp).toLocaleString()}
                </p>
              </div>
            )}
            <Button
              onClick={() => handleSyncCategories(false)}
              disabled={syncing.categories}
              className="w-full h-12 md:h-10 text-base"
              variant="outline"
            >
              {syncing.categories ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 md:h-4 md:w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                  Sync Categories
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Package className="h-6 w-6 md:h-5 md:w-5 text-blue-600" />
              Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Last Sync Info */}
            {lastSyncInfo.items && (
              <div className="p-3 rounded-lg border bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-700">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-neutral-600 dark:text-neutral-400">
                    Last Sync:
                  </span>
                  <span
                    className={
                      lastSyncInfo.items.success
                        ? "text-green-600 dark:text-green-400 font-medium"
                        : "text-red-600 dark:text-red-400 font-medium"
                    }
                  >
                    {lastSyncInfo.items.success ? "✓ Success" : "✗ Failed"}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {new Date(lastSyncInfo.items.timestamp).toLocaleString()}
                </p>
                {lastSyncInfo.items.success && (
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                    {lastSyncInfo.items.count} items synced
                  </p>
                )}
              </div>
            )}

            {lastSyncInfo.items && (
              <div className="p-3 rounded-lg border bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-700">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-neutral-600 dark:text-neutral-400">
                    Last Sync:
                  </span>
                  <span
                    className={
                      lastSyncInfo.items.success
                        ? "text-green-600 dark:text-green-400 font-medium"
                        : "text-red-600 dark:text-red-400 font-medium"
                    }
                  >
                    {lastSyncInfo.items.success ? "✓ Success" : "✗ Failed"}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {new Date(lastSyncInfo.items.timestamp).toLocaleString()}
                </p>
                {lastSyncInfo.items.success && (
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                    {lastSyncInfo.items.count} items synced
                  </p>
                )}
              </div>
            )}

            {/* Progress Bar */}
            {syncing.items && syncProgress.items && (
              <div className="space-y-2 p-3 rounded-lg border bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-blue-700 dark:text-blue-300 font-medium">
                    {syncProgress.items.status}
                  </span>
                  <span className="text-blue-700 dark:text-blue-300 font-medium">
                    {syncProgress.items.percentage}%
                  </span>
                </div>
                <div className="w-full bg-blue-200 dark:bg-blue-950 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${syncProgress.items.percentage}%` }}
                  />
                </div>
                {syncProgress.items.current > 0 &&
                  syncProgress.items.total > 0 && (
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      {syncProgress.items.current} / {syncProgress.items.total}{" "}
                      items processed
                    </p>
                  )}
              </div>
            )}

            {syncResults.items && (
              <div
                className={`p-3 md:p-4 rounded-lg ${
                  syncResults.items.success
                    ? "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
                }`}
              >
                <div className="flex items-center gap-2 text-sm md:text-base">
                  {syncResults.items.success ? (
                    <CheckCircle className="h-5 w-5 md:h-4 md:w-4" />
                  ) : (
                    <AlertCircle className="h-5 w-5 md:h-4 md:w-4" />
                  )}
                  <span className="font-medium">
                    {syncResults.items.success
                      ? `${syncResults.items.count} total`
                      : "Sync failed"}
                  </span>
                </div>
                {syncResults.items.success &&
                  syncResults.items.newCount !== undefined && (
                    <div className="text-xs mt-2 space-y-1">
                      <div>🆕 {syncResults.items.newCount} new</div>
                      <div>🔄 {syncResults.items.updatedCount} updated</div>
                      <div>⏭️ {syncResults.items.skippedCount} unchanged</div>
                    </div>
                  )}
                <p className="text-xs mt-1">
                  {new Date(syncResults.items.timestamp).toLocaleString()}
                </p>
              </div>
            )}
            <Button
              onClick={() => handleSyncItems(false)}
              disabled={syncing.items}
              className="w-full h-12 md:h-10 text-base"
              variant="outline"
            >
              {syncing.items ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 md:h-4 md:w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                  Sync Items
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Customers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Users className="h-6 w-6 md:h-5 md:w-5 text-green-600" />
              Customers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Last Sync Info */}
            {lastSyncInfo.customers && (
              <div className="p-3 rounded-lg border bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-700">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-neutral-600 dark:text-neutral-400">
                    Last Sync:
                  </span>
                  <span
                    className={
                      lastSyncInfo.customers.success
                        ? "text-green-600 dark:text-green-400 font-medium"
                        : "text-red-600 dark:text-red-400 font-medium"
                    }
                  >
                    {lastSyncInfo.customers.success ? "✓ Success" : "✗ Failed"}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {new Date(lastSyncInfo.customers.timestamp).toLocaleString()}
                </p>
                {lastSyncInfo.customers.success && (
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                    {lastSyncInfo.customers.count} customers synced
                  </p>
                )}
              </div>
            )}

            {lastSyncInfo.customers && (
              <div className="p-3 rounded-lg border bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-700">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-neutral-600 dark:text-neutral-400">
                    Last Sync:
                  </span>
                  <span
                    className={
                      lastSyncInfo.customers.success
                        ? "text-green-600 dark:text-green-400 font-medium"
                        : "text-red-600 dark:text-red-400 font-medium"
                    }
                  >
                    {lastSyncInfo.customers.success ? "✓ Success" : "✗ Failed"}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {new Date(lastSyncInfo.customers.timestamp).toLocaleString()}
                </p>
                {lastSyncInfo.customers.success && (
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                    {lastSyncInfo.customers.count} customers synced
                  </p>
                )}
              </div>
            )}

            {/* Progress Bar */}
            {syncing.customers && syncProgress.customers && (
              <div className="space-y-2 p-3 rounded-lg border bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-green-700 dark:text-green-300 font-medium">
                    {syncProgress.customers.status}
                  </span>
                  <span className="text-green-700 dark:text-green-300 font-medium">
                    {syncProgress.customers.percentage}%
                  </span>
                </div>
                <div className="w-full bg-green-200 dark:bg-green-950 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-green-600 dark:bg-green-500 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${syncProgress.customers.percentage}%` }}
                  />
                </div>
                {syncProgress.customers.current > 0 &&
                  syncProgress.customers.total > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {syncProgress.customers.current} /{" "}
                      {syncProgress.customers.total} customers processed
                    </p>
                  )}
              </div>
            )}

            {syncResults.customers && (
              <div
                className={`p-3 md:p-4 rounded-lg ${
                  syncResults.customers.success
                    ? "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
                }`}
              >
                <div className="flex items-center gap-2 text-sm md:text-base">
                  {syncResults.customers.success ? (
                    <CheckCircle className="h-5 w-5 md:h-4 md:w-4" />
                  ) : (
                    <AlertCircle className="h-5 w-5 md:h-4 md:w-4" />
                  )}
                  <span className="font-medium">
                    {syncResults.customers.success
                      ? `${syncResults.customers.count} total`
                      : "Sync failed"}
                  </span>
                </div>
                {syncResults.customers.success &&
                  syncResults.customers.newCount !== undefined && (
                    <div className="text-xs mt-2 space-y-1">
                      <div>🆕 {syncResults.customers.newCount} new</div>
                      <div>🔄 {syncResults.customers.updatedCount} updated</div>
                      <div>
                        ⏭️ {syncResults.customers.skippedCount} unchanged
                      </div>
                    </div>
                  )}
                <p className="text-xs md:text-sm mt-1">
                  {new Date(syncResults.customers.timestamp).toLocaleString()}
                </p>
              </div>
            )}
            <Button
              onClick={() => handleSyncCustomers(false)}
              disabled={syncing.customers}
              className="w-full h-12 md:h-10 text-base"
              variant="outline"
            >
              {syncing.customers ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 md:h-4 md:w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                  Sync Customers
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Stock Sync */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Package className="h-6 w-6 md:h-5 md:w-5 text-orange-600" />
              Stock Levels
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                ℹ️ Syncs stock levels from Loyverse and logs any differences in
                Stock History
              </p>
            </div>

            {/* Progress Bar */}
            {syncing.stock && syncProgress.stock && (
              <div className="space-y-2 p-3 rounded-lg border bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-blue-700 dark:text-blue-300 font-medium">
                    {syncProgress.stock.status}
                  </span>
                  <span className="text-blue-700 dark:text-blue-300 font-medium">
                    {syncProgress.stock.percentage}%
                  </span>
                </div>
                <div className="w-full bg-blue-200 dark:bg-blue-950 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${syncProgress.stock.percentage}%` }}
                  />
                </div>
                {syncProgress.stock.current > 0 &&
                  syncProgress.stock.total > 0 && (
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      {syncProgress.stock.current} / {syncProgress.stock.total}{" "}
                      products processed
                    </p>
                  )}
              </div>
            )}

            {syncResults.stock && (
              <div
                className={`p-3 md:p-4 rounded-lg ${
                  syncResults.stock.success
                    ? "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
                }`}
              >
                <div className="flex items-center gap-2 text-sm md:text-base">
                  {syncResults.stock.success ? (
                    <CheckCircle className="h-5 w-5 md:h-4 md:w-4" />
                  ) : (
                    <AlertCircle className="h-5 w-5 md:h-4 md:w-4" />
                  )}
                  <span className="font-medium">
                    {syncResults.stock.success
                      ? `${syncResults.stock.total} products checked`
                      : "Sync failed"}
                  </span>
                </div>
                {syncResults.stock.success && (
                  <div className="text-xs mt-2 space-y-1">
                    <div>🔄 {syncResults.stock.adjustedCount} adjusted</div>
                    <div>✓ {syncResults.stock.unchangedCount} unchanged</div>
                    {syncResults.stock.notFoundCount > 0 && (
                      <div className="text-yellow-600 dark:text-yellow-400">
                        ⚠️ {syncResults.stock.notFoundCount} not found in
                        Firebase
                      </div>
                    )}
                    {syncResults.stock.adjustments &&
                      syncResults.stock.adjustments.length > 0 && (
                        <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-green-200 dark:border-green-800">
                          <p className="font-medium mb-1">
                            Recent adjustments:
                          </p>
                          <div className="max-h-32 overflow-y-auto space-y-1">
                            {syncResults.stock.adjustments
                              .slice(0, 5)
                              .map((adj, idx) => (
                                <div key={idx} className="text-xs">
                                  <span className="font-medium">
                                    {adj.name}
                                  </span>
                                  {adj.sku && (
                                    <span className="text-neutral-500">
                                      {" "}
                                      ({adj.sku})
                                    </span>
                                  )}
                                  <br />
                                  <span
                                    className={
                                      adj.difference > 0
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }
                                  >
                                    {adj.oldStock} → {adj.newStock} (
                                    {adj.difference > 0 ? "+" : ""}
                                    {adj.difference})
                                  </span>
                                </div>
                              ))}
                            {syncResults.stock.adjustments.length > 5 && (
                              <div className="text-xs text-neutral-500">
                                ...and{" "}
                                {syncResults.stock.adjustments.length - 5} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                )}
                <p className="text-xs md:text-sm mt-1">
                  {new Date(syncResults.stock.timestamp).toLocaleString()}
                </p>
              </div>
            )}
            <Button
              onClick={() => handleSyncStock(false)}
              disabled={syncing.stock}
              className="w-full h-12 md:h-10 text-base"
              variant="outline"
            >
              {syncing.stock ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 md:h-4 md:w-4 animate-spin" />
                  Syncing Stock...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                  Sync Stock Levels
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Receipts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <ShoppingCart className="h-6 w-6 md:h-5 md:w-5 text-purple-600" />
              Receipts (Orders)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Last Sync Info */}
            {lastSyncInfo.receipts && (
              <div className="p-3 rounded-lg border bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-700">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-neutral-600 dark:text-neutral-400">
                    Last Sync:
                  </span>
                  <span
                    className={
                      lastSyncInfo.receipts.success
                        ? "text-green-600 dark:text-green-400 font-medium"
                        : "text-red-600 dark:text-red-400 font-medium"
                    }
                  >
                    {lastSyncInfo.receipts.success ? "✓ Success" : "✗ Failed"}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {new Date(lastSyncInfo.receipts.timestamp).toLocaleString()}
                </p>
                {lastSyncInfo.receipts.success && (
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                    {lastSyncInfo.receipts.count} receipts synced
                  </p>
                )}
              </div>
            )}

            {syncResults.receipts && (
              <div
                className={`p-3 rounded-lg ${
                  syncResults.receipts.success
                    ? "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
                }`}
              >
                <div className="flex items-center gap-2 text-sm">
                  {syncResults.receipts.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span className="font-medium">
                    {syncResults.receipts.success
                      ? `${syncResults.receipts.count} total`
                      : "Sync failed"}
                  </span>
                </div>
                {syncResults.receipts.success &&
                  syncResults.receipts.newCount !== undefined && (
                    <div className="text-xs mt-2 space-y-1">
                      <div>🆕 {syncResults.receipts.newCount} new</div>
                      <div>🔄 {syncResults.receipts.updatedCount} updated</div>
                      <div>
                        ⏭️ {syncResults.receipts.skippedCount} unchanged
                      </div>
                    </div>
                  )}
                <p className="text-xs mt-1">
                  {new Date(syncResults.receipts.timestamp).toLocaleString()}
                </p>
              </div>
            )}

            {/* Progress Bar */}
            {syncing.receipts &&
              syncProgress.receipts &&
              syncProgress.receipts.total > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">
                      {syncProgress.receipts.percentage > 0
                        ? "Saving to Firebase..."
                        : "Fetching from Loyverse..."}
                    </span>
                    <span className="font-medium">
                      {syncProgress.receipts.percentage > 0
                        ? `${syncProgress.receipts.percentage}%`
                        : `${syncProgress.receipts.current} fetched`}
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-purple-600 h-full transition-all duration-300 rounded-full"
                      style={{
                        width:
                          syncProgress.receipts.percentage > 0
                            ? `${syncProgress.receipts.percentage}%`
                            : "0%",
                      }}
                    />
                  </div>
                  <p className="text-xs text-neutral-500 text-center">
                    {syncProgress.receipts.current} /{" "}
                    {syncProgress.receipts.total} receipts
                  </p>
                </div>
              )}

            <div className="flex gap-2">
              <Button
                onClick={() => handleSyncReceipts(true)}
                disabled={syncing.receipts}
                className="flex-1 h-12 md:h-10 text-base"
                variant="default"
              >
                {syncing.receipts ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 md:h-4 md:w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                    Quick Sync
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleSyncReceipts(false)}
                disabled={syncing.receipts}
                className="flex-1 h-12 md:h-10 text-base"
                variant="outline"
              >
                {syncing.receipts ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 md:h-4 md:w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                    Full Sync
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Types Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-600" />
            Payment Types
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-neutral-600">
            View all available payment types configured in your Loyverse
            account. This helps you identify the correct Payment Type IDs for
            receipts.
          </p>

          {syncResults.paymentTypes && (
            <div
              className={`p-3 rounded-lg ${
                syncResults.paymentTypes.success
                  ? "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
              }`}
            >
              <div className="flex items-center gap-2 text-sm">
                {syncResults.paymentTypes.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span className="font-medium">
                  {syncResults.paymentTypes.success
                    ? `${syncResults.paymentTypes.count} payment types found`
                    : "Fetch failed"}
                </span>
              </div>
              <p className="text-xs mt-1">
                {new Date(syncResults.paymentTypes.timestamp).toLocaleString()}
              </p>
            </div>
          )}

          <Button
            onClick={handleGetPaymentTypes}
            disabled={syncing.paymentTypes}
            className="w-full"
            variant="outline"
          >
            {syncing.paymentTypes ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Get Payment Types
              </>
            )}
          </Button>

          {/* Display Payment Types */}
          {paymentTypes && paymentTypes.length > 0 && (
            <div className="mt-4 space-y-3">
              <h3 className="text-sm font-semibold text-neutral-700">
                Available Payment Types ({paymentTypes.length}):
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {paymentTypes.map((pt) => (
                  <div
                    key={pt.id}
                    className="border dark:border-neutral-700 rounded-lg p-3 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
                            {pt.name}
                          </h4>
                          <Badge
                            variant={
                              pt.type === "CASH"
                                ? "default"
                                : pt.type === "CARD"
                                ? "secondary"
                                : "outline"
                            }
                            className="text-xs"
                          >
                            {pt.type}
                          </Badge>
                          {pt.deleted_at && (
                            <Badge variant="destructive" className="text-xs">
                              Deleted
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-xs text-neutral-600">
                          <p className="font-mono bg-neutral-100 px-2 py-1 rounded inline-block">
                            ID: {pt.id}
                          </p>
                          {pt.stores && pt.stores.length > 0 && (
                            <p>Stores: {pt.stores.length} configured</p>
                          )}
                          <p>
                            Created:{" "}
                            {new Date(pt.created_at).toLocaleDateString()}
                          </p>
                          {pt.updated_at && (
                            <p>
                              Updated:{" "}
                              {new Date(pt.updated_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync All */}
      <Card>
        <CardHeader>
          <CardTitle>Full Synchronization</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleSyncAll}
            disabled={Object.values(syncing).some((s) => s)}
            className="w-full"
            size="lg"
          >
            {Object.values(syncing).some((s) => s) ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-5 w-5" />
                Sync All Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Debug Data */}
      {showDebugData && debugData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Debug Data</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDebugData(false)}
              >
                Hide
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-neutral-50 dark:bg-neutral-900 p-4 rounded-lg overflow-auto max-h-96 text-xs">
              {JSON.stringify(debugData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ol className="list-decimal list-inside space-y-2">
            <li>Click "Test Connection" to verify API access</li>
            <li>Sync individual data types or use "Sync All Data"</li>
            <li>Data will be saved to local IndexedDB</li>
            <li>Check browser console for detailed logs</li>
            <li>View debug data to inspect API responses</li>
          </ol>
          <Separator className="my-4" />
          <div className="text-xs text-neutral-500">
            <p>
              <strong>Note:</strong> This is a one-way sync from Loyverse to
              your local database. Changes made in your POS will not sync back
              to Loyverse.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
