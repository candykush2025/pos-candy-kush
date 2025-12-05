// src/app/api/print/route.js
import { NextResponse } from "next/server";

/**
 * Print Job Queue System
 *
 * Flow:
 * 1. Web POS creates print job via POST (status: "pending")
 * 2. Android polls GET every 2 seconds to check for pending jobs
 * 3. When Android receives a job, it's marked as "processing"
 * 4. Android prints the receipt
 * 5. Android sends PUT with jobId to mark as "printed" or "failed"
 * 6. Only "printed" jobs are removed from queue
 * 7. Failed jobs can be retried
 */

// Print job queue (in production, use database/Redis)
let printQueue = [];
let jobIdCounter = 1;

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

// POST: Create new print job (called by Web POS after order complete)
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

    // Create new print job with unique ID
    const jobId = `PJ-${Date.now()}-${jobIdCounter++}`;
    const newJob = {
      jobId,
      data,
      status: "pending", // pending -> processing -> printed/failed
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attempts: 0,
    };

    // Add to queue
    printQueue.push(newJob);

    // Keep queue size manageable (max 100 jobs, remove old printed ones)
    if (printQueue.length > 100) {
      printQueue = printQueue.filter((j) => j.status !== "printed").slice(-50);
    }

    return new NextResponse(
      JSON.stringify({
        success: true,
        message: "Print job created successfully",
        jobId: jobId,
        timestamp: newJob.createdAt,
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

// GET: Fetch next pending print job (called by Android every 2 seconds)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const listAll = searchParams.get("list") === "true";

    // If list=true, return all jobs (for debugging/admin)
    if (listAll) {
      return new NextResponse(
        JSON.stringify({
          success: true,
          jobs: printQueue,
          count: printQueue.length,
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

    // Find first pending job
    const pendingJob = printQueue.find((j) => j.status === "pending");

    if (!pendingJob) {
      return new NextResponse(
        JSON.stringify({
          success: true,
          data: null,
          message: "No pending print job",
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

    // Mark job as processing (so next poll doesn't get same job)
    pendingJob.status = "processing";
    pendingJob.updatedAt = new Date().toISOString();
    pendingJob.attempts += 1;

    return new NextResponse(
      JSON.stringify({
        success: true,
        data: pendingJob.data,
        jobId: pendingJob.jobId,
        timestamp: pendingJob.createdAt,
        attempts: pendingJob.attempts,
        message: "Print job retrieved - please confirm when printed",
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

// PUT: Update print job status (called by Android after printing)
export async function PUT(request) {
  try {
    const body = await request.json();
    const { jobId, status, error: errorMessage } = body;

    if (!jobId) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: "jobId is required",
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

    if (!status) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: "status is required",
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

    // Valid statuses from Android: printed, failed
    const validStatuses = ["printed", "failed"];
    if (!validStatuses.includes(status)) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
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

    // Find the job
    const job = printQueue.find((j) => j.jobId === jobId);

    if (!job) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: "Print job not found",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Update job status
    job.status = status;
    job.updatedAt = new Date().toISOString();
    if (errorMessage) {
      job.error = errorMessage;
    }

    // If printed successfully, remove from queue after a delay (keep for history briefly)
    if (status === "printed") {
      setTimeout(() => {
        printQueue = printQueue.filter((j) => j.jobId !== jobId);
      }, 5000); // Remove after 5 seconds
    }

    // If failed, set back to pending so it can be retried (max 3 attempts)
    if (status === "failed" && job.attempts < 3) {
      job.status = "pending"; // Will be picked up again
    }

    return new NextResponse(
      JSON.stringify({
        success: true,
        message:
          status === "printed"
            ? "Print job completed successfully"
            : `Print job failed${
                job.attempts < 3 ? " - will retry" : " - max attempts reached"
              }`,
        data: {
          jobId: job.jobId,
          status: job.status,
          attempts: job.attempts,
          updatedAt: job.updatedAt,
        },
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
    console.error("Error updating print job:", error);
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: "Failed to update print job",
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

// DELETE: Clear all print jobs (admin/debug only)
export async function DELETE() {
  try {
    const count = printQueue.length;
    printQueue = [];

    return new NextResponse(
      JSON.stringify({
        success: true,
        message: `Cleared ${count} print jobs`,
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
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: "Failed to clear print jobs",
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
