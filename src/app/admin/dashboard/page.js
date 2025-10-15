"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ordersService,
  productsService,
  customersService,
} from "@/lib/firebase/firestore";
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    revenueChange: 0,
    ordersChange: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get all orders
      const orders = await ordersService.getAll({
        orderBy: ["createdAt", "desc"],
        limit: 10,
      });

      // Get all products
      const products = await productsService.getAll();

      // Get all customers
      const customers = await customersService.getAll();

      // Calculate total revenue
      const totalRevenue = orders.reduce(
        (sum, order) => sum + (order.total || 0),
        0
      );

      // Calculate stats
      setStats({
        totalRevenue,
        totalOrders: orders.length,
        totalProducts: products.length,
        totalCustomers: customers.length,
        revenueChange: 12.5, // Mock data - calculate from last period
        ordersChange: 8.3,
      });

      setRecentOrders(orders.slice(0, 5));
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      change: stats.revenueChange,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Total Orders",
      value: stats.totalOrders,
      change: stats.ordersChange,
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Products",
      value: stats.totalProducts,
      icon: Package,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Customers",
      value: stats.totalCustomers,
      icon: Users,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-sm md:text-base text-gray-500 mt-1 md:mt-2">
          Welcome to Candy Kush POS Admin Panel
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const isPositive = stat.change ? stat.change > 0 : null;

          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm md:text-base font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 md:p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 md:h-6 md:w-6 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl lg:text-3xl font-bold">
                  {stat.value}
                </div>
                {stat.change && (
                  <div className="flex items-center mt-2 text-xs md:text-sm">
                    {isPositive ? (
                      <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                    )}
                    <span
                      className={isPositive ? "text-green-600" : "text-red-600"}
                    >
                      {Math.abs(stat.change)}%
                    </span>
                    <span className="text-gray-500 ml-1 hidden sm:inline">
                      from last month
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Recent Orders</CardTitle>
          <CardDescription className="text-sm">
            Latest transactions in your POS system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No orders yet</p>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between border-b pb-3 md:pb-4 last:border-0 gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm md:text-base truncate">
                      Order #{order.orderNumber || order.id.slice(0, 8)}
                    </p>
                    <p className="text-xs md:text-sm text-gray-500">
                      {order.createdAt
                        ? new Date(
                            order.createdAt.toDate()
                          ).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm md:text-base">
                      {formatCurrency(order.total)}
                    </p>
                    <p className="text-xs md:text-sm text-gray-500 capitalize">
                      {order.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow active:scale-95">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center text-base md:text-lg">
              <Package className="mr-2 h-5 w-5 md:h-6 md:w-6" />
              Manage Products
            </CardTitle>
            <CardDescription className="text-sm">
              Add, edit, or remove products
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow active:scale-95">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center text-base md:text-lg">
              <Users className="mr-2 h-5 w-5 md:h-6 md:w-6" />
              Manage Users
            </CardTitle>
            <CardDescription className="text-sm">
              Add staff and manage permissions
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow active:scale-95">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center text-base md:text-lg">
              <TrendingUp className="mr-2 h-5 w-5 md:h-6 md:w-6" />
              View Analytics
            </CardTitle>
            <CardDescription className="text-sm">
              Detailed reports and insights
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
