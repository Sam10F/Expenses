import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createTestGroup, deleteTestGroup, createTestExpense } from '../helpers/supabase'

test.describe('Balance', () => {
  let groupId: string
  let memberIds: Record<string, string>
  let defaultCategoryId: string

  test.beforeEach(async () => {
    const result = await createTestGroup('Balance Test Group', ['Alice', 'Bob'])
    groupId = result.groupId
    memberIds = result.memberIds
    defaultCategoryId = result.defaultCategoryId
  })

  test.afterEach(async () => {
    await deleteTestGroup(groupId)
  })

  test('balance cards show correct amounts after adding expenses @a11y', async ({ page }) => {
    // Alice pays 20 (shared equally) → Alice +10, Bob -10
    await createTestExpense(
      groupId,
      memberIds['Alice']!,
      defaultCategoryId,
      Object.values(memberIds),
      { title: 'Groceries', amount: 20 },
    )

    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    // Alice should have positive balance (is owed)
    // Bob should have negative balance (owes)
    await expect(page.getByText('+€10.00')).toBeVisible()
    await expect(page.getByText(/\u2212€10\.00/)).toBeVisible() // −€10.00 with minus sign

    // Settlements should show Bob → Alice pays €10.00
    // Scope to the settlement list (<ul>) to avoid ambiguity with balance card names
    const settlementList = page.locator('ul[role="list"]')
    await expect(settlementList.getByText('Bob', { exact: true })).toBeVisible()
    await expect(settlementList.getByText('Alice', { exact: true })).toBeVisible()

    // a11y check
    const results = await new AxeBuilder({ page }).analyze()
    const violations = results.violations.filter(v =>
      v.impact === 'critical' || v.impact === 'serious',
    )
    expect(violations, `a11y violations: ${JSON.stringify(violations.map(v => v.id))}`).toHaveLength(0)
  })

  test('settlements show correct payer and payee', async ({ page }) => {
    // Alice pays €30 split equally → Alice +15, Bob -15
    await createTestExpense(
      groupId,
      memberIds['Alice']!,
      defaultCategoryId,
      Object.values(memberIds),
      { title: 'Hotel', amount: 30 },
    )

    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    // Settlement: Bob → Alice pays €15.00
    const settlementSection = page.getByText(/suggested settlements/i)
    await expect(settlementSection).toBeVisible()
    await expect(page.getByText('€15.00', { exact: true })).toBeVisible()
  })
})
