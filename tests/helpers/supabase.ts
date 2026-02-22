import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error(
    'Missing Supabase credentials for tests. Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in .env',
  )
}

export const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

/**
 * Create a test group with members and a default category.
 * Returns the created group ID.
 */
export async function createTestGroup(name = 'Test Group', members = ['Alice', 'Bob']): Promise<{
  groupId:   string
  memberIds: Record<string, string>
  defaultCategoryId: string
}> {
  // Create group
  const { data: group, error: groupErr } = await adminClient
    .from('groups')
    .insert({ name, color: 'indigo' })
    .select()
    .single()

  if (groupErr || !group) throw new Error(`createTestGroup: failed to create group — ${groupErr?.message}`)
  const groupId = group.id

  // Create default category
  const { data: cat, error: catErr } = await adminClient
    .from('categories')
    .insert({ group_id: groupId, name: 'General', color: 'gray', icon: 'general', is_default: true })
    .select()
    .single()

  if (catErr || !cat) throw new Error(`createTestGroup: failed to create category — ${catErr?.message}`)

  // Create members
  const memberIds: Record<string, string> = {}
  for (const memberName of members) {
    const { data: m, error: memberErr } = await adminClient
      .from('members')
      .insert({ group_id: groupId, name: memberName })
      .select()
      .single()
    if (memberErr || !m) throw new Error(`createTestGroup: failed to create member '${memberName}' — ${memberErr?.message}`)
    memberIds[memberName] = m.id
  }

  return { groupId, memberIds, defaultCategoryId: cat.id }
}

/**
 * Delete a group and all its data (cascade handles the rest).
 */
export async function deleteTestGroup(groupId: string) {
  await adminClient.from('groups').delete().eq('id', groupId)
}

/**
 * Delete all groups created by Playwright tests (by known name patterns).
 * Safe to call before a test run to remove stale data from crashed/incomplete runs.
 */
export async function cleanupStaleTestGroups(): Promise<void> {
  await adminClient
    .from('groups')
    .delete()
    .or([
      'name.eq.Test Group',
      'name.eq.Balance Test Group',
      'name.eq.Member Test Group',
      'name.eq.Expense Test Group',
      'name.eq.Weekend Trip',
      'name.eq.Test',               // stale manual test groups
      'name.ilike.Alpha %',         // Alpha <timestamp>
      'name.ilike.Beta %',          // Beta <timestamp>
      'name.ilike.Delete Test %',   // delete-group test
      'name.ilike.Group Alpha%',    // old stale hardcoded names
      'name.ilike.Group Beta%',     // old stale hardcoded names
    ].join(','))
}

/**
 * Create a test expense with equal splits among all members.
 */
export async function createTestExpense(
  groupId:    string,
  paidById:   string,
  categoryId: string,
  memberIds:  string[],
  options: { title?: string; amount?: number; date?: string } = {},
) {
  const amount = options.amount ?? 10
  const splitAmount = Math.round((amount / memberIds.length) * 100) / 100

  const { data: expense, error: expErr } = await adminClient
    .from('expenses')
    .insert({
      group_id:    groupId,
      paid_by:     paidById,
      category_id: categoryId,
      title:       options.title ?? 'Test Expense',
      amount,
      date:        options.date ?? new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (expErr || !expense) throw new Error(`createTestExpense: failed to create expense — ${expErr?.message}`)

  const { error: splitsErr } = await adminClient.from('expense_splits').insert(
    memberIds.map(id => ({
      expense_id:  expense.id,
      member_id:   id,
      amount:      splitAmount,
      is_included: true,
    })),
  )

  if (splitsErr) throw new Error(`createTestExpense: failed to create splits — ${splitsErr.message}`)

  return expense
}
