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
  Menu,
  X,
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Pages that don't require authentication
  const publicPages = ["/admin/setup", "/admin/quickfix"];
  const isPublicPage = publicPages.includes(pathname);

  // Auto-expand Products menu if on a products sub-route
  useEffect(() => {
    if (pathname.startsWith("/admin/products/")) {
      setExpandedMenus((prev) => ({ ...prev, Products: true }));
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
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header - Extra Large Touch Target */}
      <div className="md:hidden bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-2xl font-bold text-green-700">Admin</h1>
            <p className="text-sm text-gray-500">Candy Kush POS</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-14 w-14 hover:bg-green-50"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-8 w-8 text-green-700" />
            ) : (
              <Menu className="h-8 w-8 text-green-700" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop and Mobile Slide-in */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-80 md:w-64 bg-white border-r flex flex-col shadow-2xl md:shadow-none
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        {/* Logo - Desktop Only */}
        <div className="hidden md:block p-6 border-b">
          <h1 className="text-2xl font-bold text-green-700">Admin Panel</h1>
          <p className="text-sm text-gray-500">Candy Kush POS</p>
        </div>

        {/* Mobile Menu Header */}
        <div className="md:hidden p-5 border-b bg-green-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-green-700">Navigation</h2>
              <p className="text-sm text-gray-600 mt-0.5">Choose a section</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X className="h-6 w-6 text-gray-600" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 md:p-4 overflow-y-auto">
          <div className="space-y-2">
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
                      className={`w-full justify-start h-14 md:h-12 text-lg md:text-base font-medium rounded-xl ${
                        isActive
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : "hover:bg-gray-100"
                      }`}
                      onClick={() => toggleMenu(item.name)}
                    >
                      <Icon className="mr-4 h-7 w-7 md:mr-3 md:h-5 md:w-5" />
                      <span className="flex-1 text-left">{item.name}</span>
                      {isExpanded ? (
                        <ChevronDown className="h-6 w-6 md:h-5 md:w-5" />
                      ) : (
                        <ChevronRight className="h-6 w-6 md:h-5 md:w-5" />
                      )}
                    </Button>

                    {/* Submenu items */}
                    {isExpanded && (
                      <div className="ml-4 md:ml-4 mt-2 space-y-2 pb-2">
                        {item.subItems.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const isSubActive = pathname === subItem.href;
                          return (
                            <Link key={subItem.name} href={subItem.href}>
                              <Button
                                variant="ghost"
                                className={`w-full justify-start pl-12 md:pl-8 h-13 md:h-11 text-base rounded-lg ${
                                  isSubActive
                                    ? "bg-green-50 text-green-700 font-semibold hover:bg-green-50"
                                    : "hover:bg-gray-50"
                                }`}
                              >
                                <SubIcon className="mr-3 h-6 w-6 md:h-4 md:w-4" />
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
                    className={`w-full justify-start h-14 md:h-12 text-lg md:text-base font-medium rounded-xl ${
                      pathname === item.href
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="mr-4 h-7 w-7 md:mr-3 md:h-5 md:w-5" />
                    {item.name}
                  </Button>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Menu */}
        <div className="p-4 border-t mt-auto bg-gray-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start h-16 md:h-14 hover:bg-white rounded-xl"
              >
                <div className="h-10 w-10 md:h-8 md:w-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                  <User className="h-6 w-6 md:h-5 md:w-5 text-green-700" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-base md:text-sm font-semibold text-gray-900">
                    {user?.name}
                  </p>
                  <p className="text-sm md:text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 md:w-56">
              <DropdownMenuLabel className="text-base md:text-sm">
                My Account
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="h-12 md:h-10 text-base md:text-sm">
                <User className="mr-3 h-5 w-5 md:h-4 md:w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="h-12 md:h-10 text-base md:text-sm text-red-600 font-medium"
              >
                <LogOut className="mr-3 h-5 w-5 md:h-4 md:w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gray-50">
        <div className="p-5 md:p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
