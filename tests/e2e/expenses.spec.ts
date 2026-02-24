import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createTestGroup, deleteTestGroup, createTestExpense, createTestExpensesBulk, createTestCategory } from '../helpers/supabase'

test.describe('Expenses', () => {
  let groupId: string
  let memberIds: Record<string, string>
  let defaultCategoryId: string

  test.beforeEach(async () => {
    const result = await createTestGroup('Expense Test Group', ['Alice', 'Bob'])
    groupId = result.groupId
    memberIds = result.memberIds
    defaultCategoryId = result.defaultCategoryId
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

    // Open add expense modal via FAB
    await page.getByRole('button', { name: /add expense/i }).click()

    // Fill form
    await page.getByLabel(/title/i).fill('Dinner')
    await page.getByLabel(/amount/i).fill('30')

    // Submit
    await page.getByRole('button', { name: /save expense/i }).click()

    // Modal should close and expense should appear
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // Navigate to expenses page to verify
    await page.goto(`/groups/${groupId}/expenses`)
    await expect(page.getByText('Dinner')).toBeVisible()
    await expect(page.getByText('€30.00')).toBeVisible()

    // a11y check
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

    // Enable custom split
    await page.getByRole('checkbox', { name: /custom split/i }).check()

    // Set Alice = €20, Bob = €20 — total is €40, not €30
    await page.getByRole('spinbutton', { name: /alice amount/i }).fill('20')
    await page.getByRole('spinbutton', { name: /bob amount/i }).fill('20')

    await page.getByRole('button', { name: /save expense/i }).click()

    // Error message should appear
    await expect(page.getByRole('alert')).toContainText(/€30\.00/i)
    // Modal stays open
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('add expense with custom split - succeeds when amounts sum to total', async ({ page }) => {
    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /add expense/i }).click()

    await page.getByLabel(/title/i).fill('Hotel')
    await page.getByLabel(/amount/i).fill('30')

    // Enable custom split
    await page.getByRole('checkbox', { name: /custom split/i }).check()

    // Set Alice = €20, Bob = €10 — total is €30 ✓
    await page.getByRole('spinbutton', { name: /alice amount/i }).fill('20')
    await page.getByRole('spinbutton', { name: /bob amount/i }).fill('10')

    await page.getByRole('button', { name: /save expense/i }).click()

    // Modal closes
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // Expense appears
    await page.goto(`/groups/${groupId}/expenses`)
    await expect(page.getByText('Hotel')).toBeVisible()
    await expect(page.getByText('€30.00')).toBeVisible()
  })

  test('edit expense opens pre-filled modal and saves updated title', async ({ page }) => {
    await createTestExpense(
      groupId,
      memberIds['Alice']!,
      defaultCategoryId,
      Object.values(memberIds),
      { title: 'Original Title', amount: 15 },
    )

    await page.goto(`/groups/${groupId}/expenses`)
    await page.waitForLoadState('networkidle')

    // Click the expense row button (the row itself, not the delete button)
    await page.locator('.expense-row-inner').click()

    // Modal should open with "Edit Expense" title
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: /edit expense/i })).toBeVisible()

    // Title field should be pre-filled
    const titleInput = dialog.getByLabel(/title/i)
    await expect(titleInput).toHaveValue('Original Title')

    // Change the title
    await titleInput.clear()
    await titleInput.fill('Updated Title')

    await page.getByRole('button', { name: /save expense/i }).click()

    // Modal closes and updated title appears
    await expect(dialog).not.toBeVisible()
    await expect(page.getByText('Updated Title')).toBeVisible()
    await expect(page.getByText('Original Title')).not.toBeVisible()
  })

  test('category chip is pre-selected as General and can be changed', async ({ page }) => {
    // Create a custom category
    const customCatId = await createTestCategory(groupId, { name: 'Food & Drinks', color: 'amber', icon: 'food' })
    expect(customCatId).toBeTruthy()

    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /add expense/i }).click()

    const dialog = page.getByRole('dialog')

    // General chip should be selected by default (aria-pressed=true)
    const generalChip = dialog.getByRole('button', { name: 'General' })
    await expect(generalChip).toHaveAttribute('aria-pressed', 'true')

    // Custom category chip should be visible
    const customChip = dialog.getByRole('button', { name: 'Food & Drinks' })
    await expect(customChip).toBeVisible()
    await expect(customChip).toHaveAttribute('aria-pressed', 'false')

    // Click the custom category
    await customChip.click()
    await expect(customChip).toHaveAttribute('aria-pressed', 'true')
    await expect(generalChip).toHaveAttribute('aria-pressed', 'false')
  })

  test('delete expense', async ({ page }) => {
    // Create an expense in DB
    await createTestExpense(
      groupId,
      memberIds['Alice']!,
      defaultCategoryId,
      Object.values(memberIds),
      { title: 'Test Meal', amount: 20 },
    )

    await page.goto(`/groups/${groupId}/expenses`)
    await expect(page.getByText('Test Meal')).toBeVisible()

    // Register dialog handler before clicking (dialog fires synchronously on click)
    page.on('dialog', dialog => dialog.accept())

    // Click delete button
    await page.getByRole('button', { name: /delete test meal/i }).click()

    await expect(page.getByText('Test Meal')).not.toBeVisible()
  })

  test('load more button appears and loads additional expenses', async ({ page }) => {
    // Create 51 expenses (page size = 50, so 1 will be on the second page)
    await createTestExpensesBulk(
      groupId,
      memberIds['Alice']!,
      defaultCategoryId,
      Object.values(memberIds),
      51,
    )

    await page.goto(`/groups/${groupId}/expenses`)
    await page.waitForLoadState('networkidle')

    // "Load more" button should be visible
    const loadMoreBtn = page.getByRole('button', { name: /load more/i })
    await expect(loadMoreBtn).toBeVisible()

    // Click load more
    await loadMoreBtn.click()
    await page.waitForLoadState('networkidle')

    // All 51 expenses should now be visible — the last one (Bulk Expense 1, oldest)
    // Wait for the button to disappear since all are loaded
    await expect(loadMoreBtn).not.toBeVisible()
  })
})
