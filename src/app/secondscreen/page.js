"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Monitor,
  Tv,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlayCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function SecondScreenDebug() {
  const [isSupported, setIsSupported] = useState(false);
  const [availableDisplays, setAvailableDisplays] = useState([]);
  const [connection, setConnection] = useState(null);
  const [connectionState, setConnectionState] = useState("closed");
  const [logs, setLogs] = useState([]);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isPWAMode, setIsPWAMode] = useState(false);
  const [scanning, setScanning] = useState(false);

  const checkPWAMode = () => {
    // Check if running as PWA (standalone mode)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true ||
      document.referrer.includes("android-app://");

    setIsPWAMode(isStandalone);
    return isStandalone;
  };

  const scanDisplays = async () => {
    setScanning(true);
    addLog("🔍 Scanning for displays...");

    try {
      // Check PWA mode
      const pwaMode = checkPWAMode();
      addLog(
        pwaMode
          ? "✅ Running in PWA mode (standalone)"
          : "⚠️ Running in browser mode (not PWA)"
      );

      // Check Presentation API
      if ("presentation" in navigator && "PresentationRequest" in window) {
        setIsSupported(true);
        addLog("✅ Presentation API is supported");

        // Try to detect available displays
        const presentationUrl = `${window.location.origin}/secondscreen/display`;
        try {
          const request = new PresentationRequest([presentationUrl]);

          // Check availability
          if (request.availability) {
            const availability = await request.availability;
            addLog(
              `📺 Display availability: ${
                availability.value ? "Available" : "None detected"
              }`
            );

            availability.addEventListener("change", () => {
              addLog(
                `📺 Display availability changed: ${
                  availability.value ? "Available" : "Unavailable"
                }`
              );
            });
          } else {
            addLog("⚠️ Display availability API not supported");
          }
        } catch (availError) {
          addLog(
            `⚠️ Could not check display availability: ${availError.message}`
          );
        }
      } else {
        setIsSupported(false);
        addLog("❌ Presentation API is NOT supported in this browser");
      }

      // Check screen capture API
      if ("getDisplayMedia" in navigator.mediaDevices) {
        addLog("✅ Screen Capture API available");
      } else {
        addLog("❌ Screen Capture API not available");
      }

      // Check screen details API (for multi-screen info)
      if ("getScreenDetails" in window) {
        try {
          const screenDetails = await window.getScreenDetails();
          addLog(`📊 Detected ${screenDetails.screens.length} screen(s)`);
          screenDetails.screens.forEach((screen, index) => {
            addLog(
              `  Screen ${index + 1}: ${screen.width}x${screen.height} ${
                screen.isPrimary ? "(Primary)" : "(Secondary)"
              }`
            );
          });
        } catch (screenError) {
          addLog(`⚠️ Could not get screen details: ${screenError.message}`);
        }
      } else {
        addLog("⚠️ Screen Details API not available");
      }

      // Check window placement API
      if ("getScreens" in window) {
        try {
          const screens = await window.getScreens();
          addLog(`🖥️ Window Placement API: ${screens.length} screen(s)`);
        } catch (placementError) {
          addLog(`⚠️ Window Placement API error: ${placementError.message}`);
        }
      }

      toast.success("Display scan completed");
    } catch (error) {
      addLog(`❌ Scan error: ${error.message}`);
      toast.error("Failed to scan displays");
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    // Initial check
    checkPWAMode();

    // Check if Presentation API is supported
    if ("presentation" in navigator && "PresentationRequest" in window) {
      setIsSupported(true);
      addLog("✅ Presentation API is supported");
    } else {
      setIsSupported(false);
      addLog("❌ Presentation API is NOT supported in this browser");
    }

    // Check for available displays
    if ("getDisplayMedia" in navigator.mediaDevices) {
      addLog("✅ Screen Capture API available");
    }

    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      addLog("📱 PWA install prompt available");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const startPresentation = async () => {
    try {
      addLog("🚀 Starting presentation request...");

      // Create presentation request with secondary display URL
      const presentationUrl = `${window.location.origin}/secondscreen/display`;
      const presentationRequest = new PresentationRequest([presentationUrl]);

      addLog(`📡 Requesting: ${presentationUrl}`);

      // Start the presentation
      const conn = await presentationRequest.start();
      setConnection(conn);
      setConnectionState(conn.state);
      addLog(`✅ Presentation started! State: ${conn.state}`);
      toast.success("Secondary display connected!");

      // Listen for state changes
      conn.addEventListener("connect", () => {
        addLog("🔗 Connection established");
        setConnectionState("connected");
      });

      conn.addEventListener("close", () => {
        addLog("🔌 Connection closed");
        setConnectionState("closed");
        setConnection(null);
      });

      conn.addEventListener("terminate", () => {
        addLog("⛔ Connection terminated");
        setConnectionState("terminated");
        setConnection(null);
      });

      // Listen for messages from secondary display
      conn.addEventListener("message", (event) => {
        addLog(`📨 Message from secondary: ${event.data}`);
      });

      // Send test message to secondary display
      conn.send(
        JSON.stringify({
          type: "welcome",
          message: "Hello from main screen!",
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      addLog(`❌ Error: ${error.message}`);
      toast.error(`Failed to start presentation: ${error.message}`);
      console.error("Presentation error:", error);
    }
  };

  const sendTestMessage = () => {
    if (connection && connection.state === "connected") {
      const testData = {
        type: "test",
        message: `Test message at ${new Date().toLocaleTimeString()}`,
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      };
      connection.send(JSON.stringify(testData));
      addLog(`📤 Sent: ${JSON.stringify(testData)}`);
      toast.success("Test message sent!");
    } else {
      toast.error("Not connected to secondary display");
      addLog("❌ Cannot send - not connected");
    }
  };

  const closePresentation = () => {
    if (connection) {
      connection.close();
      addLog("🔌 Closing connection...");
      toast.info("Closing secondary display");
    }
  };

  const installPWA = async () => {
    if (deferredPrompt) {
      try {
        addLog("📱 Installing PWA...");
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
          addLog("✅ PWA installed successfully!");
          toast.success("PWA installed!");
          setIsInstallable(false);
        } else {
          addLog("❌ PWA installation cancelled");
          toast.info("Installation cancelled");
        }

        setDeferredPrompt(null);
      } catch (error) {
        addLog(`❌ PWA install error: ${error.message}`);
        toast.error("Failed to install PWA");
      }
    } else {
      toast.error("PWA install prompt not available");
      addLog("❌ PWA install prompt not available");
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-2 border-blue-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Monitor className="h-8 w-8 text-blue-500" />
                <div>
                  <CardTitle className="text-2xl">
                    Secondary Screen Debug
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Test Presentation API for dual display support
                  </p>
                </div>
              </div>
              <Badge
                variant={isSupported ? "success" : "destructive"}
                className="text-lg px-4 py-2"
              >
                {isSupported ? (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" /> Supported
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 mr-2" /> Not Supported
                  </>
                )}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500">
                API Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {isSupported ? (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-500" />
                )}
                <span className="text-2xl font-bold">
                  {isSupported ? "Available" : "Unavailable"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500">
                Connection State
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {connectionState === "connected" ? (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                ) : connectionState === "connecting" ? (
                  <AlertCircle className="h-8 w-8 text-yellow-500 animate-pulse" />
                ) : (
                  <XCircle className="h-8 w-8 text-gray-400" />
                )}
                <span className="text-2xl font-bold capitalize">
                  {connectionState}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500">
                Display Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Tv className="h-8 w-8 text-blue-500" />
                <span className="text-2xl font-bold">
                  {connection ? "Secondary" : "Primary Only"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500">
                PWA Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {isPWAMode ? (
                  <CheckCircle className="h-8 w-8 text-purple-500" />
                ) : (
                  <XCircle className="h-8 w-8 text-orange-400" />
                )}
                <span className="text-2xl font-bold">
                  {isPWAMode ? "Standalone" : "Browser"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={scanDisplays}
                disabled={scanning}
                className="bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {scanning ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    Scanning...
                  </>
                ) : (
                  <>🔍 Rescan Displays</>
                )}
              </Button>

              <Button
                onClick={installPWA}
                disabled={!isInstallable || isPWAMode}
                className="bg-purple-600 hover:bg-purple-700"
                size="lg"
              >
                📱 Install PWA
              </Button>

              <Button
                onClick={startPresentation}
                disabled={!isSupported || connectionState === "connected"}
                className="bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <PlayCircle className="mr-2 h-5 w-5" />
                Start Secondary Display
              </Button>

              <Button
                onClick={sendTestMessage}
                disabled={connectionState !== "connected"}
                variant="outline"
                size="lg"
              >
                📤 Send Test Message
              </Button>

              <Button
                onClick={closePresentation}
                disabled={!connection}
                variant="destructive"
                size="lg"
              >
                Close Display
              </Button>
            </div>

            {!isPWAMode && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-orange-800 dark:text-orange-200">
                      Not Running in PWA Mode
                    </h4>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                      For best secondary display support, install this app as a
                      PWA:
                    </p>
                    <ul className="list-disc list-inside text-sm text-orange-700 dark:text-orange-300 mt-2 space-y-1">
                      <li>Click the "📱 Install PWA" button above</li>
                      <li>Or use browser menu → "Install app"</li>
                      <li>Then reopen from your installed apps</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {!isSupported && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                      Presentation API Not Supported
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      This browser doesn't support the Presentation API. Try:
                    </p>
                    <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300 mt-2 space-y-1">
                      <li>Chrome on Android with HDMI/Chromecast</li>
                      <li>Edge on Windows with external display</li>
                      <li>Enable chrome://flags/#enable-presentation-api</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debug Logs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Debug Logs</CardTitle>
              <Button onClick={clearLogs} variant="outline" size="sm">
                Clear Logs
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500">No logs yet...</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardHeader>
            <CardTitle className="text-blue-800 dark:text-blue-200">
              📋 How to Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
            <p>
              <strong>1. Install as PWA:</strong> Click "📱 Install PWA" button
              or browser menu → "Install app"
            </p>
            <p>
              <strong>2. Connect Display:</strong> Connect HDMI display,
              Chromecast, or enable wireless display
            </p>
            <p>
              <strong>3. Start Presentation:</strong> Click "Start Secondary
              Display" button
            </p>
            <p>
              <strong>4. Test Communication:</strong> Send test messages to
              verify two-way communication
            </p>
            <p>
              <strong>5. Check Logs:</strong> Monitor debug logs for connection
              status and errors
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
