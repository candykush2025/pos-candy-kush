"use client";

import { useState } from "react";
import { receiptsService } from "@/lib/firebase/firestore";

export default function ReceiptInspectorPage() {
  // Only allow in non-production
  if (process.env.NODE_ENV === "production") {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Receipt Inspector (disabled)</h1>
        <p className="mt-2 text-sm text-gray-600">
          This debug page is disabled in production.
        </p>
      </div>
    );
  }

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const normalizeQuery = (q) => q?.trim().replace(/^#/, "") || "";

  const handleSearch = async () => {
    const q = normalizeQuery(query);
    if (!q) return;

    setLoading(true);
    setError(null);
    try {
      const found = {};

      // Try as Firestore document id
      try {
        const doc = await receiptsService.get(q);
        if (doc) found[doc._firestoreId] = doc;
      } catch (docErr) {
        // ignore not found
      }

      // Also search by receipt_number field
      try {
        const byNumber = await receiptsService.getAll({
          where: ["receipt_number", "==", q],
        });
        byNumber.forEach((r) => (found[r._firestoreId] = r));
      } catch (numErr) {
        console.error("Error searching by receipt_number:", numErr);
      }

      // Also search by order number (orderNumber or order)
      try {
        const byOrder = await receiptsService.getAll({
          where: ["order", "==", q],
        });
        byOrder.forEach((r) => (found[r._firestoreId] = r));
      } catch (orderErr) {
        // ignore
      }

      setResults(Object.values(found));
    } catch (err) {
      console.error(err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (firestoreId) => {
    if (!confirm("Delete this receipt from Firestore? This cannot be undone."))
      return;
    setDeletingId(firestoreId);
    setError(null);
    try {
      await receiptsService.delete(firestoreId);
      setResults((prev) => prev.filter((r) => r._firestoreId !== firestoreId));
    } catch (err) {
      console.error("Error deleting receipt:", err);
      setError(err.message || String(err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Receipt Inspector (Debug)</h1>
      <p className="mt-2 text-sm text-gray-600">
        Search a receipt by receipt number or Firestore ID and inspect or delete
        it.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          className="border px-3 py-2 rounded w-80"
          placeholder="Enter receipt id or receipt number (#ngiFV... or ngiFV... )"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          className="btn btn-primary px-4 py-2 bg-blue-600 text-white rounded"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? "Searching..." : "Search"}
        </button>
        <button
          className="px-3 py-2 border rounded text-sm text-gray-700"
          onClick={() => setQuery("#ngiFVsjhuBf2bK9Vs7fY")}
        >
          Load example
        </button>
      </div>

      {error && <div className="mt-4 text-red-600">Error: {error}</div>}

      <div className="mt-6 space-y-4">
        {results.length === 0 && !loading && (
          <div className="text-sm text-gray-500">No results</div>
        )}

        {results.map((r) => (
          <div key={r._firestoreId} className="border rounded p-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-600">Firestore ID</div>
                <div className="font-mono mt-1">{r._firestoreId}</div>
                <div className="text-sm text-gray-600 mt-2">Receipt Number</div>
                <div className="font-semibold">
                  {r.receipt_number ||
                    r.receiptNumber ||
                    r.orderNumber ||
                    r.order}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 bg-red-600 text-white rounded"
                  onClick={() => handleDelete(r._firestoreId)}
                  disabled={deletingId === r._firestoreId}
                >
                  {deletingId === r._firestoreId ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>

            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-gray-600">
                Show JSON
              </summary>
              <pre className="mt-2 text-xs overflow-auto max-h-64">
                {JSON.stringify(r, null, 2)}
              </pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
