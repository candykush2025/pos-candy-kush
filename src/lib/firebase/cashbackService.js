/**
 * Cashback Service
 * Manages cashback rules for categories and products
 * Handles point usage rules and customer point tracking
 */

import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDocsFromServer,
  arrayUnion,
} from "firebase/firestore";
import { db } from "./config";

// Collection names
const CASHBACK_RULES_COLLECTION = "cashbackRules";
const POINT_USAGE_RULES_COLLECTION = "pointUsageRules";
const CUSTOMERS_COLLECTION = "customers";

/**
 * Cashback Rules Service
 * Rules can be applied to categories or individual products
 * Product rules take priority over category rules
 */
export const cashbackRulesService = {
  // Create a new cashback rule
  create: async (data) => {
    try {
      const docRef = await addDoc(collection(db, CASHBACK_RULES_COLLECTION), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { id: docRef.id, ...data };
    } catch (error) {
      console.error("Error creating cashback rule:", error);
      throw error;
    }
  },

  // Get all cashback rules
  getAll: async () => {
    try {
      const querySnapshot = await getDocsFromServer(
        collection(db, CASHBACK_RULES_COLLECTION)
      );
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error getting cashback rules:", error);
      throw error;
    }
  },

  // Get a specific cashback rule
  get: async (id) => {
    try {
      const docRef = doc(db, CASHBACK_RULES_COLLECTION, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error("Error getting cashback rule:", error);
      throw error;
    }
  },

  // Update a cashback rule
  update: async (id, data) => {
    try {
      const docRef = doc(db, CASHBACK_RULES_COLLECTION, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
      return id;
    } catch (error) {
      console.error("Error updating cashback rule:", error);
      throw error;
    }
  },

  // Delete a cashback rule
  delete: async (id) => {
    try {
      const docRef = doc(db, CASHBACK_RULES_COLLECTION, id);
      await deleteDoc(docRef);
      return id;
    } catch (error) {
      console.error("Error deleting cashback rule:", error);
      throw error;
    }
  },

  // Get rules by category ID
  getByCategoryId: async (categoryId) => {
    try {
      const allRules = await cashbackRulesService.getAll();
      return allRules.filter(
        (rule) => rule.type === "category" && rule.targetId === categoryId
      );
    } catch (error) {
      console.error("Error getting cashback rules by category:", error);
      throw error;
    }
  },

  // Get rules by product ID
  getByProductId: async (productId) => {
    try {
      const allRules = await cashbackRulesService.getAll();
      return allRules.filter(
        (rule) => rule.type === "product" && rule.targetId === productId
      );
    } catch (error) {
      console.error("Error getting cashback rules by product:", error);
      throw error;
    }
  },

  /**
   * Calculate cashback for a cart item
   * Product rules take priority over category rules
   * @param {Object} item - Cart item with productId, categoryId, price, quantity
   * @param {Array} allRules - All cashback rules
   * @param {number} cartTotal - Total cart amount (for minimum order check)
   * @returns {Object} - { points: number, ruleApplied: Object|null }
   */
  calculateItemCashback: (item, allRules, cartTotal) => {
    try {
      console.log("[Cashback Service] === START CALCULATION ===");
      console.log("[Cashback Service] Calculating for item:", {
        item,
        ruleCount: allRules.length,
        activeRules: allRules.filter((r) => r.isActive).length,
      });

      // First, check for product-specific rule
      const productRule = allRules.find(
        (rule) =>
          rule.type === "product" &&
          rule.targetId === item.productId &&
          rule.isActive
      );

      console.log("[Cashback Service] Product rule search:", {
        found: !!productRule,
        searchingFor: item.productId,
        availableProductRules: allRules
          .filter((r) => r.type === "product" && r.isActive)
          .map((r) => ({ name: r.name, targetId: r.targetId })),
      });

      // If no product rule, check for category rule
      const categoryRule = allRules.find(
        (rule) =>
          rule.type === "category" &&
          rule.targetId === item.categoryId &&
          rule.isActive
      );

      console.log("[Cashback Service] Category rule search:", {
        found: !!categoryRule,
        searchingFor: item.categoryId,
        availableCategoryRules: allRules
          .filter((r) => r.type === "category" && r.isActive)
          .map((r) => ({ name: r.name, targetId: r.targetId })),
      });

      // Use product rule if available, otherwise category rule
      const applicableRule = productRule || categoryRule;

      if (!applicableRule) {
        console.log("[Cashback Service] No applicable rule found");
        return { points: 0, ruleApplied: null };
      }

      console.log("[Cashback Service] Using rule:", {
        name: applicableRule.name,
        type: applicableRule.type,
        cashbackType: applicableRule.cashbackType,
        value: applicableRule.cashbackValue,
      });

      // Check minimum order requirement
      if (
        applicableRule.hasMinimumOrder &&
        cartTotal < applicableRule.minimumOrderAmount
      ) {
        return { points: 0, ruleApplied: null };
      }

      // Calculate points based on rule type
      const itemTotal = item.price * item.quantity;
      let points = 0;

      if (applicableRule.cashbackType === "percentage") {
        // Percentage of item total
        points = Math.floor((itemTotal * applicableRule.cashbackValue) / 100);
        console.log("[Cashback Service] Percentage calculation:", {
          itemTotal,
          percentage: applicableRule.cashbackValue,
          calculated: (itemTotal * applicableRule.cashbackValue) / 100,
          points,
        });
      } else if (applicableRule.cashbackType === "fixed") {
        // Fixed points per item
        points = applicableRule.cashbackValue * item.quantity;
        console.log("[Cashback Service] Fixed calculation:", {
          fixedValue: applicableRule.cashbackValue,
          quantity: item.quantity,
          points,
        });
      }

      console.log("[Cashback Service] Final result:", {
        points,
        ruleName: applicableRule.name,
      });
      console.log("[Cashback Service] === END CALCULATION ===");
      return { points, ruleApplied: applicableRule };
    } catch (error) {
      console.error("[Cashback Service] ERROR:", error);
      return { points: 0, ruleApplied: null };
    }
  },

  /**
   * Calculate total cashback for entire cart
   * @param {Array} items - Cart items
   * @param {number} cartTotal - Total cart amount
   * @returns {Object} - { totalPoints: number, itemBreakdown: Array }
   */
  calculateCartCashback: async (items, cartTotal) => {
    try {
      const allRules = await cashbackRulesService.getAll();
      let totalPoints = 0;
      const itemBreakdown = [];

      for (const item of items) {
        const { points, ruleApplied } =
          cashbackRulesService.calculateItemCashback(item, allRules, cartTotal);

        totalPoints += points;
        itemBreakdown.push({
          itemId: item.productId,
          itemName: item.name,
          points,
          ruleApplied: ruleApplied
            ? {
                id: ruleApplied.id,
                name: ruleApplied.name,
                type: ruleApplied.type,
                cashbackType: ruleApplied.cashbackType,
                cashbackValue: ruleApplied.cashbackValue,
              }
            : null,
        });
      }

      return { totalPoints, itemBreakdown };
    } catch (error) {
      console.error("Error calculating cart cashback:", error);
      return { totalPoints: 0, itemBreakdown: [] };
    }
  },
};

/**
 * Point Usage Rules Service
 * Manages how points can be used during checkout
 */
export const pointUsageRulesService = {
  // Get the current point usage rules (singleton document)
  get: async () => {
    try {
      const docRef = doc(db, POINT_USAGE_RULES_COLLECTION, "settings");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      // Return default rules if not set
      return {
        id: "settings",
        pointValue: 1, // 1 point = 1 baht/dollar
        priceWhenUsingPoints: "member", // 'member' or 'normal'
        earnCashbackWhenUsingPoints: false, // Whether to earn points when using points
        maxPointUsagePercent: 100, // Max percentage of total that can be paid with points
        minPointsToRedeem: 1, // Minimum points that can be redeemed
      };
    } catch (error) {
      console.error("Error getting point usage rules:", error);
      throw error;
    }
  },

  // Save/update point usage rules
  save: async (data) => {
    try {
      const docRef = doc(db, POINT_USAGE_RULES_COLLECTION, "settings");
      await setDoc(
        docRef,
        {
          ...data,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      return "settings";
    } catch (error) {
      console.error("Error saving point usage rules:", error);
      throw error;
    }
  },
};

/**
 * Customer Points Service
 * Manages customer point list and calculations
 */
export const customerPointsService = {
  /**
   * Add points to customer's PointList
   * @param {string} customerId - Customer ID
   * @param {Object} pointEntry - Point entry data
   */
  addPoints: async (customerId, pointEntry) => {
    try {
      const customerRef = doc(db, CUSTOMERS_COLLECTION, customerId);
      const entry = {
        ...pointEntry,
        id: `pt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
      };
      await updateDoc(customerRef, {
        pointList: arrayUnion(entry),
        updatedAt: serverTimestamp(),
      });

      return entry;
    } catch (error) {
      console.error("Error adding points to customer:", error);

      // If writing to Firestore failed (likely offline), queue the point entry
      // to local syncQueue so it can be retried later. This keeps point history
      // consistent even when checkout occurs offline.
      try {
        // Lazily require db to avoid circular import issues in some environments
        const dbLocal = require("@/lib/db/index").default;
        await dbLocal.syncQueue.add({
          type: "customer_points",
          action: "create",
          data: { customerId, entry },
          timestamp: new Date().toISOString(),
          status: "pending",
          attempts: 0,
        });

        console.warn("Customer points queued for sync (offline mode)");
        return { ...entry, queued: true };
      } catch (queueErr) {
        console.error("Failed to queue customer points for sync:", queueErr);
        throw error; // rethrow original error
      }
    }
  },

  /**
   * Calculate total points from PointList
   * @param {Array} pointList - Customer's point list
   * @returns {number} - Total available points
   */
  calculateTotalPoints: (pointList) => {
    if (!Array.isArray(pointList) || pointList.length === 0) {
      return 0;
    }

    return pointList.reduce((total, entry) => {
      const amount = entry.amount || 0;
      return total + amount;
    }, 0);
  },

  /**
   * Get formatted point history for display
   * @param {Array} pointList - Customer's point list
   * @returns {Array} - Formatted point history sorted by date
   */
  getFormattedHistory: (pointList) => {
    if (!Array.isArray(pointList) || pointList.length === 0) {
      return [];
    }

    return pointList
      .map((entry) => ({
        id: entry.id,
        date: entry.createdAt,
        type: entry.type, // 'earned', 'used', 'adjustment_add', 'adjustment_reduce'
        amount: entry.amount,
        source: entry.source, // 'purchase', 'redemption', 'admin_adjustment'
        receiptNumber: entry.receiptNumber || null,
        receiptId: entry.receiptId || null,
        reason: entry.reason || null,
        cashbackRule: entry.cashbackRule || null,
        adjustedBy: entry.adjustedBy || null,
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  /**
   * Record earned cashback points
   * @param {string} customerId - Customer ID
   * @param {number} points - Points earned
   * @param {string} receiptNumber - Receipt number
   * @param {string} receiptId - Receipt ID (for linking)
   * @param {Array} itemBreakdown - Breakdown of points per item
   */
  recordEarnedPoints: async (
    customerId,
    points,
    receiptNumber,
    receiptId,
    itemBreakdown = []
  ) => {
    const entry = {
      type: "earned",
      amount: points,
      source: "purchase",
      receiptNumber,
      receiptId,
      itemBreakdown,
      reason: `Earned from purchase #${receiptNumber}`,
    };

    return customerPointsService.addPoints(customerId, entry);
  },

  /**
   * Record used points
   * @param {string} customerId - Customer ID
   * @param {number} points - Points used (should be negative)
   * @param {string} receiptNumber - Receipt number
   * @param {string} receiptId - Receipt ID
   * @param {number} valueRedeemed - Dollar/Baht value redeemed
   */
  recordUsedPoints: async (
    customerId,
    points,
    receiptNumber,
    receiptId,
    valueRedeemed
  ) => {
    const entry = {
      type: "used",
      amount: -Math.abs(points), // Ensure it's negative
      source: "redemption",
      receiptNumber,
      receiptId,
      valueRedeemed,
      reason: `Redeemed ${Math.abs(
        points
      )} points for ${valueRedeemed} in purchase #${receiptNumber}`,
    };

    return customerPointsService.addPoints(customerId, entry);
  },

  /**
   * Record admin adjustment (add)
   * @param {string} customerId - Customer ID
   * @param {number} points - Points to add
   * @param {string} reason - Reason for adjustment
   * @param {Object} admin - Admin user data
   */
  recordAdminAdd: async (customerId, points, reason, admin) => {
    const entry = {
      type: "adjustment_add",
      amount: Math.abs(points),
      source: "admin_adjustment",
      reason,
      adjustedBy: {
        id: admin.id,
        name: admin.name,
      },
    };

    return customerPointsService.addPoints(customerId, entry);
  },

  /**
   * Record admin adjustment (reduce)
   * @param {string} customerId - Customer ID
   * @param {number} points - Points to reduce
   * @param {string} reason - Reason for adjustment
   * @param {Object} admin - Admin user data
   */
  recordAdminReduce: async (customerId, points, reason, admin) => {
    const entry = {
      type: "adjustment_reduce",
      amount: -Math.abs(points), // Ensure it's negative
      source: "admin_adjustment",
      reason,
      adjustedBy: {
        id: admin.id,
        name: admin.name,
      },
    };

    return customerPointsService.addPoints(customerId, entry);
  },
};

export default {
  cashbackRulesService,
  pointUsageRulesService,
  customerPointsService,
};
