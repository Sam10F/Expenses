export default defineEventHandler(async (event) => {
  const { userId, username } = await requireAuth(event)
  const supabase = createSupabaseAdmin()
  const invId = getRouterParam(event, 'id')

  if (!invId) throw createError({ statusCode: 400, message: 'Invitation ID required' })

  // Verify invitation belongs to current user
  const { data: invitation } = await supabase
    .from('invitations')
    .select('*')
    .eq('id', invId)
    .eq('invited_user_id', userId)
    .single()

  if (!invitation) throw createError({ statusCode: 404, message: 'Invitation not found' })

  // Create member row
  const { error: memberError } = await supabase.from('members').insert({
    group_id: invitation.group_id,
    user_id:  userId,
    name:     username,
    color:    'indigo',
    role:     invitation.role,
  })

  if (memberError) throw createError({ statusCode: 500, message: memberError.message })

  // Delete invitation
  await supabase.from('invitations').delete().eq('id', invId)

  return { group_id: invitation.group_id }
})
