"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useThemeStore } from "@/store/useThemeStore";
import { toast } from "sonner";
import { useState } from "react";
import {
  Database,
  Wifi,
  Shield,
  Settings as SettingsIcon,
  HardDrive,
  Palette,
  Save,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";

export default function AdminSettings() {
  const {
    primaryColor,
    secondaryColor,
    mode,
    setPrimaryColor,
    setSecondaryColor,
    setMode,
    resetTheme,
    saveThemeToFirebase,
  } = useThemeStore();

  const [isSaving, setIsSaving] = useState(false);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
        <p className="text-sm md:text-base text-neutral-500 dark:text-neutral-400 mt-1 md:mt-2">
          System configuration and information
        </p>
      </div>

      {/* Dark Mode Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg md:text-xl">
            <Moon className="mr-2 h-6 w-6 md:h-5 md:w-5" />
            Appearance
          </CardTitle>
          <CardDescription className="text-sm">
            Choose how the admin panel looks to you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {/* System */}
            <button
              onClick={() => setMode("system")}
              className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${
                mode === "system"
                  ? "border-primary bg-primary/5"
                  : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
              }`}
            >
              <Monitor className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">System</span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 text-center">
                Use system theme
              </span>
            </button>

            {/* Light */}
            <button
              onClick={() => setMode("light")}
              className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${
                mode === "light"
                  ? "border-primary bg-primary/5"
                  : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
              }`}
            >
              <Sun className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">Light</span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Always light
              </span>
            </button>

            {/* Dark */}
            <button
              onClick={() => setMode("dark")}
              className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${
                mode === "dark"
                  ? "border-primary bg-primary/5"
                  : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
              }`}
            >
              <Moon className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">Dark</span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Always dark
              </span>
            </button>
          </div>

          {mode === "system" && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-200 flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Theme will automatically switch based on your system settings
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Color Theme Customization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg md:text-xl">
            <Palette className="mr-2 h-6 w-6 md:h-5 md:w-5" />
            POS Color Theme
          </CardTitle>
          <CardDescription className="text-sm">
            Customize the POS interface colors (Admin only)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 md:space-y-6">
          {/* Primary Color */}
          <div className="space-y-3">
            <label className="text-sm md:text-base font-medium">
              Primary Color
            </label>
            <p className="text-xs md:text-sm text-neutral-500">
              Main color used for buttons, highlights, and accents
            </p>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <Input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-full sm:w-20 h-14 md:h-12 cursor-pointer"
              />
              <Input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#16a34a"
                className="flex-1 h-12 text-base"
                maxLength={7}
              />
              <div
                className="hidden sm:block w-12 h-12 rounded border-2 border-neutral-300 flex-shrink-0"
                style={{ backgroundColor: primaryColor }}
              />
            </div>
          </div>

          {/* Secondary Color */}
          <div className="space-y-3">
            <label className="text-sm md:text-base font-medium">
              Secondary Color
            </label>
            <p className="text-xs md:text-sm text-neutral-500">
              Accent color for badges, links, and secondary elements
            </p>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <Input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-full sm:w-20 h-14 md:h-12 cursor-pointer"
              />
              <Input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                placeholder="#0ea5e9"
                className="flex-1 h-12 text-base"
                maxLength={7}
              />
              <div
                className="hidden sm:block w-12 h-12 rounded border-2 border-neutral-300 flex-shrink-0"
                style={{ backgroundColor: secondaryColor }}
              />
            </div>
          </div>

          {/* Preset Colors */}
          <div className="space-y-3">
            <label className="text-sm md:text-base font-medium">
              Quick Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { name: "Green", primary: "#16a34a", secondary: "#0ea5e9" },
                { name: "Blue", primary: "#2563eb", secondary: "#8b5cf6" },
                { name: "Purple", primary: "#9333ea", secondary: "#ec4899" },
                { name: "Red", primary: "#dc2626", secondary: "#f59e0b" },
                { name: "Orange", primary: "#ea580c", secondary: "#eab308" },
                { name: "Teal", primary: "#0d9488", secondary: "#06b6d4" },
              ].map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => {
                    setPrimaryColor(preset.primary);
                    setSecondaryColor(preset.secondary);
                  }}
                  className="flex flex-col items-center p-3 md:p-4 rounded-lg border-2 hover:border-neutral-400 transition-colors active:scale-95"
                  title={preset.name}
                >
                  <div className="flex gap-1 md:gap-2 mb-2">
                    <div
                      className="w-10 h-10 md:w-8 md:h-8 rounded"
                      style={{ backgroundColor: preset.primary }}
                    />
                    <div
                      className="w-10 h-10 md:w-8 md:h-8 rounded"
                      style={{ backgroundColor: preset.secondary }}
                    />
                  </div>
                  <span className="text-xs md:text-sm font-medium">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-3">
            <label className="text-sm md:text-base font-medium">Preview</label>
            <div className="p-4 md:p-6 border rounded-lg space-y-3 bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-700">
              <Button
                style={{
                  backgroundColor: primaryColor,
                  color: "white",
                }}
                className="w-full h-12 md:h-10 text-base"
              >
                Primary Button Preview
              </Button>
              <Button
                variant="outline"
                style={{
                  borderColor: secondaryColor,
                  color: secondaryColor,
                }}
                className="w-full h-12 md:h-10 text-base"
              >
                Secondary Button Preview
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={async () => {
                await resetTheme();
                toast.success("Theme reset to default colors");
              }}
              className="flex-1 h-12 md:h-10 text-base"
            >
              Reset to Default
            </Button>
            <Button
              onClick={async () => {
                setIsSaving(true);
                try {
                  await saveThemeToFirebase();
                  toast.success(
                    "Theme colors saved successfully! All users will see the new colors."
                  );
                } catch (error) {
                  toast.error("Failed to save theme colors");
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Theme Colors"}
            </Button>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Note:</strong> Click "Save Theme Colors" to apply changes
              to all users. Colors are stored in Firebase and will be loaded
              automatically for all cashiers and managers.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Firebase Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="mr-2 h-5 w-5" />
            Firebase Configuration
          </CardTitle>
          <CardDescription>Connected to Firebase services</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Project ID</span>
            <Badge variant="secondary">
              {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Authentication</span>
            <Badge className="bg-green-100 text-green-800">Connected</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Firestore</span>
            <Badge className="bg-green-100 text-green-800">Connected</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Storage</span>
            <Badge className="bg-green-100 text-green-800">Connected</Badge>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <SettingsIcon className="mr-2 h-5 w-5" />
            System Status
          </CardTitle>
          <CardDescription>Current system information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">App Version</span>
            <Badge variant="secondary">v1.0.0</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Environment</span>
            <Badge variant="secondary">Production</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Last Deployment</span>
            <span className="text-sm">{new Date().toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Enabled Features
          </CardTitle>
          <CardDescription>Active system features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Offline Mode</span>
            <Badge className="bg-green-100 text-green-800">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Real-time Sync</span>
            <Badge className="bg-green-100 text-green-800">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Barcode Scanner</span>
            <Badge className="bg-yellow-100 text-yellow-800">Coming Soon</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Receipt Printing</span>
            <Badge className="bg-yellow-100 text-yellow-800">Coming Soon</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Storage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <HardDrive className="mr-2 h-5 w-5" />
            Data Storage
          </CardTitle>
          <CardDescription>Local and cloud storage information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">
              Cloud Storage (Firebase)
            </span>
            <Badge className="bg-green-100 text-green-800">Active</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">
              Local Storage (IndexedDB)
            </span>
            <Badge className="bg-green-100 text-green-800">Active</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Sync Status</span>
            <Wifi className="h-4 w-4 text-green-600" />
          </div>
        </CardContent>
      </Card>

      {/* User Roles */}
      <Card>
        <CardHeader>
          <CardTitle>User Roles & Permissions</CardTitle>
          <CardDescription>Role-based access control</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Admin</h4>
                <Badge className="bg-red-100 text-red-800">Full Access</Badge>
              </div>
              <p className="text-sm text-neutral-600">
                Complete system access including user management, analytics, and
                settings
              </p>
            </div>

            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Manager</h4>
                <Badge className="bg-blue-100 text-blue-800">
                  Extended Access
                </Badge>
              </div>
              <p className="text-sm text-neutral-600">
                Sales operations, reports, discounts, and ticket management
              </p>
            </div>

            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Cashier</h4>
                <Badge className="bg-green-100 text-green-800">
                  Basic Access
                </Badge>
              </div>
              <p className="text-sm text-neutral-600">
                Basic sales operations and product viewing only
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

