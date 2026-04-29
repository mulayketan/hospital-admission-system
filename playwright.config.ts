import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'

// Optional: .env.local (local dev), then .env.e2e overrides
loadEnv({ path: path.join(process.cwd(), '.env.local'), quiet: true })
loadEnv({ path: path.join(process.cwd(), '.env.e2e'), quiet: true })

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

/** Set PLAYWRIGHT_SKIP_WEBSERVER=1 when Next is already running (e.g. second terminal + UI mode). */
const skipWebServer = !!process.env.PLAYWRIGHT_SKIP_WEBSERVER

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: path.join(process.cwd(), 'tests/e2e/global-setup.ts'),
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
  ...(skipWebServer
    ? {}
    : {
        webServer: {
          command: 'npm run dev',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          // Next dev logs a lot; `pipe` can fill OS buffers and block the child → "Loading…" forever in UI mode.
          stdout: 'ignore',
          stderr: 'ignore',
          timeout: 180_000,
          env: {
            ...process.env,
            NODE_ENV: 'development',
            // Login/Credentials callbacks must match the dev server origin during E2E.
            NEXTAUTH_URL: process.env.PLAYWRIGHT_NEXTAUTH_URL || process.env.NEXTAUTH_URL || baseURL,
          },
        },
      }),
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
