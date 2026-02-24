import { NextResponse } from "next/server";
import {
  expensesService,
  purchasesService,
} from "@/lib/firebase/firestore";
import { purchaseOrdersService } from "@/lib/firebase/purchaseOrdersService";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Helper: convert any date-like value to ISO string
function toISOString(val) {
  if (!val) return null;
  // Firestore Timestamp object with toDate()
  if (typeof val?.toDate === "function") {
    return val.toDate().toISOString();
  }
  // Firestore Timestamp-like object {seconds, nanoseconds}
  if (val?.seconds != null) {
    return new Date(val.seconds * 1000).toISOString();
  }
  // Already a string
  if (typeof val === "string") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  // Date object
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val.toISOString();
  }
  // Number (timestamp ms)
  if (typeof val === "number") {
    return new Date(val).toISOString();
  }
  return null;
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/debug/migration-data?type=expenses|purchases
 * Fetches data from Firebase for migration to api.isy.software
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (!type) {
      return NextResponse.json(
        {
          success: false,
          error: "Type parameter required (expenses or purchases)",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    let data = [];

    switch (type) {
      case "expenses": {
        const expenses = await expensesService.getAll({
          orderBy: ["createdAt", "desc"],
        });
        data = expenses.map((expense) => ({
          firebaseId: expense.id,
          description: expense.description || "",
          amount: expense.amount || 0,
          currency: expense.currency || "THB",
          category: expense.category || "General",
          date: toISOString(expense.date) || toISOString(expense.createdAt) || new Date().toISOString(),
          status: expense.status || "pending",
          paymentMethod: expense.paymentMethod || expense.payment_method || "",
          vendor: expense.vendor || "",
          notes: expense.notes || "",
          employeeId: expense.employeeId || expense.userId || null,
          employeeName: expense.employeeName || expense.employee_name || "",
          source: expense.source || "POS",
          receipt_url: expense.receipt_url || null,
          submittedBy: expense.submittedBy || "",
          submittedByName: expense.submittedByName || "",
          submittedByRole: expense.submittedByRole || "",
          approvedBy: expense.approvedBy || "",
          approvedByName: expense.approvedByName || "",
          approvalNotes: expense.approvalNotes || "",
          createdAt: toISOString(expense.createdAt) || new Date().toISOString(),
          updatedAt: toISOString(expense.updatedAt) || new Date().toISOString(),
        }));
        break;
      }

      case "purchases": {
        // Try both collections - purchaseOrders and purchases
        let allPurchases = [];

        // From purchaseOrders collection
        try {
          const purchaseOrders = await purchaseOrdersService.getAll({});
          if (purchaseOrders && purchaseOrders.length > 0) {
            allPurchases = allPurchases.concat(
              purchaseOrders.map((po) => ({
                firebaseId: po.id,
                source_collection: "purchaseOrders",
                poNumber: po.poNumber || po.po_number || po.number || `PO-${po.id.slice(-6)}`,
                supplierName: po.supplierName || po.supplier_name || "Unknown",
                supplierContact: po.supplierContact || po.supplier_contact || "",
                items: (po.items || []).map((item) => ({
                  productId: item.productId || item.product_id || "",
                  productName: item.productName || item.product_name || item.name || "",
                  variantId: item.variantId || "",
                  quantity: item.quantity || 0,
                  unitCost: item.unitCost || item.unit_cost || item.unit_price || item.price || 0,
                  totalCost: item.totalCost || item.total_cost || item.total || 0,
                  isNewProduct: item.isNewProduct || false,
                })),
                subtotal: po.subtotal || 0,
                tax: po.tax || 0,
                total: po.total || 0,
                status: po.status || "pending",
                paymentStatus: po.paymentStatus || po.payment_status || "unpaid",
                orderDate: toISOString(po.orderDate) || toISOString(po.order_date) || toISOString(po.date) || new Date().toISOString(),
                expectedDate: toISOString(po.expectedDate) || toISOString(po.expected_date) || toISOString(po.delivery_date) || null,
                paymentDate: toISOString(po.paymentDate) || toISOString(po.payment_date) || null,
                notes: po.notes || "",
                createdAt: toISOString(po.createdAt) || new Date().toISOString(),
                updatedAt: toISOString(po.updatedAt) || new Date().toISOString(),
              }))
            );
          }
        } catch (e) {
          console.warn("Error fetching from purchaseOrders collection:", e);
        }

        // From purchases collection
        try {
          const purchases = await purchasesService.getAll({
            orderBy: ["createdAt", "desc"],
          });
          if (purchases && purchases.length > 0) {
            allPurchases = allPurchases.concat(
              purchases.map((purchase) => ({
                firebaseId: purchase.id,
                source_collection: "purchases",
                poNumber: purchase.po_number || purchase.number || `PO-${purchase.id.slice(-6)}`,
                supplierName: purchase.supplier_name || purchase.supplierName || "Unknown",
                supplierContact: purchase.supplier_contact || purchase.supplierContact || "",
                items: (purchase.items || []).map((item) => ({
                  productId: item.product_id || item.productId || "",
                  productName: item.product_name || item.productName || item.name || "",
                  variantId: item.variantId || "",
                  quantity: item.quantity || 0,
                  unitCost: item.unit_price || item.unitCost || item.price || 0,
                  totalCost: item.total || item.totalCost || 0,
                  isNewProduct: item.isNewProduct || false,
                })),
                subtotal: purchase.subtotal || 0,
                tax: purchase.tax || 0,
                total: purchase.total || 0,
                status: purchase.status || "pending",
                paymentStatus: purchase.paymentStatus || purchase.payment_status || "unpaid",
                orderDate: toISOString(purchase.order_date) || toISOString(purchase.date) || new Date().toISOString(),
                expectedDate: toISOString(purchase.delivery_date) || toISOString(purchase.expected_date) || null,
                paymentDate: toISOString(purchase.payment_date) || null,
                notes: purchase.notes || "",
                createdAt: toISOString(purchase.createdAt) || new Date().toISOString(),
                updatedAt: toISOString(purchase.updatedAt) || new Date().toISOString(),
              }))
            );
          }
        } catch (e) {
          console.warn("Error fetching from purchases collection:", e);
        }

        data = allPurchases;
        break;
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: "Invalid type. Must be: expenses or purchases",
          },
          { status: 400, headers: corsHeaders }
        );
    }

    return NextResponse.json(
      {
        success: true,
        type: type,
        count: data.length,
        data: data,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Migration data fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch migration data",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
