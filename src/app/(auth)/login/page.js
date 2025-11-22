"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { jwtUtils } from "@/lib/jwt";
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
import { Loader2, Lock, Mail, ArrowRight, Sparkles } from "lucide-react";
import { APKInstallPrompt } from "@/components/APKInstallPrompt";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, user, setAuth, setLoading, setError, token } =
    useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check if user is already authenticated on mount
  useEffect(() => {
    // Small delay to ensure Zustand persist has hydrated
    const timer = setTimeout(() => {
      // Check if JWT token is valid
      const isTokenValid = token && jwtUtils.isValid(token);

      if (isAuthenticated && user && isTokenValid) {
        console.log(
          "User already authenticated with valid JWT, redirecting..."
        );
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
  }, [isAuthenticated, user, token, router]);

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-green-400/20 dark:bg-green-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-400/20 dark:bg-emerald-500/10 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-teal-400/20 dark:bg-teal-500/10 rounded-full blur-3xl animate-float-slow"></div>
      </div>

      {/* Main login card */}
      <div className="w-full max-w-md relative z-10">
        {/* Glow effect behind card */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 dark:from-green-500/10 dark:to-emerald-500/10 rounded-3xl blur-2xl scale-105"></div>

        <Card className="relative backdrop-blur-xl bg-white/80 dark:bg-neutral-900/80 shadow-2xl border border-green-200/50 dark:border-neutral-700/50 rounded-3xl overflow-hidden animate-slide-up">
          <CardHeader className="space-y-4 text-center pt-10 pb-8 px-8">
            {/* Title */}
            <div className="space-y-2 animate-fade-in">
              <CardTitle className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-700 via-emerald-600 to-teal-600 dark:from-green-400 dark:via-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                Candy Kush POS
              </CardTitle>
              <CardDescription className="text-base text-neutral-600 dark:text-neutral-400">
                Welcome back! Please sign in to continue
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-8 pb-10">
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email field */}
              <div
                className="space-y-2 animate-fade-in"
                style={{ animationDelay: "200ms" }}
              >
                <label
                  htmlFor="email"
                  className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <div className="relative group">
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="h-12 text-base pl-4 pr-4 border-2 border-neutral-200 dark:border-neutral-700 focus:border-green-500 dark:focus:border-green-500 rounded-xl transition-all duration-300 group-hover:border-green-400 dark:group-hover:border-green-600"
                    autoFocus
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>

              {/* Password field */}
              <div
                className="space-y-2 animate-fade-in"
                style={{ animationDelay: "300ms" }}
              >
                <label
                  htmlFor="password"
                  className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Password
                </label>
                <div className="relative group">
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-12 text-base pl-4 pr-4 border-2 border-neutral-200 dark:border-neutral-700 focus:border-green-500 dark:focus:border-green-500 rounded-xl transition-all duration-300 group-hover:border-green-400 dark:group-hover:border-green-600"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full h-13 text-base font-semibold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 dark:from-green-600 dark:via-emerald-600 dark:to-teal-600 dark:hover:from-green-700 dark:hover:via-emerald-700 dark:hover:to-teal-700 text-white shadow-lg hover:shadow-xl rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] animate-fade-in mt-6 group"
                style={{ animationDelay: "400ms" }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign In
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </span>
                )}
              </Button>
            </form>

            {/* Footer text */}
            <div
              className="mt-8 text-center animate-fade-in"
              style={{ animationDelay: "500ms" }}
            >
              <p className="text-xs text-neutral-500 dark:text-neutral-500">
                Secure authentication powered by Firebase
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Bottom text */}
        <div
          className="text-center mt-6 animate-fade-in"
          style={{ animationDelay: "600ms" }}
        >
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            © 2025 Candy Kush POS. All rights reserved.
          </p>
        </div>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
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
        @keyframes float {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(30px, -30px) scale(1.1);
          }
        }
        @keyframes float-delayed {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(-30px, 30px) scale(1.1);
          }
        }
        @keyframes float-slow {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(20px, 20px) scale(1.05);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out;
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
          opacity: 0;
        }
        .animate-float {
          animation: float 20s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 25s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 30s ease-in-out infinite;
        }
      `}</style>

      {/* APK Install Prompt */}
      <APKInstallPrompt />
    </div>
  );
}
