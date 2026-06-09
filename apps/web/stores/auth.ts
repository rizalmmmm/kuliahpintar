// Pinia store untuk state autentikasi global
import { defineStore } from 'pinia'
import type { User } from '@supabase/supabase-js'

type AuthState = {
  user: User | null
  loading: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    loading: true,
  }),

  getters: {
    isLoggedIn: (state): boolean => state.user !== null,
    isLoading: (state): boolean => state.loading,
  },

  actions: {
    setUser(user: User | null) {
      this.user = user
      this.loading = false
    },
    clearUser() {
      this.user = null
      this.loading = false
    },
  },
})
