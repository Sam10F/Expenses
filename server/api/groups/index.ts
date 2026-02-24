import type { CreateGroupPayload } from '#types/app'

export default defineEventHandler(async (event) => {
  const { userId, username } = await requireAuth(event)
  const supabase = createSupabaseAdmin()

  if (event.method === 'GET') {
    // Return only groups where the current user is a member
    const { data: memberRows, error: memberErr } = await supabase
      .from('members')
      .select('group_id')
      .eq('user_id', userId)

    if (memberErr) throw createError({ statusCode: 500, message: memberErr.message })

    const groupIds = (memberRows ?? []).map(m => m.group_id).filter(Boolean) as string[]

    if (groupIds.length === 0) return []

    const { data: groups, error } = await supabase
      .from('groups')
      .select(`
        *,
        members(id),
        expenses(id, amount)
      `)
      .in('id', groupIds)
      .order('created_at', { ascending: true })

    if (error) throw createError({ statusCode: 500, message: error.message })

    return groups.map(g => ({
      ...g,
      memberCount:  (g.members as { id: string }[]).length,
      expenseCount: (g.expenses as { id: string; amount: number }[]).length,
      totalAmount:  (g.expenses as { id: string; amount: number }[]).reduce((sum, e) => sum + e.amount, 0),
      members:      undefined,
      expenses:     undefined,
    }))
  }

  if (event.method === 'POST') {
    const body = await readBody<CreateGroupPayload>(event)

    if (!body.name?.trim()) {
      throw createError({ statusCode: 400, message: 'Group name is required' })
    }

    // Create group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name:        body.name.trim(),
        description: body.description?.trim() || null,
        color:       body.color || 'indigo',
      })
      .select()
      .single()

    if (groupError) throw createError({ statusCode: 500, message: groupError.message })

    // Create default "General" category
    await supabase.from('categories').insert({
      group_id:   group.id,
      name:       'General',
      color:      'gray',
      icon:       'general',
      is_default: true,
    })

    // Create the creator as the sole admin member
    await supabase.from('members').insert({
      group_id: group.id,
      user_id:  userId,
      name:     username,
      color:    'indigo',
      role:     'admin',
    })

    return group
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
