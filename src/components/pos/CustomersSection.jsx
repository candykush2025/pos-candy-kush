"use client";

import { useState, useEffect } from "react";
import { customersService, ordersService } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Mail,
  Phone,
  MapPin,
  User,
  ShoppingBag,
  Calendar,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils/format";

// Customer Card Component
function CustomerCard({
  customer,
  onEdit,
  onDelete,
  onViewPurchases,
  onRedeemPoints,
}) {
  const formatDate = (date) => {
    if (!date) return "Never";
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString();
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{customer.name}</CardTitle>
              <p className="text-sm text-gray-500">
                Code: {customer.customerCode}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onEdit(customer)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(customer)}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Contact Info */}
        {customer.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-gray-400" />
            <span>{customer.email}</span>
          </div>
        )}
        {customer.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-gray-400" />
            <span>{customer.phone}</span>
          </div>
        )}
        {customer.address && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span>{customer.address}</span>
          </div>
        )}

        <Separator className="my-2" />

        {/* Points, Visits, Last Visit */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 bg-green-50 rounded">
            <p className="text-xs text-gray-600">Points</p>
            <p className="text-lg font-bold text-green-600">
              {customer.points || 0}
            </p>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded">
            <p className="text-xs text-gray-600">Visits</p>
            <p className="text-lg font-bold text-blue-600">
              {customer.visits || 0}
            </p>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded">
            <p className="text-xs text-gray-600">Last Visit</p>
            <p className="text-xs font-medium text-purple-600">
              {formatDate(customer.lastVisit)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onViewPurchases(customer)}
          >
            View Purchases
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onRedeemPoints(customer)}
            disabled={!customer.points || customer.points === 0}
          >
            Redeem Points
          </Button>
        </div>

        {customer.note && (
          <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
            <p className="text-gray-600">{customer.note}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Customer Form Modal Component
function CustomerFormModal({ isOpen, onClose, customer, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    customerCode: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    country: "",
    note: "",
    points: 0,
    visits: 0,
    lastVisit: null,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || "",
        customerCode: customer.customerCode || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        city: customer.city || "",
        province: customer.province || "",
        postalCode: customer.postalCode || "",
        country: customer.country || "",
        note: customer.note || "",
        points: customer.points || 0,
        visits: customer.visits || 0,
        lastVisit: customer.lastVisit || null,
      });
    } else {
      // Generate customer code for new customer
      setFormData({
        name: "",
        customerCode: `CUST-${Date.now().toString().slice(-6)}`,
        email: "",
        phone: "",
        address: "",
        city: "",
        province: "",
        postalCode: "",
        country: "",
        note: "",
        points: 0,
        visits: 0,
        lastVisit: null,
      });
    }
  }, [customer, isOpen]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    if (!formData.customerCode.trim()) {
      toast.error("Customer code is required");
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error("Error saving customer:", error);
      toast.error("Failed to save customer");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {customer ? "Edit Customer" : "Add New Customer"}
          </DialogTitle>
          <DialogDescription>
            Fill in the customer information. Name and Customer Code are
            required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Name - Required */}
            <div className="col-span-2">
              <label className="text-sm font-medium">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Enter customer name"
                required
              />
            </div>

            {/* Customer Code - Required */}
            <div className="col-span-2">
              <label className="text-sm font-medium">
                Customer Code <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.customerCode}
                onChange={(e) => handleChange("customerCode", e.target.value)}
                placeholder="Auto-generated or enter custom code"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Unique identifier for this customer
              </p>
            </div>

            {/* Email - Optional */}
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="customer@example.com"
              />
            </div>

            {/* Phone - Optional */}
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            {/* Address - Optional */}
            <div className="col-span-2">
              <label className="text-sm font-medium">Address</label>
              <Input
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="Street address"
              />
            </div>

            {/* City - Optional */}
            <div>
              <label className="text-sm font-medium">City</label>
              <Input
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="City"
              />
            </div>

            {/* Province - Optional */}
            <div>
              <label className="text-sm font-medium">Province/State</label>
              <Input
                value={formData.province}
                onChange={(e) => handleChange("province", e.target.value)}
                placeholder="Province or State"
              />
            </div>

            {/* Postal Code - Optional */}
            <div>
              <label className="text-sm font-medium">Postal Code</label>
              <Input
                value={formData.postalCode}
                onChange={(e) => handleChange("postalCode", e.target.value)}
                placeholder="A1B 2C3"
              />
            </div>

            {/* Country - Optional */}
            <div>
              <label className="text-sm font-medium">Country</label>
              <Input
                value={formData.country}
                onChange={(e) => handleChange("country", e.target.value)}
                placeholder="Canada"
              />
            </div>

            {/* Note - Optional */}
            <div className="col-span-2">
              <label className="text-sm font-medium">Note</label>
              <textarea
                className="w-full min-h-[80px] px-3 py-2 border rounded-md"
                value={formData.note}
                onChange={(e) => handleChange("note", e.target.value)}
                placeholder="Additional notes about this customer..."
              />
            </div>
          </div>

          <Separator />

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : customer ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Purchase History Modal Component
function PurchaseHistoryModal({ isOpen, onClose, customer }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && customer) {
      loadPurchaseHistory();
    }
  }, [isOpen, customer]);

  const loadPurchaseHistory = async () => {
    try {
      setLoading(true);

      // Get all orders for this customer
      const allOrders = await ordersService.getAll({
        where: ["customerId", "==", customer.id],
      });

      // Sort by createdAt descending on client side
      const customerOrders = allOrders.sort((a, b) => {
        const dateA = a.createdAt?.toDate
          ? a.createdAt.toDate()
          : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate
          ? b.createdAt.toDate()
          : new Date(b.createdAt || 0);
        return dateB - dateA;
      });

      setOrders(customerOrders);
    } catch (error) {
      console.error("Error loading purchase history:", error);
      toast.error("Failed to load purchase history");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getTotalSpent = () => {
    return orders.reduce((sum, order) => sum + (order.total || 0), 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Purchase History - {customer?.name}
          </DialogTitle>
          <DialogDescription>
            View all orders and purchases for this customer
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500">Loading purchase history...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No purchases yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-primary">
                  {orders.length}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(getTotalSpent())}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Avg. Order</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(getTotalSpent() / orders.length)}
                </p>
              </div>
            </div>

            <Separator />

            {/* Orders List */}
            <div className="space-y-3">
              <h3 className="font-semibold">Order History</h3>
              {orders.map((order) => (
                <Card key={order.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium">
                        Order #{order.orderNumber || order.id?.slice(0, 8)}
                      </p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {order.createdAt
                          ? formatDate(order.createdAt.toDate(), "datetime")
                          : "N/A"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(order.total)}
                      </p>
                      <Badge
                        className={
                          order.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {order.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Order Items */}
                  {order.items && order.items.length > 0 && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {item.quantity}x {item.name}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(
                              item.total || item.price * item.quantity
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Payment Method */}
                  <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      Payment: {order.paymentMethod || "Cash"}
                    </span>
                    <span className="text-gray-600">
                      {order.paymentStatus === "paid" && (
                        <Badge className="bg-green-100 text-green-800">
                          Paid
                        </Badge>
                      )}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Main Customers Section
export default function CustomersSection() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPurchaseHistory, setShowPurchaseHistory] = useState(false);
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] =
    useState(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCustomers(customers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = customers.filter(
        (c) =>
          c.name?.toLowerCase().includes(query) ||
          c.customerCode?.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.phone?.includes(query)
      );
      setFilteredCustomers(filtered);
    }
  }, [searchQuery, customers]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await customersService.getAll({
        orderBy: { field: "name", direction: "asc" },
      });
      setCustomers(data);
      setFilteredCustomers(data);
    } catch (error) {
      console.error("Error loading customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (formData) => {
    try {
      if (editingCustomer) {
        // Update existing customer
        await customersService.update(editingCustomer.id, formData);
        toast.success("Customer updated successfully");
      } else {
        // Create new customer
        await customersService.create(formData);
        toast.success("Customer created successfully");
      }
      loadCustomers();
    } catch (error) {
      console.error("Error saving customer:", error);
      throw error;
    }
  };

  const handleDeleteCustomer = async (customer) => {
    if (
      !confirm(
        `Are you sure you want to delete ${customer.name}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await customersService.delete(customer.id);
      toast.success("Customer deleted successfully");
      loadCustomers();
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast.error("Failed to delete customer");
    }
  };

  const handleViewPurchases = (customer) => {
    setSelectedCustomerForHistory(customer);
    setShowPurchaseHistory(true);
  };

  const handleRedeemPoints = async (customer) => {
    if (!customer.points || customer.points === 0) {
      toast.error("No points available to redeem");
      return;
    }

    const points = prompt(
      `${customer.name} has ${customer.points} points. How many points to redeem?`,
      customer.points.toString()
    );

    if (!points || isNaN(points) || parseInt(points) <= 0) {
      return;
    }

    const redeemAmount = parseInt(points);
    if (redeemAmount > customer.points) {
      toast.error("Cannot redeem more points than available");
      return;
    }

    try {
      const newPoints = customer.points - redeemAmount;
      await customersService.update(customer.id, {
        ...customer,
        points: newPoints,
      });
      toast.success(
        `Redeemed ${redeemAmount} points. New balance: ${newPoints}`
      );
      loadCustomers();
    } catch (error) {
      console.error("Error redeeming points:", error);
      toast.error("Failed to redeem points");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              Customers
            </h1>
            <p className="text-gray-500 mt-1">Manage your customer database</p>
          </div>
          <Button onClick={handleAddCustomer}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>

        {/* Search Bar */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search by name, code, email, or phone..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 flex gap-4">
          <Badge variant="secondary" className="text-base px-4 py-2">
            {customers.length} Total Customers
          </Badge>
          {searchQuery && (
            <Badge variant="outline" className="text-base px-4 py-2">
              {filteredCustomers.length} Results
            </Badge>
          )}
        </div>
      </div>

      {/* Customers Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading customers...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No customers found</h3>
          <p className="text-gray-500 mb-6">
            {searchQuery
              ? "Try adjusting your search query"
              : "Get started by adding your first customer"}
          </p>
          {!searchQuery && (
            <Button onClick={handleAddCustomer}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Customer
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onEdit={handleEditCustomer}
              onDelete={handleDeleteCustomer}
              onViewPurchases={handleViewPurchases}
              onRedeemPoints={handleRedeemPoints}
            />
          ))}
        </div>
      )}

      {/* Customer Form Modal */}
      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customer={editingCustomer}
        onSave={handleSaveCustomer}
      />

      {/* Purchase History Modal */}
      <PurchaseHistoryModal
        isOpen={showPurchaseHistory}
        onClose={() => {
          setShowPurchaseHistory(false);
          setSelectedCustomerForHistory(null);
        }}
        customer={selectedCustomerForHistory}
      />
    </div>
  );
}
