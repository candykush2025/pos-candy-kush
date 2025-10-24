"use client";

import { useState, useEffect } from "react";
import { shiftsService } from "@/lib/firebase/shiftsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  DollarSign,
  TrendingUp,
  Calendar,
  CheckCircle,
  AlertTriangle,
  User,
  Receipt,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

export default function ShiftsSection({ cashier }) {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    if (cashier?.id) {
      loadShifts();
    }
  }, [cashier]);

  const loadShifts = async () => {
    try {
      setLoading(true);
      const [shiftsData, stats] = await Promise.all([
        shiftsService.getByUser(cashier.id),
        shiftsService.getStatistics(cashier.id),
      ]);
      setShifts(shiftsData);
      setStatistics(stats);
    } catch (error) {
      console.error("Error loading shifts:", error);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500">Loading your shifts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gray-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Shifts</h1>
          <p className="text-gray-500 mt-1">
            View your shift history and cash handling records
          </p>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Shifts
                </CardTitle>
                <Clock className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statistics.totalShifts}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {statistics.activeShifts} currently active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Handled
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(statistics.totalSales)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  From all your shifts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Cash Variance
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
                <p className="text-xs text-gray-500 mt-1">
                  {statistics.totalVariance >= 0 ? "Surplus" : "Shortage"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statistics.totalShifts > 0
                    ? (
                        ((statistics.totalShifts -
                          statistics.shiftsWithShortage -
                          statistics.shiftsWithSurplus) /
                          statistics.totalShifts) *
                        100
                      ).toFixed(0)
                    : 0}
                  %
                </div>
                <p className="text-xs text-gray-500 mt-1">Perfect matches</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Shifts List */}
        {shifts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No shifts found</p>
              <p className="text-sm text-gray-400 mt-1">
                Your shift history will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {shifts.map((shift) => {
              const variance = shift.variance || 0;
              const hasDiscrepancy = variance !== 0;
              const isShort = variance < 0;
              const isActive = shift.status === "active";

              return (
                <Card
                  key={shift.id}
                  className={`${
                    hasDiscrepancy && !isActive
                      ? isShort
                        ? "border-red-200 bg-red-50/50"
                        : "border-yellow-200 bg-yellow-50/50"
                      : isActive
                      ? "border-green-200 bg-green-50/50"
                      : ""
                  }`}
                >
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Header Row */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                            {isActive ? (
                              <Clock className="h-6 w-6 text-green-700 animate-pulse" />
                            ) : (
                              <CheckCircle className="h-6 w-6 text-green-700" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">
                              {isActive ? "Current Shift" : "Shift Completed"}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>{formatDateTime(shift.startTime)}</span>
                            </div>
                          </div>
                        </div>

                        <Badge
                          className={
                            isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }
                        >
                          {isActive ? (
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

                      {/* Time Info */}
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          <span>
                            {isActive ? "Working: " : "Duration: "}
                            {formatDuration(shift.startTime, shift.endTime)}
                          </span>
                        </div>
                        {shift.endTime && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            <span>Ended: {formatDateTime(shift.endTime)}</span>
                          </div>
                        )}
                        {isActive && (
                          <div className="flex items-center gap-1.5 text-green-600 font-medium">
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

                      {/* Cash Handling Details */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-white rounded-lg border">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Starting Cash
                          </p>
                          <p className="font-semibold text-lg">
                            {formatCurrency(shift.startingCash || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Cash Sales
                          </p>
                          <p className="font-semibold text-lg text-green-600">
                            {formatCurrency(shift.totalCashSales || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Expected Cash
                          </p>
                          <p className="font-semibold text-lg">
                            {formatCurrency(
                              shift.expectedCash || shift.startingCash || 0
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Actual Cash
                          </p>
                          <p className="font-semibold text-lg">
                            {shift.actualCash !== null
                              ? formatCurrency(shift.actualCash)
                              : isActive
                              ? "Ongoing"
                              : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Variance</p>
                          <p
                            className={`font-bold text-lg ${
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
                                  <>✓ Perfect</>
                                ) : (
                                  <>
                                    {isShort ? "↓" : "↑"}{" "}
                                    {formatCurrency(Math.abs(variance))}
                                  </>
                                )}
                              </>
                            ) : isActive ? (
                              "TBD"
                            ) : (
                              "N/A"
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Sales Summary */}
                      <div className="flex flex-wrap items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">
                            <span className="font-semibold text-gray-900">
                              {shift.transactionCount || 0}
                            </span>{" "}
                            Transactions
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">
                            Total Sales:{" "}
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(shift.totalSales || 0)}
                            </span>
                          </span>
                        </div>
                        {shift.totalCardSales > 0 && (
                          <div className="text-gray-600">
                            Card:{" "}
                            <span className="font-medium">
                              {formatCurrency(shift.totalCardSales)}
                            </span>
                          </div>
                        )}
                        {shift.totalOtherSales > 0 && (
                          <div className="text-gray-600">
                            Other:{" "}
                            <span className="font-medium">
                              {formatCurrency(shift.totalOtherSales)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Variance Message for Completed Shifts */}
                      {!isActive && hasDiscrepancy && (
                        <div
                          className={`flex items-start gap-2 p-3 rounded-lg ${
                            isShort ? "bg-red-50" : "bg-yellow-50"
                          }`}
                        >
                          <AlertTriangle
                            className={`h-5 w-5 mt-0.5 ${
                              isShort ? "text-red-600" : "text-yellow-600"
                            }`}
                          />
                          <div>
                            <p
                              className={`font-medium ${
                                isShort ? "text-red-900" : "text-yellow-900"
                              }`}
                            >
                              {isShort ? "Cash Shortage" : "Cash Surplus"}
                            </p>
                            <p
                              className={`text-sm ${
                                isShort ? "text-red-700" : "text-yellow-700"
                              }`}
                            >
                              {isShort
                                ? `You were short ${formatCurrency(
                                    Math.abs(variance)
                                  )} at the end of this shift.`
                                : `You had ${formatCurrency(
                                    Math.abs(variance)
                                  )} extra at the end of this shift.`}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Active Shift Message */}
                      {isActive && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50">
                          <Clock className="h-5 w-5 mt-0.5 text-green-600 animate-pulse" />
                          <div>
                            <p className="font-medium text-green-900">
                              Shift in Progress
                            </p>
                            <p className="text-sm text-green-700">
                              This shift will be completed when you log out.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {shift.notes && (
                        <div className="pt-3 border-t">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Notes:</span>{" "}
                            {shift.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
