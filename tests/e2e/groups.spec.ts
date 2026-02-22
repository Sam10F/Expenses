import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createTestGroup, deleteTestGroup } from '../helpers/supabase'

test.describe('Groups', () => {
  test('empty state renders correctly @a11y', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // If no groups exist, empty state should be shown
    // (This test works best on a clean DB; in CI we ensure teardown)
    const emptyTitle = page.getByRole('heading', { level: 1 })
    await expect(emptyTitle).toBeVisible()

    // a11y check
    const results = await new AxeBuilder({ page }).analyze()
    const violations = results.violations.filter(v =>
      v.impact === 'critical' || v.impact === 'serious',
    )
    expect(violations, `a11y violations: ${JSON.stringify(violations.map(v => v.id))}`).toHaveLength(0)
  })

  test('create group (happy path) @a11y', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Open new group modal — via FAB on empty state or tab bar button when groups exist
    await page.locator('[aria-label="Create new group"]').first().click()

    // Fill form
    await page.getByLabel(/group name/i).fill('Weekend Trip')
    await page.getByLabel(/description/i).fill('A test group')

    // Add members
    await page.getByPlaceholder(/member name/i).fill('Alice')
    await page.getByRole('button', { name: /^add$/i }).click()

    await page.getByPlaceholder(/member name/i).fill('Bob')
    await page.getByRole('button', { name: /^add$/i }).click()

    // Submit
    await page.getByRole('button', { name: /create group/i }).click()

    // Should navigate to group dashboard
    await expect(page).toHaveURL(/\/groups\//)

    // a11y check on dashboard
    const results = await new AxeBuilder({ page }).analyze()
    const violations = results.violations.filter(v =>
      v.impact === 'critical' || v.impact === 'serious',
    )
    expect(violations, `a11y violations: ${JSON.stringify(violations.map(v => v.id))}`).toHaveLength(0)

    // Cleanup — find the group id from URL and delete
    const url = page.url()
    const groupId = url.match(/\/groups\/([^/]+)/)?.[1]
    if (groupId) await deleteTestGroup(groupId)
  })

  test('delete group via settings redirects to home', async ({ page }) => {
    const name = `Delete Test ${Date.now()}`
    const { groupId } = await createTestGroup(name, ['Alice'])

    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    // Accept the confirmation dialog before triggering the click
    page.on('dialog', dialog => dialog.accept())
    await page.getByRole('button', { name: /delete group/i }).click()

    // Should navigate away from the deleted group (to / or another group)
    await expect(page).not.toHaveURL(new RegExp(groupId))

    // The deleted group's tab should no longer appear in the tab bar
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('tab', { name })).not.toBeVisible()
  })

  test('group tabs switch active group', async ({ page }) => {
    // Use unique names per run to avoid conflicts with stale data
    const suffix = Date.now()
    const g1Name = `Alpha ${suffix}`
    const g2Name = `Beta ${suffix}`
    const { groupId: g1Id } = await createTestGroup(g1Name, ['Alice'])
    const { groupId: g2Id } = await createTestGroup(g2Name, ['Bob'])

    try {
      await page.goto(`/groups/${g1Id}`)
      await page.waitForLoadState('networkidle')
      await expect(page.getByRole('heading', { name: g1Name })).toBeVisible()

      // Click on the Beta tab (unique name guarantees single match)
      await page.getByRole('tab', { name: g2Name }).click()
      await expect(page).toHaveURL(new RegExp(g2Id))
    }
    finally {
      await deleteTestGroup(g1Id)
      await deleteTestGroup(g2Id)
    }
  })
})
