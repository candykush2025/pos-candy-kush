"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  BarChart3,
  User,
  LogOut,
  Link2,
  ChevronDown,
  ChevronRight,
  List,
  FolderTree,
  UserCircle,
  Database,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [expandedMenus, setExpandedMenus] = useState({});

  // Pages that don't require authentication
  const publicPages = ["/admin/setup", "/admin/quickfix"];
  const isPublicPage = publicPages.includes(pathname);

  // Auto-expand Products menu if on a products sub-route
  useEffect(() => {
    if (pathname.startsWith("/admin/products/")) {
      setExpandedMenus((prev) => ({ ...prev, Products: true }));
    }
  }, [pathname]);

  useEffect(() => {
    // Skip authentication check for public pages
    if (isPublicPage) {
      return;
    }

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (user?.role !== "admin") {
      router.push("/pos/sales");
    }
  }, [isAuthenticated, user, router, isPublicPage]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // Render public pages without layout
  if (isPublicPage) {
    return <>{children}</>;
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return null;
  }

  const navigation = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    {
      name: "Products",
      icon: Package,
      subItems: [
        { name: "Item List", href: "/admin/products/items", icon: List },
        {
          name: "Categories",
          href: "/admin/products/categories",
          icon: FolderTree,
        },
      ],
    },
    { name: "Stock", href: "/admin/stock", icon: Database },
    { name: "Orders", href: "/admin/orders", icon: ShoppingCart },
    { name: "Customers", href: "/admin/customers", icon: UserCircle },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { name: "Integration", href: "/admin/integration", icon: Link2 },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  const toggleMenu = (itemName) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [itemName]: !prev[itemName],
    }));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-green-700">Admin Panel</h1>
          <p className="text-sm text-gray-500">Candy Kush POS</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isExpanded = expandedMenus[item.name];
              const isActive =
                pathname === item.href ||
                item.subItems?.some((sub) => pathname === sub.href);

              // If item has subItems, render expandable menu
              if (item.subItems) {
                return (
                  <div key={item.name}>
                    <Button
                      variant="ghost"
                      className={`w-full justify-start ${
                        isActive ? "bg-green-50 text-green-700" : ""
                      }`}
                      onClick={() => toggleMenu(item.name)}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      <span className="flex-1 text-left">{item.name}</span>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>

                    {/* Submenu items */}
                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.subItems.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const isSubActive = pathname === subItem.href;
                          return (
                            <Link key={subItem.name} href={subItem.href}>
                              <Button
                                variant="ghost"
                                className={`w-full justify-start pl-8 ${
                                  isSubActive
                                    ? "bg-green-50 text-green-700"
                                    : ""
                                }`}
                              >
                                <SubIcon className="mr-3 h-4 w-4" />
                                {subItem.name}
                              </Button>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Regular menu item without subItems
              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start ${
                      pathname === item.href ? "bg-green-50 text-green-700" : ""
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Button>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Menu */}
        <div className="p-4 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start">
                <User className="mr-3 h-5 w-5" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
