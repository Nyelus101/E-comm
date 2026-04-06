// frontend/store/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@/types'
import api from '@/lib/api'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean

  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
  setTokens: (access: string, refresh: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,

      setTokens: (access, refresh) => {
        // Store in both Zustand and localStorage
        // localStorage is used by the Axios interceptor
        localStorage.setItem('access_token', access)
        localStorage.setItem('refresh_token', refresh)
        set({ accessToken: access, refreshToken: refresh })
      },

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const { data } = await api.post('/auth/login', { email, password })
          get().setTokens(data.access_token, data.refresh_token)
          await get().fetchMe()
        } finally {
          set({ isLoading: false })
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch {
          // Logout even if API call fails
        }
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({ user: null, accessToken: null, refreshToken: null })
      },

      fetchMe: async () => {
        try {
          const { data } = await api.get('/users/me')
          set({ user: data })
        } catch {
          set({ user: null })
        }
      },
    }),
    {
      name: 'auth-storage',
      // Only persist the user object — tokens come from localStorage
      partialize: (state) => ({ user: state.user }),
    }
  )
)