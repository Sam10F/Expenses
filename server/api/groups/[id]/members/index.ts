import type { AddMemberPayload } from '#types/app'

export default defineEventHandler(async (event) => {
  const supabase = createSupabaseAdmin()
  const groupId = getRouterParam(event, 'id')

  if (!groupId) throw createError({ statusCode: 400, message: 'Group ID required' })

  if (event.method === 'GET') {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })

    if (error) throw createError({ statusCode: 500, message: error.message })

    return data
  }

  if (event.method === 'POST') {
    const body = await readBody<AddMemberPayload>(event)

    if (!body.name?.trim()) {
      throw createError({ statusCode: 400, message: 'Member name is required' })
    }

    // Check member limit
    const { count } = await supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId)

    if ((count ?? 0) >= 10) {
      throw createError({ statusCode: 400, message: 'Maximum 10 members per group' })
    }

    const { data, error } = await supabase
      .from('members')
      .insert({ group_id: groupId, name: body.name.trim() })
      .select()
      .single()

    if (error) throw createError({ statusCode: 500, message: error.message })

    return data
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
