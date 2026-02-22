import { createClient } from '@supabase/supabase-js'
import type { Database } from '#types/supabase'

let _adminClient: ReturnType<typeof createClient<Database>> | null = null

/**
 * Returns a Supabase client with the service role key.
 * Only call this from server-side code (server/api/**).
 */
export function createSupabaseAdmin() {
  if (_adminClient) return _adminClient

  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl
  // Prefer service role key; fall back to anon key (works because RLS allows anon access)
  const key = config.supabaseServiceRoleKey || config.public.supabaseAnonKey

  if (!url || !key) {
    throw new Error(
      'Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env',
    )
  }

  _adminClient = createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return _adminClient
}
