import { test, expect } from '@playwright/test'

test.describe('User management (admin)', () => {
  test('shows add user control', async ({ page }) => {
    await page.goto('/dashboard')
    await page.getByRole('button', { name: /User Management/i }).click()
    await expect(page.getByRole('heading', { name: /User Management/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add User' })).toBeVisible()
  })
})
