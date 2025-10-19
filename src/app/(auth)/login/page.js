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
        <Card className="w-full max-w-md shadow-2xl border-2 dark:border-neutral-800">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-green-600 dark:text-green-500 mb-4" />
            <p className="text-neutral-600 dark:text-neutral-400">
              Checking authentication...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-green-100 to-emerald-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-green-950/20 p-4">
      <Card className="w-full max-w-md shadow-2xl border-2 dark:border-neutral-800">
        <CardHeader className="space-y-1 text-center pb-8">
          <div className="mx-auto w-16 h-16 bg-green-600 dark:bg-green-700 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <span className="text-3xl font-bold text-white">CK</span>
          </div>
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

          <div className="mt-6 pt-6 border-t dark:border-neutral-700 text-center text-sm text-neutral-600 dark:text-neutral-400">
            <p>Use your Firebase email and password</p>
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
              Note: Create users in Firebase Authentication
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
