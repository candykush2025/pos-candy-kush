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
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { format } from "date-fns";
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  formatAmountWithCurrency,
} from "@/lib/constants/currencies";

export default function ExpensesSection({ cashier }) {
  const { token } = useAuthStore();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  // Fetch expenses and categories for this cashier
  useEffect(() => {
    if (cashier) {
      fetchExpenses();
      fetchCategories();
    }
  }, [cashier]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/mobile?action=get-expenses&employeeId=${cashier.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json();

      if (data.success) {
        setExpenses(data.data.expenses || []);
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
      const response = await fetch(
        "/api/mobile?action=get-expense-categories",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json();

      if (data.success) {
        // Filter only active categories
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
      } else {
        console.error("Failed to load categories:", data.error);
        // Fallback to default category
        setCategories(["General"]);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      // Fallback to default category
      setCategories(["General"]);
    }
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
        employeeId: cashier.id,
        employeeName: cashier.name || cashier.email || "Unknown",
        source: "POS",
        notes: formData.notes?.trim() || "",
        createdBy: cashier.id,
        createdByName: cashier.name || cashier.email || "Unknown",
        createdByRole: "employee",
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

        toast.success("Expense submitted for approval");
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

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              My Expenses
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Track and manage your expense submissions
            </p>
          </div>
          <Button onClick={() => setShowAddDialog(true)} size="lg">
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

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-500">
                {stats.pending}
              </div>
            </CardContent>
          </Card>

          <Card>
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

          <Card>
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

          <Card>
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

        {/* Expenses List */}
        <Card>
          <CardHeader>
            <CardTitle>Expense History</CardTitle>
            <CardDescription>
              All expenses you&apos;ve submitted for approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                  No expenses yet
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Get started by adding your first expense.
                </p>
                <div className="mt-6">
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Expense
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {expense.description}
                        </h4>
                        {getStatusBadge(expense.status)}
                        <Badge variant="outline">{expense.category}</Badge>
                        {expense.currency &&
                          expense.currency !== DEFAULT_CURRENCY && (
                            <Badge variant="secondary">
                              {expense.currency}
                            </Badge>
                          )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>
                          {format(
                            new Date(expense.date || expense.createdAt),
                            "MMM dd, yyyy"
                          )}
                          {expense.time && ` at ${expense.time}`}
                        </span>
                        <span>Source: {expense.source || "POS"}</span>
                        {expense.approvedByName && (
                          <span>
                            {expense.status === "approved"
                              ? "Approved"
                              : "Denied"}{" "}
                            by {expense.approvedByName}
                          </span>
                        )}
                      </div>
                      {expense.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                          Note: {expense.notes}
                        </p>
                      )}
                      {expense.approvalNotes && (
                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                          Admin note: {expense.approvalNotes}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {expense.currency
                          ? formatAmountWithCurrency(
                              expense.amount,
                              expense.currency
                            )
                          : formatCurrency(expense.amount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
            <DialogDescription>
              Submit an expense for manager approval
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

            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <AlertCircle className="inline h-4 w-4 mr-1" />
                This expense will be submitted for manager approval before being
                added to the system.
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
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Submit Expense
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
