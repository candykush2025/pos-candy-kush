"use client";

import { useState, useEffect } from "react";
import { useThemeStore } from "@/store/useThemeStore";
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
} from "lucide-react";
import { toast } from "sonner";

export default function SettingsSection() {
  const { theme, setTheme } = useThemeStore();
  const [idleTimeout, setIdleTimeout] = useState("300000"); // Default 5 minutes

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

  return (
    <div className="h-full flex flex-col p-6 overflow-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8 text-primary" />
          POS Settings
        </h1>
        <p className="text-gray-500 mt-2">Customize your POS experience</p>
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
                        theme === themeOption.value ? "default" : "outline"
                      }
                      className="h-24 flex flex-col gap-2"
                      onClick={() => setTheme(themeOption.value)}
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
      <Card>
        <CardHeader>
          <CardTitle>POS Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Additional preferences coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
