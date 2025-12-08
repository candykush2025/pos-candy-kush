import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "./config";

const COLLECTION_NAME = "stockHistory";

export const stockHistoryService = {
  /**
   * Log a stock movement
   * @param {Object} data - Stock history entry
   * @param {string} data.productId - Product ID
   * @param {string} data.productName - Product name
   * @param {string} data.type - Type: 'initial', 'sale', 'purchase_order', 'adjustment'
   * @param {number} data.quantity - Quantity changed (positive for add, negative for decrease)
   * @param {number} data.previousStock - Stock before change
   * @param {number} data.newStock - Stock after change
   * @param {string} data.reason - Reason for change
   * @param {string} data.referenceId - Reference ID (receipt ID, PO ID, etc)
   * @param {string} data.userId - User who made the change
   * @param {string} data.userName - User name
   */
  async logStockMovement(data) {
    try {
      const historyData = {
        productId: data.productId,
        productName: data.productName,
        productSku: data.productSku || "",
        type: data.type, // 'initial', 'sale', 'purchase_order', 'adjustment'
        quantity: data.quantity,
        previousStock: data.previousStock,
        newStock: data.newStock,
        reason: data.reason || "",
        referenceId: data.referenceId || "",
        userId: data.userId || "",
        userName: data.userName || "",
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), historyData);
      return { id: docRef.id, ...historyData };
    } catch (error) {
      console.error("Error logging stock movement:", error);
      throw error;
    }
  },

  /**
   * Get stock history for a specific product
   */
  async getProductHistory(productId, limitCount = 50) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where("productId", "==", productId),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error fetching product history:", error);
      throw error;
    }
  },

  /**
   * Get all stock history with pagination
   */
  async getAllHistory(limitCount = 100, lastDoc = null) {
    try {
      let q = query(
        collection(db, COLLECTION_NAME),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const history = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        history,
        lastDoc: snapshot.docs[snapshot.docs.length - 1],
      };
    } catch (error) {
      console.error("Error fetching stock history:", error);
      throw error;
    }
  },

  /**
   * Get stock history by type
   */
  async getHistoryByType(type, limitCount = 50) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where("type", "==", type),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error fetching history by type:", error);
      throw error;
    }
  },

  /**
   * Get stock history by date range
   */
  async getHistoryByDateRange(startDate, endDate) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where("createdAt", ">=", Timestamp.fromDate(startDate)),
        where("createdAt", "<=", Timestamp.fromDate(endDate)),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error fetching history by date range:", error);
      throw error;
    }
  },

  /**
   * Get the latest stock level for all products from stock history
   * Returns a Map of productId -> latestStock
   */
  async getLatestStockForAllProducts() {
    try {
      // Get all history sorted by date desc
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      const latestStockMap = new Map();

      // For each product, we only want the most recent entry (first one we encounter)
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const productId = data.productId;
        // Only set if we haven't seen this product yet (first = most recent)
        if (productId && !latestStockMap.has(productId)) {
          latestStockMap.set(productId, data.newStock);
        }
      });

      return latestStockMap;
    } catch (error) {
      console.error("Error fetching latest stock for all products:", error);
      // Return empty Map on error so .get() still works
      return new Map();
    }
  },

  /**
   * Get the current stock for a single product from stock history
   */
  async getCurrentStock(productId) {
    try {
      const history = await this.getProductHistory(productId, 1);
      if (history.length > 0) {
        return history[0].newStock;
      }
      return null; // No history found
    } catch (error) {
      console.error("Error fetching current stock:", error);
      throw error;
    }
  },
};
