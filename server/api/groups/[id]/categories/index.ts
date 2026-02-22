import type { CreateCategoryPayload } from '#types/app'

export default defineEventHandler(async (event) => {
  const supabase = createSupabaseAdmin()
  const groupId = getRouterParam(event, 'id')

  if (!groupId) throw createError({ statusCode: 400, message: 'Group ID required' })

  if (event.method === 'GET') {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('group_id', groupId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) throw createError({ statusCode: 500, message: error.message })

    return data
  }

  if (event.method === 'POST') {
    const body = await readBody<CreateCategoryPayload>(event)

    if (!body.name?.trim()) {
      throw createError({ statusCode: 400, message: 'Category name is required' })
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({
        group_id: groupId,
        name:     body.name.trim(),
        color:    body.color || 'indigo',
        icon:     body.icon  || 'general',
      })
      .select()
      .single()

    if (error) throw createError({ statusCode: 500, message: error.message })

    return data
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
