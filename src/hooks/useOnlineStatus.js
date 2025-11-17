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
    const handleOnline = () => {
      setIsOnline(true);
      setSyncOnline(true);
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
