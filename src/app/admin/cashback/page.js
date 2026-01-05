"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Pencil,
  Trash2,
  Gift,
  Settings,
  Percent,
  DollarSign,
  Package,
  FolderTree,
  AlertCircle,
  Loader2,
  Save,
  Info,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  cashbackRulesService,
  pointUsageRulesService,
} from "@/lib/firebase/cashbackService";
import { categoriesService, productsService } from "@/lib/firebase/firestore";

export default function CashbackPage() {
  // State for cashback rules
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // State for categories and products (for selection)
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // State for rule modal
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState({
    name: "",
    type: "category", // 'category' or 'product'
    targetId: "",
    targetName: "",
    cashbackType: "percentage", // 'percentage' or 'fixed'
    cashbackValue: 0,
    hasMinimumOrder: false,
    minimumOrderAmount: 0,
    isActive: true,
  });

  // State for point usage rules
  const [pointUsageRules, setPointUsageRules] = useState({
    pointValue: 1,
    priceWhenUsingPoints: "member",
    earnCashbackWhenUsingPoints: false,
    maxPointUsagePercent: 100,
    minPointsToRedeem: 1,
  });
  const [savingUsageRules, setSavingUsageRules] = useState(false);

  // State for delete confirmation
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    rule: null,
  });

  // State for search functionality
  const [searchQuery, setSearchQuery] = useState("");

  // Filtered lists based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase();
    return categories.filter((cat) => cat.name.toLowerCase().includes(query));
  }, [categories, searchQuery]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter((prod) => prod.name.toLowerCase().includes(query));
  }, [products, searchQuery]);

  // Load all data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load cashback rules
      const rulesData = await cashbackRulesService.getAll();
      setRules(rulesData);

      // Load point usage rules
      const usageRules = await pointUsageRulesService.get();
      setPointUsageRules(usageRules);

      // Load categories and products for selection
      setLoadingOptions(true);
      const [categoriesData, productsData] = await Promise.all([
        categoriesService.getAll(),
        productsService.getAll(),
      ]);
      setCategories(categoriesData);
      setProducts(productsData);
      setLoadingOptions(false);
    } catch (error) {
      console.error("Error loading cashback data:", error);
      toast.error("Failed to load cashback data");
    } finally {
      setLoading(false);
    }
  };

  // Handle opening rule modal for new rule
  const handleAddRule = () => {
    setEditingRule(null);
    setRuleForm({
      name: "",
      type: "category",
      targetId: "",
      targetName: "",
      cashbackType: "percentage",
      cashbackValue: 0,
      hasMinimumOrder: false,
      minimumOrderAmount: 0,
      isActive: true,
    });
    setSearchQuery(""); // Clear search when opening modal
    setIsRuleModalOpen(true);
  };

  // Handle opening rule modal for editing
  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      type: rule.type,
      targetId: rule.targetId,
      targetName: rule.targetName,
      cashbackType: rule.cashbackType,
      cashbackValue: rule.cashbackValue,
      hasMinimumOrder: rule.hasMinimumOrder || false,
      minimumOrderAmount: rule.minimumOrderAmount || 0,
      isActive: rule.isActive,
    });
    setSearchQuery(""); // Clear search when opening modal
    setIsRuleModalOpen(true);
  };

  // Handle target selection (category or product)
  const handleTargetSelect = (targetId) => {
    let targetName = "";
    if (ruleForm.type === "category") {
      const category = categories.find((c) => c.id === targetId);
      targetName = category?.name || "";
    } else {
      const product = products.find((p) => p.id === targetId);
      targetName = product?.name || "";
    }
    setRuleForm({ ...ruleForm, targetId, targetName });
  };

  // Handle saving rule
  const handleSaveRule = async () => {
    if (!ruleForm.name.trim()) {
      toast.error("Please enter a rule name");
      return;
    }
    if (!ruleForm.targetId) {
      toast.error(`Please select a ${ruleForm.type}`);
      return;
    }
    if (ruleForm.cashbackValue <= 0) {
      toast.error("Cashback value must be greater than 0");
      return;
    }
    if (
      ruleForm.cashbackType === "percentage" &&
      ruleForm.cashbackValue > 100
    ) {
      toast.error("Percentage cannot be greater than 100");
      return;
    }

    setSaving(true);
    try {
      const ruleData = {
        name: ruleForm.name.trim(),
        type: ruleForm.type,
        targetId: ruleForm.targetId,
        targetName: ruleForm.targetName,
        cashbackType: ruleForm.cashbackType,
        cashbackValue: parseFloat(ruleForm.cashbackValue),
        hasMinimumOrder: ruleForm.hasMinimumOrder,
        minimumOrderAmount: ruleForm.hasMinimumOrder
          ? parseFloat(ruleForm.minimumOrderAmount)
          : 0,
        isActive: ruleForm.isActive,
      };

      if (editingRule) {
        await cashbackRulesService.update(editingRule.id, ruleData);
        toast.success("Cashback rule updated successfully");
      } else {
        await cashbackRulesService.create(ruleData);
        toast.success("Cashback rule created successfully");
      }

      setIsRuleModalOpen(false);
      loadData();
    } catch (error) {
      console.error("Error saving rule:", error);
      toast.error("Failed to save cashback rule");
    } finally {
      setSaving(false);
    }
  };

  // Handle deleting rule
  const handleDeleteRule = async () => {
    if (!deleteModal.rule) return;

    setSaving(true);
    try {
      await cashbackRulesService.delete(deleteModal.rule.id);
      toast.success("Cashback rule deleted successfully");
      setDeleteModal({ open: false, rule: null });
      loadData();
    } catch (error) {
      console.error("Error deleting rule:", error);
      toast.error("Failed to delete cashback rule");
    } finally {
      setSaving(false);
    }
  };

  // Handle toggling rule active status
  const handleToggleRuleStatus = async (rule) => {
    try {
      await cashbackRulesService.update(rule.id, {
        isActive: !rule.isActive,
      });
      toast.success(
        `Rule ${!rule.isActive ? "activated" : "deactivated"} successfully`
      );
      loadData();
    } catch (error) {
      console.error("Error toggling rule status:", error);
      toast.error("Failed to update rule status");
    }
  };

  // Handle saving point usage rules
  const handleSaveUsageRules = async () => {
    setSavingUsageRules(true);
    try {
      await pointUsageRulesService.save(pointUsageRules);
      toast.success("Point usage rules saved successfully");
    } catch (error) {
      console.error("Error saving point usage rules:", error);
      toast.error("Failed to save point usage rules");
    } finally {
      setSavingUsageRules(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Gift className="h-8 w-8 text-green-600" />
            Cashback Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Configure cashback rules and point usage settings for members
          </p>
        </div>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">How Cashback Works:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Cashback rules can be applied to categories or specific products
              </li>
              <li>
                If a product has its own rule, it takes priority over the
                category rule
              </li>
              <li>
                Only customers with active membership can earn and use cashback
                points
              </li>
              <li>
                Points are recorded in customer's Point History after each
                purchase
              </li>
            </ul>
          </div>
        </div>
      </div>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Cashback Rules
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Point Usage Settings
          </TabsTrigger>
        </TabsList>

        {/* Cashback Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Cashback Rules</CardTitle>
                <CardDescription>
                  Define how customers earn points from purchases
                </CardDescription>
              </div>
              <Button onClick={handleAddRule} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Rule
              </Button>
            </CardHeader>
            <CardContent>
              {rules.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Gift className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No cashback rules configured yet.</p>
                  <p className="text-sm">
                    Click "Add Rule" to create your first rule.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Cashback</TableHead>
                      <TableHead>Min. Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">
                          {rule.name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              rule.type === "product"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }
                          >
                            {rule.type === "product" ? (
                              <Package className="h-3 w-3 mr-1" />
                            ) : (
                              <FolderTree className="h-3 w-3 mr-1" />
                            )}
                            {rule.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{rule.targetName}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            {rule.cashbackType === "percentage" ? (
                              <>
                                <Percent className="h-3 w-3" />
                                {rule.cashbackValue}%
                              </>
                            ) : (
                              <>
                                <DollarSign className="h-3 w-3" />
                                {rule.cashbackValue} pts/item
                              </>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          {rule.hasMinimumOrder ? (
                            <span className="text-sm">
                              ฿{rule.minimumOrderAmount.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-gray-400">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={rule.isActive}
                            onCheckedChange={() => handleToggleRuleStatus(rule)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditRule(rule)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() =>
                                setDeleteModal({ open: true, rule })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Point Usage Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Point Usage Settings</CardTitle>
              <CardDescription>
                Configure how customers can use their earned points
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Point Value */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pointValue">Point Value (1 point = ?)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="pointValue"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={pointUsageRules.pointValue}
                      onChange={(e) =>
                        setPointUsageRules({
                          ...pointUsageRules,
                          pointValue: parseFloat(e.target.value) || 1,
                        })
                      }
                      className="w-32"
                    />
                    <span className="text-gray-500">฿ (Baht)</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Example: If set to 1, 100 points = ฿100 discount
                  </p>
                </div>

                {/* Min Points to Redeem */}
                <div className="space-y-2">
                  <Label htmlFor="minPoints">Minimum Points to Redeem</Label>
                  <Input
                    id="minPoints"
                    type="number"
                    min="1"
                    value={pointUsageRules.minPointsToRedeem}
                    onChange={(e) =>
                      setPointUsageRules({
                        ...pointUsageRules,
                        minPointsToRedeem: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-32"
                  />
                  <p className="text-sm text-gray-500">
                    Minimum number of points a customer must have to use
                  </p>
                </div>
              </div>

              {/* Max Point Usage */}
              <div className="space-y-2">
                <Label htmlFor="maxPointUsage">
                  Maximum Point Usage (% of order total)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="maxPointUsage"
                    type="number"
                    min="1"
                    max="100"
                    value={pointUsageRules.maxPointUsagePercent}
                    onChange={(e) =>
                      setPointUsageRules({
                        ...pointUsageRules,
                        maxPointUsagePercent: parseInt(e.target.value) || 100,
                      })
                    }
                    className="w-32"
                  />
                  <span className="text-gray-500">%</span>
                </div>
                <p className="text-sm text-gray-500">
                  Set to 100% to allow full payment with points
                </p>
              </div>

              {/* Price When Using Points */}
              <div className="space-y-2">
                <Label>Price Applied When Using Points</Label>
                <Select
                  value={pointUsageRules.priceWhenUsingPoints}
                  onValueChange={(value) =>
                    setPointUsageRules({
                      ...pointUsageRules,
                      priceWhenUsingPoints: value,
                    })
                  }
                >
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member Price</SelectItem>
                    <SelectItem value="normal">Normal Price</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  Choose which price to use when customer pays with points
                </p>
              </div>

              {/* Earn Cashback When Using Points */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="earnCashback" className="text-base">
                    Earn Cashback When Using Points
                  </Label>
                  <p className="text-sm text-gray-500">
                    If enabled, customers will still earn cashback points even
                    when paying with points
                  </p>
                </div>
                <Switch
                  id="earnCashback"
                  checked={pointUsageRules.earnCashbackWhenUsingPoints}
                  onCheckedChange={(checked) =>
                    setPointUsageRules({
                      ...pointUsageRules,
                      earnCashbackWhenUsingPoints: checked,
                    })
                  }
                />
              </div>

              <Button
                onClick={handleSaveUsageRules}
                disabled={savingUsageRules}
                className="gap-2"
              >
                {savingUsageRules ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Rule Modal */}
      <Dialog open={isRuleModalOpen} onOpenChange={setIsRuleModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Edit Cashback Rule" : "Add Cashback Rule"}
            </DialogTitle>
            <DialogDescription>
              {editingRule
                ? "Modify the cashback rule settings"
                : "Create a new cashback rule for a category or product"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Rule Name */}
            <div className="space-y-2">
              <Label htmlFor="ruleName">Rule Name</Label>
              <Input
                id="ruleName"
                placeholder="e.g., 5% Cashback on Drinks"
                value={ruleForm.name}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, name: e.target.value })
                }
              />
            </div>

            {/* Rule Type */}
            <div className="space-y-2">
              <Label>Apply To</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={ruleForm.type === "category" ? "default" : "outline"}
                  className="h-16 flex flex-col gap-1"
                  onClick={() => {
                    setRuleForm({
                      ...ruleForm,
                      type: "category",
                      targetId: "",
                      targetName: "",
                    });
                    setSearchQuery(""); // Clear search when changing type
                  }}
                >
                  <FolderTree className="h-5 w-5" />
                  Category
                </Button>
                <Button
                  type="button"
                  variant={ruleForm.type === "product" ? "default" : "outline"}
                  className="h-16 flex flex-col gap-1"
                  onClick={() => {
                    setRuleForm({
                      ...ruleForm,
                      type: "product",
                      targetId: "",
                      targetName: "",
                    });
                    setSearchQuery(""); // Clear search when changing type
                  }}
                >
                  <Package className="h-5 w-5" />
                  Product
                </Button>
              </div>
            </div>

            {/* Target Selection with Search */}
            <div className="space-y-2">
              <Label>
                Select {ruleForm.type === "category" ? "Category" : "Product"}
              </Label>

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder={`Search ${
                    ruleForm.type === "category" ? "categories" : "products"
                  }...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                  disabled={loadingOptions}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Scrollable List */}
              <div className="border rounded-md max-h-48 overflow-y-auto">
                {loadingOptions ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : ruleForm.type === "category" ? (
                  filteredCategories.length === 0 ? (
                    <div className="text-center py-4 text-sm text-gray-500">
                      No categories found
                    </div>
                  ) : (
                    filteredCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => handleTargetSelect(cat.id)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 border-b last:border-b-0 transition-colors ${
                          ruleForm.targetId === cat.id
                            ? "bg-green-50 dark:bg-green-900/20 border-l-4 border-l-green-600"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FolderTree className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{cat.name}</span>
                          {ruleForm.targetId === cat.id && (
                            <span className="ml-auto text-xs text-green-600 font-semibold">
                              Selected
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  )
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-4 text-sm text-gray-500">
                    No products found
                  </div>
                ) : (
                  filteredProducts.map((prod) => (
                    <button
                      key={prod.id}
                      onClick={() => handleTargetSelect(prod.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 border-b last:border-b-0 transition-colors ${
                        ruleForm.targetId === prod.id
                          ? "bg-green-50 dark:bg-green-900/20 border-l-4 border-l-green-600"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{prod.name}</span>
                        {ruleForm.targetId === prod.id && (
                          <span className="ml-auto text-xs text-green-600 font-semibold">
                            Selected
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Selected item display */}
              {ruleForm.targetName && (
                <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <span className="font-medium">Selected:</span>
                  <span>{ruleForm.targetName}</span>
                </div>
              )}
            </div>

            {/* Cashback Type */}
            <div className="space-y-2">
              <Label>Cashback Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={
                    ruleForm.cashbackType === "percentage"
                      ? "default"
                      : "outline"
                  }
                  className="h-12 flex items-center gap-2"
                  onClick={() =>
                    setRuleForm({ ...ruleForm, cashbackType: "percentage" })
                  }
                >
                  <Percent className="h-4 w-4" />
                  Percentage
                </Button>
                <Button
                  type="button"
                  variant={
                    ruleForm.cashbackType === "fixed" ? "default" : "outline"
                  }
                  className="h-12 flex items-center gap-2"
                  onClick={() =>
                    setRuleForm({ ...ruleForm, cashbackType: "fixed" })
                  }
                >
                  <DollarSign className="h-4 w-4" />
                  Fixed Points
                </Button>
              </div>
            </div>

            {/* Cashback Value */}
            <div className="space-y-2">
              <Label htmlFor="cashbackValue">
                Cashback Value{" "}
                {ruleForm.cashbackType === "percentage"
                  ? "(%)"
                  : "(points per item)"}
              </Label>
              <Input
                id="cashbackValue"
                type="number"
                min="0"
                max={ruleForm.cashbackType === "percentage" ? 100 : undefined}
                step={ruleForm.cashbackType === "percentage" ? "0.1" : "1"}
                value={ruleForm.cashbackValue}
                onChange={(e) =>
                  setRuleForm({
                    ...ruleForm,
                    cashbackValue: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>

            {/* Minimum Order */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="hasMinOrder">Minimum Order Requirement</Label>
                <Switch
                  id="hasMinOrder"
                  checked={ruleForm.hasMinimumOrder}
                  onCheckedChange={(checked) =>
                    setRuleForm({ ...ruleForm, hasMinimumOrder: checked })
                  }
                />
              </div>
              {ruleForm.hasMinimumOrder && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">฿</span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={ruleForm.minimumOrderAmount}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        minimumOrderAmount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="flex-1"
                  />
                </div>
              )}
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Label htmlFor="isActive">Rule Active</Label>
              <Switch
                id="isActive"
                checked={ruleForm.isActive}
                onCheckedChange={(checked) =>
                  setRuleForm({ ...ruleForm, isActive: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRuleModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveRule}
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {editingRule ? "Update Rule" : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={deleteModal.open}
        onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Delete Cashback Rule
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the rule "
              <strong>{deleteModal.rule?.name}</strong>"? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ open: false, rule: null })}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRule}
              disabled={saving}
              className="gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
