import { NextResponse } from "next/server";
import {
  expensesService,
  purchasesService,
  invoicesService,
} from "@/lib/firebase/firestore";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (!type) {
      return NextResponse.json(
        {
          success: false,
          error: "Type parameter required (expenses, purchases, or invoices)",
        },
        { status: 400, headers: corsHeaders },
      );
    }

    let data = [];

    switch (type) {
      case "expenses":
        const expenses = await expensesService.getAll({
          orderBy: ["createdAt", "desc"],
        });
        data = expenses.map((expense) => ({
          id: expense.id,
          description: expense.description || "",
          amount: expense.amount || 0,
          currency: expense.currency || "THB",
          category: expense.category || "",
          date:
            expense.date ||
            expense.createdAt?.toDate?.()?.toISOString() ||
            null,
          status: expense.status || "pending",
          employeeId: expense.employeeId || expense.userId || null,
          source: expense.source || "POS",
          receipt_url: expense.receipt_url || null,
          notes: expense.notes || "",
          created_at: expense.createdAt?.toDate?.()?.toISOString() || null,
          updated_at: expense.updatedAt?.toDate?.()?.toISOString() || null,
        }));
        break;

      case "purchases":
        const purchases = await purchasesService.getAll({
          orderBy: ["createdAt", "desc"],
        });
        data = purchases.map((purchase) => ({
          id: purchase.id,
          po_number:
            purchase.po_number ||
            purchase.number ||
            `PO-${purchase.id.slice(-6)}`,
          supplier_name:
            purchase.supplier_name || purchase.supplierName || "Unknown",
          order_date: purchase.order_date || purchase.date || null,
          delivery_date: purchase.delivery_date || null,
          items: (purchase.items || []).map((item) => ({
            product_id: item.product_id || item.productId,
            product_name: item.product_name || item.productName || item.name,
            quantity: item.quantity || 0,
            unit_price: item.unit_price || item.price || 0,
            total:
              item.total ||
              item.quantity * (item.unit_price || item.price) ||
              0,
          })),
          total: purchase.total || 0,
          status: purchase.status || "pending",
          notes: purchase.notes || "",
          created_at: purchase.createdAt?.toDate?.()?.toISOString() || null,
          updated_at: purchase.updatedAt?.toDate?.()?.toISOString() || null,
        }));
        break;

      case "invoices":
        const invoices = await invoicesService.getAll({
          orderBy: ["createdAt", "desc"],
        });
        data = invoices.map((invoice) => ({
          id: invoice.id,
          invoice_number: invoice.number || `INV-${invoice.id.slice(-6)}`,
          customer_name:
            invoice.customer_name || invoice.customerName || "Unknown",
          date: invoice.date || null,
          due_date: invoice.due_date || null,
          payment_method: invoice.payment_method || null,
          items: (invoice.items || []).map((item) => ({
            product_id: item.product_id || item.productId,
            product_name: item.product_name || item.productName || item.name,
            quantity: item.quantity || 1,
            price: item.price || 0,
            total: item.total || item.quantity * item.price || 0,
          })),
          total: invoice.total || 0,
          status: invoice.status || "pending",
          payment_status: invoice.payment_status || invoice.status || "pending",
          created_at: invoice.createdAt?.toDate?.()?.toISOString() || null,
          updated_at: invoice.updatedAt?.toDate?.()?.toISOString() || null,
        }));
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: "Invalid type. Must be: expenses, purchases, or invoices",
          },
          { status: 400, headers: corsHeaders },
        );
    }

    return NextResponse.json(
      {
        success: true,
        type: type,
        count: data.length,
        data: data,
      },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    console.error("Export data error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to export data",
      },
      { status: 500, headers: corsHeaders },
    );
  }
}
