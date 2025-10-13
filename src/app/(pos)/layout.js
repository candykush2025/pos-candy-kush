"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useSyncStore } from "@/store/useSyncStore";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { syncEngine } from "@/lib/sync/syncEngine";
import api from "@/lib/api/client";
import { Wifi, WifiOff, RefreshCw, User, LogOut } from "lucide-react";
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

export default function POSLayout({ children }) {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { status, isOnline, lastSyncTime, pendingCount } = useSyncStore();
  const onlineStatus = useOnlineStatus();

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <Link href="/sales" className="text-xl font-bold text-green-700">
              Candy Kush POS
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-2">
            <Link href="/sales">
              <Button variant="ghost">Sales</Button>
            </Link>
            <Link href="/tickets">
              <Button variant="ghost">Tickets</Button>
            </Link>
            <Link href="/customers">
              <Button variant="ghost">Customers</Button>
            </Link>
            <Link href="/history">
              <Button variant="ghost">History</Button>
            </Link>
            <Link href="/products">
              <Button variant="ghost">Products</Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost">Settings</Button>
            </Link>
          </nav>

          {/* Status and User Menu */}
          <div className="flex items-center space-x-4">
            {/* Sync Status */}
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-600" />
              )}

              {pendingCount > 0 && (
                <Badge variant="secondary">{pendingCount} pending</Badge>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={handleForceSync}
                disabled={!isOnline || status === "syncing"}
              >
                <RefreshCw
                  className={`h-5 w-5 ${
                    status === "syncing" ? "animate-spin" : ""
                  }`}
                />
              </Button>
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span className="hidden sm:inline">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-semibold">{user?.name}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      {user?.role}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-yellow-100 border-b border-yellow-300 px-4 py-2 text-center text-sm text-yellow-800">
          You are currently offline. Changes will be synced when connection is
          restored.
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
