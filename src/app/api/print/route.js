// src/app/api/print/route.js
import { NextResponse } from "next/server";

// Simple in-memory print job store (in production, use database or queue)
// This will store the print data temporarily until retrieved once
let currentPrintJob = null;

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

// POST: Set the print job data
export async function POST(request) {
  try {
    const body = await request.json();
    const { data } = body;

    if (!data) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: "Print data is required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Set the print job
    currentPrintJob = {
      data,
      timestamp: new Date().toISOString(),
    };

    return new NextResponse(
      JSON.stringify({
        success: true,
        message: "Print job created successfully",
        timestamp: currentPrintJob.timestamp,
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
    console.error("Error creating print job:", error);
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: "Failed to create print job",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
}

// GET: Retrieve and delete the print job (print once, then null)
export async function GET() {
  try {
    if (!currentPrintJob) {
      return new NextResponse(
        JSON.stringify({
          success: true,
          data: null,
          message: "No print job available",
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

    // Get the print job data
    const printData = currentPrintJob;

    // Delete the print job after retrieving (so it can't be printed again)
    currentPrintJob = null;

    return new NextResponse(
      JSON.stringify({
        success: true,
        data: printData.data,
        timestamp: printData.timestamp,
        message: "Print job retrieved and cleared",
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
    console.error("Error getting print job:", error);
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: "Failed to get print job",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
}
