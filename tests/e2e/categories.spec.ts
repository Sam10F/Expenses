import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createTestGroup, deleteTestGroup, createTestExpense, createTestCategory } from '../helpers/supabase'

test.describe('Categories', () => {
  let groupId: string
  let memberIds: Record<string, string>
  let defaultCategoryId: string

  test.beforeEach(async () => {
    const result = await createTestGroup('Category Test Group', ['Alice', 'Bob'])
    groupId = result.groupId
    memberIds = result.memberIds
    defaultCategoryId = result.defaultCategoryId
  })

  test.afterEach(async () => {
    await deleteTestGroup(groupId)
  })

  test('add category via modal (happy path) @a11y', async ({ page }) => {
    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    // Open add category modal
    await page.getByRole('button', { name: /add category/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: /add category/i })).toBeVisible()

    // Fill name
    await dialog.getByLabel(/name/i).fill('Groceries')

    // Select amber color
    const amberSwatch = dialog.getByRole('button', { name: 'amber' })
    await amberSwatch.click()
    await expect(amberSwatch).toHaveAttribute('aria-pressed', 'true')

    // Select food icon
    const foodIconBtn = dialog.getByRole('button', { name: /food/i })
    await foodIconBtn.click()
    await expect(foodIconBtn).toHaveAttribute('aria-pressed', 'true')

    // Submit
    await dialog.getByRole('button', { name: /create category/i }).click()

    // Modal closes
    await expect(dialog).not.toBeVisible()

    // a11y check on dashboard after category added
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

    // Submit without filling name
    await dialog.getByRole('button', { name: /create category/i }).click()

    // Error message should appear
    await expect(dialog.getByRole('alert')).toBeVisible()
    // Modal stays open
    await expect(dialog).toBeVisible()
  })

  test('"No spending yet" shown in By Category when group has no expenses', async ({ page }) => {
    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/no spending yet/i)).toBeVisible()
  })

  test('By Category section shows category totals after expenses are added', async ({ page }) => {
    // Create expense under General category
    await createTestExpense(
      groupId,
      memberIds['Alice']!,
      defaultCategoryId,
      Object.values(memberIds),
      { title: 'Supermarket', amount: 40 },
    )

    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    // General should appear in the legend with the expense amount
    await expect(page.getByText('General')).toBeVisible()
    // Scope to the chart legend to avoid strict-mode ambiguity with other €40.00 on the page
    await expect(page.locator('.legend-amount').filter({ hasText: '€40.00' })).toBeVisible()
    await expect(page.locator('.legend-pct').filter({ hasText: '100%' })).toBeVisible()
  })

  test('By Category section shows multiple categories with correct percentages', async ({ page }) => {
    const transportCatId = await createTestCategory(groupId, { name: 'Transport', color: 'sky', icon: 'transport' })

    // €60 to General, €40 to Transport → 60% and 40%
    await createTestExpense(
      groupId,
      memberIds['Alice']!,
      defaultCategoryId,
      Object.values(memberIds),
      { title: 'Supermarket', amount: 60 },
    )
    await createTestExpense(
      groupId,
      memberIds['Bob']!,
      transportCatId,
      Object.values(memberIds),
      { title: 'Taxi', amount: 40 },
    )

    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    // Both categories should appear in legend
    await expect(page.locator('.legend-name').filter({ hasText: 'General' })).toBeVisible()
    await expect(page.locator('.legend-name').filter({ hasText: 'Transport' })).toBeVisible()
    await expect(page.locator('.legend-pct').filter({ hasText: '60%' })).toBeVisible()
    await expect(page.locator('.legend-pct').filter({ hasText: '40%' })).toBeVisible()
  })

  test('custom category appears as chip in expense modal', async ({ page }) => {
    await createTestCategory(groupId, { name: 'Entertainment', color: 'violet', icon: 'entertainment' })

    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    // Open add expense modal
    await page.getByRole('button', { name: /add expense/i }).click()

    const dialog = page.getByRole('dialog')

    // Both General and Entertainment chips should be present
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
})
