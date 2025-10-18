"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Smartphone,
  Monitor,
  Chrome,
  CheckCircle,
  XCircle,
  Share,
  MoreVertical,
  Plus,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

export default function PWAInstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [deviceType, setDeviceType] = useState("desktop");

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect device type
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipod/.test(userAgent)) {
      setDeviceType("ios");
    } else if (/ipad/.test(userAgent)) {
      setDeviceType("ipad");
    } else if (/android/.test(userAgent)) {
      setDeviceType("android");
    } else if (/mac/.test(userAgent)) {
      setDeviceType("mac");
    } else {
      setDeviceType("desktop");
    }

    // Listen for beforeinstallprompt event
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Listen for appinstalled event
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setIsInstallable(false);
      toast.success("App installed successfully!");
    });

    // Online/offline status
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast.error("Installation prompt not available");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      toast.success("Installation started");
    } else {
      toast.info("Installation cancelled");
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-24 h-24 bg-green-500 rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-lg">
              CK
            </div>
          </div>
          <h1 className="text-4xl font-bold text-neutral-900">
            Install Candy Kush POS
          </h1>
          <p className="text-lg text-neutral-600">
            Get the full app experience with offline support and faster performance
          </p>
        </div>

        {/* Installation Status */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isInstalled ? (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                ) : (
                  <Download className="h-8 w-8 text-blue-600" />
                )}
                <div>
                  <p className="font-semibold text-lg">
                    {isInstalled ? "App Installed" : "Ready to Install"}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {isInstalled
                      ? "You're using the installed app"
                      : "Install for the best experience"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={isOnline ? "default" : "destructive"}>
                  {isOnline ? (
                    <>
                      <Wifi className="h-3 w-3 mr-1" />
                      Online
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3 mr-1" />
                      Offline
                    </>
                  )}
                </Badge>
                {isInstallable && (
                  <Button onClick={handleInstallClick} size="lg">
                    <Download className="h-4 w-4 mr-2" />
                    Install Now
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Why Install?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <WifiOff className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold">Works Offline</h3>
                  <p className="text-sm text-neutral-600">
                    Continue selling even without internet connection
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Monitor className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold">Native App Experience</h3>
                  <p className="text-sm text-neutral-600">
                    Runs like a native app on your device
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Smartphone className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold">Quick Access</h3>
                  <p className="text-sm text-neutral-600">
                    Launch from home screen like any other app
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Chrome className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold">Faster Performance</h3>
                  <p className="text-sm text-neutral-600">
                    Cached resources for lightning-fast loading
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Installation Instructions */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Android Chrome */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Android (Chrome)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Badge className="flex-shrink-0">1</Badge>
                  <p className="text-sm">
                    Tap the <MoreVertical className="inline h-4 w-4" /> menu button in the top-right corner
                  </p>
                </div>
                <div className="flex gap-3">
                  <Badge className="flex-shrink-0">2</Badge>
                  <p className="text-sm">
                    Select "Add to Home screen" or "Install app"
                  </p>
                </div>
                <div className="flex gap-3">
                  <Badge className="flex-shrink-0">3</Badge>
                  <p className="text-sm">
                    Tap "Install" or "Add" to confirm
                  </p>
                </div>
                <div className="flex gap-3">
                  <Badge className="flex-shrink-0">4</Badge>
                  <p className="text-sm">
                    The app will appear on your home screen
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* iOS Safari */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                iPhone/iPad (Safari)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Badge className="flex-shrink-0">1</Badge>
                  <p className="text-sm">
                    Tap the <Share className="inline h-4 w-4" /> share button at the bottom
                  </p>
                </div>
                <div className="flex gap-3">
                  <Badge className="flex-shrink-0">2</Badge>
                  <p className="text-sm">
                    Scroll down and tap "Add to Home Screen"
                  </p>
                </div>
                <div className="flex gap-3">
                  <Badge className="flex-shrink-0">3</Badge>
                  <p className="text-sm">
                    Enter a name (default: "Candy Kush POS")
                  </p>
                </div>
                <div className="flex gap-3">
                  <Badge className="flex-shrink-0">4</Badge>
                  <p className="text-sm">
                    Tap "Add" in the top-right corner
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Desktop Chrome */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Desktop (Chrome/Edge)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Badge className="flex-shrink-0">1</Badge>
                  <p className="text-sm">
                    Click the <Plus className="inline h-4 w-4" /> install icon in the address bar
                  </p>
                </div>
                <div className="flex gap-3">
                  <Badge className="flex-shrink-0">2</Badge>
                  <p className="text-sm">
                    Or click <MoreVertical className="inline h-4 w-4" /> menu → "Install Candy Kush POS"
                  </p>
                </div>
                <div className="flex gap-3">
                  <Badge className="flex-shrink-0">3</Badge>
                  <p className="text-sm">
                    Click "Install" in the popup dialog
                  </p>
                </div>
                <div className="flex gap-3">
                  <Badge className="flex-shrink-0">4</Badge>
                  <p className="text-sm">
                    The app will open in its own window
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Desktop Safari (Mac) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Mac (Safari)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Badge className="flex-shrink-0">1</Badge>
                  <p className="text-sm">
                    Click "File" in the menu bar
                  </p>
                </div>
                <div className="flex gap-3">
                  <Badge className="flex-shrink-0">2</Badge>
                  <p className="text-sm">
                    Select "Add to Dock"
                  </p>
                </div>
                <div className="flex gap-3">
                  <Badge className="flex-shrink-0">3</Badge>
                  <p className="text-sm">
                    The app icon will appear in your Dock
                  </p>
                </div>
                <div className="flex gap-3">
                  <Badge className="flex-shrink-0">4</Badge>
                  <p className="text-sm">
                    Click the icon to launch the app
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Troubleshooting */}
        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold mb-2">
                  Don't see the install option?
                </h3>
                <ul className="list-disc list-inside text-sm text-neutral-600 space-y-1">
                  <li>Make sure you're using a supported browser (Chrome, Edge, Safari)</li>
                  <li>Check that you're accessing the site via HTTPS</li>
                  <li>Try refreshing the page</li>
                  <li>Clear your browser cache and try again</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  Already installed but can't find the app?
                </h3>
                <ul className="list-disc list-inside text-sm text-neutral-600 space-y-1">
                  <li>Check your home screen (mobile) or app drawer</li>
                  <li>Check your Dock or Applications folder (Mac)</li>
                  <li>Search for "Candy Kush" in your device search</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  Want to uninstall?
                </h3>
                <ul className="list-disc list-inside text-sm text-neutral-600 space-y-1">
                  <li>Mobile: Long-press the icon and select "Uninstall" or "Remove"</li>
                  <li>Desktop: Right-click the app window and select "Uninstall"</li>
                  <li>Or remove it from your browser's installed apps settings</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Browser Support */}
        <Card>
          <CardHeader>
            <CardTitle>Browser Support</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Chrome (Android & Desktop)</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Edge (Desktop)</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Safari (iOS & Mac)</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Samsung Internet (Android)</span>
              </div>
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-neutral-400" />
                <span className="text-neutral-500">Firefox (limited support)</span>
              </div>
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-neutral-400" />
                <span className="text-neutral-500">Opera (limited support)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back to App Button */}
        <div className="text-center">
          <Button size="lg" variant="outline" asChild>
            <a href="/">Back to App</a>
          </Button>
        </div>
      </div>
    </div>
  );
}

