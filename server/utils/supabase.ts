import { createClient } from '@supabase/supabase-js'
import type { Database } from '#types/supabase'

/**
 * Returns a Supabase client with the service role key.
 * A new client is created per call so that runtime config is always read fresh —
 * avoids a stale singleton cached at cold-start before env vars are available.
 * Only call this from server-side code (server/api/**).
 */
export function createSupabaseAdmin() {
  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl
  const key = config.supabaseServiceRoleKey

  if (!url || !key) {
    throw new Error(
      'Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env',
    )
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
