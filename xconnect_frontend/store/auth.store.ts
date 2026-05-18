import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  updateToken: (newToken: string) => void;
  addFriendId: (friendId: string) => void;
  logout: () => void;
}

const setCookie = (token: string) => {
  if (typeof document === "undefined") return;
  document.cookie = `accessToken=${token}; path=/; max-age=86400; SameSite=Lax`;
};

const clearCookie = () => {
  if (typeof document === "undefined") return;
  document.cookie = `accessToken=; path=/; max-age=0`;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        setCookie(token);
        set({ user, token, isAuthenticated: true });
      },

      updateToken: (token) => {
        setCookie(token);
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

      logout: () => {
        clearCookie();
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setCookie(state.token);
        }
      },
    }
  )
);
