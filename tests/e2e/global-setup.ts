import type { FullConfig } from '@playwright/test'

/**
 * When reusing an existing dev server (PLAYWRIGHT_SKIP_WEBSERVER=1), fail fast if the
 * port is wedged: Next sometimes accepts TCP but never completes HTTP (curl hangs →
 * Playwright sees net::ERR_ABORTED / timeouts).
 */
export default async function globalSetup(_config: FullConfig) {
  if (!process.env.PLAYWRIGHT_SKIP_WEBSERVER) return

  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
  const url = new URL('/login', base).href

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 10_000)

  try {
    const res = await fetch(url, { signal: ac.signal, redirect: 'manual' })
    if (res.status >= 400) {
      throw new Error(`GET /login → HTTP ${res.status}`)
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(
      `Playwright: dev server not responding at ${base} (PLAYWRIGHT_SKIP_WEBSERVER=1).\n` +
        `Start or restart \`npm run dev\`, ensure ${base} matches the listening port, then retry.\n` +
        `(${msg})`
    )
  } finally {
    clearTimeout(timer)
  }
}
