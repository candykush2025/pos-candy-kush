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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Key,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getISYSyncStats,
  triggerISYSync,
  cleanupCompletedSyncTasks,
} from "@/lib/services/isySyncService";
import {
  isISYApiConfigured,
} from "@/lib/services/orderDuplicationService";

export default function ISYSyncManagementPage() {
  const [stats, setStats] = useState({
    pending: 0,
    completed: 0,
    failed: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const syncStats = await getISYSyncStats();
      setStats(syncStats);
      setIsConfigured(isISYApiConfigured());
    } catch (error) {
      console.error("Error loading stats:", error);
      toast.error("Failed to load sync statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    if (!isConfigured) {
      toast.error("ISY API is not configured. Please set the API token first.");
      return;
    }

    setSyncing(true);
    try {
      toast.info("Starting manual sync...");
      await triggerISYSync();
      await loadStats();
      toast.success("Manual sync completed");
    } catch (error) {
      console.error("Manual sync error:", error);
      toast.error("Failed to trigger manual sync");
    } finally {
      setSyncing(false);
    }
  };

  const handleCleanup = async () => {
    setLoading(true);
    try {
      const cleaned = await cleanupCompletedSyncTasks(7);
      await loadStats();
      toast.success(`Cleaned up ${cleaned} old sync tasks`);
    } catch (error) {
      console.error("Cleanup error:", error);
      toast.error("Failed to cleanup old tasks");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (type) => {
    switch (type) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">ISY Order Sync Management</h1>
        <p className="text-muted-foreground mt-1">
          Monitor and manage order duplication to api.isy.software
        </p>
      </div>

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Configuration
          </CardTitle>
          <CardDescription>
            Configure connection to ISY API server
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">API URL</label>
            <Input value={process.env.NEXT_PUBLIC_ISY_API_URL || "Not configured"} disabled className="mt-1" />
          </div>

          <div>
            <label className="text-sm font-medium">Authentication Status</label>
            <div className="mt-2 flex items-center gap-2">
              {isConfigured ? (
                <Badge className={getStatusColor("completed")}>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Automatic JWT Authentication
                </Badge>
              ) : (
                <Badge className={getStatusColor("failed")}>
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Configuration Missing
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              JWT tokens are managed automatically using environment credentials
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sync Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Orders</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              All duplication attempts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Completed
            </CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {stats.completed}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Successfully duplicated
            </p>
          </CardContent>
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
          <CardContent>
            <p className="text-xs text-muted-foreground">Waiting for retry</p>
          </CardContent>
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
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Max retries exceeded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Actions</CardTitle>
          <CardDescription>
            Manage order duplication and cleanup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={loadStats} disabled={loading} variant="outline">
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh Stats
            </Button>

            <Button
              onClick={handleManualSync}
              disabled={syncing || !isConfigured}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`}
              />
              Manual Sync
            </Button>

            <Button
              onClick={handleCleanup}
              disabled={loading}
              variant="outline"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Cleanup Old Tasks
            </Button>
          </div>

          {!isConfigured && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    API Not Configured
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Please set the JWT token above to enable order duplication.
                    Orders will be queued and synced automatically once
                    configured.
                  </p>
                </div>
              </div>
            </div>
          )}

          {stats.pending > 0 && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">
                    Pending Duplications
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    {stats.pending} order(s) are waiting to be duplicated. The
                    background service will automatically retry these every
                    minute.
                  </p>
                </div>
              </div>
            </div>
          )}

          {stats.failed > 0 && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-2">
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">
                    Failed Duplications
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {stats.failed} order(s) failed after maximum retry attempts.
                    Check console logs for detailed error messages or contact
                    support.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Documentation</CardTitle>
          <CardDescription>
            Implementation details and troubleshooting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="font-medium">Implementation Guide</p>
              <p className="text-sm text-muted-foreground">
                Complete guide for ISY order duplication
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                window.open("/ISY_ORDER_DUPLICATION_GUIDE.md", "_blank")
              }
            >
              View Guide
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="font-medium">API Specification</p>
              <p className="text-sm text-muted-foreground">
                POS receipt data structure and validation
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                window.open("/POS_RECEIPT_API_SPECIFICATION.md", "_blank")
              }
            >
              View Spec
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
