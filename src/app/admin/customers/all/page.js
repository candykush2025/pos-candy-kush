"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { receiptsService } from "@/lib/firebase/firestore";
import { ArrowLeft, Crown, Search, Users, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

export default function AllCustomersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [allCustomers, setAllCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    loadCustomersData();
  }, [isAuthenticated]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCustomers(allCustomers);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredCustomers(
        allCustomers.filter((customer) =>
          customer.name.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, allCustomers]);

  const loadCustomersData = async () => {
    try {
      setLoading(true);

      // Load all receipts
      const allReceipts = await receiptsService.getAll();

      // Calculate customer sales
      const customerSales = {};
      allReceipts.forEach((receipt) => {
        const custId = receipt.customerId || receipt.customer_id;
        if (custId) {
          const total =
            receipt.total || receipt.totalAmount || receipt.total_money || 0;
          if (!customerSales[custId]) {
            customerSales[custId] = {
              id: custId,
              total: 0,
              orders: 0,
              name:
                receipt.customerName ||
                receipt.customer_name ||
                "Walk-in Customer",
            };
          }
          customerSales[custId].total += total;
          customerSales[custId].orders++;
        }
      });

      // Sort by total spending
      const sortedCustomers = Object.values(customerSales).sort(
        (a, b) => b.total - a.total
      );

      setAllCustomers(sortedCustomers);
      setFilteredCustomers(sortedCustomers);
    } catch (error) {
      console.error("Error loading customers data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerClick = (customerId) => {
    router.push(`/admin/customers/${customerId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-2xl text-neutral-600 dark:text-neutral-400">
            Loading Customers...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 pb-28 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
            <Crown className="h-10 w-10 text-amber-500" />
            All Customers
          </h1>
          <p className="text-xl text-neutral-500 dark:text-neutral-400 mt-2">
            {filteredCustomers.length} customers ranked by spending
          </p>
        </div>
        <Button
          onClick={() => router.back()}
          variant="outline"
          size="lg"
          className="h-14 px-6 text-lg"
        >
          <ArrowLeft className="mr-2 h-6 w-6" />
          Back
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-6 w-6 text-neutral-400" />
            <Input
              type="text"
              placeholder="Search customers by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-lg"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto text-blue-600 mb-2" />
              <p className="text-lg text-neutral-500">Total Customers</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {allCustomers.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto text-green-600 mb-2" />
              <p className="text-lg text-neutral-500">Total Revenue</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(
                  allCustomers.reduce((sum, c) => sum + c.total, 0)
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Crown className="h-12 w-12 mx-auto text-amber-500 mb-2" />
              <p className="text-lg text-neutral-500">Avg per Customer</p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(
                  allCustomers.length > 0
                    ? allCustomers.reduce((sum, c) => sum + c.total, 0) /
                        allCustomers.length
                    : 0
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customers List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Customer Rankings
          </CardTitle>
          <CardDescription>
            Click on any customer to view details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-20 w-20 mx-auto text-neutral-300 mb-4" />
              <p className="text-2xl text-neutral-500">
                {searchQuery ? "No customers found" : "No customer data"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCustomers.map((customer, index) => (
                <div
                  key={customer.id}
                  onClick={() => handleCustomerClick(customer.id)}
                  className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors hover:shadow-md"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold ${
                        index === 0
                          ? "bg-yellow-500"
                          : index === 1
                          ? "bg-gray-400"
                          : index === 2
                          ? "bg-amber-600"
                          : "bg-gray-300"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-2xl text-neutral-900 dark:text-white">
                          {customer.name}
                        </p>
                        {index < 3 && (
                          <Crown
                            className={`h-6 w-6 ${
                              index === 0
                                ? "text-yellow-500"
                                : index === 1
                                ? "text-gray-400"
                                : "text-amber-600"
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-lg text-neutral-500">
                        <span>{customer.orders} orders</span>
                        <span>•</span>
                        <span>
                          Avg {formatCurrency(customer.total / customer.orders)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="font-bold text-2xl text-green-600 dark:text-green-400">
                    {formatCurrency(customer.total)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
