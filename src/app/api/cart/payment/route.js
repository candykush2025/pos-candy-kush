import { NextResponse } from "next/server";

// In-memory store for payment status (in production, use database)
let paymentStatus = {
  status: "idle", // 'idle', 'processing', 'completed', 'failed'
  timestamp: null,
  amount: 0,
  method: null,
  transactionId: null,
};

export async function GET() {
  try {
    return NextResponse.json(
      {
        success: true,
        paymentStatus,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching payment status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch payment status",
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { status, amount, method, transactionId } = body;

    // Update payment status
    paymentStatus = {
      status: status || "idle",
      timestamp: new Date().toISOString(),
      amount: amount || 0,
      method: method || null,
      transactionId: transactionId || null,
    };

    return NextResponse.json(
      {
        success: true,
        paymentStatus,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  } catch (error) {
    console.error("Error updating payment status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update payment status",
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  );
}
