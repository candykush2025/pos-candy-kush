"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { jwtUtils } from "@/lib/jwt";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user, token, _hasHydrated } = useAuthStore();

  useEffect(() => {
    // Wait for Zustand persist to hydrate
    if (!_hasHydrated) {
      return;
    }

    // Check if JWT token is valid
    const isTokenValid = token && jwtUtils.isValid(token);

    if (isAuthenticated && user && isTokenValid) {
      // User has valid JWT, redirect to appropriate dashboard
      if (user.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/sales");
      }
    } else {
      // No valid token, redirect to login
      router.push("/login");
    }
  }, [isAuthenticated, user, token, router, _hasHydrated]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Checking authentication...</p>
    </div>
  );
}
