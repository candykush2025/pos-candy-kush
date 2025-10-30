import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request) {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/products/list
 * Get list of all products with optional filters
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const availableOnly = searchParams.get("availableOnly") === "true";
    const inStockOnly = searchParams.get("inStockOnly") === "true";

    // Build query
    const productsRef = collection(db, "products");
    let q = query(productsRef, orderBy("name", "asc"));

    // Apply category filter if provided
    if (categoryId) {
      q = query(
        productsRef,
        where("categoryId", "==", categoryId),
        orderBy("name", "asc")
      );
    }

    // Get products from Firebase
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return NextResponse.json(
        {
          success: true,
          data: [],
          count: 0,
          message: "No products found",
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // Map products data
    let products = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        itemId: doc.id,
        name: data.name,
        sku: data.sku || null,
        barcode: data.barcode || null,
        price: data.price || 0,
        cost: data.cost || 0,
        stock: data.stock || 0,
        trackStock: data.trackStock || false,
        lowStock: data.lowStock || null,
        isLowStock:
          data.trackStock && data.lowStock && data.stock <= data.lowStock,
        isOutOfStock: data.trackStock && data.stock <= 0,
        availableForSale: data.availableForSale !== false,
        categoryId: data.categoryId || null,
        imageUrl: data.imageUrl || null,
        color: data.color || null,
        description: data.description || null,
      };
    });

    // Apply filters
    if (availableOnly) {
      products = products.filter((p) => p.availableForSale);
    }

    if (inStockOnly) {
      products = products.filter((p) => !p.trackStock || p.stock > 0);
    }

    return NextResponse.json(
      {
        success: true,
        data: products,
        count: products.length,
        filters: {
          categoryId: categoryId || null,
          availableOnly,
          inStockOnly,
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error fetching products:", error);
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
