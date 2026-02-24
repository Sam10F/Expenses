import { test, expect } from '@playwright/test'
import {
  createTestUser,
  deleteTestUser,
  loginTestUser,
  createTestGroup,
  addTestMember,
  deleteTestGroup,
} from '../helpers/supabase'

test.describe('Roles', () => {
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

  test.beforeEach(async () => {
    const result = await createTestGroup('Role Test Group', userId, { username: 'Admin' })
    groupId = result.groupId
  })

  test.afterEach(async () => {
    await deleteTestGroup(groupId)
  })

  test('admin can change member role', async ({ page }) => {
    await addTestMember(groupId, 'Bob', 'user')

    await loginTestUser(page, userId, username, token)
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    // Find Bob's role selector and change to watcher
    const bobLi = page.locator('li').filter({ has: page.getByText('Bob', { exact: true }) })
    const roleSelect = bobLi.locator('select')
    await roleSelect.selectOption('watcher')

    // Verify the select reflects the change (API call updates the member role)
    await page.waitForLoadState('networkidle')
    await expect(roleSelect).toHaveValue('watcher')
  })

  test('watcher is excluded from paid-by dropdown in expense modal', async ({ page }) => {
    await addTestMember(groupId, 'Watcher Bob', 'watcher')

    await loginTestUser(page, userId, username, token)
    await page.goto(`/groups/${groupId}`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /add expense/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Check paid-by dropdown — watcher should not appear
    const paidBySelect = dialog.locator('select')
    const options = await paidBySelect.locator('option').allTextContents()
    expect(options.every(o => !/watcher bob/i.test(o))).toBe(true)
  })

  test('admin own role badge is shown (cannot change own role)', async ({ page }) => {
    await loginTestUser(page, userId, username, token)
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    // Admin's own row shows role badge, not a dropdown
    const adminLi = page.locator('li').filter({ has: page.getByText('Admin', { exact: true }) })
    await expect(adminLi.locator('.role-badge')).toBeVisible()
    await expect(adminLi.locator('select')).not.toBeVisible()
  })
})
