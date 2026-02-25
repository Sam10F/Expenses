import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {
  createTestUser,
  deleteTestUser,
  loginTestUser,
  createTestGroup,
  addTestMember,
  deleteTestGroup,
  createTestCategory,
} from '../helpers/supabase'

test.describe('Settings', () => {
  let userId: string
  let username: string
  let token: string
  let groupId: string

  test.beforeAll(async () => {
    ; ({ userId, username, token } = await createTestUser())
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

    // Settings is now an icon-only link with aria-label
    await page.getByRole('link', { name: /^settings$/i }).click()
    await expect(page).toHaveURL(new RegExp(`/groups/${groupId}/settings`))
  })

  test('settings icon (gear) is visible in section tabs', async ({ page }) => {
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    // The settings link should be an icon with aria-label, no visible text
    const settingsLink = page.getByRole('link', { name: /^settings$/i })
    await expect(settingsLink).toBeVisible()
    // Verify it contains an SVG (icon) not raw text
    await expect(settingsLink.locator('svg')).toBeVisible()
  })

  test('admin sees categories section in settings', async ({ page }) => {
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /by category/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /add category/i })).toBeVisible()
  })

  test('admin can add a category from settings', async ({ page }) => {
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /add category/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByLabel(/name/i).fill('Transport')
    await dialog.getByRole('button', { name: 'sky' }).click()
    await dialog.getByRole('button', { name: /transport/i }).first().click()
    await dialog.getByRole('button', { name: /create category/i }).click()

    await expect(dialog).not.toBeVisible()
    await expect(page.getByText('Transport')).toBeVisible()
  })

  test('admin can delete a non-default category from settings', async ({ page }) => {
    await createTestCategory(groupId, { name: 'To Delete', color: 'rose', icon: 'food' })
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    page.once('dialog', dialog => dialog.accept())
    await page.getByRole('button', { name: /delete to delete/i }).click()

    await expect(page.getByText('To Delete')).not.toBeVisible()
  })

  test('color selector only shown for current user own member row', async ({ page }) => {
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    // Alice (current user) should have color swatches visible
    const aliceRow = page.locator('li').filter({ hasText: 'Alice' })
    await expect(aliceRow.getByRole('group', { name: /color/i })).toBeVisible()

    // Bob (other member without user_id) should NOT have color swatches
    const bobRow = page.locator('li').filter({ hasText: 'Bob' })
    await expect(bobRow.getByRole('group', { name: /color/i })).not.toBeVisible()
  })
})
