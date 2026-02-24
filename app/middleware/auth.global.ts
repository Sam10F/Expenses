const PUBLIC_ROUTES = ['/auth/login', '/auth/signup']

export default defineNuxtRouteMiddleware((to) => {
  // Server-side: skip (auth state lives in client storage)
  if (import.meta.server) return

  const authStore = useAuthStore()

  const isPublic = PUBLIC_ROUTES.includes(to.path)

  if (!authStore.isAuthenticated && !isPublic) {
    return navigateTo('/auth/login')
  }

  if (authStore.isAuthenticated && isPublic) {
    return navigateTo('/')
  }
})
