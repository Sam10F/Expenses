import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {
  createTestUser,
  deleteTestUser,
  loginTestUser,
  createTestGroup,
  deleteTestGroup,
} from '../helpers/supabase'

test.describe('User Settings', () => {
  let userId: string
  let username: string
  let token: string
  let groupId: string

  test.beforeAll(async () => {
    ;({ userId, username, token } = await createTestUser('settingsuser'))
  })

  test.afterAll(async () => {
    await deleteTestUser(userId)
  })

  test.beforeEach(async ({ page }) => {
    const result = await createTestGroup('User Settings Test Group', userId, { username: 'Alice' })
    groupId = result.groupId
    await loginTestUser(page, userId, username, token)
  })

  test.afterEach(async () => {
    await deleteTestGroup(groupId)
  })

  test('user settings page renders correctly @a11y', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /account settings/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /default group/i })).toBeVisible()
    await expect(page.getByRole('combobox', { name: /default group/i })).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    const violations = results.violations.filter(v =>
      v.impact === 'critical' || v.impact === 'serious',
    )
    expect(violations, `a11y violations: ${JSON.stringify(violations.map(v => v.id))}`).toHaveLength(0)
  })

  test('user can navigate to settings via dropdown menu', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Open user dropdown
    await page.getByRole('button', { name: /your profile/i }).click()
    await expect(page.getByRole('menu')).toBeVisible()

    // Click Settings menu item
    await page.getByRole('menuitem', { name: /^settings$/i }).click()
    await expect(page).toHaveURL('/settings')
  })

  test('user can set a default group', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    const select = page.getByRole('combobox', { name: /default group/i })
    await select.selectOption({ label: 'User Settings Test Group' })

    // "Saved" confirmation should appear
    await expect(page.getByText(/saved/i)).toBeVisible()
  })

  test('app redirects to default group on load', async ({ page }) => {
    // Set the default group in localStorage before navigation
    await page.addInitScript(({ gId }) => {
      localStorage.setItem('user_default_group_id', gId)
    }, { gId: groupId })

    await loginTestUser(page, userId, username, token)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Should redirect to the default group
    await expect(page).toHaveURL(new RegExp(`/groups/${groupId}`))
  })
})
