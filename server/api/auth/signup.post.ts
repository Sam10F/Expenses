import type { SignUpPayload } from '#types/app'

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^]).{8,}$/

export default defineEventHandler(async (event) => {
  const body = await readBody<SignUpPayload>(event)

  if (!body.username || !USERNAME_RE.test(body.username)) {
    throw createError({
      statusCode: 400,
      message: 'auth.usernameInvalid',
    })
  }

  if (!body.password || !PASSWORD_RE.test(body.password)) {
    throw createError({
      statusCode: 400,
      message: 'auth.passwordWeak',
    })
  }

  const supabase = createSupabaseAdmin()

  // Check username uniqueness
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', body.username)
    .maybeSingle()

  if (existing) {
    throw createError({ statusCode: 409, message: 'auth.usernameTaken' })
  }

  // Create Supabase auth user with a synthetic email (never shown to the user)
  const syntheticEmail = `${body.username}@app.internal`
  const { data, error: authError } = await supabase.auth.admin.createUser({
    email:          syntheticEmail,
    password:       body.password,
    email_confirm:  true,
  })

  if (authError || !data.user) {
    throw createError({ statusCode: 500, message: authError?.message ?? 'Failed to create user' })
  }

  // Create profile row
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({ id: data.user.id, username: body.username })

  if (profileError) {
    // Roll back auth user on profile failure
    await supabase.auth.admin.deleteUser(data.user.id)
    throw createError({ statusCode: 500, message: profileError.message })
  }

  return { success: true }
})
