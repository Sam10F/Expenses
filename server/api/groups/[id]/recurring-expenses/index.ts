import type { CreateRecurringExpensePayload } from '#types/app'

export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)
  const supabase = createSupabaseAdmin()
  const groupId = getRouterParam(event, 'id')

  if (!groupId) throw createError({ statusCode: 400, message: 'Group ID required' })

  const member = await requireGroupMember(groupId, userId)

  // ---- GET: list all recurring expenses for this group ----
  if (event.method === 'GET') {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .select(`
        *,
        paidByMember:members!paid_by(*),
        category:categories(*),
        splits:recurring_expense_splits(
          *,
          member:members(*)
        )
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    if (error) throw createError({ statusCode: 500, message: error.message })

    return data
  }

  // ---- POST: create a recurring expense (admin only) ----
  if (event.method === 'POST') {
    if (member.role !== 'admin') {
      throw createError({ statusCode: 403, message: 'Only admins can create recurring expenses' })
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
        message: `Split amounts (${splitsTotal.toFixed(2)}) must equal expense amount (${body.amount.toFixed(2)})`,
      })
    }

    // Resolve default category if none supplied
    let categoryId = body.category_id
    if (!categoryId) {
      const { data: defaultCat } = await supabase
        .from('categories')
        .select('id')
        .eq('group_id', groupId)
        .eq('is_default', true)
        .single()
      categoryId = defaultCat?.id ?? ''
    }

    const { data: recurring, error: recError } = await supabase
      .from('recurring_expenses')
      .insert({
        group_id:     groupId,
        created_by:   userId,
        title:        body.title.trim(),
        amount:       body.amount,
        paid_by:      body.paid_by,
        category_id:  categoryId || null,
        frequency:    body.frequency,
        day_of_week:  body.frequency === 'weekly' ? body.day_of_week : null,
        day_of_month: body.frequency === 'monthly' ? body.day_of_month : null,
        is_active:    true,
      })
      .select()
      .single()

    if (recError) throw createError({ statusCode: 500, message: recError.message })

    if (body.splits.length > 0) {
      const { error: splitError } = await supabase
        .from('recurring_expense_splits')
        .insert(
          body.splits.map(s => ({
            recurring_expense_id: recurring.id,
            member_id:            s.member_id,
            amount:               s.amount,
            is_included:          s.is_included,
          })),
        )
      if (splitError) throw createError({ statusCode: 500, message: splitError.message })
    }

    // Return enriched row
    const { data: enriched, error: fetchError } = await supabase
      .from('recurring_expenses')
      .select(`
        *,
        paidByMember:members!paid_by(*),
        category:categories(*),
        splits:recurring_expense_splits(
          *,
          member:members(*)
        )
      `)
      .eq('id', recurring.id)
      .single()

    if (fetchError) throw createError({ statusCode: 500, message: fetchError.message })

    return enriched
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
