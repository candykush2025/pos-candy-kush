/**
 * Activity Log Service
 * Tracks user actions for customers, stock, and products
 */

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";

const COLLECTION_NAME = "activityLogs";

// Action types for logging
export const LOG_ACTIONS = {
  // Customer actions
  CUSTOMER_CREATED: "customer_created",
  CUSTOMER_UPDATED: "customer_updated",
  CUSTOMER_DELETED: "customer_deleted",
  CUSTOMER_EXPIRY_SET: "customer_expiry_set",
  CUSTOMER_EXPIRY_CHANGED: "customer_expiry_changed",

  // Stock actions
  STOCK_ADDED: "stock_added",
  STOCK_REDUCED: "stock_reduced",
  STOCK_ADJUSTED: "stock_adjusted",

  // Product actions
  PRODUCT_CREATED: "product_created",
  PRODUCT_UPDATED: "product_updated",
  PRODUCT_DELETED: "product_deleted",
  PRODUCT_PRICE_CHANGED: "product_price_changed",

  // Sale actions
  SALE_COMPLETED: "sale_completed",
  SALE_VOIDED: "sale_voided",
  DISCOUNT_APPLIED: "discount_applied",

  // Print actions
  PRINT_JOB_CREATED: "print_job_created",
  PRINT_JOB_SENT: "print_job_sent",
  PRINT_JOB_SUCCESS: "print_job_success",
  PRINT_JOB_FAILED: "print_job_failed",
  PRINT_REPRINT: "print_reprint",
  PRINT_CANCELLED: "print_cancelled",
};

// Category for filtering logs
export const LOG_CATEGORIES = {
  CUSTOMER: "customer",
  STOCK: "stock",
  PRODUCT: "product",
  SALE: "sale",
  PRINT: "print",
};

/**
 * Create a new activity log entry
 */
export const createLog = async ({
  userId,
  userName,
  action,
  category,
  targetId,
  targetName,
  details,
  previousValue,
  newValue,
}) => {
  try {
    const logEntry = {
      userId,
      userName,
      action,
      category,
      targetId: targetId || null,
      targetName: targetName || null,
      details: details || null,
      previousValue: previousValue || null,
      newValue: newValue || null,
      timestamp: Timestamp.now(),
      createdAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), logEntry);
    return { id: docRef.id, ...logEntry };
  } catch (error) {
    console.error("Error creating activity log:", error);
    throw error;
  }
};

/**
 * Get logs for a specific user
 */
export const getLogsByUser = async (userId, limitCount = 50) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("userId", "==", userId),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching user logs:", error);
    throw error;
  }
};

/**
 * Get logs by category (customer, stock, product, sale)
 */
export const getLogsByCategory = async (category, limitCount = 50) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("category", "==", category),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching category logs:", error);
    throw error;
  }
};

/**
 * Get logs for a specific user and category
 */
export const getLogsByUserAndCategory = async (
  userId,
  category,
  limitCount = 50
) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("userId", "==", userId),
      where("category", "==", category),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching user category logs:", error);
    throw error;
  }
};

/**
 * Get all recent logs
 */
export const getRecentLogs = async (limitCount = 100) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching recent logs:", error);
    throw error;
  }
};

// Helper functions for common logging scenarios
export const logCustomerAction = async (
  user,
  action,
  customer,
  details = {}
) => {
  return createLog({
    userId: user.id,
    userName: user.name,
    action,
    category: LOG_CATEGORIES.CUSTOMER,
    targetId: customer?.id,
    targetName: customer?.name,
    details: details.description || null,
    previousValue: details.previousValue || null,
    newValue: details.newValue || null,
  });
};

export const logStockAction = async (user, action, product, details = {}) => {
  return createLog({
    userId: user.id,
    userName: user.name,
    action,
    category: LOG_CATEGORIES.STOCK,
    targetId: product?.id,
    targetName: product?.name,
    details: details.description || null,
    previousValue: details.previousValue || null,
    newValue: details.newValue || null,
  });
};

export const logProductAction = async (user, action, product, details = {}) => {
  return createLog({
    userId: user.id,
    userName: user.name,
    action,
    category: LOG_CATEGORIES.PRODUCT,
    targetId: product?.id,
    targetName: product?.name,
    details: details.description || null,
    previousValue: details.previousValue || null,
    newValue: details.newValue || null,
  });
};

export const logSaleAction = async (user, action, order, details = {}) => {
  return createLog({
    userId: user.id,
    userName: user.name,
    action,
    category: LOG_CATEGORIES.SALE,
    targetId: order?.id,
    targetName: order?.orderNumber || order?.id,
    details: details.description || null,
    previousValue: details.previousValue || null,
    newValue: details.newValue || null,
  });
};

export default {
  createLog,
  getLogsByUser,
  getLogsByCategory,
  getLogsByUserAndCategory,
  getRecentLogs,
  logCustomerAction,
  logStockAction,
  logProductAction,
  logSaleAction,
  LOG_ACTIONS,
  LOG_CATEGORIES,
};
