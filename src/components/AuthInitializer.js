"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";

export function AuthInitializer({ children }) {
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    // Initialize authentication state from stored JWT token
    initializeAuth();
  }, [initializeAuth]);

  return <>{children}</>;
}
