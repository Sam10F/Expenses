export default defineEventHandler(async (event) => {
  const body = await readBody<{ refresh_token: string }>(event)

  if (!body.refresh_token) {
    throw createError({ statusCode: 400, message: 'refresh_token is required' })
  }

  const supabase = createSupabaseAdmin()
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: body.refresh_token })

  if (error || !data.session) {
    throw createError({ statusCode: 401, message: 'Session expired. Please sign in again.' })
  }

  return {
    access_token:  data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in:    data.session.expires_in,
  }
})
