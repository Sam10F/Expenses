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
})
