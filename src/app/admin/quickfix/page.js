"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Check } from "lucide-react";
import { ROLE_PERMISSIONS } from "@/config/permissions";

export default function QuickFixPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const fixAdminUser = async () => {
    setIsLoading(true);

    try {
      // Create user document for the existing auth user
      const userId = "AjGb1R8NUsOUDgNjkS26fJ7l4Gq1"; // Your user UID

      await setDoc(doc(db, "users", userId), {
        email: "admin@candykush.com",
        name: "Admin User",
        role: "admin",
        permissions: ROLE_PERMISSIONS["admin"],
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success("Admin user document created!");

      // Create demo products
      await createDemoData();

      toast.success("Setup complete!");
      setIsComplete(true);

      // Redirect to admin dashboard after 2 seconds (authentication bypassed)
      setTimeout(() => {
        router.push("/admin/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Setup failed:", error);
      toast.error(error.message || "Setup failed");
    } finally {
      setIsLoading(false);
    }
  };

  const createDemoData = async () => {
    try {
      // Create demo categories
      const categories = [
        {
          id: "flower",
          name: "Flower",
          description: "Cannabis flower products",
        },
        { id: "prerolls", name: "Pre-Rolls", description: "Pre-rolled joints" },
        { id: "edibles", name: "Edibles", description: "Cannabis edibles" },
      ];

      for (const cat of categories) {
        await setDoc(doc(db, "categories", cat.id), {
          ...cat,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Create demo products
      const products = [
        {
          id: "ckf001",
          name: "Candy Kush Flower",
          price: 45.0,
          stock: 50,
          barcode: "001",
          category: "Flower",
          sku: "CKF-001",
        },
        {
          id: "bdf002",
          name: "Blue Dream Flower",
          price: 40.0,
          stock: 30,
          barcode: "002",
          category: "Flower",
          sku: "BDF-002",
        },
        {
          id: "ogp003",
          name: "OG Kush Pre-Roll",
          price: 12.0,
          stock: 100,
          barcode: "003",
          category: "Pre-Rolls",
          sku: "OGP-003",
        },
        {
          id: "sdf004",
          name: "Sour Diesel Flower",
          price: 50.0,
          stock: 25,
          barcode: "004",
          category: "Flower",
          sku: "SDF-004",
        },
        {
          id: "gsc005",
          name: "Girl Scout Cookies",
          price: 48.0,
          stock: 40,
          barcode: "005",
          category: "Flower",
          sku: "GSC-005",
        },
        {
          id: "gg4006",
          name: "Gorilla Glue #4",
          price: 52.0,
          stock: 20,
          barcode: "006",
          category: "Flower",
          sku: "GG4-006",
        },
        {
          id: "ph007",
          name: "Purple Haze",
          price: 46.0,
          stock: 35,
          barcode: "007",
          category: "Flower",
          sku: "PH-007",
        },
        {
          id: "nl008",
          name: "Northern Lights",
          price: 44.0,
          stock: 45,
          barcode: "008",
          category: "Flower",
          sku: "NL-008",
        },
      ];

      for (const product of products) {
        await setDoc(doc(db, "products", product.id), {
          ...product,
          description: `Premium quality ${product.name}`,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Failed to create demo data:", error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-purple-700">
            Quick Fix Setup
          </CardTitle>
          <CardDescription>
            Fix your admin user and initialize the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isComplete ? (
            <>
              <div className="p-4 bg-purple-50 rounded-lg text-sm">
                <p className="font-semibold mb-2">This will:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Create Firestore document for admin@candykush.com</li>
                  <li>Add demo products (8 products)</li>
                  <li>Add categories (Flower, Pre-Rolls, Edibles)</li>
                  <li>Enable you to login immediately</li>
                </ul>
              </div>

              <Button
                onClick={fixAdminUser}
                className="w-full h-12 text-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  "Fix & Initialize System"
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-center space-x-3 text-green-600">
                <Check className="h-8 w-8" />
                <span className="text-lg font-semibold">Setup Complete!</span>
              </div>
              <p className="text-center text-neutral-600">
                Redirecting to login...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
