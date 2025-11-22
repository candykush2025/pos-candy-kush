import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

const CUSTOMER_EXPIRY_REQUESTS_COLLECTION = "customer_expiry_requests";

/**
 * Customer Expiry Date Approval Service
 * Handles approval workflow for cashier-requested expiry date changes
 */

/**
 * Create a new expiry date change request (cashier)
 */
export const createExpiryRequest = async ({
  customerId,
  customerName,
  currentExpiryDate,
  newExpiryDate,
  requestedBy,
  requestedByName,
  reason,
}) => {
  try {
    const requestData = {
      customerId,
      customerName,
      currentExpiryDate: currentExpiryDate || null,
      newExpiryDate,
      requestedBy,
      requestedByName,
      reason: reason || "",
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(
      collection(db, CUSTOMER_EXPIRY_REQUESTS_COLLECTION),
      requestData
    );

    return { id: docRef.id, ...requestData };
  } catch (error) {
    console.error("Error creating expiry request:", error);
    throw error;
  }
};

/**
 * Get all pending expiry requests
 */
export const getPendingExpiryRequests = async () => {
  try {
    const q = query(
      collection(db, CUSTOMER_EXPIRY_REQUESTS_COLLECTION),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting pending expiry requests:", error);
    throw error;
  }
};

/**
 * Get all expiry requests (for history)
 */
export const getAllExpiryRequests = async () => {
  try {
    const q = query(
      collection(db, CUSTOMER_EXPIRY_REQUESTS_COLLECTION),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting all expiry requests:", error);
    throw error;
  }
};

/**
 * Approve expiry request and update customer
 */
export const approveExpiryRequest = async (
  requestId,
  approvedBy,
  approvedByName
) => {
  try {
    const requestRef = doc(db, CUSTOMER_EXPIRY_REQUESTS_COLLECTION, requestId);

    // Update request status
    await updateDoc(requestRef, {
      status: "approved",
      approvedBy,
      approvedByName,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error("Error approving expiry request:", error);
    throw error;
  }
};

/**
 * Decline expiry request
 */
export const declineExpiryRequest = async (
  requestId,
  declinedBy,
  declinedByName,
  declineReason
) => {
  try {
    const requestRef = doc(db, CUSTOMER_EXPIRY_REQUESTS_COLLECTION, requestId);

    await updateDoc(requestRef, {
      status: "declined",
      declinedBy,
      declinedByName,
      declineReason: declineReason || "",
      declinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error("Error declining expiry request:", error);
    throw error;
  }
};

/**
 * Check if customer has pending expiry request
 */
export const hasPendingExpiryRequest = async (customerId) => {
  try {
    const q = query(
      collection(db, CUSTOMER_EXPIRY_REQUESTS_COLLECTION),
      where("customerId", "==", customerId),
      where("status", "==", "pending")
    );

    const snapshot = await getDocs(q);
    return snapshot.size > 0;
  } catch (error) {
    console.error("Error checking pending expiry request:", error);
    return false;
  }
};

/**
 * Calculate expiry date from today + duration
 */
export const calculateExpiryDate = (duration) => {
  const today = new Date();
  let expiryDate = new Date(today);

  if (duration === "10days") {
    expiryDate.setDate(today.getDate() + 10);
  } else if (duration === "6months") {
    expiryDate.setMonth(today.getMonth() + 6);
  }

  return expiryDate.toISOString().split("T")[0]; // Return YYYY-MM-DD format
};

/**
 * Check if customer is expired
 */
export const isCustomerExpired = (expiryDate) => {
  if (!expiryDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  return expiry < today;
};

/**
 * Check if customer is expiring soon (within 7 days)
 */
export const isExpiringSoon = (expiryDate) => {
  if (!expiryDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
};

/**
 * Get expiry status for a customer
 */
export const getExpiryStatus = (expiryDate) => {
  if (!expiryDate) {
    return { status: "none", message: "No expiry date", variant: "secondary" };
  }

  if (isCustomerExpired(expiryDate)) {
    return { status: "expired", message: "Expired", variant: "destructive" };
  }

  if (isExpiringSoon(expiryDate)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    return {
      status: "expiring",
      message: `Expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
      variant: "outline",
    };
  }

  return { status: "active", message: "Active", variant: "default" };
};

export const customerApprovalService = {
  createExpiryRequest,
  getPendingExpiryRequests,
  getAllExpiryRequests,
  approveExpiryRequest,
  declineExpiryRequest,
  hasPendingExpiryRequest,
  calculateExpiryDate,
  isCustomerExpired,
  isExpiringSoon,
  getExpiryStatus,
};
