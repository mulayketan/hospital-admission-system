/**
 * Shared Puppeteer browser singleton.
 * Imported by both lib/pdf-generator-final.ts and lib/ipd-pdf-generator.ts so
 * only one Chromium process is spawned regardless of which PDF route is called.
 *
 * Strategy:
 *  - Production (Vercel / Lambda): use @sparticuz/chromium (serverless Chromium)
 *  - Local dev: use system Chrome with macOS-safe minimal flags
 */
import puppeteer from 'puppeteer-core'
import type { Browser } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import fs from 'fs/promises'

let browserInstance: Browser | null = null
let browserLastUsed = 0
const BROWSER_TIMEOUT = 2 * 60 * 1000 // 2 minutes idle before recycling

/** Flags needed everywhere (serverless Chromium already supplies its own set). */
const BASE_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--disable-web-security',
  '--font-render-hinting=none',
  '--enable-font-antialiasing',
  '--force-color-profile=srgb',
  '--disable-extensions',
]

/** Extra flags only safe/needed on Linux (Lambda/Vercel). */
const LINUX_ARGS = [
  '--disable-dev-shm-usage',
  '--no-zygote',
  '--disable-gpu',
  '--single-process',
]

const pathExists = (p: string) => fs.access(p).then(() => true).catch(() => false)

const isProduction = process.env.NODE_ENV === 'production'

/** Returns a running (or recycled) browser instance. */
export const getBrowser = async (): Promise<Browser> => {
  const now = Date.now()

  // Reuse healthy cached instance
  if (browserInstance && now - browserLastUsed < BROWSER_TIMEOUT) {
    try {
      await browserInstance.version()
      browserLastUsed = now
      return browserInstance
    } catch {
      try { await browserInstance.close() } catch {}
      browserInstance = null
    }
  }

  // ── Production path: @sparticuz/chromium 116 (Chrome 116) ────────────────
  // Chrome 116 is the highest version compatible with the libnss3.so.3d (v3.53)
  // shipped by Vercel's Amazon Linux 2 Lambda runtime. Chrome 119+ requires
  // libnss3 >= 3.79 which AL2 does not provide, causing a hard crash on launch.
  if (isProduction) {
    const executablePath = await chromium.executablePath()
    browserInstance = await puppeteer.launch({
      args: [...chromium.args, ...BASE_ARGS, '--disable-features=VizDisplayCompositor'],
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    })
    browserLastUsed = Date.now()
    return browserInstance
  }

  // ── Local dev path: system Chrome / Chromium ──────────────────────────────
  let localPath: string | undefined

  const envPath = process.env.CHROME_EXECUTABLE_PATH
  if (envPath && await pathExists(envPath)) {
    localPath = envPath
  }

  if (!localPath) {
    const candidates =
      process.platform === 'darwin'
        ? [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
            '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
          ]
        : process.platform === 'win32'
        ? [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          ]
        : ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium']

    for (const p of candidates) {
      if (await pathExists(p)) { localPath = p; break }
    }
  }

  if (!localPath) {
    throw new Error(
      'Chrome executable not found for PDF generation. ' +
      'Install Google Chrome or set the CHROME_EXECUTABLE_PATH environment variable.'
    )
  }

  // On macOS use minimal flags — Linux flags like --no-zygote crash macOS Chrome
  const platformArgs =
    process.platform === 'linux' ? [...BASE_ARGS, ...LINUX_ARGS] : BASE_ARGS

  browserInstance = await puppeteer.launch({
    executablePath: localPath,
    headless: true,
    args: platformArgs,
    ignoreHTTPSErrors: true,
    // Give Chrome extra time on first launch on slower machines
    timeout: 60_000,
  })

  browserLastUsed = Date.now()
  return browserInstance
}
