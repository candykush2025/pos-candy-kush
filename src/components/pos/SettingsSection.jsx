"use client";

import { useState } from "react";
import { useThemeStore } from "@/store/useThemeStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Settings, Palette, Moon, Sun, Monitor } from "lucide-react";

export default function SettingsSection() {
  const { theme, setTheme } = useThemeStore();

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
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
