// src/app/api/cart/route.js
import { NextResponse } from "next/server";

// Simple in-memory cart store (in production, use database)
let currentCart = {
  items: [],
  discount: { type: "percentage", value: 0 },
  tax: { rate: 0, amount: 0 },
  customer: null,
  notes: "",
  total: 0,
  lastUpdated: null,
};

// CORS headers for Android app access
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET() {
  try {
    return new NextResponse(
      JSON.stringify({
        success: true,
        cart: currentCart,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error getting cart:", error);
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: "Failed to get cart",
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Update cart data
    if (body.items !== undefined) currentCart.items = body.items;
    if (body.discount !== undefined) currentCart.discount = body.discount;
    if (body.tax !== undefined) currentCart.tax = body.tax;
    if (body.customer !== undefined) currentCart.customer = body.customer;
    if (body.notes !== undefined) currentCart.notes = body.notes;
    if (body.total !== undefined) currentCart.total = body.total;

    currentCart.lastUpdated = new Date().toISOString();

    return new NextResponse(
      JSON.stringify({
        success: true,
        message: "Cart updated successfully",
        cart: currentCart,
        timestamp: currentCart.lastUpdated,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error updating cart:", error);
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: "Failed to update cart",
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { action, paymentData } = body;

    if (action === "process_payment") {
      // Update payment status via internal API call
      const paymentResponse = await fetch(
        `${request.nextUrl.origin}/api/cart/payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "processing",
            amount: paymentData.amount,
            method: paymentData.method,
            transactionId: paymentData.transactionId,
          }),
        }
      );

      if (!paymentResponse.ok) {
        throw new Error("Failed to update payment status");
      }

      // Clear cart after successful payment
      currentCart = {
        items: [],
        discount: { type: "percentage", value: 0 },
        tax: { rate: 0, amount: 0 },
        customer: null,
        notes: "",
        total: 0,
        lastUpdated: new Date().toISOString(),
      };

      // Mark payment as completed
      await fetch(`${request.nextUrl.origin}/api/cart/payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "completed",
          amount: paymentData.amount,
          method: paymentData.method,
          transactionId: paymentData.transactionId,
        }),
      });

      return new NextResponse(
        JSON.stringify({
          success: true,
          message: "Payment processed successfully",
          cart: currentCart,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new NextResponse(
      JSON.stringify({
        success: false,
        error: "Invalid action",
      }),
      {
        status: 400,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error("Error processing payment:", error);
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: "Failed to process payment",
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}

export async function DELETE() {
  try {
    // Clear the cart
    currentCart = {
      items: [],
      discount: { type: "percentage", value: 0 },
      tax: { rate: 0, amount: 0 },
      customer: null,
      notes: "",
      total: 0,
      lastUpdated: new Date().toISOString(),
    };

    return new NextResponse(
      JSON.stringify({
        success: true,
        message: "Cart cleared successfully",
        cart: currentCart,
        timestamp: currentCart.lastUpdated,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error clearing cart:", error);
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: "Failed to clear cart",
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
