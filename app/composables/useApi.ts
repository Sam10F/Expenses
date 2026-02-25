/**
 * Shared promise so that concurrent 401 responses only trigger one token refresh,
 * preventing parallel requests from invalidating each other's refresh tokens.
 */
let _refreshPromise: Promise<boolean> | null = null

/**
 * Returns a fetch function pre-configured with the current user's Bearer token.
 * On 401 responses, refreshes the token (deduplicated across concurrent requests)
 * and retries the original request once. Redirects to /auth/login if the session
 * cannot be recovered.
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
