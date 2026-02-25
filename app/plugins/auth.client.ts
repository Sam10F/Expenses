/**
 * Initialises the auth store from localStorage / sessionStorage on every page load.
 * Runs client-side only.
 */
export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore()
  authStore.initFromStorage()

  // Refresh if we have a refresh token and the access token is absent or expired.
  if (authStore.refreshToken && (!authStore.token || isJwtExpired(authStore.token))) {
    await authStore.refresh()
  }
})

/** Returns true if the JWT is missing, malformed, or within 60 s of its expiry. */
function isJwtExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]!)) as { exp: number }
    return Date.now() >= (payload.exp - 60) * 1000
  }
  catch {
    return true
  }
}
