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
  TableFooter,
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
  RefreshCw,
  Trash2,
  History,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { format, subDays } from "date-fns";
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  formatAmountWithCurrency,
} from "@/lib/constants/currencies";
import {
  getAllCurrencyCodes,
  getCurrencyDetails,
} from "@/lib/constants/allCurrencies";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateRangePicker } from "@/components/reports";

export default function ExpensesSection() {
  const { token, user } = useAuthStore();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]); // Store all users from Firebase
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Currency conversion states
  const [displayCurrency, setDisplayCurrency] = useState("THB");
  const [exchangeRates, setExchangeRates] = useState(null);
  const [baseCurrency, setBaseCurrency] = useState("THB");
  const [currencySearch, setCurrencySearch] = useState("");
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  // Filter states for approved expenses
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterCurrency, setFilterCurrency] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
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

  // History dialog states
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [historyExpense, setHistoryExpense] = useState(null);

  // Delete confirmation dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);

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

  // Get last used currency from localStorage or use THB as default
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
    return "THB"; // Default to Thai Baht
  };

  // Form state
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "General",
    currency: getInitialCurrency(),
    notes: "",
    employeeName: "",
  });

  // Fetch ALL expenses and categories (admin view)
  useEffect(() => {
    fetchExpenses();
    fetchCategories();
    fetchUsers();
    loadExchangeRates();
  }, []);

  // Debug: Log users state changes
  useEffect(() => {
    console.log("Users state updated:", users);
  }, [users]);

  // Load exchange rates from Firebase
  const loadExchangeRates = async () => {
    try {
      const docRef = doc(db, "settings", "exchange_rates");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setExchangeRates(data.rates);
        setBaseCurrency(data.baseCurrency || "THB");
      }
    } catch (error) {
      console.error("Error loading exchange rates:", error);
    }
  };

  // Convert amount from one currency to another
  const convertCurrency = (amount, fromCurrency, toCurrency) => {
    if (!exchangeRates || !amount) return amount;

    // If same currency, no conversion needed
    if (fromCurrency === toCurrency) return amount;

    // If fromCurrency is the base currency
    if (fromCurrency === baseCurrency) {
      const rate = exchangeRates[toCurrency];
      return rate ? amount * rate : amount;
    }

    // If toCurrency is the base currency
    if (toCurrency === baseCurrency) {
      const rate = exchangeRates[fromCurrency];
      return rate ? amount / rate : amount;
    }

    // Convert through base currency: from -> base -> to
    const fromRate = exchangeRates[fromCurrency];
    const toRate = exchangeRates[toCurrency];

    if (fromRate && toRate) {
      const amountInBase = amount / fromRate;
      return amountInBase * toRate;
    }

    return amount; // Fallback if rates not available
  };

  // Format amount in display currency
  const formatInDisplayCurrency = (amount, originalCurrency) => {
    const convertedAmount = convertCurrency(
      amount,
      originalCurrency,
      displayCurrency
    );
    const currencyDetails = getCurrencyDetails(displayCurrency);
    return `${currencyDetails.symbol}${convertedAmount.toFixed(2)}`;
  };

  // Format number with thousand separators
  const formatNumberWithSeparators = (number) => {
    return number.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

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

  // Fetch users from Firebase
  const fetchUsers = async () => {
    try {
      console.log("Fetching users from Firebase...");
      const usersCollection = collection(db, "users");
      const usersSnapshot = await getDocs(usersCollection);
      const usersList = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log("Loaded users count:", usersList.length);
      console.log("Users data:", usersList);
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Error loading users");
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

      const response = await fetch("/api/mobile?action=edit-expense-category", {
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
      });

      const data = await response.json();

      if (data.success) {
        // Close modal immediately
        setShowCategoryFormDialog(false);
        setEditingCategory(null);
        setCategoryFormData({ name: "", description: "" });

        toast.success("Category updated successfully");
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
        // Reset processing state and close both modals immediately
        setProcessingAction(false);
        setShowDeleteCategoryDialog(false);
        setShowCategoryFormDialog(false);
        setCategoryToDelete(null);
        setEditingCategory(null);
        setCategoryFormData({ name: "", description: "" });

        // Show success message
        toast.success("Category deleted successfully");

        // Refresh categories in background
        fetchCategories();
      } else {
        toast.error(data.error || "Failed to delete category");
        setProcessingAction(false);
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Error deleting category");
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

    if (!formData.employeeName) {
      toast.error("Please select an employee");
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
        employeeName: formData.employeeName,
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
      employeeName: expense.employeeName || "Unknown",
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

    if (!formData.employeeName) {
      toast.error("Please select an employee");
      return;
    }

    try {
      setSubmitting(true);

      const updateData = {
        id: editingExpense.id,
        description: formData.description.trim(),
        amount: amount,
        currency: formData.currency || DEFAULT_CURRENCY,
        category: formData.category,
        notes: formData.notes?.trim() || "",
        employeeName: formData.employeeName,
        editedBy: user?.uid || user?.id,
        editedByName: user?.displayName || user?.name || user?.email || "Admin",
      };

      const response = await fetch("/api/mobile?action=edit-expense", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Expense updated successfully");
        setShowEditDialog(false);
        setEditingExpense(null);
        // Reset form but keep the currency
        const savedCurrency = formData.currency;
        setFormData({
          description: "",
          amount: "",
          category: "General",
          currency: savedCurrency,
          notes: "",
          employeeName: "",
        });
        fetchExpenses();
      } else {
        toast.error(data.error || "Failed to update expense");
      }
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
          editedBy: user?.uid || user?.id,
          editedByName:
            user?.displayName || user?.name || user?.email || "Admin",
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

  // Handle expense deletion (soft delete)
  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;

    try {
      setProcessingAction(true);

      const response = await fetch("/api/mobile?action=delete-expense", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: expenseToDelete.id,
          deletedBy: user?.uid || user?.id,
          deletedByName:
            user?.displayName || user?.name || user?.email || "Admin",
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Expense deleted successfully");
        setShowDeleteDialog(false);
        setExpenseToDelete(null);
        fetchExpenses(); // Refresh the list
      } else {
        toast.error(data.error || "Failed to delete expense");
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Error deleting expense");
    } finally {
      setProcessingAction(false);
    }
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (expense) => {
    setExpenseToDelete(expense);
    setShowDeleteDialog(true);
  };

  // Open history dialog
  const openHistoryDialog = (expense) => {
    setHistoryExpense(expense);
    setShowHistoryDialog(true);
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

  // Summary stats with currency conversion
  const stats = {
    total: expenses.length,
    pending: expenses.filter((e) => e.status === "pending").length,
    approved: expenses.filter((e) => e.status === "approved").length,
    denied: expenses.filter((e) => e.status === "denied").length,
    totalAmount: expenses
      .filter((e) => e.status === "approved")
      .reduce((sum, e) => {
        // Convert each expense amount to display currency
        const convertedAmount = convertCurrency(
          e.amount,
          e.currency || "THB",
          displayCurrency
        );
        return sum + convertedAmount;
      }, 0),
  };

  // Filter expenses by status
  const pendingExpenses = expenses.filter((e) => e.status === "pending");
  const approvedExpenses = expenses.filter((e) => e.status === "approved");

  // Filter approved expenses based on all filter criteria
  const filteredApprovedExpenses = approvedExpenses.filter((expense) => {
    const matchesSearch =
      searchQuery === "" ||
      expense.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.employeeName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      filterCategory === "all" || expense.category === filterCategory;
    const matchesCurrency =
      filterCurrency === "all" || expense.currency === filterCurrency;
    const matchesSource =
      filterSource === "all" || expense.source === filterSource;
    const matchesEmployee =
      filterEmployee === "all" || expense.employeeName === filterEmployee;

    // Date filtering
    let matchesDate = true;
    if (dateRange.from || dateRange.to) {
      const expenseDate = new Date(expense.date || expense.createdAt);
      expenseDate.setHours(0, 0, 0, 0); // Normalize to start of day

      if (dateRange.from) {
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        matchesDate = matchesDate && expenseDate >= fromDate;
      }
      if (dateRange.to) {
        const toDate = new Date(dateRange.to);
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
  });

  // Calculate stats for filtered expenses
  const filteredStats = {
    approved: filteredApprovedExpenses.length,
    totalAmount: filteredApprovedExpenses.reduce((sum, e) => {
      const convertedAmount = convertCurrency(
        e.amount,
        e.currency || "THB",
        displayCurrency
      );
      return sum + convertedAmount;
    }, 0),
  };

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
                  <button
                    key={category.id}
                    onClick={() => openCategoryForm(category)}
                    className="flex items-center justify-between p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white truncate">
                        {category.name}
                      </div>
                      {category.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                          {category.description}
                        </div>
                      )}
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">
                        {categoryStats[category.name] || 0} expenses
                      </div>
                    </div>
                    <div className="ml-3 text-gray-400">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </button>
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
                  {/* Date Range - Full Width Row */}
                  <div className="w-full">
                    <Label className="text-xs font-medium mb-1.5 block">
                      Date Range
                    </Label>
                    <DateRangePicker
                      dateRange={dateRange}
                      onDateRangeChange={setDateRange}
                      periodName="last30"
                      showTimeFilter={false}
                    />
                  </div>

                  {/* Other Filters Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                          {users.length === 0 ? (
                            <SelectItem value="loading" disabled>
                              Loading...
                            </SelectItem>
                          ) : (
                            users
                              .sort((a, b) =>
                                (a.name || "").localeCompare(b.name || "")
                              )
                              .map((user) => (
                                <SelectItem key={user.id} value={user.name}>
                                  {user.name}
                                </SelectItem>
                              ))
                          )}
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
                          setDateRange({
                            from: subDays(new Date(), 30),
                            to: new Date(),
                          });
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
                        Showing {filteredApprovedExpenses.length} of{" "}
                        {approvedExpenses.length} expenses
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
                          {filteredApprovedExpenses
                            .sort((a, b) => {
                              const dateA = new Date(a.date || a.createdAt);
                              const dateB = new Date(b.date || b.createdAt);
                              return dateB - dateA; // Most recent first
                            })
                            .map((expense) => (
                              <TableRow
                                key={expense.id}
                                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                                onClick={(e) => {
                                  // Don't trigger if clicking on action buttons or category badge
                                  if (
                                    e.target.closest("button") ||
                                    e.target.closest(".badge-category")
                                  ) {
                                    return;
                                  }
                                  openEditDialog(expense);
                                }}
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
                                      className="badge-category whitespace-nowrap cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartCategoryEdit(expense);
                                      }}
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
                        <TableFooter>
                          <TableRow className="hover:bg-transparent border-t border-border">
                            <TableCell colSpan={4} className="py-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-muted-foreground">
                                  Total Expenses:
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {filteredStats.approved}{" "}
                                  {filteredStats.approved === 1
                                    ? "expense"
                                    : "expenses"}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell colSpan={4} className="py-4 text-right">
                              <div className="flex items-center justify-end gap-3">
                                <Popover
                                  open={showCurrencyPicker}
                                  onOpenChange={setShowCurrencyPicker}
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-[140px] justify-between"
                                    >
                                      <span className="flex items-center gap-1.5">
                                        <DollarSign className="h-3.5 w-3.5" />
                                        {displayCurrency}
                                      </span>
                                      <Search className="h-3.5 w-3.5 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-[300px] p-0"
                                    align="end"
                                  >
                                    <div className="flex items-center border-b px-3 py-2">
                                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                      <Input
                                        placeholder="Search currency..."
                                        value={currencySearch}
                                        onChange={(e) =>
                                          setCurrencySearch(e.target.value)
                                        }
                                        className="border-0 p-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
                                      />
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto p-1">
                                      {getAllCurrencyCodes()
                                        .filter((code) => {
                                          const details =
                                            getCurrencyDetails(code);
                                          const searchLower =
                                            currencySearch.toLowerCase();
                                          return (
                                            code
                                              .toLowerCase()
                                              .includes(searchLower) ||
                                            details.name
                                              .toLowerCase()
                                              .includes(searchLower)
                                          );
                                        })
                                        .map((code) => {
                                          const details =
                                            getCurrencyDetails(code);
                                          const isSelected =
                                            displayCurrency === code;
                                          return (
                                            <Button
                                              key={code}
                                              variant={
                                                isSelected
                                                  ? "secondary"
                                                  : "ghost"
                                              }
                                              className="w-full justify-start text-left font-normal"
                                              onClick={() => {
                                                setDisplayCurrency(code);
                                                setShowCurrencyPicker(false);
                                                setCurrencySearch("");
                                              }}
                                            >
                                              <span className="font-medium mr-2">
                                                {details.symbol}
                                              </span>
                                              <span className="font-medium mr-2">
                                                {code}
                                              </span>
                                              <span className="text-xs text-muted-foreground truncate">
                                                {details.name}
                                              </span>
                                            </Button>
                                          );
                                        })}
                                    </div>
                                  </PopoverContent>
                                </Popover>

                                <div className="flex flex-col items-end">
                                  <div className="text-2xl font-bold">
                                    {(() => {
                                      const details =
                                        getCurrencyDetails(displayCurrency);
                                      return `${
                                        details.symbol
                                      }${formatNumberWithSeparators(
                                        filteredStats.totalAmount
                                      )}`;
                                    })()}
                                  </div>
                                  {exchangeRates &&
                                    baseCurrency !== displayCurrency && (
                                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <RefreshCw className="h-3 w-3" />
                                        Converted from {baseCurrency}
                                      </div>
                                    )}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                    {filteredApprovedExpenses.length === 0 &&
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
                              setDateRange({
                                from: subDays(new Date(), 30),
                                to: new Date(),
                              });
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
              <Label htmlFor="employee">Employee *</Label>
              <Select
                value={formData.employeeName}
                onValueChange={(value) =>
                  setFormData({ ...formData, employeeName: value })
                }
                disabled={submitting}
              >
                <SelectTrigger id="employee">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {users.length === 0 ? (
                    <SelectItem value="loading" disabled>
                      Loading employees...
                    </SelectItem>
                  ) : (
                    users
                      .sort((a, b) =>
                        (a.name || "").localeCompare(b.name || "")
                      )
                      .map((user) => (
                        <SelectItem key={user.id} value={user.name}>
                          {user.name} ({user.role || "N/A"})
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>
              Update the expense details below
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-employee">Employee *</Label>
              <Select
                value={formData.employeeName}
                onValueChange={(value) =>
                  setFormData({ ...formData, employeeName: value })
                }
                disabled={submitting}
              >
                <SelectTrigger id="edit-employee">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {users.length === 0 ? (
                    <SelectItem value="loading" disabled>
                      Loading employees...
                    </SelectItem>
                  ) : (
                    users
                      .sort((a, b) =>
                        (a.name || "").localeCompare(b.name || "")
                      )
                      .map((user) => (
                        <SelectItem key={user.id} value={user.name}>
                          {user.name} ({user.role || "N/A"})
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Original employee will be preserved in history
              </p>
            </div>

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

            <div className="flex gap-2 justify-between pt-4 border-t">
              <div className="flex gap-2">
                {editingExpense?.editHistory &&
                  editingExpense.editHistory.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowEditDialog(false);
                        openHistoryDialog(editingExpense);
                      }}
                      disabled={submitting}
                    >
                      <History className="mr-2 h-4 w-4" />
                      View History ({editingExpense.editHistory.length})
                    </Button>
                  )}
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setShowEditDialog(false);
                    openDeleteDialog(editingExpense);
                  }}
                  disabled={submitting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
              <div className="flex gap-2">
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
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Update Expense
                    </>
                  )}
                </Button>
              </div>
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
                  <button
                    key={category.id}
                    onClick={() => {
                      setShowCategoriesDialog(false);
                      openCategoryForm(category);
                    }}
                    className="flex items-center justify-between p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {category.name}
                      </div>
                      {category.description && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {category.description}
                        </div>
                      )}
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">
                        {categoryStats[category.name] || 0} expenses • Created{" "}
                        {format(new Date(category.createdAt), "MMM dd, yyyy")}
                      </div>
                    </div>
                    <div className="ml-3 text-gray-400">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </button>
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

            <div className="flex gap-2 justify-between pt-4">
              {editingCategory && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setCategoryToDelete(editingCategory);
                    setShowDeleteCategoryDialog(true);
                  }}
                  disabled={submitting}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
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
              Are you sure you want to delete this category? It will be hidden
              but the data will be preserved.
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

              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <AlertCircle className="inline h-4 w-4 mr-1" />
                  This is a <strong>soft delete</strong>. The category will be
                  hidden from the list, but all data will be preserved. Expenses
                  using this category will not be affected. You can restore it
                  later if needed.
                </p>
              </div>

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
                  disabled={processingAction}
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

      {/* Delete Expense Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense? The expense will be
              flagged as deleted but not removed from the database.
            </DialogDescription>
          </DialogHeader>
          {expenseToDelete && (
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-red-900 dark:text-red-100">
                      {expenseToDelete.description}
                    </h4>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      Amount:{" "}
                      {formatAmountWithCurrency(
                        expenseToDelete.amount,
                        expenseToDelete.currency
                      )}
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Category: {expenseToDelete.category}
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Employee: {expenseToDelete.employeeName || "Unknown"}
                    </p>
                  </div>
                  <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    {expenseToDelete.status}
                  </Badge>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <AlertCircle className="inline h-4 w-4 mr-1" />
                  This is a soft delete - the expense will be flagged as deleted
                  but all data will be preserved in the database for recovery if
                  needed.
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setExpenseToDelete(null);
                  }}
                  disabled={processingAction}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteExpense}
                  disabled={processingAction}
                  variant="destructive"
                >
                  {processingAction ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Expense
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit History</DialogTitle>
            <DialogDescription>
              Complete history of changes made to this expense
            </DialogDescription>
          </DialogHeader>
          {historyExpense && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {historyExpense.description}
                </h4>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Amount:
                    </span>{" "}
                    <span className="font-medium">
                      {formatAmountWithCurrency(
                        historyExpense.amount,
                        historyExpense.currency
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Category:
                    </span>{" "}
                    <span className="font-medium">
                      {historyExpense.category}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Status:
                    </span>{" "}
                    <Badge>{historyExpense.status}</Badge>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Employee:
                    </span>{" "}
                    <span className="font-medium">
                      {historyExpense.employeeName || "Unknown"}
                    </span>
                  </div>
                </div>
              </div>

              {historyExpense.editHistory &&
              historyExpense.editHistory.length > 0 ? (
                <div className="space-y-3">
                  <h5 className="font-semibold text-gray-900 dark:text-white">
                    Changes ({historyExpense.editHistory.length})
                  </h5>
                  {historyExpense.editHistory.map((entry, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <History className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {entry.editedByName}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {format(
                            new Date(entry.timestamp),
                            "MMM dd, yyyy HH:mm"
                          )}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {entry.changes.map((field) => (
                          <div key={field} className="text-sm">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              {field}:
                            </span>
                            <div className="ml-4 mt-1">
                              <div className="flex items-center gap-2">
                                <span className="text-red-600 dark:text-red-400 line-through">
                                  {typeof entry.oldValues[field] === "number"
                                    ? entry.oldValues[field].toFixed(2)
                                    : entry.oldValues[field] || "(empty)"}
                                </span>
                                <span className="text-gray-500">→</span>
                                <span className="text-green-600 dark:text-green-400 font-medium">
                                  {typeof entry.newValues[field] === "number"
                                    ? entry.newValues[field].toFixed(2)
                                    : entry.newValues[field] || "(empty)"}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <History className="mx-auto h-12 w-12 mb-2 opacity-50" />
                  <p>No edit history available</p>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowHistoryDialog(false);
                    setHistoryExpense(null);
                  }}
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
