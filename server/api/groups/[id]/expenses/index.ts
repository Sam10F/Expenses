import type { CreateExpensePayload } from '#types/app'

const PAGE_SIZE = 50

export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)
  const supabase = createSupabaseAdmin()
  const groupId = getRouterParam(event, 'id')

  if (!groupId) throw createError({ statusCode: 400, message: 'Group ID required' })

  const member = await requireGroupMember(groupId, userId)

  if (event.method === 'GET') {
    const query = getQuery(event)
    const page = Number(query.page ?? 0)

    const { data, error, count } = await supabase
      .from('expenses')
      .select(`
        *,
        paidByMember:members!paid_by(*),
        category:categories(*),
        splits:expense_splits(
          *,
          member:members(*)
        )
      `, { count: 'exact' })
      .eq('group_id', groupId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (error) throw createError({ statusCode: 500, message: error.message })

    return { data, total: count ?? 0, page, pageSize: PAGE_SIZE }
  }

  if (event.method === 'POST') {
    if (member.role === 'watcher') {
      throw createError({ statusCode: 403, message: 'Watchers cannot create expenses' })
    }

    const body = await readBody<CreateExpensePayload>(event)

    if (!body.title?.trim()) {
      throw createError({ statusCode: 400, message: 'Title is required' })
    }
    if (!body.amount || body.amount <= 0) {
      throw createError({ statusCode: 400, message: 'Amount must be greater than 0' })
    }
    if (!body.date) {
      throw createError({ statusCode: 400, message: 'Date is required' })
    }
    if (!body.paid_by) {
      throw createError({ statusCode: 400, message: 'Paid by member is required' })
    }

    // Validate splits sum
    const includedSplits = body.splits.filter(s => s.is_included)
    const splitsTotal = includedSplits.reduce((sum, s) => sum + s.amount, 0)
    const roundedSplitsTotal = Math.round(splitsTotal * 100)
    const roundedExpenseAmount = Math.round(body.amount * 100)

    if (Math.abs(roundedSplitsTotal - roundedExpenseAmount) > 1) {
      throw createError({
        statusCode: 400,
        message: `Split amounts (${(splitsTotal).toFixed(2)}) must equal expense amount (${body.amount.toFixed(2)})`,
      })
    }

    // Resolve default category
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

    // Create expense
    const { data: expense, error: expError } = await supabase
      .from('expenses')
      .insert({
        group_id:    groupId,
        paid_by:     body.paid_by,
        category_id: categoryId || null,
        title:       body.title.trim(),
        amount:      body.amount,
        date:        body.date,
        created_by:  userId,
      })
      .select()
      .single()

    if (expError) throw createError({ statusCode: 500, message: expError.message })

    // Create splits
    if (body.splits.length > 0) {
      const { error: splitError } = await supabase.from('expense_splits').insert(
        body.splits.map(s => ({
          expense_id:  expense.id,
          member_id:   s.member_id,
          amount:      s.amount,
          is_included: s.is_included,
        })),
      )
      if (splitError) throw createError({ statusCode: 500, message: splitError.message })
    }

    return expense
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
