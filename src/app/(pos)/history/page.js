"use client";

import { useState, useEffect } from "react";
import { ordersService } from "@/lib/firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  History,
  Search,
  Eye,
  Calendar,
  DollarSign,
  CreditCard,
  Banknote,
  Receipt,
  Filter,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { toast } from "sonner";

// Order Card Component
function OrderCard({ order, onView }) {
  const paymentIcon =
    order.paymentMethod === "cash" ? (
      <Banknote className="h-4 w-4" />
    ) : (
      <CreditCard className="h-4 w-4" />
    );
  const statusColor =
    order.status === "completed"
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";

  return (
    <Card
      className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onView(order)}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="h-5 w-5 text-gray-500" />
            <h3 className="font-bold text-lg">{order.orderNumber}</h3>
          </div>
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDateTime(order.createdAt)}
          </p>
        </div>
        <Badge className={statusColor}>{order.status}</Badge>
      </div>

      <Separator className="my-3" />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 flex items-center gap-1">
            {paymentIcon}
            {order.paymentMethod === "cash" ? "Cash" : "Card"}
          </span>
          <span className="font-bold text-lg">
            {formatCurrency(order.total)}
          </span>
        </div>

        {order.paymentMethod === "cash" && order.change > 0 && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>Change Given:</span>
            <span className="text-green-600">
              {formatCurrency(order.change)}
            </span>
          </div>
        )}

        <div className="flex justify-between text-sm text-gray-600">
          <span>Items:</span>
          <span>{order.items?.length || 0}</span>
        </div>
      </div>
    </Card>
  );
}

// Order Details Modal Component
function OrderDetailsModal({ order, open, onClose }) {
  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
          <DialogDescription>{order.orderNumber}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Date & Time
              </div>
              <div className="font-medium">
                {formatDateTime(order.createdAt)}
              </div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Status
              </div>
              <Badge className="mt-1">{order.status}</Badge>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              {order.paymentMethod === "cash" ? (
                <Banknote className="h-5 w-5" />
              ) : (
                <CreditCard className="h-5 w-5" />
              )}
              Payment Information
            </h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Method:</span>
                <span className="font-medium capitalize">
                  {order.paymentMethod}
                </span>
              </div>
              {order.paymentMethod === "cash" && (
                <>
                  <div className="flex justify-between">
                    <span>Cash Received:</span>
                    <span className="font-medium">
                      {formatCurrency(order.cashReceived || order.total)}
                    </span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Change Given:</span>
                    <span className="font-medium">
                      {formatCurrency(order.change || 0)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Items */}
          <div>
            <h4 className="font-semibold mb-2">
              Items ({order.items?.length || 0})
            </h4>
            <div className="space-y-2">
              {order.items?.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded"
                >
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-600">
                      {formatCurrency(item.price)} × {item.quantity}
                    </div>
                  </div>
                  <div className="font-bold">{formatCurrency(item.total)}</div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount:</span>
                <span className="text-red-600">
                  -{formatCurrency(order.discount)}
                </span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Close
          </Button>
          <Button
            className="flex-1"
            onClick={() => toast.info("Print receipt coming soon")}
          >
            <Receipt className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Filter Component
function FilterBar({ filter, onFilterChange }) {
  return (
    <div className="flex gap-2 mb-4">
      <Button
        variant={filter === "all" ? "default" : "outline"}
        size="sm"
        onClick={() => onFilterChange("all")}
      >
        All
      </Button>
      <Button
        variant={filter === "today" ? "default" : "outline"}
        size="sm"
        onClick={() => onFilterChange("today")}
      >
        Today
      </Button>
      <Button
        variant={filter === "week" ? "default" : "outline"}
        size="sm"
        onClick={() => onFilterChange("week")}
      >
        This Week
      </Button>
      <Button
        variant={filter === "month" ? "default" : "outline"}
        size="sm"
        onClick={() => onFilterChange("month")}
      >
        This Month
      </Button>
    </div>
  );
}

// Main History Page Component
export default function HistoryPage() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [orders, searchQuery, filter]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const data = await ordersService.getAll({
        orderBy: { field: "createdAt", direction: "desc" },
      });
      setOrders(data);
    } catch (error) {
      console.error("Error loading orders:", error);
      toast.error("Failed to load order history");
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];

    // Apply date filter
    if (filter !== "all") {
      const now = new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      if (filter === "today") {
        filtered = filtered.filter((order) => {
          const orderDate = order.createdAt?.toDate
            ? order.createdAt.toDate()
            : new Date(order.createdAt);
          return orderDate >= startOfDay;
        });
      } else if (filter === "week") {
        const startOfWeek = new Date(startOfDay);
        startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
        filtered = filtered.filter((order) => {
          const orderDate = order.createdAt?.toDate
            ? order.createdAt.toDate()
            : new Date(order.createdAt);
          return orderDate >= startOfWeek;
        });
      } else if (filter === "month") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        filtered = filtered.filter((order) => {
          const orderDate = order.createdAt?.toDate
            ? order.createdAt.toDate()
            : new Date(order.createdAt);
          return orderDate >= startOfMonth;
        });
      }
    }

    // Apply search filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.orderNumber?.toLowerCase().includes(query) ||
          order.paymentMethod?.toLowerCase().includes(query) ||
          order.items?.some((item) => item.name.toLowerCase().includes(query))
      );
    }

    setFilteredOrders(filtered);
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const totalRevenue = filteredOrders.reduce(
    (sum, order) => sum + (order.total || 0),
    0
  );
  const cashOrders = filteredOrders.filter((o) => o.paymentMethod === "cash");
  const cardOrders = filteredOrders.filter((o) => o.paymentMethod === "card");

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <History className="h-8 w-8" />
              Payment History
            </h1>
            <p className="text-gray-600 mt-1">
              View all past transactions and orders
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <Card className="p-4">
            <div className="text-sm text-gray-600 mb-1">Total Orders</div>
            <div className="text-2xl font-bold">{filteredOrders.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600 mb-1">Total Revenue</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalRevenue)}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600 mb-1 flex items-center gap-1">
              <Banknote className="h-4 w-4" /> Cash
            </div>
            <div className="text-2xl font-bold">{cashOrders.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600 mb-1 flex items-center gap-1">
              <CreditCard className="h-4 w-4" /> Card
            </div>
            <div className="text-2xl font-bold">{cardOrders.length}</div>
          </Card>
        </div>

        {/* Filters */}
        <FilterBar filter={filter} onFilterChange={setFilter} />

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search by order number, payment method, or items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="p-12 text-center">
          <History className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            {searchQuery || filter !== "all"
              ? "No orders found"
              : "No orders yet"}
          </h3>
          <p className="text-gray-600">
            {searchQuery || filter !== "all"
              ? "Try adjusting your filters or search query"
              : "Orders will appear here once you complete transactions"}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} onView={handleViewOrder} />
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        open={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
      />
    </div>
  );
}
