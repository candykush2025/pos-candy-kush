import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/config/constants";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Set user and tokens
      setAuth: (user, token, refreshToken) => {
        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
          error: null,
        });
      },

      // Update user info
      setUser: (user) => {
        set({ user });
      },

      // Update token
      setToken: (token) => {
        set({ token });
      },

      // Logout
      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      // Set loading state
      setLoading: (isLoading) => {
        set({ isLoading });
      },

      // Set error
      setError: (error) => {
        set({ error, isLoading: false });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Get user role
      getUserRole: () => {
        return get().user?.role;
      },

      // Check if user has permission
      hasPermission: (permission) => {
        const { user } = get();
        if (!user) return false;
        return user.permissions?.includes(permission) || false;
      },
    }),
    {
      name: STORAGE_KEYS.AUTH_TOKEN,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
