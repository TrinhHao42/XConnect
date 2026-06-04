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
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

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
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
