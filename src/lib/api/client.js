import axios from "axios";
import { API_CONFIG, STORAGE_KEYS } from "@/config/constants";

// Create axios instance
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
        : null;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors and token refresh
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const refreshToken =
          typeof window !== "undefined"
            ? localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
            : null;

        if (refreshToken) {
          const response = await axios.post(
            `${API_CONFIG.BASE_URL}/auth/refresh`,
            { refreshToken }
          );

          const { token } = response.data;

          // Save new token
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
          }

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - logout user
        if (typeof window !== "undefined") {
          localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER_DATA);
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    // Handle offline errors
    if (!error.response) {
      console.warn("Network error - working in offline mode");
      error.isOffline = true;
    }

    return Promise.reject(error);
  }
);

// Retry logic for failed requests
const retryRequest = async (fn, retries = API_CONFIG.RETRY_ATTEMPTS) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && error.isOffline) {
      await new Promise((resolve) =>
        setTimeout(resolve, API_CONFIG.RETRY_DELAY)
      );
      return retryRequest(fn, retries - 1);
    }
    throw error;
  }
};

// API methods
export const api = {
  // GET request
  get: (url, config) => retryRequest(() => apiClient.get(url, config)),

  // POST request
  post: (url, data, config) =>
    retryRequest(() => apiClient.post(url, data, config)),

  // PUT request
  put: (url, data, config) =>
    retryRequest(() => apiClient.put(url, data, config)),

  // PATCH request
  patch: (url, data, config) =>
    retryRequest(() => apiClient.patch(url, data, config)),

  // DELETE request
  delete: (url, config) => retryRequest(() => apiClient.delete(url, config)),
};

export default api;
