"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useCartStore } from "@/store/useCartStore";
import { useSyncStore } from "@/store/useSyncStore";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { syncEngine } from "@/lib/sync/syncEngine";
import { dbService } from "@/lib/db/dbService";
import api from "@/lib/api/client";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  User,
  LogOut,
  ShoppingCart,
  Ticket,
  Users,
  History,
  Package,
  Settings as SettingsIcon,
  DollarSign,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { toast } from "sonner";
import { usePosTabStore } from "@/store/usePosTabStore";
import { shiftsService } from "@/lib/firebase/shiftsService";
import { formatCurrency } from "@/lib/utils/format";

export default function POSLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { status, isOnline, lastSyncTime, pendingCount } = useSyncStore();
  const onlineStatus = useOnlineStatus();
  const [cashier, setCashier] = useState(null);
  const [activeShift, setActiveShift] = useState(null);
  const [showEndShiftModal, setShowEndShiftModal] = useState(false);
  const [endingCash, setEndingCash] = useState("");
  const [isEndingShift, setIsEndingShift] = useState(false);
  const [idleTimeoutMs, setIdleTimeoutMs] = useState(0);
  const [idleCountdown, setIdleCountdown] = useState(0);
  const { activeTab, setActiveTab } = usePosTabStore();

  // Load idle timeout setting
  useEffect(() => {
    const loadTimeout = () => {
      const savedTimeout = localStorage.getItem("pos_idle_timeout");
      const timeoutMs = savedTimeout ? parseInt(savedTimeout, 10) : 300000; // Default 5 minutes
      setIdleTimeoutMs(timeoutMs);
    };

    loadTimeout();

    // Listen for timeout setting changes
    window.addEventListener("idle-timeout-changed", loadTimeout);
    window.addEventListener("storage", loadTimeout);

    return () => {
      window.removeEventListener("idle-timeout-changed", loadTimeout);
      window.removeEventListener("storage", loadTimeout);
    };
  }, []);

  // Idle timeout callback
  const handleIdle = () => {
    // Clear cashier to show PIN login screen
    setCashier(null);
    setActiveShift(null);
    localStorage.removeItem("pos_cashier");
    localStorage.removeItem("active_shift");
    window.dispatchEvent(new Event("cashier-update"));
    toast.warning("Session locked due to inactivity. Please enter PIN.");
  };

  // Apply idle timeout when cashier is logged in and timeout > 0
  const remainingTime = useIdleTimeout(
    handleIdle,
    cashier && idleTimeoutMs > 0 ? idleTimeoutMs : 0
  );

  // Update countdown display
  useEffect(() => {
    setIdleCountdown(remainingTime);
  }, [remainingTime]);

  // Force light theme for POS/Cashier layout
  useEffect(() => {
    // Remove dark class from html element
    document.documentElement.classList.remove("dark");

    // Add light mode enforcement class
    document.documentElement.classList.add("pos-light-mode");

    return () => {
      // Clean up when component unmounts
      document.documentElement.classList.remove("pos-light-mode");
    };
  }, []);

  // Get cashier and active shift from localStorage and listen for updates
  useEffect(() => {
    const loadCashier = () => {
      const savedCashier = localStorage.getItem("pos_cashier");
      const savedShift = localStorage.getItem("active_shift");

      if (savedCashier) {
        try {
          const parsed = JSON.parse(savedCashier);
          console.log(
            `📋 Layout loading cashier: ${parsed.name} (${parsed.id})`
          );
          setCashier(parsed);
        } catch (error) {
          console.error("Error loading cashier:", error);
        }
      } else {
        console.log("🔓 Layout: No cashier in localStorage, clearing state");
        setCashier(null);
      }

      if (savedShift) {
        try {
          setActiveShift(JSON.parse(savedShift));
        } catch (error) {
          console.error("Error loading shift:", error);
        }
      } else {
        setActiveShift(null);
      }
    };

    loadCashier();
    window.addEventListener("cashier-update", loadCashier);
    window.addEventListener("storage", loadCashier);

    return () => {
      window.removeEventListener("cashier-update", loadCashier);
      window.removeEventListener("storage", loadCashier);
    };
  }, []);

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    // Start sync engine for offline queue processing
    // Firebase handles real-time sync when online
    // Sync engine processes offline queue when connection is restored
    syncEngine.start();

    return () => {
      syncEngine.stop();
    };
  }, [isAuthenticated, router]);

  // Update online status in sync store
  useEffect(() => {
    const syncStore = useSyncStore.getState();
    syncStore.setOnline(onlineStatus);
  }, [onlineStatus]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleCashierLogout = async () => {
    // Check if there's an active shift
    if (activeShift && activeShift.status === "active") {
      // Show end shift modal
      setShowEndShiftModal(true);
    } else {
      // No active shift, just logout
      performLogout();
    }
  };

  const performLogout = async () => {
    try {
      console.log("🧹 Performing complete logout - clearing all data");
      
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
      toast.success("Logged out - All data cleared");
      
      // Logout admin user and redirect to login page
      logout();
      router.push("/login");
    } catch (error) {
      console.error("❌ Error during logout cleanup:", error);
      toast.error("Logout successful, but some data may remain cached");
      // Still proceed with logout even if cleanup fails
      logout();
      router.push("/login");
    }
  };

  const handleEndShift = async () => {
    // If ending cash is blank/empty, just logout without ending shift (stay clocked in)
    if (!endingCash || endingCash.trim() === "") {
      setShowEndShiftModal(false);
      performLogout();
      toast.info("Logged out. Your shift remains active.");
      return;
    }

    if (parseFloat(endingCash) < 0) {
      toast.error("Please enter a valid cash amount");
      return;
    }

    try {
      setIsEndingShift(true);

      // End the shift in Firebase
      const endedShift = await shiftsService.endShift(
        activeShift.id,
        { actualCash: parseFloat(endingCash) },
        cashier?.id,
        cashier?.name
      );

      const variance = endedShift.variance || 0;

      // Show variance message
      if (variance === 0) {
        toast.success("Perfect! Cash matches expected amount.");
      } else if (variance > 0) {
        toast.success(
          `Shift ended. Surplus: ${formatCurrency(Math.abs(variance))}`
        );
      } else {
        toast.error(
          `Shift ended. Shortage: ${formatCurrency(Math.abs(variance))}`
        );
      }

      setShowEndShiftModal(false);
      performLogout();
    } catch (error) {
      console.error("Error ending shift:", error);
      toast.error("Failed to end shift. Please try again.");
    } finally {
      setIsEndingShift(false);
    }
  };

  const handleForceSync = async () => {
    if (!onlineStatus) {
      console.log("Cannot sync while offline");
      return;
    }
    try {
      await syncEngine.forceSync();
    } catch (error) {
      console.error("Force sync failed:", error);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div
      key={cashier?.id || "no-cashier"}
      className="h-screen bg-gray-50 flex flex-col light overflow-hidden"
    >
      {/* ONE SINGLE UNIFIED HEADER ROW */}
      <header className="bg-white border-b shadow-sm flex-shrink-0 z-50">
        <div className="flex items-center justify-between gap-3 px-4 py-2">
          {/* Left: Logo & Cashier Info */}
          <div className="flex items-center gap-3">
            <Link
              href="/sales"
              className="text-base font-bold text-green-700 whitespace-nowrap"
            >
              Candy Kush POS
            </Link>

            {/* Idle Countdown */}
            {cashier && idleTimeoutMs > 0 && idleCountdown > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs text-gray-500 tabular-nums">
                  {Math.floor(idleCountdown / 60)}:
                  {String(idleCountdown % 60).padStart(2, "0")}
                </span>
              </div>
            )}
          </div>

          {/* Center: SPA Navigation Tabs */}
          {pathname === "/sales" && cashier && (
            <div className="flex-1 flex items-center justify-center">
              <nav className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab("sales")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeTab === "sales"
                      ? "bg-primary/10 text-primary"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Sales
                </button>
                <button
                  onClick={() => setActiveTab("tickets")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeTab === "tickets"
                      ? "bg-primary/10 text-primary"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <Ticket className="h-3.5 w-3.5" />
                  Tickets
                </button>
                <button
                  onClick={() => setActiveTab("customers")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeTab === "customers"
                      ? "bg-primary/10 text-primary"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  Customers
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeTab === "history"
                      ? "bg-primary/10 text-primary"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <History className="h-3.5 w-3.5" />
                  History
                </button>
                <button
                  onClick={() => setActiveTab("shifts")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeTab === "shifts"
                      ? "bg-primary/10 text-primary"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  Shifts
                </button>
                <button
                  onClick={() => setActiveTab("products")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeTab === "products"
                      ? "bg-primary/10 text-primary"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <Package className="h-3.5 w-3.5" />
                  Products
                </button>
                <button
                  onClick={() => setActiveTab("settings")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeTab === "settings"
                      ? "bg-primary/10 text-primary"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <SettingsIcon className="h-3.5 w-3.5" />
                  Settings
                </button>
              </nav>
            </div>
          )}

          {/* Right: Status & Actions */}
          <div className="flex items-center gap-2">
            {/* Online Status */}
            <div className="flex items-center gap-1.5">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-600" />
              )}
              {pendingCount > 0 && (
                <Badge variant="secondary" className="text-xs h-5 px-1.5">
                  {pendingCount}
                </Badge>
              )}
            </div>

            {/* Sync Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleForceSync}
              disabled={!isOnline || status === "syncing"}
              title="Sync data"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  status === "syncing" ? "animate-spin" : ""
                }`}
              />
            </Button>

            {/* Cashier Logout */}
            {cashier && pathname === "/sales" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCashierLogout}
                className="gap-1.5 h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                title={`Logged in as: ${cashier.name}`}
              >
                <User className="h-3.5 w-3.5" />
                <span className="text-xs">{cashier.name}</span>
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            )}

            {/* Admin Menu - Only show when NOT on sales page or no cashier logged in */}
            {pathname !== "/sales" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 h-7 px-2"
                  >
                    <User className="h-3.5 w-3.5" />
                    <span className="text-xs hidden sm:inline">
                      {user?.name}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuLabel>
                    <div>
                      <p className="text-xs font-semibold">{user?.name}</p>
                      <p className="text-xs text-gray-500 capitalize">
                        {user?.role}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 text-xs"
                  >
                    <LogOut className="mr-2 h-3.5 w-3.5" />
                    Admin Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-1 text-center text-xs text-yellow-800">
          ⚠️ Offline - Data will sync when connected
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">{children}</main>

      {/* End Shift Modal */}
      <Dialog open={showEndShiftModal} onOpenChange={setShowEndShiftModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>End Your Shift</DialogTitle>
            <DialogDescription>
              Count the cash in your register and enter the total amount, or
              leave blank to logout without clocking out
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Shift Summary */}
            {activeShift && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Starting Cash:</span>
                  <span className="font-semibold">
                    {formatCurrency(activeShift.startingCash || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cash Sales:</span>
                  <span className="font-semibold text-green-600">
                    +{formatCurrency(activeShift.totalCashSales || 0)}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="text-gray-900 font-medium">
                    Expected Cash:
                  </span>
                  <span className="font-bold text-lg">
                    {formatCurrency(
                      activeShift.expectedCash || activeShift.startingCash || 0
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Actual Cash Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Actual Cash in Register (Optional)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Leave blank to logout without clocking out"
                  value={endingCash}
                  onChange={(e) => setEndingCash(e.target.value)}
                  className="pl-10 text-lg"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500">
                Enter amount to clock out, or leave blank to logout without
                ending shift
              </p>
            </div>

            {/* Variance Preview */}
            {endingCash && activeShift && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Variance:</span>
                  {(() => {
                    const variance =
                      parseFloat(endingCash) -
                      (activeShift.expectedCash ||
                        activeShift.startingCash ||
                        0);
                    const isShort = variance < 0;
                    const isOver = variance > 0;
                    return (
                      <span
                        className={`font-bold ${
                          isShort
                            ? "text-red-600"
                            : isOver
                            ? "text-yellow-600"
                            : "text-green-600"
                        }`}
                      >
                        {variance === 0
                          ? "✓ Perfect Match"
                          : isShort
                          ? `⚠ Short ${formatCurrency(Math.abs(variance))}`
                          : `⚠ Over ${formatCurrency(variance)}`}
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEndShiftModal(false);
                  setEndingCash("");
                }}
                className="flex-1"
                disabled={isEndingShift}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEndShift}
                disabled={isEndingShift}
                className="flex-1"
              >
                {isEndingShift
                  ? "Processing..."
                  : endingCash
                  ? "End Shift & Logout"
                  : "Logout Without Clocking Out"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
