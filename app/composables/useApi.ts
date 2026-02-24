/**
 * Returns a $fetch instance pre-configured with the current user's Bearer token.
 * Automatically retries once after refreshing the token on 401 responses.
 * Redirects to /auth/login if the session cannot be recovered.
 */
export function useApi() {
  const authStore = useAuthStore()

  return $fetch.create({
    onRequest({ options }) {
      if (authStore.token) {
        const headers = new Headers(options.headers as HeadersInit | undefined)
        headers.set('Authorization', `Bearer ${authStore.token}`)
        options.headers = headers
      }
    },

    async onResponseError({ response, request }) {
      // Only handle 401s from our own API (not auth routes themselves)
      if (
        response.status === 401
        && typeof request === 'string'
        && !request.includes('/api/auth/')
      ) {
        const refreshed = await authStore.refresh()
        if (!refreshed) {
          await authStore.signOut()
          await navigateTo('/auth/login')
        }
      }
    },
  })
}
