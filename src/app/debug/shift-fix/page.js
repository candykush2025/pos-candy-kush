"use client";

import { useState } from "react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Database,
  Calculator,
  DollarSign,
  Receipt,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Copy,
  RefreshCw,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { toast } from "sonner";

export default function ShiftFixDebugPage() {
  const [shiftId, setShiftId] = useState("");
  const [loading, setLoading] = useState(false);
  const [shiftData, setShiftData] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [calculationDetails, setCalculationDetails] = useState(null);

  const searchShift = async () => {
    if (!shiftId.trim()) {
      toast.error("Please enter a shift ID");
      return;
    }

    setLoading(true);
    try {
      // Fetch shift document
      const shiftRef = doc(db, "shifts", shiftId.trim());
      const shiftSnap = await getDoc(shiftRef);

      if (!shiftSnap.exists()) {
        toast.error("Shift not found");
        setShiftData(null);
        setReceipts([]);
        setCalculationDetails(null);
        return;
      }

      const shift = { id: shiftSnap.id, ...shiftSnap.data() };
      setShiftData(shift);

      // Fetch all receipts for this shift
      const receiptsQuery = query(
        collection(db, "receipts"),
        where("shiftId", "==", shiftId.trim()),
      );
      const receiptsSnap = await getDocs(receiptsQuery);
      const receiptsData = receiptsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setReceipts(receiptsData);

      // Calculate expected values
      const calculations = calculateShiftDetails(shift, receiptsData);
      setCalculationDetails(calculations);

      toast.success("Shift data loaded successfully");
    } catch (error) {
      console.error("Error fetching shift:", error);
      toast.error("Failed to load shift data");
    } finally {
      setLoading(false);
    }
  };

  const calculateShiftDetails = (shift, receipts) => {
    console.log("🔍 SHIFT CALCULATION DEBUG");
    console.log("========================");
    console.log("Shift ID:", shift.id);
    console.log("Total Receipts:", receipts.length);

    let calculatedCashSales = 0;
    let calculatedCardSales = 0;
    let calculatedBankTransferSales = 0;
    let calculatedCryptoSales = 0;
    let calculatedOtherSales = 0;
    let calculatedTotalSales = 0;

    const paymentBreakdown = [];

    receipts.forEach((receipt, index) => {
      console.log(`\n📝 Receipt ${index + 1}:`, receipt.orderNumber);
      console.log("  Document ID:", receipt.id);
      console.log("  Total:", receipt.total);
      console.log("  Payments:", receipt.payments);
      console.log("  Payment History:", receipt.paymentHistory);

      let receiptTotal = 0;
      const receiptPayments = {
        cash: 0,
        card: 0,
        bankTransfer: 0,
        crypto: 0,
        other: 0,
      };

      // Check for approved payment changes
      const hasApprovedChange = receipt.paymentHistory?.some(
        (h) => h.status === "approved",
      );

      if (hasApprovedChange) {
        console.log("  ✅ Has approved payment change");
      }

      // Process payments array
      if (Array.isArray(receipt.payments) && receipt.payments.length > 0) {
        receipt.payments.forEach((payment) => {
          const amount = parseFloat(payment.amount) || 0;
          const paymentType = payment.type?.toLowerCase() || "";

          console.log(
            `    💰 Payment: ${payment.name} (${paymentType}) = ${amount}`,
          );

          switch (paymentType) {
            case "cash":
              receiptPayments.cash += amount;
              calculatedCashSales += amount;
              break;
            case "card":
            case "credit card":
            case "debit card":
              receiptPayments.card += amount;
              calculatedCardSales += amount;
              break;
            case "bank transfer":
            case "banktransfer":
              receiptPayments.bankTransfer += amount;
              calculatedBankTransferSales += amount;
              break;
            case "crypto":
            case "cryptocurrency":
              receiptPayments.crypto += amount;
              calculatedCryptoSales += amount;
              break;
            default:
              receiptPayments.other += amount;
              calculatedOtherSales += amount;
          }

          receiptTotal += amount;
        });
      }

      calculatedTotalSales += receiptTotal;

      paymentBreakdown.push({
        orderNumber: receipt.orderNumber,
        documentId: receipt.id,
        total: receiptTotal,
        payments: receiptPayments,
        hasApprovedChange,
      });
    });

    console.log("\n💵 TOTALS:");
    console.log("  Cash:", calculatedCashSales);
    console.log("  Card:", calculatedCardSales);
    console.log("  Bank Transfer:", calculatedBankTransferSales);
    console.log("  Crypto:", calculatedCryptoSales);
    console.log("  Other:", calculatedOtherSales);
    console.log("  Total Sales:", calculatedTotalSales);

    // Calculate expected cash
    const startingCash = parseFloat(shift.startingCash) || 0;
    const cashAdjustments = parseFloat(shift.cashAdjustments) || 0;
    const expectedCash = startingCash + calculatedCashSales + cashAdjustments;

    console.log("\n💰 CASH CALCULATION:");
    console.log("  Starting Cash:", startingCash);
    console.log("  Cash Sales:", calculatedCashSales);
    console.log("  Cash Adjustments:", cashAdjustments);
    console.log("  Expected Cash:", expectedCash);

    // Compare with stored values
    console.log("\n📊 COMPARISON:");
    console.log("  Stored Total Sales:", shift.totalSales);
    console.log("  Calculated Total Sales:", calculatedTotalSales);
    console.log("  Difference:", shift.totalSales - calculatedTotalSales);
    console.log("\n  Stored Cash Sales:", shift.totalCashSales);
    console.log("  Calculated Cash Sales:", calculatedCashSales);
    console.log(
      "  Difference:",
      (shift.totalCashSales || 0) - calculatedCashSales,
    );
    console.log("\n  Stored Expected Cash:", shift.expectedCash);
    console.log("  Calculated Expected Cash:", expectedCash);
    console.log("  Difference:", (shift.expectedCash || 0) - expectedCash);

    // Calculate variance
    const actualCash = parseFloat(shift.actualCash) || 0;
    const variance = actualCash - expectedCash;

    console.log("\n🎯 VARIANCE:");
    console.log("  Actual Cash:", actualCash);
    console.log("  Expected Cash:", expectedCash);
    console.log("  Variance:", variance);
    console.log("========================");

    return {
      calculated: {
        totalSales: calculatedTotalSales,
        cashSales: calculatedCashSales,
        cardSales: calculatedCardSales,
        bankTransferSales: calculatedBankTransferSales,
        cryptoSales: calculatedCryptoSales,
        otherSales: calculatedOtherSales,
        expectedCash,
        variance,
      },
      stored: {
        totalSales: shift.totalSales || 0,
        cashSales: shift.totalCashSales || 0,
        cardSales: shift.totalCardSales || 0,
        bankTransferSales: shift.totalBankTransferSales || 0,
        cryptoSales: shift.totalCryptoSales || 0,
        otherSales: shift.totalOtherSales || 0,
        expectedCash: shift.expectedCash || 0,
        variance: shift.variance || 0,
      },
      differences: {
        totalSales: (shift.totalSales || 0) - calculatedTotalSales,
        cashSales: (shift.totalCashSales || 0) - calculatedCashSales,
        cardSales: (shift.totalCardSales || 0) - calculatedCardSales,
        bankTransferSales:
          (shift.totalBankTransferSales || 0) - calculatedBankTransferSales,
        cryptoSales: (shift.totalCryptoSales || 0) - calculatedCryptoSales,
        otherSales: (shift.totalOtherSales || 0) - calculatedOtherSales,
        expectedCash: (shift.expectedCash || 0) - expectedCash,
        variance: (shift.variance || 0) - variance,
      },
      paymentBreakdown,
    };
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              🔧 Shift Calculation Debug Tool
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Search and analyze shift calculations in detail
            </p>
          </div>
        </div>

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Shift by ID
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter Shift ID (e.g., shift_abc123)"
                value={shiftId}
                onChange={(e) => setShiftId(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && searchShift()}
                className="flex-1"
              />
              <Button onClick={searchShift} disabled={loading}>
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Shift Data */}
        {shiftData && (
          <>
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Shift Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Document ID
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">
                        {shiftData.id}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(shiftData.id)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Status
                    </label>
                    <div className="mt-1">
                      <Badge
                        className={
                          shiftData.status === "active"
                            ? "bg-green-600"
                            : "bg-gray-600"
                        }
                      >
                        {shiftData.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Cashier
                    </label>
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {shiftData.userName || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      User ID
                    </label>
                    <p className="mt-1 text-gray-900 dark:text-gray-100 font-mono text-sm">
                      {shiftData.userId || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Start Time
                    </label>
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {formatDateTime(shiftData.startTime)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      End Time
                    </label>
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {shiftData.endTime
                        ? formatDateTime(shiftData.endTime)
                        : "Active"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Calculation Comparison */}
            {calculationDetails && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      Calculation Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Total Sales */}
                      <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                            STORED Total Sales
                          </label>
                          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                            {formatCurrency(
                              calculationDetails.stored.totalSales,
                            )}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                            CALCULATED Total Sales
                          </label>
                          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                            {formatCurrency(
                              calculationDetails.calculated.totalSales,
                            )}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                            DIFFERENCE
                          </label>
                          <p
                            className={`text-xl font-bold mt-1 ${
                              Math.abs(
                                calculationDetails.differences.totalSales,
                              ) < 0.01
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {calculationDetails.differences.totalSales === 0 ? (
                              <CheckCircle className="h-5 w-5 inline" />
                            ) : (
                              formatCurrency(
                                calculationDetails.differences.totalSales,
                              )
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Payment Methods Breakdown */}
                      <div className="space-y-3">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          Payment Methods Breakdown
                        </h3>

                        {/* Cash */}
                        <div className="grid grid-cols-3 gap-4 p-3 bg-green-50 dark:bg-green-950/20 rounded">
                          <div>
                            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                              💵 Stored Cash
                            </label>
                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                              {formatCurrency(
                                calculationDetails.stored.cashSales,
                              )}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                              💵 Calculated Cash
                            </label>
                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                              {formatCurrency(
                                calculationDetails.calculated.cashSales,
                              )}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                              Difference
                            </label>
                            <p
                              className={`text-lg font-bold ${
                                Math.abs(
                                  calculationDetails.differences.cashSales,
                                ) < 0.01
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {calculationDetails.differences.cashSales ===
                              0 ? (
                                <CheckCircle className="h-4 w-4 inline" />
                              ) : (
                                formatCurrency(
                                  calculationDetails.differences.cashSales,
                                )
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Card */}
                        <div className="grid grid-cols-3 gap-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded">
                          <div>
                            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                              💳 Stored Card
                            </label>
                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                              {formatCurrency(
                                calculationDetails.stored.cardSales,
                              )}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                              💳 Calculated Card
                            </label>
                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                              {formatCurrency(
                                calculationDetails.calculated.cardSales,
                              )}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                              Difference
                            </label>
                            <p
                              className={`text-lg font-bold ${
                                Math.abs(
                                  calculationDetails.differences.cardSales,
                                ) < 0.01
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {calculationDetails.differences.cardSales ===
                              0 ? (
                                <CheckCircle className="h-4 w-4 inline" />
                              ) : (
                                formatCurrency(
                                  calculationDetails.differences.cardSales,
                                )
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Bank Transfer */}
                        <div className="grid grid-cols-3 gap-4 p-3 bg-purple-50 dark:bg-purple-950/20 rounded">
                          <div>
                            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                              🏦 Stored Bank
                            </label>
                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                              {formatCurrency(
                                calculationDetails.stored.bankTransferSales,
                              )}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                              🏦 Calculated Bank
                            </label>
                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                              {formatCurrency(
                                calculationDetails.calculated.bankTransferSales,
                              )}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                              Difference
                            </label>
                            <p
                              className={`text-lg font-bold ${
                                Math.abs(
                                  calculationDetails.differences
                                    .bankTransferSales,
                                ) < 0.01
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {calculationDetails.differences
                                .bankTransferSales === 0 ? (
                                <CheckCircle className="h-4 w-4 inline" />
                              ) : (
                                formatCurrency(
                                  calculationDetails.differences
                                    .bankTransferSales,
                                )
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Cash Calculation */}
                      <div className="space-y-3 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <DollarSign className="h-5 w-5" />
                          Cash Drawer Calculation
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">
                              Starting Cash:
                            </span>
                            <p className="font-bold text-gray-900 dark:text-gray-100">
                              {formatCurrency(shiftData.startingCash || 0)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">
                              Cash Adjustments:
                            </span>
                            <p className="font-bold text-gray-900 dark:text-gray-100">
                              {formatCurrency(shiftData.cashAdjustments || 0)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">
                              Calculated Cash Sales:
                            </span>
                            <p className="font-bold text-gray-900 dark:text-gray-100">
                              {formatCurrency(
                                calculationDetails.calculated.cashSales,
                              )}
                            </p>
                          </div>
                          <div className="col-span-2 pt-2 border-t border-gray-300 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400">
                              Expected Cash:
                            </span>
                            <p className="font-bold text-lg text-gray-900 dark:text-gray-100">
                              {formatCurrency(
                                calculationDetails.calculated.expectedCash,
                              )}
                            </p>
                          </div>
                          {shiftData.actualCash && (
                            <>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">
                                  Actual Cash:
                                </span>
                                <p className="font-bold text-gray-900 dark:text-gray-100">
                                  {formatCurrency(shiftData.actualCash)}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">
                                  Variance:
                                </span>
                                <p
                                  className={`font-bold text-lg ${
                                    calculationDetails.calculated.variance === 0
                                      ? "text-green-600"
                                      : calculationDetails.calculated.variance >
                                          0
                                        ? "text-yellow-600"
                                        : "text-red-600"
                                  }`}
                                >
                                  {calculationDetails.calculated.variance ===
                                  0 ? (
                                    "Perfect! ✓"
                                  ) : calculationDetails.calculated.variance >
                                    0 ? (
                                    <>
                                      <TrendingUp className="inline h-4 w-4" />{" "}
                                      {formatCurrency(
                                        calculationDetails.calculated.variance,
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <TrendingDown className="inline h-4 w-4" />{" "}
                                      {formatCurrency(
                                        Math.abs(
                                          calculationDetails.calculated
                                            .variance,
                                        ),
                                      )}
                                    </>
                                  )}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Receipt Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="h-5 w-5" />
                      Receipt Breakdown ({receipts.length} receipts)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {calculationDetails.paymentBreakdown.map(
                        (receipt, index) => (
                          <div
                            key={index}
                            className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  {receipt.orderNumber}
                                </Badge>
                                {receipt.hasApprovedChange && (
                                  <Badge className="bg-orange-600">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Payment Changed
                                  </Badge>
                                )}
                              </div>
                              <span className="font-bold">
                                {formatCurrency(receipt.total)}
                              </span>
                            </div>
                            <div className="text-xs font-mono text-gray-500 dark:text-gray-400">
                              ID: {receipt.documentId}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {receipt.payments.cash > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    💵 Cash:
                                  </span>
                                  <span className="font-semibold">
                                    {formatCurrency(receipt.payments.cash)}
                                  </span>
                                </div>
                              )}
                              {receipt.payments.card > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    💳 Card:
                                  </span>
                                  <span className="font-semibold">
                                    {formatCurrency(receipt.payments.card)}
                                  </span>
                                </div>
                              )}
                              {receipt.payments.bankTransfer > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    🏦 Bank:
                                  </span>
                                  <span className="font-semibold">
                                    {formatCurrency(
                                      receipt.payments.bankTransfer,
                                    )}
                                  </span>
                                </div>
                              )}
                              {receipt.payments.crypto > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    ₿ Crypto:
                                  </span>
                                  <span className="font-semibold">
                                    {formatCurrency(receipt.payments.crypto)}
                                  </span>
                                </div>
                              )}
                              {receipt.payments.other > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    💰 Other:
                                  </span>
                                  <span className="font-semibold">
                                    {formatCurrency(receipt.payments.other)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}

        {/* Instructions */}
        {!shiftData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                How to Use This Tool
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <p>
                1. Go to{" "}
                <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                  /sales?menu=shifts
                </code>{" "}
                to find the shift you want to debug
              </p>
              <p>
                2. Copy the <strong>Document ID</strong> shown under the shift
                title
              </p>
              <p>3. Paste it in the search bar above</p>
              <p>
                4. Click <strong>Search</strong> to load all shift data and
                calculation details
              </p>
              <p>
                5. Review the comparison between stored values and calculated
                values
              </p>
              <p>6. Check the console (F12) for detailed calculation logs</p>
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded">
                <p className="font-semibold text-blue-900 dark:text-blue-100">
                  💡 Tip: Green checkmarks (✓) indicate values match perfectly.
                  Red values show discrepancies that need investigation.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
