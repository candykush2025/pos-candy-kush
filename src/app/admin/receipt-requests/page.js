"use client";

import { useEffect, useState } from "react";
import { receiptsService } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  CheckCircle,
  XCircle,
  Edit2,
  RotateCcw,
  Clock,
  ArrowRight,
} from "lucide-react";

export default function ReceiptRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editedPaymentMethod, setEditedPaymentMethod] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await receiptsService.getEditRequests({
        orderBy: ["requestedAt", "desc"],
      });
      setRequests(data);
    } catch (error) {
      console.error("Error loading edit requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request) => {
    try {
      // Get the current receipt data
      const currentReceipt = await receiptsService.get(request.receiptId);

      if (!currentReceipt) {
        alert("Receipt not found");
        return;
      }

      if (request.type === "refund") {
        // Process refund
        await receiptsService.update(request.receiptId, {
          status: "refunded",
          refundedAt: new Date().toISOString(),
          refundedBy: "admin", // TODO: Get actual admin ID
          hasPendingPaymentChange: false,
        });
      } else if (request.type === "payment_change") {
        // Update payment method
        const newPaymentMethod =
          editedPaymentMethod || request.newPaymentMethod;

        // Get existing payment history
        const existingHistory = currentReceipt.paymentHistory || [];

        await receiptsService.update(request.receiptId, {
          payments: [
            {
              name: newPaymentMethod,
              amount: request.amount,
              type: newPaymentMethod.toLowerCase(),
            },
          ],
          paymentHistory: [
            ...existingHistory,
            {
              oldMethod: request.oldPaymentMethod,
              newMethod: newPaymentMethod,
              changedAt: new Date().toISOString(),
              changedBy: request.requestedByName,
              approvedBy: "admin", // TODO: Get actual admin ID
            },
          ],
          hasPendingPaymentChange: false, // Clear the pending flag
        });
      }

      // Mark request as approved
      await receiptsService.updateEditRequest(request.id, {
        status: "approved",
        approvedAt: new Date().toISOString(),
        approvedBy: "admin", // TODO: Get actual admin ID
        finalPaymentMethod: editedPaymentMethod || request.newPaymentMethod,
      });

      alert("Request approved successfully. Receipt has been updated.");
      setShowReviewModal(false);
      setEditedPaymentMethod("");
      loadRequests();
    } catch (error) {
      console.error("Error approving request:", error);
      alert("Failed to approve request: " + error.message);
    }
  };

  const handleDecline = async (request) => {
    try {
      await receiptsService.updateEditRequest(request.id, {
        status: "declined",
        declinedAt: new Date().toISOString(),
        declinedBy: "admin", // TODO: Get actual admin ID
      });

      alert("Request declined");
      setShowReviewModal(false);
      loadRequests();
    } catch (error) {
      console.error("Error declining request:", error);
      alert("Failed to decline request");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "declined":
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Declined
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTypeIcon = (type) => {
    return type === "refund" ? (
      <RotateCcw className="h-5 w-5 text-red-600" />
    ) : (
      <Edit2 className="h-5 w-5 text-blue-600" />
    );
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const processedRequests = requests.filter((r) => r.status !== "pending");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Receipt Edit Requests</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Review and approve cashier requests for refunds and payment changes
        </p>
      </div>

      {/* Pending Requests */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Pending Requests ({pendingRequests.length})
        </h2>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : pendingRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-gray-500">
                No pending requests at this time
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pendingRequests.map((request) => (
              <Card
                key={request.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getTypeIcon(request.type)}
                      <div>
                        <CardTitle className="text-lg">
                          {request.type === "refund"
                            ? "Refund Request"
                            : "Payment Method Change"}
                        </CardTitle>
                        <CardDescription>
                          Requested by {request.requestedByName} on{" "}
                          {formatDate(
                            new Date(request.requestedAt),
                            "datetime"
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Receipt #:</span>{" "}
                        <span className="font-mono font-semibold">
                          {request.receiptNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Amount:</span>{" "}
                        <span className="font-semibold">
                          {formatCurrency(
                            request.originalAmount || request.amount
                          )}
                        </span>
                      </div>
                    </div>

                    {request.type === "payment_change" && (
                      <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <span className="font-semibold">
                          {request.oldPaymentMethod}
                        </span>
                        <ArrowRight className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-blue-600">
                          {request.newPaymentMethod}
                        </span>
                      </div>
                    )}

                    {request.status === "pending" && (
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setEditedPaymentMethod(
                              request.newPaymentMethod || ""
                            );
                            setShowReviewModal(true);
                          }}
                          className="flex-1"
                        >
                          Review
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDecline(request)}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Decline
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Processed Requests ({processedRequests.length})
          </h2>
          <div className="grid gap-4">
            {processedRequests.map((request) => (
              <Card key={request.id} className="opacity-75">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getTypeIcon(request.type)}
                      <div>
                        <CardTitle className="text-lg">
                          {request.type === "refund"
                            ? "Refund Request"
                            : "Payment Method Change"}
                        </CardTitle>
                        <CardDescription>
                          Requested by {request.requestedByName}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">Receipt #:</span>{" "}
                      <span className="font-mono">{request.receiptNumber}</span>
                    </div>
                    {request.type === "payment_change" && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">
                          {request.oldPaymentMethod}
                        </span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="font-semibold">
                          {request.finalPaymentMethod ||
                            request.newPaymentMethod}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Review Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Request</DialogTitle>
            <DialogDescription>
              Review the details and approve or edit before approving
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Request Type
                  </span>
                  <span className="font-semibold">
                    {selectedRequest.type === "refund"
                      ? "Refund"
                      : "Payment Change"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Receipt #
                  </span>
                  <span className="font-mono font-semibold">
                    {selectedRequest.receiptNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Amount
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(
                      selectedRequest.originalAmount || selectedRequest.amount
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Requested By
                  </span>
                  <span className="font-semibold">
                    {selectedRequest.requestedByName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Requested At
                  </span>
                  <span className="font-semibold">
                    {formatDate(
                      new Date(selectedRequest.requestedAt),
                      "datetime"
                    )}
                  </span>
                </div>
              </div>

              {selectedRequest.type === "payment_change" && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Payment Method (Edit if needed)
                  </label>
                  <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Original:</span>
                      <span className="font-semibold">
                        {selectedRequest.oldPaymentMethod}
                      </span>
                      <ArrowRight className="h-4 w-4 text-blue-600" />
                      <span className="text-gray-600">Requested:</span>
                      <span className="font-semibold text-blue-600">
                        {selectedRequest.newPaymentMethod}
                      </span>
                    </div>
                  </div>
                  <Select
                    value={editedPaymentMethod}
                    onValueChange={setEditedPaymentMethod}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method to approve" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="Bank Transfer">
                        Bank Transfer
                      </SelectItem>
                      <SelectItem value="Crypto">Crypto</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-2">
                    You can edit the payment method before approving
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReviewModal(false);
                    setEditedPaymentMethod("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDecline(selectedRequest)}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline
                </Button>
                <Button
                  onClick={() => handleApprove(selectedRequest)}
                  className="flex-1"
                  disabled={
                    selectedRequest.type === "payment_change" &&
                    !editedPaymentMethod
                  }
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
