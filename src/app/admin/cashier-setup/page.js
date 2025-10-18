"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import db from "@/lib/db/index";
import { UserPlus } from "lucide-react";

export default function CashierSetupPage() {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddCashier = async (e) => {
    e.preventDefault();

    if (!name || !pin || pin.length < 4) {
      toast.error("Please enter valid name and PIN (min 4 digits)");
      return;
    }

    setLoading(true);
    try {
      const cashier = {
        id: `cashier_${Date.now()}`,
        name: name.trim(),
        email: `${name.toLowerCase().replace(/\s+/g, ".")}@pos.local`,
        role: "cashier",
        pin: pin.trim(),
        createdAt: new Date().toISOString(),
        active: true,
      };

      await db.users.add(cashier);

      toast.success(`Cashier "${name}" added successfully!`);
      setName("");
      setPin("");
    } catch (error) {
      console.error("Error adding cashier:", error);
      toast.error("Failed to add cashier");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTestCashiers = async () => {
    setLoading(true);
    try {
      const testCashiers = [
        {
          id: "cashier_test1",
          name: "John Doe",
          email: "john.doe@pos.local",
          role: "cashier",
          pin: "1234",
          createdAt: new Date().toISOString(),
          active: true,
        },
        {
          id: "cashier_test2",
          name: "Jane Smith",
          email: "jane.smith@pos.local",
          role: "cashier",
          pin: "5678",
          createdAt: new Date().toISOString(),
          active: true,
        },
        {
          id: "admin_test",
          name: "Admin User",
          email: "admin@pos.local",
          role: "admin",
          pin: "0000",
          createdAt: new Date().toISOString(),
          active: true,
        },
      ];

      for (const cashier of testCashiers) {
        try {
          await db.users.add(cashier);
        } catch (error) {
          // Ignore duplicate key errors
          if (!error.message.includes("already exists")) {
            throw error;
          }
        }
      }

      toast.success("Test cashiers added successfully!");
    } catch (error) {
      console.error("Error adding test cashiers:", error);
      toast.error("Failed to add test cashiers");
    } finally {
      setLoading(false);
    }
  };

  const handleViewCashiers = async () => {
    try {
      const users = await db.users.toArray();
      console.log("All users in IndexedDB:", users);
      toast.success(`Found ${users.length} users. Check console.`);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    }
  };

  return (
    <div className="min-h-screen p-8 bg-neutral-50 dark:bg-neutral-900">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Cashier Setup</h1>
          <p className="text-neutral-500 mt-2">
            Add cashiers to test the offline POS login system
          </p>
        </div>

        {/* Add Single Cashier */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add New Cashier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddCashier} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Cashier Name
                </label>
                <Input
                  placeholder="Enter cashier name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  PIN (4-6 digits)
                </label>
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Enter PIN"
                  value={pin}
                  onChange={(e) =>
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  maxLength={6}
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                Add Cashier
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quick Test Setup */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Test Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-neutral-600">
              Add pre-configured test cashiers for quick testing:
            </p>
            <div className="space-y-2 text-sm">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded">
                <p className="font-medium">John Doe</p>
                <p className="text-neutral-500">PIN: 1234 | Role: Cashier</p>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded">
                <p className="font-medium">Jane Smith</p>
                <p className="text-neutral-500">PIN: 5678 | Role: Cashier</p>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded">
                <p className="font-medium">Admin User</p>
                <p className="text-neutral-500">PIN: 0000 | Role: Admin</p>
              </div>
            </div>
            <Button
              onClick={handleAddTestCashiers}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              Add All Test Cashiers
            </Button>
          </CardContent>
        </Card>

        {/* Debug Tools */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleViewCashiers}
              variant="outline"
              className="w-full"
            >
              View All Cashiers (Console)
            </Button>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ol className="list-decimal list-inside space-y-2">
              <li>Add test cashiers using the form above</li>
              <li>Go to the Sales page (/sales)</li>
              <li>Enter a cashier PIN to login</li>
              <li>Process some transactions</li>
              <li>Go offline (disconnect internet)</li>
              <li>Process more transactions (should still work)</li>
              <li>Check sync status indicator</li>
              <li>Reconnect internet and watch sync</li>
              <li>View order history to see cashier names</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

