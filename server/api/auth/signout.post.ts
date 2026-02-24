import { createClient } from '@supabase/supabase-js'
import type { Database } from '#types/supabase'

export default defineEventHandler(async (event) => {
  const authorization = getHeader(event, 'authorization')
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null

  if (token) {
    // Use a user-scoped client so signOut invalidates this specific session
    const config = useRuntimeConfig()
    const userClient = createClient<Database>(
      config.public.supabaseUrl,
      config.public.supabaseAnonKey,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    )
    await userClient.auth.signOut()
  }

  return { success: true }
})
