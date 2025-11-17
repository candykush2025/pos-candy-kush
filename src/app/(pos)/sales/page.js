"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
import { DollarSign } from "lucide-react";
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
import KioskOrdersPanel from "@/components/pos/KioskOrdersPanel";

// Cashier Login Component
function CashierLogin({ onLogin }) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [showStartingCashModal, setShowStartingCashModal] = useState(false);
  const [startingCash, setStartingCash] = useState("");
  const [pendingCashier, setPendingCashier] = useState(null);

  const handleCashKeypadPress = (value) => {
    if (value === "backspace") {
      setStartingCash((prev) => prev.slice(0, -1));
    } else if (value === "clear") {
      setStartingCash("");
    } else if (value === ".") {
      // Only add decimal if not already present
      if (!startingCash.includes(".")) {
        setStartingCash((prev) => prev + ".");
      }
    } else {
      // Add digit
      setStartingCash((prev) => prev + value);
    }
  };

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

      if (isOnline) {
        // PRIORITY: Fetch from Firebase when online
        try {
          const firebaseUsers = await getDocuments("users");
          if (firebaseUsers.length > 0) {
            // Sync to IndexedDB for offline use
            await dbService.upsertUsers(firebaseUsers);
            users = firebaseUsers;
          } else {
            // No users found in Firebase
          }
        } catch (fbError) {
          console.error("❌ Firebase fetch error:", fbError);
          // If online but Firebase fails, fall back to local data
          users = await dbService.getUsers();
          toast.warning("Using cached data. Some information may be outdated.");
        }
      } else {
        // OFFLINE: Use local IndexedDB data
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
    <div className="min-h-screen w-full bg-gray-100 dark:bg-gray-900 flex flex-col">
      {/* Header Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4">
        {/* PIN Input Section */}
        <div className="w-full max-w-sm mx-auto mb-6">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 shadow-xl border border-white/20">
            <Input
              type="text"
              readOnly
              placeholder="Enter PIN"
              value={pin.replace(/./g, "●")}
              className="text-center text-3xl tracking-widest pointer-events-none bg-transparent border-0 h-12 landscape:text-xl landscape:h-10 focus:ring-0"
              inputMode="none"
              autoComplete="off"
              onFocus={(e) => e.target.blur()}
            />
          </div>
        </div>

        {/* Numeric Keypad */}
        <div className="w-full max-w-sm mx-auto mb-4">
          <div className="grid grid-cols-3 gap-3 landscape:gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num.toString())}
                className="aspect-square bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg border border-white/20 hover:bg-white dark:hover:bg-gray-800 hover:shadow-xl transition-all duration-200 active:scale-95 flex items-center justify-center text-2xl font-semibold text-gray-900 dark:text-white landscape:text-lg"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleKeypadPress("clear")}
              className="aspect-square bg-red-50 dark:bg-red-900/50 backdrop-blur-sm rounded-lg shadow-lg border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/70 hover:shadow-xl transition-all duration-200 active:scale-95 flex items-center justify-center text-sm font-medium text-red-600 dark:text-red-400 landscape:text-xs"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress("0")}
              className="aspect-square bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg border border-white/20 hover:bg-white dark:hover:bg-gray-800 hover:shadow-xl transition-all duration-200 active:scale-95 flex items-center justify-center text-2xl font-semibold text-gray-900 dark:text-white landscape:text-lg"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress("backspace")}
              className="aspect-square bg-amber-50 dark:bg-amber-900/50 backdrop-blur-sm rounded-lg shadow-lg border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/70 hover:shadow-xl transition-all duration-200 active:scale-95 flex items-center justify-center text-xl landscape:text-lg"
            >
              ⌫
            </button>
          </div>
        </div>
      </div>

      {/* Starting Cash Modal */}
      <Dialog
        open={showStartingCashModal}
        onOpenChange={setShowStartingCashModal}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-3xl">Start Your Shift</DialogTitle>
            <DialogDescription className="text-lg">
              Enter the starting cash amount in the register
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-8 py-8">
            <div className="space-y-6">
              <label className="text-xl font-medium">
                Starting Cash Amount (Optional)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-6 top-1/2 transform -translate-y-1/2 h-8 w-8 text-gray-400" />
                <Input
                  type="text"
                  readOnly
                  placeholder="0.00"
                  value={startingCash}
                  className="pl-16 text-2xl text-center pointer-events-none h-20"
                  inputMode="none"
                  autoComplete="off"
                  onFocus={(e) => e.target.blur()}
                />
              </div>

              {/* Numeric Keypad for Cash Amount */}
              <div className="grid grid-cols-3 gap-4 mt-8">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <Button
                    key={num}
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => handleCashKeypadPress(num.toString())}
                    className="h-20 text-3xl font-semibold"
                  >
                    {num}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => handleCashKeypadPress("clear")}
                  className="h-20 text-lg font-medium hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => handleCashKeypadPress("0")}
                  className="h-20 text-3xl font-semibold"
                >
                  0
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => handleCashKeypadPress(".")}
                  className="h-20 text-3xl font-semibold"
                >
                  .
                </Button>
              </div>

              <p className="text-base text-gray-500 dark:text-gray-400 mt-6">
                Enter starting cash to start a shift and make transactions. Skip
                to access view-only mode (history, reports, etc.)
              </p>
            </div>
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowStartingCashModal(false);
                  setPendingCashier(null);
                  setStartingCash("");
                }}
                className="flex-1 h-14 text-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleStartShift}
                disabled={loading}
                className="flex-1 h-14 text-xl"
              >
                {loading ? "Loading..." : "Skip (View Only)"}
              </Button>
              <Button
                onClick={handleStartShift}
                disabled={loading || !startingCash}
                className="flex-1 h-14 text-xl"
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
  // Initialize cashier from localStorage immediately (no null state)
  const [cashier, setCashier] = useState(() => {
    if (typeof window !== "undefined") {
      const savedCashier = localStorage.getItem("pos_cashier");
      if (savedCashier) {
        try {
          return JSON.parse(savedCashier);
        } catch (error) {
          console.error("Error loading cashier session:", error);
        }
      }
    }
    return null;
  });

  const [activeShift, setActiveShift] = useState(null);
  const { user } = useAuthStore();
  const { activeTab, setActiveTab } = usePosTabStore();
  const searchParams = useSearchParams();

  // Initialize active tab from URL parameter on mount
  useEffect(() => {
    const menuParam = searchParams.get("menu");
    if (menuParam) {
      // Valid menu tabs: sales, tickets, customers, history, shifts, products, settings, kiosk-orders
      const validTabs = [
        "sales",
        "tickets",
        "customers",
        "history",
        "shifts",
        "products",
        "settings",
        "kiosk-orders",
      ];
      if (validTabs.includes(menuParam)) {
        setActiveTab(menuParam);
      }
    }
  }, []); // Only run on mount

  // Sync activeTab with URL parameter
  useEffect(() => {
    const url = new URL(window.location);
    url.searchParams.set("menu", activeTab);
    window.history.replaceState({}, "", url);
  }, [activeTab]);

  // Listen for cashier updates from layout logout button
  useEffect(() => {
    const loadCashier = () => {
      const savedCashier = localStorage.getItem("pos_cashier");

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
        setCashier(null);
      }
    };

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
      // Clear React state
      setCashier(null);
      setActiveShift(null);

      // Clear ALL localStorage data
      localStorage.clear();

      // Clear ALL IndexedDB data (offline data)
      await dbService.clearAllData();

      // Clear cart store
      const { clearCart } = useCartStore.getState();
      clearCart();

      // Trigger update events
      window.dispatchEvent(new Event("cashier-update"));
      window.dispatchEvent(new Event("storage"));

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
    <div className="h-full overflow-hidden bg-white dark:bg-gray-900">
      {activeTab === "sales" && <SalesSection cashier={cashier} />}
      {activeTab === "tickets" && (
        <TicketsSection onSwitchToSales={() => setActiveTab("sales")} />
      )}
      {activeTab === "customers" && <CustomersSection cashier={cashier} />}
      {activeTab === "history" && <HistorySection cashier={cashier} />}
      {activeTab === "shifts" && <ShiftsSection cashier={cashier} />}
      {activeTab === "products" && <ProductsSection />}
      {activeTab === "settings" && <SettingsSection />}
      {activeTab === "kiosk-orders" && (
        <KioskOrdersPanel currentUser={cashier} />
      )}
    </div>
  );
}
