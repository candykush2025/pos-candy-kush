import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/config";
import { doc, getDoc } from "firebase/firestore";

/**
 * GET /api/stock/check?itemId={id}
 * Check current stock for a product
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    // Validate itemId
    if (!itemId) {
      return NextResponse.json(
        {
          success: false,
          error: "itemId is required",
          message: "Please provide an itemId parameter",
        },
        { status: 400 }
      );
    }

    // Get product from Firebase
    const productRef = doc(db, "products", itemId);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      return NextResponse.json(
        {
          success: false,
          error: "Product not found",
          message: `No product found with itemId: ${itemId}`,
        },
        { status: 404 }
      );
    }

    const product = productSnap.data();

    // Return stock information
    return NextResponse.json(
      {
        success: true,
        data: {
          itemId: itemId,
          name: product.name,
          sku: product.sku || null,
          barcode: product.barcode || null,
          stock: product.stock || 0,
          trackStock: product.trackStock || false,
          lowStock: product.lowStock || null,
          isLowStock:
            product.trackStock &&
            product.lowStock &&
            product.stock <= product.lowStock,
          isOutOfStock: product.trackStock && product.stock <= 0,
          availableForSale: product.availableForSale !== false,
          price: product.price || 0,
          cost: product.cost || 0,
          categoryId: product.categoryId || null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error checking stock:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
