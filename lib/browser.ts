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
import fs from 'fs/promises'
import { existsSync, readdirSync, symlinkSync } from 'fs'
import path from 'node:path'

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

/**
 * @sparticuz/chromium only extracts `aws.tar.br` (NSS/NSPR and related `.so`
 * files under `/tmp/aws/lib`) when `isRunningInAwsLambda()` is true. That
 * check requires `AWS_EXECUTION_ENV` to match /^AWS_Lambda_nodejs/, which
 * Vercel and several hosts do not set. Without that tarball, Chromium fails at
 * launch with missing libnss3 / libnspr4.
 *
 * Set the env **before** the first dynamic `import('@sparticuz/chromium')` so
 * the package's top-level code prepends `/tmp/aws/lib` to `LD_LIBRARY_PATH` and
 * `executablePath()` inflates the AWS bundle.
 */
function ensureSparticuzAwsBundle(): void {
  if (process.env.NODE_ENV !== 'production') return
  const cur = process.env.AWS_EXECUTION_ENV ?? ''
  if (/^AWS_Lambda_nodejs/.test(cur)) return
  process.env.AWS_EXECUTION_ENV = 'AWS_Lambda_nodejs20.x'
  console.log('[browser] Set AWS_EXECUTION_ENV so @sparticuz/chromium extracts aws.tar.br')
}

/**
 * Default extract dir for aws.tar.br (NSS .so next to inflated chromium).
 * Same as path.join(path.dirname(executablePath), 'aws', 'lib') when exe is /tmp/chromium.
 * Note: setting LD_LIBRARY_PATH only to path.dirname(executablePath) (/tmp) does *not*
 * expose these libs — they live under aws/lib/, not beside the binary.
 */
const AWS_LIB_DIR = '/tmp/aws/lib'

function awsLibDirFromExecutable(executablePath: string): string {
  return path.join(path.dirname(executablePath), 'aws', 'lib')
}
const SYSTEM_LIB_DIRS = [
  '/usr/lib64',
  '/lib64',
  '/usr/lib/x86_64-linux-gnu',
  '/lib/x86_64-linux-gnu',
  '/usr/lib',
]
const OS_NSS_BRIDGE_BASES = ['libnspr4', 'libplc4', 'libplds4', 'libsmime3', 'libssl3'] as const

function bundledNssDir(): string {
  return path.join(process.cwd(), 'lib', 'serverless-nss')
}

/** Vendored from amazonlinux:2023 (x86_64) — Vercel Node 20/22 images omit these libraries. */
function resolveBundledNssDir(): string | null {
  const dir = bundledNssDir()
  if (!existsSync(dir)) return null
  if (!existsSync(path.join(dir, 'libnspr4.so'))) return null
  return dir
}

function findSystemSharedObject(baseName: string): string | null {
  for (const dir of SYSTEM_LIB_DIRS) {
    const exact = path.join(dir, `${baseName}.so`)
    if (existsSync(exact)) return exact
  }
  const candidates: string[] = []
  for (const dir of SYSTEM_LIB_DIRS) {
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      continue
    }
    for (const name of entries) {
      if (name === `${baseName}.so` || name.startsWith(`${baseName}.so.`)) {
        candidates.push(path.join(dir, name))
      }
    }
  }
  if (candidates.length === 0) return null
  candidates.sort((a, b) => b.length - a.length)
  return candidates[0]
}

/**
 * Copy NSPR/NSS deps into /tmp/aws/lib so DT_NEEDED resolves alongside bundled libnss3.so.
 * Prefer files from lib/serverless-nss; else symlinks from OS paths (versioned OK as target).
 */
function bridgeOsLibsIntoAwsBundle(bundledDir: string | null, awsLibDir: string): void {
  if (!existsSync(awsLibDir)) return
  for (const base of OS_NSS_BRIDGE_BASES) {
    const dest = path.join(awsLibDir, `${base}.so`)
    try {
      if (existsSync(dest)) continue
      const vendored = bundledDir ? path.join(bundledDir, `${base}.so`) : null
      const src =
        vendored && existsSync(vendored)
          ? vendored
          : findSystemSharedObject(base)
      if (!src) {
        console.warn(`[browser] Missing ${base}.so (no vendored or system libs)`)
        continue
      }
      symlinkSync(src, dest)
      console.log(`[browser] NSS bridge: ${dest} -> ${src}`)
    } catch (e) {
      console.warn(`[browser] NSS bridge failed for ${base}`, e)
    }
  }
}

function productionLibraryPath(
  bundledDir: string | null,
  executablePath: string
): string {
  const awsLib = awsLibDirFromExecutable(executablePath)
  const parts = [
    bundledDir,
    awsLib,
    AWS_LIB_DIR,
    path.dirname(executablePath),
    '/usr/lib64',
    '/lib64',
    '/usr/lib/x86_64-linux-gnu',
    '/lib/x86_64-linux-gnu',
    process.env.LD_LIBRARY_PATH,
  ].filter(Boolean) as string[]
  const ordered: string[] = []
  for (const seg of parts.join(':').split(':')) {
    if (!seg || ordered.includes(seg)) continue
    ordered.push(seg)
  }
  return ordered.join(':')
}

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
  // Dynamic import so `ensureSparticuzAwsBundle()` runs before the package
  // evaluates (static import would load chromium before we could set
  // AWS_EXECUTION_ENV). See ensureSparticuzAwsBundle().
  if (isProduction) {
    ensureSparticuzAwsBundle()
    const chromium = (await import('@sparticuz/chromium')).default
    const executablePath = await chromium.executablePath()
    const awsLib = awsLibDirFromExecutable(executablePath)
    const bundled = resolveBundledNssDir()
    if (!bundled) {
      console.warn(
        '[browser] lib/serverless-nss not found or incomplete — NSPR/NSS copy from amazonlinux:2023 required for minimal hosts'
      )
    }
    bridgeOsLibsIntoAwsBundle(bundled, awsLib)
    const launchEnv = {
      ...process.env,
      // Force loader paths: bundled NSPR, aws.tar.br NSS, binary dir (Gemini-style), then OS.
      LD_LIBRARY_PATH: productionLibraryPath(bundled, executablePath),
    }
    browserInstance = await puppeteer.launch({
      env: launchEnv,
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
