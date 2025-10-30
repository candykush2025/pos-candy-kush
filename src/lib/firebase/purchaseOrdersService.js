import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";

const COLLECTION_NAME = "purchaseOrders";

export const purchaseOrdersService = {
  /**
   * Create a new purchase order
   */
  async create(data) {
    try {
      const poData = {
        ...data,
        status: "pending", // pending, received, cancelled
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), poData);
      return { id: docRef.id, ...poData };
    } catch (error) {
      console.error("Error creating purchase order:", error);
      throw error;
    }
  },

  /**
   * Update a purchase order
   */
  async update(id, data) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const updateData = {
        ...data,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(docRef, updateData);
      return { id, ...updateData };
    } catch (error) {
      console.error("Error updating purchase order:", error);
      throw error;
    }
  },

  /**
   * Delete a purchase order
   */
  async delete(id) {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
      console.error("Error deleting purchase order:", error);
      throw error;
    }
  },

  /**
   * Get a single purchase order
   */
  async getById(id) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error("Error fetching purchase order:", error);
      throw error;
    }
  },

  /**
   * Get all purchase orders
   */
  async getAll(options = {}) {
    try {
      let q = collection(db, COLLECTION_NAME);

      // Add filters
      const conditions = [];
      if (options.status) {
        conditions.push(where("status", "==", options.status));
      }

      // Add ordering
      const orderByField = options.orderBy || ["createdAt", "desc"];

      if (conditions.length > 0) {
        q = query(q, ...conditions, orderBy(...orderByField));
      } else {
        q = query(q, orderBy(...orderByField));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      throw error;
    }
  },

  /**
   * Mark purchase order as received (update stock)
   */
  async markAsReceived(id) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const updateData = {
        status: "received",
        receivedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await updateDoc(docRef, updateData);
      return { id, ...updateData };
    } catch (error) {
      console.error("Error marking purchase order as received:", error);
      throw error;
    }
  },
};
