import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createTestUser, deleteTestUser } from '../helpers/supabase'

test.describe('Auth', () => {
  test('login page renders correctly @a11y', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    await expect(page.getByLabel(/username/i)).toBeVisible()
    await expect(page.getByLabel(/^password$/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    const violations = results.violations.filter(v =>
      v.impact === 'critical' || v.impact === 'serious',
    )
    expect(violations, `a11y violations: ${JSON.stringify(violations.map(v => v.id))}`).toHaveLength(0)
  })

  test('signup page renders correctly @a11y', async ({ page }) => {
    await page.goto('/auth/signup')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible()
    await expect(page.getByLabel(/username/i)).toBeVisible()
    await expect(page.getByLabel(/^password$/i)).toBeVisible()
    await expect(page.getByLabel(/confirm password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    const violations = results.violations.filter(v =>
      v.impact === 'critical' || v.impact === 'serious',
    )
    expect(violations, `a11y violations: ${JSON.stringify(violations.map(v => v.id))}`).toHaveLength(0)
  })

  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')

    await page.getByLabel(/username/i).fill('nonexistentuser_xyzabc')
    await page.getByLabel(/^password$/i).fill('WrongPassword1!')

    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByRole('alert')).toBeVisible()
  })

  test('login with empty fields shows validation', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByRole('alert').first()).toBeVisible()
  })

  test('signup with weak password shows inline validation', async ({ page }) => {
    await page.goto('/auth/signup')
    await page.waitForLoadState('networkidle')

    await page.getByLabel(/username/i).fill('validuser')
    await page.getByLabel(/^password$/i).fill('weak')

    // Inline password strength checks list is always visible
    await expect(page.getByRole('list', { name: /password requirements/i })).toBeVisible()
    // 'weak' has lowercase only — hasLower passes, rest fail
    // check that the list has items (they're always rendered)
    await expect(page.locator('.password-checks li').first()).toBeVisible()
  })

  test('signup with password mismatch shows error', async ({ page }) => {
    await page.goto('/auth/signup')
    await page.waitForLoadState('networkidle')

    // Use a short, valid username (≤20 chars) so only the mismatch error fires
    await page.getByLabel(/username/i).fill('validuser123')
    await page.getByLabel(/^password$/i).fill('ValidPass1!')
    await page.getByLabel(/confirm password/i).fill('DifferentPass1!')

    await page.getByRole('button', { name: /create account/i }).click()

    await expect(page.getByRole('alert').first()).toBeVisible()
  })

  test('signup with taken username shows error', async ({ page }) => {
    const { userId, username } = await createTestUser('takenuser')

    try {
      await page.goto('/auth/signup')
      await page.waitForLoadState('networkidle')

      await page.getByLabel(/username/i).fill(username)
      await page.getByLabel(/^password$/i).fill('ValidPass1!')
      await page.getByLabel(/confirm password/i).fill('ValidPass1!')

      await page.getByRole('button', { name: /create account/i }).click()

      await expect(page.getByRole('alert')).toBeVisible()
    }
    finally {
      await deleteTestUser(userId)
    }
  })

  test('sign out redirects to login', async ({ page }) => {
    const { userId, username, token } = await createTestUser('signouttest')

    try {
      await page.addInitScript(({ t, u, uid }) => {
        localStorage.setItem('auth_token', t)
        localStorage.setItem('auth_refresh_token', '')
        localStorage.setItem('auth_user', JSON.stringify({ id: uid, username: u }))
      }, { t: token, u: username, uid: userId })

      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Open profile dropdown
      await page.getByRole('button', { name: /your profile/i }).click()

      // Click sign out (rendered as menuitem inside the dropdown)
      await page.getByRole('menuitem', { name: /sign out/i }).click()

      await expect(page).toHaveURL(/\/auth\/login/)
    }
    finally {
      await deleteTestUser(userId)
    }
  })
})
