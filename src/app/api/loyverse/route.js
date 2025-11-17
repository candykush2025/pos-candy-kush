/**
 * Loyverse API Proxy Route
 * Handles CORS issues by proxying requests through Next.js API
 */

const LOYVERSE_API_BASE = "https://api.loyverse.com/v1.0";
const LOYVERSE_ACCESS_TOKEN = process.env.LOYVERSE_ACCESS_TOKEN;

export async function GET(request) {
  // Check if access token is configured
  if (!LOYVERSE_ACCESS_TOKEN) {
    return Response.json(
      {
        error: true,
        message:
          "Loyverse access token not configured. Please set LOYVERSE_ACCESS_TOKEN in .env.local",
      },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint") || "/categories";

  try {
    // Build query parameters
    const queryParams = new URLSearchParams();

    // Common parameters
    const limit = searchParams.get("limit");
    const cursor = searchParams.get("cursor");
    const show_deleted = searchParams.get("show_deleted");

    if (limit) queryParams.append("limit", limit);
    // Only add cursor if it's not null, undefined, or "undefined" string
    if (cursor && cursor !== "null" && cursor !== "undefined") {
      queryParams.append("cursor", cursor);
    }
    if (show_deleted) queryParams.append("show_deleted", show_deleted);

    // Handle different ID parameter names based on endpoint
    if (endpoint.includes("categories")) {
      const categories_ids = searchParams.get("categories_ids");
      if (categories_ids) queryParams.append("categories_ids", categories_ids);
    } else if (endpoint.includes("items")) {
      // Items-specific parameters
      const items_ids = searchParams.get("items_ids");
      const created_at_min = searchParams.get("created_at_min");
      const created_at_max = searchParams.get("created_at_max");
      const updated_at_min = searchParams.get("updated_at_min");
      const updated_at_max = searchParams.get("updated_at_max");

      if (items_ids) queryParams.append("items_ids", items_ids);
      if (created_at_min) queryParams.append("created_at_min", created_at_min);
      if (created_at_max) queryParams.append("created_at_max", created_at_max);
      if (updated_at_min) queryParams.append("updated_at_min", updated_at_min);
      if (updated_at_max) queryParams.append("updated_at_max", updated_at_max);
    } else if (endpoint.includes("customers")) {
      // Customer-specific parameters
      const customer_ids = searchParams.get("customer_ids");
      const email = searchParams.get("email");
      const created_at_min = searchParams.get("created_at_min");
      const created_at_max = searchParams.get("created_at_max");
      const updated_at_min = searchParams.get("updated_at_min");
      const updated_at_max = searchParams.get("updated_at_max");

      if (customer_ids) queryParams.append("customer_ids", customer_ids);
      if (email) queryParams.append("email", email);
      if (created_at_min) queryParams.append("created_at_min", created_at_min);
      if (created_at_max) queryParams.append("created_at_max", created_at_max);
      if (updated_at_min) queryParams.append("updated_at_min", updated_at_min);
      if (updated_at_max) queryParams.append("updated_at_max", updated_at_max);
    } else if (endpoint.includes("inventory")) {
      // Inventory-specific parameters
      const store_ids = searchParams.get("store_ids");
      const variant_ids = searchParams.get("variant_ids");
      const updated_at_min = searchParams.get("updated_at_min");
      const updated_at_max = searchParams.get("updated_at_max");

      if (store_ids) queryParams.append("store_ids", store_ids);
      if (variant_ids) queryParams.append("variant_ids", variant_ids);
      if (updated_at_min) queryParams.append("updated_at_min", updated_at_min);
      if (updated_at_max) queryParams.append("updated_at_max", updated_at_max);
    } else if (endpoint.includes("receipts")) {
      // Receipts-specific parameters
      const receipt_numbers = searchParams.get("receipt_numbers");
      const since_receipt_number = searchParams.get("since_receipt_number");
      const before_receipt_number = searchParams.get("before_receipt_number");
      const store_id = searchParams.get("store_id");
      const order = searchParams.get("order");
      const source = searchParams.get("source");
      const updated_at_min = searchParams.get("updated_at_min");
      const updated_at_max = searchParams.get("updated_at_max");
      const created_at_min = searchParams.get("created_at_min");
      const created_at_max = searchParams.get("created_at_max");

      if (receipt_numbers)
        queryParams.append("receipt_numbers", receipt_numbers);
      if (since_receipt_number)
        queryParams.append("since_receipt_number", since_receipt_number);
      if (before_receipt_number)
        queryParams.append("before_receipt_number", before_receipt_number);
      if (store_id) queryParams.append("store_id", store_id);
      if (order) queryParams.append("order", order);
      if (source) queryParams.append("source", source);
      if (updated_at_min) queryParams.append("updated_at_min", updated_at_min);
      if (updated_at_max) queryParams.append("updated_at_max", updated_at_max);
      if (created_at_min) queryParams.append("created_at_min", created_at_min);
      if (created_at_max) queryParams.append("created_at_max", created_at_max);
    } else if (endpoint.includes("payment_types")) {
      // Payment types-specific parameters
      const payment_type_ids = searchParams.get("payment_type_ids");
      const created_at_min = searchParams.get("created_at_min");
      const created_at_max = searchParams.get("created_at_max");
      const updated_at_min = searchParams.get("updated_at_min");
      const updated_at_max = searchParams.get("updated_at_max");

      if (payment_type_ids)
        queryParams.append("payment_type_ids", payment_type_ids);
      if (created_at_min) queryParams.append("created_at_min", created_at_min);
      if (created_at_max) queryParams.append("created_at_max", created_at_max);
      if (updated_at_min) queryParams.append("updated_at_min", updated_at_min);
      if (updated_at_max) queryParams.append("updated_at_max", updated_at_max);
    } else if (endpoint.includes("employees")) {
      // Employees endpoint - no additional parameters needed for single employee
      // List endpoint uses common parameters (limit, cursor) already handled above
    }

    const query = queryParams.toString();
    const url = `${LOYVERSE_API_BASE}${endpoint}${query ? `?${query}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${LOYVERSE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Loyverse API Error:", response.status, errorText);
      return Response.json(
        {
          error: true,
          message: `API Error: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return Response.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return Response.json(
      {
        error: true,
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  // Check if access token is configured
  if (!LOYVERSE_ACCESS_TOKEN) {
    return Response.json(
      {
        error: true,
        message:
          "Loyverse access token not configured. Please set LOYVERSE_ACCESS_TOKEN in .env.local",
      },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { endpoint, method = "POST", data } = body;

    const url = `${LOYVERSE_API_BASE}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${LOYVERSE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json(
        {
          error: true,
          message: `API Error: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const responseData = await response.json();
    return Response.json(responseData);
  } catch (error) {
    console.error("Proxy error:", error);
    return Response.json(
      {
        error: true,
        message: error.message,
      },
      { status: 500 }
    );
  }
}
