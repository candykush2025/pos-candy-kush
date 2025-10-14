import { USER_ROLES, PERMISSIONS } from "./constants";

// Re-export for convenience
export { USER_ROLES, PERMISSIONS };

// Role-based permission mapping
export const ROLE_PERMISSIONS = {
  [USER_ROLES.CASHIER]: [PERMISSIONS.VIEW_PRODUCTS, PERMISSIONS.CREATE_SALE],

  [USER_ROLES.MANAGER]: [
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.CREATE_SALE,
    PERMISSIONS.APPLY_DISCOUNT,
    PERMISSIONS.VOID_SALE,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_TICKETS,
    PERMISSIONS.CLOSE_SESSION,
  ],

  [USER_ROLES.ADMIN]: [
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.CREATE_SALE,
    PERMISSIONS.APPLY_DISCOUNT,
    PERMISSIONS.VOID_SALE,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.CHANGE_SETTINGS,
    PERMISSIONS.CLOSE_SESSION,
    PERMISSIONS.MANAGE_TICKETS,
  ],
};

/**
 * Check if a user has a specific permission
 * @param {string} userRole - User's role
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export const hasPermission = (userRole, permission) => {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return rolePermissions.includes(permission);
};

/**
 * Check if a user has any of the specified permissions
 * @param {string} userRole - User's role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean}
 */
export const hasAnyPermission = (userRole, permissions) => {
  return permissions.some((permission) => hasPermission(userRole, permission));
};

/**
 * Check if a user has all of the specified permissions
 * @param {string} userRole - User's role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean}
 */
export const hasAllPermissions = (userRole, permissions) => {
  return permissions.every((permission) => hasPermission(userRole, permission));
};

/**
 * Get all permissions for a role
 * @param {string} userRole - User's role
 * @returns {string[]}
 */
export const getRolePermissions = (userRole) => {
  return ROLE_PERMISSIONS[userRole] || [];
};
