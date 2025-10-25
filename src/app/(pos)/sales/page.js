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
import { useCartStore } from "@/store/useCartStore";
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

  const handleLogin = async (e, pinToCheck = null) => {
    e.preventDefault();

    // Use provided pin or current state pin
    const currentPin = pinToCheck || pin;

    if (!currentPin || currentPin.length < 4) {
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
      console.log("Entered PIN:", currentPin);
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
        (u) =>
          u.pin === currentPin && (u.role === "cashier" || u.role === "admin")
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
    try {
      setLoading(true);

      if (startingCash && parseFloat(startingCash) >= 0) {
        // Create new shift with starting cash
        const shift = await shiftsService.createShift(
          { startingCash: parseFloat(startingCash) },
          pendingCashier.id,
          pendingCashier.name
        );

        // Login cashier with shift
        onLogin(pendingCashier, shift);
        setShowStartingCashModal(false);
        toast.success(`Shift started! Welcome, ${pendingCashier.name}!`);
      } else {
        // Skip shift creation - login without shift (view-only mode)
        onLogin(pendingCashier, null);
        setShowStartingCashModal(false);
        toast.info(
          `Welcome, ${pendingCashier.name}! View-only mode - Start a shift to make transactions.`
        );
      }
    } catch (error) {
      console.error("Error starting shift:", error);
      toast.error("Failed to start shift. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeypadPress = async (value) => {
    if (value === "backspace") {
      setPin((prev) => prev.slice(0, -1));
    } else if (value === "clear") {
      setPin("");
    } else if (pin.length < 6) {
      const newPin = pin + value;
      setPin(newPin);

      // Auto-submit when PIN reaches 4 digits (minimum valid length)
      if (newPin.length >= 4 && !loading) {
        // Small delay to show the last digit before submitting
        setTimeout(() => {
          handleLogin({ preventDefault: () => {} }, newPin);
        }, 200);
      }
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Cashier Login</CardTitle>
          <p className="text-gray-500 mt-2">Enter your PIN to access POS</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            {/* PIN Display (Read-only to prevent keyboard popup) */}
            <div>
              <Input
                type="text"
                readOnly
                placeholder="Enter PIN"
                value={pin.replace(/./g, "●")}
                className="text-center text-3xl tracking-widest pointer-events-none bg-gray-50 dark:bg-gray-800"
                inputMode="none"
                autoComplete="off"
                onFocus={(e) => e.target.blur()}
              />
            </div>

            {/* On-Screen Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <Button
                  key={num}
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => handleKeypadPress(num.toString())}
                  className="h-16 text-2xl font-semibold hover:bg-primary hover:text-primary-foreground"
                >
                  {num}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => handleKeypadPress("clear")}
                className="h-16 text-sm font-medium hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
              >
                Clear
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => handleKeypadPress("0")}
                className="h-16 text-2xl font-semibold hover:bg-primary hover:text-primary-foreground"
              >
                0
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => handleKeypadPress("backspace")}
                className="h-16 text-sm font-medium hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950"
              >
                ⌫
              </Button>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full h-12 text-lg"
              disabled={loading || pin.length < 4}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>

            <div className="space-y-1">
              <p className="text-sm text-gray-500 text-center">
                Works offline with synced users
              </p>
              <p className="text-xs text-blue-600 text-center">
                💡 Enter any employee's PIN to switch users
              </p>
            </div>
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
                Starting Cash Amount (Optional)
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
                Enter starting cash to start a shift and make transactions. Skip
                to access view-only mode (history, reports, etc.)
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
                type="button"
                variant="secondary"
                onClick={handleStartShift}
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Loading..." : "Skip (View Only)"}
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
      console.log(
        "📥 Sales page loadCashier:",
        savedCashier ? JSON.parse(savedCashier).name : "null"
      );

      if (savedCashier) {
        try {
          const parsedCashier = JSON.parse(savedCashier);
          setCashier(parsedCashier);
        } catch (error) {
          console.error("Error loading cashier session:", error);
          setCashier(null);
        }
      } else {
        // If no cashier in localStorage, clear state to show login
        console.log("🔓 Sales page: Clearing cashier state");
        setCashier(null);
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
    // Check if switching employees
    const currentCashier = localStorage.getItem("pos_cashier");
    if (currentCashier) {
      try {
        const parsedCurrentCashier = JSON.parse(currentCashier);
        if (parsedCurrentCashier.id !== user.id) {
          // Different employee - clear all previous data
          console.log(
            `🔄 Switching from ${parsedCurrentCashier.name} to ${user.name}`
          );
          toast.info(`Switching to ${user.name}...`);

          // IMMEDIATELY clear state first
          setCashier(null);
          setActiveShift(null);

          // Clear all localStorage data related to previous cashier
          localStorage.removeItem("pos_cashier");
          localStorage.removeItem("active_shift");

          // Trigger update to clear layout
          window.dispatchEvent(new Event("cashier-update"));

          // Force a brief delay to ensure clean state, then set new employee
          setTimeout(() => {
            console.log(`✅ Setting new employee: ${user.name}`);
            setCashier(user);
            setActiveShift(shift);
            localStorage.setItem("pos_cashier", JSON.stringify(user));
            if (shift) {
              localStorage.setItem("active_shift", JSON.stringify(shift));
            }
            // Trigger layout update again with new data
            window.dispatchEvent(new Event("cashier-update"));
            setActiveTab("sales");
            toast.success(`Welcome, ${user.name}!`);
          }, 200);
          return;
        }
      } catch (error) {
        console.error("Error checking current cashier:", error);
      }
    }

    // Same employee or first login - proceed normally
    setCashier(user);
    setActiveShift(shift);
    localStorage.setItem("pos_cashier", JSON.stringify(user));
    if (shift) {
      localStorage.setItem("active_shift", JSON.stringify(shift));
    }
    // Trigger layout update
    window.dispatchEvent(new Event("cashier-update"));
    setActiveTab("sales");
  };

  const handleCashierLogout = async () => {
    try {
      console.log("🧹 Starting complete logout cleanup...");

      // Clear React state
      setCashier(null);
      setActiveShift(null);

      // Clear ALL localStorage data
      console.log("🗑️ Clearing all localStorage...");
      localStorage.clear();

      // Clear ALL IndexedDB data (offline data)
      console.log("🗑️ Clearing all offline data from IndexedDB...");
      await dbService.clearAllData();

      // Clear cart store
      console.log("🗑️ Clearing cart...");
      const { clearCart } = useCartStore.getState();
      clearCart();

      // Trigger update events
      window.dispatchEvent(new Event("cashier-update"));
      window.dispatchEvent(new Event("storage"));

      console.log("✅ Complete cleanup finished!");
      toast.success("Logged out successfully - All data cleared");
    } catch (error) {
      console.error("❌ Error during logout cleanup:", error);
      toast.error("Logout successful, but some data may remain cached");
    }
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
      {activeTab === "customers" && <CustomersSection cashier={cashier} />}
      {activeTab === "history" && <HistorySection cashier={cashier} />}
      {activeTab === "shifts" && <ShiftsSection cashier={cashier} />}
      {activeTab === "products" && <ProductsSection />}
      {activeTab === "settings" && <SettingsSection />}
    </div>
  );
}
