import type { UpdateMemberRolePayload } from '#types/app'

export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)
  const supabase = createSupabaseAdmin()
  const groupId = getRouterParam(event, 'id')
  const memberId = getRouterParam(event, 'memberId')

  if (!groupId) throw createError({ statusCode: 400, message: 'Group ID required' })
  if (!memberId) throw createError({ statusCode: 400, message: 'Member ID required' })

  const currentMember = await requireGroupMember(groupId, userId)

  if (event.method === 'PUT') {
    const body = await readBody<{ name?: string; color?: string; role?: UpdateMemberRolePayload['role'] }>(event)

    // Role update: admin only, cannot change own role
    if (body.role !== undefined) {
      if (currentMember.role !== 'admin') {
        throw createError({ statusCode: 403, message: 'Only admins can change member roles' })
      }
      if (currentMember.id === memberId) {
        throw createError({ statusCode: 400, message: 'Cannot change your own role' })
      }
    }

    // Name/color update: own member or admin only
    if ((body.name !== undefined || body.color !== undefined) && currentMember.role !== 'admin' && currentMember.id !== memberId) {
      throw createError({ statusCode: 403, message: 'You can only edit your own member profile' })
    }

    const update: { name?: string; color?: string; role?: string } = {}
    if (body.name) update.name = body.name.trim()
    if (body.color) update.color = body.color
    if (body.role) update.role = body.role

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
    if (currentMember.role !== 'admin') {
      throw createError({ statusCode: 403, message: 'Only admins can remove members' })
    }
    if (currentMember.id === memberId) {
      throw createError({ statusCode: 400, message: 'Use "Leave group" to remove yourself' })
    }

    const { error } = await supabase.from('members').delete().eq('id', memberId)
    if (error) throw createError({ statusCode: 500, message: error.message })
    return { success: true }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
