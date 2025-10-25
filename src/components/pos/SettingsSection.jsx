"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { useCartStore } from "@/store/useCartStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Palette,
  Moon,
  Sun,
  Monitor,
  Clock,
  Lock,
  LogOut,
  User,
  Mail,
  KeyRound,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { dbService } from "@/lib/db/dbService";

export default function SettingsSection() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const { mode, setMode } = useThemeStore();
  const [idleTimeout, setIdleTimeout] = useState("300000"); // Default 5 minutes
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Load idle timeout setting on mount
  useEffect(() => {
    const saved = localStorage.getItem("pos_idle_timeout");
    if (saved) {
      setIdleTimeout(saved);
    }
  }, []);

  // Save idle timeout setting
  const handleTimeoutChange = (value) => {
    setIdleTimeout(value);
    localStorage.setItem("pos_idle_timeout", value);

    const timeoutLabels = {
      0: "never",
      60000: "1 minute",
      300000: "5 minutes",
      600000: "10 minutes",
      1800000: "30 minutes",
      3600000: "1 hour",
      7200000: "2 hours",
      10800000: "3 hours",
    };

    toast.success(`Idle timeout set to ${timeoutLabels[value]}`);

    // Dispatch event to notify layout of the change
    window.dispatchEvent(new Event("idle-timeout-changed"));
  };

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  const timeoutOptions = [
    { value: "0", label: "Never", description: "No automatic logout" },
    {
      value: "60000",
      label: "1 Minute",
      description: "Lock after 1 minute of inactivity",
    },
    {
      value: "300000",
      label: "5 Minutes",
      description: "Lock after 5 minutes of inactivity",
    },
    {
      value: "600000",
      label: "10 Minutes",
      description: "Lock after 10 minutes of inactivity",
    },
    {
      value: "1800000",
      label: "30 Minutes",
      description: "Lock after 30 minutes of inactivity",
    },
    {
      value: "3600000",
      label: "1 Hour",
      description: "Lock after 1 hour of inactivity",
    },
    {
      value: "7200000",
      label: "2 Hours",
      description: "Lock after 2 hours of inactivity",
    },
    {
      value: "10800000",
      label: "3 Hours",
      description: "Lock after 3 hours of inactivity",
    },
  ];

  // Complete logout handler
  const handleCompleteLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      console.log(
        "🧹 Performing complete logout from Settings - clearing all data"
      );

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
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-auto bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8 text-primary" />
          POS Settings
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Customize your POS experience
        </p>
      </div>

      {/* Theme Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">Theme</h3>
              <div className="grid grid-cols-3 gap-4">
                {themes.map((themeOption) => {
                  const Icon = themeOption.icon;
                  return (
                    <Button
                      key={themeOption.value}
                      variant={
                        mode === themeOption.value ? "default" : "outline"
                      }
                      className="h-24 flex flex-col gap-2"
                      onClick={() => setMode(themeOption.value)}
                    >
                      <Icon className="h-6 w-6" />
                      <span>{themeOption.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Idle Timeout
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Automatically lock the POS after a period of inactivity. You'll
                need to re-enter your PIN to continue.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {timeoutOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={
                      idleTimeout === option.value ? "default" : "outline"
                    }
                    className="h-auto py-3 flex flex-col items-start text-left"
                    onClick={() => handleTimeoutChange(option.value)}
                  >
                    <span className="font-semibold">{option.label}</span>
                    <span className="text-xs opacity-70 mt-1">
                      {option.value === "0"
                        ? "Always active"
                        : `After ${option.label.toLowerCase()}`}
                    </span>
                  </Button>
                ))}
              </div>
              {idleTimeout !== "0" && (
                <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Your session will be locked after{" "}
                  {timeoutOptions
                    .find((o) => o.value === idleTimeout)
                    ?.label.toLowerCase() || "inactivity"}
                  . Any activity will reset the timer.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receipt Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Receipt Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Receipt customization coming soon</p>
        </CardContent>
      </Card>

      {/* POS Preferences */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>POS Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Additional preferences coming soon</p>
        </CardContent>
      </Card>

      {/* Account Settings */}
      <Card className="mb-6 border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <User className="h-5 w-5" />
            Account Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Account Actions Section */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email & Password
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Update your account credentials (Coming soon)
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" disabled>
                    <Mail className="h-4 w-4 mr-2" />
                    Change Email
                  </Button>
                  <Button variant="outline" disabled>
                    <KeyRound className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Complete Logout */}
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                      Complete Logout
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      This will end your admin session and clear all offline
                      data including:
                    </p>
                    <ul className="text-xs text-red-600 dark:text-red-400 mt-2 space-y-1 ml-4 list-disc">
                      <li>Cached products, orders, and receipts</li>
                      <li>Active shifts and cashier sessions</li>
                      <li>Custom categories and tabs</li>
                      <li>All settings and preferences</li>
                    </ul>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleCompleteLogout}
                  disabled={isLoggingOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {isLoggingOut ? "Logging out..." : "Complete Logout"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
