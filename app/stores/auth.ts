import { defineStore } from 'pinia'

const TOKEN_KEY         = 'auth_token'
const REFRESH_TOKEN_KEY = 'auth_refresh_token'
const USER_KEY          = 'auth_user'

export const useAuthStore = defineStore('auth', () => {
  const user         = ref<{ id: string; username: string } | null>(null)
  const token        = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  // ── Storage helpers ─────────────────────────────────────────

  function persist(remember: boolean, accessToken: string, refresh: string, userData: { id: string; username: string }) {
    const storage = remember ? localStorage : sessionStorage
    storage.setItem(TOKEN_KEY, accessToken)
    storage.setItem(REFRESH_TOKEN_KEY, refresh)
    storage.setItem(USER_KEY, JSON.stringify(userData))
  }

  function clearStorage() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(REFRESH_TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
  }

  // ── Init from persisted storage ──────────────────────────────

  function initFromStorage() {
    const stored = localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
    const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY) ?? sessionStorage.getItem(REFRESH_TOKEN_KEY)
    const storedUser = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY)

    if (stored && storedUser) {
      try {
        token.value        = stored
        refreshToken.value = storedRefresh
        user.value         = JSON.parse(storedUser)
      }
      catch {
        clearStorage()
      }
    }
  }

  // ── Actions ──────────────────────────────────────────────────

  async function signUp(username: string, password: string) {
    await $fetch('/api/auth/signup', {
      method: 'POST',
      body: { username, password },
    })
  }

  async function signIn(username: string, password: string, remember: boolean = true) {
    const data = await $fetch<{
      access_token: string
      refresh_token: string
      expires_in: number
      user_id: string
      username: string
    }>('/api/auth/signin', {
      method: 'POST',
      body: { username, password },
    })

    token.value        = data.access_token
    refreshToken.value = data.refresh_token
    user.value         = { id: data.user_id, username: data.username }

    persist(remember, data.access_token, data.refresh_token, user.value)
  }

  async function signOut() {
    try {
      await $fetch('/api/auth/signout', {
        method: 'POST',
        headers: token.value ? { Authorization: `Bearer ${token.value}` } : {},
      })
    }
    catch {
      // Ignore errors — clear local state regardless
    }
    token.value        = null
    refreshToken.value = null
    user.value         = null
    clearStorage()
  }

  /** Attempts to refresh the access token. Returns true on success. */
  async function refresh(): Promise<boolean> {
    if (!refreshToken.value) return false

    try {
      const data = await $fetch<{
        access_token: string
        refresh_token: string
        expires_in: number
      }>('/api/auth/refresh', {
        method: 'POST',
        body: { refresh_token: refreshToken.value },
      })

      token.value        = data.access_token
      refreshToken.value = data.refresh_token

      // Update whichever storage is active
      const inLocal = !!localStorage.getItem(TOKEN_KEY)
      const storage = inLocal ? localStorage : sessionStorage
      if (user.value) persist(inLocal, data.access_token, data.refresh_token, user.value)
      else storage.setItem(TOKEN_KEY, data.access_token)

      return true
    }
    catch {
      return false
    }
  }

  return {
    user,
    token,
    refreshToken,
    isAuthenticated,
    initFromStorage,
    signUp,
    signIn,
    signOut,
    refresh,
  }
})
