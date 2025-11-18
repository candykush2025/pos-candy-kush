"use client";

import { useState, useEffect } from "react";
import { shiftsService } from "@/lib/firebase/shiftsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Clock,
  DollarSign,
  TrendingUp,
  Calendar,
  CheckCircle,
  AlertTriangle,
  User,
  Receipt,
  Plus,
  XCircle,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { toast } from "sonner";

export default function ShiftsSection({ cashier }) {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [showStartShiftModal, setShowStartShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [showCashManagementModal, setShowCashManagementModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [startingCash, setStartingCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [cashManagementAmount, setCashManagementAmount] = useState("");
  const [cashManagementDetails, setCashManagementDetails] = useState("");
  const [cashManagementType, setCashManagementType] = useState("payin"); // payin or payout

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

  const handleStartShift = async () => {
    try {
      if (!startingCash || parseFloat(startingCash) < 0) {
        toast.error("Please enter a valid starting cash amount");
        return;
      }

      const shift = await shiftsService.createShift(
        { startingCash: parseFloat(startingCash) },
        cashier.id,
        cashier.name
      );

      // Update localStorage
      localStorage.setItem("active_shift", JSON.stringify(shift));
      window.dispatchEvent(new Event("cashier-update"));

      setShowStartShiftModal(false);
      setStartingCash("");
      loadShifts();
      toast.success("Shift started successfully!");
    } catch (error) {
      console.error("Error starting shift:", error);
      toast.error("Failed to start shift");
    }
  };

  const handleCloseShift = async () => {
    try {
      if (!closingCash || parseFloat(closingCash) < 0) {
        toast.error("Please enter a valid closing cash amount");
        return;
      }

      await shiftsService.endShift(selectedShift.id, {
        actualCash: parseFloat(closingCash),
        notes: closeNotes,
      });

      // Clear localStorage
      localStorage.removeItem("active_shift");
      window.dispatchEvent(new Event("cashier-update"));

      setShowCloseShiftModal(false);
      setSelectedShift(null);
      setClosingCash("");
      setCloseNotes("");
      loadShifts();
      toast.success("Shift closed successfully!");
    } catch (error) {
      console.error("Error closing shift:", error);
      toast.error("Failed to close shift");
    }
  };

  const handleCashManagement = async () => {
    try {
      const amount = parseFloat(cashManagementAmount);
      if (!amount || amount <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      if (!cashManagementDetails.trim()) {
        toast.error("Please enter details for this transaction");
        return;
      }

      const cashMovement = {
        type: cashManagementType,
        amount: amount,
        details: cashManagementDetails,
        cashierName: cashier?.name || "Unknown",
        timestamp: new Date().toISOString(),
      };

      await shiftsService.addCashMovement(selectedShift.id, cashMovement);

      // Update localStorage if this is the active shift
      const savedShift = localStorage.getItem("active_shift");
      if (savedShift) {
        const activeShift = JSON.parse(savedShift);
        if (activeShift.id === selectedShift.id) {
          const updatedShift = await shiftsService.getById(selectedShift.id);
          localStorage.setItem("active_shift", JSON.stringify(updatedShift));
          window.dispatchEvent(new Event("cashier-update"));
        }
      }

      setShowCashManagementModal(false);
      setCashManagementAmount("");
      setCashManagementDetails("");
      setCashManagementType("payin");
      loadShifts();
      toast.success(
        `${
          cashManagementType === "payin" ? "Pay In" : "Pay Out"
        } recorded successfully!`
      );
    } catch (error) {
      console.error("Error recording cash movement:", error);
      toast.error("Failed to record cash movement");
    }
  };

  const handleCashKeypad = (
    value,
    isClosing = false,
    isCashManagement = false
  ) => {
    const setter = isCashManagement
      ? setCashManagementAmount
      : isClosing
      ? setClosingCash
      : setStartingCash;
    const currentValue = isCashManagement
      ? cashManagementAmount
      : isClosing
      ? closingCash
      : startingCash;

    if (value === "backspace") {
      setter((prev) => prev.slice(0, -1));
    } else if (value === "clear") {
      setter("");
    } else if (value === ".") {
      if (!currentValue.includes(".")) {
        setter((prev) => prev + ".");
      }
    } else {
      setter((prev) => prev + value);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-950 dark:bg-gray-950">
        <div className="text-center">
          <Clock className="h-12 w-12 text-gray-500 dark:text-gray-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400 dark:text-gray-400">
            Loading your shifts...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gray-50 dark:bg-gray-950">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              My Shifts
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              View your shift history and cash handling records
            </p>
          </div>
          <Button
            onClick={() => setShowStartShiftModal(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Open Shift
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
                        ? "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20"
                        : "border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20"
                      : isActive
                      ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30"
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

                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              isActive
                                ? "bg-green-600 text-white dark:bg-green-700"
                                : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                            }
                          >
                            {isActive ? (
                              <>
                                <div className="h-2 w-2 rounded-full bg-white mr-1 animate-pulse" />
                                Active
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Completed
                              </>
                            )}
                          </Badge>
                          {isActive && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedShift(shift);
                                  setShowCashManagementModal(true);
                                }}
                                className="border-blue-300 text-blue-700 hover:bg-blue-50"
                              >
                                <Wallet className="mr-1 h-3 w-3" />
                                Cash Management
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedShift(shift);
                                  setShowCloseShiftModal(true);
                                }}
                              >
                                <XCircle className="mr-1 h-3 w-3" />
                                Close Shift
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Time Info */}
                      <div className="flex items-center gap-6 text-sm text-gray-400 dark:text-gray-400">
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
                          <div className="flex items-center gap-1.5 text-green-400 dark:text-green-400 font-medium">
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

                      {/* Cash Drawer Section */}
                      <div className="space-y-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-700">
                        <h4 className="font-semibold text-base text-gray-900 dark:text-gray-100">
                          Cash Drawer
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              Starting Cash
                            </p>
                            <p className="font-semibold text-base text-gray-900 dark:text-gray-100">
                              {formatCurrency(shift.startingCash || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              Cash Payments
                            </p>
                            <p className="font-semibold text-base text-green-600">
                              + {formatCurrency(shift.totalCashSales || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              Cash Refunds
                            </p>
                            <p className="font-semibold text-base text-red-600">
                              - {formatCurrency(shift.totalCashRefunds || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              Paid In
                            </p>
                            <p className="font-semibold text-base text-blue-600">
                              + {formatCurrency(shift.totalPaidIn || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              Paid Out
                            </p>
                            <p className="font-semibold text-base text-orange-600">
                              - {formatCurrency(shift.totalPaidOut || 0)}
                            </p>
                          </div>
                          <div className="col-span-2 md:col-span-1 bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              Expected Cash
                            </p>
                            <p className="font-bold text-lg text-blue-600">
                              {formatCurrency(
                                shift.expectedCash || shift.startingCash || 0
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Separator */}
                        <div className="border-t border-gray-200 dark:border-gray-700"></div>

                        {/* Sales Summary */}
                        <h4 className="font-semibold text-base text-gray-900 dark:text-gray-100">
                          Sales Summary
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              Gross Sales
                            </p>
                            <p className="font-semibold text-base text-gray-900 dark:text-gray-100">
                              {formatCurrency(
                                shift.grossSales || shift.totalSales || 0
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              Refunds
                            </p>
                            <p className="font-semibold text-base text-red-600">
                              - {formatCurrency(shift.totalRefunds || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              Discounts
                            </p>
                            <p className="font-semibold text-base text-orange-600">
                              - {formatCurrency(shift.totalDiscounts || 0)}
                            </p>
                          </div>
                        </div>

                        {/* Separator */}
                        <div className="border-t border-gray-200 dark:border-gray-700"></div>

                        {/* Net Sales */}
                        <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Net Sales
                            </p>
                            <p className="text-2xl font-bold text-green-600">
                              {formatCurrency(
                                (shift.grossSales || shift.totalSales || 0) -
                                  (shift.totalRefunds || 0) -
                                  (shift.totalDiscounts || 0)
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Actual Cash & Variance (for closed shifts) */}
                        {!isActive && (
                          <>
                            <div className="border-t border-gray-200 dark:border-gray-700"></div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  Actual Cash
                                </p>
                                <p className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                                  {shift.actualCash !== null
                                    ? formatCurrency(shift.actualCash)
                                    : "N/A"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  Variance
                                </p>
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
                                  ) : (
                                    "N/A"
                                  )}
                                </p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Sales Summary */}
                      <div className="flex flex-wrap items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-gray-500 dark:text-gray-500" />
                          <span className="text-gray-400 dark:text-gray-400">
                            <span className="font-semibold text-gray-100 dark:text-gray-100">
                              {shift.transactionCount || 0}
                            </span>{" "}
                            Transactions
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-gray-500 dark:text-gray-500" />
                          <span className="text-gray-400 dark:text-gray-400">
                            Total Sales:{" "}
                            <span className="font-semibold text-gray-100 dark:text-gray-100">
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

                      {/* Pay In/Pay Out History */}
                      {shift.cashMovements &&
                        shift.cashMovements.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                              Pay In / Pay Out History
                            </h4>
                            <div className="space-y-2">
                              {shift.cashMovements.map((movement, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                                >
                                  <div className="flex items-center gap-3">
                                    {movement.type === "payin" ? (
                                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                                        <ArrowUpCircle className="h-4 w-4 text-green-600" />
                                      </div>
                                    ) : (
                                      <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                                        <ArrowDownCircle className="h-4 w-4 text-red-600" />
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {movement.type === "payin"
                                          ? "Pay In"
                                          : "Pay Out"}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {movement.details}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p
                                      className={`text-base font-semibold ${
                                        movement.type === "payin"
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      {movement.type === "payin" ? "+" : "-"}
                                      {formatCurrency(movement.amount)}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {new Date(
                                        movement.timestamp
                                      ).toLocaleString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </p>
                                  </div>
                                </div>
                              ))}
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

      {/* Start Shift Modal */}
      <Dialog open={showStartShiftModal} onOpenChange={setShowStartShiftModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start New Shift</DialogTitle>
            <DialogDescription>
              Enter the starting cash amount in the register
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Starting Cash Amount
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  readOnly
                  placeholder="0.00"
                  value={startingCash}
                  className="pl-10 text-lg text-center pointer-events-none"
                  inputMode="none"
                  autoComplete="off"
                />
              </div>

              {/* Numeric Keypad */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <Button
                    key={num}
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => handleCashKeypad(num.toString(), false)}
                    className="h-14 text-xl font-semibold"
                  >
                    {num}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => handleCashKeypad("clear", false)}
                  className="h-14 text-sm"
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => handleCashKeypad("0", false)}
                  className="h-14 text-xl font-semibold"
                >
                  0
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => handleCashKeypad(".", false)}
                  className="h-14 text-xl font-semibold"
                >
                  .
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowStartShiftModal(false);
                  setStartingCash("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleStartShift}
                disabled={!startingCash}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Start Shift
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Shift Modal */}
      <Dialog open={showCloseShiftModal} onOpenChange={setShowCloseShiftModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Close Shift</DialogTitle>
            <DialogDescription>
              Count the cash in the register and enter the closing amount
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedShift && (
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Expected Cash:
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(
                      selectedShift.expectedCash ||
                        selectedShift.startingCash ||
                        0
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Total Sales:
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(selectedShift.totalSales || 0)}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Closing Cash Amount</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  readOnly
                  placeholder="0.00"
                  value={closingCash}
                  className="pl-10 text-lg text-center pointer-events-none"
                  inputMode="none"
                  autoComplete="off"
                />
              </div>

              {/* Numeric Keypad */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <Button
                    key={num}
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => handleCashKeypad(num.toString(), true)}
                    className="h-14 text-xl font-semibold"
                  >
                    {num}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => handleCashKeypad("clear", true)}
                  className="h-14 text-sm"
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => handleCashKeypad("0", true)}
                  className="h-14 text-xl font-semibold"
                >
                  0
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => handleCashKeypad(".", true)}
                  className="h-14 text-xl font-semibold"
                >
                  .
                </Button>
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium">Notes (Optional)</label>
                <Input
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Any notes about this shift..."
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCloseShiftModal(false);
                  setSelectedShift(null);
                  setClosingCash("");
                  setCloseNotes("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCloseShift}
                disabled={!closingCash}
                variant="destructive"
                className="flex-1"
              >
                Close Shift
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cash Management Modal */}
      <Dialog
        open={showCashManagementModal}
        onOpenChange={setShowCashManagementModal}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cash Management</DialogTitle>
            <DialogDescription>
              Record cash paid in or paid out of the drawer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Type Selection */}
            <div className="flex gap-2">
              <Button
                variant={cashManagementType === "payin" ? "default" : "outline"}
                onClick={() => setCashManagementType("payin")}
                className="flex-1"
              >
                <ArrowUpCircle className="mr-2 h-4 w-4" />
                Pay In
              </Button>
              <Button
                variant={
                  cashManagementType === "payout" ? "default" : "outline"
                }
                onClick={() => setCashManagementType("payout")}
                className="flex-1"
              >
                <ArrowDownCircle className="mr-2 h-4 w-4" />
                Pay Out
              </Button>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount</label>
              <div className="text-center p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
                <div className="text-3xl font-bold">
                  {cashManagementAmount
                    ? formatCurrency(parseFloat(cashManagementAmount))
                    : "$0.00"}
                </div>
              </div>
              {/* Number Keypad */}
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, ".", 0, "⌫"].map((num) => (
                  <Button
                    key={num}
                    variant="outline"
                    size="lg"
                    onClick={() =>
                      handleCashKeypad(
                        num === "⌫" ? "backspace" : num.toString(),
                        false,
                        true
                      )
                    }
                    className="h-14 text-lg"
                  >
                    {num}
                  </Button>
                ))}
              </div>
            </div>

            {/* Details Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Details / Reason</label>
              <Textarea
                value={cashManagementDetails}
                onChange={(e) => setCashManagementDetails(e.target.value)}
                placeholder="Enter reason for this transaction..."
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCashManagementModal(false);
                  setSelectedShift(null);
                  setCashManagementAmount("");
                  setCashManagementDetails("");
                  setCashManagementType("payin");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCashManagement}
                disabled={
                  !cashManagementAmount || !cashManagementDetails.trim()
                }
                className="flex-1"
              >
                {cashManagementType === "payin" ? (
                  <>
                    <ArrowUpCircle className="mr-2 h-4 w-4" />
                    Record Pay In
                  </>
                ) : (
                  <>
                    <ArrowDownCircle className="mr-2 h-4 w-4" />
                    Record Pay Out
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
