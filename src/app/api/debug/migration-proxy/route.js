import { NextResponse } from "next/server";

/**
 * Proxy API calls to api.isy.software to avoid CORS issues.
 * 
 * POST /api/debug/migration-proxy
 * Body: { url, method, headers, body }
 * 
 * This proxies the request server-side where CORS doesn't apply.
 */

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(request) {
  try {
    const { url, method, headers, body } = await request.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL is required" },
        { status: 400 }
      );
    }

    // Make the request server-side (no CORS restrictions)
    const fetchOptions = {
      method: method || "POST",
      headers: {
        "Content-Type": "application/json",
        ...(headers || {}),
      },
    };

    if (body && method !== "GET") {
      fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    return NextResponse.json({
      success: true,
      status: response.status,
      data: data,
    });
  } catch (error) {
    console.error("Migration proxy error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Proxy request failed",
      },
      { status: 500 }
    );
  }
}
