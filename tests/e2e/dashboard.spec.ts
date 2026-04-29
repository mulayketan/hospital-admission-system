import { test, expect } from '@playwright/test'

test.describe('Dashboard (authenticated)', () => {
  test('shows main navigation tabs', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('button', { name: /REGISTRATION CUM ADMISSION/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Patient Records$/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /IPD Treatment/i })).toBeVisible()
  })

  test('admin sees User Management tab', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('button', { name: /User Management/i })).toBeVisible()
  })

  test('language toggle switches label', async ({ page }) => {
    await page.goto('/dashboard')
    const toggle = page.getByRole('button', { name: /मराठी|English/ })
    const before = await toggle.textContent()
    await toggle.click()
    await expect(toggle).not.toHaveText(before ?? '')
  })

  test('logout returns to login', async ({ page }) => {
    await page.goto('/dashboard')
    await page.getByRole('button', { name: /Logout|लॉगआउट/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
