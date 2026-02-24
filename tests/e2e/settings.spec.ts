import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {
  createTestUser,
  deleteTestUser,
  loginTestUser,
  createTestGroup,
  addTestMember,
  deleteTestGroup,
} from '../helpers/supabase'

test.describe('Settings', () => {
  let userId: string
  let username: string
  let token: string
  let groupId: string

  test.beforeAll(async () => {
    ;({ userId, username, token } = await createTestUser())
  })

  test.afterAll(async () => {
    await deleteTestUser(userId)
  })

  test.beforeEach(async ({ page }) => {
    const result = await createTestGroup('Settings Test Group', userId, { username: 'Alice' })
    groupId = result.groupId
    await addTestMember(groupId, 'Bob')
    await loginTestUser(page, userId, username, token)
  })

  test.afterEach(async () => {
    await deleteTestGroup(groupId)
  })

  test('settings page renders correctly @a11y', async ({ page }) => {
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /group info/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /members/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /invitations/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /leave group/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /danger zone/i })).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    const violations = results.violations.filter(v =>
      v.impact === 'critical' || v.impact === 'serious',
    )
    expect(violations, `a11y violations: ${JSON.stringify(violations.map(v => v.id))}`).toHaveLength(0)
  })

  test('save group info updates the group name', async ({ page }) => {
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    const nameInput = page.getByLabel(/group name/i)

    await nameInput.clear()
    await nameInput.fill('Renamed Group')

    await page.getByRole('button', { name: /save changes/i }).click()

    await expect(page.getByText(/changes saved/i)).toBeVisible()

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByLabel(/group name/i)).toHaveValue('Renamed Group')
  })

  test('save group info shows error when name is empty', async ({ page }) => {
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    const nameInput = page.getByLabel(/group name/i)
    await nameInput.clear()

    await page.getByRole('button', { name: /save changes/i }).click()

    await expect(page.getByRole('alert')).toBeVisible()
  })

  test('group color can be changed in settings', async ({ page }) => {
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    const colorGroup = page.getByRole('group', { name: /accent color/i })
    const roseSwatch = colorGroup.getByRole('button', { name: 'rose' })

    await roseSwatch.click()
    await expect(roseSwatch).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText(/changes saved/i)).toBeVisible()

    await page.reload()
    await page.waitForLoadState('networkidle')

    const roseAfterReload = page
      .getByRole('group', { name: /accent color/i })
      .getByRole('button', { name: 'rose' })
    await expect(roseAfterReload).toHaveAttribute('aria-pressed', 'true')
  })

  test('section tabs navigate from settings to other pages', async ({ page }) => {
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('link', { name: /^balances$/i }).click()
    await expect(page).toHaveURL(new RegExp(`/groups/${groupId}$`))

    await page.getByRole('link', { name: /^expenses$/i }).click()
    await expect(page).toHaveURL(new RegExp(`/groups/${groupId}/expenses`))

    await page.getByRole('link', { name: /^settings$/i }).click()
    await expect(page).toHaveURL(new RegExp(`/groups/${groupId}/settings`))
  })
})
