"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Upload,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Settings,
  ArrowRight,
  Package,
  DollarSign,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const API_BASE_URL = "https://api.isy.software";

export default function MigrationPage() {
  // API Credentials
  const [credentials, setCredentials] = useState({
    username: "test_admin",
    password: "test123",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [apiToken, setApiToken] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Data
  const [expenses, setExpenses] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

  // Selection
  const [selectedExpenses, setSelectedExpenses] = useState(new Set());
  const [selectedPurchases, setSelectedPurchases] = useState(new Set());
  const [selectAllExpenses, setSelectAllExpenses] = useState(false);
  const [selectAllPurchases, setSelectAllPurchases] = useState(false);

  // Migration status
  const [migrating, setMigrating] = useState(false);
  const [migrationLog, setMigrationLog] = useState([]);
  const [migrationStats, setMigrationStats] = useState(null);

  // Sections collapsed/expanded
  const [expandedExpense, setExpandedExpense] = useState(null);
  const [expandedPurchase, setExpandedPurchase] = useState(null);
  const [showCredentials, setShowCredentials] = useState(true);
  const [activeTab, setActiveTab] = useState("expenses"); // expenses | purchases

  // ========== LOGIN TO API ==========
  const loginToApi = async () => {
    setLoginLoading(true);
    setLoginError("");
    setLoginSuccess(false);

    try {
      // Call our server-side proxy to avoid CORS
      const proxyRes = await fetch("/api/debug/migration-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: `${API_BASE_URL}/management/v1/auth/login`,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { username: credentials.username, password: credentials.password },
        }),
      });

      const proxyJson = await proxyRes.json();
      console.log("=== PROXY RESPONSE ===", JSON.stringify(proxyJson, null, 2));

      // Dig through all possible nesting to find the token
      let token = null;
      let adminName = credentials.username;

      // Try every possible path where token could be
      if (proxyJson?.data?.data?.token) {
        token = proxyJson.data.data.token;
        adminName = proxyJson.data.data.admin?.name || adminName;
      } else if (proxyJson?.data?.token) {
        token = proxyJson.data.token;
        adminName = proxyJson.data.admin?.name || adminName;
      } else if (proxyJson?.token) {
        token = proxyJson.token;
        adminName = proxyJson.admin?.name || adminName;
      }

      console.log("=== EXTRACTED TOKEN ===", token ? token.substring(0, 30) + "..." : "NULL");

      if (token) {
        setApiToken(token);
        setLoginSuccess(true);
        setLoginError("");
        addLog(`✅ Successfully logged in to API as "${adminName}"`, "success");
      } else {
        const errMsg = proxyJson?.error || proxyJson?.data?.error || proxyJson?.data?.data?.error || "Login failed - could not find token in response";
        console.error("=== LOGIN FAILED - FULL RESPONSE ===", proxyJson);
        setLoginError(errMsg);
        addLog(`❌ Login failed: ${errMsg}`, "error");
      }
    } catch (error) {
      setLoginError(`Connection error: ${error.message}`);
      addLog(`❌ Connection error: ${error.message}`, "error");
    } finally {
      setLoginLoading(false);
    }
  };

  // ========== FETCH FIREBASE DATA ==========
  const fetchExpenses = async () => {
    setLoadingExpenses(true);
    try {
      const res = await fetch("/api/debug/migration-data?type=expenses");
      const data = await res.json();
      if (data.success) {
        setExpenses(data.data || []);
        addLog(`📋 Loaded ${data.count} expenses from Firebase`, "info");
      } else {
        addLog(`❌ Failed to load expenses: ${data.error}`, "error");
      }
    } catch (error) {
      addLog(`❌ Error loading expenses: ${error.message}`, "error");
    } finally {
      setLoadingExpenses(false);
    }
  };

  const fetchPurchaseOrders = async () => {
    setLoadingPurchases(true);
    try {
      const res = await fetch("/api/debug/migration-data?type=purchases");
      const data = await res.json();
      if (data.success) {
        setPurchaseOrders(data.data || []);
        addLog(`📋 Loaded ${data.count} purchase orders from Firebase`, "info");
      } else {
        addLog(`❌ Failed to load purchase orders: ${data.error}`, "error");
      }
    } catch (error) {
      addLog(`❌ Error loading purchase orders: ${error.message}`, "error");
    } finally {
      setLoadingPurchases(false);
    }
  };

  // ========== SELECTION HANDLERS ==========
  const toggleExpenseSelection = (id) => {
    setSelectedExpenses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePurchaseSelection = (id) => {
    setSelectedPurchases((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllExpenses = () => {
    if (selectAllExpenses) {
      setSelectedExpenses(new Set());
    } else {
      setSelectedExpenses(new Set(expenses.map((e) => e.firebaseId)));
    }
    setSelectAllExpenses(!selectAllExpenses);
  };

  const toggleSelectAllPurchases = () => {
    if (selectAllPurchases) {
      setSelectedPurchases(new Set());
    } else {
      setSelectedPurchases(new Set(purchaseOrders.map((p) => p.firebaseId)));
    }
    setSelectAllPurchases(!selectAllPurchases);
  };

  // ========== MIGRATION LOG ==========
  const addLog = useCallback((message, type = "info", details = null) => {
    setMigrationLog((prev) => [
      ...prev,
      {
        timestamp: new Date().toISOString(),
        message,
        type,
        details, // optional: full error details for debug
      },
    ]);
  }, []);

  // Helper: ensure a value is a valid ISO date string, never null for required Go time.Time fields
  const ensureDate = (val, fallback = new Date().toISOString()) => {
    if (!val) return fallback;
    if (typeof val === "string") {
      const d = new Date(val);
      return isNaN(d.getTime()) ? fallback : d.toISOString();
    }
    if (val?.seconds != null) {
      return new Date(val.seconds * 1000).toISOString();
    }
    if (val instanceof Date) {
      return isNaN(val.getTime()) ? fallback : val.toISOString();
    }
    return fallback;
  };

  // Helper: extract error message from proxy response
  const extractError = (proxyJson) => {
    // Proxy wraps as { success, status, data: <api_response> }
    // API wraps as { success, error: "..." } on failure
    const apiData = proxyJson?.data;
    const errorMsg =
      apiData?.error ||
      apiData?.data?.error ||
      apiData?.message ||
      proxyJson?.error ||
      "Unknown error";
    const statusCode = proxyJson?.status || "?";
    return `[HTTP ${statusCode}] ${errorMsg}`;
  };

  // Helper: check if migration was successful
  const isSuccess = (proxyJson) => {
    const status = proxyJson?.status;
    if (status && status >= 200 && status < 300) return true;
    if (proxyJson?.data?.success) return true;
    return false;
  };

  // ========== MIGRATE DATA ==========
  const migrateSelected = async () => {
    if (!apiToken) {
      addLog("❌ Please login to API first", "error");
      return;
    }

    const expensesToMigrate = expenses.filter((e) =>
      selectedExpenses.has(e.firebaseId)
    );
    const purchasesToMigrate = purchaseOrders.filter((p) =>
      selectedPurchases.has(p.firebaseId)
    );

    if (expensesToMigrate.length === 0 && purchasesToMigrate.length === 0) {
      addLog("⚠️ No items selected for migration", "warning");
      return;
    }

    setMigrating(true);
    const stats = {
      expenses: { total: expensesToMigrate.length, success: 0, failed: 0 },
      purchases: { total: purchasesToMigrate.length, success: 0, failed: 0 },
    };

    addLog(
      `🚀 Starting migration: ${expensesToMigrate.length} expenses, ${purchasesToMigrate.length} purchase orders`,
      "info"
    );

    // Migrate expenses
    for (const expense of expensesToMigrate) {
      try {
        const apiExpense = {
          category: expense.category || "General",
          amount: parseFloat(expense.amount) || 0,
          description: expense.description || "",
          date: ensureDate(expense.date, ensureDate(expense.createdAt)),
          paymentMethod: expense.paymentMethod || "cash",
          vendor: expense.vendor || "",
          notes: expense.notes
            ? `${expense.notes} [Migrated from Firebase: ${expense.firebaseId}]`
            : `[Migrated from Firebase: ${expense.firebaseId}]`,
          status: expense.status || "approved",
        };

        console.log("=== SENDING EXPENSE ===", JSON.stringify(apiExpense, null, 2));

        const proxyRes = await fetch("/api/debug/migration-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: `${API_BASE_URL}/management/v1/expenses`,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiToken}`,
            },
            body: apiExpense,
          }),
        });
        const proxyJson = await proxyRes.json();
        console.log("=== EXPENSE RESPONSE ===", JSON.stringify(proxyJson, null, 2));

        if (isSuccess(proxyJson)) {
          const createdId = proxyJson?.data?.data?._id || proxyJson?.data?._id || "created";
          stats.expenses.success++;
          addLog(
            `✅ Expense migrated: "${expense.description}" (${expense.amount} ${expense.currency || "THB"}) → API ID: ${createdId}`,
            "success"
          );
          // Remove from selection after successful migration
          setSelectedExpenses((prev) => {
            const next = new Set(prev);
            next.delete(expense.firebaseId);
            return next;
          });
        } else {
          stats.expenses.failed++;
          const errDetail = extractError(proxyJson);
          stats.errors = stats.errors || [];
          stats.errors.push({ type: "expense", name: expense.description, error: errDetail, sentData: apiExpense });
          addLog(
            `❌ Failed expense "${expense.description}": ${errDetail}`,
            "error",
            { sentData: apiExpense, response: proxyJson }
          );
        }
      } catch (error) {
        stats.expenses.failed++;
        stats.errors = stats.errors || [];
        stats.errors.push({ type: "expense", name: expense.description, error: error.message });
        addLog(
          `❌ Error migrating expense "${expense.description}": ${error.message}`,
          "error"
        );
      }

      // Small delay to avoid overwhelming the API
      await new Promise((r) => setTimeout(r, 300));
    }

    // Migrate purchase orders
    for (const po of purchasesToMigrate) {
      try {
        const now = new Date().toISOString();
        const apiPO = {
          poNumber: po.poNumber || "",
          supplierName: po.supplierName || "Unknown",
          supplierContact: po.supplierContact || "",
          items: (po.items || []).map((item) => ({
            productName: item.productName || "",
            productId: item.productId || "",
            variantId: item.variantId || "",
            quantity: parseFloat(item.quantity) || 0,
            unitCost: parseFloat(item.unitCost) || 0,
            totalCost:
              parseFloat(item.totalCost) ||
              (parseFloat(item.quantity) || 0) *
                (parseFloat(item.unitCost) || 0),
            isNewProduct: item.isNewProduct || false,
          })),
          subtotal: parseFloat(po.subtotal) || 0,
          tax: parseFloat(po.tax) || 0,
          total: parseFloat(po.total) || 0,
          status: po.status || "draft",
          paymentStatus: po.paymentStatus || "unpaid",
          // Go requires non-null time.Time for orderDate, expectedDate, paymentDate
          orderDate: ensureDate(po.orderDate, now),
          expectedDate: ensureDate(po.expectedDate, now),
          paymentDate: ensureDate(po.paymentDate, now),
          notes: po.notes
            ? `${po.notes} [Migrated from Firebase: ${po.firebaseId}]`
            : `[Migrated from Firebase: ${po.firebaseId}]`,
          paymentReminders: [],
        };

        console.log("=== SENDING PO ===", JSON.stringify(apiPO, null, 2));

        const proxyRes = await fetch("/api/debug/migration-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: `${API_BASE_URL}/management/v1/purchase-orders`,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiToken}`,
            },
            body: apiPO,
          }),
        });
        const proxyJson = await proxyRes.json();
        console.log("=== PO RESPONSE ===", JSON.stringify(proxyJson, null, 2));

        if (isSuccess(proxyJson)) {
          const createdId = proxyJson?.data?.data?._id || proxyJson?.data?._id || "created";
          stats.purchases.success++;
          addLog(
            `✅ Purchase order migrated: "${po.poNumber}" (${po.supplierName}, Total: ${po.total}) → API ID: ${createdId}`,
            "success"
          );
          // Remove from selection after successful migration
          setSelectedPurchases((prev) => {
            const next = new Set(prev);
            next.delete(po.firebaseId);
            return next;
          });
        } else {
          stats.purchases.failed++;
          const errDetail = extractError(proxyJson);
          stats.errors = stats.errors || [];
          stats.errors.push({ type: "purchase_order", name: po.poNumber, error: errDetail, sentData: apiPO });
          addLog(
            `❌ Failed PO "${po.poNumber}": ${errDetail}`,
            "error",
            { sentData: apiPO, response: proxyJson }
          );
        }
      } catch (error) {
        stats.purchases.failed++;
        stats.errors = stats.errors || [];
        stats.errors.push({ type: "purchase_order", name: po.poNumber, error: error.message });
        addLog(
          `❌ Error migrating PO "${po.poNumber}": ${error.message}`,
          "error"
        );
      }

      // Small delay
      await new Promise((r) => setTimeout(r, 300));
    }

    setMigrationStats(stats);
    addLog(
      `🏁 Migration complete! Expenses: ${stats.expenses.success}/${stats.expenses.total} | POs: ${stats.purchases.success}/${stats.purchases.total}`,
      stats.expenses.failed > 0 || stats.purchases.failed > 0
        ? "warning"
        : "success"
    );
    setMigrating(false);
  };

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Format currency
  const formatAmount = (amount, currency = "THB") => {
    return `${currency} ${(parseFloat(amount) || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                Firebase → API Migration Tool
              </h1>
              <p className="text-slate-400 text-sm">
                Migrate expenses & purchase orders from Firebase to
                api.isy.software
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* API Credentials Section */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <button
            onClick={() => setShowCredentials(!showCredentials)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-700/50 transition"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-blue-400" />
              <span className="font-semibold">API Connection Settings</span>
              {loginSuccess && (
                <span className="flex items-center gap-1 text-sm text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  Connected
                </span>
              )}
            </div>
            {showCredentials ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>

          {showCredentials && (
            <div className="px-6 pb-6 border-t border-slate-700 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    API URL
                  </label>
                  <input
                    type="text"
                    value={API_BASE_URL}
                    disabled
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={credentials.username}
                    onChange={(e) =>
                      setCredentials((prev) => ({
                        ...prev,
                        username: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={credentials.password}
                      onChange={(e) =>
                        setCredentials((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 pr-10 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {loginError && (
                <div className="mt-3 p-3 bg-red-900/30 border border-red-700 rounded-lg text-sm text-red-300 flex items-center gap-2">
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  {loginError}
                </div>
              )}

              <div className="mt-4 flex gap-3">
                <button
                  onClick={loginToApi}
                  disabled={loginLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 rounded-lg text-sm font-medium transition"
                >
                  {loginLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  {loginLoading
                    ? "Connecting..."
                    : loginSuccess
                      ? "Reconnect"
                      : "Connect to API"}
                </button>

                {loginSuccess && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={fetchExpenses}
                      disabled={loadingExpenses}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 rounded-lg text-sm font-medium transition"
                    >
                      {loadingExpenses ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Load Expenses
                    </button>
                    <button
                      onClick={fetchPurchaseOrders}
                      disabled={loadingPurchases}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 rounded-lg text-sm font-medium transition"
                    >
                      {loadingPurchases ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Load Purchase Orders
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("expenses")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition ${
              activeTab === "expenses"
                ? "bg-orange-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Expenses ({expenses.length})
            {selectedExpenses.size > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {selectedExpenses.size} selected
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("purchases")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition ${
              activeTab === "purchases"
                ? "bg-purple-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
            }`}
          >
            <Package className="w-4 h-4" />
            Purchase Orders ({purchaseOrders.length})
            {selectedPurchases.size > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {selectedPurchases.size} selected
              </span>
            )}
          </button>
        </div>

        {/* Data Tables */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          {/* EXPENSES TAB */}
          {activeTab === "expenses" && (
            <div>
              <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectAllExpenses}
                      onChange={toggleSelectAllExpenses}
                      className="w-4 h-4 rounded border-slate-500 text-orange-500 focus:ring-orange-500 bg-slate-700"
                    />
                    <span className="text-sm text-slate-300">Select All</span>
                  </label>
                  <span className="text-sm text-slate-500">
                    {selectedExpenses.size} of {expenses.length} selected
                  </span>
                </div>
                <button
                  onClick={fetchExpenses}
                  disabled={loadingExpenses}
                  className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loadingExpenses ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
              </div>

              {loadingExpenses ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
                  <span className="ml-3 text-slate-400">
                    Loading expenses from Firebase...
                  </span>
                </div>
              ) : expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <DollarSign className="w-12 h-12 mb-3 opacity-50" />
                  <p>No expenses found in Firebase</p>
                  <button
                    onClick={fetchExpenses}
                    className="mt-3 text-sm text-blue-400 hover:underline"
                  >
                    Click to load expenses
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {expenses.map((expense) => (
                    <div
                      key={expense.firebaseId}
                      className={`px-6 py-3 hover:bg-slate-700/30 transition ${
                        selectedExpenses.has(expense.firebaseId)
                          ? "bg-orange-900/10 border-l-2 border-l-orange-500"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={selectedExpenses.has(expense.firebaseId)}
                          onChange={() =>
                            toggleExpenseSelection(expense.firebaseId)
                          }
                          className="w-4 h-4 rounded border-slate-500 text-orange-500 focus:ring-orange-500 bg-slate-700 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-sm truncate">
                              {expense.description || "No description"}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                expense.status === "approved"
                                  ? "bg-green-900/50 text-green-300"
                                  : expense.status === "denied"
                                    ? "bg-red-900/50 text-red-300"
                                    : "bg-yellow-900/50 text-yellow-300"
                              }`}
                            >
                              {expense.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                            <span>📁 {expense.category}</span>
                            <span>📅 {formatDate(expense.date || expense.createdAt)}</span>
                            {expense.vendor && (
                              <span>🏢 {expense.vendor}</span>
                            )}
                            {expense.paymentMethod && (
                              <span>💳 {expense.paymentMethod}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-mono font-semibold text-orange-300">
                            {formatAmount(expense.amount, expense.currency)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {expense.firebaseId.slice(0, 8)}...
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setExpandedExpense(
                              expandedExpense === expense.firebaseId
                                ? null
                                : expense.firebaseId
                            )
                          }
                          className="text-slate-500 hover:text-white transition flex-shrink-0"
                        >
                          {expandedExpense === expense.firebaseId ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Expanded details */}
                      {expandedExpense === expense.firebaseId && (
                        <div className="mt-3 ml-8 p-4 bg-slate-700/50 rounded-lg text-sm space-y-2">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-slate-400">
                                Firebase ID:
                              </span>{" "}
                              <span className="font-mono text-xs">
                                {expense.firebaseId}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400">Source:</span>{" "}
                              {expense.source}
                            </div>
                            <div>
                              <span className="text-slate-400">
                                Submitted By:
                              </span>{" "}
                              {expense.submittedByName || expense.employeeName || "N/A"}{" "}
                              ({expense.submittedByRole || "N/A"})
                            </div>
                            <div>
                              <span className="text-slate-400">
                                Approved By:
                              </span>{" "}
                              {expense.approvedByName || "N/A"}
                            </div>
                            <div>
                              <span className="text-slate-400">Created:</span>{" "}
                              {formatDate(expense.createdAt)}
                            </div>
                            <div>
                              <span className="text-slate-400">Updated:</span>{" "}
                              {formatDate(expense.updatedAt)}
                            </div>
                          </div>
                          {expense.notes && (
                            <div>
                              <span className="text-slate-400">Notes:</span>{" "}
                              {expense.notes}
                            </div>
                          )}
                          {expense.approvalNotes && (
                            <div>
                              <span className="text-slate-400">
                                Approval Notes:
                              </span>{" "}
                              {expense.approvalNotes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PURCHASE ORDERS TAB */}
          {activeTab === "purchases" && (
            <div>
              <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectAllPurchases}
                      onChange={toggleSelectAllPurchases}
                      className="w-4 h-4 rounded border-slate-500 text-purple-500 focus:ring-purple-500 bg-slate-700"
                    />
                    <span className="text-sm text-slate-300">Select All</span>
                  </label>
                  <span className="text-sm text-slate-500">
                    {selectedPurchases.size} of {purchaseOrders.length} selected
                  </span>
                </div>
                <button
                  onClick={fetchPurchaseOrders}
                  disabled={loadingPurchases}
                  className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loadingPurchases ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
              </div>

              {loadingPurchases ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                  <span className="ml-3 text-slate-400">
                    Loading purchase orders from Firebase...
                  </span>
                </div>
              ) : purchaseOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <Package className="w-12 h-12 mb-3 opacity-50" />
                  <p>No purchase orders found in Firebase</p>
                  <button
                    onClick={fetchPurchaseOrders}
                    className="mt-3 text-sm text-blue-400 hover:underline"
                  >
                    Click to load purchase orders
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {purchaseOrders.map((po) => (
                    <div
                      key={po.firebaseId}
                      className={`px-6 py-3 hover:bg-slate-700/30 transition ${
                        selectedPurchases.has(po.firebaseId)
                          ? "bg-purple-900/10 border-l-2 border-l-purple-500"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={selectedPurchases.has(po.firebaseId)}
                          onChange={() =>
                            togglePurchaseSelection(po.firebaseId)
                          }
                          className="w-4 h-4 rounded border-slate-500 text-purple-500 focus:ring-purple-500 bg-slate-700 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-medium text-sm text-purple-300">
                              {po.poNumber}
                            </span>
                            <span className="text-sm text-slate-300 truncate">
                              {po.supplierName}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                po.status === "received"
                                  ? "bg-green-900/50 text-green-300"
                                  : po.status === "cancelled"
                                    ? "bg-red-900/50 text-red-300"
                                    : po.status === "sent" ||
                                        po.status === "confirmed"
                                      ? "bg-blue-900/50 text-blue-300"
                                      : "bg-yellow-900/50 text-yellow-300"
                              }`}
                            >
                              {po.status}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                po.paymentStatus === "paid"
                                  ? "bg-green-900/50 text-green-300"
                                  : "bg-red-900/50 text-red-300"
                              }`}
                            >
                              {po.paymentStatus}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                            <span>
                              📦 {po.items?.length || 0} item
                              {(po.items?.length || 0) !== 1 ? "s" : ""}
                            </span>
                            <span>📅 {formatDate(po.orderDate || po.createdAt)}</span>
                            {po.source_collection && (
                              <span>📂 {po.source_collection}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-mono font-semibold text-purple-300">
                            {formatAmount(po.total)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {po.firebaseId.slice(0, 8)}...
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setExpandedPurchase(
                              expandedPurchase === po.firebaseId
                                ? null
                                : po.firebaseId
                            )
                          }
                          className="text-slate-500 hover:text-white transition flex-shrink-0"
                        >
                          {expandedPurchase === po.firebaseId ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Expanded details */}
                      {expandedPurchase === po.firebaseId && (
                        <div className="mt-3 ml-8 p-4 bg-slate-700/50 rounded-lg text-sm space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-slate-400">
                                Firebase ID:
                              </span>{" "}
                              <span className="font-mono text-xs">
                                {po.firebaseId}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400">
                                Collection:
                              </span>{" "}
                              {po.source_collection || "N/A"}
                            </div>
                            <div>
                              <span className="text-slate-400">Supplier:</span>{" "}
                              {po.supplierName}
                            </div>
                            <div>
                              <span className="text-slate-400">Contact:</span>{" "}
                              {po.supplierContact || "N/A"}
                            </div>
                            <div>
                              <span className="text-slate-400">Subtotal:</span>{" "}
                              {formatAmount(po.subtotal)}
                            </div>
                            <div>
                              <span className="text-slate-400">Tax:</span>{" "}
                              {formatAmount(po.tax)}
                            </div>
                            <div>
                              <span className="text-slate-400">
                                Order Date:
                              </span>{" "}
                              {formatDate(po.orderDate)}
                            </div>
                            <div>
                              <span className="text-slate-400">
                                Expected Date:
                              </span>{" "}
                              {formatDate(po.expectedDate)}
                            </div>
                          </div>

                          {/* Items table */}
                          {po.items && po.items.length > 0 && (
                            <div>
                              <h4 className="text-slate-300 font-medium mb-2">
                                Items:
                              </h4>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-slate-400 border-b border-slate-600">
                                    <th className="text-left py-1 pr-3">
                                      Product
                                    </th>
                                    <th className="text-right py-1 px-3">
                                      Qty
                                    </th>
                                    <th className="text-right py-1 px-3">
                                      Unit Cost
                                    </th>
                                    <th className="text-right py-1 pl-3">
                                      Total
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {po.items.map((item, idx) => (
                                    <tr
                                      key={idx}
                                      className="border-b border-slate-600/50"
                                    >
                                      <td className="py-1 pr-3">
                                        {item.productName}
                                        {item.isNewProduct && (
                                          <span className="ml-1 text-yellow-400">
                                            (new)
                                          </span>
                                        )}
                                      </td>
                                      <td className="text-right py-1 px-3">
                                        {item.quantity}
                                      </td>
                                      <td className="text-right py-1 px-3">
                                        {formatAmount(item.unitCost)}
                                      </td>
                                      <td className="text-right py-1 pl-3">
                                        {formatAmount(item.totalCost)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {po.notes && (
                            <div>
                              <span className="text-slate-400">Notes:</span>{" "}
                              {po.notes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Migration Action Bar */}
        {(selectedExpenses.size > 0 || selectedPurchases.size > 0) && (
          <div className="sticky bottom-4 z-50">
            <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-xl border border-blue-700 p-4 shadow-2xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="font-medium">
                    Ready to migrate {selectedExpenses.size + selectedPurchases.size} item(s)
                  </p>
                  <p className="text-sm text-slate-300">
                    {selectedExpenses.size > 0 &&
                      `${selectedExpenses.size} expense(s)`}
                    {selectedExpenses.size > 0 &&
                      selectedPurchases.size > 0 &&
                      " + "}
                    {selectedPurchases.size > 0 &&
                      `${selectedPurchases.size} purchase order(s)`}
                    {" → "}api.isy.software
                  </p>
                </div>
              </div>
              <button
                onClick={migrateSelected}
                disabled={migrating || !apiToken}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
                  !apiToken
                    ? "bg-slate-600 text-slate-400 cursor-not-allowed"
                    : migrating
                      ? "bg-yellow-600 text-white"
                      : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                {migrating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Migrating...
                  </>
                ) : !apiToken ? (
                  <>
                    <XCircle className="w-5 h-5" />
                    Login Required
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Migrate Selected
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Migration Stats */}
        {migrationStats && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              {(migrationStats.expenses.failed > 0 || migrationStats.purchases.failed > 0) ? (
                <AlertCircle className="w-5 h-5 text-yellow-400" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              )}
              Migration Results
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {migrationStats.expenses.success}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Expenses Migrated
                </div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-400">
                  {migrationStats.expenses.failed}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Expenses Failed
                </div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {migrationStats.purchases.success}
                </div>
                <div className="text-xs text-slate-400 mt-1">POs Migrated</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-400">
                  {migrationStats.purchases.failed}
                </div>
                <div className="text-xs text-slate-400 mt-1">POs Failed</div>
              </div>
            </div>

            {/* Summary bar */}
            <div className="mt-4 p-3 rounded-lg bg-slate-700/30 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">
                  Total: {migrationStats.expenses.total + migrationStats.purchases.total} items
                </span>
                <span className="text-green-400 font-medium">
                  ✅ {migrationStats.expenses.success + migrationStats.purchases.success} success
                </span>
                <span className="text-red-400 font-medium">
                  ❌ {migrationStats.expenses.failed + migrationStats.purchases.failed} failed
                </span>
              </div>
            </div>

            {/* Detailed error list */}
            {migrationStats.errors && migrationStats.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Failed Items Details ({migrationStats.errors.length})
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {migrationStats.errors.map((err, idx) => (
                    <div key={idx} className="p-3 bg-red-900/20 border border-red-800/50 rounded-lg text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-red-300">
                          {err.type === "expense" ? "💰" : "📦"} {err.name || "Unknown"}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-red-900/50 text-red-300 rounded-full">
                          {err.type}
                        </span>
                      </div>
                      <div className="mt-1 text-red-400 text-xs font-mono">
                        {err.error}
                      </div>
                      {err.sentData && (
                        <details className="mt-2">
                          <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300">
                            Show sent data (debug)
                          </summary>
                          <pre className="mt-1 text-xs text-slate-400 bg-slate-900/50 p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
                            {JSON.stringify(err.sentData, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Migration Log */}
        {migrationLog.length > 0 && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                Migration Log
                <span className="text-xs px-2 py-0.5 bg-slate-700 rounded-full text-slate-400">
                  {migrationLog.length} entries
                </span>
                {migrationLog.filter(l => l.type === "error").length > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-red-900/50 rounded-full text-red-400">
                    {migrationLog.filter(l => l.type === "error").length} errors
                  </span>
                )}
              </h3>
              <button
                onClick={() => setMigrationLog([])}
                className="text-sm text-slate-400 hover:text-white transition"
              >
                Clear
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto p-4 space-y-1 font-mono text-xs">
              {migrationLog.map((log, idx) => (
                <div key={idx}>
                  <div
                    className={`py-1 ${
                      log.type === "success"
                        ? "text-green-400"
                        : log.type === "error"
                          ? "text-red-400"
                          : log.type === "warning"
                            ? "text-yellow-400"
                            : "text-slate-300"
                    }`}
                  >
                    <span className="text-slate-500">
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>{" "}
                    {log.message}
                  </div>
                  {log.details && (
                    <details className="ml-6 mb-1">
                      <summary className="text-slate-500 cursor-pointer hover:text-slate-300 text-[10px]">
                        🔍 Show debug details
                      </summary>
                      <pre className="text-[10px] text-slate-500 bg-slate-900/50 p-2 rounded mt-1 overflow-x-auto max-h-32 overflow-y-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
