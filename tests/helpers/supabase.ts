import { createClient } from '@supabase/supabase-js'
import type { Page } from '@playwright/test'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error(
    'Missing Supabase credentials for tests. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env',
  )
}

export const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Auth helpers ──────────────────────────────────────────────────────────────

/**
 * Create a Supabase auth user + profile for testing.
 * Returns userId and a valid access token.
 */
export async function createTestUser(baseUsername = 'testuser'): Promise<{
  userId:   string
  username: string
  token:    string
}> {
  const suffix = String(Date.now() % 1000000)
  const base = baseUsername.slice(0, 20 - 1 - suffix.length)
  const username = `${base}_${suffix}` // max 20 chars (constraint limit)
  const email = `${username}@app.internal`
  const password = 'TestPassword123!'

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error || !data.user) throw new Error(`createTestUser: ${error?.message}`)
  const userId = data.user.id

  const { error: profileError } = await adminClient.from('profiles').insert({ id: userId, username })
  if (profileError) throw new Error(`createTestUser: profile insert failed — ${profileError.message}`)

  // Sign in to get a valid session token
  const anonClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: session, error: signInError } = await anonClient.auth.signInWithPassword({ email, password })
  if (signInError || !session.session) throw new Error(`createTestUser: sign in failed — ${signInError?.message}`)

  return { userId, username, token: session.session.access_token }
}

/**
 * Delete a test auth user and their profile.
 */
export async function deleteTestUser(userId: string) {
  await adminClient.auth.admin.deleteUser(userId)
}

/**
 * Register an init script that injects auth tokens into localStorage on every
 * subsequent page navigation. Call this BEFORE page.goto() so the auth store
 * picks up the tokens before the Nuxt plugin runs.
 */
export async function loginTestUser(
  page: Page,
  userId: string,
  username: string,
  token: string,
) {
  await page.addInitScript(({ t, u, uid }) => {
    localStorage.setItem('auth_token', t)
    localStorage.setItem('auth_refresh_token', '')
    localStorage.setItem('auth_user', JSON.stringify({ id: uid, username: u }))
  }, { t: token, u: username, uid: userId })
}

/**
 * Delete all test auth users whose usernames match known test patterns.
 */
export async function cleanupStaleTestUsers(): Promise<void> {
  const { data: profiles } = await adminClient
    .from('profiles')
    .select('id')
    .or([
      'username.ilike.testuser_%',
      'username.ilike.adminuser_%',
      'username.ilike.watcheruser_%',
      'username.ilike.settingsuser_%',
      'username.ilike.nonadmin_%',
    ].join(','))

  if (!profiles?.length) return

  for (const profile of profiles) {
    await adminClient.auth.admin.deleteUser(profile.id)
  }
}

// ── Group helpers ─────────────────────────────────────────────────────────────

/**
 * Create a test group with a default General category and an admin member row
 * linked to the given userId.
 */
export async function createTestGroup(
  name = 'Test Group',
  userId: string,
  options: { color?: string; username?: string } = {},
): Promise<{
  groupId:           string
  adminMemberId:     string
  defaultCategoryId: string
}> {
  const { data: group, error: groupErr } = await adminClient
    .from('groups')
    .insert({ name, color: options.color ?? 'indigo' })
    .select()
    .single()

  if (groupErr || !group) throw new Error(`createTestGroup: failed to create group — ${groupErr?.message}`)
  const groupId = group.id

  const { data: cat, error: catErr } = await adminClient
    .from('categories')
    .insert({ group_id: groupId, name: 'General', color: 'gray', icon: 'general', is_default: true })
    .select()
    .single()

  if (catErr || !cat) throw new Error(`createTestGroup: failed to create category — ${catErr?.message}`)

  const { data: member, error: memberErr } = await adminClient
    .from('members')
    .insert({
      group_id: groupId,
      user_id:  userId,
      name:     options.username ?? 'Test User',
      color:    'indigo',
      role:     'admin',
    })
    .select()
    .single()

  if (memberErr || !member) throw new Error(`createTestGroup: failed to create member — ${memberErr?.message}`)

  return { groupId, adminMemberId: member.id, defaultCategoryId: cat.id }
}

/**
 * Add a non-admin member to an existing test group (without user account).
 */
export async function addTestMember(
  groupId: string,
  name: string,
  role: 'admin' | 'user' | 'watcher' = 'user',
): Promise<string> {
  const { data, error } = await adminClient
    .from('members')
    .insert({ group_id: groupId, name, color: 'amber', role })
    .select()
    .single()

  if (error || !data) throw new Error(`addTestMember: ${error?.message}`)
  return data.id
}

/**
 * Add a member linked to a real auth user (for role-based access tests).
 */
export async function addTestMemberLinked(
  groupId: string,
  userId:  string,
  name:    string,
  role:    'admin' | 'user' | 'watcher' = 'user',
): Promise<string> {
  const { data, error } = await adminClient
    .from('members')
    .insert({ group_id: groupId, user_id: userId, name, color: 'sky', role })
    .select()
    .single()

  if (error || !data) throw new Error(`addTestMemberLinked: ${error?.message}`)
  return data.id
}

/**
 * Delete a group and all its data (cascade handles the rest).
 */
export async function deleteTestGroup(groupId: string) {
  await adminClient.from('groups').delete().eq('id', groupId)
}

/**
 * Delete all groups created by Playwright tests (by known name patterns).
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
      'name.eq.Test',
      'name.ilike.Alpha %',
      'name.ilike.Beta %',
      'name.ilike.Delete Test %',
      'name.ilike.Group Alpha%',
      'name.ilike.Group Beta%',
      'name.ilike.Color Test%',
      'name.ilike.Settings Test%',
      'name.ilike.Category Test%',
      'name.ilike.Pagination Test%',
      'name.ilike.Settlement %',
      'name.ilike.Show More %',
      'name.ilike.Solo Balance %',
      'name.ilike.Invitation Test%',
      'name.ilike.User Settings Test%',
    ].join(','))
}

// ── Expense helpers ───────────────────────────────────────────────────────────

/**
 * Create a test expense with equal splits among the given member IDs.
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

/**
 * Create multiple test expenses in bulk (for pagination tests).
 */
export async function createTestExpensesBulk(
  groupId:    string,
  paidById:   string,
  categoryId: string,
  memberIds:  string[],
  count:      number,
): Promise<void> {
  const today = new Date().toISOString().split('T')[0]!
  const amount = 10
  const splitAmount = Math.round((amount / memberIds.length) * 100) / 100

  const expensesToInsert = Array.from({ length: count }, (_, i) => ({
    group_id:    groupId,
    paid_by:     paidById,
    category_id: categoryId,
    title:       `Bulk Expense ${i + 1}`,
    amount,
    date:        today,
  }))

  const { data: expenses, error } = await adminClient
    .from('expenses')
    .insert(expensesToInsert)
    .select('id')

  if (error || !expenses) throw new Error(`createTestExpensesBulk: ${error?.message}`)

  const splits = expenses.flatMap(exp =>
    memberIds.map(memberId => ({
      expense_id:  exp.id,
      member_id:   memberId,
      amount:      splitAmount,
      is_included: true,
    })),
  )

  const { error: splitsError } = await adminClient.from('expense_splits').insert(splits)
  if (splitsError) throw new Error(`createTestExpensesBulk splits: ${splitsError.message}`)
}

/**
 * Create a test invitation directly in the DB (bypasses the invitation UI).
 */
export async function createTestInvitation(
  groupId:         string,
  invitedByUserId: string,
  invitedUserId:   string,
  role:            'user' | 'watcher' = 'user',
): Promise<string> {
  const { data, error } = await adminClient
    .from('invitations')
    .insert({ group_id: groupId, invited_by: invitedByUserId, invited_user_id: invitedUserId, role })
    .select('id')
    .single()

  if (error || !data) throw new Error(`createTestInvitation: ${error?.message}`)
  return data.id
}

/**
 * Create a custom (non-default) category for a group.
 */
export async function createTestCategory(
  groupId: string,
  options: { name?: string; color?: string; icon?: string } = {},
): Promise<string> {
  const { data, error } = await adminClient
    .from('categories')
    .insert({
      group_id:   groupId,
      name:       options.name ?? 'Test Category',
      color:      options.color ?? 'amber',
      icon:       options.icon ?? 'food',
      is_default: false,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(`createTestCategory: ${error?.message}`)
  return data.id
}
