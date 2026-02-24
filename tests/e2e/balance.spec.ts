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
} from '../helpers/supabase'

test.describe('Balance', () => {
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
    const result = await createTestGroup('Balance Test Group', userId, { username: 'Alice' })
    groupId = result.groupId
    adminMemberId = result.adminMemberId
    defaultCategoryId = result.defaultCategoryId
    bobId = await addTestMember(groupId, 'Bob')
    await loginTestUser(page, userId, username, token)
  })

  test.afterEach(async () => {
    await deleteTestGroup(groupId)
  })

  test('balance cards show correct amounts after adding expenses @a11y', async ({ page }) => {
    // Alice pays 20 (shared equally) → Alice +10, Bob -10
    await createTestExpense(
      groupId,
      adminMemberId,
      defaultCategoryId,
      [adminMemberId, bobId],
      { title: 'Groceries', amount: 20 },
    )

    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('+€10.00')).toBeVisible()
    await expect(page.getByText(/\u2212€10\.00/)).toBeVisible()

    const settlementList = page.locator('ul[role="list"]')
    await expect(settlementList.getByText('Bob', { exact: true })).toBeVisible()
    await expect(settlementList.getByText('Alice', { exact: true })).toBeVisible()

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
      adminMemberId,
      defaultCategoryId,
      [adminMemberId, bobId],
      { title: 'Hotel', amount: 30 },
    )

    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    const settlementSection = page.getByText(/suggested settlements/i)
    await expect(settlementSection).toBeVisible()
    await expect(page.getByText('€15.00', { exact: true })).toBeVisible()
  })

  test('settlement record button opens expense modal pre-filled', async ({ page }) => {
    // Alice pays €20, Bob owes €10 → settlement: Bob → Alice pays €10
    await createTestExpense(
      groupId,
      adminMemberId,
      defaultCategoryId,
      [adminMemberId, bobId],
      { title: 'Dinner', amount: 20 },
    )

    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    const settlementBtn = page.locator('button.settlement-row')
    await expect(settlementBtn).toBeVisible()
    await settlementBtn.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: /add expense/i })).toBeVisible()

    const titleInput = dialog.getByLabel(/title/i)
    await expect(titleInput).toHaveValue(/bob.*alice/i)

    const amountInput = dialog.getByLabel(/amount/i)
    await expect(amountInput).toHaveValue('10')
  })

  test('show more / show less settlements when more than 5 exist', async ({ page }) => {
    const { groupId: bigGroupId, adminMemberId: aliceId, defaultCategoryId: bigCatId }
      = await createTestGroup('Show More Settlements', userId, { username: 'Alice' })
    const memberNames = ['Bob', 'Charlie', 'David', 'Eve', 'Frank', 'Grace']
    const extraIds = await Promise.all(memberNames.map(n => addTestMember(bigGroupId, n)))

    try {
      await createTestExpense(
        bigGroupId,
        aliceId,
        bigCatId,
        [aliceId, ...extraIds],
        { amount: 70 },
      )

      await page.goto(`/groups/${bigGroupId}`)
      await page.waitForLoadState('networkidle')

      const showMoreBtn = page.getByRole('button', { name: /show more/i })
      await expect(showMoreBtn).toBeVisible()

      await showMoreBtn.click()

      await expect(page.getByRole('button', { name: /show less/i })).toBeVisible()
      await expect(showMoreBtn).not.toBeVisible()

      await page.getByRole('button', { name: /show less/i }).click()
      await expect(page.getByRole('button', { name: /show more/i })).toBeVisible()
    }
    finally {
      await deleteTestGroup(bigGroupId)
    }
  })

  test('"All settled up!" shown when balances are zero', async ({ page }) => {
    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/all settled up/i)).toBeVisible()
  })
})
