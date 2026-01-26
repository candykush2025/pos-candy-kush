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
 * Transform POS receipt data to ISY API V2 format (CamelCase)
 */
const transformReceiptData = (receiptData, cashier) => {
  return {
    // === IDENTIFIERS ===
    orderNumber: receiptData.orderNumber || receiptData.receipt_number || receiptData.number,
    deviceId: receiptData.deviceId,

    // === TIMESTAMPS ===
    createdAt: receiptData.createdAt || receiptData.created_at,
    receiptDate: receiptData.receiptDate || receiptData.receipt_date || receiptData.createdAt || receiptData.created_at,
    updatedAt: receiptData.updatedAt || receiptData.updated_at,

    // === CUSTOMER INFORMATION ===
    customerId: receiptData.customerId || receiptData.customer_id || null,
    customerName: receiptData.customerName || receiptData.customer_name || null,
    customer: receiptData.customer
      ? {
          id: receiptData.customer.id,
          customerId: receiptData.customer.customerId || receiptData.customer.customer_id,
          name: receiptData.customer.name,
          lastName: receiptData.customer.lastName || null,
          fullName: receiptData.customer.fullName || receiptData.customer.name,
          email: receiptData.customer.email || null,
          phone: receiptData.customer.phone || null,
          isNoMember: receiptData.customer.isNoMember ?? !receiptData.customerId,
          currentPoints: receiptData.customer.currentPoints || 0,
        }
      : null,

    // === ORDER ITEMS ===
    items: (receiptData.line_items || receiptData.lineItems || receiptData.items || []).map((item) => ({
      productId: item.item_id || item.productId || item.product_id,
      variantId: item.variant_id || item.variantId || null,
      sku: item.sku || null,
      name: item.item_name || item.name || item.product_name,
      quantity: item.quantity || item.qty || 1,
      price: item.price || item.unit_price || 0,
      discount: item.total_discount || item.discount || 0,
      tax: item.tax || 0,
      total: item.total_money || item.total || item.totalMoney || (item.quantity || 1) * (item.price || 0),
      cost: item.cost || 0,
    })),

    // === PRICING ===
    subtotal: receiptData.subtotal || receiptData.sub_total || 0,
    discountAmount: receiptData.total_discount || receiptData.totalDiscount || receiptData.discount || 0,
    taxAmount: receiptData.total_tax || receiptData.totalTax || receiptData.tax || 0,
    totalAmount: receiptData.totalAmount || receiptData.total_money || receiptData.totalMoney || receiptData.total || 0,
    tip: receiptData.tip || 0,
    surcharge: receiptData.surcharge || 0,

    // === PAYMENT INFORMATION ===
    paymentMethod: receiptData.paymentMethod || receiptData.payment_method || "cash",
    paymentTypeName: receiptData.paymentTypeName || receiptData.payment_type_name || null,
    cashReceived: receiptData.cashReceived || receiptData.cash_received || null,
    change: receiptData.change || 0,
    payment: {
      method: receiptData.paymentMethod || receiptData.payment_method || "cash",
      amount: receiptData.totalAmount || receiptData.total_money || receiptData.totalMoney || receiptData.total || 0,
      changeDue: receiptData.change || 0,
      transactionId: receiptData.transactionId || "",
    },

    // === POINTS & CASHBACK ===
    pointsUsed: receiptData.points_used || receiptData.pointsUsed || 0,
    pointsDiscount: receiptData.points_discount || receiptData.pointsDiscount || 0,
    pointsEarned: receiptData.points_earned || receiptData.pointsEarned || 0,
    pointsDeducted: receiptData.points_deducted || receiptData.pointsDeducted || 0,
    pointsBalance: receiptData.points_balance || receiptData.pointsBalance || 0,
    cashbackEarned: receiptData.cashback_earned || receiptData.cashbackEarned || 0,
    cashbackBreakdown: receiptData.cashback_breakdown || receiptData.cashbackBreakdown || [],

    // === EMPLOYEE INFORMATION ===
    cashierId: receiptData.cashierId || receiptData.cashier_id || cashier?.id || null,
    cashierName: receiptData.cashierName || receiptData.cashier_name || cashier?.name || "",
    userId: receiptData.userId || receiptData.user_id || receiptData.cashierId || receiptData.cashier_id || cashier?.id || null,

    // === STATUS & METADATA ===
    status: receiptData.status || "completed",
    receiptType: receiptData.receipt_type || receiptData.receiptType || "SALE",
    source: receiptData.source || "POS System",
    cancelledAt: receiptData.cancelled_at || receiptData.cancelledAt || null,
    fromThisDevice: receiptData.fromThisDevice ?? true,

    // === DISCOUNTS ===
    discounts: receiptData.discounts || [],

    // === SYNC STATUS ===
    syncStatus: "synced",
    syncedAt: new Date().toISOString(),
  };
};

/**
 * Duplicate order to ISY API and log to Firebase
 */
export const duplicateOrderToISY = async (receiptData, cashier) => {
  console.log("[ISY SYNC] 🚀 Starting order duplication:", {
    orderNumber: receiptData.orderNumber,
    receiptId: receiptData.id,
    cashier: cashier?.name,
    timestamp: new Date().toISOString(),
  });

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
    console.log("[SYNC LOG] Attempting to log sync to Firebase:", {
      orderNumber: syncLog.orderNumber,
      status: syncLog.status,
      timestamp: new Date().toISOString(),
    });

    const { addDoc, collection, serverTimestamp } =
      await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");

    if (!db) {
      console.error("[SYNC LOG] Firebase db is not initialized");
      return null;
    }

    const logData = {
      ...syncLog,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    console.log("[SYNC LOG] Creating document in syncReceipts collection...");

    const docRef = await addDoc(collection(db, "syncReceipts"), logData);

    syncLog.id = docRef.id;

    console.log("[SYNC LOG] ✅ Successfully logged to Firebase:", {
      docId: docRef.id,
      orderNumber: syncLog.orderNumber,
      status: syncLog.status,
    });

    return docRef.id;
  } catch (error) {
    console.error("[SYNC LOG] ❌ Failed to log sync to Firebase:", error);
    console.error("[SYNC LOG] Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
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
