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
import { Plus, Search, UserPlus, Edit, Save, X, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { USER_ROLES } from "@/config/constants";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);

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
    newPassword: "", // Optional new password
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Validate PIN for cashiers
      if (
        (formData.role === USER_ROLES.CASHIER ||
          formData.role === USER_ROLES.ADMIN) &&
        (!formData.pin || formData.pin.length < 4)
      ) {
        toast.error("PIN must be at least 4 digits for cashiers");
        return;
      }

      // Check if PIN is already in use by another user
      if (formData.pin) {
        const existingUserWithPin = users.find((u) => u.pin === formData.pin);
        if (existingUserWithPin) {
          toast.error(
            `PIN already in use by ${existingUserWithPin.name}. Please choose a different PIN.`
          );
          return;
        }
      }

      await registerUser(formData.email, formData.password, {
        name: formData.name,
        role: formData.role,
        pin: formData.pin || null,
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
      newPassword: "", // Clear password field when opening edit
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();

    try {
      // Validate PIN for cashiers and admins
      if (
        (editFormData.role === USER_ROLES.CASHIER ||
          editFormData.role === USER_ROLES.ADMIN) &&
        editFormData.pin &&
        editFormData.pin.length < 4
      ) {
        toast.error("PIN must be at least 4 digits");
        return;
      }

      // Check if PIN is already in use by another user (excluding current user)
      if (editFormData.pin) {
        const existingUserWithPin = users.find(
          (u) => u.pin === editFormData.pin && u.id !== editingUser.id
        );
        if (existingUserWithPin) {
          toast.error(
            `PIN already in use by ${existingUserWithPin.name}. Please choose a different PIN.`
          );
          return;
        }
      }

      // Validate new password if provided
      if (editFormData.newPassword && editFormData.newPassword.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }

      // Update user document in Firestore
      await updateDocument(COLLECTIONS.USERS, editingUser.id, {
        name: editFormData.name,
        email: editFormData.email,
        role: editFormData.role,
        pin: editFormData.pin || null,
      });

      // If new password provided, send password reset email
      if (editFormData.newPassword) {
        // Note: Firebase doesn't allow direct password change from client-side for other users
        // We send a password reset email instead
        await adminResetUserPassword(editFormData.email);
        toast.success(
          "User updated! Password reset email sent to " + editFormData.email
        );
      } else {
        toast.success("User updated successfully");
      }

      setIsEditModalOpen(false);
      setEditingUser(null);
      loadUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user");
    }
  };

  const handleSendPasswordReset = async (user) => {
    try {
      await adminResetUserPassword(user.email);
      toast.success(`Password reset email sent to ${user.email}`);
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
        return "bg-red-100 text-red-800";
      case USER_ROLES.MANAGER:
        return "bg-blue-100 text-blue-800";
      case USER_ROLES.CASHIER:
        return "bg-green-100 text-green-800";
      default:
        return "bg-neutral-100 text-neutral-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-neutral-500 mt-2">
            Manage staff members and their roles
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
                Create a new staff account with email and password
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name*</label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email*</label>
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
                <label className="text-sm font-medium">Password*</label>
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
                <label className="text-sm font-medium">Role*</label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
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
                <p className="text-xs text-neutral-500 mt-1">
                  Cashier: Basic sales only • Manager: Sales + reports • Admin:
                  Full access
                </p>
              </div>

              {(formData.role === USER_ROLES.CASHIER ||
                formData.role === USER_ROLES.ADMIN) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    PIN* (4-6 digits)
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
                  <p className="text-xs text-neutral-500 mt-1">
                    🔒 PIN is required for POS login (cashiers and admins only)
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-2">
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

      {/* Search */}
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

      {/* Users List */}
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
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:border-green-300 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-700 font-semibold text-lg">
                        {user.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{user.name}</h3>
                      <p className="text-sm text-neutral-500">{user.email}</p>
                      <p className="text-xs text-neutral-400 mt-1">
                        ID: {user.id}
                      </p>
                      {user.pin && (
                        <p className="text-xs text-neutral-400">
                          🔒 PIN: {"*".repeat(user.pin.length)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {user.role}
                    </Badge>
                    {user.createdAt && (
                      <span className="text-sm text-neutral-500">
                        Joined{" "}
                        {new Date(user.createdAt.toDate()).toLocaleDateString()}
                      </span>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendPasswordReset(user)}
                        title="Send password reset email"
                      >
                        <KeyRound className="h-4 w-4 mr-1" />
                        Reset Password
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit User Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update staff member information and role. User ID cannot be
              changed.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4">
            {/* Display User ID (read-only) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-500">
                User ID (Cannot be changed)
              </label>
              <Input
                value={editingUser?.id || ""}
                disabled
                className="bg-neutral-100 dark:bg-neutral-800 cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name*</label>
              <Input
                value={editFormData.name}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email*</label>
              <Input
                type="email"
                value={editFormData.email}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, email: e.target.value })
                }
                required
              />
              <p className="text-xs text-neutral-500">
                Note: Changing email updates Firestore only, not Firebase Auth
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                New Password (Optional)
              </label>
              <Input
                type="password"
                value={editFormData.newPassword}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    newPassword: e.target.value,
                  })
                }
                placeholder="Leave blank to keep current password"
                minLength={6}
              />
              <p className="text-xs text-neutral-500">
                <KeyRound className="inline h-3 w-3 mr-1" />
                Enter a new password (min 6 characters) or leave blank. A
                password reset email will be sent if changed.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Role*</label>
              <select
                className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900"
                value={editFormData.role}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, role: e.target.value })
                }
                required
              >
                <option value={USER_ROLES.CASHIER}>Cashier</option>
                <option value={USER_ROLES.MANAGER}>Manager</option>
                <option value={USER_ROLES.ADMIN}>Admin</option>
              </select>
              <p className="text-xs text-neutral-500 mt-1">
                Cashier: Basic sales only • Manager: Sales + reports • Admin:
                Full access
              </p>
            </div>

            {(editFormData.role === USER_ROLES.CASHIER ||
              editFormData.role === USER_ROLES.ADMIN) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">PIN (4-6 digits)</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Enter 4-6 digit PIN"
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
                <p className="text-xs text-neutral-500 mt-1">
                  🔒 PIN is required for POS login (cashiers and admins only)
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingUser(null);
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-1" />
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
