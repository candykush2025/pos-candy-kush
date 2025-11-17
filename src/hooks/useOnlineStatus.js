import { useState, useEffect } from "react";
import { useSyncStore } from "@/store/useSyncStore";

/**
 * Hook to detect and monitor online/offline status
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const setSyncOnline = useSyncStore((state) => state.setOnline);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setSyncOnline(true);

      // Trigger sync when coming back online
      try {
        const { syncEngine } = await import("@/lib/sync/syncEngine");
        console.log("📶 Back online - syncing pending transactions...");
        await syncEngine.sync();
        console.log("✅ Sync completed successfully");
      } catch (error) {
        console.error("❌ Error syncing after coming online:", error);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setSyncOnline]);

  return isOnline;
};

export default useOnlineStatus;
