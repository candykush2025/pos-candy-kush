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
  RefreshCw,
  Award,
  Filter,
  Database,
  Monitor,
  Building2,
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
          <div className="mt-3 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
            <p className="text-gray-300 dark:text-gray-300">{customer.note}</p>
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
    allowedCategories: [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [selectedCategoryForColor, setSelectedCategoryForColor] =
    useState(null);
  const [longPressTimer, setLongPressTimer] = useState(null);

  // Color palette for category indicators
  const CATEGORY_COLORS = [
    "#3b82f6", // Blue
    "#ef4444", // Red
    "#10b981", // Green
    "#f59e0b", // Orange
    "#8b5cf6", // Purple
    "#ec4899", // Pink
    "#06b6d4", // Cyan
    "#84cc16", // Lime
  ];

  useEffect(() => {
    if (isOpen) {
      loadCategoriesFromKiosk();
    }
  }, [isOpen]);

  const loadCategoriesFromKiosk = async () => {
    try {
      setLoadingCategories(true);
      const kioskUrl =
        "https://candy-kush-kiosk.vercel.app/api/categories?active=true";
      const response = await fetch(kioskUrl);

      if (!response.ok) {
        throw new Error("Failed to fetch categories from kiosk");
      }

      const result = await response.json();

      if (result.success && result.data) {
        setCategories(result.data);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error("Error loading categories from kiosk:", error);
      toast.error("Failed to load categories from kiosk");
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

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
        allowedCategories: customer.allowedCategories || [],
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
        allowedCategories: [],
        lastVisit: null,
      });
    }
  }, [customer, isOpen]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle category color selection
  const handleCategoryColorClick = (category, e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedCategoryForColor(category);
    setColorPickerOpen(true);
  };

  const handleCategoryLongPress = (category) => {
    setSelectedCategoryForColor(category);
    setColorPickerOpen(true);
  };

  const handleCategoryMouseDown = (category) => {
    const timer = setTimeout(() => {
      handleCategoryLongPress(category);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleCategoryMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const updateCategoryColor = (color) => {
    if (!selectedCategoryForColor) return;

    setCategories(
      categories.map((cat) =>
        cat.id === selectedCategoryForColor.id ? { ...cat, color } : cat
      )
    );
    toast.success(`Color updated for ${selectedCategoryForColor.name}`);
    setColorPickerOpen(false);
    setSelectedCategoryForColor(null);
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
                className="w-full min-h-[80px] px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                value={formData.note}
                onChange={(e) => handleChange("note", e.target.value)}
                placeholder="Additional notes about this customer..."
              />
            </div>

            {/* Allowed Categories - Kiosk Permissions */}
            <div className="col-span-2">
              <label className="text-sm font-medium mb-2 block">
                Allowed Categories (Kiosk Access)
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Leave empty to allow access to all categories. Select specific
                categories to restrict access on kiosk.
              </p>

              <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                {loadingCategories ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
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
                        className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer group"
                        onMouseDown={() => handleCategoryMouseDown(category)}
                        onMouseUp={handleCategoryMouseUp}
                        onMouseLeave={handleCategoryMouseUp}
                        onTouchStart={() => handleCategoryMouseDown(category)}
                        onTouchEnd={handleCategoryMouseUp}
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
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                        {/* Color Indicator */}
                        <button
                          type="button"
                          onClick={(e) => handleCategoryColorClick(category, e)}
                          className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0 hover:scale-110 transition-transform"
                          style={{
                            backgroundColor: category.color || "#808080",
                          }}
                          title="Click to change color"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium">
                            {category.name}
                          </span>
                          {category.description && (
                            <p className="text-xs text-gray-500">
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

      {/* Color Picker Dialog */}
      <Dialog open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Category Color</DialogTitle>
            <DialogDescription>
              {selectedCategoryForColor && (
                <>
                  Choose a color for{" "}
                  <strong>{selectedCategoryForColor.name}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Color Palette */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Select from palette:
              </label>
              <div className="grid grid-cols-4 gap-3">
                {CATEGORY_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => updateCategoryColor(color)}
                    className={`h-12 w-full rounded-lg border-2 transition-all hover:scale-105 ${
                      selectedCategoryForColor?.color === color
                        ? "border-gray-900 dark:border-white scale-110"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Custom Color Picker */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Or choose custom color:
              </label>
              <div className="flex gap-2 items-center">
                <Input
                  type="color"
                  value={selectedCategoryForColor?.color || "#808080"}
                  onChange={(e) => {
                    if (selectedCategoryForColor) {
                      setSelectedCategoryForColor({
                        ...selectedCategoryForColor,
                        color: e.target.value,
                      });
                    }
                  }}
                  className="h-12 w-20 cursor-pointer"
                />
                <Button
                  onClick={() =>
                    updateCategoryColor(selectedCategoryForColor?.color)
                  }
                  className="flex-1"
                >
                  Apply Custom Color
                </Button>
              </div>
            </div>

            {/* Preview */}
            {selectedCategoryForColor && (
              <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                <p className="text-xs text-gray-500 mb-2">Preview:</p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-gray-300"
                    style={{
                      backgroundColor:
                        selectedCategoryForColor.color || "#808080",
                    }}
                  />
                  <span className="font-medium">
                    {selectedCategoryForColor.name}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setColorPickerOpen(false);
                  setSelectedCategoryForColor(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-gray-400 dark:text-gray-400">
                  Total Orders
                </p>
                <p className="text-2xl font-bold text-primary">
                  {orders.length}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-400 dark:text-gray-400">
                  Total Spent
                </p>
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
                            ? "bg-green-900/30 text-green-400"
                            : "bg-gray-800 text-gray-400"
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
export default function CustomersSection({ cashier }) {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all"); // all, loyverse, local, kiosk
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPurchaseHistory, setShowPurchaseHistory] = useState(false);
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] =
    useState(null);

  // Load customers when component mounts or cashier changes
  useEffect(() => {
    loadCustomers();
  }, [cashier?.id]); // Reload when cashier changes

  // Listen for cashier-update events
  useEffect(() => {
    const handleCashierUpdate = () => {
      console.log("Cashier updated - reloading customers");
      loadCustomers();
    };

    window.addEventListener("cashier-update", handleCashierUpdate);
    return () => {
      window.removeEventListener("cashier-update", handleCashierUpdate);
    };
  }, []);

  useEffect(() => {
    let filtered = customers;

    // Apply source filter
    if (sourceFilter !== "all") {
      filtered = filtered.filter((c) => c.source === sourceFilter);
    }

    // Apply search filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name?.toLowerCase().includes(query) ||
          c.customerCode?.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.phone?.includes(query)
      );
    }

    setFilteredCustomers(filtered);
  }, [searchQuery, customers, sourceFilter]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🔄 LOADING CUSTOMERS FROM FIREBASE...");
      console.log("Current cashier:", cashier);

      // Clear previous customers when switching users
      setCustomers([]);
      setFilteredCustomers([]);

      const data = await customersService.getAll({
        orderBy: { field: "name", direction: "asc" },
      });

      console.log("📊 RAW DATA FROM FIREBASE:", data);
      console.log("📊 Total customers fetched:", data.length);

      if (data.length > 0) {
        console.log("📄 Sample customer data:", data[0]);
        console.log(
          "📋 All customer IDs:",
          data.map((c) => c.id)
        );
        console.log(
          "📋 All customer names:",
          data.map((c) => c.name)
        );
      }

      // DON'T FILTER BY CASHIER - SHOW ALL CUSTOMERS
      console.log("✅ Showing ALL customers (no cashier filter)");

      console.log(`✅ FINAL RESULT: ${data.length} customers displayed`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      setCustomers(data);
      setFilteredCustomers(data);

      toast.success(`Loaded ${data.length} customers from Firebase`);
    } catch (error) {
      console.error("❌ ERROR LOADING CUSTOMERS:", error);
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
      toast.error("Failed to load customers from Firebase");
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
        // Create new customer with cashier info
        const customerData = {
          ...formData,
          createdBy: cashier?.id || null,
          createdByName: cashier?.name || null,
        };
        await customersService.create(customerData);
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
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Users className="h-8 w-8 text-primary" />
                Customers
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Manage your customer database
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={loadCustomers}
                variant="outline"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </>
                )}
              </Button>
              <Button onClick={handleAddCustomer}>
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            </div>
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

          {/* Source Filter Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={sourceFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSourceFilter("all")}
              className="gap-1"
            >
              <Filter className="h-4 w-4" />
              All Sources
              <Badge variant="secondary" className="ml-1">
                {customers.length}
              </Badge>
            </Button>
            <Button
              variant={sourceFilter === "loyverse" ? "default" : "outline"}
              size="sm"
              onClick={() => setSourceFilter("loyverse")}
              className="gap-1"
            >
              <Database className="h-4 w-4" />
              Loyverse
              <Badge variant="secondary" className="ml-1">
                {customers.filter((c) => c.source === "loyverse").length}
              </Badge>
            </Button>
            <Button
              variant={sourceFilter === "local" ? "default" : "outline"}
              size="sm"
              onClick={() => setSourceFilter("local")}
              className="gap-1"
            >
              <Building2 className="h-4 w-4" />
              Local
              <Badge variant="secondary" className="ml-1">
                {customers.filter((c) => c.source === "local").length}
              </Badge>
            </Button>
            <Button
              variant={sourceFilter === "kiosk" ? "default" : "outline"}
              size="sm"
              onClick={() => setSourceFilter("kiosk")}
              className="gap-1"
            >
              <Monitor className="h-4 w-4" />
              Kiosk
              <Badge variant="secondary" className="ml-1">
                {customers.filter((c) => c.source === "kiosk").length}
              </Badge>
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-4 flex gap-4">
            <Badge variant="secondary" className="text-base px-4 py-2">
              {filteredCustomers.length} Customers
              {sourceFilter !== "all" && ` (${sourceFilter})`}
            </Badge>
            {searchQuery && (
              <Badge variant="outline" className="text-base px-4 py-2">
                {filteredCustomers.length} Search Results
              </Badge>
            )}
          </div>
        </div>

        {/* Customers List */}
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
          <Card>
            <CardHeader>
              <CardTitle>All Customers ({filteredCustomers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-3">
                        <User className="h-10 w-10 text-gray-400" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg">
                              {customer.name}
                            </h3>
                            {customer.source && (
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  customer.source === "loyverse"
                                    ? "bg-purple-50 dark:bg-purple-950 border-purple-500 text-purple-700 dark:text-purple-400"
                                    : customer.source === "kiosk"
                                    ? "bg-blue-50 dark:bg-blue-950 border-blue-500 text-blue-700 dark:text-blue-400"
                                    : "bg-green-50 dark:bg-green-950 border-green-500 text-green-700 dark:text-green-400"
                                }`}
                              >
                                {customer.source === "loyverse"
                                  ? "📊 Loyverse"
                                  : customer.source === "kiosk"
                                  ? "🖥️ Kiosk"
                                  : "💼 Local"}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {customer.customerCode || customer.id}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 ml-13">
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
                        {customer.address && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {customer.address}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-4 text-sm ml-13">
                        <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                          <Award className="h-4 w-4" />
                          <span>{customer.points || 0} points</span>
                        </div>
                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <ShoppingBag className="h-4 w-4" />
                          <span>
                            {customer.visits || customer.totalVisits || 0}{" "}
                            visits
                          </span>
                        </div>
                        {customer.lastVisit && (
                          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Last:{" "}
                              {new Date(
                                customer.lastVisit.toDate
                                  ? customer.lastVisit.toDate()
                                  : customer.lastVisit
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewPurchases(customer)}
                      >
                        <ShoppingBag className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Purchases</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRedeemPoints(customer)}
                        disabled={!customer.points || customer.points === 0}
                      >
                        <DollarSign className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Redeem</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCustomer(customer)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCustomer(customer)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
    </div>
  );
}
