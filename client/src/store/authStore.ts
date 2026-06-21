import { create } from "zustand";
import { getMe, refreshToken, logoutService } from "../app/auth/auth.service";

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin' | 'superadmin';
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  error: string | null;
  isInitialized: boolean;

  setUser: (userData: User, token: string) => void;
  setAccessToken: (token: string) => void;
  setInitialized: (value: boolean) => void;
  fetchCurrentUser: () => Promise<any>;
  refreshAccessToken: () => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // ── State (all fields declared upfront) ─────────────
  user: null,              // { _id, name, email, role }
  accessToken: null,       // 🔐 Memory-only (no persist)
  isLoggedIn: false,
  isAdmin: false,          // Will be computed on setUser/getMe
  isSuperAdmin: false,
  loading: false,
  error: null,
  isInitialized: false,

  // ── Actions ─────────────────────────────────────────

  /**
   * Set user + token after login
   */
  setUser: (userData, token) => {
    const isAdmin = userData?.role === "admin";
    const isSuperAdmin = userData?.role === "superadmin";
    set({
      user: userData,
      accessToken: token,
      isLoggedIn: true,
      isAdmin,
      isSuperAdmin,
      isInitialized: false,
      loading: false,
      error: null,
    });
  },

  /**
   * Update access token only
   */
  setAccessToken: (token) => set({ accessToken: token }),

  setInitialized: (value) => set({ isInitialized: value }),

  /**
   * Fetch current user from API
   */
  fetchCurrentUser: async () => await getMe(set),

  /**
   * Refresh access token
   */
  refreshAccessToken: () => refreshToken(set),

  /**
   * Logout — clear all auth state
   */
  logout: () => logoutService(set),

  // ── Optional: Helper to clear error ─────────────────
  clearError: () => set({ error: null }),
}));

// ── Helper Hooks (for components) ─────────────────────
export const useIsAdmin = () =>
  useAuthStore((state) => state.user?.role === "admin");

export const useUserRole = () =>
  useAuthStore((state) => state.user?.role);
