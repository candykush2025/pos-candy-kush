import api from "./client";

/**
 * Authentication API endpoints
 */
export const authApi = {
  // Login
  login: async (username, password) => {
    const response = await api.post("/auth/login", { username, password });
    return response.data;
  },

  // Logout
  logout: async () => {
    const response = await api.post("/auth/logout");
    return response.data;
  },

  // Refresh token
  refresh: async (refreshToken) => {
    const response = await api.post("/auth/refresh", { refreshToken });
    return response.data;
  },

  // Get current user
  me: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },
};

/**
 * Products API endpoints
 */
export const productsApi = {
  // Get all products
  getAll: async (params) => {
    const response = await api.get("/products", { params });
    return response.data;
  },

  // Get product by ID
  getById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  // Search products
  search: async (query) => {
    const response = await api.get("/products/search", {
      params: { q: query },
    });
    return response.data;
  },

  // Get product by barcode
  getByBarcode: async (barcode) => {
    const response = await api.get(`/products/barcode/${barcode}`);
    return response.data;
  },
};

/**
 * Orders API endpoints
 */
export const ordersApi = {
  // Create order
  create: async (orderData) => {
    const response = await api.post("/orders", orderData);
    return response.data;
  },

  // Get all orders
  getAll: async (params) => {
    const response = await api.get("/orders", { params });
    return response.data;
  },

  // Get order by ID
  getById: async (id) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  // Update order
  update: async (id, orderData) => {
    const response = await api.put(`/orders/${id}`, orderData);
    return response.data;
  },

  // Void order
  void: async (id) => {
    const response = await api.post(`/orders/${id}/void`);
    return response.data;
  },
};

/**
 * Customers API endpoints
 */
export const customersApi = {
  // Get all customers
  getAll: async (params) => {
    const response = await api.get("/customers", { params });
    return response.data;
  },

  // Get customer by ID
  getById: async (id) => {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },

  // Create customer
  create: async (customerData) => {
    const response = await api.post("/customers", customerData);
    return response.data;
  },

  // Update customer
  update: async (id, customerData) => {
    const response = await api.put(`/customers/${id}`, customerData);
    return response.data;
  },

  // Search customers
  search: async (query) => {
    const response = await api.get("/customers/search", {
      params: { q: query },
    });
    return response.data;
  },
};

/**
 * Categories API endpoints
 */
export const categoriesApi = {
  // Get all categories
  getAll: async () => {
    const response = await api.get("/categories");
    return response.data;
  },

  // Get category by ID
  getById: async (id) => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },
};

/**
 * Users API endpoints
 */
export const usersApi = {
  // Get all users
  getAll: async () => {
    const response = await api.get("/users");
    return response.data;
  },

  // Get user by ID
  getById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
};

/**
 * Reports API endpoints
 */
export const reportsApi = {
  // Get sales report
  getSalesReport: async (params) => {
    const response = await api.get("/reports/sales", { params });
    return response.data;
  },

  // Get daily summary
  getDailySummary: async (date) => {
    const response = await api.get("/reports/daily", { params: { date } });
    return response.data;
  },

  // Get inventory report
  getInventoryReport: async () => {
    const response = await api.get("/reports/inventory");
    return response.data;
  },
};

/**
 * Sessions API endpoints
 */
export const sessionsApi = {
  // Open session
  open: async (sessionData) => {
    const response = await api.post("/sessions/open", sessionData);
    return response.data;
  },

  // Close session
  close: async (sessionId, sessionData) => {
    const response = await api.post(
      `/sessions/${sessionId}/close`,
      sessionData
    );
    return response.data;
  },

  // Get current session
  getCurrent: async () => {
    const response = await api.get("/sessions/current");
    return response.data;
  },

  // Get sessions
  getAll: async (params) => {
    const response = await api.get("/sessions", { params });
    return response.data;
  },
};

export default {
  auth: authApi,
  products: productsApi,
  orders: ordersApi,
  customers: customersApi,
  categories: categoriesApi,
  users: usersApi,
  reports: reportsApi,
  sessions: sessionsApi,
};
