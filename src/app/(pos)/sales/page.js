"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { dbService } from "@/lib/db/dbService";
import { getDocuments } from "@/lib/firebase/firestore";
import { toast } from "sonner";
import { usePosTabStore } from "@/store/usePosTabStore";

// Import section components
import SalesSection from "@/components/pos/SalesSection";
import TicketsSection from "@/components/pos/TicketsSection";
import CustomersSection from "@/components/pos/CustomersSection";
import HistorySection from "@/components/pos/HistorySection";
import ProductsSection from "@/components/pos/ProductsSection";
import SettingsSection from "@/components/pos/SettingsSection";

// Cashier Login Component
function CashierLogin({ onLogin }) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!pin || pin.length < 4) {
      toast.error("Please enter a valid PIN");
      return;
    }

    setLoading(true);
    try {
      let users = [];
      let isOnline = navigator.onLine;

      console.log(`Internet status: ${isOnline ? "ONLINE" : "OFFLINE"}`);

      if (isOnline) {
        // PRIORITY: Fetch from Firebase when online
        console.log("📡 Online mode: Fetching fresh data from Firebase...");
        try {
          const firebaseUsers = await getDocuments("users");
          if (firebaseUsers.length > 0) {
            // Sync to IndexedDB for offline use
            await dbService.upsertUsers(firebaseUsers);
            users = firebaseUsers;
            console.log(
              `✅ Synced ${firebaseUsers.length} users from Firebase to IndexedDB`
            );
          } else {
            console.log("⚠️ No users found in Firebase");
          }
        } catch (fbError) {
          console.error("❌ Firebase fetch error:", fbError);
          // If online but Firebase fails, fall back to local data
          console.log("⚠️ Firebase unavailable, using local data...");
          users = await dbService.getUsers();
          toast.warning("Using cached data. Some information may be outdated.");
        }
      } else {
        // OFFLINE: Use local IndexedDB data
        console.log("📴 Offline mode: Using local data from IndexedDB...");
        users = await dbService.getUsers();
        if (users.length > 0) {
          toast.info("Working offline with cached data");
        }
      }

      // Check if we have any users
      if (users.length === 0) {
        toast.error(
          "No users available. Please connect to internet and try again."
        );
        setLoading(false);
        return;
      }

      console.log("Available users:", users);
      console.log("Entered PIN:", pin);
      console.log(
        "Users with PINs:",
        users
          .filter((u) => u.pin)
          .map((u) => ({
            name: u.name,
            pin: u.pin,
            role: u.role,
          }))
      );

      // Find user with matching PIN and cashier role
      const cashier = users.find(
        (u) => u.pin === pin && (u.role === "cashier" || u.role === "admin")
      );

      if (cashier) {
        onLogin(cashier);
        toast.success(`Welcome back, ${cashier.name || "Cashier"}!`);
      } else {
        toast.error(
          `Invalid PIN or no cashier access. Found ${users.length} users.`
        );
        setPin("");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Cashier Login</CardTitle>
          <p className="text-gray-500 mt-2">Enter your PIN to access POS</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter 4-digit PIN"
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="text-center text-2xl tracking-widest"
                maxLength={6}
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || pin.length < 4}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
            <p className="text-sm text-gray-500 text-center mt-4">
              Works offline with synced users
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SalesPage() {
  const [cashier, setCashier] = useState(null);
  const { user } = useAuthStore();
  const { activeTab, setActiveTab } = usePosTabStore();

  // Check if there's a logged-in cashier on mount
  useEffect(() => {
    const savedCashier = localStorage.getItem("pos_cashier");
    if (savedCashier) {
      try {
        setCashier(JSON.parse(savedCashier));
      } catch (error) {
        console.error("Error loading cashier session:", error);
      }
    }
  }, []);

  // Update localStorage when cashier changes (sync with layout)
  useEffect(() => {
    if (cashier) {
      localStorage.setItem("pos_cashier", JSON.stringify(cashier));
      // Trigger layout update
      window.dispatchEvent(new Event("cashier-update"));
    }
  }, [cashier]);

  const handleCashierLogin = (user) => {
    setCashier(user);
    localStorage.setItem("pos_cashier", JSON.stringify(user));
    setActiveTab("sales");
  };

  const handleCashierLogout = () => {
    setCashier(null);
    localStorage.removeItem("pos_cashier");
    toast.success("Logged out successfully");
  };

  // Show login screen if no cashier is logged in
  if (!cashier) {
    return <CashierLogin onLogin={handleCashierLogin} />;
  }
  // Main POS interface - SPA with sections
  return (
    <div className="h-full">
      {activeTab === "sales" && <SalesSection cashier={cashier} />}
      {activeTab === "tickets" && (
        <TicketsSection onSwitchToSales={() => setActiveTab("sales")} />
      )}
      {activeTab === "customers" && <CustomersSection />}
      {activeTab === "history" && <HistorySection cashier={cashier} />}
      {activeTab === "products" && <ProductsSection />}
      {activeTab === "settings" && <SettingsSection />}
    </div>
  );
}
