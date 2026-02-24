import type { CreateGroupPayload } from '#types/app'

export default defineEventHandler(async (event) => {
  const supabase = createSupabaseAdmin()

  if (event.method === 'GET') {
    // Fetch all groups with member and expense counts
    const { data: groups, error } = await supabase
      .from('groups')
      .select(`
        *,
        members(id),
        expenses(id, amount)
      `)
      .order('created_at', { ascending: true })

    if (error) throw createError({ statusCode: 500, message: error.message })

    const result = groups.map(g => ({
      ...g,
      memberCount:  (g.members as { id: string }[]).length,
      expenseCount: (g.expenses as { id: string; amount: number }[]).length,
      totalAmount:  (g.expenses as { id: string; amount: number }[]).reduce((sum, e) => sum + e.amount, 0),
      members:      undefined,
      expenses:     undefined,
    }))

    return result
  }

  if (event.method === 'POST') {
    const body = await readBody<CreateGroupPayload>(event)

    if (!body.name?.trim()) {
      throw createError({ statusCode: 400, message: 'Group name is required' })
    }
    if (!body.members?.length) {
      throw createError({ statusCode: 400, message: 'At least one member is required' })
    }
    if (body.members.length > 10) {
      throw createError({ statusCode: 400, message: 'Maximum 10 members per group' })
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

    // Create members
    if (body.members.length > 0) {
      await supabase.from('members').insert(
        body.members
          .filter(m => m.name.trim())
          .map(m => ({ group_id: group.id, name: m.name.trim(), color: m.color || 'indigo' })),
      )
    }

    return group
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
