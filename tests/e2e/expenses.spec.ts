import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createTestGroup, deleteTestGroup, createTestExpense } from '../helpers/supabase'

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
})
