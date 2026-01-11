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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useThemeStore } from "@/store/useThemeStore";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { APKInstallPrompt } from "@/components/APKInstallPrompt";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import {
  getAllCurrencyCodes,
  getCurrencyDetails,
} from "@/lib/constants/allCurrencies";
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
  Package,
  ShoppingCart,
  Users,
  UserCog,
  BarChart3,
  Plug,
  ChevronRight,
  LogOut,
  DollarSign,
  RefreshCw,
} from "lucide-react";

export default function AdminSettings() {
  const router = useRouter();
  const { logout } = useAuthStore();
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

  // Currency exchange rate states
  const [exchangeRates, setExchangeRates] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [baseCurrency, setBaseCurrency] = useState("THB");
  const [searchTerm, setSearchTerm] = useState("");

  // Get all available currencies
  const allCurrencies = getAllCurrencyCodes();

  // Load exchange rates from Firebase on mount
  useEffect(() => {
    loadExchangeRates();
  }, []);

  const loadExchangeRates = async () => {
    try {
      const docRef = doc(db, "settings", "exchange_rates");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setExchangeRates(data.rates);
        setLastUpdated(data.lastUpdated);
        setBaseCurrency(data.baseCurrency || "THB");
      }
    } catch (error) {
      console.error("Error loading exchange rates:", error);
    }
  };

  const refreshExchangeRates = async () => {
    try {
      setIsRefreshing(true);

      // Fetch from ExchangeRate-API
      const response = await fetch(
        `https://v6.exchangerate-api.com/v6/6b455dd83fbad089acb2892c/latest/${baseCurrency}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch exchange rates");
      }

      const data = await response.json();

      if (data.result !== "success") {
        throw new Error(data["error-type"] || "Failed to fetch rates");
      }

      // Save to Firebase
      const docRef = doc(db, "settings", "exchange_rates");
      await setDoc(docRef, {
        rates: data.conversion_rates,
        baseCurrency: baseCurrency,
        lastUpdated: new Date().toISOString(),
        timeLastUpdateUtc: data.time_last_update_utc,
        timeNextUpdateUtc: data.time_next_update_utc,
      });

      // Update local state
      setExchangeRates(data.conversion_rates);
      setLastUpdated(new Date().toISOString());

      toast.success("Exchange rates updated successfully!");
    } catch (error) {
      console.error("Error refreshing exchange rates:", error);
      toast.error(error.message || "Failed to refresh exchange rates");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    router.push("/login");
  };

  // Quick links for mobile only
  const quickLinks = [
    {
      title: "Stock",
      description: "Manage inventory levels",
      icon: Package,
      href: "/admin/stock",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "Orders",
      description: "View order history",
      icon: ShoppingCart,
      href: "/admin/orders",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
    },
    {
      title: "Customers",
      description: "Customer management",
      icon: Users,
      href: "/admin/customers",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-900/20",
    },
    {
      title: "Users",
      description: "Manage staff accounts",
      icon: UserCog,
      href: "/admin/users",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      title: "Analytics",
      description: "Sales insights",
      icon: BarChart3,
      href: "/admin/analytics",
      color: "text-pink-600 dark:text-pink-400",
      bgColor: "bg-pink-50 dark:bg-pink-900/20",
    },
    {
      title: "Integration",
      description: "Loyverse sync",
      icon: Plug,
      href: "/admin/integration",
      color: "text-cyan-600 dark:text-cyan-400",
      bgColor: "bg-cyan-50 dark:bg-cyan-900/20",
    },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-sm md:text-base text-neutral-500 dark:text-neutral-400 mt-1 md:mt-2">
          System configuration and information
        </p>
      </div>

      {/* Quick Links - Mobile Only */}
      <Card className="lg:hidden">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <SettingsIcon className="mr-2 h-5 w-5" />
            Quick Access
          </CardTitle>
          <CardDescription className="text-base">
            Navigate to other admin pages
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.href}
                onClick={() => router.push(link.href)}
                className="flex flex-col items-start p-6 rounded-lg border-2 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 transition-all hover:shadow-md active:scale-95"
              >
                <div
                  className={`w-10 h-10 rounded-lg ${link.bgColor} flex items-center justify-center mb-3`}
                >
                  <Icon className={`h-5 w-5 ${link.color}`} />
                </div>
                <span className="text-base font-semibold mb-1">
                  {link.title}
                </span>
                <span className="text-sm text-neutral-500 dark:text-neutral-400 text-left">
                  {link.description}
                </span>
                <ChevronRight className="h-4 w-4 text-neutral-400 ml-auto mt-1" />
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Dark Mode Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Moon className="mr-2 h-6 w-6 md:h-5 md:w-5" />
            Appearance
          </CardTitle>
          <CardDescription className="text-base">
            Choose how the admin panel looks to you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {/* System */}
            <button
              onClick={() => setMode("system")}
              className={`flex flex-col items-center p-6 rounded-lg border-2 transition-all ${
                mode === "system"
                  ? "border-primary bg-primary/5"
                  : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
              }`}
            >
              <Monitor className="h-8 w-8 mb-2" />
              <span className="text-base font-medium">System</span>
              <span className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 text-center">
                Use system theme
              </span>
            </button>

            {/* Light */}
            <button
              onClick={() => setMode("light")}
              className={`flex flex-col items-center p-6 rounded-lg border-2 transition-all ${
                mode === "light"
                  ? "border-primary bg-primary/5"
                  : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
              }`}
            >
              <Sun className="h-8 w-8 mb-2" />
              <span className="text-base font-medium">Light</span>
              <span className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Always light
              </span>
            </button>

            {/* Dark */}
            <button
              onClick={() => setMode("dark")}
              className={`flex flex-col items-center p-6 rounded-lg border-2 transition-all ${
                mode === "dark"
                  ? "border-primary bg-primary/5"
                  : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
              }`}
            >
              <Moon className="h-8 w-8 mb-2" />
              <span className="text-base font-medium">Dark</span>
              <span className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Always dark
              </span>
            </button>
          </div>

          {mode === "system" && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-base text-blue-900 dark:text-blue-200 flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Theme will automatically switch based on your system settings
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Currency Exchange Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <DollarSign className="mr-2 h-6 w-6 md:h-5 md:w-5" />
            Currency Exchange Rates
          </CardTitle>
          <CardDescription className="text-base">
            Manage currency conversion rates for multi-currency support
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Base Currency Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Base Currency</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={baseCurrency} onValueChange={setBaseCurrency}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allCurrencies.map((code) => {
                    const details = getCurrencyDetails(code);
                    return (
                      <SelectItem key={code} value={code}>
                        {details.symbol} {code} - {details.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button
                onClick={refreshExchangeRates}
                disabled={isRefreshing}
                className="w-full sm:w-auto"
                size="lg"
              >
                {isRefreshing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Rates
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              All exchange rates will be calculated based on this currency
            </p>
          </div>

          {/* Last Updated Info */}
          {lastUpdated && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                <strong>Last Updated:</strong>{" "}
                {new Date(lastUpdated).toLocaleString()}
              </p>
              <p className="text-sm text-blue-900 dark:text-blue-200 mt-1">
                <strong>Base Currency:</strong>{" "}
                {(() => {
                  const details = getCurrencyDetails(baseCurrency);
                  return `${details.symbol} ${baseCurrency} - ${details.name}`;
                })()}
              </p>
            </div>
          )}

          {/* Exchange Rates Display */}
          {exchangeRates && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h4 className="font-semibold text-base">
                  Available Rates ({Object.keys(exchangeRates).length}{" "}
                  currencies)
                </h4>
                <Input
                  placeholder="Search currency..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64"
                />
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-neutral-50 dark:bg-neutral-900 sticky top-0">
                      <TableRow>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Currency Name</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead className="text-right">
                          Exchange Rate
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(exchangeRates)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .filter(([currency]) => {
                          if (!searchTerm) return true;
                          const details = getCurrencyDetails(currency);
                          const term = searchTerm.toLowerCase();
                          return (
                            currency.toLowerCase().includes(term) ||
                            details.name.toLowerCase().includes(term) ||
                            details.country.toLowerCase().includes(term)
                          );
                        })
                        .map(([currency, rate]) => {
                          const details = getCurrencyDetails(currency);
                          return (
                            <TableRow key={currency}>
                              <TableCell className="font-semibold text-lg">
                                {details.symbol}
                              </TableCell>
                              <TableCell className="font-mono font-semibold">
                                {currency}
                              </TableCell>
                              <TableCell>{details.name}</TableCell>
                              <TableCell className="text-neutral-600 dark:text-neutral-400">
                                {details.country}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {typeof rate === "number"
                                  ? rate.toFixed(4)
                                  : rate}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {!exchangeRates && !isRefreshing && (
            <div className="p-8 text-center border rounded-lg border-dashed">
              <DollarSign className="h-12 w-12 mx-auto mb-3 text-neutral-400" />
              <p className="text-neutral-600 dark:text-neutral-400 mb-3">
                No exchange rates loaded yet
              </p>
              <Button onClick={refreshExchangeRates} size="lg">
                <RefreshCw className="mr-2 h-4 w-4" />
                Fetch Exchange Rates
              </Button>
            </div>
          )}

          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-900 dark:text-amber-200">
              <strong>Note:</strong> Exchange rates are fetched from
              ExchangeRate-API. Click refresh to get the latest rates and save
              them to Firebase. Rates update automatically on the API side.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Color Theme Customization - Commented out
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Palette className="mr-2 h-6 w-6 md:h-5 md:w-5" />
            POS Color Theme
          </CardTitle>
          <CardDescription className="text-base">
            Customize the POS interface colors (Admin only)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 md:space-y-6">
          <div className="space-y-3">
            <label className="text-base md:text-base font-medium">
              Primary Color
            </label>
            <p className="text-base md:text-sm text-neutral-500">
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
                className="flex-1 h-14 text-base"
                maxLength={7}
              />
              <div
                className="hidden sm:block w-12 h-12 rounded border-2 border-neutral-300 flex-shrink-0"
                style={{ backgroundColor: primaryColor }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-base md:text-base font-medium">
              Secondary Color
            </label>
            <p className="text-base md:text-sm text-neutral-500">
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
                className="flex-1 h-14 text-base"
                maxLength={7}
              />
              <div
                className="hidden sm:block w-12 h-12 rounded border-2 border-neutral-300 flex-shrink-0"
                style={{ backgroundColor: secondaryColor }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-base md:text-base font-medium">
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
                  className="flex flex-col items-center p-4 md:p-6 rounded-lg border-2 hover:border-neutral-400 transition-colors active:scale-95"
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
                  <span className="text-sm md:text-sm font-medium">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-base md:text-base font-medium">
              Preview
            </label>
            <div className="p-6 md:p-8 border rounded-lg space-y-4 bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-700">
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

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={async () => {
                await resetTheme();
                toast.success("Theme reset to default colors");
              }}
              className="flex-1 h-14 md:h-12 text-base"
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
              className="flex-1 h-14 md:h-12"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Theme Colors"}
            </Button>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
            <p className="text-base text-blue-700 dark:text-blue-300">
              <strong>Note:</strong> Click "Save Theme Colors" to apply changes
              to all users. Colors are stored in Firebase and will be loaded
              automatically for all cashiers and managers.
            </p>
          </div>
        </CardContent>
      </Card>
      */}

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
            <span className="text-base text-neutral-600">Project ID</span>
            <Badge variant="secondary">
              {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-base text-neutral-600">Authentication</span>
            <Badge className="bg-green-100 text-green-800">Connected</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-base text-neutral-600">Firestore</span>
            <Badge className="bg-green-100 text-green-800">Connected</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-base text-neutral-600">Storage</span>
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
            <span className="text-base text-neutral-600">App Version</span>
            <Badge variant="secondary">v1.0.0</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-base text-neutral-600">Environment</span>
            <Badge variant="secondary">Production</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-base text-neutral-600">Last Deployment</span>
            <span className="text-base">{new Date().toLocaleDateString()}</span>
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
            <span className="text-base text-neutral-600">Offline Mode</span>
            <Badge className="bg-green-100 text-green-800">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-base text-neutral-600">Real-time Sync</span>
            <Badge className="bg-green-100 text-green-800">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-base text-neutral-600">Barcode Scanner</span>
            <Badge className="bg-yellow-100 text-yellow-800">Coming Soon</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-base text-neutral-600">Receipt Printing</span>
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

      {/* Account Actions */}
      <Card className="border-red-200 dark:border-red-900/50">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">
            Account Actions
          </CardTitle>
          <CardDescription>Sign out of your admin account</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleLogout}
            variant="destructive"
            className="w-full md:w-auto"
            size="lg"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3">
            You will be redirected to the login page
          </p>
        </CardContent>
      </Card>

      {/* APK Install Prompt */}
      <APKInstallPrompt forceShow={true} />
    </div>
  );
}
