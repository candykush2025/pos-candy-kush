"use client";

import { useEffect, useState } from "react";
import { useThemeStore } from "@/store/useThemeStore";

export function ThemeProvider({ children }) {
  const [mounted, setMounted] = useState(false);
  const loadThemeFromFirebase = useThemeStore(
    (state) => state.loadThemeFromFirebase
  );
  const primaryColor = useThemeStore((state) => state.primaryColor);
  const secondaryColor = useThemeStore((state) => state.secondaryColor);
  const mode = useThemeStore((state) => state.mode);
  const applyTheme = useThemeStore((state) => state.applyTheme);

  useEffect(() => {
    setMounted(true);

    // Load theme from Firebase on mount
    loadThemeFromFirebase();
  }, [loadThemeFromFirebase]);

  // Apply theme whenever colors or mode change
  useEffect(() => {
    if (mounted) {
      applyTheme();
    }
  }, [mounted, primaryColor, secondaryColor, mode, applyTheme]);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
