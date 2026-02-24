import type { UpdateGroupPayload } from '#types/app'

export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)
  const supabase = createSupabaseAdmin()
  const id = getRouterParam(event, 'id')

  if (!id) throw createError({ statusCode: 400, message: 'Group ID required' })

  const member = await requireGroupMember(id, userId)

  if (event.method === 'GET') {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw createError({ statusCode: 404, message: 'Group not found' })

    return data
  }

  if (event.method === 'PUT') {
    if (member.role !== 'admin') {
      throw createError({ statusCode: 403, message: 'Only admins can update group settings' })
    }

    const body = await readBody<UpdateGroupPayload>(event)

    const { data, error } = await supabase
      .from('groups')
      .update({
        ...(body.name        !== undefined ? { name: body.name.trim() }               : {}),
        ...(body.description !== undefined ? { description: body.description?.trim() } : {}),
        ...(body.color       !== undefined ? { color: body.color }                    : {}),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw createError({ statusCode: 500, message: error.message })

    return data
  }

  if (event.method === 'DELETE') {
    if (member.role !== 'admin') {
      throw createError({ statusCode: 403, message: 'Only admins can delete groups' })
    }

    const { error } = await supabase.from('groups').delete().eq('id', id)
    if (error) throw createError({ statusCode: 500, message: error.message })
    return { success: true }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
