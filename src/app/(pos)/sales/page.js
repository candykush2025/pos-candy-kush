"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Lock, DollarSign } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { dbService } from "@/lib/db/dbService";
import { getDocuments } from "@/lib/firebase/firestore";
import { shiftsService } from "@/lib/firebase/shiftsService";
import { toast } from "sonner";
import { usePosTabStore } from "@/store/usePosTabStore";
import { formatCurrency } from "@/lib/utils/format";

// Import section components
import SalesSection from "@/components/pos/SalesSection";
import TicketsSection from "@/components/pos/TicketsSection";
import CustomersSection from "@/components/pos/CustomersSection";
import HistorySection from "@/components/pos/HistorySection";
import ProductsSection from "@/components/pos/ProductsSection";
import SettingsSection from "@/components/pos/SettingsSection";
import ShiftsSection from "@/components/pos/ShiftsSection";

// Cashier Login Component
function CashierLogin({ onLogin }) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [showStartingCashModal, setShowStartingCashModal] = useState(false);
  const [startingCash, setStartingCash] = useState("");
  const [pendingCashier, setPendingCashier] = useState(null);

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
        // Always show starting cash modal to allow multiple shifts per day
        // Check if user has today's shifts to display info
        const todayShifts = await shiftsService.getTodayShifts(cashier.id);
        const activeShift = todayShifts.find((s) => s.status === "active");

        if (activeShift) {
          // Has active shift - resume it
          onLogin(cashier, activeShift);
          toast.success(
            `Welcome back, ${cashier.name || "Cashier"}! Shift resumed.`
          );
        } else {
          // No active shift - show starting cash modal (could be first shift or new shift after clocking out)
          setPendingCashier(cashier);
          setShowStartingCashModal(true);
          setLoading(false);
          return;
        }
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

  const handleStartShift = async () => {
    if (!startingCash || parseFloat(startingCash) < 0) {
      toast.error("Please enter a valid starting cash amount");
      return;
    }

    try {
      setLoading(true);

      // Create new shift
      const shift = await shiftsService.createShift(
        { startingCash: parseFloat(startingCash) },
        pendingCashier.id,
        pendingCashier.name
      );

      // Login cashier with shift
      onLogin(pendingCashier, shift);
      setShowStartingCashModal(false);
      toast.success(`Shift started! Welcome, ${pendingCashier.name}!`);
    } catch (error) {
      console.error("Error starting shift:", error);
      toast.error("Failed to start shift. Please try again.");
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

      {/* Starting Cash Modal */}
      <Dialog
        open={showStartingCashModal}
        onOpenChange={setShowStartingCashModal}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start Your Shift</DialogTitle>
            <DialogDescription>
              Enter the starting cash amount in the register
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Starting Cash Amount
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={startingCash}
                  onChange={(e) => setStartingCash(e.target.value)}
                  className="pl-10 text-lg"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500">
                This is the cash you have in the register at the start of your
                shift
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowStartingCashModal(false);
                  setPendingCashier(null);
                  setStartingCash("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleStartShift}
                disabled={loading || !startingCash}
                className="flex-1"
              >
                {loading ? "Starting..." : "Start Shift"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SalesPage() {
  const [cashier, setCashier] = useState(null);
  const [activeShift, setActiveShift] = useState(null);
  const { user } = useAuthStore();
  const { activeTab, setActiveTab } = usePosTabStore();

  // Check if there's a logged-in cashier on mount and listen for logout events
  useEffect(() => {
    const loadCashier = () => {
      const savedCashier = localStorage.getItem("pos_cashier");
      if (savedCashier) {
        try {
          const parsedCashier = JSON.parse(savedCashier);
          // Only update if different to prevent infinite loop
          setCashier((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(parsedCashier)) {
              return parsedCashier;
            }
            return prev;
          });
        } catch (error) {
          console.error("Error loading cashier session:", error);
        }
      } else {
        // If no cashier in localStorage, clear state to show login
        setCashier((prev) => (prev === null ? prev : null));
      }
    };

    // Load cashier on mount
    loadCashier();

    // Listen for cashier updates from layout logout button
    window.addEventListener("cashier-update", loadCashier);
    window.addEventListener("storage", loadCashier);

    return () => {
      window.removeEventListener("cashier-update", loadCashier);
      window.removeEventListener("storage", loadCashier);
    };
  }, []);

  const handleCashierLogin = (user, shift = null) => {
    setCashier(user);
    setActiveShift(shift);
    const sessionData = { user, shift };
    localStorage.setItem("pos_cashier", JSON.stringify(user));
    if (shift) {
      localStorage.setItem("active_shift", JSON.stringify(shift));
    }
    // Trigger layout update
    window.dispatchEvent(new Event("cashier-update"));
    setActiveTab("sales");
  };

  const handleCashierLogout = () => {
    setCashier(null);
    setActiveShift(null);
    localStorage.removeItem("pos_cashier");
    localStorage.removeItem("active_shift");
    toast.success("Logged out successfully");
  };

  // Show login screen if no cashier is logged in
  if (!cashier) {
    return <CashierLogin onLogin={handleCashierLogin} />;
  }
  // Main POS interface - SPA with sections
  return (
    <div className="h-full overflow-hidden">
      {activeTab === "sales" && <SalesSection cashier={cashier} />}
      {activeTab === "tickets" && (
        <TicketsSection onSwitchToSales={() => setActiveTab("sales")} />
      )}
      {activeTab === "customers" && <CustomersSection />}
      {activeTab === "history" && <HistorySection cashier={cashier} />}
      {activeTab === "shifts" && <ShiftsSection cashier={cashier} />}
      {activeTab === "products" && <ProductsSection />}
      {activeTab === "settings" && <SettingsSection />}
    </div>
  );
}
