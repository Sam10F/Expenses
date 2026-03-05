import type { CreateRecurringExpensePayload } from '#types/app'

export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)
  const supabase = createSupabaseAdmin()
  const recId = getRouterParam(event, 'recId')
  const groupId = getRouterParam(event, 'id')

  if (!recId) throw createError({ statusCode: 400, message: 'Recurring expense ID required' })
  if (!groupId) throw createError({ statusCode: 400, message: 'Group ID required' })

  const member = await requireGroupMember(groupId, userId)

  // ---- PUT: update a recurring expense (admin only) ----
  if (event.method === 'PUT') {
    if (member.role !== 'admin') {
      throw createError({ statusCode: 403, message: 'Only admins can edit recurring expenses' })
    }

    // Verify the recurring expense belongs to this group
    const { data: existing } = await supabase
      .from('recurring_expenses')
      .select('group_id')
      .eq('id', recId)
      .single()

    if (existing?.group_id !== groupId) {
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }

    const body = await readBody<CreateRecurringExpensePayload>(event)

    if (!body.title?.trim()) {
      throw createError({ statusCode: 400, message: 'Title is required' })
    }
    if (!body.amount || body.amount <= 0) {
      throw createError({ statusCode: 400, message: 'Amount must be greater than 0' })
    }
    if (!body.paid_by) {
      throw createError({ statusCode: 400, message: 'Paid by member is required' })
    }
    if (!body.frequency || !['weekly', 'monthly'].includes(body.frequency)) {
      throw createError({ statusCode: 400, message: 'Frequency must be weekly or monthly' })
    }
    if (body.frequency === 'weekly' && (body.day_of_week == null || body.day_of_week < 0 || body.day_of_week > 6)) {
      throw createError({ statusCode: 400, message: 'Day of week must be between 0 and 6' })
    }
    if (body.frequency === 'monthly' && (body.day_of_month == null || body.day_of_month < 1 || body.day_of_month > 28)) {
      throw createError({ statusCode: 400, message: 'Day of month must be between 1 and 28' })
    }

    // Validate splits sum
    const includedSplits = body.splits.filter(s => s.is_included)
    const splitsTotal = includedSplits.reduce((sum, s) => sum + s.amount, 0)
    const roundedSplitsTotal = Math.round(splitsTotal * 100)
    const roundedExpenseAmount = Math.round(body.amount * 100)

    if (Math.abs(roundedSplitsTotal - roundedExpenseAmount) > 1) {
      throw createError({
        statusCode: 400,
        message: `Split amounts must equal expense amount`,
      })
    }

    const { data: updated, error: updateError } = await supabase
      .from('recurring_expenses')
      .update({
        title:        body.title.trim(),
        amount:       body.amount,
        paid_by:      body.paid_by,
        category_id:  body.category_id || null,
        frequency:    body.frequency,
        day_of_week:  body.frequency === 'weekly' ? body.day_of_week : null,
        day_of_month: body.frequency === 'monthly' ? body.day_of_month : null,
      })
      .eq('id', recId)
      .select()
      .single()

    if (updateError) throw createError({ statusCode: 500, message: updateError.message })

    // Replace splits
    await supabase.from('recurring_expense_splits').delete().eq('recurring_expense_id', recId)

    if (body.splits.length > 0) {
      const { error: splitError } = await supabase
        .from('recurring_expense_splits')
        .insert(
          body.splits.map(s => ({
            recurring_expense_id: recId,
            member_id:            s.member_id,
            amount:               s.amount,
            is_included:          s.is_included,
          })),
        )
      if (splitError) throw createError({ statusCode: 500, message: splitError.message })
    }

    return updated
  }

  // ---- DELETE: remove a recurring expense (admin only) ----
  if (event.method === 'DELETE') {
    if (member.role !== 'admin') {
      throw createError({ statusCode: 403, message: 'Only admins can delete recurring expenses' })
    }

    const { data: toDelete } = await supabase
      .from('recurring_expenses')
      .select('group_id')
      .eq('id', recId)
      .single()

    if (toDelete?.group_id !== groupId) {
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }

    const { error } = await supabase.from('recurring_expenses').delete().eq('id', recId)
    if (error) throw createError({ statusCode: 500, message: error.message })

    return { success: true }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
