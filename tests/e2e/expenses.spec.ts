import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {
  createTestUser,
  deleteTestUser,
  loginTestUser,
  createTestGroup,
  addTestMember,
  deleteTestGroup,
  createTestExpense,
  createTestExpensesBulk,
  createTestCategory,
} from '../helpers/supabase'

test.describe('Expenses', () => {
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
    const result = await createTestGroup('Expense Test Group', userId, { username: 'Alice' })
    groupId = result.groupId
    adminMemberId = result.adminMemberId
    defaultCategoryId = result.defaultCategoryId
    bobId = await addTestMember(groupId, 'Bob')
    await loginTestUser(page, userId, username, token)
  })

  test.afterEach(async () => {
    await deleteTestGroup(groupId)
  })

  test('empty expense list state', async ({ page }) => {
    await page.goto(`/groups/${groupId}/expenses`)
    await expect(page.getByText(/no expenses yet/i)).toBeVisible()
  })

  test('add expense (equal split) @a11y', async ({ page }) => {
    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /add expense/i }).click()

    await page.getByLabel(/title/i).fill('Dinner')
    await page.getByLabel(/amount/i).fill('30')

    await page.getByRole('button', { name: /save expense/i }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible()

    await page.goto(`/groups/${groupId}/expenses`)
    await expect(page.getByText('Dinner')).toBeVisible()
    await expect(page.getByText('€30.00')).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    const violations = results.violations.filter(v =>
      v.impact === 'critical' || v.impact === 'serious',
    )
    expect(violations, `a11y violations: ${JSON.stringify(violations.map(v => v.id))}`).toHaveLength(0)
  })

  test('add expense with custom split - validation error when amounts do not sum to total', async ({ page }) => {
    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /add expense/i }).click()

    await page.getByLabel(/title/i).fill('Hotel')
    await page.getByLabel(/amount/i).fill('30')

    await page.getByRole('checkbox', { name: /custom split/i }).check()

    await page.getByRole('spinbutton', { name: /alice amount/i }).fill('20')
    await page.getByRole('spinbutton', { name: /bob amount/i }).fill('20')

    await page.getByRole('button', { name: /save expense/i }).click()

    await expect(page.getByRole('alert')).toContainText(/€30\.00/i)
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('add expense with custom split - succeeds when amounts sum to total', async ({ page }) => {
    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /add expense/i }).click()

    await page.getByLabel(/title/i).fill('Hotel')
    await page.getByLabel(/amount/i).fill('30')

    await page.getByRole('checkbox', { name: /custom split/i }).check()

    await page.getByRole('spinbutton', { name: /alice amount/i }).fill('20')
    await page.getByRole('spinbutton', { name: /bob amount/i }).fill('10')

    await page.getByRole('button', { name: /save expense/i }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible()

    await page.goto(`/groups/${groupId}/expenses`)
    await expect(page.getByText('Hotel')).toBeVisible()
    await expect(page.getByText('€30.00')).toBeVisible()
  })

  test('edit expense opens pre-filled modal and saves updated title', async ({ page }) => {
    await createTestExpense(
      groupId,
      adminMemberId,
      defaultCategoryId,
      [adminMemberId, bobId],
      { title: 'Original Title', amount: 15 },
    )

    await page.goto(`/groups/${groupId}/expenses`)
    await page.waitForLoadState('networkidle')

    await page.locator('.expense-row-inner').click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: /edit expense/i })).toBeVisible()

    const titleInput = dialog.getByLabel(/title/i)
    await expect(titleInput).toHaveValue('Original Title')

    await titleInput.clear()
    await titleInput.fill('Updated Title')

    await page.getByRole('button', { name: /save expense/i }).click()

    await expect(dialog).not.toBeVisible()
    await expect(page.getByText('Updated Title')).toBeVisible()
    await expect(page.getByText('Original Title')).not.toBeVisible()
  })

  test('category chip is pre-selected as General and can be changed', async ({ page }) => {
    const customCatId = await createTestCategory(groupId, { name: 'Food & Drinks', color: 'amber', icon: 'food' })
    expect(customCatId).toBeTruthy()

    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /add expense/i }).click()

    const dialog = page.getByRole('dialog')

    const generalChip = dialog.getByRole('button', { name: 'General' })
    await expect(generalChip).toHaveAttribute('aria-pressed', 'true')

    const customChip = dialog.getByRole('button', { name: 'Food & Drinks' })
    await expect(customChip).toBeVisible()
    await expect(customChip).toHaveAttribute('aria-pressed', 'false')

    await customChip.click()
    await expect(customChip).toHaveAttribute('aria-pressed', 'true')
    await expect(generalChip).toHaveAttribute('aria-pressed', 'false')
  })

  test('delete expense', async ({ page }) => {
    await createTestExpense(
      groupId,
      adminMemberId,
      defaultCategoryId,
      [adminMemberId, bobId],
      { title: 'Test Meal', amount: 20 },
    )

    await page.goto(`/groups/${groupId}/expenses`)
    await expect(page.getByText('Test Meal')).toBeVisible()

    page.on('dialog', dialog => dialog.accept())
    await page.getByRole('button', { name: /delete test meal/i }).click()

    await expect(page.getByText('Test Meal')).not.toBeVisible()
  })

  test('split among section is hidden for single-member groups', async ({ page }) => {
    const { groupId: soloGroupId } = await createTestGroup('Solo Expense Test', userId)

    try {
      await page.goto(`/groups/${soloGroupId}`)
      await page.waitForLoadState('networkidle')

      await page.getByRole('button', { name: /add expense/i }).click()

      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      await expect(dialog.getByText(/split among/i)).not.toBeVisible()

      // Expense can still be saved without split section
      await dialog.getByLabel(/title/i).fill('Solo lunch')
      await dialog.getByLabel(/amount/i).fill('12')
      await dialog.getByRole('button', { name: /save expense/i }).click()
      await expect(dialog).not.toBeVisible()
    }
    finally {
      await deleteTestGroup(soloGroupId)
    }
  })

  test('add expense modal resets to empty when reopened after submit', async ({ page }) => {
    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    // Open modal, fill in title and amount, then submit
    await page.getByRole('button', { name: /add expense/i }).click()
    await page.getByLabel(/title/i).fill('First Expense')
    await page.getByLabel(/amount/i).fill('99')
    await page.getByRole('button', { name: /save expense/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // Open modal again via FAB — form must be blank
    await page.getByRole('button', { name: /add expense/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel(/title/i)).toHaveValue('')
    const amountValue = await dialog.getByLabel(/amount/i).inputValue()
    expect(amountValue === '' || amountValue === '0').toBeTruthy()
  })

  test('recent expense on dashboard shows category badge', async ({ page }) => {
    await createTestExpense(
      groupId,
      adminMemberId,
      defaultCategoryId,
      [adminMemberId, bobId],
      { title: 'Badge Test Meal', amount: 15 },
    )

    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    // The recent expense row should display the category name (General)
    await expect(page.getByText('Badge Test Meal')).toBeVisible()
    await expect(page.getByText('General').first()).toBeVisible()
  })

  test('load more button appears and loads additional expenses', async ({ page }) => {
    await createTestExpensesBulk(
      groupId,
      adminMemberId,
      defaultCategoryId,
      [adminMemberId, bobId],
      51,
    )

    await page.goto(`/groups/${groupId}/expenses`)
    await page.waitForLoadState('networkidle')

    const loadMoreBtn = page.getByRole('button', { name: /load more/i })
    await expect(loadMoreBtn).toBeVisible()

    await loadMoreBtn.click()
    await page.waitForLoadState('networkidle')

    await expect(loadMoreBtn).not.toBeVisible()
  })
})
