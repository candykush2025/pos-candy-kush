"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { jwtUtils } from "@/lib/jwt";
import { useCartStore } from "@/store/useCartStore";
import { useSyncStore } from "@/store/useSyncStore";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { syncEngine } from "@/lib/sync/syncEngine";
import { dbService } from "@/lib/db/dbService";
import {
  productsService,
  categoriesService,
  customersService,
} from "@/lib/firebase/firestore";
import api from "@/lib/api/client";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  User,
  LogOut,
  Lock,
  ShoppingCart,
  Ticket,
  Users,
  History,
  Package,
  Settings as SettingsIcon,
  DollarSign,
  AlertTriangle,
  Clock,
  Bell,
  Menu,
  X as CloseIcon,
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
  const { isAuthenticated, user, logout, token } = useAuthStore();
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // Screen lock detection - Lock POS when device screen is locked (PWA)
  useEffect(() => {
    if (!cashier) return; // Only if cashier is logged in

    const handleVisibilityChange = () => {
      // When page becomes hidden (screen lock, minimize, etc.)
      if (document.hidden) {
        console.log("🔒 Screen locked/hidden - Locking POS");

        // Clear cashier to show PIN login screen
        setCashier(null);
        localStorage.removeItem("pos_cashier");
        window.dispatchEvent(new Event("cashier-update"));

        // Show toast when they return
        setTimeout(() => {
          if (!document.hidden) {
            toast.warning("Screen was locked. Please enter PIN to continue.");
          }
        }, 100);
      }
    };

    // Listen for page visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [cashier]);

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
    // POS uses cashier-based authentication (PIN login), not admin authentication
    // Skip the isAuthenticated check - cashier session is managed separately via localStorage
    // This allows URL parameters to persist through page refreshes

    // Start sync engine for offline queue processing
    // Firebase handles real-time sync when online
    // Sync engine processes offline queue when connection is restored
    syncEngine.start();

    return () => {
      syncEngine.stop();
    };
  }, []);

  // Update online status in sync store
  useEffect(() => {
    const syncStore = useSyncStore.getState();
    syncStore.setOnline(onlineStatus);
  }, [onlineStatus]);

  const handleLogout = () => {
    logout();
    router.push("/admin/dashboard");
  };

  // Lock screen - clear cashier session but keep data and shift active
  const handleLockScreen = () => {
    console.log("🔒 Locking screen - cashier session cleared");

    // Clear cashier state to show PIN login
    setCashier(null);

    // Clear only cashier from localStorage (keep shift, settings, device_id, etc.)
    localStorage.removeItem("pos_cashier");

    // Trigger update event
    window.dispatchEvent(new Event("cashier-update"));

    toast.info("Screen locked. Enter PIN to continue.");
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

      // Logout admin user and redirect to admin dashboard (authentication bypassed)
      logout();
      router.push("/admin/dashboard");
    } catch (error) {
      console.error("❌ Error during logout cleanup:", error);
      toast.error("Logout successful, but some data may remain cached");
      // Still proceed with logout even if cleanup fails
      logout();
      router.push("/admin/dashboard");
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
      // Run the standard sync (push pending, pull deltas)
      await syncEngine.forceSync();

      // Additionally force a full refresh of core collections from Firebase
      // to ensure we have the absolute latest products, categories and customers.
      try {
        const [products, categories, customers] = await Promise.all([
          productsService.getAll(),
          categoriesService.getAll(),
          customersService.getAll({ orderBy: ["name", "asc"] }),
        ]);

        if (products && products.length > 0) {
          // Clear local products then rewrite from Firebase so local exactly matches server
          try {
            const localProducts = await dbService.getProducts();
            const localIds = localProducts.map((p) => p.id);
            if (localIds.length > 0) {
              await dbService.bulkDeleteProducts(localIds);
              console.log(
                `Force-refresh: cleared ${localIds.length} local products before rewrite`
              );
            }
            await dbService.upsertProducts(products);
            console.log(
              `Force-refresh: rewrote ${products.length} products from Firebase into local DB`
            );
          } catch (err) {
            console.warn(
              "Force-refresh: failed to clear-and-rewrite products:",
              err
            );
          }
        }
        if (categories && categories.length > 0) {
          // Clear local categories then rewrite from Firebase
          try {
            const localCats = await dbService.getCategories();
            const localCatIds = localCats.map((c) => c.id);
            for (const cid of localCatIds) {
              try {
                await dbService.deleteCategory(cid);
              } catch (e) {
                console.warn(`Failed to delete local category ${cid}:`, e);
              }
            }
            await dbService.upsertCategories(categories);
            console.log(
              `Force-refresh: rewrote ${categories.length} categories from Firebase into local DB`
            );
          } catch (err) {
            console.warn(
              "Force-refresh: failed to clear-and-rewrite categories:",
              err
            );
          }
        }
        if (customers && customers.length > 0) {
          // Clear local customers then rewrite from Firebase
          try {
            const localCustomers = await dbService.getCustomers();
            const localCustIds = localCustomers.map((c) => c.id);
            for (const uid of localCustIds) {
              try {
                await dbService.deleteCustomer(uid);
              } catch (e) {
                console.warn(`Failed to delete local customer ${uid}:`, e);
              }
            }
            await dbService.upsertCustomers(customers);
            console.log(
              `Force-refresh: rewrote ${customers.length} customers from Firebase into local DB`
            );
          } catch (err) {
            console.warn(
              "Force-refresh: failed to clear-and-rewrite customers:",
              err
            );
          }
        }

        // Notify open windows/components to reload from local DB / re-render
        window.dispatchEvent(new Event("force-refresh-data"));
      } catch (refreshErr) {
        console.warn("Force-refresh failed:", refreshErr);
      }
    } catch (error) {
      console.error("Force sync failed:", error);
    }
  };

  // Check JWT token validity
  const isTokenValid =
    isAuthenticated &&
    user &&
    token &&
    (() => {
      try {
        return jwtUtils.isValid(token);
      } catch (error) {
        console.error("JWT validation error:", error);
        return false;
      }
    })();

  if (!isTokenValid) {
    return null;
  }

  return (
    <div
      key={cashier?.id || "no-cashier"}
      className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col light overflow-hidden"
    >
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-900 border-r dark:border-gray-800 shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-800">
            <h2 className="text-lg font-bold text-green-700 dark:text-green-500">
              Candy Kush POS
            </h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <CloseIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Sidebar Navigation */}
          {pathname === "/sales" && cashier && (
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              <button
                onClick={() => {
                  setActiveTab("sales");
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "sales"
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <ShoppingCart className="h-5 w-5" />
                Sales
              </button>
              <button
                onClick={() => {
                  setActiveTab("tickets");
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "tickets"
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <Ticket className="h-5 w-5" />
                Tickets
              </button>
              <button
                onClick={() => {
                  setActiveTab("customers");
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "customers"
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <Users className="h-5 w-5" />
                Customers
              </button>
              <button
                onClick={() => {
                  setActiveTab("history");
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "history"
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <History className="h-5 w-5" />
                History
              </button>
              <button
                onClick={() => {
                  setActiveTab("shifts");
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "shifts"
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <Clock className="h-5 w-5" />
                Shifts
              </button>
              <button
                onClick={() => {
                  setActiveTab("products");
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "products"
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <Package className="h-5 w-5" />
                Products
              </button>
              <button
                onClick={() => {
                  setActiveTab("kiosk-orders");
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "kiosk-orders"
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <Bell className="h-5 w-5" />
                Kiosk Orders
              </button>
              <button
                onClick={() => {
                  setActiveTab("settings");
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "settings"
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <SettingsIcon className="h-5 w-5" />
                Settings
              </button>
            </nav>
          )}
        </div>
      </aside>

      {/* ONE SINGLE UNIFIED HEADER ROW */}
      <header className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 shadow-sm flex-shrink-0 z-30">
        <div className="flex items-center justify-between gap-3 px-4 py-2">
          {/* Left: Logo & Menu Button */}
          <div className="flex items-center gap-3">
            {pathname === "/sales" && cashier && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Menu className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            )}
            <Link
              href="/sales"
              className="text-base font-bold text-green-700 dark:text-green-500 whitespace-nowrap"
            >
              Candy Kush POS
            </Link>

            {/* Idle Countdown */}
            {cashier && idleTimeoutMs > 0 && idleCountdown > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                  {Math.floor(idleCountdown / 60)}:
                  {String(idleCountdown % 60).padStart(2, "0")}
                </span>
              </div>
            )}
          </div>

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

            {/* Cashier Lock Button (shows PIN to lock) */}
            {cashier && pathname === "/sales" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLockScreen}
                className="gap-1.5 h-7 px-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                title={`Lock screen - Logged in as: ${cashier.name}`}
              >
                <User className="h-3.5 w-3.5" />
                <span className="text-xs">{cashier.name}</span>
                <Lock className="h-3.5 w-3.5" />
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
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-1 text-center text-xs text-yellow-800 dark:text-yellow-200">
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
