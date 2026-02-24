export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)
  const supabase = createSupabaseAdmin()
  const groupId = getRouterParam(event, 'id')

  if (!groupId) throw createError({ statusCode: 400, message: 'Group ID required' })

  const member = await requireGroupMember(groupId, userId)

  if (member.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Only admins can view group invitations' })
  }

  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, message: error.message })

  // Enrich with invitee profile username
  const enriched = await Promise.all((data ?? []).map(async (inv) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', inv.invited_user_id)
      .single()

    return { ...inv, invitee: profile ? { username: profile.username } : null }
  }))

  return enriched
})
