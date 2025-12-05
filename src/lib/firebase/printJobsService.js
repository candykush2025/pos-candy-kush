/**
 * Print Jobs Service
 * Tracks print job history and status for thermal printing
 */

import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  limit,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";

const COLLECTION_NAME = "printJobs";

// Print job statuses
export const PRINT_STATUS = {
  PENDING: "pending",
  SENT: "sent",
  SUCCESS: "success",
  FAILED: "failed",
  CANCELLED: "cancelled",
};

// Print job types
export const PRINT_TYPE = {
  RECEIPT: "receipt",
  INVOICE: "invoice",
  REPORT: "report",
  TEST: "test",
};

/**
 * Create a new print job record
 */
export const createPrintJob = async ({
  receiptNumber,
  orderId,
  orderData,
  cashierId,
  cashierName,
  type = PRINT_TYPE.RECEIPT,
  printerName = "Thermal Printer",
}) => {
  try {
    const printJob = {
      receiptNumber,
      orderId: orderId || null,
      orderData, // Store the full order data for reprinting
      cashierId,
      cashierName,
      type,
      printerName,
      status: PRINT_STATUS.PENDING,
      attempts: 1,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      sentAt: null,
      completedAt: null,
      errorMessage: null,
      reprints: [], // Track reprint history
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), printJob);
    return { id: docRef.id, ...printJob };
  } catch (error) {
    console.error("Error creating print job:", error);
    throw error;
  }
};

/**
 * Update print job status
 */
export const updatePrintJobStatus = async (
  jobId,
  status,
  errorMessage = null
) => {
  try {
    const jobRef = doc(db, COLLECTION_NAME, jobId);
    const updateData = {
      status,
      updatedAt: Timestamp.now(),
    };

    if (status === PRINT_STATUS.SENT) {
      updateData.sentAt = Timestamp.now();
    }

    if (status === PRINT_STATUS.SUCCESS) {
      updateData.completedAt = Timestamp.now();
    }

    if (status === PRINT_STATUS.FAILED && errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    await updateDoc(jobRef, updateData);
    return { id: jobId, ...updateData };
  } catch (error) {
    console.error("Error updating print job status:", error);
    throw error;
  }
};

/**
 * Record a reprint attempt
 */
export const recordReprint = async (
  jobId,
  cashierId,
  cashierName,
  reason = "Manual reprint"
) => {
  try {
    const jobRef = doc(db, COLLECTION_NAME, jobId);
    const jobDoc = await getDoc(jobRef);

    if (!jobDoc.exists()) {
      throw new Error("Print job not found");
    }

    const currentData = jobDoc.data();
    const reprints = currentData.reprints || [];

    reprints.push({
      reprintedAt: new Date().toISOString(),
      reprintedBy: cashierId,
      reprintedByName: cashierName,
      reason,
      attemptNumber: reprints.length + 1,
    });

    await updateDoc(jobRef, {
      reprints,
      attempts: (currentData.attempts || 1) + 1,
      status: PRINT_STATUS.PENDING,
      updatedAt: Timestamp.now(),
    });

    return { id: jobId, reprints };
  } catch (error) {
    console.error("Error recording reprint:", error);
    throw error;
  }
};

/**
 * Get print jobs for current cashier session
 */
export const getPrintJobsByCashier = async (cashierId, limitCount = 50) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("cashierId", "==", cashierId),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching print jobs:", error);
    throw error;
  }
};

/**
 * Get print jobs by status
 */
export const getPrintJobsByStatus = async (status, limitCount = 50) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("status", "==", status),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching print jobs by status:", error);
    throw error;
  }
};

/**
 * Get recent print jobs (all statuses)
 */
export const getRecentPrintJobs = async (limitCount = 100) => {
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
    console.error("Error fetching recent print jobs:", error);
    throw error;
  }
};

/**
 * Get a single print job by ID
 */
export const getPrintJobById = async (jobId) => {
  try {
    const jobRef = doc(db, COLLECTION_NAME, jobId);
    const jobDoc = await getDoc(jobRef);

    if (!jobDoc.exists()) {
      return null;
    }

    return { id: jobDoc.id, ...jobDoc.data() };
  } catch (error) {
    console.error("Error fetching print job:", error);
    throw error;
  }
};

/**
 * Delete a print job
 */
export const deletePrintJob = async (jobId) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, jobId));
    return true;
  } catch (error) {
    console.error("Error deleting print job:", error);
    throw error;
  }
};

/**
 * Subscribe to print jobs updates (real-time)
 */
export const subscribeToPrintJobs = (cashierId, callback, limitCount = 50) => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("cashierId", "==", cashierId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  return onSnapshot(q, (snapshot) => {
    const jobs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(jobs);
  });
};

/**
 * Get print job statistics for a cashier
 */
export const getPrintJobStats = async (cashierId) => {
  try {
    const jobs = await getPrintJobsByCashier(cashierId, 100);

    const stats = {
      total: jobs.length,
      success: jobs.filter((j) => j.status === PRINT_STATUS.SUCCESS).length,
      failed: jobs.filter((j) => j.status === PRINT_STATUS.FAILED).length,
      pending: jobs.filter(
        (j) =>
          j.status === PRINT_STATUS.PENDING || j.status === PRINT_STATUS.SENT
      ).length,
      reprints: jobs.reduce((acc, j) => acc + (j.reprints?.length || 0), 0),
    };

    return stats;
  } catch (error) {
    console.error("Error getting print job stats:", error);
    throw error;
  }
};

/**
 * Cancel a pending print job
 */
export const cancelPrintJob = async (jobId) => {
  try {
    const jobRef = doc(db, COLLECTION_NAME, jobId);
    await updateDoc(jobRef, {
      status: PRINT_STATUS.CANCELLED,
      updatedAt: Timestamp.now(),
    });
    return { id: jobId, status: PRINT_STATUS.CANCELLED };
  } catch (error) {
    console.error("Error cancelling print job:", error);
    throw error;
  }
};

export const printJobsService = {
  createPrintJob,
  updatePrintJobStatus,
  recordReprint,
  getPrintJobsByCashier,
  getPrintJobsByStatus,
  getRecentPrintJobs,
  getPrintJobById,
  deletePrintJob,
  subscribeToPrintJobs,
  getPrintJobStats,
  cancelPrintJob,
  PRINT_STATUS,
  PRINT_TYPE,
};

export default printJobsService;
