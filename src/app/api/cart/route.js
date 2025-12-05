// src/app/api/cart/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";

const CART_DOC_ID = "current_cart";
const CART_COLLECTION = "posCart";

const getEmptyCart = () => ({
  items: [],
  discounts: [],
  discount: { type: "percentage", value: 0 },
  tax: { rate: 0, amount: 0 },
  customer: null,
  notes: "",
  subtotal: 0,
  discountAmount: 0,
  total: 0,
  lastUpdated: new Date().toISOString(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET() {
  try {
    const cartRef = doc(db, CART_COLLECTION, CART_DOC_ID);
    const cartSnap = await getDoc(cartRef);
    let cart = cartSnap.exists() ? cartSnap.data() : getEmptyCart();
    return new NextResponse(
      JSON.stringify({
        success: true,
        cart,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[Cart API] Error:", error);
    return new NextResponse(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const cartData = {
      items: body.items || [],
      discounts: body.discounts || [],
      discount: body.discount || { type: "percentage", value: 0 },
      tax: body.tax || { rate: 0, amount: 0 },
      customer: body.customer || null,
      notes: body.notes || "",
      subtotal: body.subtotal || 0,
      discountAmount: body.discountAmount || 0,
      total: body.total || 0,
      kioskOrderId: body.kioskOrderId || null,
      lastUpdated: new Date().toISOString(),
    };
    const cartRef = doc(db, CART_COLLECTION, CART_DOC_ID);
    await setDoc(cartRef, cartData);
    return new NextResponse(
      JSON.stringify({
        success: true,
        message: "Cart updated",
        cart: cartData,
        timestamp: cartData.lastUpdated,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[Cart API] Error:", error);
    return new NextResponse(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE() {
  try {
    const emptyCart = getEmptyCart();
    const cartRef = doc(db, CART_COLLECTION, CART_DOC_ID);
    await setDoc(cartRef, emptyCart);
    return new NextResponse(
      JSON.stringify({
        success: true,
        message: "Cart cleared",
        cart: emptyCart,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[Cart API] Error:", error);
    return new NextResponse(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}
