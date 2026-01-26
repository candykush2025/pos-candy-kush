import { NextRequest, NextResponse } from "next/server";
import { receiptsService } from "@/lib/firebase/firestore";

/**
 * DEBUG ENDPOINT: Receipts Checker API
 *
 * This endpoint allows checking receipts against a new server for data migration/validation.
 * It provides receipts data in a standardized format for comparison and import.
 *
 * USAGE:
 * GET /api/debug/receipts-checker
 *
 * Query Parameters:
 * - startDate: ISO date string (YYYY-MM-DD) - Start date for receipt filtering
 * - endDate: ISO date string (YYYY-MM-DD) - End date for receipt filtering
 * - receiptIds: Comma-separated list of receipt IDs to fetch specific receipts
 * - limit: Maximum number of receipts to return (default: 100, max: 1000)
 * - offset: Number of receipts to skip (for pagination)
 * - format: Response format - 'full' (default) or 'summary'
 * - includePayments: Whether to include payment details (default: true)
 * - includeItems: Whether to include item details (default: true)
 *
 * Response Format:
 * {
 *   "success": true,
 *   "data": {
 *     "receipts": [...],
 *     "total": 150,
 *     "returned": 100,
 *     "hasMore": true
 *   },
 *   "debug": {
 *     "requestId": "uuid",
 *     "timestamp": "2024-01-25T10:30:00Z",
 *     "processingTime": 1250,
 *     "query": {...},
 *     "filters": {...}
 *   }
 * }
 */

export async function GET(request) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const receiptIds = searchParams
      .get("receiptIds")
      ?.split(",")
      .filter((id) => id.trim());
    const limit = Math.min(parseInt(searchParams.get("limit")) || 100, 1000);
    const offset = parseInt(searchParams.get("offset")) || 0;
    const format = searchParams.get("format") || "full";
    const includePayments = searchParams.get("includePayments") !== "false";
    const includeItems = searchParams.get("includeItems") !== "false";

    // Build debug info
    const debugInfo = {
      requestId,
      timestamp: new Date().toISOString(),
      query: Object.fromEntries(searchParams),
      filters: {
        startDate,
        endDate,
        receiptIds: receiptIds || [],
        limit,
        offset,
        format,
        includePayments,
        includeItems,
      },
    };

    console.log(
      `[DEBUG RECEIPTS CHECKER] Request ${requestId} started`,
      debugInfo,
    );

    let receipts = [];
    let totalCount = 0;

    // Fetch receipts based on parameters
    if (receiptIds && receiptIds.length > 0) {
      // Fetch specific receipts by IDs
      console.log(
        `[DEBUG RECEIPTS CHECKER] Fetching ${receiptIds.length} specific receipts`,
      );
      const receiptPromises = receiptIds.map((id) =>
        receiptsService.get(id.trim()),
      );
      const receiptResults = await Promise.allSettled(receiptPromises);

      receipts = receiptResults
        .filter((result) => result.status === "fulfilled" && result.value)
        .map((result) => result.value);

      totalCount = receipts.length;

      // Log any failed fetches
      const failedCount = receiptResults.filter(
        (result) => result.status === "rejected",
      ).length;
      if (failedCount > 0) {
        console.warn(
          `[DEBUG RECEIPTS CHECKER] ${failedCount} receipt fetches failed`,
        );
      }
    } else {
      // Fetch receipts by date range or all receipts
      const queryOptions = {
        orderBy: ["createdAt", "desc"],
        limit: limit + offset + 100, // Fetch extra for pagination
      };

      if (startDate || endDate) {
        console.log(
          `[DEBUG RECEIPTS CHECKER] Fetching receipts by date range: ${startDate} to ${endDate}`,
        );
        receipts = await receiptsService.getByDateRange(
          startDate ? new Date(startDate) : null,
          endDate ? new Date(endDate) : null,
          queryOptions,
        );
      } else {
        console.log(
          `[DEBUG RECEIPTS CHECKER] Fetching all receipts (limited to ${limit + offset + 100})`,
        );
        receipts = await receiptsService.getAll(queryOptions);
      }

      totalCount = receipts.length;
    }

    // Apply pagination
    const paginatedReceipts = receipts.slice(offset, offset + limit);
    const hasMore = offset + limit < totalCount;

    console.log(
      `[DEBUG RECEIPTS CHECKER] Retrieved ${receipts.length} total receipts, returning ${paginatedReceipts.length} (offset: ${offset}, limit: ${limit})`,
    );

    // Format receipts based on requested format
    const formattedReceipts = paginatedReceipts.map((receipt) => {
      if (format === "summary") {
        return formatReceiptSummary(receipt, includePayments, includeItems);
      } else {
        return formatReceiptFull(receipt, includePayments, includeItems);
      }
    });

    const processingTime = Date.now() - startTime;

    const response = {
      success: true,
      data: {
        receipts: formattedReceipts,
        total: totalCount,
        returned: formattedReceipts.length,
        hasMore,
        offset,
        limit,
      },
      debug: {
        ...debugInfo,
        processingTime,
        receiptsFound: receipts.length,
        receiptsReturned: formattedReceipts.length,
        hasMore,
      },
    };

    console.log(
      `[DEBUG RECEIPTS CHECKER] Request ${requestId} completed in ${processingTime}ms`,
    );

    return NextResponse.json(response);
  } catch (error) {
    const processingTime = Date.now() - startTime;

    console.error(
      `[DEBUG RECEIPTS CHECKER] Request ${requestId} failed:`,
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        debug: {
          requestId,
          timestamp: new Date().toISOString(),
          processingTime,
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        },
      },
      { status: 500 },
    );
  }
}

/**
 * Format receipt for summary view (minimal data for quick comparison)
 */
/**
 * Format receipt for summary view (minimal data for quick comparison)
 * Aligned with POS_RECEIPT_API_SPECIFICATION.md
 */
function formatReceiptSummary(receipt, includePayments, includeItems) {
  // Helper to safely convert Firestore timestamp
  const toISOString = (timestamp) => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate().toISOString();
    if (typeof timestamp === 'string') return timestamp;
    return new Date(timestamp).toISOString();
  };

  const baseReceipt = {
    id: receipt.id,
    orderNumber: receipt.orderNumber || receipt.receiptNumber || receipt.receipt_number || receipt.number,
    created_at: toISOString(receipt.created_at || receipt.createdAt),
    total_money: receipt.total_money || receipt.totalMoney || receipt.total || 0,
    customerId: receipt.customerId || receipt.customer_id || null,
    cashierId: receipt.cashierId || receipt.cashier_id || null,
    status: receipt.status || "completed",
  };

  if (includePayments) {
    baseReceipt.payments = (receipt.payments || []).map((payment) => ({
      payment_type_id: payment.payment_type_id || payment.paymentTypeId || payment.id,
      name: payment.name || payment.payment_type_name || payment.type,
      type: payment.type || payment.payment_type || "CASH",
      money_amount: payment.money_amount || payment.amount || payment.paid_money || 0,
    }));
  }

  if (includeItems) {
    baseReceipt.line_items = (receipt.line_items || receipt.lineItems || receipt.items || []).map((item) => ({
      id: item.id,
      item_id: item.item_id || item.productId || item.product_id,
      item_name: item.item_name || item.name || item.product_name,
      quantity: item.quantity || item.qty || 1,
      price: item.price || item.unit_price || 0,
      total_money: item.total_money || item.total || item.totalMoney || (item.quantity || 1) * (item.price || 0),
    }));
  }

  return baseReceipt;
}

/**
 * Format receipt for full view (complete data for detailed comparison)
 * Aligned with POS_RECEIPT_API_SPECIFICATION.md
 */
function formatReceiptFull(receipt, includePayments, includeItems) {
  // Helper to safely convert Firestore timestamp
  const toISOString = (timestamp) => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate().toISOString();
    if (typeof timestamp === 'string') return timestamp;
    return new Date(timestamp).toISOString();
  };

  const fullReceipt = {
    // === IDENTIFIERS ===
    id: receipt.id,
    _firestoreId: receipt._firestoreId,
    _dataId: receipt._dataId,
    orderNumber: receipt.orderNumber || receipt.receiptNumber || receipt.receipt_number || receipt.number,
    deviceId: receipt.deviceId || receipt.device_id || null,

    // === TIMESTAMPS ===
    created_at: toISOString(receipt.created_at || receipt.createdAt),
    receipt_date: toISOString(receipt.receipt_date || receipt.receiptDate || receipt.created_at || receipt.createdAt),
    updated_at: toISOString(receipt.updated_at || receipt.updatedAt),

    // === CUSTOMER INFORMATION ===
    customerId: receipt.customerId || receipt.customer_id || null,
    customerName: receipt.customerName || receipt.customer_name || null,
    customer: receipt.customer || {
      id: receipt.customerId || receipt.customer_id || null,
      customerId: receipt.customerId || receipt.customer_id || null,
      name: receipt.customerName || receipt.customer_name || "",
      lastName: receipt.customer?.lastName || null,
      fullName: receipt.customerName || receipt.customer_name || "",
      email: receipt.customer?.email || null,
      phone: receipt.customer?.phone || null,
      isNoMember: receipt.customer?.isNoMember ?? !receipt.customerId,
      currentPoints: receipt.customer?.currentPoints || 0
    },

    // === PRICING ===
    subtotal: receipt.subtotal || receipt.sub_total || 0,
    total_discount: receipt.total_discount || receipt.totalDiscount || receipt.discount || 0,
    total_tax: receipt.total_tax || receipt.totalTax || receipt.tax || 0,
    total_money: receipt.total_money || receipt.totalMoney || receipt.total || 0,
    tip: receipt.tip || 0,
    surcharge: receipt.surcharge || 0,

    // === PAYMENT INFORMATION ===
    paymentMethod: receipt.paymentMethod || receipt.payment_method || "cash",
    paymentTypeName: receipt.paymentTypeName || receipt.payment_type_name || null,
    cashReceived: receipt.cashReceived || receipt.cash_received || null,
    change: receipt.change || 0,

    // === POINTS & CASHBACK ===
    points_used: receipt.points_used || receipt.pointsUsed || 0,
    points_discount: receipt.points_discount || receipt.pointsDiscount || 0,
    points_earned: receipt.points_earned || receipt.pointsEarned || 0,
    points_deducted: receipt.points_deducted || receipt.pointsDeducted || 0,
    points_balance: receipt.points_balance || receipt.pointsBalance || 0,
    cashback_earned: receipt.cashback_earned || receipt.cashbackEarned || 0,
    cashback_breakdown: receipt.cashback_breakdown || receipt.cashbackBreakdown || [],

    // === EMPLOYEE INFORMATION ===
    cashierId: receipt.cashierId || receipt.cashier_id || null,
    cashierName: receipt.cashierName || receipt.cashier_name || "",
    userId: receipt.userId || receipt.user_id || receipt.cashierId || receipt.cashier_id || null,

    // === STATUS & METADATA ===
    status: receipt.status || "completed",
    receipt_type: receipt.receipt_type || receipt.receiptType || "SALE",
    source: receipt.source || "POS System",
    cancelled_at: toISOString(receipt.cancelled_at || receipt.cancelledAt),
    fromThisDevice: receipt.fromThisDevice ?? true,

    // === SYNC STATUS ===
    syncStatus: receipt.syncStatus || receipt.sync_status || "synced",
    syncedAt: toISOString(receipt.syncedAt || receipt.synced_at),

    // Raw data for debugging
    rawData: receipt,
  };

  if (includePayments) {
    fullReceipt.payments = (receipt.payments || []).map((payment) => ({
      payment_type_id: payment.payment_type_id || payment.paymentTypeId || payment.id,
      name: payment.name || payment.payment_type_name || payment.type,
      type: payment.type || payment.payment_type || "CASH",
      money_amount: payment.money_amount || payment.amount || payment.paid_money || 0,
      paid_at: toISOString(payment.paid_at || payment.paidAt || receipt.created_at || receipt.createdAt),
      paid_money: payment.paid_money || payment.money_amount || 0,
      change: payment.change || 0,
      rawData: payment,
    }));
  }

  if (includeItems) {
    fullReceipt.line_items = (receipt.line_items || receipt.lineItems || receipt.items || []).map((item) => ({
      id: item.id || item.cart_id,
      item_id: item.item_id || item.productId || item.product_id,
      variant_id: item.variant_id || item.variantId || null,
      item_name: item.item_name || item.name || item.product_name,
      variant_name: item.variant_name || item.variantName || null,
      sku: item.sku || null,
      quantity: item.quantity || item.qty || 1,
      price: item.price || item.unit_price || 0,
      gross_total_money: item.gross_total_money || item.grossTotal || (item.quantity || 1) * (item.price || 0),
      total_money: item.total_money || item.total || item.totalMoney || (item.quantity || 1) * (item.price || 0),
      cost: item.cost || 0,
      total_discount: item.total_discount || item.discount || 0,
      categoryId: item.categoryId || item.category_id || null,
      categoryName: item.categoryName || item.category_name || item.category || null,
      rawData: item,
    }));
  }

  // === DISCOUNTS ===
  if (receipt.discounts) {
    fullReceipt.discounts = receipt.discounts.map((discount) => ({
      id: discount.id,
      name: discount.name,
      type: discount.type,
      value: discount.value,
      amount: discount.amount,
    }));
  }

  return fullReceipt;
}
