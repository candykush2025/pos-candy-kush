"use client";

import { useEffect, useState } from "react";
import { useThemeStore } from "@/store/useThemeStore";

export function ThemeProvider({ children }) {
  const [mounted, setMounted] = useState(false);
  const primaryColor = useThemeStore((state) => state.primaryColor);
  const secondaryColor = useThemeStore((state) => state.secondaryColor);
  const mode = useThemeStore((state) => state.mode);
  const applyTheme = useThemeStore((state) => state.applyTheme);

  // Initial mount - apply theme from localStorage (automatically loaded by Zustand persist)
  useEffect(() => {
    setMounted(true);

    // Small delay to ensure localStorage is loaded by Zustand persist
    const timer = setTimeout(() => {
      applyTheme();
    }, 0);

    return () => clearTimeout(timer);
  }, [applyTheme]);

  // Apply theme whenever colors or mode change
  useEffect(() => {
    if (mounted) {
      applyTheme();
    }
  }, [mounted, primaryColor, secondaryColor, mode, applyTheme]);

  // Listen for system theme changes when mode is "system"
  useEffect(() => {
    if (!mounted || mode !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      applyTheme();
    };

    // Modern browsers
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [mounted, mode, applyTheme]);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
