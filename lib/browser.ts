/**
 * Shared Puppeteer browser singleton.
 * Imported by both lib/pdf-generator-final.ts and lib/ipd-pdf-generator.ts so
 * only one Chromium process is spawned regardless of which PDF route is called.
 */
import puppeteer from 'puppeteer-core'
import type { Browser } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import fs from 'fs/promises'

let browserInstance: Browser | null = null
let browserLastUsed = 0
const BROWSER_TIMEOUT = 2 * 60 * 1000 // 2 minutes idle before recycling

const COMMON_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-gpu',
  '--disable-web-security',
  '--font-render-hinting=none',
  '--enable-font-antialiasing',
  '--force-color-profile=srgb',
]

const pathExists = (p: string) => fs.access(p).then(() => true).catch(() => false)

export const getBrowser = async (): Promise<Browser> => {
  const now = Date.now()

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

  try {
    const executablePath = await chromium.executablePath()
    browserInstance = await puppeteer.launch({
      args: [...chromium.args, ...COMMON_ARGS, '--disable-features=VizDisplayCompositor'],
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    })
  } catch {
    let localPath: string | undefined

    const envPath = process.env.CHROME_EXECUTABLE_PATH
    if (envPath && await pathExists(envPath)) localPath = envPath

    if (!localPath) {
      const candidates =
        process.platform === 'darwin'
          ? [
              '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
              '/Applications/Chromium.app/Contents/MacOS/Chromium',
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

    if (!localPath) throw new Error('Chrome executable not found. Set CHROME_EXECUTABLE_PATH.')

    browserInstance = await puppeteer.launch({
      executablePath: localPath,
      headless: true,
      args: COMMON_ARGS,
    })
  }

  browserLastUsed = Date.now()
  return browserInstance
}
