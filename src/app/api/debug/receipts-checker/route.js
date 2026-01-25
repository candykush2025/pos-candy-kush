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
    // Only allow in non-production environments
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          success: false,
          error: "Debug endpoint disabled in production",
          debug: {
            requestId,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
          },
        },
        { status: 403 },
      );
    }

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
function formatReceiptSummary(receipt, includePayments, includeItems) {
  const baseReceipt = {
    id: receipt.id,
    receiptNumber:
      receipt.receiptNumber || receipt.receipt_number || receipt.number,
    createdAt: receipt.createdAt?.toDate?.()
      ? receipt.createdAt.toDate().toISOString()
      : receipt.createdAt,
    total: receipt.total || receipt.totalMoney || receipt.total_money || 0,
    customerId: receipt.customerId || receipt.customer_id,
    cashierId: receipt.cashierId || receipt.cashier_id,
    status: receipt.status || "completed",
  };

  if (includePayments) {
    baseReceipt.payments = (receipt.payments || []).map((payment) => ({
      type: payment.payment_type || payment.type,
      amount: payment.money_amount || payment.amount || payment.paid_money || 0,
      payment_type_name: payment.payment_type_name || payment.name,
    }));
  }

  if (includeItems) {
    baseReceipt.items = (receipt.items || receipt.lineItems || []).map(
      (item) => ({
        productId: item.productId || item.product_id || item.id,
        name: item.name || item.product_name,
        quantity: item.quantity || item.qty || 1,
        price: item.price || item.unit_price || 0,
        total: item.total || item.quantity * item.price || 0,
      }),
    );
  }

  return baseReceipt;
}

/**
 * Format receipt for full view (complete data for detailed comparison)
 */
function formatReceiptFull(receipt, includePayments, includeItems) {
  const fullReceipt = {
    id: receipt.id,
    _firestoreId: receipt._firestoreId,
    _dataId: receipt._dataId,

    // Basic info
    receiptNumber:
      receipt.receiptNumber || receipt.receipt_number || receipt.number,
    createdAt: receipt.createdAt?.toDate?.()
      ? receipt.createdAt.toDate().toISOString()
      : receipt.createdAt,
    updatedAt: receipt.updatedAt?.toDate?.()
      ? receipt.updatedAt.toDate().toISOString()
      : receipt.updatedAt,

    // Financial data
    total: receipt.total || receipt.totalMoney || receipt.total_money || 0,
    subtotal: receipt.subtotal || receipt.sub_total || 0,
    tax: receipt.tax || receipt.tax_amount || 0,
    discount: receipt.discount || receipt.discount_amount || 0,

    // Customer and cashier info
    customerId: receipt.customerId || receipt.customer_id,
    customerName: receipt.customerName || receipt.customer_name,
    cashierId: receipt.cashierId || receipt.cashier_id,
    cashierName: receipt.cashierName || receipt.cashier_name,

    // Status and metadata
    status: receipt.status || "completed",
    notes: receipt.notes || receipt.note,
    tableNumber: receipt.tableNumber || receipt.table_number,
    orderType: receipt.orderType || receipt.order_type,

    // Raw data for debugging
    rawData: receipt,
  };

  if (includePayments) {
    fullReceipt.payments = (receipt.payments || []).map((payment) => ({
      id: payment.id,
      payment_type: payment.payment_type || payment.type,
      payment_type_name: payment.payment_type_name || payment.name,
      money_amount:
        payment.money_amount || payment.amount || payment.paid_money || 0,
      paid_money: payment.paid_money || payment.money_amount || 0,
      change: payment.change || 0,
      rawData: payment,
    }));
  }

  if (includeItems) {
    fullReceipt.items = (receipt.items || receipt.lineItems || []).map(
      (item) => ({
        id: item.id,
        productId: item.productId || item.product_id,
        name: item.name || item.product_name,
        quantity: item.quantity || item.qty || 1,
        price: item.price || item.unit_price || 0,
        total: item.total || item.quantity * item.price || 0,
        discount: item.discount || 0,
        tax: item.tax || 0,
        category: item.category || item.category_name,
        rawData: item,
      }),
    );
  }

  return fullReceipt;
}
