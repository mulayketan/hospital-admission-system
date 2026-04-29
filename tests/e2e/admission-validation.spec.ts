import { test, expect } from '@playwright/test'

test.describe('Admission form validation', () => {
  test('shows phone validation when too few digits', async ({ page }) => {
    await page.goto('/dashboard')
    await page.getByRole('button', { name: /REGISTRATION CUM ADMISSION/i }).click()

    await page.locator('#ipdNo').fill(`VAL-${Date.now().toString(36)}`)
    await page.locator('#firstName').fill('Val')
    await page.locator('#surname').fill('Phone')
    await page.locator('#nearestRelativeName').fill('Rel')
    await page.locator('#relationToPatient').fill('Friend')
    await page.locator('#phoneNo').fill('12345')
    await page.locator('#address').fill('1 Test Rd')
    await page.locator('#age').fill('40')
    await page.locator('#admittedByDoctor').fill('Dr Test')

    const admissionForm = page.locator('form').filter({ has: page.locator('#ipdNo') })
    await admissionForm.getByRole('button', { name: /^Save$/ }).click()

    await expect(page.getByText(/at least 10/i).first()).toBeVisible({ timeout: 10_000 })
  })
})
