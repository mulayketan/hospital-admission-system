import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'

// Optional: .env.local (local dev), then .env.e2e overrides
loadEnv({ path: path.join(process.cwd(), '.env.local') })
loadEnv({ path: path.join(process.cwd(), '.env.e2e') })

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      // Login/Credentials callbacks must match the dev server origin during E2E.
      NEXTAUTH_URL: process.env.PLAYWRIGHT_NEXTAUTH_URL || process.env.NEXTAUTH_URL || baseURL,
    },
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium-authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(process.cwd(), 'playwright/.auth/admin.json'),
      },
      dependencies: ['setup'],
      testIgnore: [/unauth\//, /auth\.setup\.ts/],
    },
    {
      name: 'chromium-guest',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /unauth\/.*\.spec\.ts/,
    },
  ],
})
