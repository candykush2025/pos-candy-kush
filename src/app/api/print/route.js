// src/app/api/print/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/config";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";

const PRINT_COLLECTION = "printQueue";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// POST: Create new print job
export async function POST(request) {
  try {
    const body = await request.json();
    const { data } = body;
    if (!data) {
      return new NextResponse(
        JSON.stringify({ success: false, error: "Print data is required" }),
        { status: 400, headers: corsHeaders }
      );
    }
    const jobId =
      "PJ-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
    const newJob = {
      jobId,
      data,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attempts: 0,
    };
    await setDoc(doc(db, PRINT_COLLECTION, jobId), newJob);
    return new NextResponse(
      JSON.stringify({
        success: true,
        message: "Print job created",
        jobId,
        timestamp: newJob.createdAt,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating print job:", error);
    return new NextResponse(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

// GET: Fetch pending print job
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const listAll = searchParams.get("list") === "true";
    const jobsRef = collection(db, PRINT_COLLECTION);

    if (listAll) {
      const snapshot = await getDocs(jobsRef);
      const jobs = snapshot.docs.map((d) => d.data());
      return new NextResponse(
        JSON.stringify({ success: true, jobs, count: jobs.length }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get all pending jobs and sort by createdAt (avoiding composite index requirement)
    const q = query(jobsRef, where("status", "==", "pending"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return new NextResponse(
        JSON.stringify({
          success: true,
          data: null,
          message: "No pending print job",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Sort by createdAt and get the oldest job
    const pendingJobs = snapshot.docs.map((d) => d.data());
    pendingJobs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const job = pendingJobs[0];

    // Mark as processing
    await setDoc(doc(db, PRINT_COLLECTION, job.jobId), {
      ...job,
      status: "processing",
      updatedAt: new Date().toISOString(),
      attempts: job.attempts + 1,
    });

    return new NextResponse(
      JSON.stringify({
        success: true,
        data: job.data,
        jobId: job.jobId,
        timestamp: job.createdAt,
        attempts: job.attempts + 1,
        message: "Print job retrieved - please confirm when printed",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error getting print job:", error);
    return new NextResponse(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

// PUT: Update print job status
export async function PUT(request) {
  try {
    const body = await request.json();
    const { jobId, status, error: errorMessage } = body;
    if (!jobId || !status) {
      return new NextResponse(
        JSON.stringify({ success: false, error: "jobId and status required" }),
        { status: 400, headers: corsHeaders }
      );
    }
    const validStatuses = ["printed", "failed"];
    if (!validStatuses.includes(status)) {
      return new NextResponse(
        JSON.stringify({ success: false, error: "Invalid status" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const jobRef = doc(db, PRINT_COLLECTION, jobId);
    const jobSnap = await getDoc(jobRef);
    if (!jobSnap.exists()) {
      return new NextResponse(
        JSON.stringify({ success: false, error: "Print job not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    const job = jobSnap.data();

    if (status === "printed") {
      await deleteDoc(jobRef);
      return new NextResponse(
        JSON.stringify({
          success: true,
          message: "Print job completed",
          data: { jobId, status: "printed" },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (status === "failed") {
      const newStatus = job.attempts < 3 ? "pending" : "failed";
      await setDoc(jobRef, {
        ...job,
        status: newStatus,
        error: errorMessage,
        updatedAt: new Date().toISOString(),
      });
      return new NextResponse(
        JSON.stringify({
          success: true,
          message:
            job.attempts < 3
              ? "Print job failed - will retry"
              : "Print job failed - max attempts",
          data: { jobId, status: newStatus, attempts: job.attempts },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Error updating print job:", error);
    return new NextResponse(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE: Clear all print jobs
export async function DELETE() {
  try {
    const jobsRef = collection(db, PRINT_COLLECTION);
    const snapshot = await getDocs(jobsRef);
    const deletePromises = snapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
    return new NextResponse(
      JSON.stringify({
        success: true,
        message: "Cleared " + snapshot.size + " print jobs",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}
