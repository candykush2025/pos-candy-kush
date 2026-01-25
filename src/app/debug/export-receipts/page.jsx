"use client";

import { useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { format } from "date-fns";

export default function ExportReceiptsPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);

  const exportReceipts = async () => {
    setLoading(true);
    setError(null);
    setStatus("Starting export...");
    setProgress({ current: 0, total: 0 });

    try {
      // Fetch all receipts from Firebase
      setStatus("Fetching receipts from Firebase...");
      const receiptsRef = collection(db, "receipts");
      const snapshot = await getDocs(receiptsRef);

      const total = snapshot.size;
      setProgress({ current: 0, total });
      setStatus(`Found ${total} receipts. Processing...`);

      // Convert to array
      const receipts = [];
      let current = 0;

      snapshot.forEach((doc) => {
        receipts.push({
          id: doc.id,
          ...doc.data(),
        });
        current++;
        setProgress({ current, total });
      });

      setStatus(`Processed ${receipts.length} receipts. Preparing download...`);

      // Create JSON blob
      const jsonData = JSON.stringify(receipts, null, 2);
      const blob = new Blob([jsonData], { type: "application/json" });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Generate filename with timestamp
      const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
      link.download = `receipts_export_${timestamp}.json`;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);

      setStatus(`✅ Successfully exported ${receipts.length} receipts!`);
      setLoading(false);
    } catch (err) {
      console.error("Export error:", err);
      setError(err.message);
      setStatus("❌ Export failed");
      setLoading(false);
    }
  };

  const exportReceiptsWithDateRange = async (startDate, endDate) => {
    setLoading(true);
    setError(null);
    setStatus("Starting filtered export...");
    setProgress({ current: 0, total: 0 });

    try {
      // Fetch all receipts (we'll filter client-side for simplicity)
      setStatus("Fetching receipts from Firebase...");
      const receiptsRef = collection(db, "receipts");
      const snapshot = await getDocs(receiptsRef);

      setStatus(`Found ${snapshot.size} receipts. Filtering by date...`);

      // Filter by date range
      const receipts = [];
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const receiptDate =
          data.receipt_date?.toDate?.() ||
          data.receiptDate?.toDate?.() ||
          data.date?.toDate?.() ||
          new Date(data.created_at || data.createdAt);

        const receiptTime = receiptDate.getTime();

        if (receiptTime >= start && receiptTime <= end) {
          receipts.push({
            id: doc.id,
            ...data,
          });
        }
      });

      setProgress({ current: receipts.length, total: snapshot.size });
      setStatus(
        `Filtered to ${receipts.length} receipts. Preparing download...`,
      );

      // Create JSON blob
      const jsonData = JSON.stringify(receipts, null, 2);
      const blob = new Blob([jsonData], { type: "application/json" });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Generate filename with timestamp
      const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
      link.download = `receipts_export_${startDate}_to_${endDate}_${timestamp}.json`;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);

      setStatus(`✅ Successfully exported ${receipts.length} receipts!`);
      setLoading(false);
    } catch (err) {
      console.error("Export error:", err);
      setError(err.message);
      setStatus("❌ Export failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
            📥 Export Receipts
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Export all receipts from Firebase to a downloadable JSON file
          </p>

          {/* Export All Button */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Export All Receipts
            </h2>
            <button
              onClick={exportReceipts}
              disabled={loading}
              className={`px-6 py-3 rounded-lg font-medium text-white transition-colors ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? "Exporting..." : "Export All Receipts"}
            </button>
          </div>

          {/* Date Range Export */}
          <div className="mb-8 border-t pt-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Export by Date Range
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const start = formData.get("startDate");
                const end = formData.get("endDate");
                exportReceiptsWithDateRange(start, end);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-3 rounded-lg font-medium text-white transition-colors ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {loading ? "Exporting..." : "Export by Date Range"}
              </button>
            </form>
          </div>

          {/* Status Display */}
          {(status || error) && (
            <div className="mt-6 space-y-2">
              {status && (
                <div
                  className={`p-4 rounded-lg ${
                    status.includes("✅")
                      ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300"
                      : status.includes("❌")
                        ? "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300"
                        : "bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300"
                  }`}
                >
                  <p className="font-medium">{status}</p>
                  {progress.total > 0 && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${(progress.current / progress.total) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-sm mt-1">
                        {progress.current} / {progress.total}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="font-medium text-red-800 dark:text-red-300">
                    Error:
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {error}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Info Section */}
          <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
              ℹ️ Information
            </h3>
            <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
              <li>• Exported file will be in JSON format</li>
              <li>
                • All receipt data including nested objects will be included
              </li>
              <li>• Large exports may take a few moments to process</li>
              <li>• File will be saved to your Downloads folder</li>
              <li>
                • Timestamps in the filename use format: YYYY-MM-DD_HH-mm-ss
              </li>
            </ul>
          </div>

          {/* Back Link */}
          <div className="mt-6">
            <a
              href="/debug"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              ← Back to Debug Tools
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
