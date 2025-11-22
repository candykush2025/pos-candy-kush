"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { jwtUtils } from "@/lib/jwt";
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
  Menu,
  X,
  Clock,
  ClipboardList,
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
  const { isAuthenticated, user, logout, token } = useAuthStore();
  const [expandedMenus, setExpandedMenus] = useState({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Pages that don't require authentication
  const publicPages = ["/admin/setup", "/admin/quickfix", "/admin/debug"];
  const isPublicPage = publicPages.includes(pathname);

  // Auto-expand Products menu if on a products sub-route
  useEffect(() => {
    if (pathname.startsWith("/admin/products/")) {
      setExpandedMenus((prev) => ({ ...prev, Products: true }));
    }
    if (pathname.startsWith("/admin/stock")) {
      setExpandedMenus((prev) => ({ ...prev, Stock: true }));
    }
  }, [pathname]);

  // Close mobile menu when pathname changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    // Skip authentication check for public pages
    if (isPublicPage) {
      return;
    }

    // Check JWT token validity
    const isTokenValid =
      isAuthenticated &&
      user &&
      (() => {
        try {
          return jwtUtils.isValid(token);
        } catch (error) {
          console.error("JWT validation error:", error);
          return false;
        }
      })();

    if (!isTokenValid) {
      // Token invalid or expired - redirect to login
      router.push("/login");
      return;
    }

    if (user?.role !== "admin") {
      router.push("/pos/sales");
    }
  }, [isAuthenticated, user, token, router, isPublicPage]);

  const handleLogout = () => {
    logout();
    router.push("/admin/dashboard");
  };

  // Render public pages without layout
  if (isPublicPage) {
    return <>{children}</>;
  }

  // Check JWT token validity for rendering
  const isTokenValid =
    isAuthenticated &&
    user &&
    (() => {
      try {
        return jwtUtils.isValid(token);
      } catch (error) {
        console.error("JWT validation error:", error);
        return false;
      }
    })();

  if (!isTokenValid || user?.role !== "admin") {
    return null;
  }

  // Desktop navigation - all items
  const desktopNavigation = [
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
    {
      name: "Stock",
      icon: Database,
      subItems: [
        { name: "Stock Management", href: "/admin/stock", icon: Database },
        {
          name: "Purchase Orders",
          href: "/admin/stock/purchase-orders",
          icon: ShoppingCart,
        },
        {
          name: "Stock Adjustment",
          href: "/admin/stock/adjustments",
          icon: ClipboardList,
        },
        { name: "Stock History", href: "/admin/stock/history", icon: Clock },
      ],
    },
    { name: "Orders", href: "/admin/orders", icon: ShoppingCart },
    { name: "Customers", href: "/admin/customers", icon: UserCircle },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Shifts", href: "/admin/shifts", icon: Clock },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { name: "Integration", href: "/admin/integration", icon: Link2 },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  // Mobile bottom navigation - main 3 items
  const mobileBottomNav = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Products", href: "/admin/products/items", icon: Package },
    { name: "Settings", href: "/admin/settings", icon: Settings }, // Navigate to settings page
  ];

  const toggleMenu = (itemName) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [itemName]: !prev[itemName],
    }));
  };

  // Mobile Layout with Bottom Navigation
  if (isMobile) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col pb-20">
        {/* Mobile Header */}
        <div className="bg-white dark:bg-neutral-900 border-b dark:border-neutral-800 sticky top-0 z-40 shadow-sm">
          <div className="px-4 py-3">
            <h1 className="text-xl font-bold text-green-700 dark:text-green-500">
              Candy Kush POS
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Admin Panel
            </p>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-neutral-50 dark:bg-neutral-950">
          <div className="p-4">{children}</div>
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t dark:border-neutral-800 shadow-lg z-50">
          <div className="grid grid-cols-3 gap-1 p-2">
            {mobileBottomNav.map((item) => {
              const Icon = item.icon;
              const isActive = item.href && pathname.startsWith(item.href);

              return (
                <Link key={item.name} href={item.href}>
                  <button
                    className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-colors ${
                      isActive
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                    }`}
                  >
                    <Icon
                      className={`h-6 w-6 mb-1 ${
                        isActive
                          ? "text-green-700 dark:text-green-400"
                          : "text-neutral-600 dark:text-neutral-400"
                      }`}
                    />
                    <span
                      className={`text-xs font-medium ${
                        isActive
                          ? "text-green-700 dark:text-green-400"
                          : "text-neutral-600 dark:text-neutral-400"
                      }`}
                    >
                      {item.name}
                    </span>
                  </button>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    );
  }

  // Desktop Layout (original)
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col md:flex-row">
      {/* Sidebar - Desktop Only */}
      <aside className="w-64 bg-white dark:bg-neutral-900 border-r dark:border-neutral-800 flex flex-col shadow-sm">
        {/* Logo */}
        <div className="p-6 border-b dark:border-neutral-800">
          <h1 className="text-2xl font-bold text-green-700 dark:text-green-500">
            Admin Panel
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Candy Kush POS
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-2">
            {desktopNavigation.map((item) => {
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
                      className={`w-full justify-start h-12 text-base font-medium rounded-xl ${
                        isActive
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : "hover:bg-neutral-100"
                      }`}
                      onClick={() => toggleMenu(item.name)}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      <span className="flex-1 text-left">{item.name}</span>
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </Button>

                    {/* Submenu items */}
                    {isExpanded && (
                      <div className="ml-4 mt-2 space-y-2 pb-2">
                        {item.subItems.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const isSubActive = pathname === subItem.href;
                          return (
                            <Link key={subItem.name} href={subItem.href}>
                              <Button
                                variant="ghost"
                                className={`w-full justify-start pl-8 h-11 text-base rounded-lg ${
                                  isSubActive
                                    ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold hover:bg-green-50 dark:hover:bg-green-900/30"
                                    : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
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
                    className={`w-full justify-start h-12 text-base font-medium rounded-xl ${
                      pathname === item.href
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : "hover:bg-neutral-100"
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
        <div className="p-4 border-t dark:border-neutral-800 mt-auto bg-neutral-50 dark:bg-neutral-900">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start h-14 hover:bg-white dark:hover:bg-neutral-800 rounded-xl"
              >
                <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-3">
                  <User className="h-5 w-5 text-green-700 dark:text-green-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {user?.name}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                    {user?.email}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-neutral-400 dark:text-neutral-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-sm">
                My Account
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="h-10 text-sm">
                <User className="mr-3 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="h-10 text-sm text-red-600 font-medium"
              >
                <LogOut className="mr-3 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-neutral-50 dark:bg-neutral-950">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
