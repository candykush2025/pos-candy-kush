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
  AlertCircle,
  CheckCircle,
  Upload,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { dbService } from "@/lib/db/dbService";
import { formatCurrency } from "@/lib/utils/format";
import { customersService } from "@/lib/firebase/firestore";
import { customerApprovalService } from "@/lib/firebase/customerApprovalService";

export default function CashierCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [syncingCustomers, setSyncingCustomers] = useState({});

  const [formData, setFormData] = useState({
    // Required
    name: "",
    // Personal Information
    lastName: "",
    nickname: "",
    nationality: "",
    dateOfBirth: "",
    // Contact Information
    email: "",
    cell: "",
    // Member Information
    memberId: "",
    customPoints: 0,
    isNoMember: false,
    isActive: true,
    // Kiosk Permissions
    allowedCategories: [],
    // Expiry Date
    expiryDate: "",
  });

  useEffect(() => {
    loadCustomers();
    loadCategoriesFromKiosk();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [searchQuery, customers]);

  const loadCategoriesFromKiosk = async () => {
    try {
      setLoadingCategories(true);
      // Fetch categories from kiosk API (external kiosk system)
      const kioskUrl =
        "https://candy-kush-kiosk.vercel.app/api/categories?active=true";
      const response = await fetch(kioskUrl);

      if (!response.ok) {
        throw new Error("Failed to fetch categories from kiosk");
      }

      const result = await response.json();

      if (result.success && result.data) {
        console.log("📂 Loaded categories from kiosk API:", result.data);
        setCategories(result.data);
      } else {
        console.warn("No categories returned from kiosk API");
        setCategories([]);
      }
    } catch (error) {
      console.error("Error loading categories from kiosk:", error);
      toast.error(
        "Failed to load categories from kiosk. Category selection may be limited."
      );
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadCustomers = async () => {
    try {
      setLoading(true);

      // Try loading from Firebase first (if online)
      try {
        const firebaseData = await customersService.getAll({
          orderBy: ["name", "asc"],
        });

        if (firebaseData && firebaseData.length > 0) {
          console.log(
            "📊 Loaded customers from Firebase:",
            firebaseData.length
          );
          setCustomers(firebaseData);
          setFilteredCustomers(firebaseData);

          // Also update IndexedDB for offline access
          await dbService.upsertCustomers(firebaseData);
          return;
        }
      } catch (firebaseError) {
        console.warn(
          "Failed to load from Firebase, trying IndexedDB:",
          firebaseError
        );
      }

      // Fallback to IndexedDB (offline mode or Firebase failed)
      const indexedDBData = await dbService.getCustomers();
      console.log("📊 Loaded customers from IndexedDB:", indexedDBData.length);
      setCustomers(indexedDBData);
      setFilteredCustomers(indexedDBData);

      if (indexedDBData.length === 0) {
        console.log("⚠️ No customers found in IndexedDB or Firebase");
      }
    } catch (error) {
      console.error("Error loading customers:", error);
      toast.error("Failed to load customers");
      setCustomers([]);
      setFilteredCustomers([]);
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
      lastName: "",
      nickname: "",
      nationality: "",
      dateOfBirth: "",
      email: "",
      cell: "",
      memberId: "",
      customPoints: 0,
      isNoMember: false,
      isActive: true,
      allowedCategories: [],
      expiryDate: "",
    });
    setIsModalOpen(true);
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || "",
      lastName: customer.lastName || "",
      nickname: customer.nickname || "",
      nationality: customer.nationality || "",
      dateOfBirth: customer.dateOfBirth || "",
      email: customer.email || "",
      cell: customer.cell || customer.phone || "",
      memberId: customer.memberId || "",
      customPoints: customer.customPoints || 0,
      isNoMember: customer.isNoMember || false,
      isActive: customer.isActive !== false,
      allowedCategories: customer.allowedCategories || [],
      expiryDate: customer.expiryDate || "",
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

  const handleSyncToKiosk = async (customer) => {
    setSyncingCustomers({ ...syncingCustomers, [customer.id]: true });

    try {
      // Prepare customer data for kiosk API
      const kioskCustomerData = {
        customerId: customer.customerId,
        memberId: customer.memberId || customer.customerId,
        name: customer.name,
        lastName: customer.lastName || "",
        nickname: customer.nickname || "",
        nationality: customer.nationality || "",
        dateOfBirth: customer.dateOfBirth || "",
        email: customer.email || "",
        cell: customer.cell || customer.phone || "",
        isNoMember: customer.isNoMember || false,
        isActive: customer.isActive !== false,
        customPoints: customer.customPoints || 0,
        allowedCategories: customer.allowedCategories || [],
      };

      // Send to kiosk API
      const kioskUrl = "https://candy-kush-kiosk.vercel.app/api/customers";
      const response = await fetch(kioskUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(kioskCustomerData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to sync to kiosk");
      }

      // Update local customer with syncedToKiosk flag
      await dbService.updateCustomer(customer.id, {
        syncedToKiosk: true,
        lastSyncedAt: new Date().toISOString(),
      });

      toast.success(`✅ ${customer.name} synced to kiosk successfully!`);
      loadCustomers(); // Refresh the list
    } catch (error) {
      console.error("Error syncing to kiosk:", error);
      toast.error(`Failed to sync to kiosk: ${error.message}`);
    } finally {
      setSyncingCustomers({ ...syncingCustomers, [customer.id]: false });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    try {
      // Generate customerId for new customers
      let customerId = editingCustomer?.customerId;
      if (!customerId) {
        const customerCount = customers.length + 1;
        customerId = `CK-${customerCount.toString().padStart(4, "0")}`;
      }

      const customerData = {
        // Customer Identification
        customerId: customerId,
        memberId: formData.memberId || customerId,

        // Personal Information (required)
        name: formData.name.trim(),
        lastName: formData.lastName.trim(),
        nickname: formData.nickname.trim(),
        nationality: formData.nationality.trim(),
        dateOfBirth: formData.dateOfBirth,

        // Contact Information
        email: formData.email.trim(),
        cell: formData.cell.trim(),

        // Member Status & Points
        isNoMember: formData.isNoMember,
        isActive: formData.isActive,
        customPoints: Number(formData.customPoints) || 0,
        points: editingCustomer?.points || [],
        visitCount: editingCustomer?.visitCount || 0,
        totalSpent: editingCustomer?.totalSpent || 0,

        // Kiosk Permissions
        allowedCategories: formData.allowedCategories,

        // Sync status
        syncedToKiosk: false, // Will be true when synced to kiosk
        source: editingCustomer?.source || "cashier",

        // Timestamps
        createdAt: editingCustomer?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingCustomer) {
        await dbService.updateCustomer(editingCustomer.id, customerData);
        toast.success("Customer updated successfully");
      } else {
        await dbService.addCustomer(customerData);

        // Automatically sync new customer to kiosk
        toast.success("Customer created successfully. Syncing to kiosk...");

        try {
          // Prepare customer data for kiosk API
          const kioskCustomerData = {
            customerId: customerData.customerId,
            memberId: customerData.memberId || customerData.customerId,
            name: customerData.name,
            lastName: customerData.lastName || "",
            nickname: customerData.nickname || "",
            nationality: customerData.nationality || "",
            dateOfBirth: customerData.dateOfBirth || "",
            email: customerData.email || "",
            cell: customerData.cell || "",
            isNoMember: customerData.isNoMember || false,
            isActive: customerData.isActive !== false,
            customPoints: customerData.customPoints || 0,
            allowedCategories: customerData.allowedCategories || [],
          };

          // Send to kiosk API
          const kioskUrl = "https://candy-kush-kiosk.vercel.app/api/customers";
          const response = await fetch(kioskUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(kioskCustomerData),
          });

          const result = await response.json();

          if (response.ok && result.success) {
            // Update customer with syncedToKiosk flag
            await dbService.updateCustomer(customerData.id, {
              syncedToKiosk: true,
              lastSyncedAt: new Date().toISOString(),
            });
            toast.success("✅ Customer synced to kiosk successfully!");
          } else {
            console.warn("Kiosk sync failed:", result.message);
            toast.warning(
              "Customer created but kiosk sync failed. You can sync manually later."
            );
          }
        } catch (kioskError) {
          console.error("Error syncing to kiosk:", kioskError);
          toast.warning(
            "Customer created but kiosk sync failed. You can sync manually later."
          );
        }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Customer Management</h1>
          <p className="text-neutral-500">
            Manage your customer database and sync with kiosk
          </p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-5 w-5" />
            <Input
              placeholder="Search customers by name, email, phone, or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      {filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserCircle className="h-16 w-16 text-neutral-300 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Customers Found</h3>
            <p className="text-neutral-500 mb-4">
              {searchQuery
                ? "Try adjusting your search"
                : "Get started by adding your first customer"}
            </p>
            {!searchQuery && (
              <Button onClick={handleAdd} className="gap-2">
                <Plus className="h-4 w-4" />
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
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
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
                          {customer.syncedToKiosk ? (
                            <Badge
                              variant="outline"
                              className="text-xs bg-green-50 dark:bg-green-950 border-green-500 text-green-700 dark:text-green-400"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Synced to Kiosk
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs bg-yellow-50 dark:bg-yellow-950 border-yellow-500 text-yellow-700 dark:text-yellow-400"
                            >
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Not Synced
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-neutral-500">
                          {customer.customerCode || customer.customerId}
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
                      {(customer.cell || customer.phone) && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {customer.cell || customer.phone}
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
                          {customer.totalVisits || customer.visitCount || 0}{" "}
                          visits
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
                      {(customer.totalPoints ||
                        customer.customPoints ||
                        customer.points ||
                        0) > 0 && (
                        <div className="flex items-center gap-1 text-purple-600">
                          <Award className="h-4 w-4" />
                          <span>
                            {customer.totalPoints ||
                              customer.customPoints ||
                              customer.points}{" "}
                            points
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    {!customer.syncedToKiosk && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleSyncToKiosk(customer)}
                        disabled={syncingCustomers[customer.id]}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {syncingCustomers[customer.id] ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Syncing...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-1" />
                            Sync to Kiosk
                          </>
                        )}
                      </Button>
                    )}
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
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">
                Personal Information
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    First Name *
                  </label>
                  <Input
                    placeholder="John"
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
                    Last Name
                  </label>
                  <Input
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nickname
                  </label>
                  <Input
                    placeholder="Johnny"
                    value={formData.nickname}
                    onChange={(e) =>
                      setFormData({ ...formData, nickname: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nationality
                  </label>
                  <Input
                    placeholder="Thai"
                    value={formData.nationality}
                    onChange={(e) =>
                      setFormData({ ...formData, nationality: e.target.value })
                    }
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Date of Birth
                  </label>
                  <Input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      setFormData({ ...formData, dateOfBirth: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">
                Contact Information
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Phone Number
                  </label>
                  <Input
                    type="tel"
                    placeholder="+66812345678"
                    value={formData.cell}
                    onChange={(e) =>
                      setFormData({ ...formData, cell: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Member Information Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">
                Member Information
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Member ID
                  </label>
                  <Input
                    placeholder="Auto-generated from customer ID"
                    value={formData.memberId}
                    onChange={(e) =>
                      setFormData({ ...formData, memberId: e.target.value })
                    }
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Leave empty to auto-generate
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Initial Points
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.customPoints}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        customPoints: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isNoMember}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isNoMember: e.target.checked,
                        })
                      }
                      className="rounded border-neutral-300 dark:border-neutral-600"
                    />
                    <span className="text-sm font-medium">
                      Non-Member Account
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isActive: e.target.checked,
                        })
                      }
                      className="rounded border-neutral-300 dark:border-neutral-600"
                    />
                    <span className="text-sm font-medium">Active Account</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Expiry Date Section - Requires Admin Approval */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">
                Membership Expiry
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Expiry Date{" "}
                    {formData.expiryDate && (
                      <Badge
                        variant={
                          customerApprovalService.isCustomerExpired(
                            formData.expiryDate
                          )
                            ? "destructive"
                            : customerApprovalService.isExpiringSoon(
                                formData.expiryDate
                              )
                            ? "outline"
                            : "default"
                        }
                        className="ml-2"
                      >
                        {customerApprovalService.isCustomerExpired(
                          formData.expiryDate
                        )
                          ? "Expired"
                          : customerApprovalService.isExpiringSoon(
                              formData.expiryDate
                            )
                          ? "Expiring Soon"
                          : "Active"}
                      </Badge>
                    )}
                  </label>
                  <Input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) =>
                      setFormData({ ...formData, expiryDate: e.target.value })
                    }
                    placeholder="YYYY-MM-DD"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Set expiry date for customer membership
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const expiry =
                        customerApprovalService.calculateExpiryDate("10days");
                      setFormData({ ...formData, expiryDate: expiry });
                    }}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Set +10 Days
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const expiry =
                        customerApprovalService.calculateExpiryDate("6months");
                      setFormData({ ...formData, expiryDate: expiry });
                    }}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Set +6 Months
                  </Button>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                  <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Cashier expiry changes require admin approval before being
                    applied
                  </p>
                </div>
              </div>
            </div>

            {/* Kiosk Permissions Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">
                Kiosk Permissions
              </h3>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Allowed Categories
                </label>
                <p className="text-xs text-neutral-500 mb-3">
                  Leave empty to allow access to all categories. Select specific
                  categories to restrict access.
                </p>

                {/* Category checkboxes from Kiosk API */}
                <div className="border rounded-lg p-4 bg-neutral-50 dark:bg-neutral-900">
                  {loadingCategories ? (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Loading categories from kiosk...
                    </p>
                  ) : categories.length === 0 ? (
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      ⚠️ No categories available from kiosk. Customer will have
                      access to all categories.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {categories.map((category) => (
                        <label
                          key={category.id}
                          className="flex items-center gap-2 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.allowedCategories.includes(
                              category.id
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  allowedCategories: [
                                    ...formData.allowedCategories,
                                    category.id,
                                  ],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  allowedCategories:
                                    formData.allowedCategories.filter(
                                      (id) => id !== category.id
                                    ),
                                });
                              }
                            }}
                            className="rounded border-neutral-300 dark:border-neutral-600"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium">
                              {category.name}
                            </span>
                            {category.description && (
                              <p className="text-xs text-neutral-500">
                                {category.description}
                              </p>
                            )}
                          </div>
                          {category.isActive && (
                            <Badge variant="outline" className="text-xs">
                              Active
                            </Badge>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sync Status Info */}
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {editingCustomer?.syncedToKiosk ? (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">
                        Synced to Kiosk
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                      <AlertCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">
                        Not Synced to Kiosk
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    {editingCustomer?.syncedToKiosk
                      ? "This customer is synced with the kiosk system and can scan their QR code."
                      : "Customer will be synced to kiosk after saving. Use the 'Sync to Kiosk' button to enable QR code scanning."}
                  </p>
                </div>
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

      {/* Customer Details Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <UserCircle className="h-16 w-16 text-neutral-400" />
                <div>
                  <h2 className="text-2xl font-bold">
                    {selectedCustomer.name}
                  </h2>
                  <p className="text-neutral-500">
                    {selectedCustomer.customerCode ||
                      selectedCustomer.customerId}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-neutral-500">Email:</span>
                  <p className="font-medium">
                    {selectedCustomer.email || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-neutral-500">Phone:</span>
                  <p className="font-medium">
                    {selectedCustomer.cell || selectedCustomer.phone || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-neutral-500">Total Visits:</span>
                  <p className="font-medium">
                    {selectedCustomer.visitCount || 0}
                  </p>
                </div>
                <div>
                  <span className="text-neutral-500">Total Spent:</span>
                  <p className="font-medium">
                    {formatCurrency(selectedCustomer.totalSpent || 0)}
                  </p>
                </div>
                <div>
                  <span className="text-neutral-500">Points:</span>
                  <p className="font-medium">
                    {selectedCustomer.customPoints ||
                      selectedCustomer.points ||
                      0}
                  </p>
                </div>
                <div>
                  <span className="text-neutral-500">Kiosk Sync:</span>
                  <p className="font-medium">
                    {selectedCustomer.syncedToKiosk ? (
                      <Badge className="bg-green-500">Synced</Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-600">
                        Not Synced
                      </Badge>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
