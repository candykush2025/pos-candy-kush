import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  limit,
} from "firebase/firestore";
import { db } from "./config";

const COLLECTION_NAME = "stockAdjustments";

export const stockAdjustmentsService = {
  /**
   * Create a new stock adjustment
   */
  async create(data) {
    try {
      const adjustmentData = {
        ...data,
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(
        collection(db, COLLECTION_NAME),
        adjustmentData
      );
      return { id: docRef.id, ...adjustmentData };
    } catch (error) {
      console.error("Error creating stock adjustment:", error);
      throw error;
    }
  },

  /**
   * Get all stock adjustments
   */
  async getAll(limitCount = 100) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error fetching stock adjustments:", error);
      throw error;
    }
  },

  /**
   * Get stock adjustments for a specific product
   */
  async getByProduct(productId, limitCount = 50) {
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
      console.error("Error fetching product adjustments:", error);
      throw error;
    }
  },
};
