import dbService from "@/lib/db/dbService";
import { SYNC_STATUS, SYNC_CONFIG } from "@/config/constants";
import { useSyncStore } from "@/store/useSyncStore";

class SyncEngine {
  constructor() {
    this.isRunning = false;
    this.syncInterval = null;
    this.apiClient = null;
  }

  /**
   * Initialize sync engine with API client
   */
  initialize(apiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Start automatic sync
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.syncInterval = setInterval(() => {
      this.sync();
    }, SYNC_CONFIG.INTERVAL);

    // Run initial sync
    this.sync();
  }

  /**
   * Stop automatic sync
   */
  stop() {
    this.isRunning = false;
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Main sync function
   */
  async sync() {
    const syncStore = useSyncStore.getState();

    if (!syncStore.isOnline) {
      return;
    }

    if (syncStore.status === SYNC_STATUS.SYNCING) {
      return;
    }

    try {
      syncStore.setStatus(SYNC_STATUS.SYNCING);

      // Sync in order: push pending changes, then pull updates
      await this.pushPendingChanges();
      await this.pullUpdates();

      syncStore.setStatus(SYNC_STATUS.SYNCED);
      syncStore.setLastSyncTime(Date.now());
    } catch (error) {
      console.error("Sync failed:", error);
      syncStore.setStatus(SYNC_STATUS.ERROR);
      syncStore.addError({
        message: error.message,
        type: "sync_failed",
      });
    }
  }

  /**
   * Push pending changes to server
   */
  async pushPendingChanges() {
    const queue = await dbService.getSyncQueue();

    if (queue.length === 0) {
      return;
    }

    const syncStore = useSyncStore.getState();
    syncStore.setPendingCount(queue.length);

    // Process in batches
    for (let i = 0; i < queue.length; i += SYNC_CONFIG.BATCH_SIZE) {
      const batch = queue.slice(i, i + SYNC_CONFIG.BATCH_SIZE);

      await Promise.all(
        batch.map(async (item) => {
          try {
            await this.processSyncItem(item);
            await dbService.updateSyncQueueItem(item.id, {
              status: "synced",
              lastAttempt: new Date().toISOString(),
            });
          } catch (error) {
            console.error(`Failed to sync item ${item.id}:`, error);
            await dbService.updateSyncQueueItem(item.id, {
              status: "error",
              attempts: item.attempts + 1,
              lastAttempt: new Date().toISOString(),
              error: error.message,
            });
          }
        })
      );
    }

    // Clean up synced items
    await dbService.clearSyncedQueue();
    syncStore.setPendingCount(0);
  }

  /**
   * Process individual sync item using Firebase
   */
  async processSyncItem(item) {
    const { type, action, data } = item;

    // Import Firebase services dynamically
    const { db } = await import("@/lib/firebase/config");
    const {
      doc,
      setDoc,
      updateDoc,
      deleteDoc,
      collection,
      addDoc,
      serverTimestamp,
    } = await import("firebase/firestore");

    try {
      switch (type) {
        case "order":
          if (action === "create") {
            // If data has an ID, use setDoc, otherwise use addDoc
            if (data.id) {
              await setDoc(doc(db, "orders", data.id), {
                ...data,
                syncedAt: serverTimestamp(),
              });
            } else {
              // Use addDoc to let Firebase generate the ID
              const orderData = { ...data };
              delete orderData.id; // Remove undefined id
              await addDoc(collection(db, "orders"), {
                ...orderData,
                syncedAt: serverTimestamp(),
              });
            }
          } else if (action === "update") {
            if (data.id) {
              await updateDoc(doc(db, "orders", data.id), {
                ...data,
                syncedAt: serverTimestamp(),
              });
            }
          }
          break;

        case "product":
          if (action === "create") {
            await setDoc(doc(db, "products", data.id), {
              ...data,
              syncedAt: serverTimestamp(),
            });
          } else if (action === "update") {
            await updateDoc(doc(db, "products", data.id), {
              ...data,
              syncedAt: serverTimestamp(),
            });
          } else if (action === "delete") {
            await deleteDoc(doc(db, "products", data.id));
          }
          break;

        case "ticket":
          if (action === "create") {
            await setDoc(doc(db, "tickets", data.id), {
              ...data,
              syncedAt: serverTimestamp(),
            });
          } else if (action === "update") {
            await updateDoc(doc(db, "tickets", data.id), {
              ...data,
              syncedAt: serverTimestamp(),
            });
          } else if (action === "delete") {
            await deleteDoc(doc(db, "tickets", data.id));
          }
          break;

        case "receipt":
          if (action === "create") {
            // Create receipt in Firebase with auto-generated ID if not present
            const receiptData = { ...data };
            delete receiptData.id; // Remove local ID
            const docRef = await addDoc(collection(db, "receipts"), {
              ...receiptData,
              syncedAt: serverTimestamp(),
              syncStatus: "synced",
            });

            // Update local IndexedDB with Firebase ID and sync status
            if (item.orderId) {
              await dbService.updateOrder(item.orderId, {
                firebaseId: docRef.id,
                syncStatus: "synced",
                syncedAt: new Date().toISOString(),
              });
            }
          }
          break;

        default:
          console.warn(`Unknown sync type: ${type}`);
      }
    } catch (error) {
      console.error(`Error syncing ${type} to Firebase:`, error);
      throw error;
    }
  }

  /**
   * Process individual sync item (legacy API client method - kept for compatibility)
   */
  async processSyncItemWithAPI(item) {
    if (!this.apiClient) {
      throw new Error("API client not initialized");
    }

    const { type, action, data } = item;

    switch (type) {
      case "order":
        if (action === "create") {
          await this.apiClient.post("/orders", data);
        }
        break;

      case "product":
        if (action === "update") {
          await this.apiClient.put(`/products/${data.id}`, data);
        }
        break;

      case "customer":
        if (action === "create") {
          await this.apiClient.post("/customers", data);
        } else if (action === "update") {
          await this.apiClient.put(`/customers/${data.id}`, data);
        }
        break;

      default:
        console.warn(`Unknown sync type: ${type}`);
    }
  }

  /**
   * Pull updates from Firebase to local IndexedDB
   */
  async pullUpdates() {
    const lastSyncTime = await dbService.getLastSyncTime();

    try {
      // Import Firebase services dynamically
      const { db } = await import("@/lib/firebase/config");
      const { collection, query, where, getDocs, Timestamp } = await import(
        "firebase/firestore"
      );

      // Pull products
      try {
        const productsRef = collection(db, "products");
        let productsQuery = query(productsRef);

        if (lastSyncTime) {
          productsQuery = query(
            productsRef,
            where("updatedAt", ">", Timestamp.fromDate(new Date(lastSyncTime)))
          );
        }

        const productsSnapshot = await getDocs(productsQuery);
        const products = productsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (products.length > 0) {
          await dbService.upsertProducts(products);
        }
      } catch (error) {
        console.error("Error pulling products:", error);
      }

      // Pull categories
      try {
        const categoriesRef = collection(db, "categories");
        let categoriesQuery = query(categoriesRef);

        if (lastSyncTime) {
          categoriesQuery = query(
            categoriesRef,
            where("updatedAt", ">", Timestamp.fromDate(new Date(lastSyncTime)))
          );
        }

        const categoriesSnapshot = await getDocs(categoriesQuery);
        const categories = categoriesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (categories.length > 0) {
          await dbService.upsertCategories(categories);
        }
      } catch (error) {
        console.error("Error pulling categories:", error);
      }

      // Pull users
      try {
        const usersRef = collection(db, "users");
        let usersQuery = query(usersRef);

        if (lastSyncTime) {
          usersQuery = query(
            usersRef,
            where("updatedAt", ">", Timestamp.fromDate(new Date(lastSyncTime)))
          );
        }

        const usersSnapshot = await getDocs(usersQuery);
        const users = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (users.length > 0) {
          await dbService.upsertUsers(users);
        }
      } catch (error) {
        console.error("Error pulling users:", error);
      }

      // Update last sync time
      await dbService.setLastSyncTime(Date.now());
    } catch (error) {
      console.error("Failed to pull updates:", error);
      throw error;
    }
  }

  /**
   * Force immediate sync
   */
  async forceSync() {
    await this.sync();
  }

  /**
   * Get sync status
   */
  getStatus() {
    const syncStore = useSyncStore.getState();
    return syncStore.getSyncInfo();
  }
}

// Export singleton instance
export const syncEngine = new SyncEngine();
export default syncEngine;
