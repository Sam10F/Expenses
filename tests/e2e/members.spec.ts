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

test.describe('Members', () => {
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
    const result = await createTestGroup('Member Test Group', userId, { username: 'Alice' })
    groupId = result.groupId
    await addTestMember(groupId, 'Bob')
    await loginTestUser(page, userId, username, token)
  })

  test.afterEach(async () => {
    await deleteTestGroup(groupId)
  })

  test('settings page shows members @a11y', async ({ page }) => {
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Alice')).toBeVisible()
    await expect(page.getByText('Bob')).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    const violations = results.violations.filter(v =>
      v.impact === 'critical' || v.impact === 'serious',
    )
    expect(violations, `a11y violations: ${JSON.stringify(violations.map(v => v.id))}`).toHaveLength(0)
  })

  test('remove member from group', async ({ page }) => {
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    page.on('dialog', dialog => dialog.accept())
    await page.getByRole('button', { name: /remove member bob/i }).click()

    await expect(page.getByText('Bob')).not.toBeVisible()
  })

  test('member color change in settings is saved immediately', async ({ page }) => {
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Alice')).toBeVisible()

    const aliceLi = page.locator('li').filter({ has: page.getByText('Alice', { exact: true }) })
    const amberSwatch = aliceLi.getByRole('button', { name: 'amber' })

    await expect(amberSwatch).toHaveAttribute('aria-pressed', 'false')

    await amberSwatch.click()

    await expect(amberSwatch).toHaveAttribute('aria-pressed', 'true')

    await page.reload()
    await page.waitForLoadState('networkidle')

    const aliceLiAfterReload = page.locator('li').filter({ has: page.getByText('Alice', { exact: true }) })
    const amberSwatchAfterReload = aliceLiAfterReload.getByRole('button', { name: 'amber' })
    await expect(amberSwatchAfterReload).toHaveAttribute('aria-pressed', 'true')
  })
})
