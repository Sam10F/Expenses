export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)
  const supabase = createSupabaseAdmin()

  const { data, error } = await supabase
    .from('invitations')
    .select(`
      *,
      group:groups(id, name, description, color)
    `)
    .eq('invited_user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, message: error.message })

  // Enrich with member count and inviter username
  const enriched = await Promise.all((data ?? []).map(async (inv) => {
    const { count } = await supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', inv.group_id)

    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', inv.invited_by)
      .single()

    return {
      ...inv,
      memberCount: count ?? 0,
      inviter: inviterProfile ? { username: inviterProfile.username } : null,
    }
  }))

  return enriched
})
