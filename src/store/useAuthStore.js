import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/config/constants";
import { jwtUtils } from "@/lib/jwt";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Initialize auth state from stored token
      initializeAuth: () => {
        const state = get();
        if (state.token && jwtUtils.isValid(state.token)) {
          const user = jwtUtils.getUserFromToken(state.token);
          if (user) {
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            return true;
          }
        }
        // Token invalid or expired
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        return false;
      },

      // Set user and create JWT token
      setAuth: (user, token, refreshToken) => {
        // Create JWT token with user data
        const jwtToken = jwtUtils.encode({ user });

        set({
          user,
          token: jwtToken,
          refreshToken,
          isAuthenticated: true,
          error: null,
        });
      },

      // Update user info and refresh token
      setUser: (user) => {
        const state = get();
        if (state.token) {
          // Create new JWT token with updated user data
          const newToken = jwtUtils.encode({ user });
          set({ user, token: newToken });
        } else {
          set({ user });
        }
      },

      // Update token
      setToken: (token) => {
        if (token && jwtUtils.isValid(token)) {
          const user = jwtUtils.getUserFromToken(token);
          set({
            token,
            user,
            isAuthenticated: !!user,
          });
        } else {
          set({
            token: null,
            user: null,
            isAuthenticated: false,
          });
        }
      },

      // Check if current token is valid
      isTokenValid: () => {
        const state = get();
        return state.token && jwtUtils.isValid(state.token);
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
