"use client";

import { useEffect } from "react";
import {
  startISYSyncService,
  stopISYSyncService,
} from "@/lib/services/isySyncService";

/**
 * ISY Sync Initializer Component
 * Starts the background sync service for order duplication to ISY API
 */
export function ISYSyncInitializer() {
  useEffect(() => {
    // Check if ISY sync is enabled
    const isEnabled = process.env.NEXT_PUBLIC_ISY_API_ENABLED === "true";

    if (!isEnabled) {
      console.log("ℹ️ ISY API sync is disabled");
      return;
    }

    // Start the sync service
    console.log("🚀 Initializing ISY order sync service...");
    startISYSyncService();

    // Cleanup on unmount
    return () => {
      stopISYSyncService();
    };
  }, []);

  return null; // This component doesn't render anything
}
