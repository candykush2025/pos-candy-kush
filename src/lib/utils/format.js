/**
 * Format currency (Thai Baht)
 */
export const formatCurrency = (amount, currency = "THB", locale = "th-TH") => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
};

/**
 * Format date
 */
export const formatDate = (date, format = "short") => {
  const d = new Date(date);

  const formats = {
    short: { dateStyle: "short" },
    medium: { dateStyle: "medium" },
    long: { dateStyle: "long" },
    full: { dateStyle: "full", timeStyle: "short" },
    time: { timeStyle: "short" },
    datetime: { dateStyle: "short", timeStyle: "short" },
    date: { day: "numeric", month: "long", year: "numeric" }, // "17 November 2025"
  };

  return new Intl.DateTimeFormat(
    "en-US",
    formats[format] || formats.short
  ).format(d);
};

/**
 * Format date and time
 */
export const formatDateTime = (date) => {
  if (!date) return "";

  // Handle Firebase Timestamp
  const d = date?.toDate ? date.toDate() : new Date(date);

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
};

/**
 * Format phone number
 */
export const formatPhone = (phone) => {
  if (!phone) return "";

  const cleaned = phone.replace(/\D/g, "");
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);

  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }

  return phone;
};

/**
 * Format percentage
 */
export const formatPercentage = (value, decimals = 2) => {
  return `${Number(value).toFixed(decimals)}%`;
};

/**
 * Truncate text
 */
export const truncate = (text, length = 50) => {
  if (!text) return "";
  if (text.length <= length) return text;
  return `${text.substring(0, length)}...`;
};

/**
 * Parse float safely
 */
export const parseFloatSafe = (value, defaultValue = 0) => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Generate order number (max 20 chars for Loyverse)
 */
export const generateOrderNumber = (prefix = "ORD") => {
  const now = new Date();
  const date = now.toISOString().slice(2, 10).replace(/-/g, ""); // YYMMDD
  const time = now.toTimeString().slice(0, 5).replace(/:/g, ""); // HHMM
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  // Format: O-YYMMDD-HHMM-RRR (max 18 chars)
  return `O-${date}-${time}-${random}`;
};

/**
 * Generate ticket number
 */
export const generateTicketNumber = (prefix = "TKT") => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0");
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Deep clone object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Debounce function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Group array by key
 */
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {});
};

/**
 * Calculate percentage
 */
export const calculatePercentage = (value, total) => {
  if (total === 0) return 0;
  return (value / total) * 100;
};

/**
 * Round to decimals
 */
export const roundTo = (value, decimals = 2) => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};
