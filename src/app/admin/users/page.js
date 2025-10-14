"use client";

import { useState, useEffect } from "react";
import { registerUser } from "@/lib/firebase/auth";
import { getDocuments, COLLECTIONS } from "@/lib/firebase/firestore";
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
import { Plus, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { USER_ROLES } from "@/config/constants";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: USER_ROLES.CASHIER,
    pin: "",
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
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-gray-500 mt-2">
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
                <p className="text-xs text-gray-500 mt-1">
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
                  <p className="text-xs text-gray-500 mt-1">
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
          <p className="text-gray-500">Loading users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No users found</p>
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
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-700 font-semibold text-lg">
                        {user.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{user.name}</h3>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      {user.pin && (
                        <p className="text-xs text-gray-400 mt-1">
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
                      <span className="text-sm text-gray-500">
                        Joined{" "}
                        {new Date(user.createdAt.toDate()).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
