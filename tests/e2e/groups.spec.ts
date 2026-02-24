import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {
  createTestUser,
  deleteTestUser,
  loginTestUser,
  createTestGroup,
  deleteTestGroup,
} from '../helpers/supabase'

test.describe('Groups', () => {
  let userId: string
  let username: string
  let token: string

  test.beforeAll(async () => {
    ;({ userId, username, token } = await createTestUser())
  })

  test.afterAll(async () => {
    await deleteTestUser(userId)
  })

  test('empty state renders correctly @a11y', async ({ page }) => {
    await loginTestUser(page, userId, username, token)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const emptyTitle = page.getByRole('heading', { level: 1 })
    await expect(emptyTitle).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    const violations = results.violations.filter(v =>
      v.impact === 'critical' || v.impact === 'serious',
    )
    expect(violations, `a11y violations: ${JSON.stringify(violations.map(v => v.id))}`).toHaveLength(0)
  })

  test('create group (happy path) @a11y', async ({ page }) => {
    await loginTestUser(page, userId, username, token)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.locator('[aria-label="Create new group"]').first().click()

    // No members section — members join via invitations
    await page.getByLabel(/group name/i).fill('Weekend Trip')
    await page.getByLabel(/description/i).fill('A test group')

    await page.getByRole('button', { name: /create group/i }).click()

    await expect(page).toHaveURL(/\/groups\//)

    const results = await new AxeBuilder({ page }).analyze()
    const violations = results.violations.filter(v =>
      v.impact === 'critical' || v.impact === 'serious',
    )
    expect(violations, `a11y violations: ${JSON.stringify(violations.map(v => v.id))}`).toHaveLength(0)

    const url = page.url()
    const groupId = url.match(/\/groups\/([^/]+)/)?.[1]
    if (groupId) await deleteTestGroup(groupId)
  })

  test('create group with custom color', async ({ page }) => {
    await loginTestUser(page, userId, username, token)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.locator('[aria-label="Create new group"]').first().click()

    await page.getByLabel(/group name/i).fill('Color Test Group')

    const colorGroup = page.getByRole('group', { name: /accent color/i })
    const emeraldSwatch = colorGroup.getByRole('button', { name: 'emerald' })
    await emeraldSwatch.click()
    await expect(emeraldSwatch).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: /create group/i }).click()

    await expect(page).toHaveURL(/\/groups\//)

    const url = page.url()
    const groupId = url.match(/\/groups\/([^/]+)/)?.[1]
    if (groupId) await deleteTestGroup(groupId)
  })

  test('delete group via settings redirects to home', async ({ page }) => {
    const name = `Delete Test ${Date.now()}`
    const { groupId } = await createTestGroup(name, userId)

    await loginTestUser(page, userId, username, token)
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    page.on('dialog', dialog => dialog.accept())
    await page.getByRole('button', { name: /delete group/i }).click()

    await expect(page).not.toHaveURL(new RegExp(groupId))
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('tab', { name })).not.toBeVisible()
  })

  test('group tabs switch active group', async ({ page }) => {
    const suffix = Date.now()
    const g1Name = `Alpha ${suffix}`
    const g2Name = `Beta ${suffix}`
    const { groupId: g1Id } = await createTestGroup(g1Name, userId)
    const { groupId: g2Id } = await createTestGroup(g2Name, userId)

    try {
      await loginTestUser(page, userId, username, token)
      await page.goto(`/groups/${g1Id}`)
      await page.waitForLoadState('networkidle')
      await expect(page.getByRole('heading', { name: g1Name })).toBeVisible()

      await page.getByRole('tab', { name: g2Name }).click()
      await expect(page).toHaveURL(new RegExp(g2Id))
    }
    finally {
      await deleteTestGroup(g1Id)
      await deleteTestGroup(g2Id)
    }
  })

  test('section tabs navigate between Balance, Expenses, and Settings', async ({ page }) => {
    const { groupId } = await createTestGroup(`Alpha ${Date.now()}`, userId)

    try {
      await loginTestUser(page, userId, username, token)
      await page.goto(`/groups/${groupId}`)
      await page.waitForLoadState('networkidle')

      await page.getByRole('link', { name: /^expenses$/i }).click()
      await expect(page).toHaveURL(new RegExp(`/groups/${groupId}/expenses`))

      await page.getByRole('link', { name: /^settings$/i }).click()
      await expect(page).toHaveURL(new RegExp(`/groups/${groupId}/settings`))

      await page.getByRole('link', { name: /^balances$/i }).click()
      await expect(page).toHaveURL(new RegExp(`/groups/${groupId}$`))
    }
    finally {
      await deleteTestGroup(groupId)
    }
  })
})
