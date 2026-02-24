import type { SendInvitationPayload } from '#types/app'

export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)
  const supabase = createSupabaseAdmin()
  const groupId = getRouterParam(event, 'id')

  if (!groupId) throw createError({ statusCode: 400, message: 'Group ID required' })

  const member = await requireGroupMember(groupId, userId)

  if (member.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Only admins can send invitations' })
  }

  const body = await readBody<SendInvitationPayload>(event)

  if (!body.username?.trim()) {
    throw createError({ statusCode: 400, message: 'Username is required' })
  }

  // Look up the invited user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', body.username.trim())
    .single()

  if (!profile) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  // Check invited user is not already a member
  const { data: existingMember } = await supabase
    .from('members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', profile.id)
    .single()

  if (existingMember) {
    throw createError({ statusCode: 409, message: 'User is already a member of this group' })
  }

  // Insert invitation (UNIQUE constraint handles duplicates)
  const { data, error } = await supabase
    .from('invitations')
    .insert({
      group_id:        groupId,
      invited_by:      userId,
      invited_user_id: profile.id,
      role:            body.role || 'user',
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw createError({ statusCode: 409, message: 'User already has a pending invitation' })
    }
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
