import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { test as setup, expect } from '@playwright/test'

const authFile = path.join(process.cwd(), 'playwright/.auth/admin.json')

setup('authenticate as admin', async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL || process.env.DEFAULT_ADMIN_EMAIL
  const password = process.env.E2E_ADMIN_PASSWORD || process.env.DEFAULT_ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error(
      'Playwright auth: set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD or DEFAULT_ADMIN_EMAIL / DEFAULT_ADMIN_PASSWORD (e.g. in .env.local).'
    )
  }

  mkdirSync(path.dirname(authFile), { recursive: true })

  await page.goto('/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard/)

  await page.context().storageState({ path: authFile })
})
