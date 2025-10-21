"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { loginWithEmail } from "@/lib/firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, user, setAuth, setLoading, setError } =
    useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check if user is already authenticated on mount
  useEffect(() => {
    // Small delay to ensure Zustand persist has hydrated
    const timer = setTimeout(() => {
      if (isAuthenticated && user) {
        console.log("User already authenticated, redirecting...");
        // Redirect based on role
        if (user.role === "admin") {
          router.push("/admin/dashboard");
        } else {
          router.push("/sales");
        }
      } else {
        setIsCheckingAuth(false);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated, user, router]);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setIsLoading(true);
    setLoading(true);

    try {
      const response = await loginWithEmail(email, password);
      const { user, token, refreshToken } = response;

      // Save auth data
      setAuth(user, token, refreshToken);

      // Save to localStorage
      localStorage.setItem("pos_auth_token", token);
      localStorage.setItem("pos_refresh_token", refreshToken);
      localStorage.setItem("pos_user_data", JSON.stringify(user));

      toast.success(`Welcome back, ${user.name}!`);

      // Redirect based on role
      if (user.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/sales");
      }
    } catch (error) {
      console.error("Login failed:", error);
      let message = "Invalid email or password";

      if (error.code === "auth/user-not-found") {
        message = "No user found with this email";
      } else if (error.code === "auth/wrong-password") {
        message = "Incorrect password";
      } else if (error.code === "auth/invalid-email") {
        message = "Invalid email format";
      } else if (error.code === "auth/invalid-credential") {
        message = "Invalid credentials";
      }

      toast.error(message);
      setError(message);
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-green-100 to-emerald-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-green-950/20 p-4">
        <div className="w-full max-w-md">
          {/* Animated Card */}
          <div className="relative">
            {/* Glowing background effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 dark:from-green-600 dark:to-emerald-600 rounded-3xl blur-2xl opacity-20 dark:opacity-10 animate-pulse"></div>

            {/* Main Card */}
            <Card className="relative backdrop-blur-sm bg-white/90 dark:bg-neutral-900/90 shadow-2xl border-2 border-green-100 dark:border-neutral-800 rounded-3xl overflow-hidden">
              <CardContent className="flex flex-col items-center justify-center py-16 px-8">
                {/* Animated dots loader */}
                <div className="flex space-x-2 mb-6">
                  <div
                    className="w-3 h-3 bg-green-500 dark:bg-green-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-3 h-3 bg-green-500 dark:bg-green-400 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-3 h-3 bg-green-500 dark:bg-green-400 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>

                {/* Text content */}
                <h3 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100 mb-2">
                  Verifying Access
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center max-w-xs">
                  Please wait while we securely authenticate your session
                </p>

                {/* Progress bar */}
                <div className="w-full max-w-xs mt-8">
                  <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 dark:from-green-600 dark:to-emerald-600 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]"
                      style={{
                        backgroundSize: "200% 100%",
                        animation: "shimmer 1.5s ease-in-out infinite",
                      }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Candy Kush POS text below */}
          <div
            className="text-center mt-6 animate-fade-in"
            style={{ animationDelay: "300ms" }}
          >
            <p className="text-lg font-semibold text-green-700 dark:text-green-400">
              Candy Kush POS
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
              Professional Point of Sale System
            </p>
          </div>
        </div>

        {/* Custom animations */}
        <style jsx>{`
          @keyframes shimmer {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in {
            animation: fade-in 0.6s ease-out forwards;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-green-100 to-emerald-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-green-950/20 p-4">
      <Card className="w-full max-w-md shadow-2xl border-2 dark:border-neutral-800">
        <CardHeader className="space-y-1 text-center pb-8">
          <CardTitle className="text-3xl font-bold text-green-700 dark:text-green-500">
            Candy Kush POS
          </CardTitle>
          <CardDescription className="text-neutral-600 dark:text-neutral-400">
            Enter your credentials to access the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="h-12 text-lg"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="h-12 text-lg"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-lg bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white shadow-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
