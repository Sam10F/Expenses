import { createClient } from '@supabase/supabase-js'
import type { Database } from '#types/supabase'
import type { SignInPayload } from '#types/app'

export default defineEventHandler(async (event) => {
  const body = await readBody<SignInPayload>(event)

  if (!body.username?.trim() || !body.password) {
    throw createError({ statusCode: 400, message: 'Username and password are required' })
  }

  const supabase = createSupabaseAdmin()

  // Look up the profile to confirm the username exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', body.username.trim())
    .maybeSingle()

  // Always return the same generic error to prevent username enumeration
  if (!profile) {
    throw createError({ statusCode: 401, message: 'auth.invalidCredentials' })
  }

  // Sign in via anon-key client so Supabase creates a proper user session
  const config = useRuntimeConfig()
  const anonClient = createClient<Database>(
    config.public.supabaseUrl,
    config.public.supabaseAnonKey,
  )

  const syntheticEmail = `${body.username.trim()}@app.internal`
  const { data: session, error } = await anonClient.auth.signInWithPassword({
    email:    syntheticEmail,
    password: body.password,
  })

  if (error || !session.session) {
    throw createError({ statusCode: 401, message: 'auth.invalidCredentials' })
  }

  return {
    access_token:  session.session.access_token,
    refresh_token: session.session.refresh_token,
    expires_in:    session.session.expires_in,
    user_id:       profile.id,
    username:      profile.username,
  }
})
