import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import api from '@/api/axios';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post<{ user: User; token: string }>('/auth/login', {
            email,
            password,
          });
          localStorage.setItem('token', data.token);
          set({ user: data.user, token: data.token, isAuthenticated: true });
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (email, username, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post<{ user: User; token: string }>('/auth/register', {
            email,
            username,
            password,
          });
          localStorage.setItem('token', data.token);
          set({ user: data.user, token: data.token, isAuthenticated: true });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch {
          // Logout even if API fails
        }
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (updates) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...updates } });
        }
      },

      refreshUser: async () => {
        try {
          const { data } = await api.get<{ user: User }>('/auth/me');
          set({ user: data.user, isAuthenticated: true });
        } catch {
          set({ user: null, token: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'chatstream-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);
