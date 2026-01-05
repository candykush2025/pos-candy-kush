"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Minus,
  Search,
  Edit,
  Trash2,
  UserCircle,
  Calendar,
  DollarSign,
  ShoppingBag,
  Award,
  AlertCircle,
  RefreshCw,
  Clock,
  AlertTriangle,
  ChevronLeft,
  Receipt,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { customersService, receiptsService } from "@/lib/firebase/firestore";
import { customerApprovalService } from "@/lib/firebase/customerApprovalService";
import { customerPointsService } from "@/lib/firebase/cashbackService";
import { formatCurrency } from "@/lib/utils/format";
import { dbService } from "@/lib/db/dbService";
import { format } from "date-fns";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";

// Helper function to calculate total points from pointList
const calculateTotalPoints = (pointList) => {
  if (!Array.isArray(pointList) || pointList.length === 0) {
    return 0;
  }
  return pointList.reduce((total, entry) => {
    const amount = entry.amount || 0;
    return total + amount;
  }, 0);
};

// Helper function to get points from pointList ONLY (NO HARDCODED FALLBACK)
const getPointsValue = (customer) => {
  if (!customer) return 0;

  // ONLY use pointList - new cashback system
  if (Array.isArray(customer.pointList) && customer.pointList.length > 0) {
    return calculateTotalPoints(customer.pointList);
  }

  // No fallback - if no pointList, customer has 0 points
  // Old customers will show 0 until they earn points through purchases
  return 0;
};

export default function CustomersPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // "list", "detail", or "edit"
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isForceFetching, setIsForceFetching] = useState(false);

  // Points history state
  const [pointsHistory, setPointsHistory] = useState([]);
  const [loadingPointsHistory, setLoadingPointsHistory] = useState(false);

  // Point adjustment modal state
  const [pointAdjustmentModal, setPointAdjustmentModal] = useState({
    open: false,
    type: null, // 'add' or 'reduce'
    loading: false,
  });
  const [pointAdjustmentForm, setPointAdjustmentForm] = useState({
    points: "",
    reason: "",
  });

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

  const [formData, setFormData] = useState({
    // Required
    name: "",
    // Personal Information
    lastName: "",
    nickname: "",
    nationality: "",
    dateOfBirth: "",
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

  // Load points history when viewing customer details
  useEffect(() => {
    if (viewMode === "detail" && selectedCustomer) {
      loadPointsHistory(selectedCustomer);
    } else {
      setPointsHistory([]);
    }
  }, [viewMode, selectedCustomer]);

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

      // Try to fetch from Firebase first
      const data = await customersService.getAll();
      console.log("📊 Loaded customers from Firebase:", data);
      console.log("📊 Number of customers:", data.length);

      setCustomers(data);
      setFilteredCustomers(data);

      // Sync to IndexedDB for offline access
      if (data.length > 0) {
        await dbService.upsertCustomers(data);
      }
    } catch (error) {
      console.error("Error loading customers from Firebase:", error);

      // Fallback to IndexedDB if Firebase fails
      try {
        const localData = await dbService.getCustomers();
        console.log(
          "📊 Loaded customers from IndexedDB (fallback):",
          localData
        );
        setCustomers(localData);
        setFilteredCustomers(localData);
        toast.warning("Loaded customers from local database (offline mode)");
      } catch (dbError) {
        console.error("Error loading customers from IndexedDB:", dbError);
        toast.error("Failed to load customers");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForceFetchFromFirebase = async () => {
    try {
      setIsForceFetching(true);
      toast.info("Fetching customers from Firebase...");

      // Fetch directly from Firebase, not from IndexedDB
      const data = await customersService.getAll();
      console.log("🔄 Force fetched customers from Firebase:", data);
      console.log("🔄 Number of customers fetched:", data.length);

      setCustomers(data);
      setFilteredCustomers(data);

      // Also update IndexedDB with the fresh data
      if (data.length > 0) {
        await dbService.upsertCustomers(data);
        console.log("💾 Synced customers to IndexedDB");
      }

      toast.success(
        `Successfully fetched ${data.length} customers from Firebase`
      );
    } catch (error) {
      console.error("Error force fetching customers from Firebase:", error);
      toast.error("Failed to fetch customers from Firebase");
    } finally {
      setIsForceFetching(false);
    }
  };

  const loadPointsHistory = async (customer) => {
    if (!customer) return;

    try {
      setLoadingPointsHistory(true);

      // First, check if customer has pointList (new system)
      if (Array.isArray(customer.pointList) && customer.pointList.length > 0) {
        // Use pointList from customer data
        const history = customer.pointList
          .map((entry) => {
            const entryDate = entry.createdAt
              ? new Date(entry.createdAt)
              : null;

            // Skip entries with invalid dates
            if (!entryDate || isNaN(entryDate.getTime())) {
              return null;
            }

            // Determine display type and description based on entry type
            let displayType = "earn";
            let description = "";

            switch (entry.type) {
              case "earned":
                displayType = "earn";
                description = entry.reason || `Earned from purchase`;
                break;
              case "used":
                displayType = "deduct";
                description = entry.reason || `Redeemed points`;
                break;
              case "adjustment_add":
                displayType = "earn";
                description = entry.reason || `Admin adjustment (add)`;
                break;
              case "adjustment_reduce":
                displayType = "deduct";
                description = entry.reason || `Admin adjustment (reduce)`;
                break;
              default:
                displayType = entry.amount >= 0 ? "earn" : "deduct";
                description = entry.reason || "Point transaction";
            }

            return {
              id: entry.id,
              date: entryDate,
              type: displayType,
              points: Math.abs(entry.amount || 0),
              amount: entry.valueRedeemed || 0,
              receiptNumber: entry.receiptNumber || null,
              receiptId: entry.receiptId || null,
              description,
              source: entry.source,
              adjustedBy: entry.adjustedBy,
              cashbackRule: entry.cashbackRule,
            };
          })
          .filter(Boolean)
          .sort((a, b) => b.date - a.date);

        setPointsHistory(history);
        return;
      }

      // Fallback: Build history from receipts (legacy support)
      const allReceipts = await receiptsService.getAll();

      // Filter receipts for this customer
      const customerReceipts = allReceipts.filter((receipt) => {
        const receiptCustomerId =
          receipt.customerId || receipt.customer_id || receipt.customerCode;
        const customerIds = [
          customer.id,
          customer.customerId,
          customer.memberId,
          customer.customerCode,
        ].filter(Boolean);

        return customerIds.some((id) => id === receiptCustomerId);
      });

      // Build points history from receipts
      const history = customerReceipts
        .map((receipt) => {
          const receiptDate = receipt.receiptDate?.toDate
            ? receipt.receiptDate.toDate()
            : receipt.receipt_date?.toDate
            ? receipt.receipt_date.toDate()
            : new Date(receipt.createdAt || receipt.created_at);

          // Only include receipts with valid dates
          if (!receiptDate || isNaN(receiptDate.getTime())) {
            return null;
          }

          const total =
            receipt.totalMoney || receipt.total_money || receipt.total || 0;
          const pointsEarned = receipt.pointsEarned || Math.floor(total / 10);

          return {
            id: receipt.id,
            date: receiptDate,
            type: receipt.receiptType === "REFUND" ? "deduct" : "earn",
            points: pointsEarned,
            amount: total,
            receiptNumber:
              receipt.receiptNumber || receipt.receipt_number || receipt.number,
            receiptId: receipt.id,
            description:
              receipt.receiptType === "REFUND"
                ? `Refund - Receipt #${receipt.receiptNumber || "N/A"}`
                : `Purchase - Receipt #${receipt.receiptNumber || "N/A"}`,
          };
        })
        .filter(Boolean);

      // Sort by date descending
      history.sort((a, b) => b.date - a.date);

      setPointsHistory(history);
    } catch (error) {
      console.error("Error loading points history:", error);
      toast.error("Failed to load points history");
      setPointsHistory([]);
    } finally {
      setLoadingPointsHistory(false);
    }
  };

  // Handle point adjustment (add or reduce)
  const handlePointAdjustment = async () => {
    if (!selectedCustomer) return;

    const points = parseInt(pointAdjustmentForm.points);
    if (!points || points <= 0) {
      toast.error("Please enter a valid point amount");
      return;
    }

    if (!pointAdjustmentForm.reason.trim()) {
      toast.error("Please enter a reason for the adjustment");
      return;
    }

    setPointAdjustmentModal((prev) => ({ ...prev, loading: true }));

    try {
      const admin = user || { id: "admin", name: "Admin" };

      if (pointAdjustmentModal.type === "add") {
        await customerPointsService.recordAdminAdd(
          selectedCustomer.id,
          points,
          pointAdjustmentForm.reason.trim(),
          admin
        );
        toast.success(`Successfully added ${points} points`);
      } else {
        // Check if customer has enough points
        const currentPoints = getPointsValue(selectedCustomer);
        if (points > currentPoints) {
          toast.error(
            `Cannot reduce more points than available (${currentPoints})`
          );
          setPointAdjustmentModal((prev) => ({ ...prev, loading: false }));
          return;
        }

        await customerPointsService.recordAdminReduce(
          selectedCustomer.id,
          points,
          pointAdjustmentForm.reason.trim(),
          admin
        );
        toast.success(`Successfully reduced ${points} points`);
      }

      // Refresh customer data
      const updatedCustomer = await customersService.get(selectedCustomer.id);
      setSelectedCustomer(updatedCustomer);
      loadPointsHistory(updatedCustomer);

      // Reset form and close modal
      setPointAdjustmentForm({ points: "", reason: "" });
      setPointAdjustmentModal({ open: false, type: null, loading: false });
    } catch (error) {
      console.error("Error adjusting points:", error);
      toast.error("Failed to adjust points");
    } finally {
      setPointAdjustmentModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Navigate to receipt detail
  const handleViewReceipt = (receiptId) => {
    if (receiptId) {
      router.push(`/admin/reports/receipts?id=${receiptId}`);
    }
  };

  const handleFetchFromKiosk = async () => {
    try {
      setIsFetchingFromKiosk(true);
      toast.info("Fetching customers from Kiosk...");

      // Fetch customers from kiosk API
      const kioskUrl = "https://candy-kush-kiosk.vercel.app/api/customers";
      const response = await fetch(kioskUrl);

      if (!response.ok) {
        throw new Error(`Kiosk API error: ${response.status}`);
      }

      const result = await response.json();
      console.log("🏪 Kiosk API Response:", result);

      if (!result.success || !result.data) {
        throw new Error("Invalid response from Kiosk API");
      }

      const kioskCustomers = result.data;
      console.log("🏪 Fetched customers from Kiosk:", kioskCustomers);
      console.log("🏪 Number of customers:", kioskCustomers.length);

      // Transform kiosk customer data to POS format
      const transformedCustomers = kioskCustomers.map((kioskCustomer) => ({
        // Identifiers
        id: kioskCustomer.id || kioskCustomer.customerId,
        customerId: kioskCustomer.customerId,
        memberId: kioskCustomer.memberId,

        // Personal Information
        name: kioskCustomer.name || kioskCustomer.firstName || "",
        lastName: kioskCustomer.lastName || "",
        nickname: kioskCustomer.nickname || "",
        nationality: kioskCustomer.nationality || "",
        dateOfBirth: kioskCustomer.dateOfBirth || kioskCustomer.dob || "",

        // Contact
        email: kioskCustomer.email || "",
        phone: kioskCustomer.phone || kioskCustomer.cell || "",
        cell: kioskCustomer.cell || kioskCustomer.phone || "",

        // Member Status
        isNoMember: kioskCustomer.isNoMember || false,
        isActive: kioskCustomer.isActive !== false,

        // Points & Loyalty (use pointList system)
        pointList: kioskCustomer.pointList || [],
        totalSpent: kioskCustomer.totalSpent || 0,
        totalVisits: kioskCustomer.totalVisits || 0,

        // Kiosk Permissions
        allowedCategories: kioskCustomer.allowedCategories || [],

        // Tags - Add "kiosk" tag to identify source
        tags: ["kiosk"],

        // Metadata
        source: "kiosk",
        syncedToKiosk: true, // Already in Kiosk, so it's synced
        lastSyncedAt: new Date().toISOString(),
        createdAt: kioskCustomer.createdAt || new Date().toISOString(),
        updatedAt: kioskCustomer.updatedAt || new Date().toISOString(),
      }));

      // Save to Firebase (create or update)
      const savePromises = transformedCustomers.map(async (customer) => {
        try {
          // Check if customer already exists
          const existing = await customersService.get(customer.id);

          if (existing) {
            // Update existing customer
            await customersService.update(customer.id, customer);
            console.log(`✅ Updated customer: ${customer.name}`);
          } else {
            // Create new customer
            await customersService.create(customer);
            console.log(`✅ Created customer: ${customer.name}`);
          }
        } catch (error) {
          console.error(`❌ Error saving customer ${customer.name}:`, error);
          throw error;
        }
      });

      await Promise.all(savePromises);
      console.log("💾 All Kiosk customers saved to Firebase");

      // Fetch ALL customers from Firebase (not just kiosk)
      const allCustomers = await customersService.getAll();
      console.log("📊 Total customers in Firebase:", allCustomers.length);

      // Sync all customers to IndexedDB
      await dbService.upsertCustomers(allCustomers);

      // Update UI with all customers (mixed data)
      setCustomers(allCustomers);
      setFilteredCustomers(allCustomers);

      toast.success(
        `Successfully imported ${transformedCustomers.length} customers from Kiosk. Showing all ${allCustomers.length} customers.`
      );
    } catch (error) {
      console.error("Error fetching customers from Kiosk:", error);
      toast.error(`Failed to fetch from Kiosk: ${error.message}`);
    } finally {
      setIsFetchingFromKiosk(false);
    }
  };

  const filterCustomers = () => {
    let filtered = customers;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (customer) =>
          customer.name?.toLowerCase().includes(query) ||
          customer.email?.toLowerCase().includes(query) ||
          customer.phone?.includes(query) ||
          customer.cell?.includes(query) ||
          customer.customerCode?.toLowerCase().includes(query) ||
          customer.customerId?.toLowerCase().includes(query) ||
          customer.memberId?.toLowerCase().includes(query)
      );
    }

    setFilteredCustomers(filtered);
  };

  // Bulk selection handlers
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

  const handleBulkDelete = () => {
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

  const {
    active: activeCustomers,
    expired: expiredCustomers,
    notSet: notSetCustomers,
  } = categorizeCustomers(filteredCustomers);

  const handleAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: "",
      lastName: "",
      nickname: "",
      nationality: "",
      passportNumber: "",
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

  const handleEdit = (customer, useModal = false) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || "",
      lastName: customer.lastName || "",
      nickname: customer.nickname || "",
      nationality: customer.nationality || "",
      passportNumber: customer.passportNumber || "",
      dateOfBirth: customer.dateOfBirth || "",
      email: customer.email || "",
      cell: customer.cell || customer.phone || "",
      memberId: customer.customerId || customer.memberId || "",
      customPoints: customer.customPoints || 0,
      isNoMember: customer.isNoMember || false,
      isActive: customer.isActive !== false,
      allowedCategories: customer.allowedCategories || [],
      expiryDate: customer.expiryDate || "",
    });
    if (useModal) {
      setIsModalOpen(true);
    } else {
      // Use in-page edit mode
      setSelectedCustomer(customer);
      setViewMode("edit");
    }
  };

  const handleDelete = (customer) => {
    setDeleteModal({
      open: true,
      type: "single",
      customer: customer,
      loading: false,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.customer) return;
    setDeleteModal((prev) => ({ ...prev, loading: true }));

    try {
      await dbService.deleteCustomer(deleteModal.customer.id);
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
      // Generate customerId for new customers, or use the form value if editing
      let customerId = formData.memberId || editingCustomer?.customerId;
      if (!customerId) {
        const customerCount = customers.length + 1;
        customerId = `CK-${customerCount.toString().padStart(4, "0")}`;
      }

      const customerData = {
        // Customer Identification - both fields should be the same
        customerId: customerId,
        memberId: customerId,

        // Personal Information (required)
        name: formData.name.trim(),
        lastName: formData.lastName.trim(),
        nickname: formData.nickname.trim(),
        nationality: formData.nationality.trim(),
        passportNumber: formData.passportNumber.trim(),
        dateOfBirth: formData.dateOfBirth,

        // Contact Information
        email: formData.email.trim(),
        cell: formData.cell.trim(),

        // Member Status & Points
        isNoMember: formData.isNoMember,
        isActive: formData.isActive,
        pointList: editingCustomer?.pointList || [], // Preserve pointList (new cashback system)

        // Purchase History (preserve existing or initialize)
        totalSpent: editingCustomer?.totalSpent || 0,
        visitCount:
          editingCustomer?.visitCount || editingCustomer?.totalVisits || 0,

        // Kiosk Permissions
        allowedCategories: formData.allowedCategories,

        // Expiry Date
        expiryDate: formData.expiryDate || "",

        // Timestamps
        updatedAt: new Date().toISOString(),

        // Source tracking - mark as "local" for customers created in admin/POS
        source: editingCustomer?.source || "local",

        // Kiosk sync status
        syncedToKiosk: false, // Will be true when synced to kiosk
      };

      if (editingCustomer) {
        // Update existing customer
        await customersService.update(editingCustomer.id, customerData);
        await dbService.updateCustomer(editingCustomer.id, customerData);
        toast.success("Customer updated successfully");
      } else {
        // Create new customer
        customerData.id = `cust_${Date.now()}`;
        customerData.createdAt = new Date().toISOString();

        // Also support old field names for compatibility
        customerData.customerCode = customerId;
        customerData.phone = formData.cell;
        customerData.visits = 0;
        customerData.totalVisits = 0;
        customerData.spent = 0;
        customerData.totalSpent = 0;
        customerData.totalPoints = 0;
        customerData.firstVisit = null;
        customerData.lastVisit = null;

        // Save to both Firebase and IndexedDB
        await customersService.create(customerData);
        await dbService.upsertCustomers([customerData]);

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
            passportNumber: customerData.passportNumber || "",
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
      // If we were editing in-page, go back to detail view with updated customer
      if (viewMode === "edit" && editingCustomer) {
        const updatedCustomer = { ...editingCustomer, ...customerData };
        setSelectedCustomer(updatedCustomer);
        setViewMode("detail");
        setEditingCustomer(null);
      }
      loadCustomers();
    } catch (error) {
      console.error("Error saving customer:", error);
      toast.error("Failed to save customer");
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
    try {
      const expiry = customerApprovalService.calculateExpiryDate(duration);
      await customersService.update(customer.id, {
        expiryDate: expiry,
      });
      toast.success(
        `Expiry date set to ${
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

  const formatDate = (dateValue) => {
    if (!dateValue) return "N/A";
    try {
      // Handle Firebase Timestamp
      if (dateValue?.toDate) {
        return dateValue.toDate().toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
      // Handle seconds (Firebase Timestamp object format)
      if (dateValue?.seconds) {
        return new Date(dateValue.seconds * 1000).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
      // Handle regular date string or Date object
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  // Detail View Component
  if (viewMode === "detail" && selectedCustomer) {
    return (
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBackToList}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">
              {selectedCustomer.name} {selectedCustomer.lastName || ""}
            </h1>
            <p className="text-neutral-500">
              Member ID:{" "}
              {selectedCustomer.memberId ||
                selectedCustomer.customerId ||
                "N/A"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleEdit(selectedCustomer)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDelete(selectedCustomer)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Customer Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
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
                      selectedCustomer.totalSpent || selectedCustomer.spent || 0
                    )}
                  </p>
                  <p className="text-sm text-neutral-500">Total Spent</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Award className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">
                    {getPointsValue(selectedCustomer)}
                  </p>
                  <p className="text-sm text-neutral-500">Points</p>
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
                  <p className="text-sm text-neutral-500">Email</p>
                  <p className="font-medium">
                    {selectedCustomer.email || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Phone</p>
                  <p className="font-medium">
                    {selectedCustomer.phone || selectedCustomer.cell || "N/A"}
                  </p>
                </div>
                {selectedCustomer.nationality && (
                  <div>
                    <p className="text-sm text-neutral-500">Nationality</p>
                    <p className="font-medium">
                      {selectedCustomer.nationality}
                    </p>
                  </div>
                )}
                {selectedCustomer.passportNumber && (
                  <div>
                    <p className="text-sm text-neutral-500">Passport Number</p>
                    <p className="font-medium">
                      {selectedCustomer.passportNumber}
                    </p>
                  </div>
                )}
                {selectedCustomer.dateOfBirth && (
                  <div>
                    <p className="text-sm text-neutral-500">Date of Birth</p>
                    <p className="font-medium">
                      {selectedCustomer.dateOfBirth}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Record Information */}
            <Card>
              <CardHeader>
                <CardTitle>Record Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-500">Created</p>
                  <p className="font-medium">
                    {formatDate(selectedCustomer.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Last Updated</p>
                  <p className="font-medium">
                    {formatDate(selectedCustomer.updatedAt)}
                  </p>
                </div>
                {selectedCustomer.firstVisit && (
                  <div>
                    <p className="text-sm text-neutral-500">First Visit</p>
                    <p className="font-medium">
                      {formatDate(selectedCustomer.firstVisit)}
                    </p>
                  </div>
                )}
                {selectedCustomer.lastVisit && (
                  <div>
                    <p className="text-sm text-neutral-500">Last Visit</p>
                    <p className="font-medium">
                      {formatDate(selectedCustomer.lastVisit)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Points History */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Points History
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => {
                      setPointAdjustmentForm({ points: "", reason: "" });
                      setPointAdjustmentModal({
                        open: true,
                        type: "add",
                        loading: false,
                      });
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add Points
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      setPointAdjustmentForm({ points: "", reason: "" });
                      setPointAdjustmentModal({
                        open: true,
                        type: "reduce",
                        loading: false,
                      });
                    }}
                  >
                    <Minus className="h-4 w-4" />
                    Reduce Points
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Total Points Display */}
                <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-purple-700 dark:text-purple-300">
                      Current Balance
                    </span>
                    <span className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                      {getPointsValue(selectedCustomer)} pts
                    </span>
                  </div>
                </div>

                {loadingPointsHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-neutral-400" />
                  </div>
                ) : pointsHistory.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">
                    <Award className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>No points history found</p>
                    <p className="text-xs mt-1">
                      Points are earned from purchases with cashback rules
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {pointsHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {entry.type === "earn" ? (
                              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <Plus className="h-4 w-4" />
                                <span className="font-semibold">
                                  +{entry.points}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                <Minus className="h-4 w-4" />
                                <span className="font-semibold">
                                  -{entry.points}
                                </span>
                              </div>
                            )}
                            <span className="text-sm text-neutral-500">
                              points
                            </span>
                            {entry.source === "admin_adjustment" && (
                              <Badge variant="outline" className="text-xs">
                                Admin
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium">
                            {entry.description}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1">
                            {entry.date && !isNaN(entry.date.getTime()) && (
                              <span>
                                {format(entry.date, "MMM dd, yyyy hh:mm a")}
                              </span>
                            )}
                            {entry.receiptNumber && (
                              <>
                                <span>•</span>
                                <button
                                  onClick={() =>
                                    handleViewReceipt(entry.receiptId)
                                  }
                                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  <Receipt className="h-3 w-3" />#
                                  {entry.receiptNumber}
                                  <ExternalLink className="h-3 w-3" />
                                </button>
                              </>
                            )}
                            {entry.adjustedBy && (
                              <>
                                <span>•</span>
                                <span>by {entry.adjustedBy.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                <div className="p-4 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                  <p className="text-sm text-neutral-500 mb-2">
                    Current Expiry Date
                  </p>
                  <div className="flex items-center gap-2">
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
                          <Badge variant="default" className="bg-green-600">
                            Active
                          </Badge>
                        )}
                      </>
                    ) : (
                      <p className="text-lg font-medium text-neutral-400">
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
                    onClick={() => handleSetExpiry(selectedCustomer, "10days")}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Set to 10 Days from Now
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleSetExpiry(selectedCustomer, "6months")}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Set to 6 Months from Now
                  </Button>
                </div>

                {/* Info */}
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <p className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    Expiry date controls customer access. Expired customers
                    cannot make purchases.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {selectedCustomer.note && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {selectedCustomer.note}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Point Adjustment Modal */}
        <Dialog
          open={pointAdjustmentModal.open}
          onOpenChange={(open) => {
            if (!open && !pointAdjustmentModal.loading) {
              setPointAdjustmentModal({
                open: false,
                type: null,
                loading: false,
              });
              setPointAdjustmentForm({ points: "", reason: "" });
            }
          }}
        >
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {pointAdjustmentModal.type === "add" ? (
                  <>
                    <Plus className="h-5 w-5 text-green-600" />
                    Add Points
                  </>
                ) : (
                  <>
                    <Minus className="h-5 w-5 text-red-600" />
                    Reduce Points
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {pointAdjustmentModal.type === "add"
                  ? "Add points to this customer's balance"
                  : "Reduce points from this customer's balance"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Current Balance Display */}
              <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                <div className="text-sm text-neutral-500">Current Balance</div>
                <div className="text-xl font-bold">
                  {selectedCustomer ? getPointsValue(selectedCustomer) : 0}{" "}
                  points
                </div>
              </div>

              {/* Points Input */}
              <div className="space-y-2">
                <Label htmlFor="adjustmentPoints">
                  Points to{" "}
                  {pointAdjustmentModal.type === "add" ? "Add" : "Reduce"}
                </Label>
                <Input
                  id="adjustmentPoints"
                  type="number"
                  min="1"
                  placeholder="Enter points amount"
                  value={pointAdjustmentForm.points}
                  onChange={(e) =>
                    setPointAdjustmentForm({
                      ...pointAdjustmentForm,
                      points: e.target.value,
                    })
                  }
                />
              </div>

              {/* Reason Input */}
              <div className="space-y-2">
                <Label htmlFor="adjustmentReason">Reason</Label>
                <Textarea
                  id="adjustmentReason"
                  placeholder="Enter reason for adjustment..."
                  value={pointAdjustmentForm.reason}
                  onChange={(e) =>
                    setPointAdjustmentForm({
                      ...pointAdjustmentForm,
                      reason: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>

              {/* Preview */}
              {pointAdjustmentForm.points && (
                <div
                  className={`p-3 rounded-lg border ${
                    pointAdjustmentModal.type === "add"
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                  }`}
                >
                  <div className="text-sm">
                    New Balance:{" "}
                    <span className="font-bold">
                      {pointAdjustmentModal.type === "add"
                        ? (selectedCustomer
                            ? getPointsValue(selectedCustomer)
                            : 0) + parseInt(pointAdjustmentForm.points || 0)
                        : Math.max(
                            0,
                            (selectedCustomer
                              ? getPointsValue(selectedCustomer)
                              : 0) - parseInt(pointAdjustmentForm.points || 0)
                          )}{" "}
                      points
                    </span>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setPointAdjustmentModal({
                    open: false,
                    type: null,
                    loading: false,
                  });
                  setPointAdjustmentForm({ points: "", reason: "" });
                }}
                disabled={pointAdjustmentModal.loading}
              >
                Cancel
              </Button>
              <Button
                variant={
                  pointAdjustmentModal.type === "add"
                    ? "default"
                    : "destructive"
                }
                onClick={handlePointAdjustment}
                disabled={pointAdjustmentModal.loading}
                className="gap-2"
              >
                {pointAdjustmentModal.loading && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {pointAdjustmentModal.type === "add"
                  ? "Add Points"
                  : "Reduce Points"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Edit View Component (in-page)
  if (viewMode === "edit" && selectedCustomer) {
    return (
      <div className="space-y-6">
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
              Edit Customer: {selectedCustomer.name}{" "}
              {selectedCustomer.lastName || ""}
            </h1>
            <p className="text-neutral-500">Update customer information</p>
          </div>
        </div>

        {/* Edit Form */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">
                  Personal Information
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* Name - Required */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="John"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>

                  {/* Last Name */}
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

                  {/* Nickname */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Nickname
                    </label>
                    <Input
                      placeholder="JD"
                      value={formData.nickname}
                      onChange={(e) =>
                        setFormData({ ...formData, nickname: e.target.value })
                      }
                    />
                  </div>

                  {/* Nationality */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Nationality
                    </label>
                    <Input
                      placeholder="Thai"
                      value={formData.nationality}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nationality: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Passport Number */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Passport Number
                    </label>
                    <Input
                      placeholder="A12345678"
                      value={formData.passportNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          passportNumber: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Date of Birth
                    </label>
                    <Input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dateOfBirth: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Phone Number
                    </label>
                    <Input
                      type="tel"
                      placeholder="+66 123 456 789"
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
                  {/* Member ID */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Member ID
                    </label>
                    <Input
                      placeholder="Auto-generated if empty"
                      value={formData.memberId}
                      onChange={(e) =>
                        setFormData({ ...formData, memberId: e.target.value })
                      }
                    />
                  </div>

                  {/* Points */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Custom Points
                    </label>
                    <Input
                      type="number"
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

                  {/* Expiry Date */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Expiry Date
                    </label>
                    <Input
                      type="date"
                      value={
                        formData.expiryDate
                          ? formData.expiryDate.split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setFormData({ ...formData, expiryDate: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setViewMode("detail");
                    setEditingCustomer(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // List View
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
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete ({selectedIds.length})
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleForceFetchFromFirebase}
            disabled={isForceFetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${
                isForceFetching ? "animate-spin" : ""
              }`}
            />
            {isForceFetching ? "Refreshing..." : "Refresh"}
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500">Expiring Soon</p>
                <p className="text-2xl font-bold">
                  {
                    customers.filter(
                      (c) =>
                        c.expiryDate &&
                        customerApprovalService.isExpiringSoon(c.expiryDate)
                    ).length
                  }
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
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
              placeholder="Search by name, email, phone, customer ID, member ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Tables */}
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
                <div className="py-8 text-center text-neutral-500">
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
                                      !activeCustomers.find((c) => c.id === id)
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
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                          Member ID
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                          Points
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                          Visits
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                          Total Spent
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                          Remaining
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                      {activeCustomers.map((customer) => (
                        <tr
                          key={customer.id}
                          className="hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer transition-colors"
                          onClick={() => handleViewDetails(customer)}
                        >
                          <td
                            className="px-4 py-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(customer.id)}
                              onChange={() => handleSelectCustomer(customer.id)}
                              className="rounded border-gray-300 dark:border-gray-600"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                                <UserCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                              </div>
                              <div>
                                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                                  {customer.name} {customer.lastName || ""}
                                </p>
                                {customer.email && (
                                  <p className="text-xs text-neutral-500">
                                    {customer.email}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm text-primary">
                              {customer.memberId || customer.customerId || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                              {getPointsValue(customer)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                              {customer.totalVisits || customer.visits || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-green-600 dark:text-green-400">
                              {formatCurrency(
                                customer.totalSpent || customer.spent || 0
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                getRemainingDays(customer.expiryDate) <= 7
                                  ? "destructive"
                                  : getRemainingDays(customer.expiryDate) <= 30
                                  ? "outline"
                                  : "secondary"
                              }
                              className={
                                getRemainingDays(customer.expiryDate) <= 7
                                  ? ""
                                  : getRemainingDays(customer.expiryDate) <= 30
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
                <div className="py-8 text-center text-neutral-500">
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
                              const allSelected = expiredCustomers.every((c) =>
                                selectedIds.includes(c.id)
                              );
                              if (allSelected) {
                                setSelectedIds((prev) =>
                                  prev.filter(
                                    (id) =>
                                      !expiredCustomers.find((c) => c.id === id)
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
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                          Member ID
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                          Points
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                          Visits
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                          Total Spent
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                          Expired
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                      {expiredCustomers.map((customer) => (
                        <tr
                          key={customer.id}
                          className="hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer transition-colors bg-red-50/30 dark:bg-red-900/10"
                          onClick={() => handleViewDetails(customer)}
                        >
                          <td
                            className="px-4 py-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(customer.id)}
                              onChange={() => handleSelectCustomer(customer.id)}
                              className="rounded border-gray-300 dark:border-gray-600"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                                <UserCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                              </div>
                              <div>
                                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                                  {customer.name} {customer.lastName || ""}
                                </p>
                                {customer.email && (
                                  <p className="text-xs text-neutral-500">
                                    {customer.email}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm text-primary">
                              {customer.memberId || customer.customerId || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                              {getPointsValue(customer)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                              {customer.totalVisits || customer.visits || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-green-600 dark:text-green-400">
                              {formatCurrency(
                                customer.totalSpent || customer.spent || 0
                              )}
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
              <CardTitle className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                <Clock className="h-5 w-5" />
                No Expiry Set ({notSetCustomers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {notSetCustomers.length === 0 ? (
                <div className="py-8 text-center text-neutral-500">
                  All customers have expiry dates set
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-neutral-100 dark:bg-neutral-800">
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
                                      !notSetCustomers.find((c) => c.id === id)
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
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                          Member ID
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                          Points
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                          Visits
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                          Total Spent
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                      {notSetCustomers.map((customer) => (
                        <tr
                          key={customer.id}
                          className="hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer transition-colors"
                          onClick={() => handleViewDetails(customer)}
                        >
                          <td
                            className="px-4 py-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(customer.id)}
                              onChange={() => handleSelectCustomer(customer.id)}
                              className="rounded border-gray-300 dark:border-gray-600"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
                                <UserCircle className="h-5 w-5 text-neutral-500" />
                              </div>
                              <div>
                                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                                  {customer.name} {customer.lastName || ""}
                                </p>
                                {customer.email && (
                                  <p className="text-xs text-neutral-500">
                                    {customer.email}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm text-primary">
                              {customer.memberId || customer.customerId || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                              {getPointsValue(customer)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                              {customer.totalVisits || customer.visits || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-green-600 dark:text-green-400">
                              {formatCurrency(
                                customer.totalSpent || customer.spent || 0
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className="text-xs text-neutral-500"
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
            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">
                Personal Information
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Name - Required */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="John"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                {/* Last Name */}
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

                {/* Nickname */}
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

                {/* Nationality */}
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

                {/* Date of Birth */}
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
                {/* Email */}
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

                {/* Phone */}
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
                {/* Member ID */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Member ID
                  </label>
                  <Input
                    placeholder="Auto-generated if empty"
                    value={formData.memberId}
                    onChange={(e) =>
                      setFormData({ ...formData, memberId: e.target.value })
                    }
                    disabled={!editingCustomer}
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Leave empty to auto-generate
                  </p>
                </div>

                {/* Points */}
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
                      setFormData({ ...formData, customPoints: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Expiry Date Section */}
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

                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Admin can set expiry dates directly. Cashier changes require
                    approval.
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
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  {editingCustomer?.syncedToKiosk
                    ? "This customer is synced with the kiosk system and can be scanned."
                    : "Customer will be synced to kiosk after saving. They will be able to scan their QR code once synced."}
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
                : `Are you sure you want to delete "${deleteModal.customer?.name}"? This action cannot be undone.`}
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
                  handleDeleteConfirm();
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
  );
}
