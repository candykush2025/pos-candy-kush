"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import {
  DollarSign,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Search,
  Filter,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { format } from "date-fns";
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  formatAmountWithCurrency,
} from "@/lib/constants/currencies";

export default function ExpensesSection() {
  const { token, user } = useAuthStore();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Filter states for approved expenses
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterCurrency, setFilterCurrency] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Approval/Denial dialog states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showDenialDialog, setShowDenialDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [processingAction, setProcessingAction] = useState(false);

  // Edit dialog states
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // Inline category editing states
  const [editingCategoryExpenseId, setEditingCategoryExpenseId] =
    useState(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState("");

  // Bulk selection states
  const [selectedExpenses, setSelectedExpenses] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Categories management states
  const [showCategoriesDialog, setShowCategoriesDialog] = useState(false);
  const [showCategoryFormDialog, setShowCategoryFormDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
  });
  const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] =
    useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [allCategories, setAllCategories] = useState([]); // Full category objects with metadata
  const [categoryStats, setCategoryStats] = useState({}); // Usage statistics

  // Get last used currency from localStorage or use default
  const getInitialCurrency = () => {
    if (typeof window !== "undefined") {
      const lastUsedCurrency = localStorage.getItem("lastUsedCurrency");
      // Verify that the saved currency is still in our list
      if (
        lastUsedCurrency &&
        CURRENCIES.some((c) => c.code === lastUsedCurrency)
      ) {
        return lastUsedCurrency;
      }
    }
    return DEFAULT_CURRENCY;
  };

  // Form state
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "General",
    currency: getInitialCurrency(),
    notes: "",
  });

  // Fetch ALL expenses and categories (admin view)
  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      // Fetch ALL expenses - no employeeId filter for admin
      const response = await fetch(`/api/mobile?action=get-expenses`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();

      if (data.success) {
        setExpenses(data.data.expenses || []);
        // Recalculate category stats when expenses change
        if (allCategories.length > 0) {
          calculateCategoryStats(allCategories);
        }
      } else {
        toast.error("Failed to load expenses");
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Error loading expenses");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      console.log(
        "Fetching categories with token:",
        token ? "present" : "missing"
      );
      const response = await fetch(
        "/api/mobile?action=get-expense-categories",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Categories response status:", response.status);

      const data = await response.json();

      if (data.success) {
        console.log("Categories API response:", data);
        // Store full category objects for management
        setAllCategories(data.data || []);

        // Filter only active categories for expense forms
        const activeCategories = (data.data || [])
          .filter((cat) => cat.active !== false)
          .map((cat) => cat.name);

        setCategories(
          activeCategories.length > 0 ? activeCategories : ["General"]
        );

        // Set default category if current one is not in the list
        if (
          activeCategories.length > 0 &&
          !activeCategories.includes(formData.category)
        ) {
          setFormData((prev) => ({ ...prev, category: activeCategories[0] }));
        }

        // Calculate category usage statistics
        calculateCategoryStats(data.data || []);
      } else {
        console.error("Failed to load categories:", data.error);
        // Fallback to default category
        setCategories(["General"]);
        setAllCategories([]);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      // Fallback to default category
      setCategories(["General"]);
      setAllCategories([]);
    }
  };

  // Calculate usage statistics for categories
  const calculateCategoryStats = (categories) => {
    const stats = {};
    categories.forEach((category) => {
      const usageCount = expenses.filter(
        (expense) => expense.category === category.name
      ).length;
      stats[category.name] = usageCount;
    });
    setCategoryStats(stats);
  };

  // Handle category creation
  const handleCreateCategory = async (e) => {
    e.preventDefault();

    if (!categoryFormData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(
        "/api/mobile?action=create-expense-category",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: categoryFormData.name.trim(),
            description: categoryFormData.description?.trim() || "",
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success("Category created successfully");
        setShowCategoryFormDialog(false);
        setCategoryFormData({ name: "", description: "" });
        fetchCategories(); // Refresh categories
      } else {
        toast.error(data.error || "Failed to create category");
      }
    } catch (error) {
      console.error("Error creating category:", error);
      toast.error("Error creating category");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle category update
  const handleUpdateCategory = async (e) => {
    e.preventDefault();

    if (!editingCategory || !categoryFormData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(
        "/api/mobile?action=update-expense-category",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: editingCategory.id,
            name: categoryFormData.name.trim(),
            description: categoryFormData.description?.trim() || "",
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success("Category updated successfully");
        setShowCategoryFormDialog(false);
        setEditingCategory(null);
        setCategoryFormData({ name: "", description: "" });
        fetchCategories(); // Refresh categories
      } else {
        toast.error(data.error || "Failed to update category");
      }
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Error updating category");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle category deletion
  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      setProcessingAction(true);

      const response = await fetch(
        "/api/mobile?action=delete-expense-category",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: categoryToDelete.id,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success("Category deleted successfully");
        setShowDeleteCategoryDialog(false);
        setCategoryToDelete(null);
        fetchCategories(); // Refresh categories
      } else {
        toast.error(data.error || "Failed to delete category");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Error deleting category");
    } finally {
      setProcessingAction(false);
    }
  };

  // Open category form for editing
  const openCategoryForm = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setCategoryFormData({
        name: category.name || "",
        description: category.description || "",
      });
    } else {
      setEditingCategory(null);
      setCategoryFormData({ name: "", description: "" });
    }
    setShowCategoryFormDialog(true);
  };

  // Open delete confirmation
  const openDeleteConfirmation = (category) => {
    setCategoryToDelete(category);
    setShowDeleteCategoryDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.description.trim()) {
      toast.error("Please enter a description");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setSubmitting(true);

      const now = new Date();
      const expenseData = {
        description: formData.description.trim(),
        amount: amount,
        currency: formData.currency || DEFAULT_CURRENCY,
        exchangeRate: 1.0, // Can be enhanced with real-time rates later
        date: format(now, "yyyy-MM-dd"),
        time: format(now, "HH:mm"),
        category: formData.category,
        employeeId: null, // Admin expenses don't have employeeId
        employeeName: "Unknown",
        source: "BackOffice", // Admin creates from BackOffice
        notes: formData.notes?.trim() || "",
        createdBy: user?.uid || user?.id,
        createdByName:
          user?.displayName || user?.name || user?.email || "Admin User",
        createdByRole: "admin", // This triggers auto-approval
      };

      const response = await fetch("/api/mobile?action=create-expense", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(expenseData),
      });

      const data = await response.json();

      if (data.success) {
        // Save the currency to localStorage for next time
        if (typeof window !== "undefined") {
          localStorage.setItem("lastUsedCurrency", formData.currency);
        }

        toast.success("Expense created and auto-approved");
        setShowAddDialog(false);

        // Reset form but keep the currency
        const savedCurrency = formData.currency;
        setFormData({
          description: "",
          amount: "",
          category: "General",
          currency: savedCurrency, // Keep the last used currency
          notes: "",
        });
        fetchExpenses(); // Refresh list
      } else {
        toast.error(data.error || "Failed to create expense");
      }
    } catch (error) {
      console.error("Error creating expense:", error);
      toast.error("Error submitting expense");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle expense approval
  const handleApprove = async () => {
    if (!selectedExpense) return;

    try {
      setProcessingAction(true);

      const response = await fetch("/api/mobile?action=approve-expense", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expenseId: selectedExpense.id,
          approvedBy: user?.uid || user?.id,
          approvedByName:
            user?.displayName || user?.name || user?.email || "Admin",
          notes: approvalNotes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Expense approved successfully");
        setShowApprovalDialog(false);
        setSelectedExpense(null);
        setApprovalNotes("");
        fetchExpenses();
      } else {
        toast.error(data.error || "Failed to approve expense");
      }
    } catch (error) {
      console.error("Error approving expense:", error);
      toast.error("Error approving expense");
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle expense denial
  const handleDeny = async () => {
    if (!selectedExpense) return;

    if (!approvalNotes.trim()) {
      toast.error("Please provide a reason for denial");
      return;
    }

    try {
      setProcessingAction(true);

      const response = await fetch("/api/mobile?action=deny-expense", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expenseId: selectedExpense.id,
          deniedBy: user?.uid || user?.id,
          deniedByName:
            user?.displayName || user?.name || user?.email || "Admin",
          notes: approvalNotes.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Expense denied");
        setShowDenialDialog(false);
        setSelectedExpense(null);
        setApprovalNotes("");
        fetchExpenses();
      } else {
        toast.error(data.error || "Failed to deny expense");
      }
    } catch (error) {
      console.error("Error denying expense:", error);
      toast.error("Error denying expense");
    } finally {
      setProcessingAction(false);
    }
  };

  // Open edit dialog with expense data
  const openEditDialog = (expense) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description || "",
      amount: expense.amount?.toString() || "",
      category: expense.category || "General",
      currency: expense.currency || DEFAULT_CURRENCY,
      notes: expense.notes || "",
    });
    setShowEditDialog(true);
  };

  // Handle expense update
  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!editingExpense) return;

    // Validation
    if (!formData.description.trim()) {
      toast.error("Please enter a description");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setSubmitting(true);

      // For now, we'll use a workaround: deny the old one and create a new one
      // TODO: Implement proper update-expense API endpoint
      const updateData = {
        description: formData.description.trim(),
        amount: amount,
        currency: formData.currency || DEFAULT_CURRENCY,
        category: formData.category,
        notes: formData.notes?.trim() || "",
      };

      // Update via Firestore directly through a new endpoint or manual update
      toast.info(
        "Update functionality coming soon - please delete and recreate for now"
      );
      setShowEditDialog(false);
      setEditingExpense(null);
      // Reset form but keep the currency
      const savedCurrency = formData.currency;
      setFormData({
        description: "",
        amount: "",
        category: "General",
        currency: savedCurrency, // Keep the last used currency
        notes: "",
      });
    } catch (error) {
      console.error("Error updating expense:", error);
      toast.error("Error updating expense");
    } finally {
      setSubmitting(false);
    }
  };

  // Inline category editing handlers
  const handleStartCategoryEdit = (expense) => {
    setEditingCategoryExpenseId(expense.id);
    setEditingCategoryValue(expense.category || "");
  };

  const handleConfirmCategoryEdit = async (expenseId) => {
    if (!editingCategoryValue.trim()) {
      toast.error("Please select a category");
      return;
    }

    try {
      const response = await fetch("/api/mobile?action=edit-expense", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: expenseId,
          category: editingCategoryValue.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Category updated successfully");
        // Update the expense in the local state
        setExpenses((prevExpenses) =>
          prevExpenses.map((exp) =>
            exp.id === expenseId
              ? { ...exp, category: editingCategoryValue.trim() }
              : exp
          )
        );
      } else {
        toast.error(data.error || "Failed to update category");
      }
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Error updating category");
    } finally {
      setEditingCategoryExpenseId(null);
      setEditingCategoryValue("");
    }
  };

  const handleCancelCategoryEdit = () => {
    setEditingCategoryExpenseId(null);
    setEditingCategoryValue("");
  };

  // Bulk selection handlers
  const handleSelectExpense = (expenseId, checked) => {
    if (checked) {
      setSelectedExpenses((prev) => [...prev, expenseId]);
    } else {
      setSelectedExpenses((prev) => prev.filter((id) => id !== expenseId));
      setSelectAll(false);
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedExpenses(pendingExpenses.map((expense) => expense.id));
      setSelectAll(true);
    } else {
      setSelectedExpenses([]);
      setSelectAll(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedExpenses.length === 0) {
      toast.error("Please select expenses to approve");
      return;
    }

    try {
      setProcessingAction(true);
      const approvalPromises = selectedExpenses.map((expenseId) =>
        fetch("/api/mobile?action=approve-expense", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            expenseId,
            approvedBy: user?.id || "admin",
            approvedByName: user?.name || user?.email || "Admin",
            notes: `Bulk approved ${selectedExpenses.length} expenses`,
          }),
        })
      );

      const results = await Promise.all(approvalPromises);
      const failures = results.filter((result) => !result.ok);

      if (failures.length === 0) {
        toast.success(
          `Successfully approved ${selectedExpenses.length} expenses`
        );
        // Update local state
        setExpenses((prevExpenses) =>
          prevExpenses.map((exp) =>
            selectedExpenses.includes(exp.id)
              ? {
                  ...exp,
                  status: "approved",
                  approvedBy: user?.id || "admin",
                  approvedByName: user?.name || user?.email || "Admin",
                  approvedAt: new Date().toISOString(),
                  approvalNotes: `Bulk approved ${selectedExpenses.length} expenses`,
                }
              : exp
          )
        );
        setSelectedExpenses([]);
        setSelectAll(false);
      } else {
        toast.error(`Failed to approve ${failures.length} expenses`);
      }
    } catch (error) {
      console.error("Error bulk approving expenses:", error);
      toast.error("Error approving expenses");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleBulkDeny = async () => {
    if (selectedExpenses.length === 0) {
      toast.error("Please select expenses to deny");
      return;
    }

    try {
      setProcessingAction(true);
      const denialPromises = selectedExpenses.map((expenseId) =>
        fetch("/api/mobile?action=deny-expense", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            expenseId,
            deniedBy: user?.id || "admin",
            deniedByName: user?.name || user?.email || "Admin",
            notes: `Bulk denied ${selectedExpenses.length} expenses`,
          }),
        })
      );

      const results = await Promise.all(denialPromises);
      const failures = results.filter((result) => !result.ok);

      if (failures.length === 0) {
        toast.success(
          `Successfully denied ${selectedExpenses.length} expenses`
        );
        // Update local state
        setExpenses((prevExpenses) =>
          prevExpenses.map((exp) =>
            selectedExpenses.includes(exp.id)
              ? {
                  ...exp,
                  status: "denied",
                  approvedBy: user?.id || "admin",
                  approvedByName: user?.name || user?.email || "Admin",
                  approvedAt: new Date().toISOString(),
                  approvalNotes: `Bulk denied ${selectedExpenses.length} expenses`,
                }
              : exp
          )
        );
        setSelectedExpenses([]);
        setSelectAll(false);
      } else {
        toast.error(`Failed to deny ${failures.length} expenses`);
      }
    } catch (error) {
      console.error("Error bulk denying expenses:", error);
      toast.error("Error denying expenses");
    } finally {
      setProcessingAction(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        );
      case "denied":
        return (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="mr-1 h-3 w-3" />
            Denied
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  // Summary stats
  const stats = {
    total: expenses.length,
    pending: expenses.filter((e) => e.status === "pending").length,
    approved: expenses.filter((e) => e.status === "approved").length,
    denied: expenses.filter((e) => e.status === "denied").length,
    totalAmount: expenses
      .filter((e) => e.status === "approved")
      .reduce((sum, e) => sum + e.amount, 0),
  };

  // Filter expenses by status
  const pendingExpenses = expenses.filter((e) => e.status === "pending");
  const approvedExpenses = expenses.filter((e) => e.status === "approved");

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Expense Management
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Review and manage all employee expenses
            </p>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            size="lg"
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Expense
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total}
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 dark:border-yellow-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                Pending Approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-500">
                {stats.pending}
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-500">
                {stats.approved}
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">
                Denied
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700 dark:text-red-500">
                {stats.denied}
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Approved Amount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-500">
                {formatCurrency(stats.totalAmount)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Categories Management Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Expense Categories</CardTitle>
                <CardDescription>
                  Manage expense categories used throughout the system
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCategoriesDialog(true)}
                  size="sm"
                >
                  <Search className="mr-2 h-4 w-4" />
                  View All
                </Button>
                <Button
                  onClick={() => openCategoryForm()}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Category
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {allCategories
                .filter((cat) => cat.active !== false)
                .slice(0, 6)
                .map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">
                        {category.name}
                      </div>
                      {category.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {category.description}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {categoryStats[category.name] || 0} expenses
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openCategoryForm(category)}
                        className="h-8 w-8 p-0"
                      >
                        <span className="sr-only">Edit</span>
                        ✏️
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteConfirmation(category)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        disabled={(categoryStats[category.name] || 0) > 0}
                      >
                        <span className="sr-only">Delete</span>
                        🗑️
                      </Button>
                    </div>
                  </div>
                ))}
              {allCategories.filter((cat) => cat.active !== false).length ===
                0 && (
                <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>
                    No categories found. Create your first category to get
                    started.
                  </p>
                </div>
              )}
              {allCategories.filter((cat) => cat.active !== false).length >
                6 && (
                <div className="col-span-full text-center">
                  <Button
                    variant="link"
                    onClick={() => setShowCategoriesDialog(true)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    View all{" "}
                    {allCategories.filter((cat) => cat.active !== false).length}{" "}
                    categories
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Pending Approval Section - Only show if there are pending expenses */}
            {pendingExpenses.length > 0 && (
              <Card className="border-yellow-200 dark:border-yellow-800">
                <CardHeader className="bg-yellow-50 dark:bg-yellow-900/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-yellow-900 dark:text-yellow-100 flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Need Approval ({pendingExpenses.length})
                      </CardTitle>
                      <CardDescription>
                        Expenses waiting for your review and approval
                      </CardDescription>
                    </div>
                    {selectedExpenses.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          onClick={handleBulkApprove}
                          disabled={processingAction}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {processingAction ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                          )}
                          Approve ({selectedExpenses.length})
                        </Button>
                        <Button
                          onClick={handleBulkDeny}
                          disabled={processingAction}
                          size="sm"
                          variant="destructive"
                        >
                          {processingAction ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="mr-2 h-4 w-4" />
                          )}
                          Deny ({selectedExpenses.length})
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Select All Checkbox */}
                    {pendingExpenses.length > 1 && (
                      <div className="flex items-center space-x-2 pb-2 border-b border-yellow-200 dark:border-yellow-800">
                        <Checkbox
                          id="select-all"
                          checked={selectAll}
                          onCheckedChange={handleSelectAll}
                        />
                        <label
                          htmlFor="select-all"
                          className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                        >
                          Select All ({pendingExpenses.length})
                        </label>
                      </div>
                    )}

                    {pendingExpenses.map((expense) => (
                      <div
                        key={expense.id}
                        className={`flex items-start gap-3 p-4 border border-yellow-200 dark:border-yellow-800 rounded-lg bg-yellow-50/50 dark:bg-yellow-900/10 ${
                          selectedExpenses.includes(expense.id)
                            ? "ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/10"
                            : ""
                        }`}
                      >
                        <Checkbox
                          checked={selectedExpenses.includes(expense.id)}
                          onCheckedChange={(checked) =>
                            handleSelectExpense(expense.id, checked)
                          }
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {expense.description}
                            </h4>
                            <Badge variant="outline">{expense.category}</Badge>
                            {expense.currency &&
                              expense.currency !== DEFAULT_CURRENCY && (
                                <Badge variant="secondary">
                                  {expense.currency}
                                </Badge>
                              )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 mb-2">
                            <span className="font-medium">
                              {expense.employeeName || "Unknown Employee"}
                            </span>
                            <span>
                              {format(
                                new Date(expense.date || expense.createdAt),
                                "MMM dd, yyyy"
                              )}
                              {expense.time && ` at ${expense.time}`}
                            </span>
                            <span>Source: {expense.source || "POS"}</span>
                          </div>
                          {expense.notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                              &quot;{expense.notes}&quot;
                            </p>
                          )}
                          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                            {expense.currency
                              ? formatAmountWithCurrency(
                                  expense.amount,
                                  expense.currency
                                )
                              : formatCurrency(expense.amount)}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() => {
                              setSelectedExpense(expense);
                              setShowApprovalDialog(true);
                            }}
                            className="bg-green-600 hover:bg-green-700"
                            size="sm"
                          >
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedExpense(expense);
                              setShowDenialDialog(true);
                            }}
                            variant="destructive"
                            size="sm"
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            Deny
                          </Button>
                          <Button
                            onClick={() => openEditDialog(expense)}
                            variant="outline"
                            size="sm"
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Approved Expenses Table */}
            <Card>
              <CardContent className="pt-6">
                {/* Comprehensive Filters */}
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {/* Search */}
                    <div className="space-y-1.5">
                      <Label htmlFor="search" className="text-xs font-medium">
                        Search
                      </Label>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          id="search"
                          placeholder="Description, employee..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8 h-9"
                        />
                      </div>
                    </div>

                    {/* Date From */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="date-from"
                        className="text-xs font-medium"
                      >
                        Date From
                      </Label>
                      <Input
                        id="date-from"
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        className="h-9"
                      />
                    </div>

                    {/* Date To */}
                    <div className="space-y-1.5">
                      <Label htmlFor="date-to" className="text-xs font-medium">
                        Date To
                      </Label>
                      <Input
                        id="date-to"
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        className="h-9"
                      />
                    </div>

                    {/* Employee Filter */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="filter-employee"
                        className="text-xs font-medium"
                      >
                        Employee
                      </Label>
                      <Select
                        value={filterEmployee}
                        onValueChange={setFilterEmployee}
                      >
                        <SelectTrigger id="filter-employee" className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Employees</SelectItem>
                          {[
                            ...new Set(
                              approvedExpenses
                                .map((e) => e.employeeName)
                                .filter(Boolean)
                            ),
                          ]
                            .sort()
                            .map((emp) => (
                              <SelectItem key={emp} value={emp}>
                                {emp}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Category Filter */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="filter-category"
                        className="text-xs font-medium"
                      >
                        Category
                      </Label>
                      <Select
                        value={filterCategory}
                        onValueChange={setFilterCategory}
                      >
                        <SelectTrigger id="filter-category" className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.sort().map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Currency Filter */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="filter-currency"
                        className="text-xs font-medium"
                      >
                        Currency
                      </Label>
                      <Select
                        value={filterCurrency}
                        onValueChange={setFilterCurrency}
                      >
                        <SelectTrigger id="filter-currency" className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Currencies</SelectItem>
                          {[
                            ...new Set(
                              approvedExpenses.map(
                                (e) => e.currency || DEFAULT_CURRENCY
                              )
                            ),
                          ]
                            .sort()
                            .map((curr) => (
                              <SelectItem key={curr} value={curr}>
                                {curr}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Source Filter */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="filter-source"
                        className="text-xs font-medium"
                      >
                        Source
                      </Label>
                      <Select
                        value={filterSource}
                        onValueChange={setFilterSource}
                      >
                        <SelectTrigger id="filter-source" className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sources</SelectItem>
                          <SelectItem value="POS">POS</SelectItem>
                          <SelectItem value="BackOffice">BackOffice</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Clear Filters Button */}
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchQuery("");
                          setFilterDateFrom("");
                          setFilterDateTo("");
                          setFilterEmployee("all");
                          setFilterCategory("all");
                          setFilterCurrency("all");
                          setFilterSource("all");
                        }}
                        className="h-9"
                      >
                        <Filter className="mr-2 h-4 w-4" />
                        Clear Filters
                      </Button>
                    </div>

                    {/* Results Count */}
                    <div className="flex items-end">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Showing{" "}
                        {
                          approvedExpenses.filter((expense) => {
                            const matchesSearch =
                              searchQuery === "" ||
                              expense.description
                                ?.toLowerCase()
                                .includes(searchQuery.toLowerCase()) ||
                              expense.employeeName
                                ?.toLowerCase()
                                .includes(searchQuery.toLowerCase());
                            const matchesCategory =
                              filterCategory === "all" ||
                              expense.category === filterCategory;
                            const matchesCurrency =
                              filterCurrency === "all" ||
                              expense.currency === filterCurrency;
                            const matchesSource =
                              filterSource === "all" ||
                              expense.source === filterSource;
                            const matchesEmployee =
                              filterEmployee === "all" ||
                              expense.employeeName === filterEmployee;

                            // Date filtering
                            let matchesDate = true;
                            if (filterDateFrom || filterDateTo) {
                              const expenseDate = new Date(
                                expense.date || expense.createdAt
                              );
                              if (filterDateFrom) {
                                const fromDate = new Date(filterDateFrom);
                                matchesDate =
                                  matchesDate && expenseDate >= fromDate;
                              }
                              if (filterDateTo) {
                                const toDate = new Date(filterDateTo);
                                toDate.setHours(23, 59, 59, 999); // End of day
                                matchesDate =
                                  matchesDate && expenseDate <= toDate;
                              }
                            }

                            return (
                              matchesSearch &&
                              matchesCategory &&
                              matchesCurrency &&
                              matchesSource &&
                              matchesEmployee &&
                              matchesDate
                            );
                          }).length
                        }{" "}
                        of {approvedExpenses.length} expenses
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table */}
                {approvedExpenses.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <DollarSign className="mx-auto h-12 w-12 mb-2" />
                    <p>No approved expenses yet</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 dark:bg-gray-800">
                            <TableHead className="font-semibold">
                              Date
                            </TableHead>
                            <TableHead className="font-semibold">
                              Employee
                            </TableHead>
                            <TableHead className="font-semibold">
                              Description
                            </TableHead>
                            <TableHead className="font-semibold">
                              Category
                            </TableHead>
                            <TableHead className="font-semibold text-right">
                              Amount
                            </TableHead>
                            <TableHead className="font-semibold">
                              Currency
                            </TableHead>
                            <TableHead className="font-semibold">
                              Source
                            </TableHead>
                            <TableHead className="font-semibold">
                              Approved By
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {approvedExpenses
                            .filter((expense) => {
                              const matchesSearch =
                                searchQuery === "" ||
                                expense.description
                                  ?.toLowerCase()
                                  .includes(searchQuery.toLowerCase()) ||
                                expense.employeeName
                                  ?.toLowerCase()
                                  .includes(searchQuery.toLowerCase());
                              const matchesCategory =
                                filterCategory === "all" ||
                                expense.category === filterCategory;
                              const matchesCurrency =
                                filterCurrency === "all" ||
                                expense.currency === filterCurrency;
                              const matchesSource =
                                filterSource === "all" ||
                                expense.source === filterSource;
                              const matchesEmployee =
                                filterEmployee === "all" ||
                                expense.employeeName === filterEmployee;

                              // Date filtering
                              let matchesDate = true;
                              if (filterDateFrom || filterDateTo) {
                                const expenseDate = new Date(
                                  expense.date || expense.createdAt
                                );
                                if (filterDateFrom) {
                                  const fromDate = new Date(filterDateFrom);
                                  matchesDate =
                                    matchesDate && expenseDate >= fromDate;
                                }
                                if (filterDateTo) {
                                  const toDate = new Date(filterDateTo);
                                  toDate.setHours(23, 59, 59, 999); // End of day
                                  matchesDate =
                                    matchesDate && expenseDate <= toDate;
                                }
                              }

                              return (
                                matchesSearch &&
                                matchesCategory &&
                                matchesCurrency &&
                                matchesSource &&
                                matchesEmployee &&
                                matchesDate
                              );
                            })
                            .sort((a, b) => {
                              const dateA = new Date(a.date || a.createdAt);
                              const dateB = new Date(b.date || b.createdAt);
                              return dateB - dateA; // Most recent first
                            })
                            .map((expense) => (
                              <TableRow
                                key={expense.id}
                                className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                              >
                                <TableCell className="font-medium whitespace-nowrap">
                                  {format(
                                    new Date(expense.date || expense.createdAt),
                                    "MMM dd, yyyy"
                                  )}
                                  {expense.time && (
                                    <div className="text-xs text-gray-500">
                                      {expense.time}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  <div className="font-medium">
                                    {expense.employeeName || "Unknown"}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="max-w-xs">
                                    <div className="font-medium text-gray-900 dark:text-white">
                                      {expense.description}
                                    </div>
                                    {expense.notes && (
                                      <div className="text-xs text-gray-500 mt-1 italic line-clamp-2">
                                        {expense.notes}
                                      </div>
                                    )}
                                    {expense.approvalNotes &&
                                      expense.approvalNotes !==
                                        "Auto-approved (Admin)" && (
                                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                          {expense.approvalNotes}
                                        </div>
                                      )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {editingCategoryExpenseId === expense.id ? (
                                    <div className="flex items-center gap-2">
                                      <Select
                                        value={editingCategoryValue}
                                        onValueChange={setEditingCategoryValue}
                                      >
                                        <SelectTrigger className="h-8 w-32">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {categories.map((cat) => (
                                            <SelectItem key={cat} value={cat}>
                                              {cat}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                          handleConfirmCategoryEdit(expense.id)
                                        }
                                        className="h-8 w-8 p-0"
                                      >
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleCancelCategoryEdit}
                                        className="h-8 w-8 p-0"
                                      >
                                        <XCircle className="h-4 w-4 text-red-600" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="whitespace-nowrap cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                      onClick={() =>
                                        handleStartCategoryEdit(expense)
                                      }
                                    >
                                      {expense.category}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="font-bold text-gray-900 dark:text-white text-right whitespace-nowrap">
                                  {expense.currency
                                    ? formatAmountWithCurrency(
                                        expense.amount,
                                        expense.currency
                                      )
                                    : formatCurrency(expense.amount)}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="secondary"
                                    className="whitespace-nowrap"
                                  >
                                    {expense.currency || DEFAULT_CURRENCY}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      expense.source === "BackOffice"
                                        ? "default"
                                        : "outline"
                                    }
                                    className={
                                      expense.source === "BackOffice"
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                        : ""
                                    }
                                  >
                                    {expense.source || "POS"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {expense.approvedByName || "N/A"}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                    {approvedExpenses.filter((expense) => {
                      const matchesSearch =
                        searchQuery === "" ||
                        expense.description
                          ?.toLowerCase()
                          .includes(searchQuery.toLowerCase()) ||
                        expense.employeeName
                          ?.toLowerCase()
                          .includes(searchQuery.toLowerCase());
                      const matchesCategory =
                        filterCategory === "all" ||
                        expense.category === filterCategory;
                      const matchesCurrency =
                        filterCurrency === "all" ||
                        expense.currency === filterCurrency;
                      const matchesSource =
                        filterSource === "all" ||
                        expense.source === filterSource;
                      const matchesEmployee =
                        filterEmployee === "all" ||
                        expense.employeeName === filterEmployee;

                      // Date filtering
                      let matchesDate = true;
                      if (filterDateFrom || filterDateTo) {
                        const expenseDate = new Date(
                          expense.date || expense.createdAt
                        );
                        if (filterDateFrom) {
                          const fromDate = new Date(filterDateFrom);
                          matchesDate = matchesDate && expenseDate >= fromDate;
                        }
                        if (filterDateTo) {
                          const toDate = new Date(filterDateTo);
                          toDate.setHours(23, 59, 59, 999);
                          matchesDate = matchesDate && expenseDate <= toDate;
                        }
                      }

                      return (
                        matchesSearch &&
                        matchesCategory &&
                        matchesCurrency &&
                        matchesSource &&
                        matchesEmployee &&
                        matchesDate
                      );
                    }).length === 0 &&
                      approvedExpenses.length > 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                          <Filter className="mx-auto h-8 w-8 mb-2" />
                          <p className="font-medium">
                            No expenses match your filters
                          </p>
                          <Button
                            variant="link"
                            onClick={() => {
                              setSearchQuery("");
                              setFilterDateFrom("");
                              setFilterDateTo("");
                              setFilterEmployee("all");
                              setFilterCategory("all");
                              setFilterCurrency("all");
                              setFilterSource("all");
                            }}
                            className="mt-2"
                          >
                            Clear all filters
                          </Button>
                        </div>
                      )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Expense</DialogTitle>
            <DialogDescription>
              Add a new expense from the back office. This expense will be
              auto-approved.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                placeholder="e.g., Office supplies - printer paper"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => {
                  setFormData({ ...formData, currency: value });
                  // Save to localStorage immediately when user changes currency
                  if (typeof window !== "undefined") {
                    localStorage.setItem("lastUsedCurrency", value);
                  }
                }}
                disabled={submitting}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code}>
                      {curr.code} - {curr.name} ({curr.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
                disabled={submitting}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Categories are managed by admin
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional details or context..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                disabled={submitting}
                rows={3}
              />
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-700 dark:text-green-300">
                <AlertCircle className="inline h-4 w-4 mr-1" />
                As an admin, this expense will be automatically approved and
                added to the system immediately.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Expense
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Expense</DialogTitle>
            <DialogDescription>
              Review and approve this expense request
            </DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {selectedExpense.description}
                </h4>
                <div className="text-2xl font-bold text-green-600">
                  {selectedExpense.currency
                    ? formatAmountWithCurrency(
                        selectedExpense.amount,
                        selectedExpense.currency
                      )
                    : formatCurrency(selectedExpense.amount)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>Employee: {selectedExpense.employeeName}</p>
                  <p>Category: {selectedExpense.category}</p>
                  <p>
                    Date:{" "}
                    {format(
                      new Date(
                        selectedExpense.date || selectedExpense.createdAt
                      ),
                      "MMM dd, yyyy"
                    )}
                  </p>
                  {selectedExpense.notes && (
                    <p className="italic mt-2">
                      &quot;{selectedExpense.notes}&quot;
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="approval-notes">Admin Notes (Optional)</Label>
                <Textarea
                  id="approval-notes"
                  placeholder="Add any notes about this approval..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowApprovalDialog(false);
                    setSelectedExpense(null);
                    setApprovalNotes("");
                  }}
                  disabled={processingAction}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={processingAction}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processingAction ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve Expense
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Denial Dialog */}
      <Dialog open={showDenialDialog} onOpenChange={setShowDenialDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Expense</DialogTitle>
            <DialogDescription>
              Provide a reason for denying this expense request
            </DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {selectedExpense.description}
                </h4>
                <div className="text-2xl font-bold text-red-600">
                  {selectedExpense.currency
                    ? formatAmountWithCurrency(
                        selectedExpense.amount,
                        selectedExpense.currency
                      )
                    : formatCurrency(selectedExpense.amount)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>Employee: {selectedExpense.employeeName}</p>
                  <p>Category: {selectedExpense.category}</p>
                  <p>
                    Date:{" "}
                    {format(
                      new Date(
                        selectedExpense.date || selectedExpense.createdAt
                      ),
                      "MMM dd, yyyy"
                    )}
                  </p>
                  {selectedExpense.notes && (
                    <p className="italic mt-2">
                      &quot;{selectedExpense.notes}&quot;
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="denial-notes">Reason for Denial *</Label>
                <Textarea
                  id="denial-notes"
                  placeholder="Please explain why this expense is being denied..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={3}
                  className="border-red-300 focus:border-red-500"
                />
                <p className="text-xs text-gray-500">
                  This reason will be shared with the employee
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDenialDialog(false);
                    setSelectedExpense(null);
                    setApprovalNotes("");
                  }}
                  disabled={processingAction}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeny}
                  disabled={processingAction || !approvalNotes.trim()}
                  variant="destructive"
                >
                  {processingAction ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Denying...
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Deny Expense
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>
              Update the expense details. Note: Update functionality is
              currently limited.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description *</Label>
              <Input
                id="edit-description"
                placeholder="e.g., Office supplies - printer paper"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-amount">Amount *</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => {
                  setFormData({ ...formData, currency: value });
                  // Save to localStorage immediately when user changes currency
                  if (typeof window !== "undefined") {
                    localStorage.setItem("lastUsedCurrency", value);
                  }
                }}
                disabled={submitting}
              >
                <SelectTrigger id="edit-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code}>
                      {curr.code} - {curr.name} ({curr.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
                disabled={submitting}
              >
                <SelectTrigger id="edit-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes (Optional)</Label>
              <Textarea
                id="edit-notes"
                placeholder="Additional details or context..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                disabled={submitting}
                rows={3}
              />
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                <AlertCircle className="inline h-4 w-4 mr-1" />
                Update functionality is currently limited. For now, please
                delete and recreate expenses to make changes.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Update (Limited)
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Categories Management Dialog */}
      <Dialog
        open={showCategoriesDialog}
        onOpenChange={setShowCategoriesDialog}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Expense Categories</DialogTitle>
            <DialogDescription>
              Complete list of all expense categories in the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {allCategories.filter((cat) => cat.active !== false).length}{" "}
                active categories
              </p>
              <Button
                onClick={() => {
                  setShowCategoriesDialog(false);
                  openCategoryForm();
                }}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allCategories
                .filter((cat) => cat.active !== false)
                .map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {category.name}
                      </div>
                      {category.description && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {category.description}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {categoryStats[category.name] || 0} expenses • Created{" "}
                        {format(new Date(category.createdAt), "MMM dd, yyyy")}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowCategoriesDialog(false);
                          openCategoryForm(category);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setShowCategoriesDialog(false);
                          openDeleteConfirmation(category);
                        }}
                        disabled={(categoryStats[category.name] || 0) > 0}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              {allCategories.filter((cat) => cat.active !== false).length ===
                0 && (
                <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>
                    No categories found. Create your first category to get
                    started.
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Form Dialog */}
      <Dialog
        open={showCategoryFormDialog}
        onOpenChange={setShowCategoryFormDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Add New Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update the category details"
                : "Create a new expense category for organizing expenses"}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={
              editingCategory ? handleUpdateCategory : handleCreateCategory
            }
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="category-name">Category Name *</Label>
              <Input
                id="category-name"
                placeholder="e.g., Office Supplies, Travel, Equipment"
                value={categoryFormData.name}
                onChange={(e) =>
                  setCategoryFormData({
                    ...categoryFormData,
                    name: e.target.value,
                  })
                }
                disabled={submitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-description">
                Description (Optional)
              </Label>
              <Textarea
                id="category-description"
                placeholder="Brief description of this category..."
                value={categoryFormData.description}
                onChange={(e) =>
                  setCategoryFormData({
                    ...categoryFormData,
                    description: e.target.value,
                  })
                }
                disabled={submitting}
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCategoryFormDialog(false);
                  setEditingCategory(null);
                  setCategoryFormData({ name: "", description: "" });
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingCategory ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    {editingCategory ? "Update Category" : "Create Category"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation Dialog */}
      <Dialog
        open={showDeleteCategoryDialog}
        onOpenChange={setShowDeleteCategoryDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this category? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          {categoryToDelete && (
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <h4 className="font-semibold text-red-900 dark:text-red-100">
                  {categoryToDelete.name}
                </h4>
                {categoryToDelete.description && (
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {categoryToDelete.description}
                  </p>
                )}
                <div className="text-sm text-red-700 dark:text-red-300 mt-2">
                  <strong>{categoryStats[categoryToDelete.name] || 0}</strong>{" "}
                  expenses currently use this category
                </div>
              </div>

              {(categoryStats[categoryToDelete.name] || 0) > 0 ? (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    <AlertCircle className="inline h-4 w-4 mr-1" />
                    This category cannot be deleted because it is currently used
                    by {categoryStats[categoryToDelete.name]} expense(s). Remove
                    all expenses from this category first.
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <AlertCircle className="inline h-4 w-4 mr-1" />
                    Deleting this category will permanently remove it from the
                    system.
                  </p>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDeleteCategoryDialog(false);
                    setCategoryToDelete(null);
                  }}
                  disabled={processingAction}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteCategory}
                  disabled={
                    processingAction ||
                    (categoryStats[categoryToDelete.name] || 0) > 0
                  }
                  variant="destructive"
                >
                  {processingAction ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Delete Category
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
