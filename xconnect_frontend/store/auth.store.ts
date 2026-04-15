import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      // We also ensure token syncs to cookies so Next.js middleware works seamlessly
      onRehydrateStorage: () => (state) => {
         if (state && state.token) {
            document.cookie = `accessToken=${state.token}; path=/; max-age=86400`;
         } else {
             document.cookie = `accessToken=; path=/; max-age=0`;
         }
      }
    }
  )
);
