import type { UpdateExpensePayload } from '#types/app'

export default defineEventHandler(async (event) => {
  const supabase = createSupabaseAdmin()
  const expId = getRouterParam(event, 'expId')
  const groupId = getRouterParam(event, 'id')

  if (!expId) throw createError({ statusCode: 400, message: 'Expense ID required' })

  if (event.method === 'GET') {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        paidByMember:members!paid_by(*),
        category:categories(*),
        splits:expense_splits(
          *,
          member:members(*)
        )
      `)
      .eq('id', expId)
      .single()

    if (error) throw createError({ statusCode: 404, message: 'Expense not found' })

    return data
  }

  if (event.method === 'PUT') {
    const body = await readBody<UpdateExpensePayload>(event)

    if (!body.title?.trim()) {
      throw createError({ statusCode: 400, message: 'Title is required' })
    }
    if (!body.amount || body.amount <= 0) {
      throw createError({ statusCode: 400, message: 'Amount must be greater than 0' })
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

    // Update expense
    const { data: expense, error: expError } = await supabase
      .from('expenses')
      .update({
        paid_by:     body.paid_by,
        category_id: body.category_id || null,
        title:       body.title.trim(),
        amount:      body.amount,
        date:        body.date,
        updated_at:  new Date().toISOString(),
      })
      .eq('id', expId)
      .select()
      .single()

    if (expError) throw createError({ statusCode: 500, message: expError.message })

    // Replace splits
    await supabase.from('expense_splits').delete().eq('expense_id', expId)

    if (body.splits.length > 0) {
      await supabase.from('expense_splits').insert(
        body.splits.map(s => ({
          expense_id:  expId,
          member_id:   s.member_id,
          amount:      s.amount,
          is_included: s.is_included,
        })),
      )
    }

    return expense
  }

  if (event.method === 'DELETE') {
    // Check expense belongs to the group
    const { data: exp } = await supabase
      .from('expenses')
      .select('group_id')
      .eq('id', expId)
      .single()

    if (exp?.group_id !== groupId) {
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }

    const { error } = await supabase.from('expenses').delete().eq('id', expId)
    if (error) throw createError({ statusCode: 500, message: error.message })

    return { success: true }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
