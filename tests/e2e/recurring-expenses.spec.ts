import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {
  createTestUser,
  deleteTestUser,
  loginTestUser,
  createTestGroup,
  addTestMember,
  addTestMemberLinked,
  deleteTestGroup,
  createTestRecurringExpense,
} from '../helpers/supabase'

test.describe('Recurring Expenses', () => {
  let userId: string
  let username: string
  let token: string
  let groupId: string
  let adminMemberId: string
  let defaultCategoryId: string

  test.beforeAll(async () => {
    ; ({ userId, username, token } = await createTestUser())
  })

  test.afterAll(async () => {
    await deleteTestUser(userId)
  })

  test.beforeEach(async ({ page }) => {
    const result = await createTestGroup('Recurring Test Group', userId, { username: 'Alice' })
    groupId           = result.groupId
    adminMemberId     = result.adminMemberId
    defaultCategoryId = result.defaultCategoryId
    await addTestMember(groupId, 'Bob')
    await loginTestUser(page, userId, username, token)
  })

  test.afterEach(async () => {
    await deleteTestGroup(groupId)
  })

  // ── Section visibility ──────────────────────────────────────────────────────

  test('recurring expenses section is visible on settings page', async ({ page }) => {
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /recurring expenses/i })).toBeVisible()
  })

  test('empty state is shown when no recurring expenses exist', async ({ page }) => {
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/no recurring expenses/i)).toBeVisible()
  })

  test('admin sees add recurring expense button', async ({ page }) => {
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('button', { name: /add recurring expense/i })).toBeVisible()
  })

  // ── Adding ──────────────────────────────────────────────────────────────────

  test('admin can add a monthly recurring expense', async ({ page }) => {
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /add recurring expense/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByLabel(/title/i).fill('Monthly Rent')
    await dialog.getByLabel(/amount/i).fill('800')
    // Frequency defaults to Monthly — leave as-is
    // Day of month — select 15
    await dialog.getByLabel(/day of month/i).selectOption('15')

    await dialog.getByRole('button', { name: /save expense/i }).click()

    await expect(dialog).not.toBeVisible()
    await expect(page.getByText('Monthly Rent')).toBeVisible()
    await expect(page.getByText(/monthly on the 15/i)).toBeVisible()
  })

  test('admin can add a weekly recurring expense', async ({ page }) => {
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /add recurring expense/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByLabel(/title/i).fill('Weekly Groceries')
    await dialog.getByLabel(/amount/i).fill('120')
    await dialog.getByLabel(/frequency/i).selectOption('Weekly')
    await dialog.getByLabel(/day of week/i).selectOption('Monday')

    await dialog.getByRole('button', { name: /save expense/i }).click()

    await expect(dialog).not.toBeVisible()
    await expect(page.getByText('Weekly Groceries')).toBeVisible()
    await expect(page.getByText(/every monday/i)).toBeVisible()
  })

  test('add form validates required fields', async ({ page }) => {
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /add recurring expense/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Submit without filling anything
    await dialog.getByRole('button', { name: /save expense/i }).click()

    // Should show at least one validation error
    await expect(dialog.getByRole('alert').first()).toBeVisible()
  })

  // ── Editing ─────────────────────────────────────────────────────────────────

  test('admin can edit a recurring expense', async ({ page }) => {
    await createTestRecurringExpense(
      groupId,
      adminMemberId,
      defaultCategoryId,
      [adminMemberId],
      { title: 'Old Title', frequency: 'monthly', day_of_month: 5 },
    )

    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Old Title')).toBeVisible()

    await page.getByRole('button', { name: /edit old title/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const titleInput = dialog.getByLabel(/title/i)
    await titleInput.clear()
    await titleInput.fill('New Title')

    await dialog.getByRole('button', { name: /save expense/i }).click()

    await expect(dialog).not.toBeVisible()
    await expect(page.getByText('New Title')).toBeVisible()
    await expect(page.getByText('Old Title')).not.toBeVisible()
  })

  test('edit modal pre-fills with existing data', async ({ page }) => {
    await createTestRecurringExpense(
      groupId,
      adminMemberId,
      defaultCategoryId,
      [adminMemberId],
      { title: 'Prefill Test', amount: 99, frequency: 'monthly', day_of_month: 10 },
    )

    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /edit prefill test/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await expect(dialog.getByLabel(/title/i)).toHaveValue('Prefill Test')
    await expect(dialog.getByLabel(/amount/i)).toHaveValue('99')
    await expect(dialog.getByLabel(/day of month/i)).toHaveValue('10')
  })

  // ── Deleting ─────────────────────────────────────────────────────────────────

  test('admin can delete a recurring expense', async ({ page }) => {
    await createTestRecurringExpense(
      groupId,
      adminMemberId,
      defaultCategoryId,
      [adminMemberId],
      { title: 'To Delete', frequency: 'monthly', day_of_month: 1 },
    )

    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('To Delete')).toBeVisible()

    page.once('dialog', dialog => dialog.accept())
    await page.getByRole('button', { name: /delete to delete/i }).click()

    await expect(page.getByText('To Delete')).not.toBeVisible()
    await expect(page.getByText(/no recurring expenses/i)).toBeVisible()
  })

  // ── Role restrictions ────────────────────────────────────────────────────────

  test('non-admin member cannot see add recurring expense button', async ({ page }) => {
    // Create a second user with non-admin role
    const { userId: userId2, username: username2, token: token2 } = await createTestUser('nonadmin')
    await addTestMemberLinked(groupId, userId2, username2, 'user')

    await loginTestUser(page, userId2, username2, token2)
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /recurring expenses/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /add recurring expense/i })).not.toBeVisible()

    await deleteTestUser(userId2)
  })

  test('non-admin can view recurring expenses but not edit', async ({ page }) => {
    await createTestRecurringExpense(
      groupId,
      adminMemberId,
      defaultCategoryId,
      [adminMemberId],
      { title: 'View Only', frequency: 'monthly', day_of_month: 1 },
    )

    const { userId: userId2, username: username2, token: token2 } = await createTestUser('nonadmin')
    await addTestMemberLinked(groupId, userId2, username2, 'user')

    await loginTestUser(page, userId2, username2, token2)
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('View Only')).toBeVisible()
    await expect(page.getByRole('button', { name: /edit view only/i })).not.toBeVisible()
    await expect(page.getByRole('button', { name: /delete view only/i })).not.toBeVisible()

    await deleteTestUser(userId2)
  })

  // ── Section order ────────────────────────────────────────────────────────────

  test('recurring expenses section appears between categories and invitations', async ({ page }) => {
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    const headings = await page.getByRole('heading').allTextContents()
    const categoriesIdx  = headings.findIndex(h => /category/i.test(h))
    const recurringIdx   = headings.findIndex(h => /recurring expenses/i.test(h))
    const invitationsIdx = headings.findIndex(h => /invitations/i.test(h))

    expect(categoriesIdx).toBeGreaterThanOrEqual(0)
    expect(recurringIdx).toBeGreaterThan(categoriesIdx)
    expect(invitationsIdx).toBeGreaterThan(recurringIdx)
  })

  // ── Accessibility ────────────────────────────────────────────────────────────

  test('settings page with recurring expenses has no critical a11y violations @a11y', async ({ page }) => {
    await createTestRecurringExpense(
      groupId,
      adminMemberId,
      defaultCategoryId,
      [adminMemberId],
      { title: 'A11y Test', frequency: 'weekly', day_of_week: 3 },
    )

    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page }).analyze()
    const violations = results.violations.filter(v =>
      v.impact === 'critical' || v.impact === 'serious',
    )
    expect(violations, `a11y violations: ${JSON.stringify(violations.map(v => v.id))}`).toHaveLength(0)
  })

  test('recurring expense modal has no critical a11y violations @a11y', async ({ page }) => {
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /add recurring expense/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    const violations = results.violations.filter(v =>
      v.impact === 'critical' || v.impact === 'serious',
    )
    expect(violations, `a11y violations: ${JSON.stringify(violations.map(v => v.id))}`).toHaveLength(0)
  })
})
