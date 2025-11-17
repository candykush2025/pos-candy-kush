"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, X, Smartphone, Star } from "lucide-react";
import { toast } from "sonner";

export function APKInstallPrompt({ forceShow = false }) {
  const pathname = usePathname();
  const [apkMetadata, setApkMetadata] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Only show prompt on /login route (first page users see)
  const isOnLoginRoute = pathname === "/login";

  useEffect(() => {
    // Check if user is on Android device OR in development mode OR on login page OR forced to show
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isDevelopment = process.env.NODE_ENV === "development";

    // For development/testing, show on desktop too (you can remove this in production)
    const shouldShow =
      isAndroid || isDevelopment || isOnLoginRoute || forceShow;

    if (!shouldShow) {
      return;
    }

    // Check if already installed (this is a simple check)
    const dismissed = localStorage.getItem("apk-install-dismissed");
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = Math.floor(
        (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Fetch APK metadata from API
    const fetchApkMetadata = async () => {
      try {
        const response = await fetch("/api/apk");

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }

        const metadata = await response.json();
        setApkMetadata(metadata);

        // Show prompt instantly on login page or when forced
        if (isOnLoginRoute || forceShow) {
          setShowPrompt(true);
        }
      } catch (error) {
        console.error("APK Install: Failed to fetch metadata from API:", error);

        // Fallback to dummy APK metadata
        const dummyMetadata = {
          name: "Candy Kush POS",
          version: "1.0.1",
          versionCode: 2,
          sizeFormatted: "6.98 MB",
          developer: "Candy Kush",
          packageName: "com.candykush.pos",
          icon: "/icon-192x192.png", // Use existing PWA icon
          features: ["Offline Mode", "Fast Sync", "Secure Payments"],
          description:
            "Professional POS system for cannabis dispensaries with offline support",
          downloadUrl: "/ck.apk", // Point to the APK file in public folder
        };

        setApkMetadata(dummyMetadata);

        // Show prompt instantly on login page or when forced
        if (isOnLoginRoute || forceShow) {
          setShowPrompt(true);
        }
      }
    };

    fetchApkMetadata();
  }, [isOnLoginRoute, forceShow]);

  const handleInstallClick = async () => {
    if (!apkMetadata) return;

    setIsDownloading(true);

    try {
      // Use the dedicated download endpoint
      const response = await fetch(apkMetadata.downloadUrl, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      // Create blob from response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement("a");
      link.href = url;
      link.download = "ck.apk";
      link.style.display = "none";

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up object URL
      window.URL.revokeObjectURL(url);

      toast.success(
        "APK download started! Check your downloads folder and tap to install.",
        {
          duration: 5000,
        }
      );

      // Show installation instructions
      setTimeout(() => {
        toast.info(
          "After download, you may need to enable 'Install unknown apps' in Android settings",
          {
            duration: 8000,
          }
        );
      }, 2000);

      // Hide prompt after download
      setShowPrompt(false);

      // Mark as "installed" for this session to avoid repeated prompts
      setIsInstalled(true);
    } catch (error) {
      console.error("Download failed:", error);
      toast.error(
        "Failed to download APK. Please try again or download manually from the web version."
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("apk-install-dismissed", new Date().toISOString());
    toast.info("You can install anytime from the menu");
  };

  const handleLearnMore = () => {
    // Show installation instructions
    toast.info(
      "To install APK: 1) Download the file 2) Go to Settings > Security > Install unknown apps 3) Enable for your browser 4) Tap the downloaded APK to install",
      {
        duration: 10000,
      }
    );
  };

  if (isInstalled || !showPrompt || !apkMetadata) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="p-4 shadow-lg border-2 border-primary/20 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-lg overflow-hidden">
              {/* Custom CK Icon */}
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-green-600 font-bold text-lg">CK</span>
              </div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-1">
              <h3 className="font-semibold text-sm">
                Install {apkMetadata.name}
              </h3>
              <Star className="w-3 h-3 text-yellow-500 fill-current" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
              Version {apkMetadata.version} ({apkMetadata.versionCode}) •{" "}
              {apkMetadata.sizeFormatted} • {apkMetadata.developer}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              Package: {apkMetadata.packageName} • Android{" "}
              {apkMetadata.minAndroidVersion}+ • Updated{" "}
              {new Date(apkMetadata.lastUpdated).toLocaleDateString()}
            </p>
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              <div className="flex flex-wrap gap-1 mb-1">
                {apkMetadata.features?.slice(0, 2).map((feature, index) => (
                  <span
                    key={index}
                    className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-1.5 py-0.5 rounded text-xs"
                  >
                    {feature}
                  </span>
                ))}
              </div>
              <p className="text-xs">
                {process.env.NODE_ENV === "development"
                  ? "Get the Android app experience with offline access"
                  : apkMetadata.description ||
                    "Get the full Android app experience with offline access"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleInstallClick}
                disabled={isDownloading}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Download className="h-3 w-3 mr-1" />
                {isDownloading ? "Downloading..." : "Download APK"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleLearnMore}
                className="flex-1"
              >
                Install Guide
              </Button>
            </div>
          </div>
          {!isOnLoginRoute && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleDismiss}
              className="flex-shrink-0 h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
