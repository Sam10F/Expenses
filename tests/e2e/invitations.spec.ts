import { test, expect } from '@playwright/test'
import {
  createTestUser,
  deleteTestUser,
  loginTestUser,
  createTestGroup,
  deleteTestGroup,
  createTestInvitation,
} from '../helpers/supabase'

test.describe('Invitations', () => {
  let adminUserId: string
  let adminUsername: string
  let adminToken: string
  let inviteeUserId: string
  let inviteeUsername: string
  let inviteeToken: string
  let groupId: string

  test.beforeAll(async () => {
    ;({ userId: adminUserId, username: adminUsername, token: adminToken } = await createTestUser('adminuser'))
    ;({ userId: inviteeUserId, username: inviteeUsername, token: inviteeToken } = await createTestUser('watcheruser'))
  })

  test.afterAll(async () => {
    await deleteTestUser(adminUserId)
    await deleteTestUser(inviteeUserId)
  })

  test.beforeEach(async () => {
    const result = await createTestGroup('Invitation Test Group', adminUserId, { username: 'Admin' })
    groupId = result.groupId
  })

  test.afterEach(async () => {
    await deleteTestGroup(groupId)
  })

  test('admin can send invitation to valid username', async ({ page }) => {
    await loginTestUser(page, adminUserId, adminUsername, adminToken)
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    await page.getByPlaceholder(/username/i).fill(inviteeUsername)
    await page.getByRole('button', { name: /send/i }).click()

    // Success message appears
    await expect(page.getByText(/invitation sent/i)).toBeVisible()
  })

  test('admin sending invitation to non-existent user shows error', async ({ page }) => {
    await loginTestUser(page, adminUserId, adminUsername, adminToken)
    await page.goto(`/groups/${groupId}/settings`)
    await page.waitForLoadState('networkidle')

    await page.getByPlaceholder(/username/i).fill('nonexistentuser_xyz_abc_123')
    await page.getByRole('button', { name: /send/i }).click()

    await expect(page.getByRole('alert')).toBeVisible()
  })

  test('invited user sees invitation in invitations page', async ({ page }) => {
    // Create invitation directly in DB (the UI send flow is tested in a separate test)
    await createTestInvitation(groupId, adminUserId, inviteeUserId)

    // Invitee checks invitations page
    await loginTestUser(page, inviteeUserId, inviteeUsername, inviteeToken)
    await page.goto('/invitations')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/invitation test group/i)).toBeVisible()
  })

  test('invitee can accept invitation and gains access to group', async ({ page }) => {
    // Create invitation directly in DB
    await createTestInvitation(groupId, adminUserId, inviteeUserId)

    // Invitee accepts
    await loginTestUser(page, inviteeUserId, inviteeUsername, inviteeToken)
    await page.goto('/invitations')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /accept/i }).click()

    // Should navigate to the group
    await expect(page).toHaveURL(new RegExp(groupId))
  })


  test('notification badge updates immediately after accepting invitation', async ({ page }) => {
    // Create invitation directly in DB
    await createTestInvitation(groupId, adminUserId, inviteeUserId)

    // Invitee opens invitations page (badge should show 1)
    await loginTestUser(page, inviteeUserId, inviteeUsername, inviteeToken)
    await page.goto('/invitations')
    await page.waitForLoadState('networkidle')

    // Bell notification button should be visible in topbar
    const notificationBtn = page.getByRole('button', { name: /invitations/i })
    await expect(notificationBtn).toBeVisible()

    // Accept the invitation
    await page.getByRole('button', { name: /accept/i }).click()

    // Navigate back to a group page — badge must be gone without full page reload
    await page.waitForURL(new RegExp(groupId))
    await expect(page.getByRole('button', { name: /invitations \(/i })).not.toBeVisible()
  })

  test('invitee can decline invitation', async ({ page }) => {
    // Create invitation directly in DB
    await createTestInvitation(groupId, adminUserId, inviteeUserId)

    // Invitee declines
    await loginTestUser(page, inviteeUserId, inviteeUsername, inviteeToken)
    await page.goto('/invitations')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /decline/i }).click()

    // Invitation disappears
    await expect(page.getByText(/invitation test group/i)).not.toBeVisible()
  })
})
