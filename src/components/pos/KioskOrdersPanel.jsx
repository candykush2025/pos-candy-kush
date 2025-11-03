"use client";
import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Bell,
  Check,
  X,
  Eye,
  Package,
  User,
  CreditCard,
  Clock,
} from "lucide-react";

export default function KioskOrdersPanel({ currentUser }) {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [previousCount, setPreviousCount] = useState(0);

  useEffect(() => {
    // Listen to pending orders in real-time
    const q = query(
      collection(db, "kioskOrders"),
      where("status", "==", "pending_confirmation"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = [];
      snapshot.forEach((doc) => {
        orders.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          orderCompletedAt: doc.data().orderCompletedAt?.toDate(),
        });
      });

      setPendingOrders(orders);

      // Play sound for new orders
      if (orders.length > previousCount && previousCount > 0) {
        playNotificationSound();
      }
      setPreviousCount(orders.length);
    });

    return () => unsubscribe();
  }, [previousCount]);

  const confirmOrder = async (orderId, confirmationData) => {
    try {
      const orderRef = doc(db, "kioskOrders", orderId);

      await updateDoc(orderRef, {
        status: "confirmed",
        "payment.confirmedBy":
          confirmationData.cashierName || currentUser?.name || "Cashier",
        "payment.confirmedAt": serverTimestamp(),
        "payment.status": "confirmed",

        // For crypto payments
        ...(confirmationData.cryptoTransactionHash && {
          "payment.cryptoDetails.transactionHash":
            confirmationData.cryptoTransactionHash,
          "payment.cryptoDetails.verificationStatus": "verified",
          "payment.cryptoDetails.verifiedAt": serverTimestamp(),
        }),

        updatedAt: serverTimestamp(),
      });

      console.log("✅ Order confirmed:", orderId);
      setSelectedOrder(null);
      setShowModal(false);

      // Show success notification
      alert("Order confirmed successfully!");
    } catch (error) {
      console.error("❌ Error confirming order:", error);
      alert("Failed to confirm order: " + error.message);
    }
  };

  const rejectOrder = async (orderId, reason) => {
    try {
      const orderRef = doc(db, "kioskOrders", orderId);

      await updateDoc(orderRef, {
        status: "cancelled",
        cancelledBy: currentUser?.name || "Cashier",
        cancelledAt: serverTimestamp(),
        cancellationReason: reason || "Rejected by cashier",
        updatedAt: serverTimestamp(),
      });

      console.log("❌ Order cancelled:", orderId);
      setSelectedOrder(null);
      setShowModal(false);

      alert("Order rejected");
    } catch (error) {
      console.error("❌ Error rejecting order:", error);
      alert("Failed to reject order: " + error.message);
    }
  };

  return (
    <>
      {/* Notification Badge */}
      {pendingOrders.length > 0 && (
        <div className="fixed top-4 right-4 z-50">
          <div className="relative">
            <Bell className="w-8 h-8 text-yellow-500 animate-bounce" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {pendingOrders.length}
            </span>
          </div>
        </div>
      )}

      {/* Orders Panel */}
      <div className="kiosk-orders-panel bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="w-6 h-6" />
            Pending Kiosk Orders ({pendingOrders.length})
          </h2>
        </div>

        {pendingOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No pending orders</p>
            <p className="text-sm">New kiosk orders will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onView={() => {
                  setSelectedOrder(order);
                  setShowModal(true);
                }}
                onConfirm={(data) => confirmOrder(order.id, data)}
                onReject={(reason) => rejectOrder(order.id, reason)}
                currentUser={currentUser}
              />
            ))}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {showModal && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => {
            setShowModal(false);
            setSelectedOrder(null);
          }}
          onConfirm={(data) => confirmOrder(selectedOrder.id, data)}
          onReject={(reason) => rejectOrder(selectedOrder.id, reason)}
          currentUser={currentUser}
        />
      )}
    </>
  );
}

function OrderCard({ order, onView, onConfirm, onReject, currentUser }) {
  const [cashierName, setCashierName] = useState(currentUser?.name || "");
  const [cryptoTxHash, setCryptoTxHash] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleConfirm = () => {
    if (order.payment.method === "crypto" && !cryptoTxHash) {
      alert("Please enter crypto transaction hash");
      return;
    }

    if (!cashierName) {
      alert("Please enter your name");
      return;
    }

    onConfirm({
      cashierName: cashierName,
      cryptoTransactionHash: cryptoTxHash || null,
    });
  };

  const handleReject = () => {
    if (!rejectReason) {
      alert("Please enter rejection reason");
      return;
    }
    onReject(rejectReason);
    setShowRejectInput(false);
  };

  return (
    <div className="order-card bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-4 border-2 border-yellow-400 dark:border-yellow-600 shadow-lg hover:shadow-xl transition-shadow">
      {/* Order Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Order #{order.transactionId}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {order.createdAt?.toLocaleTimeString()}
          </p>
        </div>
        <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
          NEW
        </span>
      </div>

      {/* Customer Info */}
      <div className="mb-3 p-3 bg-white dark:bg-gray-900 rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <p className="font-semibold text-gray-900 dark:text-white">
            {order.customer.fullName}
          </p>
        </div>
        {!order.customer.isNoMember && (
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <p>ID: {order.customer.customerId}</p>
            <p>Points: {order.customer.currentPoints}</p>
          </div>
        )}
      </div>

      {/* Items Summary */}
      <div className="mb-3 p-3 bg-white dark:bg-gray-900 rounded-lg">
        <p className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">
          📦 {order.items.length} Item(s)
        </p>
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {order.items.slice(0, 3).map((item, idx) => (
            <div
              key={idx}
              className="flex justify-between text-xs text-gray-700 dark:text-gray-300"
            >
              <span>
                {item.quantity}x {item.name}
              </span>
              <span className="font-semibold">฿{item.subtotal}</span>
            </div>
          ))}
          {order.items.length > 3 && (
            <p className="text-xs text-gray-500 italic">
              +{order.items.length - 3} more items
            </p>
          )}
        </div>
      </div>

      {/* Total */}
      <div className="mb-3 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-bold text-gray-900 dark:text-white">
            Total:
          </span>
          <span className="text-xl font-bold text-green-700 dark:text-green-400">
            ฿{order.pricing.total}
          </span>
        </div>
        {order.pricing.pointsUsed > 0 && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Used {order.pricing.pointsUsed} points (-฿
            {order.pricing.pointsUsedValue})
          </p>
        )}
      </div>

      {/* Payment Method */}
      <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold text-gray-900 dark:text-white">
            {order.payment.method.toUpperCase()}
          </span>
        </div>

        {order.payment.method === "crypto" && (
          <div className="space-y-2">
            <div className="text-xs text-gray-700 dark:text-gray-300">
              <p>
                <strong>Currency:</strong>{" "}
                {order.payment.cryptoDetails.currency}
              </p>
              <p>
                <strong>Amount:</strong>{" "}
                {order.payment.cryptoDetails.amountInCrypto}{" "}
                {order.payment.cryptoDetails.currency}
              </p>
              <p>
                <strong>Network:</strong> {order.payment.cryptoDetails.network}
              </p>
              {order.payment.cryptoDetails.paymentUrl && (
                <a
                  href={order.payment.cryptoDetails.paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 underline"
                >
                  🔗 View Payment
                </a>
              )}
            </div>
            <input
              type="text"
              placeholder="Enter transaction hash"
              value={cryptoTxHash}
              onChange={(e) => setCryptoTxHash(e.target.value)}
              className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        )}
      </div>

      {/* Cashier Name */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Your name"
          value={cashierName}
          onChange={(e) => setCashierName(e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>

      {/* Reject Input */}
      {showRejectInput && (
        <div className="mb-3 space-y-2">
          <input
            type="text"
            placeholder="Rejection reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold"
            >
              Confirm Reject
            </button>
            <button
              onClick={() => setShowRejectInput(false)}
              className="flex-1 px-3 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!showRejectInput && (
        <div className="flex gap-2">
          <button
            onClick={onView}
            className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center justify-center gap-2 text-sm font-semibold"
          >
            <Eye className="w-4 h-4" />
            View
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 text-sm font-semibold"
          >
            <Check className="w-4 h-4" />
            Confirm
          </button>
          <button
            onClick={() => setShowRejectInput(true)}
            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function OrderDetailsModal({
  order,
  onClose,
  onConfirm,
  onReject,
  currentUser,
}) {
  const [cashierName, setCashierName] = useState(currentUser?.name || "");
  const [cryptoTxHash, setCryptoTxHash] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const handleConfirm = () => {
    if (order.payment.method === "crypto" && !cryptoTxHash) {
      alert("Please enter crypto transaction hash");
      return;
    }

    if (!cashierName) {
      alert("Please enter your name");
      return;
    }

    onConfirm({
      cashierName: cashierName,
      cryptoTransactionHash: cryptoTxHash || null,
    });
  };

  const handleReject = () => {
    if (!rejectReason) {
      alert("Please enter rejection reason");
      return;
    }
    onReject(rejectReason);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">
                Order #{order.transactionId}
              </h2>
              <p className="text-sm opacity-90">
                {order.createdAt?.toLocaleString()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Customer Information */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5" />
              Customer Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Name:</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {order.customer.fullName}
                </p>
              </div>
              {!order.customer.isNoMember && (
                <>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">
                      Customer ID:
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {order.customer.customerId}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Email:</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {order.customer.email || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">
                      Current Points:
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {order.customer.currentPoints}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              Order Items ({order.items.length})
            </h3>
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-3 bg-white dark:bg-gray-900 rounded"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Category: {item.categoryName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-900 dark:text-white">
                      {item.quantity} x ฿{item.price}
                    </p>
                    <p className="font-bold text-green-600 dark:text-green-400">
                      ฿{item.subtotal}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Details */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">
              Pricing
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Subtotal:
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  ฿{order.pricing.subtotal}
                </span>
              </div>
              {order.pricing.pointsUsed > 0 && (
                <div className="flex justify-between text-red-600 dark:text-red-400">
                  <span>Points Used ({order.pricing.pointsUsed}):</span>
                  <span>-฿{order.pricing.pointsUsedValue}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between text-lg font-bold">
                <span className="text-gray-900 dark:text-white">Total:</span>
                <span className="text-green-600 dark:text-green-400">
                  ฿{order.pricing.total}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment: {order.payment.method.toUpperCase()}
            </h3>

            {order.payment.method === "crypto" &&
              order.payment.cryptoDetails && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-300">
                        Currency:
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {order.payment.cryptoDetails.currency}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-300">
                        Amount:
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {order.payment.cryptoDetails.amountInCrypto}{" "}
                        {order.payment.cryptoDetails.currency}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-300">
                        Network:
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {order.payment.cryptoDetails.network}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-300">
                        Payment ID:
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white text-xs">
                        {order.payment.cryptoDetails.paymentId}
                      </p>
                    </div>
                  </div>

                  {order.payment.cryptoDetails.paymentUrl && (
                    <a
                      href={order.payment.cryptoDetails.paymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      🔗 View Payment on Provider
                    </a>
                  )}

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white">
                      Transaction Hash (Required):
                    </label>
                    <input
                      type="text"
                      placeholder="Enter blockchain transaction hash for verification"
                      value={cryptoTxHash}
                      onChange={(e) => setCryptoTxHash(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Verify payment on blockchain and enter transaction hash
                    </p>
                  </div>
                </div>
              )}
          </div>

          {/* Cashier Name */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white">
              Cashier Name:
            </label>
            <input
              type="text"
              placeholder="Your name"
              value={cashierName}
              onChange={(e) => setCashierName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          {/* Reject Section */}
          {showRejectInput && (
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white">
                Rejection Reason:
              </label>
              <textarea
                placeholder="Why are you rejecting this order?"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t">
            {!showRejectInput ? (
              <>
                <button
                  onClick={handleConfirm}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-lg flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Confirm Order
                </button>
                <button
                  onClick={() => setShowRejectInput(true)}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-lg flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Reject
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleReject}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-lg"
                >
                  Confirm Rejection
                </button>
                <button
                  onClick={() => setShowRejectInput(false)}
                  className="px-6 py-3 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 font-bold text-lg"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function playNotificationSound() {
  try {
    const audio = new Audio("/notification.mp3");
    audio.play().catch((e) => console.log("Audio play failed:", e));
  } catch (error) {
    console.log("Could not play notification sound:", error);
  }
}
