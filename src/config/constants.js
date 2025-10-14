// Application-wide constants

export const USER_ROLES = {
  CASHIER: "cashier",
  MANAGER: "manager",
  ADMIN: "admin",
};

export const PAYMENT_METHODS = {
  CASH: "cash",
  CREDIT_CARD: "credit_card",
  DEBIT_CARD: "debit_card",
  DIGITAL_WALLET: "digital_wallet",
  GIFT_CARD: "gift_card",
  STORE_CREDIT: "store_credit",
};

export const ORDER_STATUS = {
  DRAFT: "draft",
  PARKED: "parked",
  COMPLETED: "completed",
  VOIDED: "voided",
  REFUNDED: "refunded",
};

export const SYNC_STATUS = {
  SYNCED: "synced",
  PENDING: "pending",
  SYNCING: "syncing",
  OFFLINE: "offline",
  ERROR: "error",
};

export const PERMISSIONS = {
  VIEW_PRODUCTS: "view_products",
  CREATE_SALE: "create_sale",
  APPLY_DISCOUNT: "apply_discount",
  VOID_SALE: "void_sale",
  VIEW_REPORTS: "view_reports",
  MANAGE_INVENTORY: "manage_inventory",
  MANAGE_USERS: "manage_users",
  CHANGE_SETTINGS: "change_settings",
  CLOSE_SESSION: "close_session",
  MANAGE_TICKETS: "manage_tickets",
};

export const TRANSACTION_TYPES = {
  SALE: "sale",
  RETURN: "return",
  VOID: "void",
  REFUND: "refund",
  ADJUSTMENT: "adjustment",
};

export const DISCOUNT_TYPES = {
  PERCENTAGE: "percentage",
  FIXED: "fixed",
};

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api",
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001",
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// Sync Configuration
export const SYNC_CONFIG = {
  INTERVAL: parseInt(process.env.NEXT_PUBLIC_SYNC_INTERVAL) || 30000,
  MAX_OFFLINE_QUEUE: parseInt(process.env.NEXT_PUBLIC_MAX_OFFLINE_QUEUE) || 100,
  BATCH_SIZE: 10,
};

// App Configuration
export const APP_CONFIG = {
  NAME: process.env.NEXT_PUBLIC_APP_NAME || "Candy Kush POS",
  VERSION: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
  AUTO_LOGOUT_TIME: 3600000, // 1 hour
  SESSION_WARNING_TIME: 300000, // 5 minutes before logout
};

// UI Configuration
export const UI_CONFIG = {
  TOUCH_TARGET_SIZE: 44, // Minimum touch target size in pixels
  ANIMATION_DURATION: 200, // milliseconds
  DEBOUNCE_DELAY: 300, // milliseconds for search
  ITEMS_PER_PAGE: 20,
  MAX_RECENT_SEARCHES: 10,
};

// Loyverse Configuration (from environment variables)
export const LOYVERSE_CONFIG = {
  STORE_ID: process.env.NEXT_PUBLIC_LOYVERSE_STORE_ID || "",
  DEFAULT_PAYMENT_TYPE_ID:
    process.env.NEXT_PUBLIC_LOYVERSE_PAYMENT_TYPE_ID || "",
  SOURCE_NAME: process.env.NEXT_PUBLIC_LOYVERSE_SOURCE_NAME || "POS System",
};

// Loyverse Payment Types (from your Loyverse account)
export const LOYVERSE_PAYMENT_TYPES = {
  CASH: {
    id: "e68a8970-7792-49f7-a0f3-f72c61371d46",
    name: "Cash",
    type: "CASH",
  },
  CARD: {
    id: "4b4b981f-81aa-4979-baaa-cf8ac49647ec",
    name: "Card",
    type: "NONINTEGRATEDCARD",
  },
  CRYPTO: {
    id: "d8139062-22ed-4e16-a565-0a1fead90c70",
    name: "Crypto transfer",
    type: "OTHER",
  },
  TRANSFER: {
    id: "e8cc7249-784b-4224-bd9c-db4fe19c1d84",
    name: "Transfer",
    type: "OTHER",
  },
};

// Feature Flags
export const FEATURES = {
  BARCODE_SCANNER: process.env.NEXT_PUBLIC_ENABLE_BARCODE_SCANNER === "true",
  CUSTOMER_DISPLAY: process.env.NEXT_PUBLIC_ENABLE_CUSTOMER_DISPLAY === "true",
  HARDWARE_INTEGRATION:
    process.env.NEXT_PUBLIC_ENABLE_HARDWARE_INTEGRATION === "true",
  DEBUG_MODE: process.env.NEXT_PUBLIC_DEBUG_MODE === "true",
  MOCK_API: process.env.NEXT_PUBLIC_MOCK_API === "true",
  LOYVERSE_SYNC: process.env.NEXT_PUBLIC_LOYVERSE_SYNC === "true",
};

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: "pos_auth_token",
  REFRESH_TOKEN: "pos_refresh_token",
  USER_DATA: "pos_user_data",
  SETTINGS: "pos_settings",
  OFFLINE_QUEUE: "pos_offline_queue",
  LAST_SYNC: "pos_last_sync",
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Unable to connect to server. Working in offline mode.",
  AUTH_FAILED: "Authentication failed. Please check your credentials.",
  SESSION_EXPIRED: "Your session has expired. Please login again.",
  INSUFFICIENT_PERMISSIONS:
    "You do not have permission to perform this action.",
  SYNC_FAILED: "Failed to synchronize data. Will retry automatically.",
  PRODUCT_NOT_FOUND: "Product not found.",
  INSUFFICIENT_STOCK: "Insufficient stock available.",
};

// Success Messages
export const SUCCESS_MESSAGES = {
  SALE_COMPLETED: "Sale completed successfully!",
  TICKET_SAVED: "Ticket saved successfully.",
  SYNC_COMPLETED: "Data synchronized successfully.",
  LOGIN_SUCCESS: "Welcome back!",
  LOGOUT_SUCCESS: "Logged out successfully.",
};
