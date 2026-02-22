import type { UpdateGroupPayload } from '#types/app'

export default defineEventHandler(async (event) => {
  const supabase = createSupabaseAdmin()
  const id = getRouterParam(event, 'id')

  if (!id) throw createError({ statusCode: 400, message: 'Group ID required' })

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
    const { error } = await supabase.from('groups').delete().eq('id', id)
    if (error) throw createError({ statusCode: 500, message: error.message })
    return { success: true }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
