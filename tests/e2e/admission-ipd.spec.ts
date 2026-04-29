import { test, expect } from '@playwright/test'

/** End-to-end path: new admission → find patient → IPD shell → optional PDF download. */
test.describe.serial('Admission, patient list, and IPD', () => {
  const suffix = Date.now().toString(36)
  const ipdNo = `PW-${suffix}`
  const surname = `E2E${suffix}`

  test('submits a new admission and lands on Patient Records', async ({ page }) => {
    await page.goto('/dashboard')
    await page.getByRole('button', { name: /REGISTRATION CUM ADMISSION/i }).click()

    await page.locator('#ipdNo').fill(ipdNo)
    await page.locator('#firstName').fill('Playwright')
    await page.locator('#surname').fill(surname)
    await page.locator('#nearestRelativeName').fill('Relative One')
    await page.locator('#relationToPatient').fill('Sibling')
    await page.locator('#phoneNo').fill('9876543210')
    await page.locator('#address').fill('100 E2E Test Street')
    await page.locator('#age').fill('42')
    await page.locator('#admittedByDoctor').fill('Dr Playwright')

    const admissionForm = page.locator('form').filter({ has: page.locator('#ipdNo') })
    await admissionForm.getByRole('button', { name: /^Save$/ }).click()

    await expect(page.getByRole('heading', { name: 'Patient Records' })).toBeVisible({
      timeout: 45_000,
    })
  })

  test('opens IPD workspace from patient search', async ({ page }) => {
    await page.goto('/dashboard')
    await page.getByRole('button', { name: /^Patient Records$/ }).click()
    await page.locator('#search').fill(surname)
    await page.getByRole('button', { name: /^Search$/ }).click()

    await expect(page.getByText(surname).first()).toBeVisible({ timeout: 30_000 })
    await page.getByRole('button', { name: /Open IPD/i }).first().click()

    await expect(page.getByRole('button', { name: /Progress Report/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Nursing Notes/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Nursing Chart/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Drug Orders/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Advice/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Export PDF/i })).toBeVisible()
  })

  test('Export PDF tab downloads combined package', async ({ page }) => {
    test.skip(!!process.env.E2E_SKIP_PDF, 'Set only if PDF generation is unavailable in this environment.')

    test.setTimeout(120_000)

    await page.goto('/dashboard')
    await page.getByRole('button', { name: /^Patient Records$/ }).click()
    await page.locator('#search').fill(surname)
    await page.getByRole('button', { name: /^Search$/ }).click()
    await expect(page.getByText(surname).first()).toBeVisible({ timeout: 30_000 })
    await page.getByRole('button', { name: /Open IPD/i }).first().click()

    await page.getByRole('button', { name: /Export PDF/i }).click()

    const downloadPromise = page.waitForEvent('download', { timeout: 90_000 })
    await page
      .getByRole('button', { name: /Complete IPD Package|संपूर्ण IPD/i })
      .click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })
})
