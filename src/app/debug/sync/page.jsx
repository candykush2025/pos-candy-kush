"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  collection,
  query,
  orderBy,
  limit as firestoreLimit,
  getDocs,
  where,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  duplicateOrderToISY,
  retryFromLog,
} from "@/lib/services/orderDuplicationService";

export default function SyncDebugPage() {
  const [syncLogs, setSyncLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState({});
  const [filter, setFilter] = useState("all"); // all, success, failed, pending
  const [searchTerm, setSearchTerm] = useState("");
  const [credentialStatus, setCredentialStatus] = useState(null); // null, 'checking', 'valid', 'invalid'
  const [credentialError, setCredentialError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    pending: 0,
  });

  const loadSyncLogs = async () => {
    setLoading(true);
    try {
      console.log("[DEBUG SYNC] Loading sync logs from Firebase...", {
        filter,
        timestamp: new Date().toISOString()
      });

      let q = query(
        collection(db, "syncReceipts"),
        orderBy("createdAt", "desc"),
        firestoreLimit(100),
      );

      if (filter !== "all") {
        console.log("[DEBUG SYNC] Applying filter:", filter);
        q = query(
          collection(db, "syncReceipts"),
          where("status", "==", filter),
          orderBy("createdAt", "desc"),
          firestoreLimit(100),
        );
      }

      console.log("[DEBUG SYNC] Executing Firestore query...");
      const snapshot = await getDocs(q);
      console.log("[DEBUG SYNC] Query complete. Documents found:", snapshot.size);

      const logs = snapshot.docs.map((doc) => {
        const data = doc.data();
        console.log("[DEBUG SYNC] Processing document:", {
          id: doc.id,
          orderNumber: data.orderNumber,
          status: data.status
        });
        return {
          id: doc.id,
          ...data,
          createdAt:
            data.createdAt?.toDate?.() || new Date(data.attemptedAt),
        };
      });

      console.log("[DEBUG SYNC] Processed logs:", logs.length);
      setSyncLogs(logs);

      // Calculate stats
      console.log("[DEBUG SYNC] Calculating stats...");
      const allSnapshot = await getDocs(collection(db, "syncReceipts"));
      const allLogs = allSnapshot.docs.map((d) => d.data());

      const statsData = {
        total: allLogs.length,
        success: allLogs.filter((l) => l.status === "success").length,
        failed: allLogs.filter((l) => l.status === "failed").length,
        pending: allLogs.filter((l) => l.status === "pending").length,
      };

      console.log("[DEBUG SYNC] Stats calculated:", statsData);
      setStats(statsData);

      if (logs.length === 0) {
        console.warn("[DEBUG SYNC] ⚠️ No sync logs found in Firebase!");
        toast.info("No sync logs found. Logs will appear here after orders are synced.");
      }
    } catch (error) {
      console.error("[DEBUG SYNC] ❌ Error loading sync logs:", error);
      console.error("[DEBUG SYNC] Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      toast.error(`Failed to load sync logs: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSyncLogs();
    checkCredentials();
  }, [filter]);

  const checkCredentials = async () => {
    setCredentialStatus("checking");
    setCredentialError(null);
    toast.info("Testing API credentials...");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_ISY_API_URL;
      const username = process.env.NEXT_PUBLIC_ISY_API_USERNAME;
      const password = process.env.NEXT_PUBLIC_ISY_API_PASSWORD;

      if (!apiUrl || !username || !password) {
        setCredentialStatus("invalid");
        const errorMsg =
          "Missing configuration: API URL, username, or password not set in environment variables";
        setCredentialError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      // Step 1: Login to get JWT token
      toast.info("Step 1: Logging in to get JWT token...");
      const loginResponse = await fetch(`${apiUrl}/pos/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      if (!loginResponse.ok) {
        setCredentialStatus("invalid");
        const errorData = await loginResponse.json().catch(() => ({}));
        const errorMsg = `Login failed (${loginResponse.status}): ${errorData.error || errorData.message || "Invalid credentials"}`;
        setCredentialError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      const loginData = await loginResponse.json();
      const token =
        loginData.token || loginData.access_token || loginData.data?.token;

      if (!token) {
        setCredentialStatus("invalid");
        const errorMsg = "Login succeeded but no token received from API";
        setCredentialError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      // Step 2: Test the token with an API call
      toast.info("Step 2: Testing JWT token...");
      const testResponse = await fetch(`${apiUrl}/pos/v1/orders`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (testResponse.ok || testResponse.status === 404) {
        // 200 OK or 404 (endpoint might not support GET but auth is valid)
        setCredentialStatus("valid");
        setCredentialError(null);
        toast.success(
          "✅ Credentials are valid! JWT token obtained and verified.",
        );
      } else if (testResponse.status === 401 || testResponse.status === 403) {
        // Token invalid
        setCredentialStatus("invalid");
        const errorData = await testResponse.json().catch(() => ({}));
        const errorMsg = `Token authentication failed: ${errorData.error || errorData.message || "Token invalid"}`;
        setCredentialError(errorMsg);
        toast.error(errorMsg);
      } else {
        // Other error
        setCredentialStatus("invalid");
        const errorMsg = `API returned status ${testResponse.status}. The API might be having issues.`;
        setCredentialError(errorMsg);
        toast.warning(errorMsg);
      }
    } catch (error) {
      setCredentialStatus("invalid");
      let errorMsg;
      if (error.message.includes("fetch")) {
        errorMsg =
          "Network error: Cannot reach API server. Check your internet connection or API URL.";
      } else {
        errorMsg = `Error: ${error.message}`;
      }
      setCredentialError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handleRetry = async (log) => {
    setRetrying((prev) => ({ ...prev, [log.id]: true }));

    try {
      toast.info(`Retrying sync for order ${log.orderNumber}...`);

      const result = await retryFromLog(log.id);

      if (result.success) {
        toast.success(`Order ${log.orderNumber} synced successfully!`);
        await loadSyncLogs();
      } else {
        toast.error(`Retry failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Retry error:", error);
      toast.error("Retry failed: " + error.message);
    } finally {
      setRetrying((prev) => ({ ...prev, [log.id]: false }));
    }
  };

  const handleBulkRetry = async () => {
    const failedLogs = syncLogs.filter((log) => log.status === "failed");

    if (failedLogs.length === 0) {
      toast.info("No failed syncs to retry");
      return;
    }

    if (!confirm(`Retry ${failedLogs.length} failed syncs?`)) {
      return;
    }

    toast.info(`Retrying ${failedLogs.length} failed syncs...`);

    let successCount = 0;
    let failCount = 0;

    for (const log of failedLogs) {
      try {
        const result = await retryFromLog(log.id);

        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }

        // Small delay between retries
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        failCount++;
      }
    }

    toast.success(
      `Bulk retry complete: ${successCount} succeeded, ${failCount} failed`,
    );
    await loadSyncLogs();
  };

  const handleDelete = async (logId) => {
    if (!confirm("Delete this sync log?")) return;

    try {
      await deleteDoc(doc(db, "syncReceipts", logId));
      toast.success("Log deleted");
      await loadSyncLogs();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete log");
    }
  };

  const handleClearSuccess = async () => {
    if (!confirm("Clear all successful sync logs?")) return;

    try {
      const successLogs = syncLogs.filter((log) => log.status === "success");

      toast.info(`Deleting ${successLogs.length} successful logs...`);

      for (const log of successLogs) {
        await deleteDoc(doc(db, "syncReceipts", log.id));
      }

      toast.success(`Cleared ${successLogs.length} successful logs`);
      await loadSyncLogs();
    } catch (error) {
      console.error("Clear error:", error);
      toast.error("Failed to clear logs");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "success":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Success
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredLogs = syncLogs.filter((log) => {
    if (searchTerm) {
      return log.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">ISY Sync Debug Panel</h1>
        <p className="text-muted-foreground mt-1">
          Developer tool to monitor and manage order synchronization with
          api.isy.software
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Syncs</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Successful
            </CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {stats.success}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-1">
              <XCircle className="w-4 h-4 text-red-600" />
              Failed
            </CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {stats.failed}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-yellow-600" />
              Pending
            </CardDescription>
            <CardTitle className="text-3xl text-yellow-600">
              {stats.pending}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Credential Status */}
      {credentialStatus && (
        <Card
          className={
            credentialStatus === "valid"
              ? "border-green-500 bg-green-50 dark:bg-green-950"
              : credentialStatus === "invalid"
                ? "border-red-500 bg-red-50 dark:bg-red-950"
                : "border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
          }
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              {credentialStatus === "valid" && (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-green-600 dark:text-green-400">
                    Credentials Valid
                  </span>
                </>
              )}
              {credentialStatus === "invalid" && (
                <>
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <span className="text-red-600 dark:text-red-400">
                    Credentials Invalid
                  </span>
                </>
              )}
              {credentialStatus === "checking" && (
                <>
                  <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 animate-spin" />
                  <span className="text-yellow-600 dark:text-yellow-400">
                    Checking Credentials...
                  </span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {credentialStatus === "valid" && (
              <p className="text-sm text-green-700 dark:text-green-300">
                ✅ API credentials are working correctly. Orders can be synced
                to ISY server.
              </p>
            )}
            {credentialStatus === "invalid" && credentialError && (
              <div className="space-y-2">
                <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                  ❌ {credentialError}
                </p>
                <div className="text-xs text-red-600 dark:text-red-400 space-y-1">
                  <p>
                    <strong>Quick fixes:</strong>
                  </p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>Check environment variables in .env.local</li>
                    <li>
                      Verify NEXT_PUBLIC_ISY_API_USERNAME and
                      NEXT_PUBLIC_ISY_API_PASSWORD
                    </li>
                    <li>Ensure API server is accessible</li>
                    <li>Contact ISY support if credentials are correct</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={loadSyncLogs} disabled={loading}>
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>

            <Button
              onClick={checkCredentials}
              disabled={credentialStatus === "checking"}
              variant="outline"
            >
              <AlertCircle
                className={`w-4 h-4 mr-2 ${credentialStatus === "checking" ? "animate-spin" : ""}`}
              />
              Test Credentials
            </Button>

            <Button
              onClick={handleBulkRetry}
              disabled={stats.failed === 0}
              variant="outline"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Retry All Failed ({stats.failed})
            </Button>

            <Button
              onClick={handleClearSuccess}
              disabled={stats.success === 0}
              variant="outline"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Successful ({stats.success})
            </Button>
          </div>{" "}
          {/* Filters */}
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium">Filter:</span>
            <Button
              size="sm"
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filter === "success" ? "default" : "outline"}
              onClick={() => setFilter("success")}
            >
              Success
            </Button>
            <Button
              size="sm"
              variant={filter === "failed" ? "default" : "outline"}
              onClick={() => setFilter("failed")}
            >
              Failed
            </Button>
            <Button
              size="sm"
              variant={filter === "pending" ? "default" : "outline"}
              onClick={() => setFilter("pending")}
            >
              Pending
            </Button>
          </div>
          {/* Search */}
          <div className="flex gap-2">
            <Search className="w-4 h-4 mt-3 text-muted-foreground" />
            <Input
              placeholder="Search by order number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sync Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Logs ({filteredLogs.length})</CardTitle>
          <CardDescription>
            Recent synchronization attempts (last 100)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading sync logs...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No sync logs found
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(log.status)}
                          <span className="font-mono font-semibold">
                            {log.orderNumber}
                          </span>
                          {log.duration && (
                            <span className="text-xs text-muted-foreground">
                              ({log.duration}ms)
                            </span>
                          )}
                        </div>

                        <div className="text-sm space-y-1">
                          <div className="text-muted-foreground">
                            Attempted: {log.createdAt?.toLocaleString()}
                          </div>

                          {log.error && (
                            <div className="text-red-600 dark:text-red-400">
                              Error: {log.error}
                              {log.errorCode && ` (${log.errorCode})`}
                            </div>
                          )}

                          {log.isyOrderId && (
                            <div className="text-green-600 dark:text-green-400">
                              ISY Order ID: {log.isyOrderId}
                            </div>
                          )}

                          {log.httpStatus && (
                            <div className="text-xs text-muted-foreground">
                              HTTP Status: {log.httpStatus}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {log.status === "failed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRetry(log)}
                            disabled={retrying[log.id]}
                          >
                            <RotateCcw
                              className={`w-3 h-3 mr-1 ${retrying[log.id] ? "animate-spin" : ""}`}
                            />
                            Retry
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(log.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Configuration</span>
            {credentialStatus && (
              <Badge
                variant={
                  credentialStatus === "valid" ? "default" : "destructive"
                }
              >
                {credentialStatus === "valid"
                  ? "✓ Connected"
                  : credentialStatus === "checking"
                    ? "Checking..."
                    : "✗ Not Connected"}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">API URL:</span>
            <span className="font-mono">
              {process.env.NEXT_PUBLIC_ISY_API_URL || "Not set"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Username:</span>
            <span className="font-mono">
              {process.env.NEXT_PUBLIC_ISY_API_USERNAME || "Not set"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Password:</span>
            <span className="font-mono">
              {process.env.NEXT_PUBLIC_ISY_API_PASSWORD
                ? "••••••••"
                : "Not set"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sync Enabled:</span>
            <span>
              {process.env.NEXT_PUBLIC_ISY_API_ENABLED === "true"
                ? "✅ Yes"
                : "❌ No"}
            </span>
          </div>
          {credentialStatus === "invalid" && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded">
              <p className="text-xs text-red-700 dark:text-red-300">
                ⚠️ <strong>Action Required:</strong> Fix the credentials above,
                then click "Test Credentials" to verify.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
