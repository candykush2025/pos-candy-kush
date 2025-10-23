"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useSyncStore } from "@/store/useSyncStore";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { syncEngine } from "@/lib/sync/syncEngine";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export default function POSLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { status, isOnline, lastSyncTime, pendingCount } = useSyncStore();
  const onlineStatus = useOnlineStatus();
  const [cashier, setCashier] = useState(null);
  const { activeTab, setActiveTab } = usePosTabStore();

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

  // Get cashier from localStorage and listen for updates
  useEffect(() => {
    const loadCashier = () => {
      const savedCashier = localStorage.getItem("pos_cashier");
      if (savedCashier) {
        try {
          setCashier(JSON.parse(savedCashier));
        } catch (error) {
          console.error("Error loading cashier:", error);
        }
      } else {
        setCashier(null);
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

  const handleCashierLogout = () => {
    setCashier(null);
    localStorage.removeItem("pos_cashier");
    window.dispatchEvent(new Event("cashier-update"));
    toast.success("Cashier logged out");
    // Logout admin user and redirect to login page
    logout();
    router.push("/login");
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
    <div className="h-screen bg-gray-50 flex flex-col light overflow-hidden">
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

            {/* Cashier Info */}
            {cashier && pathname === "/sales" && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-md">
                <User className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs font-medium text-green-700">
                  {cashier.name || "Cashier"}
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
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="text-xs">Logout</span>
              </Button>
            )}

            {/* Admin Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 h-7 px-2">
                  <User className="h-3.5 w-3.5" />
                  <span className="text-xs hidden sm:inline">{user?.name}</span>
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
    </div>
  );
}
