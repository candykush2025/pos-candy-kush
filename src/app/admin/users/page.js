"use client";

import { useState, useEffect } from "react";
import { registerUser, adminResetUserPassword } from "@/lib/firebase/auth";
import {
  getDocuments,
  updateDocument,
  COLLECTIONS,
} from "@/lib/firebase/firestore";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  UserPlus,
  Edit,
  Save,
  KeyRound,
  ChevronLeft,
  Shield,
  Users,
  Package,
  History,
  DollarSign,
  UserCheck,
  Clock,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import {
  USER_ROLES,
  CASHIER_PERMISSIONS,
  DEFAULT_CASHIER_PERMISSIONS,
} from "@/config/constants";
import {
  getLogsByUser,
  LOG_CATEGORIES,
} from "@/lib/services/activityLogService";

const PERMISSION_GROUPS = {
  price: {
    label: "Price Management",
    icon: DollarSign,
    permissions: [
      {
        key: CASHIER_PERMISSIONS.CAN_CHANGE_PRICE,
        label: "Can Change Product Price",
        description:
          "Allow changing product prices during sale or in product management",
      },
    ],
  },
  stock: {
    label: "Stock Management",
    icon: Package,
    permissions: [
      {
        key: CASHIER_PERMISSIONS.CAN_CHANGE_STOCK,
        label: "Can Change Stock",
        description: "Allow adding or reducing product stock",
      },
    ],
  },
  product: {
    label: "Product Management",
    icon: ShoppingCart,
    permissions: [
      {
        key: CASHIER_PERMISSIONS.CAN_ADD_PRODUCT,
        label: "Can Add Products",
        description: "Allow creating new products",
      },
      {
        key: CASHIER_PERMISSIONS.CAN_EDIT_PRODUCT,
        label: "Can Edit Products",
        description: "Allow editing product details",
      },
      {
        key: CASHIER_PERMISSIONS.CAN_DELETE_PRODUCT,
        label: "Can Delete Products",
        description: "Allow deleting products (dangerous)",
      },
    ],
  },
  customer: {
    label: "Customer Management",
    icon: Users,
    permissions: [
      {
        key: CASHIER_PERMISSIONS.CAN_ADD_CUSTOMER,
        label: "Can Add Customers",
        description: "Allow creating new customers",
      },
      {
        key: CASHIER_PERMISSIONS.CAN_EDIT_CUSTOMER,
        label: "Can Edit Customers",
        description: "Allow editing customer information",
      },
      {
        key: CASHIER_PERMISSIONS.CAN_DELETE_CUSTOMER,
        label: "Can Delete Customers",
        description: "Allow deleting customers (dangerous)",
      },
      {
        key: CASHIER_PERMISSIONS.CAN_SET_CUSTOMER_EXPIRY,
        label: "Can Set Customer Expiry",
        description: "Allow setting/changing customer expiry dates",
      },
    ],
  },
  sales: {
    label: "Sales Operations",
    icon: DollarSign,
    permissions: [
      {
        key: CASHIER_PERMISSIONS.CAN_APPLY_DISCOUNT,
        label: "Can Apply Discounts",
        description: "Allow applying discounts to sales",
      },
      {
        key: CASHIER_PERMISSIONS.CAN_VOID_SALE,
        label: "Can Void Sales",
        description: "Allow voiding completed sales",
      },
    ],
  },
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("list");
  const [editingUser, setEditingUser] = useState(null);
  const [userLogs, setUserLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [activeLogTab, setActiveLogTab] = useState("all");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: USER_ROLES.CASHIER,
    pin: "",
  });

  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    role: USER_ROLES.CASHIER,
    pin: "",
    newPassword: "",
    permissions: { ...DEFAULT_CASHIER_PERMISSIONS },
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getDocuments(COLLECTIONS.USERS, {
        orderBy: ["createdAt", "desc"],
      });
      setUsers(data);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const loadUserLogs = async (userId) => {
    try {
      setLogsLoading(true);
      const logs = await getLogsByUser(userId, 100);
      setUserLogs(logs);
    } catch (error) {
      console.error("Error loading user logs:", error);
      setUserLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (
        (formData.role === USER_ROLES.CASHIER ||
          formData.role === USER_ROLES.ADMIN) &&
        (!formData.pin || formData.pin.length < 4)
      ) {
        toast.error("PIN must be at least 4 digits for cashiers");
        return;
      }
      if (formData.pin) {
        const existingUserWithPin = users.find((u) => u.pin === formData.pin);
        if (existingUserWithPin) {
          toast.error(
            "PIN already in use by " +
              existingUserWithPin.name +
              ". Please choose a different PIN."
          );
          return;
        }
      }
      await registerUser(formData.email, formData.password, {
        name: formData.name,
        role: formData.role,
        pin: formData.pin || null,
        permissions: { ...DEFAULT_CASHIER_PERMISSIONS },
      });
      toast.success("User created successfully");
      setIsModalOpen(false);
      resetForm();
      loadUsers();
    } catch (error) {
      console.error("Error creating user:", error);
      let message = "Failed to create user";
      if (error.code === "auth/email-already-in-use") {
        message = "Email already in use";
      } else if (error.code === "auth/weak-password") {
        message = "Password should be at least 6 characters";
      }
      toast.error(message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      role: USER_ROLES.CASHIER,
      pin: "",
    });
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name || "",
      email: user.email || "",
      role: user.role || USER_ROLES.CASHIER,
      pin: user.pin || "",
      newPassword: "",
      permissions: user.permissions || { ...DEFAULT_CASHIER_PERMISSIONS },
    });
    setViewMode("edit");
    loadUserLogs(user.id);
  };

  const handleBackToList = () => {
    setViewMode("list");
    setEditingUser(null);
    setUserLogs([]);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      if (
        (editFormData.role === USER_ROLES.CASHIER ||
          editFormData.role === USER_ROLES.ADMIN) &&
        editFormData.pin &&
        editFormData.pin.length < 4
      ) {
        toast.error("PIN must be at least 4 digits");
        return;
      }
      if (editFormData.pin) {
        const existingUserWithPin = users.find(
          (u) => u.pin === editFormData.pin && u.id !== editingUser.id
        );
        if (existingUserWithPin) {
          toast.error(
            "PIN already in use by " +
              existingUserWithPin.name +
              ". Please choose a different PIN."
          );
          return;
        }
      }
      if (editFormData.newPassword && editFormData.newPassword.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }
      await updateDocument(COLLECTIONS.USERS, editingUser.id, {
        name: editFormData.name,
        email: editFormData.email,
        role: editFormData.role,
        pin: editFormData.pin || null,
        permissions: editFormData.permissions,
      });
      if (editFormData.newPassword) {
        await adminResetUserPassword(editFormData.email);
        toast.success(
          "User updated! Password reset email sent to " + editFormData.email
        );
      } else {
        toast.success("User updated successfully");
      }
      loadUsers();
      setEditingUser({ ...editingUser, ...editFormData });
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user");
    }
  };

  const handlePermissionChange = (permissionKey, value) => {
    setEditFormData({
      ...editFormData,
      permissions: { ...editFormData.permissions, [permissionKey]: value },
    });
  };

  const handleSendPasswordReset = async (user) => {
    try {
      await adminResetUserPassword(user.email);
      toast.success("Password reset email sent to " + user.email);
    } catch (error) {
      console.error("Error sending password reset:", error);
      toast.error("Failed to send password reset email");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case USER_ROLES.ADMIN:
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case USER_ROLES.MANAGER:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case USER_ROLES.CASHIER:
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      default:
        return "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400";
    }
  };

  const getLogCategoryBadge = (category) => {
    switch (category) {
      case LOG_CATEGORIES.CUSTOMER:
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            Customer
          </Badge>
        );
      case LOG_CATEGORIES.STOCK:
        return (
          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
            Stock
          </Badge>
        );
      case LOG_CATEGORIES.PRODUCT:
        return (
          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
            Product
          </Badge>
        );
      case LOG_CATEGORIES.SALE:
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Sale
          </Badge>
        );
      default:
        return <Badge variant="outline">Other</Badge>;
    }
  };

  const formatLogTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const filteredLogs =
    activeLogTab === "all"
      ? userLogs
      : userLogs.filter((log) => log.category === activeLogTab);

  if (viewMode === "edit" && editingUser) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBackToList}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Edit className="h-6 w-6" />
              Edit User: {editingUser.name}
            </h1>
            <p className="text-neutral-500">
              Manage user details, permissions, and view activity logs
            </p>
          </div>
          <Badge className={getRoleBadgeColor(editingUser.role)}>
            {editingUser.role}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  User Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateUser} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-neutral-500">
                      User ID
                    </label>
                    <Input
                      value={editingUser.id}
                      disabled
                      className="bg-neutral-100 dark:bg-neutral-800 cursor-not-allowed font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Full Name *</label>
                    <Input
                      value={editFormData.name}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          name: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email *</label>
                    <Input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          email: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Role *</label>
                    <select
                      className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-700"
                      value={editFormData.role}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          role: e.target.value,
                        })
                      }
                      required
                    >
                      <option value={USER_ROLES.CASHIER}>Cashier</option>
                      <option value={USER_ROLES.MANAGER}>Manager</option>
                      <option value={USER_ROLES.ADMIN}>Admin</option>
                    </select>
                  </div>
                  {(editFormData.role === USER_ROLES.CASHIER ||
                    editFormData.role === USER_ROLES.ADMIN) && (
                    <div>
                      <label className="text-sm font-medium">
                        PIN (4-6 digits)
                      </label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Enter PIN"
                        value={editFormData.pin}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            pin: e.target.value.replace(/\D/g, "").slice(0, 6),
                          })
                        }
                        minLength={4}
                        maxLength={6}
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium">New Password</label>
                    <Input
                      type="password"
                      value={editFormData.newPassword}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          newPassword: e.target.value,
                        })
                      }
                      placeholder="Leave blank to keep current"
                      minLength={6}
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      A password reset email will be sent if changed.
                    </p>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSendPasswordReset(editingUser)}
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {editFormData.role === USER_ROLES.CASHIER && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Cashier Permissions
                  </CardTitle>
                  <p className="text-sm text-neutral-500">
                    Control what this cashier can do in the POS system
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {Object.entries(PERMISSION_GROUPS).map(
                      ([groupKey, group]) => (
                        <div key={groupKey}>
                          <div className="flex items-center gap-2 mb-3">
                            <group.icon className="h-4 w-4 text-neutral-500" />
                            <h4 className="font-medium">{group.label}</h4>
                          </div>
                          <div className="border rounded-lg overflow-hidden dark:border-neutral-700">
                            <table className="w-full">
                              <tbody>
                                {group.permissions.map((perm, idx) => (
                                  <tr
                                    key={perm.key}
                                    className={
                                      idx !== group.permissions.length - 1
                                        ? "border-b dark:border-neutral-700"
                                        : "" +
                                          " hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                                    }
                                  >
                                    <td className="px-4 py-3">
                                      <div>
                                        <p className="font-medium text-sm">
                                          {perm.label}
                                        </p>
                                        <p className="text-xs text-neutral-500">
                                          {perm.description}
                                        </p>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={
                                            editFormData.permissions[
                                              perm.key
                                            ] || false
                                          }
                                          onChange={(e) =>
                                            handlePermissionChange(
                                              perm.key,
                                              e.target.checked
                                            )
                                          }
                                          className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-red-300 dark:bg-red-900/50 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-green-500"></div>
                                      </label>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                  <div className="mt-6 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const allEnabled = {};
                        Object.values(PERMISSION_GROUPS).forEach((group) => {
                          group.permissions.forEach((perm) => {
                            allEnabled[perm.key] = true;
                          });
                        });
                        setEditFormData({
                          ...editFormData,
                          permissions: allEnabled,
                        });
                      }}
                    >
                      Enable All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditFormData({
                          ...editFormData,
                          permissions: { ...DEFAULT_CASHIER_PERMISSIONS },
                        });
                      }}
                    >
                      Reset to Default
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {(editFormData.role === USER_ROLES.ADMIN ||
              editFormData.role === USER_ROLES.MANAGER) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Permissions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-blue-800 dark:text-blue-300">
                      {editFormData.role === USER_ROLES.ADMIN
                        ? "Admins have full access to all features and permissions."
                        : "Managers have access to most features except some admin-only operations like deleting products/customers."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Activity Logs
                </CardTitle>
                <p className="text-sm text-neutral-500">
                  Recent actions performed by this user
                </p>
              </CardHeader>
              <CardContent>
                <Tabs value={activeLogTab} onValueChange={setActiveLogTab}>
                  <TabsList className="grid grid-cols-5 mb-4">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value={LOG_CATEGORIES.CUSTOMER}>
                      Customer
                    </TabsTrigger>
                    <TabsTrigger value={LOG_CATEGORIES.STOCK}>
                      Stock
                    </TabsTrigger>
                    <TabsTrigger value={LOG_CATEGORIES.PRODUCT}>
                      Product
                    </TabsTrigger>
                    <TabsTrigger value={LOG_CATEGORIES.SALE}>Sales</TabsTrigger>
                  </TabsList>
                  <div className="border rounded-lg dark:border-neutral-700 max-h-96 overflow-y-auto">
                    {logsLoading ? (
                      <div className="p-8 text-center text-neutral-500">
                        Loading activity logs...
                      </div>
                    ) : filteredLogs.length === 0 ? (
                      <div className="p-8 text-center text-neutral-500">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No activity logs found</p>
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead className="bg-neutral-50 dark:bg-neutral-800 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">
                              Time
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">
                              Category
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">
                              Action
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">
                              Target
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">
                              Details
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-neutral-700">
                          {filteredLogs.map((log) => (
                            <tr
                              key={log.id}
                              className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                            >
                              <td className="px-4 py-2 text-xs text-neutral-500">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {formatLogTimestamp(log.timestamp)}
                              </td>
                              <td className="px-4 py-2">
                                {getLogCategoryBadge(log.category)}
                              </td>
                              <td className="px-4 py-2 text-sm font-medium">
                                {log.action?.replace(/_/g, " ")}
                              </td>
                              <td className="px-4 py-2 text-sm">
                                {log.targetName || log.targetId || "-"}
                              </td>
                              <td className="px-4 py-2 text-xs text-neutral-500">
                                {log.details || "-"}
                                {log.previousValue && log.newValue && (
                                  <span className="block">
                                    {log.previousValue} {log.newValue}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-neutral-500 mt-2">
            Manage staff members, roles, and permissions
          </p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new staff account. You can configure permissions after
                creation.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password *</label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role *</label>
                <select
                  className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-700"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  required
                >
                  <option value={USER_ROLES.CASHIER}>Cashier</option>
                  <option value={USER_ROLES.MANAGER}>Manager</option>
                  <option value={USER_ROLES.ADMIN}>Admin</option>
                </select>
              </div>
              {(formData.role === USER_ROLES.CASHIER ||
                formData.role === USER_ROLES.ADMIN) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    PIN * (4-6 digits)
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Enter 4-6 digit PIN"
                    value={formData.pin}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pin: e.target.value.replace(/\D/g, "").slice(0, 6),
                      })
                    }
                    required
                    minLength={4}
                    maxLength={6}
                  />
                </div>
              )}
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create User</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-neutral-500">Loading users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserPlus className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-500">No users found</p>
            <Button className="mt-4" onClick={() => setIsModalOpen(true)}>
              Add your first user
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Users ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden dark:border-neutral-700">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                      PIN
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                      Permissions
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                      Joined
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-neutral-700">
                  {filteredUsers.map((user) => {
                    const enabledPermissions =
                      user.role === USER_ROLES.CASHIER && user.permissions
                        ? Object.values(user.permissions).filter(Boolean).length
                        : null;
                    const totalPermissions =
                      Object.keys(CASHIER_PERMISSIONS).length;
                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer"
                        onClick={() => handleEditUser(user)}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                              <span className="text-green-700 dark:text-green-400 font-semibold">
                                {user.name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-neutral-500">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          {user.pin ? (
                            <span className="text-neutral-500 font-mono">
                              {"*".repeat(user.pin.length)}
                            </span>
                          ) : (
                            <span className="text-neutral-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {user.role === USER_ROLES.CASHIER ? (
                            <span className="text-sm">
                              {enabledPermissions || 0}/{totalPermissions}{" "}
                              enabled
                            </span>
                          ) : user.role === USER_ROLES.ADMIN ? (
                            <span className="text-sm text-green-600 dark:text-green-400">
                              Full Access
                            </span>
                          ) : (
                            <span className="text-sm text-blue-600 dark:text-blue-400">
                              Manager Access
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-neutral-500">
                          {user.createdAt
                            ? new Date(
                                user.createdAt.toDate()
                              ).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditUser(user);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
