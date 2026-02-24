import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import type { Database } from '#types/supabase'

/**
 * Extracts and verifies the Bearer token from the Authorization header.
 * Returns the authenticated user's ID and username.
 * Throws 401 if the token is missing or invalid.
 */
export async function requireAuth(event: H3Event): Promise<{ userId: string; username: string }> {
  const authorization = getHeader(event, 'authorization')
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null

  if (!token) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Use a fresh anon-key client per request to verify the user token.
  // The singleton admin client must NOT be used here — it uses service_role which bypasses auth.
  const config = useRuntimeConfig()
  const anonClient = createClient<Database>(
    config.public.supabaseUrl,
    config.public.supabaseAnonKey,
  )

  const { data: { user }, error } = await anonClient.auth.getUser(token)
  if (error || !user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const adminClient = createSupabaseAdmin()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  return { userId: user.id, username: profile?.username ?? '' }
}

/**
 * Verifies that `userId` is an active member of `groupId`.
 * Returns the member row (id, role) or throws 403.
 */
export async function requireGroupMember(groupId: string, userId: string) {
  const supabase = createSupabaseAdmin()
  const { data: member } = await supabase
    .from('members')
    .select('id, role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single()

  if (!member) {
    throw createError({ statusCode: 403, message: 'Not a member of this group' })
  }

  return member as { id: string; role: string }
}
