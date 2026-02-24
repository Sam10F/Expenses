export default defineEventHandler(async (event) => {
  const supabase = createSupabaseAdmin()
  const memberId = getRouterParam(event, 'memberId')

  if (!memberId) throw createError({ statusCode: 400, message: 'Member ID required' })

  if (event.method === 'PUT') {
    const body = await readBody<{ name: string; color?: string }>(event)

    if (!body.name?.trim()) {
      throw createError({ statusCode: 400, message: 'Member name is required' })
    }

    const update: { name: string; color?: string } = { name: body.name.trim() }
    if (body.color) update.color = body.color

    const { data, error } = await supabase
      .from('members')
      .update(update)
      .eq('id', memberId)
      .select()
      .single()

    if (error) throw createError({ statusCode: 500, message: error.message })

    return data
  }

  if (event.method === 'DELETE') {
    const { error } = await supabase.from('members').delete().eq('id', memberId)
    if (error) throw createError({ statusCode: 500, message: error.message })
    return { success: true }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
