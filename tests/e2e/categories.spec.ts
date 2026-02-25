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
  createTestExpense,
  createTestCategory,
} from '../helpers/supabase'

test.describe('Categories', () => {
  let userId: string
  let username: string
  let token: string
  let groupId: string
  let adminMemberId: string
  let bobId: string
  let defaultCategoryId: string

  test.beforeAll(async () => {
    ;({ userId, username, token } = await createTestUser())
  })

  test.afterAll(async () => {
    await deleteTestUser(userId)
  })

  test.beforeEach(async ({ page }) => {
    const result = await createTestGroup('Category Test Group', userId, { username: 'Alice' })
    groupId = result.groupId
    adminMemberId = result.adminMemberId
    defaultCategoryId = result.defaultCategoryId
    bobId = await addTestMember(groupId, 'Bob')
    await loginTestUser(page, userId, username, token)
  })

  test.afterEach(async () => {
    await deleteTestGroup(groupId)
  })

  test('add category via modal (happy path) @a11y', async ({ page }) => {
    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /add category/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: /add category/i })).toBeVisible()

    await dialog.getByLabel(/name/i).fill('Groceries')

    const amberSwatch = dialog.getByRole('button', { name: 'amber' })
    await amberSwatch.click()
    await expect(amberSwatch).toHaveAttribute('aria-pressed', 'true')

    const foodIconBtn = dialog.getByRole('button', { name: /food/i })
    await foodIconBtn.click()
    await expect(foodIconBtn).toHaveAttribute('aria-pressed', 'true')

    await dialog.getByRole('button', { name: /create category/i }).click()

    await expect(dialog).not.toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    const violations = results.violations.filter(v =>
      v.impact === 'critical' || v.impact === 'serious',
    )
    expect(violations, `a11y violations: ${JSON.stringify(violations.map(v => v.id))}`).toHaveLength(0)
  })

  test('add category - name required validation', async ({ page }) => {
    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /add category/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByRole('button', { name: /create category/i }).click()

    await expect(dialog.getByRole('alert')).toBeVisible()
    await expect(dialog).toBeVisible()
  })

  test('"No spending yet" shown in By Category when group has no expenses', async ({ page }) => {
    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/no spending yet/i)).toBeVisible()
  })

  test('By Category section shows category totals after expenses are added', async ({ page }) => {
    await createTestExpense(
      groupId,
      adminMemberId,
      defaultCategoryId,
      [adminMemberId, bobId],
      { title: 'Supermarket', amount: 40 },
    )

    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('General')).toBeVisible()
    await expect(page.locator('.legend-amount').filter({ hasText: '€40.00' })).toBeVisible()
    await expect(page.locator('.legend-pct').filter({ hasText: '100%' })).toBeVisible()
  })

  test('By Category section shows multiple categories with correct percentages', async ({ page }) => {
    const transportCatId = await createTestCategory(groupId, { name: 'Transport', color: 'sky', icon: 'transport' })

    await createTestExpense(
      groupId,
      adminMemberId,
      defaultCategoryId,
      [adminMemberId, bobId],
      { title: 'Supermarket', amount: 60 },
    )
    await createTestExpense(
      groupId,
      bobId,
      transportCatId,
      [adminMemberId, bobId],
      { title: 'Taxi', amount: 40 },
    )

    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('.legend-name').filter({ hasText: 'General' })).toBeVisible()
    await expect(page.locator('.legend-name').filter({ hasText: 'Transport' })).toBeVisible()
    await expect(page.locator('.legend-pct').filter({ hasText: '60%' })).toBeVisible()
    await expect(page.locator('.legend-pct').filter({ hasText: '40%' })).toBeVisible()
  })

  test('custom category appears as chip in expense modal', async ({ page }) => {
    await createTestCategory(groupId, { name: 'Entertainment', color: 'violet', icon: 'entertainment' })

    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /add expense/i }).click()

    const dialog = page.getByRole('dialog')

    await expect(dialog.getByRole('button', { name: 'General' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Entertainment' })).toBeVisible()
  })

  test('General category chip is pre-selected by default in expense modal', async ({ page }) => {
    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /add expense/i }).click()

    const dialog = page.getByRole('dialog')
    const generalChip = dialog.getByRole('button', { name: 'General' })

    await expect(generalChip).toHaveAttribute('aria-pressed', 'true')
  })

  test('admin sees "Add category" button on dashboard', async ({ page }) => {
    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('button', { name: /add category/i })).toBeVisible()
  })

  test('non-admin member does not see "Add category" button on dashboard', async ({ page }) => {
    // Create a second user to act as a non-admin member
    const { userId: userId2, username: username2, token: token2 } = await createTestUser('nonadmin')
    const memberId2 = await addTestMemberLinked(groupId, userId2, 'NonAdmin')

    await loginTestUser(page, userId2, username2, token2)
    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('button', { name: /add category/i })).not.toBeVisible()

    // Cleanup
    await deleteTestUser(userId2)
  })
})
