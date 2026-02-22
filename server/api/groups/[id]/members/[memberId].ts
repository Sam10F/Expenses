export default defineEventHandler(async (event) => {
  const supabase = createSupabaseAdmin()
  const memberId = getRouterParam(event, 'memberId')

  if (!memberId) throw createError({ statusCode: 400, message: 'Member ID required' })

  if (event.method === 'PUT') {
    const body = await readBody<{ name: string }>(event)

    if (!body.name?.trim()) {
      throw createError({ statusCode: 400, message: 'Member name is required' })
    }

    const { data, error } = await supabase
      .from('members')
      .update({ name: body.name.trim() })
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
