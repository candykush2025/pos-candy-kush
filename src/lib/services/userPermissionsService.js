/**
 * User Permissions Service
 * Helper functions to check detailed user permissions
 */

import {
  USER_ROLES,
  CASHIER_PERMISSIONS,
  DEFAULT_CASHIER_PERMISSIONS,
} from "@/config/constants";

/**
 * Check if a user has a specific cashier permission
 * Admins always have all permissions
 * Managers have most permissions except some admin-only ones
 * Cashiers have only their specifically assigned permissions
 */
export const hasDetailedPermission = (user, permission) => {
  if (!user) return false;

  // Admins have all permissions
  if (user.role === USER_ROLES.ADMIN) {
    return true;
  }

  // Managers have most permissions
  if (user.role === USER_ROLES.MANAGER) {
    // Managers can't delete products or customers by default
    const managerRestrictedPermissions = [
      CASHIER_PERMISSIONS.CAN_DELETE_PRODUCT,
      CASHIER_PERMISSIONS.CAN_DELETE_CUSTOMER,
    ];

    if (managerRestrictedPermissions.includes(permission)) {
      // Check if specifically granted
      return user.permissions?.[permission] === true;
    }

    return true;
  }

  // For cashiers, check their specific permissions
  if (user.role === USER_ROLES.CASHIER) {
    // Check if user has custom permissions set
    if (user.permissions && typeof user.permissions === "object") {
      return user.permissions[permission] === true;
    }

    // Fall back to default permissions
    return DEFAULT_CASHIER_PERMISSIONS[permission] === true;
  }

  return false;
};

/**
 * Get all permissions for a user
 */
export const getUserPermissions = (user) => {
  if (!user) return DEFAULT_CASHIER_PERMISSIONS;

  // Admins have all permissions
  if (user.role === USER_ROLES.ADMIN) {
    const allTrue = {};
    Object.keys(CASHIER_PERMISSIONS).forEach((key) => {
      allTrue[CASHIER_PERMISSIONS[key]] = true;
    });
    return allTrue;
  }

  // Managers have most permissions
  if (user.role === USER_ROLES.MANAGER) {
    const managerPerms = { ...DEFAULT_CASHIER_PERMISSIONS };
    // Enable most permissions for managers
    Object.keys(CASHIER_PERMISSIONS).forEach((key) => {
      managerPerms[CASHIER_PERMISSIONS[key]] = true;
    });
    // But still restrict some
    managerPerms[CASHIER_PERMISSIONS.CAN_DELETE_PRODUCT] =
      user.permissions?.[CASHIER_PERMISSIONS.CAN_DELETE_PRODUCT] || false;
    managerPerms[CASHIER_PERMISSIONS.CAN_DELETE_CUSTOMER] =
      user.permissions?.[CASHIER_PERMISSIONS.CAN_DELETE_CUSTOMER] || false;
    return managerPerms;
  }

  // For cashiers, return their specific permissions or defaults
  if (user.permissions && typeof user.permissions === "object") {
    return { ...DEFAULT_CASHIER_PERMISSIONS, ...user.permissions };
  }

  return DEFAULT_CASHIER_PERMISSIONS;
};

/**
 * Check multiple permissions at once
 */
export const hasAllPermissions = (user, permissions) => {
  return permissions.every((perm) => hasDetailedPermission(user, perm));
};

/**
 * Check if user has any of the given permissions
 */
export const hasAnyPermission = (user, permissions) => {
  return permissions.some((perm) => hasDetailedPermission(user, perm));
};

// Permission check shortcuts
export const canChangePrice = (user) =>
  hasDetailedPermission(user, CASHIER_PERMISSIONS.CAN_CHANGE_PRICE);
export const canChangeStock = (user) =>
  hasDetailedPermission(user, CASHIER_PERMISSIONS.CAN_CHANGE_STOCK);
export const canAddProduct = (user) =>
  hasDetailedPermission(user, CASHIER_PERMISSIONS.CAN_ADD_PRODUCT);
export const canDeleteProduct = (user) =>
  hasDetailedPermission(user, CASHIER_PERMISSIONS.CAN_DELETE_PRODUCT);
export const canEditProduct = (user) =>
  hasDetailedPermission(user, CASHIER_PERMISSIONS.CAN_EDIT_PRODUCT);
export const canAddCustomer = (user) =>
  hasDetailedPermission(user, CASHIER_PERMISSIONS.CAN_ADD_CUSTOMER);
export const canEditCustomer = (user) =>
  hasDetailedPermission(user, CASHIER_PERMISSIONS.CAN_EDIT_CUSTOMER);
export const canDeleteCustomer = (user) =>
  hasDetailedPermission(user, CASHIER_PERMISSIONS.CAN_DELETE_CUSTOMER);
export const canSetCustomerExpiry = (user) =>
  hasDetailedPermission(user, CASHIER_PERMISSIONS.CAN_SET_CUSTOMER_EXPIRY);
export const canApplyDiscount = (user) =>
  hasDetailedPermission(user, CASHIER_PERMISSIONS.CAN_APPLY_DISCOUNT);
export const canVoidSale = (user) =>
  hasDetailedPermission(user, CASHIER_PERMISSIONS.CAN_VOID_SALE);

export default {
  hasDetailedPermission,
  getUserPermissions,
  hasAllPermissions,
  hasAnyPermission,
  canChangePrice,
  canChangeStock,
  canAddProduct,
  canDeleteProduct,
  canEditProduct,
  canAddCustomer,
  canEditCustomer,
  canDeleteCustomer,
  canSetCustomerExpiry,
  canApplyDiscount,
  canVoidSale,
};
