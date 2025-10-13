"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Settings as SettingsIcon,
  User,
  Store,
  Bell,
  Printer,
  DollarSign,
  Shield,
  Database,
  Moon,
  Sun,
  Save,
} from "lucide-react";
import { toast } from "sonner";

// Settings Section Component
function SettingsSection({ title, description, icon: Icon, children }) {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      <Separator className="my-4" />
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

// Settings Field Component
function SettingsField({ label, description, children }) {
  return (
    <div className="space-y-2">
      <div>
        <label className="text-sm font-medium">{label}</label>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      {children}
    </div>
  );
}

// Main Settings Page Component
export default function SettingsPage() {
  const { user } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);

  // Store Settings
  const [storeName, setStoreName] = useState("Candy Kush POS");
  const [storeAddress, setStoreAddress] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeEmail, setStoreEmail] = useState("");

  // Receipt Settings
  const [receiptHeader, setReceiptHeader] = useState(
    "Thank you for your purchase!"
  );
  const [receiptFooter, setReceiptFooter] = useState("Please come again");
  const [showLogo, setShowLogo] = useState(true);

  // Tax Settings
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState("0");
  const [taxName, setTaxName] = useState("Tax");

  // Notification Settings
  const [lowStockAlert, setLowStockAlert] = useState(10);
  const [emailNotifications, setEmailNotifications] = useState(true);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // TODO: Save settings to Firebase
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
          <SettingsIcon className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-gray-600">
          Manage your POS system preferences and configuration
        </p>
      </div>

      <div className="space-y-6">
        {/* User Profile */}
        <SettingsSection
          title="User Profile"
          description="Your account information"
          icon={User}
        >
          <SettingsField label="Name">
            <Input value={user?.name || "User"} disabled />
          </SettingsField>
          <SettingsField label="Email">
            <Input value={user?.email || "user@example.com"} disabled />
          </SettingsField>
          <SettingsField label="Role">
            <Badge variant="secondary" className="text-sm">
              {user?.role || "cashier"}
            </Badge>
          </SettingsField>
        </SettingsSection>

        {/* Store Information */}
        <SettingsSection
          title="Store Information"
          description="Configure your store details"
          icon={Store}
        >
          <SettingsField
            label="Store Name"
            description="This will appear on receipts and invoices"
          >
            <Input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Enter store name"
            />
          </SettingsField>
          <SettingsField label="Address">
            <Input
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              placeholder="Store address"
            />
          </SettingsField>
          <div className="grid grid-cols-2 gap-4">
            <SettingsField label="Phone">
              <Input
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </SettingsField>
            <SettingsField label="Email">
              <Input
                value={storeEmail}
                onChange={(e) => setStoreEmail(e.target.value)}
                placeholder="store@example.com"
                type="email"
              />
            </SettingsField>
          </div>
        </SettingsSection>

        {/* Receipt Settings */}
        <SettingsSection
          title="Receipt Settings"
          description="Customize your receipt appearance"
          icon={Printer}
        >
          <SettingsField
            label="Header Text"
            description="Text shown at the top of receipts"
          >
            <Input
              value={receiptHeader}
              onChange={(e) => setReceiptHeader(e.target.value)}
              placeholder="Receipt header"
            />
          </SettingsField>
          <SettingsField
            label="Footer Text"
            description="Text shown at the bottom of receipts"
          >
            <Input
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              placeholder="Receipt footer"
            />
          </SettingsField>
          <SettingsField label="Show Logo on Receipt">
            <Button
              variant={showLogo ? "default" : "outline"}
              onClick={() => setShowLogo(!showLogo)}
            >
              {showLogo ? "Enabled" : "Disabled"}
            </Button>
          </SettingsField>
        </SettingsSection>

        {/* Tax Settings */}
        <SettingsSection
          title="Tax Settings"
          description="Configure tax calculation"
          icon={DollarSign}
        >
          <SettingsField label="Enable Tax">
            <Button
              variant={taxEnabled ? "default" : "outline"}
              onClick={() => setTaxEnabled(!taxEnabled)}
            >
              {taxEnabled ? "Enabled" : "Disabled"}
            </Button>
          </SettingsField>
          {taxEnabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <SettingsField label="Tax Rate (%)">
                  <Input
                    type="number"
                    step="0.01"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    placeholder="0.00"
                  />
                </SettingsField>
                <SettingsField label="Tax Name">
                  <Input
                    value={taxName}
                    onChange={(e) => setTaxName(e.target.value)}
                    placeholder="e.g., VAT, GST"
                  />
                </SettingsField>
              </div>
            </>
          )}
        </SettingsSection>

        {/* Notification Settings */}
        <SettingsSection
          title="Notifications"
          description="Manage alerts and notifications"
          icon={Bell}
        >
          <SettingsField
            label="Low Stock Alert Threshold"
            description="Get notified when stock falls below this number"
          >
            <Input
              type="number"
              value={lowStockAlert}
              onChange={(e) => setLowStockAlert(e.target.value)}
              placeholder="10"
            />
          </SettingsField>
          <SettingsField label="Email Notifications">
            <Button
              variant={emailNotifications ? "default" : "outline"}
              onClick={() => setEmailNotifications(!emailNotifications)}
            >
              {emailNotifications ? "Enabled" : "Disabled"}
            </Button>
          </SettingsField>
        </SettingsSection>

        {/* Data Management */}
        <SettingsSection
          title="Data Management"
          description="Manage your data and storage"
          icon={Database}
        >
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
              <strong>Warning:</strong> These actions are irreversible. Please
              use with caution.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Export Data
              </Button>
              <Button variant="outline" size="sm">
                Clear Cache
              </Button>
              <Button variant="destructive" size="sm">
                Reset Settings
              </Button>
            </div>
          </div>
        </SettingsSection>

        {/* Security */}
        <SettingsSection
          title="Security"
          description="Account security and permissions"
          icon={Shield}
        >
          <SettingsField label="Change Password">
            <Button variant="outline">Update Password</Button>
          </SettingsField>
          <SettingsField label="Two-Factor Authentication">
            <Button variant="outline">Enable 2FA</Button>
          </SettingsField>
        </SettingsSection>

        {/* Save Button */}
        <div className="sticky bottom-6 bg-white dark:bg-gray-900 border-t pt-4">
          <Button
            onClick={handleSaveSettings}
            disabled={isSaving}
            size="lg"
            className="w-full"
          >
            <Save className="h-5 w-5 mr-2" />
            {isSaving ? "Saving..." : "Save All Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
