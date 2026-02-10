"use client";

import { useState } from "react";
import { Download, FileJson, Loader2, Package } from "lucide-react";

export default function DataExportPage() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [progress, setProgress] = useState("");

  const downloadJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAllData = async () => {
    setLoading(true);
    setProgress("Starting export...");

    try {
      const allData = {
        metadata: {
          exported_at: new Date().toISOString(),
          version: "1.0",
        },
        expenses: [],
        purchase_orders: [],
        invoices: [],
      };

      // Fetch Expenses
      setProgress("Fetching expenses...");
      try {
        const expensesRes = await fetch("/api/debug/export-data?type=expenses");
        const expensesResult = await expensesRes.json();
        if (expensesResult.success) {
          allData.expenses = expensesResult.data || [];
        }
      } catch (error) {
        console.error("Error fetching expenses:", error);
      }

      // Fetch Purchase Orders
      setProgress("Fetching purchase orders...");
      try {
        const purchasesRes = await fetch(
          "/api/debug/export-data?type=purchases",
        );
        const purchasesResult = await purchasesRes.json();
        if (purchasesResult.success) {
          allData.purchase_orders = purchasesResult.data || [];
        }
      } catch (error) {
        console.error("Error fetching purchases:", error);
      }

      // Fetch Invoices
      setProgress("Fetching invoices...");
      try {
        const invoicesRes = await fetch("/api/debug/export-data?type=invoices");
        const invoicesResult = await invoicesRes.json();
        if (invoicesResult.success) {
          allData.invoices = invoicesResult.data || [];
        }
      } catch (error) {
        console.error("Error fetching invoices:", error);
      }

      // Download combined file
      setProgress("Creating download file...");
      const filename = `pos_data_export_${new Date().toISOString().split("T")[0]}.json`;
      downloadJSON(allData, filename);

      // Update stats
      setStats({
        expenses: allData.expenses.length,
        purchases: allData.purchase_orders.length,
        invoices: allData.invoices.length,
        total:
          allData.expenses.length +
          allData.purchase_orders.length +
          allData.invoices.length,
        exported: new Date().toISOString(),
      });

      setProgress("Export completed!");
      setTimeout(() => setProgress(""), 3000);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export data. Check console for details.");
      setProgress("Export failed!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Complete Data Export
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Export all expenses, purchase orders, and invoices in one JSON file
          </p>
        </div>

        {/* Main Export Card */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
              <Package className="w-12 h-12 text-white" />
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white text-center mb-6">
            Export All Data
          </h2>

          {/* Progress */}
          {progress && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200 text-center font-medium">
                {progress}
              </p>
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200 font-semibold mb-2">
                ✅ Export Successful!
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-green-700 dark:text-green-300">
                    Expenses: {stats.expenses}
                  </p>
                  <p className="text-green-700 dark:text-green-300">
                    Purchases: {stats.purchases}
                  </p>
                </div>
                <div>
                  <p className="text-green-700 dark:text-green-300">
                    Invoices: {stats.invoices}
                  </p>
                  <p className="text-green-700 dark:text-green-300 font-bold">
                    Total: {stats.total}
                  </p>
                </div>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-3">
                Exported at: {new Date(stats.exported).toLocaleString()}
              </p>
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={exportAllData}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-blue-400 disabled:to-purple-400 text-white font-semibold py-4 px-6 rounded-lg transition-all transform hover:scale-[1.02] disabled:scale-100 shadow-lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-lg">Exporting Data...</span>
              </>
            ) : (
              <>
                <Download className="w-6 h-6" />
                <span className="text-lg">Export All Data</span>
              </>
            )}
          </button>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
            <FileJson className="w-5 h-5" />
            What's Included
          </h3>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li>✅ All expenses with categories and details</li>
            <li>✅ All purchase orders with supplier information</li>
            <li>✅ All invoices with payment methods and items</li>
            <li>✅ Metadata with export timestamp</li>
            <li>✅ Pretty-formatted JSON for easy reading</li>
          </ul>
        </div>

        {/* File Structure */}
        <div className="mt-6 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            📄 File Structure
          </h4>
          <pre className="text-xs text-slate-600 dark:text-slate-400 overflow-x-auto">
            {`{
  "metadata": {
    "exported_at": "2026-02-02T10:30:00.000Z",
    "version": "1.0"
  },
  "expenses": [...],
  "purchase_orders": [...],
  "invoices": [...]
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}
