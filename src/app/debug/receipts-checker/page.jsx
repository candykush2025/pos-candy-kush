"use client";

import { useState } from "react";

export default function ReceiptsCheckerTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const [params, setParams] = useState({
    startDate: "",
    endDate: "",
    receiptIds: "",
    limit: "10",
    offset: "0",
    format: "summary",
    includePayments: true,
    includeItems: true,
  });

  const testEndpoint = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Build query string
      const queryParams = new URLSearchParams();

      if (params.startDate) queryParams.append("startDate", params.startDate);
      if (params.endDate) queryParams.append("endDate", params.endDate);
      if (params.receiptIds.trim())
        queryParams.append("receiptIds", params.receiptIds.trim());
      queryParams.append("limit", params.limit);
      queryParams.append("offset", params.offset);
      queryParams.append("format", params.format);
      queryParams.append("includePayments", params.includePayments.toString());
      queryParams.append("includeItems", params.includeItems.toString());

      const url = `/api/debug/receipts-checker?${queryParams}`;

      console.log("Testing endpoint:", url);

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${data.error || "Unknown error"}`,
        );
      }

      setResult(data);
    } catch (err) {
      console.error("Test failed:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateParam = (key, value) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Receipts Checker API Test</h1>
        <p className="text-muted-foreground mt-2">
          Test the debug receipts checker endpoint for data migration
        </p>
      </div>

      {/* Parameters Form */}
      <div className="bg-card p-6 rounded-lg border mb-6">
        <h2 className="text-xl font-semibold mb-4">API Parameters</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={params.startDate}
              onChange={(e) => updateParam("startDate", e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={params.endDate}
              onChange={(e) => updateParam("endDate", e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Receipt IDs (comma-separated)
            </label>
            <input
              type="text"
              value={params.receiptIds}
              onChange={(e) => updateParam("receiptIds", e.target.value)}
              placeholder="receipt-1,receipt-2"
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Limit</label>
            <input
              type="number"
              value={params.limit}
              onChange={(e) => updateParam("limit", e.target.value)}
              min="1"
              max="1000"
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Offset</label>
            <input
              type="number"
              value={params.offset}
              onChange={(e) => updateParam("offset", e.target.value)}
              min="0"
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Format</label>
            <select
              value={params.format}
              onChange={(e) => updateParam("format", e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="summary">Summary</option>
              <option value="full">Full</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={params.includePayments}
              onChange={(e) => updateParam("includePayments", e.target.checked)}
              className="mr-2"
            />
            Include Payments
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={params.includeItems}
              onChange={(e) => updateParam("includeItems", e.target.checked)}
              className="mr-2"
            />
            Include Items
          </label>
        </div>

        <button
          onClick={testEndpoint}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Testing..." : "Test Endpoint"}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
          <h3 className="text-red-800 font-semibold">Error</h3>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
          <h3 className="text-green-800 font-semibold">Success!</h3>
          <div className="mt-2">
            <p className="text-green-700">
              Found {result.data?.total || 0} receipts, returned{" "}
              {result.data?.returned || 0}
              {result.data?.hasMore ? " (more available)" : ""}
            </p>
            {result.debug && (
              <p className="text-green-700 text-sm mt-1">
                Processing time: {result.debug.processingTime}ms
              </p>
            )}
          </div>
        </div>
      )}

      {/* Raw Response */}
      {result && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Raw Response</h3>
          <pre className="text-xs overflow-auto max-h-96 bg-white p-2 rounded border">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {/* Documentation Link */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-blue-800 font-semibold">Documentation</h3>
        <p className="text-blue-700 mt-1">
          Complete documentation for the receipts checker API and migration
          scripts is available at:
        </p>
        <a
          href="/RECEIPTS_CHECKER_API_DOCUMENTATION.md"
          target="_blank"
          className="text-blue-600 underline mt-2 inline-block"
        >
          RECEIPTS_CHECKER_API_DOCUMENTATION.md
        </a>
      </div>
    </div>
  );
}
