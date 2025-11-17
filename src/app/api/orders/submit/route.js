import { NextResponse } from "next/server";
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request) {
  // Set CORS headers for kiosk website
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://candy-kush-kiosk.vercel.app",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Kiosk-ID, X-API-Key",
  };

  try {
    // 1. Parse request body
    const body = await request.json();
    const { orderData } = body;

    // 2. Validate required fields
    const validation = validateOrderData(orderData);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid order data",
          message: validation.message,
          validationErrors: validation.errors,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // 3. Get kiosk ID from headers
    const kioskId =
      request.headers.get("X-Kiosk-ID") || orderData.kioskId || "UNKNOWN";

    // Optional: Verify API key for security
    const apiKey = request.headers.get("X-API-Key");
    if (process.env.KIOSK_API_KEY && apiKey !== process.env.KIOSK_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          message: "Invalid API key",
        },
        { status: 401, headers: corsHeaders }
      );
    }

    // 4. Prepare order document for Firebase
    const orderDocument = {
      // Order Identification
      transactionId: orderData.transactionId,
      orderNumber: orderData.orderNumber || orderData.transactionId,
      kioskId: kioskId,
      status: "pending_confirmation", // Status: pending_confirmation, confirmed, completed, cancelled

      // Customer Information
      customer: {
        id: orderData.customer?.id || null,
        customerId: orderData.customer?.customerId || null,
        name: orderData.customer?.name || "",
        lastName: orderData.customer?.lastName || "",
        fullName:
          orderData.customer?.fullName || orderData.customer?.name || "Guest",
        email: orderData.customer?.email || "",
        phone: orderData.customer?.phone || "",
        isNoMember: orderData.customer?.isNoMember || false,
        currentPoints: orderData.customer?.currentPoints || 0,
      },

      // Order Items
      items: orderData.items || [],

      // Pricing
      pricing: {
        subtotal: orderData.pricing?.subtotal || 0,
        tax: orderData.pricing?.tax || 0,
        discount: orderData.pricing?.discount || 0,
        pointsUsed: orderData.pricing?.pointsUsed || 0,
        pointsUsedValue: orderData.pricing?.pointsUsedValue || 0,
        total: orderData.pricing?.total || 0,
      },

      // Payment Information
      payment: {
        method: orderData.payment?.method || "",
        status: orderData.payment?.status || "pending_confirmation",
        confirmedBy: null,
        confirmedAt: null,

        // For crypto payments
        cryptoDetails:
          orderData.payment?.method === "crypto"
            ? {
                currency: orderData.payment?.cryptoDetails?.currency || "",
                paymentId: orderData.payment?.cryptoDetails?.paymentId || "",
                amount: orderData.payment?.cryptoDetails?.amount || 0,
                amountInCrypto:
                  orderData.payment?.cryptoDetails?.amountInCrypto || 0,
                network: orderData.payment?.cryptoDetails?.network || "",
                address: orderData.payment?.cryptoDetails?.address || "",
                transactionHash:
                  orderData.payment?.cryptoDetails?.transactionHash || null,
                paymentUrl: orderData.payment?.cryptoDetails?.paymentUrl || "",
                verificationStatus: "pending",
                verifiedAt: null,
              }
            : null,
      },

      // Points & Cashback
      points: {
        earned: orderData.points?.earned || 0,
        used: orderData.points?.used || 0,
        usedValue: orderData.points?.usedValue || 0,
        usagePercentage: orderData.points?.usagePercentage || 0,
        details: orderData.points?.details || [],
        calculation: orderData.points?.calculation || null,
      },

      // Metadata
      source: "kiosk",
      kioskLocation: orderData.metadata?.kioskLocation || "Unknown",
      orderCompletedAt: orderData.metadata?.orderCompletedAt
        ? Timestamp.fromDate(new Date(orderData.metadata.orderCompletedAt))
        : serverTimestamp(),
      requiresConfirmation: true,
      notes: orderData.metadata?.notes || "",

      // Timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // 5. Save to Firebase
    const docRef = await addDoc(collection(db, "kioskOrders"), orderDocument);

    // 6. Get queue position (optional)
    const queueNumber = await getQueuePosition();

    // 7. Return success response
    return NextResponse.json(
      {
        success: true,
        message: "Order received successfully",
        data: {
          orderId: docRef.id,
          transactionId: orderData.transactionId,
          status: "pending_confirmation",
          confirmationUrl: `/api/orders/${docRef.id}/confirm`,
          queueNumber: queueNumber,
          estimatedWaitTime: "2-3 minutes",
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("❌ Error processing kiosk order:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error.message,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Validation function
function validateOrderData(orderData) {
  const errors = [];

  if (!orderData) {
    return {
      valid: false,
      message: "Order data is required",
      errors: [{ field: "orderData", message: "Order data is required" }],
    };
  }

  // Required fields
  if (!orderData.transactionId) {
    errors.push({
      field: "transactionId",
      message: "Transaction ID is required",
    });
  }

  if (!orderData.items || orderData.items.length === 0) {
    errors.push({
      field: "items",
      message: "Order must have at least one item",
    });
  }

  if (!orderData.pricing || orderData.pricing.total === undefined) {
    errors.push({
      field: "pricing.total",
      message: "Total amount is required",
    });
  }

  if (!orderData.payment || !orderData.payment.method) {
    errors.push({
      field: "payment.method",
      message: "Payment method is required",
    });
  }

  if (errors.length > 0) {
    return {
      valid: false,
      message: "Validation failed",
      errors: errors,
    };
  }

  return { valid: true };
}

// Get queue position
async function getQueuePosition() {
  // Implement logic to count pending orders
  // Return queue number
  return Math.floor(Math.random() * 10) + 1;
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "https://candy-kush-kiosk.vercel.app",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Kiosk-ID, X-API-Key",
      },
    }
  );
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json(
    {
      error: "Method not allowed",
      message: "This endpoint only accepts POST requests",
    },
    {
      status: 405,
      headers: {
        "Access-Control-Allow-Origin": "https://candy-kush-kiosk.vercel.app",
      },
    }
  );
}
