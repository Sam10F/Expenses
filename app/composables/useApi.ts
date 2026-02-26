/**
 * Shared promise so that concurrent token refreshes are deduplicated —
 * used both for proactive pre-request refresh and reactive 401 retry.
 */
let _refreshPromise: Promise<boolean> | null = null

/** Returns true if the JWT is missing, malformed, or within 60 s of its expiry. */
function isJwtExpiring(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]!)) as { exp: number }
    return Date.now() >= (payload.exp - 60) * 1000
  }
  catch {
    return true
  }
}

/**
 * Returns a fetch function pre-configured with the current user's Bearer token.
 *
 * Before every request the token is checked for imminent expiry and refreshed
 * proactively (within the 60-second window) so the server never receives a
 * stale token. On unexpected 401 responses a second refresh + retry is still
 * attempted as a belt-and-suspenders fallback. Both paths share the same
 * `_refreshPromise` singleton to avoid redundant refreshes across concurrent
 * requests.
 */
export function useApi() {
  const authStore = useAuthStore()

  const baseFetch = $fetch.create({
    onRequest({ options }) {
      if (authStore.token) {
        const headers = new Headers(options.headers as HeadersInit | undefined)
        headers.set('Authorization', `Bearer ${authStore.token}`)
        options.headers = headers
      }
    },
  })

  return async function apiFetch<T>(
    request: string,
    options?: Parameters<typeof baseFetch>[1],
  ): Promise<T> {
    // Proactively refresh if the token is expired or about to expire (within
    // 60 s). This prevents the server from receiving a stale token and avoids
    // the extra round-trip that a reactive 401 retry would require.
    if (authStore.token && isJwtExpiring(authStore.token) && authStore.refreshToken) {
      if (!_refreshPromise) {
        _refreshPromise = authStore.refresh().finally(() => { _refreshPromise = null })
      }
      await _refreshPromise
    }

    try {
      return await baseFetch<T>(request, options) as unknown as T
    }
    catch (err: unknown) {
      const status = (err as { status?: number; statusCode?: number }).status
        ?? (err as { status?: number; statusCode?: number }).statusCode

      if (status === 401 && !request.includes('/api/auth/')) {
        // Deduplicate: all concurrent 401s share the same refresh attempt
        if (!_refreshPromise) {
          _refreshPromise = authStore.refresh().finally(() => { _refreshPromise = null })
        }
        const refreshed = await _refreshPromise

        if (refreshed) {
          // Retry once with the new token (onRequest picks up authStore.token automatically)
          return await baseFetch<T>(request, options) as unknown as T
        }

        await authStore.signOut()
        await navigateTo('/auth/login')
      }

      throw err
    }
  }
}
