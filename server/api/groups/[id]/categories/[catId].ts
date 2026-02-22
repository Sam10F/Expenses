export default defineEventHandler(async (event) => {
  const supabase = createSupabaseAdmin()
  const catId = getRouterParam(event, 'catId')

  if (!catId) throw createError({ statusCode: 400, message: 'Category ID required' })

  // Prevent modifying the default category
  const { data: cat } = await supabase
    .from('categories')
    .select('is_default')
    .eq('id', catId)
    .single()

  if (cat?.is_default) {
    throw createError({ statusCode: 403, message: 'Cannot modify the default category' })
  }

  if (event.method === 'PUT') {
    const body = await readBody<{ name?: string; color?: string; icon?: string }>(event)

    const { data, error } = await supabase
      .from('categories')
      .update({
        ...(body.name  ? { name: body.name.trim() } : {}),
        ...(body.color ? { color: body.color }       : {}),
        ...(body.icon  ? { icon: body.icon }         : {}),
      })
      .eq('id', catId)
      .select()
      .single()

    if (error) throw createError({ statusCode: 500, message: error.message })

    return data
  }

  if (event.method === 'DELETE') {
    const { error } = await supabase.from('categories').delete().eq('id', catId)
    if (error) throw createError({ statusCode: 500, message: error.message })
    return { success: true }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
