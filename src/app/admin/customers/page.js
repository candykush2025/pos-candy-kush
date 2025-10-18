"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  UserCircle,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  ShoppingBag,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { dbService } from "@/lib/db/dbService";
import { formatCurrency } from "@/lib/utils/format";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    customerCode: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    countryCode: "",
    note: "",
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [searchQuery, customers]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await dbService.getCustomers();
      console.log("📊 Loaded customers from database:", data);
      console.log("📊 Number of customers:", data.length);
      setCustomers(data);
      setFilteredCustomers(data);
    } catch (error) {
      console.error("Error loading customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    if (!searchQuery) {
      setFilteredCustomers(customers);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = customers.filter(
      (customer) =>
        customer.name?.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query) ||
        customer.phone?.includes(query) ||
        customer.customerCode?.toLowerCase().includes(query)
    );
    setFilteredCustomers(filtered);
  };

  const handleAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: "",
      customerCode: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      province: "",
      postalCode: "",
      countryCode: "",
      note: "",
    });
    setIsModalOpen(true);
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || "",
      customerCode: customer.customerCode || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      city: customer.city || "",
      province: customer.province || "",
      postalCode: customer.postalCode || "",
      countryCode: customer.countryCode || "",
      note: customer.note || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (customer) => {
    if (!confirm(`Delete customer "${customer.name}"?`)) return;

    try {
      await dbService.deleteCustomer(customer.id);
      toast.success("Customer deleted successfully");
      loadCustomers();
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast.error("Failed to delete customer");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    try {
      const customerData = {
        name: formData.name.trim(),
        customerCode:
          formData.customerCode || `CUST-${Date.now().toString().slice(-8)}`,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        province: formData.province.trim(),
        postalCode: formData.postalCode.trim(),
        countryCode: formData.countryCode.trim(),
        note: formData.note.trim(),
        updatedAt: new Date().toISOString(),
      };

      if (editingCustomer) {
        // Update existing
        await dbService.updateCustomer(editingCustomer.id, customerData);
        toast.success("Customer updated successfully");
      } else {
        // Create new - follow Loyverse format
        customerData.id = `cust_${Date.now()}`;
        customerData.createdAt = new Date().toISOString();
        customerData.source = "local";
        // Use both naming conventions for compatibility
        customerData.visits = 0;
        customerData.totalVisits = 0;
        customerData.spent = 0;
        customerData.totalSpent = 0;
        customerData.points = 0;
        customerData.totalPoints = 0;
        customerData.firstVisit = null;
        customerData.lastVisit = null;

        await dbService.upsertCustomers([customerData]);
        toast.success("Customer created successfully");
      }

      setIsModalOpen(false);
      loadCustomers();
    } catch (error) {
      console.error("Error saving customer:", error);
      toast.error("Failed to save customer");
    }
  };

  const handleViewDetails = (customer) => {
    setSelectedCustomer(customer);
    setIsDetailModalOpen(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customer Management</h1>
          <p className="text-neutral-500 mt-2">
            Manage your store customers and track their activity
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500">Total Customers</p>
                <p className="text-2xl font-bold">{customers.length}</p>
              </div>
              <UserCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500">Synced from Loyverse</p>
                <p className="text-2xl font-bold">
                  {customers.filter((c) => c.source === "loyverse").length}
                </p>
              </div>
              <Badge variant="secondary">Loyverse</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500">Local Customers</p>
                <p className="text-2xl font-bold">
                  {customers.filter((c) => c.source === "local").length}
                </p>
              </div>
              <Badge>Local</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500">Total Spent</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    customers.reduce(
                      (sum, c) => sum + (c.totalSpent || c.spent || 0),
                      0
                    )
                  )}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search by name, email, phone, or customer code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-neutral-500">Loading customers...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCircle className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-500">
              {searchQuery ? "No customers found" : "No customers yet"}
            </p>
            {!searchQuery && (
              <Button onClick={handleAdd} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Customer
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Customers ({filteredCustomers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-3">
                      <UserCircle className="h-10 w-10 text-neutral-400" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">
                            {customer.name}
                          </h3>
                          {customer.source && (
                            <Badge
                              variant={
                                customer.source === "loyverse"
                                  ? "secondary"
                                  : "default"
                              }
                              className="text-xs"
                            >
                              {customer.source}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-neutral-500">
                          {customer.customerCode}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-neutral-600 ml-13">
                      {customer.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {customer.email}
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {customer.phone}
                        </div>
                      )}
                      {(customer.city || customer.province) && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {[customer.city, customer.province]
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-4 text-sm ml-13">
                      <div className="flex items-center gap-1 text-neutral-600">
                        <ShoppingBag className="h-4 w-4" />
                        <span>
                          {customer.totalVisits || customer.visits || 0} visits
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-green-600">
                        <DollarSign className="h-4 w-4" />
                        <span>
                          {formatCurrency(
                            customer.totalSpent || customer.spent || 0
                          )}{" "}
                          spent
                        </span>
                      </div>
                      {(customer.totalPoints || customer.points || 0) > 0 && (
                        <div className="flex items-center gap-1 text-purple-600">
                          <Award className="h-4 w-4" />
                          <span>
                            {customer.totalPoints || customer.points} points
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(customer)}
                    >
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(customer)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(customer)}
                      disabled={customer.source === "loyverse"}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Customer Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Edit Customer" : "Add New Customer"}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer
                ? "Update customer information"
                : "Create a new customer record"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Customer Name *
                </label>
                <Input
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Customer Code
                </label>
                <Input
                  placeholder="Auto-generated"
                  value={formData.customerCode}
                  onChange={(e) =>
                    setFormData({ ...formData, customerCode: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  type="email"
                  placeholder="customer@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Phone</label>
                <Input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Address
                </label>
                <Input
                  placeholder="123 Main Street"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">City</label>
                <Input
                  placeholder="New York"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  State/Province
                </label>
                <Input
                  placeholder="NY"
                  value={formData.province}
                  onChange={(e) =>
                    setFormData({ ...formData, province: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Postal Code
                </label>
                <Input
                  placeholder="10001"
                  value={formData.postalCode}
                  onChange={(e) =>
                    setFormData({ ...formData, postalCode: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Country Code
                </label>
                <Input
                  placeholder="US"
                  value={formData.countryCode}
                  onChange={(e) =>
                    setFormData({ ...formData, countryCode: e.target.value })
                  }
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                  placeholder="Additional notes about this customer..."
                  value={formData.note}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                {editingCustomer ? "Update Customer" : "Create Customer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="flex items-start gap-4">
                <UserCircle className="h-16 w-16 text-neutral-400" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-2xl font-bold">
                      {selectedCustomer.name}
                    </h2>
                    {selectedCustomer.source && (
                      <Badge
                        variant={
                          selectedCustomer.source === "loyverse"
                            ? "secondary"
                            : "default"
                        }
                      >
                        {selectedCustomer.source}
                      </Badge>
                    )}
                  </div>
                  <p className="text-neutral-500">
                    {selectedCustomer.customerCode}
                  </p>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="font-semibold mb-3">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-neutral-500">Email</p>
                    <p className="font-medium">
                      {selectedCustomer.email || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Phone</p>
                    <p className="font-medium">
                      {selectedCustomer.phone || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Address */}
              {(selectedCustomer.address ||
                selectedCustomer.city ||
                selectedCustomer.province) && (
                <div>
                  <h3 className="font-semibold mb-3">Address</h3>
                  <div className="text-sm space-y-1">
                    {selectedCustomer.address && (
                      <p>{selectedCustomer.address}</p>
                    )}
                    <p>
                      {[
                        selectedCustomer.city,
                        selectedCustomer.province,
                        selectedCustomer.postalCode,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    {(selectedCustomer.countryCode ||
                      selectedCustomer.country) && (
                      <p>
                        {selectedCustomer.countryCode ||
                          selectedCustomer.country}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Statistics */}
              <div>
                <h3 className="font-semibold mb-3">Statistics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <ShoppingBag className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold">
                        {selectedCustomer.totalVisits ||
                          selectedCustomer.visits ||
                          0}
                      </p>
                      <p className="text-sm text-neutral-500">Total Visits</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold">
                        {formatCurrency(
                          selectedCustomer.totalSpent ||
                            selectedCustomer.spent ||
                            0
                        )}
                      </p>
                      <p className="text-sm text-neutral-500">Total Spent</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Award className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold">
                        {selectedCustomer.totalPoints ||
                          selectedCustomer.points ||
                          0}
                      </p>
                      <p className="text-sm text-neutral-500">Loyalty Points</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Visit History */}
              {(selectedCustomer.firstVisit || selectedCustomer.lastVisit) && (
                <div>
                  <h3 className="font-semibold mb-3">Visit History</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-neutral-500">First Visit</p>
                      <p className="font-medium">
                        {formatDate(selectedCustomer.firstVisit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Last Visit</p>
                      <p className="font-medium">
                        {formatDate(selectedCustomer.lastVisit)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedCustomer.note && (
                <div>
                  <h3 className="font-semibold mb-3">Notes</h3>
                  <p className="text-sm text-neutral-600">
                    {selectedCustomer.note}
                  </p>
                </div>
              )}

              {/* Timestamps */}
              <div>
                <h3 className="font-semibold mb-3">Record Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-neutral-500">Created</p>
                    <p className="font-medium">
                      {formatDate(selectedCustomer.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Last Updated</p>
                    <p className="font-medium">
                      {formatDate(selectedCustomer.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleEdit(selectedCustomer);
                  }}
                  className="flex-1"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Customer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

