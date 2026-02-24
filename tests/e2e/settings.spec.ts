import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createTestGroup, deleteTestGroup } from '../helpers/supabase'

test.describe('Settings', () => {
  let groupId: string

  test.beforeEach(async () => {
    const result = await createTestGroup('Settings Test Group', ['Alice', 'Bob'])
    groupId = result.groupId
  })

  test.afterEach(async () => {
    await deleteTestGroup(groupId)
  })

  test('settings page renders correctly @a11y', async ({ page }) => {
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    // All three sections should be present
    await expect(page.getByRole('heading', { name: /group info/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /members/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /danger zone/i })).toBeVisible()

    // a11y check
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

    // Clear and type a new name
    await nameInput.clear()
    await nameInput.fill('Renamed Group')

    await page.getByRole('button', { name: /save changes/i }).click()

    // Success message should appear
    await expect(page.getByText(/changes saved/i)).toBeVisible()

    // Reload and verify the name persisted
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

    // Validation error should appear
    await expect(page.getByRole('alert')).toBeVisible()
  })

  test('group color can be changed in settings', async ({ page }) => {
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    // Select rose color (within the Accent color group)
    const colorGroup = page.getByRole('group', { name: /accent color/i })
    const roseSwatch = colorGroup.getByRole('button', { name: 'rose' })

    await roseSwatch.click()
    await expect(roseSwatch).toHaveAttribute('aria-pressed', 'true')

    // Save and verify
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText(/changes saved/i)).toBeVisible()

    // Reload — rose should still be selected
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

    // Navigate to Balances (dashboard)
    await page.getByRole('link', { name: /^balances$/i }).click()
    await expect(page).toHaveURL(new RegExp(`/groups/${groupId}$`))

    // Navigate back via Expenses tab
    await page.getByRole('link', { name: /^expenses$/i }).click()
    await expect(page).toHaveURL(new RegExp(`/groups/${groupId}/expenses`))

    // Navigate to Settings tab
    await page.getByRole('link', { name: /^settings$/i }).click()
    await expect(page).toHaveURL(new RegExp(`/groups/${groupId}/settings`))
  })
})
