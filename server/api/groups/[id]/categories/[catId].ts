export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)
  const supabase = createSupabaseAdmin()
  const groupId = getRouterParam(event, 'id')
  const catId = getRouterParam(event, 'catId')

  if (!groupId) throw createError({ statusCode: 400, message: 'Group ID required' })
  if (!catId) throw createError({ statusCode: 400, message: 'Category ID required' })

  const member = await requireGroupMember(groupId, userId)

  if (member.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Only admins can modify categories' })
  }

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
    // Reassign expenses in this category to the group's default (General) category
    const { data: defaultCat, error: defaultCatError } = await supabase
      .from('categories')
      .select('id')
      .eq('group_id', groupId)
      .eq('is_default', true)
      .single()

    if (defaultCatError || !defaultCat) {
      throw createError({ statusCode: 500, message: 'Could not find default category' })
    }

    const { error: updateError } = await supabase
      .from('expenses')
      .update({ category_id: defaultCat.id })
      .eq('category_id', catId)

    if (updateError) throw createError({ statusCode: 500, message: updateError.message })

    const { error } = await supabase.from('categories').delete().eq('id', catId)
    if (error) throw createError({ statusCode: 500, message: error.message })
    return { success: true }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
