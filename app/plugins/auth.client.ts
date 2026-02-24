/**
 * Initialises the auth store from localStorage / sessionStorage on every page load.
 * Runs client-side only.
 */
export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore()
  authStore.initFromStorage()

  // If we have a refresh token but the access token may be stale, try to refresh silently.
  // We don't await failures — the auth middleware will redirect to login if needed.
  if (authStore.refreshToken && !authStore.token) {
    await authStore.refresh()
  }
})
