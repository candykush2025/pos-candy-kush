"use client";

import { useState, useMemo } from "react";
import { receiptsService } from "@/lib/firebase/firestore";
import { useReceipts } from "@/hooks/useReportData";
import { format, startOfMonth, endOfMonth } from "date-fns";

// Check whether a receipt contains a payment matching the provided type/query
function matchesPaymentQuery(receipt, typeQuery) {
  if (!typeQuery) return false;
  const q = String(typeQuery).trim().toLowerCase();

  // Check top-level payment fields
  const topLevel = (
    receipt.paymentMethod ||
    receipt.payment_method ||
    receipt.paymentTypeName ||
    receipt.paymentType ||
    receipt.payment_type_name ||
    receipt.payment_type ||
    ""
  ).toString();
  if (topLevel.toLowerCase().includes(q)) return true;

  // Check payments array
  const payments = receipt.payments || [];
  for (const p of payments) {
    const vals = [
      p.payment_type_id,
      p.payment_type,
      p.payment_type_name,
      p.paymentTypeName,
      p.name,
      p.type,
    ]
      .filter(Boolean)
      .map((v) => String(v).toLowerCase());

    if (vals.some((v) => v.includes(q))) return true;
  }

  // Check already computed paymentTypes if present
  const paymentTypes = receipt.paymentTypes || [];
  for (const pt of paymentTypes) {
    if (
      String(pt.type || "")
        .toLowerCase()
        .includes(q)
    )
      return true;
  }

  return false;
}

export { matchesPaymentQuery };

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

  const { data: receipts = [], isLoading: receiptsLoading } = useReceipts();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [expandedIds, setExpandedIds] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(
    format(new Date(), "yyyy-MM")
  );

  // Compute monthly receipt details
  const monthlyData = useMemo(() => {
    const monthMap = new Map();

    receipts.forEach((receipt) => {
      const receiptDate = receipt.receipt_date
        ? receipt.receipt_date?.toDate
          ? receipt.receipt_date.toDate()
          : new Date(receipt.receipt_date)
        : receipt.receiptDate
        ? receipt.receiptDate?.toDate
          ? receipt.receiptDate.toDate()
          : new Date(receipt.receiptDate)
        : receipt.created_at
        ? receipt.created_at?.toDate
          ? receipt.created_at.toDate()
          : new Date(receipt.created_at)
        : new Date(receipt.createdAt);

      const monthKey = format(startOfMonth(receiptDate), "yyyy-MM");

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, []);
      }

      monthMap.get(monthKey).push({
        ...receipt,
        receiptDate,
        amount:
          receipt.totalMoney ||
          receipt.total_money ||
          receipt.total ||
          receipt.totalMoney ||
          0,
        paymentTypes: [],
      });
    });

    // Process payment types for each receipt
    monthMap.forEach((monthReceipts) => {
      monthReceipts.forEach((receipt) => {
        const payments = receipt.payments || [];
        if (payments.length === 0) {
          const paymentType =
            receipt.paymentMethod ||
            receipt.payment_method ||
            receipt.paymentType ||
            "Other";
          receipt.paymentTypes.push({
            type: paymentType,
            amount: receipt.amount,
          });
        } else {
          payments.forEach((payment) => {
            // Prefer descriptive names over short 'type' codes (e.g. type: 'OTHER', name: 'Crypto transfer')
            const paymentType =
              payment.payment_type_name ||
              payment.paymentTypeName ||
              payment.name ||
              payment.type ||
              "Other";
            const paymentAmount =
              payment.money_amount ||
              payment.paid_money ||
              payment.paidMoney ||
              payment.amount ||
              0;
            receipt.paymentTypes.push({
              type: paymentType,
              amount: paymentAmount,
            });
          });
        }
      });
      // Sort receipts by date descending (newest first)
      monthReceipts.sort((a, b) => b.receiptDate - a.receiptDate);
    });

    return monthMap;
  }, [receipts]);

  const selectedMonthReceipts = monthlyData.get(selectedMonth) || [];

  const monthOptions = Array.from(monthlyData.keys())
    .sort()
    .reverse()
    .map((monthKey) => ({
      value: monthKey,
      label: format(new Date(monthKey + "-01"), "MMMM yyyy"),
    }));

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
        // Log the error for debugging (don't fail the whole search)
        console.error(
          "Error fetching by Firestore ID:",
          docErr?.message || docErr
        );
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

      // If the query explicitly requests payment type (e.g. "payment:transfer")
      const paymentPrefix = q.match(
        /^\s*(?:payment|paymenttype|payment_type|method|p)\s*[:=]\s*(.+)$/i
      );
      if (paymentPrefix && paymentPrefix[1]) {
        const typeQuery = paymentPrefix[1].toLowerCase().trim();
        receipts.forEach((r) => {
          if (matchesPaymentQuery(r, typeQuery)) found[r._firestoreId] = r;
        });
      }

      // If nothing found yet, also try treating the raw query as a payment type
      if (Object.keys(found).length === 0) {
        receipts.forEach((r) => {
          if (matchesPaymentQuery(r, q)) found[r._firestoreId] = r;
        });
      }

      setResults(Object.values(found));
      if (Object.keys(found).length === 0) {
        setError("No receipts found for that id/number.");
      }
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
    <div className="p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
        Receipt Inspector (Debug)
      </h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Search a receipt by receipt number or Firestore ID and inspect or delete
        it.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          className="border px-3 py-2 rounded w-80 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter receipt id, receipt number, or payment (e.g. payment:transfer)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button
          className="btn btn-primary px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? "Searching..." : "Search"}
        </button>
        <button
          className="px-3 py-2 border rounded text-sm text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
          onClick={() => setQuery("#ngiFVsjhuBf2bK9Vs7fY")}
        >
          Load example
        </button>
        <button
          className="px-3 py-2 border rounded text-sm text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
          onClick={() => {
            setQuery("payment:transfer");
            setTimeout(() => handleSearch(), 10);
          }}
        >
          Search payment:transfer
        </button>
      </div>

      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Tip: prefix with "payment:" (e.g. "payment:transfer") or just type a
        payment name. Click a row in the results table to view raw JSON.
      </div>

      {error && (
        <div className="mt-4 text-red-600 dark:text-red-400">
          Error: {error}
        </div>
      )}

      {/* Search Results Table */}
      {results.length > 0 && (
        <div className="mt-4">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Found {results.length} receipt{results.length > 1 ? "s" : ""}.
          </div>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-white">
                    Receipt Number
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-white">
                    Date
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right text-gray-900 dark:text-white">
                    Amount
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-white">
                    Payment Types
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-white">
                    Firestore ID
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <>
                    <tr
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900 cursor-pointer"
                      onClick={() => {
                        const isExpanded = expandedIds.includes(r._firestoreId);
                        setExpandedIds((prev) =>
                          isExpanded
                            ? prev.filter((id) => id !== r._firestoreId)
                            : [...prev, r._firestoreId]
                        );
                      }}
                    >
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-white">
                        {r.receipt_number ||
                          r.receiptNumber ||
                          r.orderNumber ||
                          r.order ||
                          "N/A"}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-white">
                        {r.receipt_date ||
                        r.receiptDate ||
                        r.created_at ||
                        r.createdAt
                          ? format(
                              new Date(
                                r.receipt_date ||
                                  r.receiptDate ||
                                  r.created_at ||
                                  r.createdAt
                              ),
                              "yyyy-MM-dd HH:mm"
                            )
                          : "N/A"}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right text-gray-900 dark:text-white">
                        ฿
                        {Number(
                          r.amount ??
                            r.total_money ??
                            r.totalMoney ??
                            r.total ??
                            0
                        ).toFixed(2)}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-white">
                        {(r.paymentTypes || [])
                          .map((pt) => `${pt.type} (฿${pt.amount.toFixed(2)})`)
                          .join(", ")}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 max-w-xs truncate text-gray-900 dark:text-white">
                        {r._firestoreId}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-white">
                        <button
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(r._firestoreId);
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>

                    {expandedIds.includes(r._firestoreId) && (
                      <tr className="bg-gray-50 dark:bg-gray-900">
                        <td className="p-3" colSpan={6}>
                          <pre className="mt-1 text-xs overflow-auto max-h-80 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white p-2 rounded">
                            {JSON.stringify(r, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly Receipt Details Table */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Per Receipt Details by Month
        </h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Select Month:
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border px-3 py-2 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {receiptsLoading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Loading receipts...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-white">
                    Receipt Number
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-white">
                    Date
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right text-gray-900 dark:text-white">
                    Amount
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-white">
                    Payment Types
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-white">
                    Firestore ID
                  </th>
                </tr>
              </thead>
              <tbody>
                {selectedMonthReceipts.map((receipt, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900"
                  >
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-white">
                      {receipt.receipt_number ||
                        receipt.receiptNumber ||
                        receipt.orderNumber ||
                        receipt.order ||
                        "N/A"}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-white">
                      {format(receipt.receiptDate, "yyyy-MM-dd HH:mm")}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right text-gray-900 dark:text-white">
                      ฿{receipt.amount.toFixed(2)}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-white">
                      {receipt.paymentTypes
                        .map((pt) => `${pt.type} (฿${pt.amount.toFixed(2)})`)
                        .join(", ")}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 max-w-xs truncate text-gray-900 dark:text-white">
                      {receipt._firestoreId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {selectedMonthReceipts.length === 0 && (
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                No receipts found for selected month.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6">
        {results.length === 0 && !loading && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            No results
          </div>
        )}
      </div>
    </div>
  );
}
