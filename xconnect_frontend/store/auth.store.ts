import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setAuth: (user: User, token: string) => void;
  updateToken: (newToken: string) => void;
  addFriendId: (friendId: string) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false,

  setAuth: (user, token) => {
    set({ user, token, isAuthenticated: true });
  },

  updateToken: (token) => {
    set({ token });
  },
  
  addFriendId: (friendId) => {
    set((state) => {
      if (!state.user) return state;
      const currentIds = state.user.friendIds || [];
      if (currentIds.includes(friendId)) return state;
      return {
        user: {
          ...state.user,
          friendIds: [...currentIds, friendId],
        },
      };
    });
  },

  updateUser: (updates) => {
    set((state) => {
      if (!state.user) return state;
      return {
        user: { ...state.user, ...updates },
      };
    });
  },

  logout: () => {
    try {
      const { api } = require("../libs/api");
      api.post("/auth/logout").catch(() => {});
    } catch {
      /* ignore */
    }
    set({ user: null, token: null, isAuthenticated: false });
  },

  initializeAuth: async () => {
    try {
      const { refreshSession, api } = require("../libs/api");
      // 1. Silent token refresh using httpOnly cookie
      const accessToken = await refreshSession();
      
      // Set the token temporarily so that the /auth/me call includes it in headers
      set({ token: accessToken });

      // 2. Fetch user profile
      const user = (await api.get("/auth/me")) as User;
      
      set({ user, token: accessToken, isAuthenticated: true, isInitialized: true });
    } catch (err) {
      console.log("[AuthStore] Silent login failed or no session found.");
      set({ user: null, token: null, isAuthenticated: false, isInitialized: true });
    }
  },
}));
