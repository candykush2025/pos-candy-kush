"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/firebase/auth";
import { createDocument } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Check } from "lucide-react";
import { USER_ROLES, ROLE_PERMISSIONS } from "@/config/permissions";

export default function AdminSetupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [adminData, setAdminData] = useState({
    email: "",
    password: "",
    name: "",
  });

  const handleSetup = async (e) => {
    e.preventDefault();

    if (!adminData.email || !adminData.password || !adminData.name) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      // Create admin user
      const adminUser = await registerUser(
        adminData.email,
        adminData.password,
        {
          name: adminData.name,
          role: USER_ROLES.ADMIN,
          permissions: ROLE_PERMISSIONS[USER_ROLES.ADMIN],
        }
      );

      toast.success("Admin user created successfully!");
      setStep(2);

      // Create some demo data
      await createDemoData();

      toast.success("Demo data created!");
      setStep(3);

      // Redirect to admin dashboard after 2 seconds (authentication bypassed)
      setTimeout(() => {
        router.push("/admin/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Setup failed:", error);
      const message = error.message || "Setup failed. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const createDemoData = async () => {
    // Create demo categories
    await createDocument("categories", {
      name: "Flower",
      description: "Cannabis flower products",
      active: true,
    });

    await createDocument("categories", {
      name: "Pre-Rolls",
      description: "Pre-rolled joints",
      active: true,
    });

    await createDocument("categories", {
      name: "Edibles",
      description: "Cannabis edibles",
      active: true,
    });

    // Create demo products
    const products = [
      {
        name: "Candy Kush Flower",
        price: 45.0,
        stock: 50,
        barcode: "001",
        category: "Flower",
        sku: "CKF-001",
      },
      {
        name: "Blue Dream Flower",
        price: 40.0,
        stock: 30,
        barcode: "002",
        category: "Flower",
        sku: "BDF-002",
      },
      {
        name: "OG Kush Pre-Roll",
        price: 12.0,
        stock: 100,
        barcode: "003",
        category: "Pre-Rolls",
        sku: "OGP-003",
      },
      {
        name: "Sour Diesel Flower",
        price: 50.0,
        stock: 25,
        barcode: "004",
        category: "Flower",
        sku: "SDF-004",
      },
      {
        name: "Girl Scout Cookies",
        price: 48.0,
        stock: 40,
        barcode: "005",
        category: "Flower",
        sku: "GSC-005",
      },
      {
        name: "Gorilla Glue #4",
        price: 52.0,
        stock: 20,
        barcode: "006",
        category: "Flower",
        sku: "GG4-006",
      },
      {
        name: "Purple Haze",
        price: 46.0,
        stock: 35,
        barcode: "007",
        category: "Flower",
        sku: "PH-007",
      },
      {
        name: "Northern Lights",
        price: 44.0,
        stock: 45,
        barcode: "008",
        category: "Flower",
        sku: "NL-008",
      },
    ];

    for (const product of products) {
      await createDocument("products", {
        ...product,
        description: `Premium quality ${product.name}`,
        active: true,
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-blue-700">
            Initial Setup
          </CardTitle>
          <CardDescription>
            Create your admin account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <form onSubmit={handleSetup} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Full Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={adminData.name}
                  onChange={(e) =>
                    setAdminData({ ...adminData, name: e.target.value })
                  }
                  disabled={isLoading}
                  className="h-12"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@candykush.com"
                  value={adminData.email}
                  onChange={(e) =>
                    setAdminData({ ...adminData, email: e.target.value })
                  }
                  disabled={isLoading}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter a strong password"
                  value={adminData.password}
                  onChange={(e) =>
                    setAdminData({ ...adminData, password: e.target.value })
                  }
                  disabled={isLoading}
                  className="h-12"
                />
                <p className="text-xs text-neutral-500">Minimum 6 characters</p>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  "Create Admin Account"
                )}
              </Button>
            </form>
          )}

          {step >= 2 && (
            <div className="space-y-4 py-8">
              <div className="flex items-center space-x-3">
                <Check className="h-6 w-6 text-green-600" />
                <span>Admin account created</span>
              </div>
              {step >= 3 && (
                <div className="flex items-center space-x-3">
                  <Check className="h-6 w-6 text-green-600" />
                  <span>Demo data initialized</span>
                </div>
              )}
              <div className="pt-4 text-center">
                <p className="text-sm text-neutral-600">
                  Redirecting to login...
                </p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-neutral-700">
              <p className="font-semibold mb-2">What happens next:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Admin account will be created</li>
                <li>Demo products will be added</li>
                <li>Categories will be set up</li>
                <li>You'll be redirected to login</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
