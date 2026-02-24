import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createTestGroup, deleteTestGroup } from '../helpers/supabase'

test.describe('Members', () => {
  let groupId: string

  test.beforeEach(async () => {
    const result = await createTestGroup('Member Test Group', ['Alice', 'Bob'])
    groupId = result.groupId
  })

  test.afterEach(async () => {
    await deleteTestGroup(groupId)
  })

  test('settings page shows members @a11y', async ({ page }) => {
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Alice')).toBeVisible()
    await expect(page.getByText('Bob')).toBeVisible()

    // a11y check
    const results = await new AxeBuilder({ page }).analyze()
    const violations = results.violations.filter(v =>
      v.impact === 'critical' || v.impact === 'serious',
    )
    expect(violations, `a11y violations: ${JSON.stringify(violations.map(v => v.id))}`).toHaveLength(0)
  })

  test('add member via settings', async ({ page }) => {
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    const input = page.getByPlaceholder(/member name/i)
    await input.fill('Charlie')
    await page.getByRole('button', { name: /^add$/i }).click()

    await expect(page.getByText('Charlie')).toBeVisible()
  })

  test('remove member from group', async ({ page }) => {
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    // Remove Bob
    page.on('dialog', dialog => dialog.accept())
    await page.getByRole('button', { name: /remove member bob/i }).click()

    await expect(page.getByText('Bob')).not.toBeVisible()
  })

  test('member color change in settings is saved immediately', async ({ page }) => {
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    // Wait for Alice to be visible first
    await expect(page.getByText('Alice')).toBeVisible()

    // Scope to the list item containing Alice, then find her amber swatch
    const aliceLi = page.locator('li').filter({ has: page.getByText('Alice', { exact: true }) })
    const amberSwatch = aliceLi.getByRole('button', { name: 'amber' })

    // Amber should not be selected initially (default is indigo)
    await expect(amberSwatch).toHaveAttribute('aria-pressed', 'false')

    await amberSwatch.click()

    // After clicking, amber should be selected
    await expect(amberSwatch).toHaveAttribute('aria-pressed', 'true')

    // Reload the page to verify the change was persisted
    await page.reload()
    await page.waitForLoadState('networkidle')

    const aliceLiAfterReload = page.locator('li').filter({ has: page.getByText('Alice', { exact: true }) })
    const amberSwatchAfterReload = aliceLiAfterReload.getByRole('button', { name: 'amber' })
    await expect(amberSwatchAfterReload).toHaveAttribute('aria-pressed', 'true')
  })

  test('member color is assignable during group creation', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Open create group modal
    await page.locator('[aria-label="Create new group"]').first().click()

    await page.getByLabel(/group name/i).fill(`Color Test ${Date.now()}`)

    // Add a member
    await page.getByPlaceholder(/member name/i).fill('Diana')
    await page.getByRole('button', { name: /^add$/i }).click()

    // Wait for Diana's row to appear, then find her rose swatch
    const dianaLi = page.locator('li').filter({ has: page.getByText('Diana', { exact: true }) })
    const roseSwatch = dianaLi.getByRole('button', { name: 'rose' })
    await roseSwatch.click()

    // Verify rose is now selected
    await expect(roseSwatch).toHaveAttribute('aria-pressed', 'true')

    // Indigo (default first color) should no longer be selected
    const indigoSwatch = dianaLi.getByRole('button', { name: 'indigo' })
    await expect(indigoSwatch).toHaveAttribute('aria-pressed', 'false')

    // Submit and cleanup
    await page.getByRole('button', { name: /create group/i }).click()
    await expect(page).toHaveURL(/\/groups\//)

    const url = page.url()
    const newGroupId = url.match(/\/groups\/([^/]+)/)?.[1]
    if (newGroupId) await deleteTestGroup(newGroupId)
  })
})
