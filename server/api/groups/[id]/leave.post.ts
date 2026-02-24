export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)
  const supabase = createSupabaseAdmin()
  const groupId = getRouterParam(event, 'id')

  if (!groupId) throw createError({ statusCode: 400, message: 'Group ID required' })

  const member = await requireGroupMember(groupId, userId)

  // Check if last member
  const { count: memberCount } = await supabase
    .from('members')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', groupId)

  if ((memberCount ?? 0) <= 1) {
    throw createError({ statusCode: 400, message: 'You are the last member. Delete the group instead.' })
  }

  // If admin, check there is another admin
  if (member.role === 'admin') {
    const { count: otherAdminCount } = await supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('role', 'admin')
      .neq('id', member.id)

    if ((otherAdminCount ?? 0) === 0) {
      throw createError({ statusCode: 400, message: 'You are the only admin. Assign another admin before leaving.' })
    }
  }

  // Check balance is settled (compute from expense_splits)
  const { data: splits } = await supabase
    .from('expense_splits')
    .select('amount, is_included, expense:expenses!inner(paid_by, group_id)')
    .eq('member_id', member.id)
    .eq('expense.group_id', groupId)
    .eq('is_included', true)

  const { data: paidExpenses } = await supabase
    .from('expenses')
    .select('amount')
    .eq('group_id', groupId)
    .eq('paid_by', member.id)

  const totalPaid = (paidExpenses ?? []).reduce((sum, e) => sum + e.amount, 0)
  const totalOwed = (splits ?? []).reduce((sum, s) => sum + s.amount, 0)
  const balance = totalPaid - totalOwed

  if (Math.abs(Math.round(balance * 100)) > 1) {
    throw createError({ statusCode: 400, message: 'You have an outstanding balance. Settle up before leaving.' })
  }

  // Detach user from member row (preserves expense history)
  const { error } = await supabase
    .from('members')
    .update({ user_id: null })
    .eq('id', member.id)

  if (error) throw createError({ statusCode: 500, message: error.message })

  return { success: true }
})
