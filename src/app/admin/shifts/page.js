"use client";

import { useState, useEffect } from "react";
import { shiftsService } from "@/lib/firebase/shiftsService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Search,
  Download,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { toast } from "sonner";

export default function AdminShifts() {
  const [shifts, setShifts] = useState([]);
  const [filteredShifts, setFilteredShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, active, completed
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    loadShifts();
  }, []);

  useEffect(() => {
    filterShifts();
  }, [searchQuery, filterStatus, shifts]);

  const loadShifts = async () => {
    try {
      setLoading(true);
      const [shiftsData, stats] = await Promise.all([
        shiftsService.getAll(),
        shiftsService.getStatistics(),
      ]);
      setShifts(shiftsData);
      setFilteredShifts(shiftsData);
      setStatistics(stats);
    } catch (error) {
      console.error("Error loading shifts:", error);
      toast.error("Failed to load shifts");
    } finally {
      setLoading(false);
    }
  };

  const filterShifts = () => {
    let filtered = [...shifts];

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter((shift) => shift.status === filterStatus);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (shift) =>
          shift.userName?.toLowerCase().includes(query) ||
          shift.id?.toLowerCase().includes(query)
      );
    }

    setFilteredShifts(filtered);
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (startTime, endTime) => {
    if (!startTime) return "N/A";
    const start = startTime.toDate ? startTime.toDate() : new Date(startTime);
    const end = endTime
      ? endTime.toDate
        ? endTime.toDate()
        : new Date(endTime)
      : new Date();

    const diff = end - start;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  };

  const exportToCSV = () => {
    if (filteredShifts.length === 0) {
      toast.error("No shifts to export");
      return;
    }

    const headers = [
      "Shift ID",
      "Cashier",
      "Start Time",
      "End Time",
      "Duration",
      "Starting Cash",
      "Expected Cash",
      "Actual Cash",
      "Variance",
      "Total Sales",
      "Cash Sales",
      "Card Sales",
      "Transactions",
      "Status",
    ];

    const rows = filteredShifts.map((shift) => [
      shift.id,
      shift.userName || "Unknown",
      formatDateTime(shift.startTime),
      shift.endTime ? formatDateTime(shift.endTime) : "Ongoing",
      formatDuration(shift.startTime, shift.endTime),
      shift.startingCash || 0,
      shift.expectedCash || 0,
      shift.actualCash || "N/A",
      shift.variance !== null ? shift.variance : "N/A",
      shift.totalSales || 0,
      shift.totalCashSales || 0,
      shift.totalCardSales || 0,
      shift.transactionCount || 0,
      shift.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((row) => row.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `shifts_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Shifts exported successfully");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Shift Management</h1>
          <p className="text-neutral-500 mt-2">
            Track cashier shifts and cash reconciliation
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Shifts
              </CardTitle>
              <Clock className="h-4 w-4 text-neutral-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalShifts}</div>
              <p className="text-xs text-neutral-500 mt-1">
                {statistics.activeShifts} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(statistics.totalSales)}
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                From completed shifts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Variance
              </CardTitle>
              <DollarSign
                className={`h-4 w-4 ${
                  statistics.totalVariance >= 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  statistics.totalVariance >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(Math.abs(statistics.totalVariance))}
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                {statistics.totalVariance >= 0 ? "Surplus" : "Shortage"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                With Discrepancy
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.shiftsWithShortage + statistics.shiftsWithSurplus}
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                {statistics.shiftsWithShortage} short,{" "}
                {statistics.shiftsWithSurplus} over
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search by cashier name or shift ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === "all" ? "default" : "outline"}
                onClick={() => setFilterStatus("all")}
              >
                All
              </Button>
              <Button
                variant={filterStatus === "active" ? "default" : "outline"}
                onClick={() => setFilterStatus("active")}
              >
                Active
              </Button>
              <Button
                variant={filterStatus === "completed" ? "default" : "outline"}
                onClick={() => setFilterStatus("completed")}
              >
                Completed
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shifts List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-neutral-500">Loading shifts...</p>
        </div>
      ) : filteredShifts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-500">No shifts found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredShifts.map((shift) => {
            const variance = shift.variance || 0;
            const hasDiscrepancy = variance !== 0;
            const isShort = variance < 0;

            return (
              <Card
                key={shift.id}
                className={`${
                  hasDiscrepancy
                    ? isShort
                      ? "border-red-200 bg-red-50/50"
                      : "border-yellow-200 bg-yellow-50/50"
                    : ""
                }`}
              >
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Cashier & Time Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-green-700" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {shift.userName || "Unknown Cashier"}
                          </h3>
                          <p className="text-sm text-neutral-500">
                            Shift ID: {shift.id.slice(0, 8)}...
                          </p>
                        </div>
                        <Badge
                          className={
                            shift.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }
                        >
                          {shift.status === "active" ? (
                            <>
                              <div className="h-2 w-2 rounded-full bg-green-500 mr-1 animate-pulse" />
                              Active
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completed
                            </>
                          )}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-neutral-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDateTime(shift.startTime)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>
                            {shift.status === "active"
                              ? "Working: "
                              : "Duration: "}
                            {formatDuration(shift.startTime, shift.endTime)}
                          </span>
                        </div>
                        {shift.status === "active" && (
                          <div className="flex items-center gap-1 text-green-600 font-medium">
                            <DollarSign className="h-4 w-4" />
                            <span>
                              Holding:{" "}
                              {formatCurrency(
                                shift.expectedCash || shift.startingCash || 0
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Middle: Cash Details */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                      <div>
                        <p className="text-xs text-neutral-500 mb-1">
                          Starting Cash
                        </p>
                        <p className="font-semibold">
                          {formatCurrency(shift.startingCash || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500 mb-1">
                          Expected Cash
                        </p>
                        <p className="font-semibold">
                          {formatCurrency(
                            shift.expectedCash || shift.startingCash || 0
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500 mb-1">
                          Actual Cash
                        </p>
                        <p className="font-semibold">
                          {shift.actualCash !== null
                            ? formatCurrency(shift.actualCash)
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500 mb-1">
                          Variance
                        </p>
                        <p
                          className={`font-bold ${
                            variance === 0
                              ? "text-green-600"
                              : isShort
                              ? "text-red-600"
                              : "text-yellow-600"
                          }`}
                        >
                          {shift.variance !== null ? (
                            <>
                              {variance === 0 ? (
                                "✓ Perfect"
                              ) : (
                                <>
                                  {isShort ? "↓" : "↑"}{" "}
                                  {formatCurrency(Math.abs(variance))}
                                </>
                              )}
                            </>
                          ) : (
                            "N/A"
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Right: Sales Summary */}
                    <div className="border-l pl-6 space-y-2">
                      <div>
                        <p className="text-xs text-neutral-500">Total Sales</p>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(shift.totalSales || 0)}
                        </p>
                      </div>
                      <div className="text-xs text-neutral-600 space-y-1">
                        <div className="flex justify-between gap-4">
                          <span>Cash:</span>
                          <span className="font-medium">
                            {formatCurrency(shift.totalCashSales || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span>Card:</span>
                          <span className="font-medium">
                            {formatCurrency(shift.totalCardSales || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span>Transactions:</span>
                          <span className="font-medium">
                            {shift.transactionCount || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {shift.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-neutral-600">
                        <span className="font-medium">Notes:</span>{" "}
                        {shift.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
