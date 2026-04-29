import { test, expect } from '@playwright/test'

test.describe('Login & routing (guest)', () => {
  test('redirects home to login when logged out', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('dashboard redirects to login when logged out', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page shows Zawar Hospital heading', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /Zawar Hospital/i })).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('rejects invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#email').fill('invalid@not-a-real-domain.test')
    await page.locator('#password').fill('wrong-password-xyz')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('strips email and password from URL query for security', async ({ page }) => {
    await page.goto('/login?email=test@example.com&password=secret')
    await page.waitForFunction(() => !window.location.search.includes('email='))
    expect(page.url()).not.toContain('email=')
    expect(page.url()).not.toContain('password=')
  })
})
