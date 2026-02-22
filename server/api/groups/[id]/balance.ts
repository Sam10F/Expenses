import { calculateNetBalances, calculateSettlements } from '../../../../app/utils/balance'
import type { ExpenseWithDetails } from '#types/app'

export default defineEventHandler(async (event) => {
  const supabase = createSupabaseAdmin()
  const groupId = getRouterParam(event, 'id')

  if (!groupId) throw createError({ statusCode: 400, message: 'Group ID required' })

  // Fetch all members and expenses with splits
  const [membersResult, expensesResult] = await Promise.all([
    supabase.from('members').select('*').eq('group_id', groupId).order('created_at'),
    supabase
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
      .eq('group_id', groupId),
  ])

  if (membersResult.error) throw createError({ statusCode: 500, message: membersResult.error.message })
  if (expensesResult.error) throw createError({ statusCode: 500, message: expensesResult.error.message })

  const members = membersResult.data
  const expenses = expensesResult.data as ExpenseWithDetails[]

  const netBalances = calculateNetBalances(members, expenses)
  const settlements = calculateSettlements(members, netBalances)

  const memberBalances = members.map(m => ({
    ...m,
    balance: netBalances.get(m.id) ?? 0,
  }))

  return { memberBalances, settlements }
})
