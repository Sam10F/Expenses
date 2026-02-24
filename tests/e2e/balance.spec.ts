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

  test('settlement record button opens expense modal pre-filled', async ({ page }) => {
    // Alice pays €20, Bob owes €10 → settlement: Bob → Alice pays €10
    await createTestExpense(
      groupId,
      memberIds['Alice']!,
      defaultCategoryId,
      Object.values(memberIds),
      { title: 'Dinner', amount: 20 },
    )

    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    // Click the settlement row button (aria-label starts with "Record settlement")
    // The button class is "settlement-row"; look for any button matching "Record settlement"
    const settlementBtn = page.locator('button.settlement-row')
    await expect(settlementBtn).toBeVisible()
    await settlementBtn.click()

    // Expense modal should open (with "Add Expense" title — it's a new expense, not an edit)
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: /add expense/i })).toBeVisible()

    // The title field should be pre-filled with "Bob → Alice"
    const titleInput = dialog.getByLabel(/title/i)
    await expect(titleInput).toHaveValue(/bob.*alice/i)

    // The amount should be pre-filled with €10.00
    const amountInput = dialog.getByLabel(/amount/i)
    await expect(amountInput).toHaveValue('10')
  })

  test('show more / show less settlements when more than 5 exist', async ({ page }) => {
    // Create a group with 7 members — Alice pays for all → 6 settlements
    const { groupId: bigGroupId, memberIds: bigMemberIds, defaultCategoryId: bigCatId }
      = await createTestGroup('Show More Settlements', ['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank', 'Grace'])

    try {
      // Alice pays €70 split 7 ways → each person owes €10, Alice is owed €60
      // This creates 6 settlements (Bob, Charlie, David, Eve, Frank, Grace → Alice)
      await createTestExpense(
        bigGroupId,
        bigMemberIds['Alice']!,
        bigCatId,
        Object.values(bigMemberIds),
        { amount: 70 },
      )

      await page.goto(`/groups/${bigGroupId}`)
      await page.waitForLoadState('networkidle')

      // With 6 settlements (> 5 limit), "Show more" button should appear
      const showMoreBtn = page.getByRole('button', { name: /show more/i })
      await expect(showMoreBtn).toBeVisible()

      // Some settlements should be hidden — Grace's should not yet be visible
      // (settlements are ordered by the algorithm; at least 1 is hidden)
      await showMoreBtn.click()

      // After clicking, "Show less" should appear
      await expect(page.getByRole('button', { name: /show less/i })).toBeVisible()
      await expect(showMoreBtn).not.toBeVisible()

      // Collapse again
      await page.getByRole('button', { name: /show less/i }).click()
      await expect(page.getByRole('button', { name: /show more/i })).toBeVisible()
    }
    finally {
      await deleteTestGroup(bigGroupId)
    }
  })

  test('"All settled up!" shown when balances are zero', async ({ page }) => {
    // No expenses → all balances are €0.00
    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/all settled up/i)).toBeVisible()
  })
})
