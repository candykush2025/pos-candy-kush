import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";

const COLLECTION_NAME = "discounts";

export const discountsService = {
  // Create a new discount
  async create(discountData, userId = null, userName = null) {
    const docRef = doc(collection(db, COLLECTION_NAME));
    const discount = {
      ...discountData,
      id: docRef.id,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: userId,
      createdByName: userName,
      updatedBy: userId,
      updatedByName: userName,
      isActive:
        discountData.isActive !== undefined ? discountData.isActive : true,
    };
    await setDoc(docRef, discount);
    return discount;
  },

  // Get all discounts
  async getAll() {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  },

  // Get active discounts
  async getActive() {
    const now = new Date();
    const all = await this.getAll();

    return all.filter((discount) => {
      if (!discount.isActive) return false;

      // Check if discount is within valid date range
      if (discount.validFrom) {
        const validFrom = discount.validFrom.toDate
          ? discount.validFrom.toDate()
          : new Date(discount.validFrom);
        if (now < validFrom) return false;
      }

      if (discount.validTo) {
        const validTo = discount.validTo.toDate
          ? discount.validTo.toDate()
          : new Date(discount.validTo);
        if (now > validTo) return false;
      }

      return true;
    });
  },

  // Get discount by ID
  async getById(id) {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      };
    }
    return null;
  },

  // Update discount
  async update(id, updates, userId = null, userName = null) {
    const docRef = doc(db, COLLECTION_NAME, id);
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now(),
      updatedBy: userId,
      updatedByName: userName,
    };
    await updateDoc(docRef, updateData);
    return { id, ...updateData };
  },

  // Delete discount
  async delete(id) {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  },

  // Check if discount is applicable to a given cart
  isApplicable(discount, cartSubtotal) {
    // Check if discount is active
    if (!discount.isActive) {
      return { valid: false, reason: "This discount is not active" };
    }

    // Check date validity
    const now = new Date();
    if (discount.validFrom) {
      const validFrom = discount.validFrom.toDate
        ? discount.validFrom.toDate()
        : new Date(discount.validFrom);
      if (now < validFrom) {
        return {
          valid: false,
          reason: `This discount is valid from ${validFrom.toLocaleDateString()}`,
        };
      }
    }
    if (discount.validTo) {
      const validTo = discount.validTo.toDate
        ? discount.validTo.toDate()
        : new Date(discount.validTo);
      if (now > validTo) {
        return {
          valid: false,
          reason: `This discount expired on ${validTo.toLocaleDateString()}`,
        };
      }
    }

    // Check minimum purchase (only if minPurchase is set and greater than 0)
    if (
      discount.minPurchase &&
      discount.minPurchase > 0 &&
      cartSubtotal < discount.minPurchase
    ) {
      return {
        valid: false,
        reason: `Minimum purchase of ${cartSubtotal.toLocaleString("th-TH", {
          style: "currency",
          currency: "THB",
        })} required`,
      };
    }

    return { valid: true, reason: "" };
  },

  // Calculate discount amount
  calculateDiscount(discount, cartSubtotal) {
    const applicability = this.isApplicable(discount, cartSubtotal);
    if (!applicability.valid) {
      return 0;
    }

    if (discount.type === "percentage") {
      return (cartSubtotal * discount.value) / 100;
    } else if (discount.type === "fixed") {
      return discount.value;
    }

    return 0;
  },
};
