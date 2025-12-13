"use client";

import { useState, useEffect } from "react";
import { customersService, ordersService } from "@/lib/firebase/firestore";
import { customerApprovalService } from "@/lib/firebase/customerApprovalService";
import {
  canAddCustomer,
  canEditCustomer,
  canDeleteCustomer,
  canSetCustomerExpiry,
} from "@/lib/services/userPermissionsService";
import {
  logCustomerAction,
  LOG_ACTIONS,
} from "@/lib/services/activityLogService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  User,
  Users,
  ShoppingBag,
  Calendar,
  DollarSign,
  RefreshCw,
  Award,
  Clock,
  AlertTriangle,
  ChevronLeft,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { countries } from "@/lib/countires";

// Helper function to safely get points from pointList (NEW SYSTEM - NO HARDCODED POINTS)
const getPointsValue = (customer) => {
  if (!customer) return 0;

  // ONLY use pointList - new cashback system
  if (Array.isArray(customer.pointList) && customer.pointList.length > 0) {
    return customer.pointList.reduce((sum, entry) => {
      return sum + (entry.amount || 0);
    }, 0);
  }

  // No fallback - if no pointList, customer has 0 points
  return 0;
};

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
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{customer.name}</CardTitle>
                {customer.expiryDate && (
                  <Badge
                    variant={
                      customerApprovalService.isCustomerExpired(
                        customer.expiryDate
                      )
                        ? "destructive"
                        : customerApprovalService.isExpiringSoon(
                            customer.expiryDate
                          )
                        ? "outline"
                        : "default"
                    }
                    className="text-xs flex items-center gap-1"
                  >
                    {customerApprovalService.isCustomerExpired(
                      customer.expiryDate
                    ) ? (
                      <>
                        <AlertTriangle className="h-3 w-3" />
                        Expired
                      </>
                    ) : customerApprovalService.isExpiringSoon(
                        customer.expiryDate
                      ) ? (
                      <>
                        <Clock className="h-3 w-3" />
                        Expiring Soon
                      </>
                    ) : (
                      <>
                        <Calendar className="h-3 w-3" />
                        Active
                      </>
                    )}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {customer.customerId ? (
                  <span className="font-mono font-semibold text-primary">
                    {customer.customerId}
                  </span>
                ) : (
                  `Code: ${customer.customerCode || "N/A"}`
                )}
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
              {getPointsValue(customer)}
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
            disabled={getPointsValue(customer) === 0}
          >
            Redeem Points
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Customer Form Modal Component
function CustomerFormModal({ isOpen, onClose, customer, onSave, cashier }) {
  const [formData, setFormData] = useState({
    // Personal Information
    name: "",
    lastName: "",
    nickname: "",
    nationality: "",
    passportNumber: "",
    dateOfBirth: "",
    // Contact Information
    email: "",
    cell: "",
    // Member Information
    memberId: "",
    isActive: true,
    // Kiosk Permissions
    allowedCategories: [],
    // System fields (read-only)
    expiryDate: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [selectedCategoryForColor, setSelectedCategoryForColor] =
    useState(null);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [originalMemberId, setOriginalMemberId] = useState("");

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
      const memberId = customer.memberId || customer.customerId || "";
      setFormData({
        // Personal Information
        name: customer.name || "",
        lastName: customer.lastName || "",
        nickname: customer.nickname || "",
        nationality: customer.nationality || "",
        passportNumber: customer.passportNumber || "",
        dateOfBirth: customer.dateOfBirth || "",
        // Contact Information
        email: customer.email || "",
        cell: customer.cell || "",
        // Member Information
        memberId: memberId,
        isActive: customer.isActive !== false,
        // Kiosk Permissions
        allowedCategories: customer.allowedCategories || [],
        // System fields
        expiryDate: customer.expiryDate || "",
      });
      setOriginalMemberId(memberId);
    } else {
      // Generate member ID for new customer
      const customerCount = Date.now().toString().slice(-4);
      const newMemberId = `CK-${customerCount}`;
      setFormData({
        // Personal Information
        name: "",
        lastName: "",
        nickname: "",
        nationality: "",
        passportNumber: "",
        dateOfBirth: "",
        // Contact Information
        email: "",
        cell: "",
        // Member Information
        memberId: newMemberId,
        isActive: true,
        // Kiosk Permissions
        allowedCategories: [],
        // System fields
        expiryDate: "",
      });
      setOriginalMemberId("");
    }
  }, [customer, isOpen]);

  const handleChange = (field, value) => {
    // Ensure date fields are always strings to prevent undefined values
    const processedValue =
      field === "dateOfBirth" || field === "expiryDate" ? value || "" : value;
    setFormData((prev) => ({ ...prev, [field]: processedValue }));
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

    if (!formData.memberId.trim()) {
      toast.error("Member ID is required");
      return;
    }

    // Check memberId uniqueness
    try {
      const existingCustomers = await customersService.getAll();
      console.log("🔍 Checking memberId uniqueness:");
      console.log("Current formData.memberId:", formData.memberId.trim());
      console.log("Original memberId:", originalMemberId);
      console.log("Existing customers count:", existingCustomers.length);

      // Only check for duplicates if the memberId has actually changed
      if (formData.memberId.trim() !== originalMemberId) {
        const duplicateCustomer = existingCustomers.find(
          (c) => c.memberId === formData.memberId.trim()
        );

        console.log("Found duplicate customer:", duplicateCustomer);

        if (duplicateCustomer) {
          toast.error(
            "Member ID already exists. Please choose a different one."
          );
          return;
        }
      } else {
        console.log("MemberId hasn't changed, skipping uniqueness check");
      }
    } catch (error) {
      console.error("Error checking member ID uniqueness:", error);
      toast.error("Failed to validate member ID");
      return;
    }

    // Only save fields that exist in Firebase schema
    const finalFormData = {
      name: formData.name.trim(),
      lastName: formData.lastName.trim(),
      nickname: formData.nickname.trim(),
      nationality: formData.nationality.trim(),
      passportNumber: formData.passportNumber.trim(),
      // Handle dateOfBirth - only include if it has a value
      ...(formData.dateOfBirth &&
        typeof formData.dateOfBirth === "string" &&
        formData.dateOfBirth.trim() !== "" && {
          dateOfBirth: formData.dateOfBirth.trim(),
        }),
      email: formData.email.trim(),
      cell: formData.cell.trim(),
      customerId: formData.memberId.trim(), // Set customerId to memberId for backward compatibility
      memberId: formData.memberId.trim(),
      isActive: formData.isActive,
      allowedCategories: formData.allowedCategories,
      // Handle expiryDate - only include if it has a value
      ...(formData.expiryDate &&
        typeof formData.expiryDate === "string" &&
        formData.expiryDate.trim() !== "" && {
          expiryDate: formData.expiryDate.trim(),
        }),
      // System fields - only include for existing customers, never overwrite
      ...(customer && {
        pointList: customer.pointList || [], // Preserve existing pointList (new cashback system)
        totalSpent: customer.totalSpent || 0,
        visitCount: customer.visitCount || 0,
      }),
    };

    setIsSaving(true);
    try {
      await onSave(finalFormData);
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
            Fill in the customer information. Name and Member ID are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Personal Information Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Name - Required */}
              <div>
                <label className="text-sm font-medium">
                  First Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="John"
                  required
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="text-sm font-medium">Last Name</label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  placeholder="Doe"
                />
              </div>

              {/* Nickname */}
              <div>
                <label className="text-sm font-medium">Nickname</label>
                <Input
                  value={formData.nickname}
                  onChange={(e) => handleChange("nickname", e.target.value)}
                  placeholder="Johnny"
                />
              </div>

              {/* Nationality */}
              <div>
                <label className="text-sm font-medium">Nationality</label>
                <Select
                  value={formData.nationality || undefined}
                  onValueChange={(value) => handleChange("nationality", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select nationality" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Passport Number */}
              <div>
                <label className="text-sm font-medium">Passport Number</label>
                <Input
                  value={formData.passportNumber}
                  onChange={(e) =>
                    handleChange("passportNumber", e.target.value)
                  }
                  placeholder="Enter passport number"
                />
              </div>

              {/* Date of Birth */}
              <div className="col-span-2">
                <label className="text-sm font-medium">Date of Birth</label>
                <Input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleChange("dateOfBirth", e.target.value)}
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
              {/* Email */}
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="john@example.com"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  type="tel"
                  value={formData.cell}
                  onChange={(e) => handleChange("cell", e.target.value)}
                  placeholder="+66812345678"
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
              {/* Member ID - Required */}
              <div className="col-span-2">
                <label className="text-sm font-medium">
                  Member ID <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.memberId}
                  onChange={(e) => handleChange("memberId", e.target.value)}
                  placeholder="CK-0001"
                  required
                />
                <p className="text-xs text-gray-500 mt-1"></p>
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleChange("isActive", e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <label htmlFor="isActive" className="text-sm font-medium">
                  Active Account
                </label>
              </div>

              {/* Show current system stats for existing customers */}
              {customer && (
                <div className="col-span-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    System Statistics (Read Only)
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Points:{" "}
                      </span>
                      <span className="font-semibold">
                        {getPointsValue(customer)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Spent:{" "}
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(customer.totalSpent || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Visits:{" "}
                      </span>
                      <span className="font-semibold">
                        {customer.visitCount || 0}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Expiry Date - Cashier needs approval */}
            <div className="col-span-2">
              <label className="text-sm font-medium mb-2 block">
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
              <div className="space-y-2">
                <Input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => handleChange("expiryDate", e.target.value)}
                  placeholder="YYYY-MM-DD"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const expiry =
                        customerApprovalService.calculateExpiryDate("10days");
                      handleChange("expiryDate", expiry);
                    }}
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    +10 Days
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const expiry =
                        customerApprovalService.calculateExpiryDate("6months");
                      handleChange("expiryDate", expiry);
                    }}
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    +6 Months
                  </Button>
                </div>
                {cashier && customer && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Cashier changes require admin approval
                  </p>
                )}
              </div>
            </div>

            {/* Allowed Categories - Kiosk Permissions */}
            <div className="col-span-2">
              <label className="text-sm font-medium mb-2 block">
                Allowed Categories (Kiosk Access)
                {formData.allowedCategories.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {formData.allowedCategories.length} selected
                  </Badge>
                )}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {formData.allowedCategories.length === 0
                  ? "✓ All categories allowed (no restrictions)"
                  : "Customer restricted to selected categories only"}
              </p>

              <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                {loadingCategories ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600 mr-2"></div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Loading categories...
                    </p>
                  </div>
                ) : categories.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      ⚠️ No categories available. Customer will have access to
                      all categories.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-3 pb-2 border-b">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Select categories to restrict access
                      </span>
                      <div className="flex gap-2">
                        {formData.allowedCategories.length <
                          categories.length && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                allowedCategories: categories.map(
                                  (cat) => cat.id
                                ),
                              })
                            }
                            className="text-xs h-6"
                          >
                            Select All
                          </Button>
                        )}
                        {formData.allowedCategories.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                allowedCategories: [],
                              })
                            }
                            className="text-xs h-6"
                          >
                            Clear All
                          </Button>
                        )}
                      </div>
                    </div>
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
                            onClick={(e) =>
                              handleCategoryColorClick(category, e)
                            }
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
                              <p className="text-xs text-gray-500 dark:text-gray-400">
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
                  </>
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
    return orders.reduce(
      (sum, order) => sum + (order.total_money || order.total || 0),
      0
    );
  };

  const getTotalPointsEarned = () => {
    return orders.reduce(
      (sum, order) => sum + (order.cashback_earned || order.points_earned || 0),
      0
    );
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
            <div className="grid grid-cols-4 gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
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
              <div className="text-center">
                <p className="text-sm text-gray-400 dark:text-gray-400">
                  Points Earned
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {getTotalPointsEarned()}
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
                        {formatCurrency(order.total_money || order.total || 0)}
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

                  {/* Cashback Points Display */}
                  {(order.cashback_earned > 0 || order.points_earned > 0) && (
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                      <div className="flex items-center gap-2 text-sm">
                        <svg
                          className="h-4 w-4 text-blue-600 dark:text-blue-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="font-medium text-blue-700 dark:text-blue-300">
                          +{order.cashback_earned || order.points_earned} points
                          earned
                        </span>
                      </div>
                    </div>
                  )}

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

// Customer Form Inline Component (for in-page editing)
function CustomerFormInline({ customer, onSave, onCancel, cashier }) {
  const [formData, setFormData] = useState({
    // Personal Information
    name: "",
    lastName: "",
    nickname: "",
    nationality: "",
    dateOfBirth: "",
    // Contact Information
    email: "",
    cell: "",
    // Member Information
    memberId: "",
    isActive: true,
    // Kiosk Permissions
    allowedCategories: [],
    // System fields
    expiryDate: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [originalMemberId, setOriginalMemberId] = useState("");

  useEffect(() => {
    loadCategoriesFromKiosk();
  }, []);

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
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    if (customer) {
      const memberId = customer.memberId || customer.customerId || "";
      setFormData({
        name: customer.name || "",
        lastName: customer.lastName || "",
        nickname: customer.nickname || "",
        nationality: customer.nationality || "",
        dateOfBirth: customer.dateOfBirth || "",
        email: customer.email || "",
        cell: customer.cell || "",
        memberId: memberId,
        isActive: customer.isActive !== false,
        allowedCategories: customer.allowedCategories || [],
        expiryDate: customer.expiryDate || "",
      });
      setOriginalMemberId(memberId);
    }
  }, [customer]);

  const handleChange = (field, value) => {
    const processedValue =
      field === "dateOfBirth" || field === "expiryDate" ? value || "" : value;
    setFormData((prev) => ({ ...prev, [field]: processedValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    if (!formData.memberId.trim()) {
      toast.error("Member ID is required");
      return;
    }

    // Check memberId uniqueness
    try {
      const existingCustomers = await customersService.getAll();

      if (formData.memberId.trim() !== originalMemberId) {
        const duplicateCustomer = existingCustomers.find(
          (c) => c.memberId === formData.memberId.trim()
        );

        if (duplicateCustomer) {
          toast.error(
            "Member ID already exists. Please choose a different one."
          );
          return;
        }
      }
    } catch (error) {
      console.error("Error checking member ID uniqueness:", error);
      toast.error("Failed to validate member ID");
      return;
    }

    // Build form data
    const finalFormData = {
      name: formData.name.trim(),
      lastName: formData.lastName.trim(),
      nickname: formData.nickname.trim(),
      nationality: formData.nationality.trim(),
      ...(formData.dateOfBirth &&
        typeof formData.dateOfBirth === "string" &&
        formData.dateOfBirth.trim() !== "" && {
          dateOfBirth: formData.dateOfBirth.trim(),
        }),
      email: formData.email.trim(),
      cell: formData.cell.trim(),
      customerId: formData.memberId.trim(),
      memberId: formData.memberId.trim(),
      isActive: formData.isActive,
      allowedCategories: formData.allowedCategories,
      ...(formData.expiryDate &&
        typeof formData.expiryDate === "string" &&
        formData.expiryDate.trim() !== "" && {
          expiryDate: formData.expiryDate.trim(),
        }),
      ...(customer && {
        pointList: customer.pointList || [], // Preserve existing pointList (new cashback system)
        totalSpent: customer.totalSpent || 0,
        visitCount: customer.visitCount || 0,
      }),
    };

    setIsSaving(true);
    try {
      await onSave(finalFormData);
    } catch (error) {
      console.error("Error saving customer:", error);
      toast.error("Failed to save customer");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information Section */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg border-b pb-2 dark:border-gray-700">
          Personal Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">
              First Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="John"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Last Name</label>
            <Input
              value={formData.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)}
              placeholder="Doe"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Nickname</label>
            <Input
              value={formData.nickname}
              onChange={(e) => handleChange("nickname", e.target.value)}
              placeholder="Johnny"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Nationality</label>
            <Select
              value={formData.nationality || undefined}
              onValueChange={(value) => handleChange("nationality", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select nationality" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium">Date of Birth</label>
            <Input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => handleChange("dateOfBirth", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Contact Information Section */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg border-b pb-2 dark:border-gray-700">
          Contact Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Phone Number</label>
            <Input
              type="tel"
              value={formData.cell}
              onChange={(e) => handleChange("cell", e.target.value)}
              placeholder="+66812345678"
            />
          </div>
        </div>
      </div>

      {/* Member Information Section */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg border-b pb-2 dark:border-gray-700">
          Member Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-sm font-medium">
              Member ID <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.memberId}
              onChange={(e) => handleChange("memberId", e.target.value)}
              placeholder="CK-0001"
              required
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActiveInline"
              checked={formData.isActive}
              onChange={(e) => handleChange("isActive", e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <label htmlFor="isActiveInline" className="text-sm font-medium">
              Active Account
            </label>
          </div>
          {customer && (
            <div className="col-span-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                System Statistics (Read Only)
              </p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Points:{" "}
                  </span>
                  <span className="font-semibold">
                    {getPointsValue(customer)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Spent:{" "}
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(customer.totalSpent || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Visits:{" "}
                  </span>
                  <span className="font-semibold">
                    {customer.visitCount || 0}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expiry Date Section */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg border-b pb-2 dark:border-gray-700">
          Membership Expiry
        </h3>
        <div>
          <label className="text-sm font-medium mb-2 block">
            Expiry Date{" "}
            {formData.expiryDate && (
              <Badge
                variant={
                  customerApprovalService.isCustomerExpired(formData.expiryDate)
                    ? "destructive"
                    : customerApprovalService.isExpiringSoon(
                        formData.expiryDate
                      )
                    ? "outline"
                    : "default"
                }
                className="ml-2"
              >
                {customerApprovalService.isCustomerExpired(formData.expiryDate)
                  ? "Expired"
                  : customerApprovalService.isExpiringSoon(formData.expiryDate)
                  ? "Expiring Soon"
                  : "Active"}
              </Badge>
            )}
          </label>
          <div className="space-y-2">
            <Input
              type="date"
              value={formData.expiryDate}
              onChange={(e) => handleChange("expiryDate", e.target.value)}
              placeholder="YYYY-MM-DD"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const expiry =
                    customerApprovalService.calculateExpiryDate("10days");
                  handleChange("expiryDate", expiry);
                }}
              >
                <Calendar className="h-4 w-4 mr-1" />
                +10 Days
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const expiry =
                    customerApprovalService.calculateExpiryDate("6months");
                  handleChange("expiryDate", expiry);
                }}
              >
                <Calendar className="h-4 w-4 mr-1" />
                +6 Months
              </Button>
            </div>
            {cashier && customer && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Cashier changes require admin approval
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Allowed Categories Section */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg border-b pb-2 dark:border-gray-700">
          Kiosk Permissions
        </h3>
        <div>
          <label className="text-sm font-medium mb-2 block">
            Allowed Categories
            {formData.allowedCategories.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {formData.allowedCategories.length} selected
              </Badge>
            )}
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {formData.allowedCategories.length === 0
              ? "✓ All categories allowed (no restrictions)"
              : "Customer restricted to selected categories only"}
          </p>
          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
            {loadingCategories ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600 mr-2"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Loading categories...
                </p>
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  ⚠️ No categories available.
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-3 pb-2 border-b dark:border-gray-700">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Select categories to restrict access
                  </span>
                  <div className="flex gap-2">
                    {formData.allowedCategories.length < categories.length && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            allowedCategories: categories.map((cat) => cat.id),
                          })
                        }
                        className="text-xs h-6"
                      >
                        Select All
                      </Button>
                    )}
                    {formData.allowedCategories.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            allowedCategories: [],
                          })
                        }
                        className="text-xs h-6"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {categories.map((category) => (
                    <label
                      key={category.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
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
                      <span className="flex items-center gap-2">
                        {category.color && (
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                        )}
                        {category.name}
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

// Main Customers Section
export default function CustomersSection({ cashier }) {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPurchaseHistory, setShowPurchaseHistory] = useState(false);
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] =
    useState(null);

  // View mode state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // "list", "detail", or "edit"

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    type: null, // 'single' or 'bulk'
    customer: null,
    loading: false,
  });

  // Load customers when component mounts or cashier changes
  useEffect(() => {
    loadCustomers();
  }, [cashier?.id]); // Reload when cashier changes

  // Listen for cashier-update events
  useEffect(() => {
    const handleCashierUpdate = () => {
      loadCustomers();
    };

    window.addEventListener("cashier-update", handleCashierUpdate);
    return () => {
      window.removeEventListener("cashier-update", handleCashierUpdate);
    };
  }, []);

  useEffect(() => {
    let filtered = customers;

    // Apply search filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name?.toLowerCase().includes(query) ||
          c.customerCode?.toLowerCase().includes(query) ||
          c.customerId?.toLowerCase().includes(query) ||
          c.memberId?.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.phone?.includes(query) ||
          c.cell?.includes(query)
      );
    }

    setFilteredCustomers(filtered);
  }, [searchQuery, customers]);

  const loadCustomers = async () => {
    try {
      setLoading(true);

      // Clear previous customers when switching users
      setCustomers([]);
      setFilteredCustomers([]);

      const data = await customersService.getAll({
        orderBy: { field: "name", direction: "asc" },
      });

      // DON'T FILTER BY CASHIER - SHOW ALL CUSTOMERS

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

  const handleEditCustomer = (customer, useModal = false) => {
    setEditingCustomer(customer);
    if (useModal) {
      setIsModalOpen(true);
    } else {
      // Use in-page edit mode
      setSelectedCustomer(customer);
      setViewMode("edit");
    }
  };

  const handleSaveCustomer = async (formData) => {
    try {
      if (editingCustomer) {
        // Permission check for editing
        if (!canEditCustomer(cashier)) {
          toast.error("You don't have permission to edit customers");
          return;
        }

        // Check if cashier is trying to change expiry date
        const expiryChanged =
          formData.expiryDate !== editingCustomer.expiryDate;

        // Check permission for expiry date change
        if (expiryChanged && !canSetCustomerExpiry(cashier)) {
          toast.error(
            "You don't have permission to change customer expiry dates"
          );
          return;
        }

        if (cashier && expiryChanged) {
          // Cashier needs approval for expiry date changes
          await customerApprovalService.createExpiryRequest({
            customerId: editingCustomer.id,
            customerName: editingCustomer.name,
            currentExpiryDate: editingCustomer.expiryDate,
            newExpiryDate: formData.expiryDate,
            requestedBy: cashier.id,
            requestedByName: cashier.name,
            reason: "Cashier requested expiry date extension",
          });

          // Update customer without expiry date change - filter out undefined values
          const updateData = Object.fromEntries(
            Object.entries({
              ...formData,
              expiryDate: editingCustomer.expiryDate,
            }).filter(([key, value]) => value !== undefined)
          );
          await customersService.update(editingCustomer.id, updateData);

          // Log the update action
          if (cashier) {
            await logCustomerAction(
              cashier,
              LOG_ACTIONS.CUSTOMER_UPDATED,
              editingCustomer,
              {
                description:
                  "Updated customer (expiry change pending approval)",
              }
            );
          }

          toast.success(
            "Customer updated! Expiry date change sent for admin approval."
          );
        } else {
          // Admin or no expiry change - update directly, filter out undefined values
          const updateData = Object.fromEntries(
            Object.entries(formData).filter(
              ([key, value]) => value !== undefined
            )
          );
          await customersService.update(editingCustomer.id, updateData);

          // Log the update action
          if (cashier) {
            await logCustomerAction(
              cashier,
              LOG_ACTIONS.CUSTOMER_UPDATED,
              editingCustomer,
              {
                description: "Updated customer information",
              }
            );
          }

          toast.success("Customer updated successfully");
        }
      } else {
        // Permission check for adding
        if (!canAddCustomer(cashier)) {
          toast.error("You don't have permission to add customers");
          return;
        }

        // Create new customer with cashier info and source as "local"
        const customerData = {
          ...formData,
          source: "local", // Mark as locally created customer
          createdBy: cashier?.id || null,
          createdByName: cashier?.name || null,
        };

        // For new customers created by cashier with expiry date, also requires approval
        if (cashier && formData.expiryDate) {
          // Create customer without expiry date first - filter out undefined values
          const createData = Object.fromEntries(
            Object.entries({
              ...customerData,
              expiryDate: "", // Don't set expiry yet
            }).filter(([key, value]) => value !== undefined)
          );
          const newCustomer = await customersService.create(createData);

          // Create approval request
          await customerApprovalService.createExpiryRequest({
            customerId: newCustomer.id,
            customerName: customerData.name,
            currentExpiryDate: "",
            newExpiryDate: formData.expiryDate,
            requestedBy: cashier.id,
            requestedByName: cashier.name,
            reason: "Cashier set initial expiry date",
          });

          // Log the creation action
          if (cashier) {
            await logCustomerAction(
              cashier,
              LOG_ACTIONS.CUSTOMER_CREATED,
              newCustomer,
              {
                description: "Created new customer (expiry pending approval)",
              }
            );
          }

          toast.success(
            "Customer created! Expiry date sent for admin approval."
          );
        } else {
          // Admin creating customer - set expiry directly, filter out undefined values
          const createData = Object.fromEntries(
            Object.entries(customerData).filter(
              ([key, value]) => value !== undefined
            )
          );
          const newCustomer = await customersService.create(createData);

          // Log the creation action
          if (cashier) {
            await logCustomerAction(
              cashier,
              LOG_ACTIONS.CUSTOMER_CREATED,
              { id: newCustomer?.id, name: customerData.name },
              {
                description: "Created new customer",
              }
            );
          }

          toast.success("Customer created successfully");
        }
      }
      loadCustomers();
    } catch (error) {
      console.error("Error saving customer:", error);
      throw error;
    }
  };

  const handleDeleteCustomer = (customer) => {
    // Permission check for deleting
    if (!canDeleteCustomer(cashier)) {
      toast.error("You don't have permission to delete customers");
      return;
    }

    setDeleteModal({
      open: true,
      type: "single",
      customer: customer,
      loading: false,
    });
  };

  const handleDeleteCustomerConfirm = async () => {
    if (!deleteModal.customer) return;
    setDeleteModal((prev) => ({ ...prev, loading: true }));

    try {
      await customersService.delete(deleteModal.customer.id);

      // Log the delete action
      if (cashier) {
        await logCustomerAction(
          cashier,
          LOG_ACTIONS.CUSTOMER_DELETED,
          deleteModal.customer,
          {
            description: `Deleted customer: ${deleteModal.customer.name}`,
          }
        );
      }

      toast.success("Customer deleted successfully");
      setDeleteModal({
        open: false,
        type: null,
        customer: null,
        loading: false,
      });
      loadCustomers();
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast.error("Failed to delete customer");
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleBulkDelete = () => {
    // Permission check for deleting
    if (!canDeleteCustomer(cashier)) {
      toast.error("You don't have permission to delete customers");
      return;
    }

    if (selectedIds.length === 0) {
      toast.error("No customers selected");
      return;
    }

    setDeleteModal({
      open: true,
      type: "bulk",
      customer: null,
      loading: false,
    });
  };

  const handleBulkDeleteConfirm = async () => {
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await Promise.all(selectedIds.map((id) => customersService.delete(id)));

      // Log the bulk delete action
      if (cashier) {
        await logCustomerAction(cashier, LOG_ACTIONS.CUSTOMER_DELETED, null, {
          description: `Bulk deleted ${selectedIds.length} customers`,
        });
      }

      toast.success(`${selectedIds.length} customer(s) deleted successfully`);
      setSelectedIds([]);
      setDeleteModal({
        open: false,
        type: null,
        customer: null,
        loading: false,
      });
      loadCustomers();
    } catch (error) {
      console.error("Error deleting customers:", error);
      toast.error("Failed to delete some customers");
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleViewDetails = (customer) => {
    setSelectedCustomer(customer);
    setViewMode("detail");
  };

  const handleBackToList = () => {
    setSelectedCustomer(null);
    setViewMode("list");
  };

  const handleSetExpiry = async (customer, duration) => {
    // Permission check for setting expiry
    if (!canSetCustomerExpiry(cashier)) {
      toast.error("You don't have permission to set customer expiry dates");
      return;
    }

    try {
      const expiry = customerApprovalService.calculateExpiryDate(duration);
      await customersService.update(customer.id, {
        expiryDate: expiry,
      });
      toast.success(
        `Expiry set to ${
          duration === "10days" ? "10 days" : "6 months"
        } from now`
      );
      // Update selected customer with new expiry
      setSelectedCustomer({ ...customer, expiryDate: expiry });
      loadCustomers();
    } catch (error) {
      console.error("Error setting expiry:", error);
      toast.error("Failed to set expiry date");
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredCustomers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCustomers.map((c) => c.id));
    }
  };

  const handleSelectCustomer = (customerId) => {
    setSelectedIds((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId]
    );
  };

  const formatExpiryDate = (expiryDate) => {
    if (!expiryDate) return "-";
    const date = new Date(expiryDate);
    return date.toLocaleDateString();
  };

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return null;
    if (customerApprovalService.isCustomerExpired(expiryDate)) return "expired";
    if (customerApprovalService.isExpiringSoon(expiryDate)) return "expiring";
    return "active";
  };

  // Categorize customers into Active, Expired, and Not Set
  const categorizeCustomers = (customersList) => {
    const active = [];
    const expired = [];
    const notSet = [];

    customersList.forEach((customer) => {
      if (!customer.expiryDate) {
        notSet.push(customer);
      } else if (
        customerApprovalService.isCustomerExpired(customer.expiryDate)
      ) {
        expired.push(customer);
      } else {
        active.push(customer);
      }
    });

    // Sort active by soonest expiry first
    active.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    // Sort expired by most recently expired first
    expired.sort((a, b) => new Date(b.expiryDate) - new Date(a.expiryDate));

    return { active, expired, notSet };
  };

  // Calculate remaining days until expiry
  const getRemainingDays = (expiryDate) => {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Format remaining days for display
  const formatRemainingDays = (expiryDate) => {
    const days = getRemainingDays(expiryDate);
    if (days === null) return "-";
    if (days < 0) return `${Math.abs(days)}d ago`;
    if (days === 0) return "Today";
    if (days === 1) return "1 day";
    return `${days} days`;
  };

  const {
    active: activeCustomers,
    expired: expiredCustomers,
    notSet: notSetCustomers,
  } = categorizeCustomers(filteredCustomers);

  const handleViewPurchases = (customer) => {
    setSelectedCustomerForHistory(customer);
    setShowPurchaseHistory(true);
  };

  const handleRedeemPoints = async (customer) => {
    const currentPoints = getPointsValue(customer);
    if (currentPoints === 0) {
      toast.error("No points available to redeem");
      return;
    }

    const points = prompt(
      `${customer.name} has ${currentPoints} points. How many points to redeem?`,
      currentPoints.toString()
    );

    if (!points || isNaN(points) || parseInt(points) <= 0) {
      return;
    }

    const redeemAmount = parseInt(points);
    if (redeemAmount > currentPoints) {
      toast.error("Cannot redeem more points than available");
      return;
    }

    try {
      const newPoints = currentPoints - redeemAmount;
      await customersService.update(customer.id, {
        points: newPoints, // Store as number after redemption
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

  // Detail View
  if (viewMode === "detail" && selectedCustomer) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950">
        <div className="p-6 max-w-5xl mx-auto space-y-6">
          {/* Header with Back Button */}
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleBackToList}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">
                {selectedCustomer.name} {selectedCustomer.lastName || ""}
              </h1>
              <p className="text-gray-500">
                Member ID:{" "}
                {selectedCustomer.memberId ||
                  selectedCustomer.customerId ||
                  "N/A"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleEditCustomer(selectedCustomer)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteCustomer(selectedCustomer)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Stats & Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Award className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-purple-600">
                      {getPointsValue(selectedCustomer)}
                    </p>
                    <p className="text-sm text-gray-500">Points</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <ShoppingBag className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-600">
                      {selectedCustomer.visits ||
                        selectedCustomer.totalVisits ||
                        0}
                    </p>
                    <p className="text-sm text-gray-500">Visits</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(selectedCustomer.totalSpent || 0)}
                    </p>
                    <p className="text-sm text-gray-500">Total Spent</p>
                  </CardContent>
                </Card>
              </div>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">
                      {selectedCustomer.cell || selectedCustomer.phone || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">
                      {selectedCustomer.email || "N/A"}
                    </p>
                  </div>
                  {selectedCustomer.nationality && (
                    <div>
                      <p className="text-sm text-gray-500">Nationality</p>
                      <p className="font-medium">
                        {selectedCustomer.nationality}
                      </p>
                    </div>
                  )}
                  {selectedCustomer.dateOfBirth && (
                    <div>
                      <p className="text-sm text-gray-500">Date of Birth</p>
                      <p className="font-medium">
                        {selectedCustomer.dateOfBirth}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleViewPurchases(selectedCustomer)}
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    View Purchases
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleRedeemPoints(selectedCustomer)}
                    disabled={getPointsValue(selectedCustomer) === 0}
                  >
                    <Award className="h-4 w-4 mr-2" />
                    Redeem Points
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Expiry Management */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Membership Expiry
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current Expiry Status */}
                  <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
                    <p className="text-sm text-gray-500 mb-2">Current Expiry</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedCustomer.expiryDate ? (
                        <>
                          <p className="text-lg font-bold">
                            {formatExpiryDate(selectedCustomer.expiryDate)}
                          </p>
                          {getExpiryStatus(selectedCustomer.expiryDate) ===
                            "expired" && (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Expired
                            </Badge>
                          )}
                          {getExpiryStatus(selectedCustomer.expiryDate) ===
                            "expiring" && (
                            <Badge
                              variant="outline"
                              className="text-yellow-600 border-yellow-600"
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Expiring Soon
                            </Badge>
                          )}
                          {getExpiryStatus(selectedCustomer.expiryDate) ===
                            "active" && (
                            <Badge className="bg-green-600">Active</Badge>
                          )}
                        </>
                      ) : (
                        <p className="text-lg font-medium text-gray-400">
                          No Expiry Set
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quick Set Buttons */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Quick Set Expiry</p>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() =>
                        handleSetExpiry(selectedCustomer, "10days")
                      }
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Set to 10 Days
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() =>
                        handleSetExpiry(selectedCustomer, "6months")
                      }
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Set to 6 Months
                    </Button>
                  </div>

                  {/* Info */}
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <p className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      Expired customers cannot make purchases.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

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

  // Edit View Component (in-page)
  if (viewMode === "edit" && selectedCustomer) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950">
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          {/* Header with Back Button */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setViewMode("detail");
                setEditingCustomer(null);
              }}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Details
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">
                Edit: {selectedCustomer.name} {selectedCustomer.lastName || ""}
              </h1>
              <p className="text-gray-500">Update customer information</p>
            </div>
          </div>

          {/* Edit Form */}
          <Card>
            <CardContent className="pt-6">
              <CustomerFormInline
                customer={editingCustomer}
                onSave={async (formData) => {
                  await handleSaveCustomer(formData);
                  // Update selected customer and go back to detail view
                  const updatedCustomer = { ...selectedCustomer, ...formData };
                  setSelectedCustomer(updatedCustomer);
                  setViewMode("detail");
                  setEditingCustomer(null);
                }}
                onCancel={() => {
                  setViewMode("detail");
                  setEditingCustomer(null);
                }}
                cashier={cashier}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                Customers
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Manage your customer database
              </p>
            </div>
            <div className="flex gap-2">
              {selectedIds.length > 0 && canDeleteCustomer(cashier) && (
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedIds.length})
                </Button>
              )}
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
              {canAddCustomer(cashier) && (
                <Button onClick={handleAddCustomer}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customer
                </Button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search by name, member ID, email, or phone..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 flex gap-4">
            <Badge variant="secondary" className="text-base px-4 py-2">
              {filteredCustomers.length} Customers
            </Badge>
            {searchQuery && (
              <Badge variant="outline" className="text-base px-4 py-2">
                {filteredCustomers.length} Search Results
              </Badge>
            )}
          </div>
        </div>

        {/* Customers Tables */}
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
          <div className="space-y-6">
            {/* Active Customers Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <Award className="h-5 w-5" />
                  Active Customers ({activeCustomers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {activeCustomers.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    No active customers
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-green-50 dark:bg-green-900/20">
                        <tr>
                          <th className="w-12 px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={
                                activeCustomers.every((c) =>
                                  selectedIds.includes(c.id)
                                ) && activeCustomers.length > 0
                              }
                              onChange={() => {
                                const allSelected = activeCustomers.every((c) =>
                                  selectedIds.includes(c.id)
                                );
                                if (allSelected) {
                                  setSelectedIds((prev) =>
                                    prev.filter(
                                      (id) =>
                                        !activeCustomers.find(
                                          (c) => c.id === id
                                        )
                                    )
                                  );
                                } else {
                                  setSelectedIds((prev) => [
                                    ...new Set([
                                      ...prev,
                                      ...activeCustomers.map((c) => c.id),
                                    ]),
                                  ]);
                                }
                              }}
                              className="rounded border-gray-300 dark:border-gray-600"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                            Name
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                            Member ID
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                            Points
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                            Visits
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                            Remaining
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {activeCustomers.map((customer) => (
                          <tr
                            key={customer.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors"
                            onClick={() => handleViewDetails(customer)}
                          >
                            <td
                              className="px-4 py-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(customer.id)}
                                onChange={() =>
                                  handleSelectCustomer(customer.id)
                                }
                                className="rounded border-gray-300 dark:border-gray-600"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                                  <User className="h-5 w-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-gray-100">
                                    {customer.name} {customer.lastName || ""}
                                  </p>
                                  {customer.email && (
                                    <p className="text-xs text-gray-500">
                                      {customer.email}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm text-primary">
                                {customer.memberId ||
                                  customer.customerId ||
                                  "-"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                {getPointsValue(customer)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {customer.visits || customer.totalVisits || 0}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={
                                  getRemainingDays(customer.expiryDate) <= 7
                                    ? "destructive"
                                    : getRemainingDays(customer.expiryDate) <=
                                      30
                                    ? "outline"
                                    : "secondary"
                                }
                                className={
                                  getRemainingDays(customer.expiryDate) <= 7
                                    ? ""
                                    : getRemainingDays(customer.expiryDate) <=
                                      30
                                    ? "text-yellow-600 border-yellow-600"
                                    : "text-green-600"
                                }
                              >
                                {formatRemainingDays(customer.expiryDate)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expired Customers Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  Expired Customers ({expiredCustomers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {expiredCustomers.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    No expired customers
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-red-50 dark:bg-red-900/20">
                        <tr>
                          <th className="w-12 px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={
                                expiredCustomers.every((c) =>
                                  selectedIds.includes(c.id)
                                ) && expiredCustomers.length > 0
                              }
                              onChange={() => {
                                const allSelected = expiredCustomers.every(
                                  (c) => selectedIds.includes(c.id)
                                );
                                if (allSelected) {
                                  setSelectedIds((prev) =>
                                    prev.filter(
                                      (id) =>
                                        !expiredCustomers.find(
                                          (c) => c.id === id
                                        )
                                    )
                                  );
                                } else {
                                  setSelectedIds((prev) => [
                                    ...new Set([
                                      ...prev,
                                      ...expiredCustomers.map((c) => c.id),
                                    ]),
                                  ]);
                                }
                              }}
                              className="rounded border-gray-300 dark:border-gray-600"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                            Name
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                            Member ID
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                            Points
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                            Visits
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                            Expired
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {expiredCustomers.map((customer) => (
                          <tr
                            key={customer.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors bg-red-50/30 dark:bg-red-900/10"
                            onClick={() => handleViewDetails(customer)}
                          >
                            <td
                              className="px-4 py-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(customer.id)}
                                onChange={() =>
                                  handleSelectCustomer(customer.id)
                                }
                                className="rounded border-gray-300 dark:border-gray-600"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                                  <User className="h-5 w-5 text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-gray-100">
                                    {customer.name} {customer.lastName || ""}
                                  </p>
                                  {customer.email && (
                                    <p className="text-xs text-gray-500">
                                      {customer.email}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm text-primary">
                                {customer.memberId ||
                                  customer.customerId ||
                                  "-"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                {getPointsValue(customer)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {customer.visits || customer.totalVisits || 0}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {formatRemainingDays(customer.expiryDate)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Not Set Customers Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Clock className="h-5 w-5" />
                  No Expiry Set ({notSetCustomers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {notSetCustomers.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    All customers have expiry dates set
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                          <th className="w-12 px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={
                                notSetCustomers.every((c) =>
                                  selectedIds.includes(c.id)
                                ) && notSetCustomers.length > 0
                              }
                              onChange={() => {
                                const allSelected = notSetCustomers.every((c) =>
                                  selectedIds.includes(c.id)
                                );
                                if (allSelected) {
                                  setSelectedIds((prev) =>
                                    prev.filter(
                                      (id) =>
                                        !notSetCustomers.find(
                                          (c) => c.id === id
                                        )
                                    )
                                  );
                                } else {
                                  setSelectedIds((prev) => [
                                    ...new Set([
                                      ...prev,
                                      ...notSetCustomers.map((c) => c.id),
                                    ]),
                                  ]);
                                }
                              }}
                              className="rounded border-gray-300 dark:border-gray-600"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                            Name
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                            Member ID
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                            Points
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                            Visits
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {notSetCustomers.map((customer) => (
                          <tr
                            key={customer.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors"
                            onClick={() => handleViewDetails(customer)}
                          >
                            <td
                              className="px-4 py-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(customer.id)}
                                onChange={() =>
                                  handleSelectCustomer(customer.id)
                                }
                                className="rounded border-gray-300 dark:border-gray-600"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                  <User className="h-5 w-5 text-gray-500" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-gray-100">
                                    {customer.name} {customer.lastName || ""}
                                  </p>
                                  {customer.email && (
                                    <p className="text-xs text-gray-500">
                                      {customer.email}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm text-primary">
                                {customer.memberId ||
                                  customer.customerId ||
                                  "-"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                {getPointsValue(customer)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {customer.visits || customer.totalVisits || 0}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant="outline"
                                className="text-xs text-gray-500"
                              >
                                Not Set
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Customer Form Modal */}
        <CustomerFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          customer={editingCustomer}
          onSave={handleSaveCustomer}
          cashier={cashier}
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

        {/* Delete Confirmation Modal */}
        <Dialog
          open={deleteModal.open}
          onOpenChange={(open) => {
            if (!open && !deleteModal.loading) {
              setDeleteModal({
                open: false,
                type: null,
                customer: null,
                loading: false,
              });
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {deleteModal.type === "bulk"
                  ? "Delete Customers"
                  : "Delete Customer"}
              </DialogTitle>
              <DialogDescription>
                {deleteModal.type === "bulk"
                  ? `Are you sure you want to delete ${selectedIds.length} customer(s)? This action cannot be undone.`
                  : `Are you sure you want to delete ${deleteModal.customer?.name}? This action cannot be undone.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() =>
                  setDeleteModal({
                    open: false,
                    type: null,
                    customer: null,
                    loading: false,
                  })
                }
                disabled={deleteModal.loading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deleteModal.type === "bulk") {
                    handleBulkDeleteConfirm();
                  } else {
                    handleDeleteCustomerConfirm();
                  }
                }}
                disabled={deleteModal.loading}
              >
                {deleteModal.loading ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
