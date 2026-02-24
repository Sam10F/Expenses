export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)
  const supabase = createSupabaseAdmin()
  const invId = getRouterParam(event, 'id')

  if (!invId) throw createError({ statusCode: 400, message: 'Invitation ID required' })

  // Verify invitation belongs to current user
  const { data: invitation } = await supabase
    .from('invitations')
    .select('id')
    .eq('id', invId)
    .eq('invited_user_id', userId)
    .single()

  if (!invitation) throw createError({ statusCode: 404, message: 'Invitation not found' })

  const { error } = await supabase.from('invitations').delete().eq('id', invId)

  if (error) throw createError({ statusCode: 500, message: error.message })

  return { success: true }
})
