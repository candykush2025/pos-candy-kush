import { useAuthStore } from "@/store/useAuthStore";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from "@/config/permissions";

/**
 * Hook for checking user permissions
 */
export const usePermissions = () => {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;

  return {
    /**
     * Check if user has a specific permission
     */
    can: (permission) => {
      if (!userRole) return false;
      return hasPermission(userRole, permission);
    },

    /**
     * Check if user has any of the specified permissions
     */
    canAny: (permissions) => {
      if (!userRole) return false;
      return hasAnyPermission(userRole, permissions);
    },

    /**
     * Check if user has all of the specified permissions
     */
    canAll: (permissions) => {
      if (!userRole) return false;
      return hasAllPermissions(userRole, permissions);
    },

    /**
     * Check if user cannot perform action
     */
    cannot: (permission) => {
      if (!userRole) return true;
      return !hasPermission(userRole, permission);
    },

    /**
     * Get user role
     */
    role: userRole,

    /**
     * Check if user is admin
     */
    isAdmin: () => userRole === "admin",

    /**
     * Check if user is manager
     */
    isManager: () => userRole === "manager" || userRole === "admin",

    /**
     * Check if user is cashier
     */
    isCashier: () => userRole === "cashier",
  };
};

export default usePermissions;
