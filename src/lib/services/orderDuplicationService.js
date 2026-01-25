/**
 * Order Duplication Service
 * Duplicates POS orders to api.isy.software for real-time transaction sync
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_ISY_API_URL || "https://api.isy.software";
const API_ENDPOINT = "/pos/v1/orders";
const API_USERNAME =
  process.env.NEXT_PUBLIC_ISY_API_USERNAME || "candykush_cashier";
const API_PASSWORD = process.env.NEXT_PUBLIC_ISY_API_PASSWORD || "admin123";

// Token management
let cachedToken = null;
let tokenExpiry = null;

/**
 * Login to get JWT token
 */
const loginToAPI = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/pos/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: API_USERNAME,
        password: API_PASSWORD,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error ||
          errorData.message ||
          `Login failed with status ${response.status}`,
      );
    }

    const data = await response.json();
    const token = data.token || data.access_token || data.data?.token;

    if (!token) {
      throw new Error("No token received from login response");
    }

    // Cache token (assume 1 hour expiry if not specified)
    cachedToken = token;
    tokenExpiry = Date.now() + (data.expiresIn || 3600) * 1000;

    console.log("✅ Successfully logged in to ISY API");

    return token;
  } catch (error) {
    console.error("❌ Failed to login to ISY API:", error);
    throw error;
  }
};

/**
 * Get valid JWT token (from cache or new login)
 */
const getAuthToken = async () => {
  // Check if we have a valid cached token
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  // Token expired or doesn't exist, get new one
  return await loginToAPI();
};

/**
 * Transform POS receipt data to ISY API format
 */
const transformReceiptData = (receiptData, cashier) => {
  return {
    // Order identification
    orderNumber: receiptData.orderNumber,
    receipt_number: receiptData.receipt_number || receiptData.orderNumber,
    deviceId: receiptData.deviceId,

    // Timestamps
    created_at: receiptData.created_at,
    receipt_date: receiptData.receipt_date,
    updated_at: receiptData.updated_at,

    // Customer information
    customerId: receiptData.customerId,
    customerName: receiptData.customerName,
    customer: receiptData.customer
      ? {
          id: receiptData.customer.id,
          customerId: receiptData.customer.customerId,
          name: receiptData.customer.name,
          lastName: receiptData.customer.lastName,
          fullName: receiptData.customer.fullName,
          email: receiptData.customer.email,
          phone: receiptData.customer.phone,
          isNoMember: receiptData.customer.isNoMember,
          currentPoints: receiptData.customer.currentPoints,
        }
      : null,

    // Order items
    line_items: (receiptData.line_items || []).map((item) => ({
      id: item.id,
      item_id: item.item_id || item.productId,
      variant_id: item.variant_id || item.variantId,
      item_name: item.item_name || item.name,
      variant_name: item.variant_name,
      sku: item.sku,
      quantity: item.quantity,
      price: item.price,
      gross_total_money: item.gross_total_money || item.total,
      total_money: item.total_money || item.total,
      cost: item.cost || 0,
      cost_total: item.cost_total || (item.cost || 0) * item.quantity,
      total_discount: item.total_discount || 0,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
    })),

    // Pricing
    subtotal: receiptData.subtotal,
    total_discount: receiptData.total_discount,
    total_tax: receiptData.total_tax || 0,
    total_money: receiptData.total_money,
    tip: receiptData.tip || 0,
    surcharge: receiptData.surcharge || 0,

    // Payment information
    paymentMethod: receiptData.paymentMethod,
    paymentTypeName: receiptData.paymentTypeName,
    cashReceived: receiptData.cashReceived,
    change: receiptData.change || 0,
    payments: receiptData.payments || [],

    // Points & Cashback
    points_used: receiptData.points_used || 0,
    points_discount: receiptData.points_discount || 0,
    points_earned: receiptData.points_earned || 0,
    points_deducted: receiptData.points_deducted || 0,
    points_balance: receiptData.points_balance || 0,
    cashback_earned: receiptData.cashback_earned || 0,
    cashback_breakdown: receiptData.cashback_breakdown || [],

    // Employee information
    cashierId: receiptData.cashierId || cashier?.id,
    cashierName: receiptData.cashierName || cashier?.name,
    userId: receiptData.userId || cashier?.id,

    // Status & Metadata
    status: receiptData.status || "completed",
    receipt_type: receiptData.receipt_type || "SALE",
    source: receiptData.source || "POS System",
    cancelled_at: receiptData.cancelled_at,

    // Discounts
    discounts: receiptData.discounts || [],

    // Sync status
    syncStatus: "synced",
    syncedAt: new Date().toISOString(),
    fromThisDevice: receiptData.fromThisDevice,
  };
};

/**
 * Duplicate order to ISY API and log to Firebase
 */
export const duplicateOrderToISY = async (receiptData, cashier) => {
  const startTime = Date.now();
  let syncLog = {
    orderNumber: receiptData.orderNumber,
    receiptId: receiptData.id || null,
    attemptedAt: new Date().toISOString(),
    status: "pending",
    error: null,
    duration: 0,
    apiUrl: `${API_BASE_URL}${API_ENDPOINT}`,
    // Store order data and cashier info for retry functionality
    orderData: receiptData,
    cashierId: cashier?.id,
    cashierName: cashier?.name,
  };

  try {
    // Get JWT token first
    const token = await getAuthToken();

    // Transform receipt data to API format
    const orderData = transformReceiptData(receiptData, cashier);

    // Send to ISY API with JWT token
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(orderData),
    });

    syncLog.duration = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      syncLog.status = "failed";
      syncLog.httpStatus = response.status;
      syncLog.error = errorData.error || `HTTP ${response.status}`;
      syncLog.errorCode = errorData.code;
      syncLog.errorDetails = errorData.details;

      // If 401, token might be expired - clear cache
      if (response.status === 401) {
        cachedToken = null;
        tokenExpiry = null;
      }

      // Log to Firebase
      await logSyncToFirebase(syncLog);

      // Determine if should retry
      const shouldRetry = response.status >= 500 || response.status === 408;

      return {
        success: false,
        error: syncLog.error,
        errorCode: syncLog.errorCode,
        shouldRetry,
        httpStatus: response.status,
        syncLogId: syncLog.id,
      };
    }

    const result = await response.json();

    syncLog.status = "success";
    syncLog.isyOrderId = result.data?.orderId;
    syncLog.response = result;

    // Log success to Firebase
    await logSyncToFirebase(syncLog);

    console.log("✅ Order duplicated to ISY API successfully:", {
      orderNumber: receiptData.orderNumber,
      isyOrderId: result.data?.orderId,
      duration: `${syncLog.duration}ms`,
    });

    return {
      success: true,
      data: result.data,
      isyOrderId: result.data?.orderId,
      duration: syncLog.duration,
      syncLogId: syncLog.id,
    };
  } catch (error) {
    syncLog.duration = Date.now() - startTime;
    syncLog.status = "failed";
    syncLog.error = error.message;
    syncLog.errorType = error.name;

    // Log to Firebase
    await logSyncToFirebase(syncLog);

    console.error("❌ Failed to duplicate order to ISY API:", error);

    // Network errors - should retry
    const shouldRetry =
      error.name === "TypeError" || error.message.includes("fetch");

    return {
      success: false,
      error: error.message,
      shouldRetry,
      syncLogId: syncLog.id,
    };
  }
};

/**
 * Log sync attempt to Firebase syncReceipts collection
 */
const logSyncToFirebase = async (syncLog) => {
  try {
    const { addDoc, collection, serverTimestamp } =
      await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");

    const docRef = await addDoc(collection(db, "syncReceipts"), {
      ...syncLog,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    syncLog.id = docRef.id;

    return docRef.id;
  } catch (error) {
    console.error("Failed to log sync to Firebase:", error);
    return null;
  }
};

/**
 * Retry failed order duplication
 * Used by background sync service
 */
export const retryOrderDuplication = async (
  receiptData,
  cashier,
  maxRetries = 3,
) => {
  let attempt = 0;
  let lastError = null;

  while (attempt < maxRetries) {
    attempt++;

    console.log(
      `🔄 Retrying order duplication (attempt ${attempt}/${maxRetries}):`,
      receiptData.orderNumber,
    );

    const result = await duplicateOrderToISY(receiptData, cashier);

    if (result.success) {
      return result;
    }

    lastError = result.error;

    // Don't retry if we shouldn't
    if (!result.shouldRetry) {
      break;
    }

    // Wait before retrying (exponential backoff)
    if (attempt < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: lastError || "Max retries reached",
    attempts: attempt,
  };
};

/**
 * Batch duplicate multiple orders
 * Useful for syncing pending orders when coming back online
 */
export const batchDuplicateOrders = async (orders, cashier, onProgress) => {
  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: orders.length,
        orderNumber: order.orderNumber,
      });
    }

    const result = await retryOrderDuplication(order, cashier, 2);

    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push({
        orderNumber: order.orderNumber,
        error: result.error,
      });
    }

    // Small delay between requests to avoid overwhelming the API
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return results;
};

/**
 * Check if ISY API is configured
 */
export const isISYApiConfigured = () => {
  return !!(API_BASE_URL && API_USERNAME && API_PASSWORD);
};

/**
 * Get sync log by ID from Firebase
 */
export const getSyncLog = async (logId) => {
  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");

    const docRef = doc(db, "syncReceipts", logId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      };
    }

    return null;
  } catch (error) {
    console.error("Failed to get sync log:", error);
    return null;
  }
};

/**
 * Retry sync from Firebase log
 */
export const retryFromLog = async (logId) => {
  try {
    const syncLog = await getSyncLog(logId);

    if (!syncLog) {
      return {
        success: false,
        error: "Sync log not found",
      };
    }

    if (!syncLog.orderData) {
      return {
        success: false,
        error: "Order data not available in sync log",
      };
    }

    const cashier = {
      id: syncLog.cashierId,
      name: syncLog.cashierName,
    };

    return await duplicateOrderToISY(syncLog.orderData, cashier);
  } catch (error) {
    console.error("Failed to retry from log:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export const orderDuplicationService = {
  duplicateOrderToISY,
  retryOrderDuplication,
  batchDuplicateOrders,
  isISYApiConfigured,
  getSyncLog,
  retryFromLog,
};
