/** @type {import('next').NextConfig} */
// `output: 'standalone'` is for production (`next build` on Vercel / `next start`). If it
// is always set, `next dev` can fail with ENOENT for prerender-manifest,
// fallback-build-manifest, and server/pages/_document.js in App Router–only projects.
const isDev = process.env.NODE_ENV === 'development'

const nextConfig = {
  ...(!isDev && { output: 'standalone' }),

  // Next.js 15.5+: ensure vendored NSS/NSPR .so files traced into PDF routes; also ship
  // public fonts + logo so readFile in ipd-pdf-generator works on Vercel standalone.
  outputFileTracingIncludes: {
    '/api/patients/[id]/ipd-pdf': [
      './lib/serverless-nss/**/*',
      './lib/ipd-pdf-assets/**/*',
      './public/fonts/**/*',
      './public/images/zh-logo.svg',
    ],
    '/api/patients/[id]/pdf': ['./lib/serverless-nss/**/*', './public/fonts/**/*'],
  },

  // NOTE: Do NOT add server secrets (GOOGLE_SERVICE_ACCOUNT_KEY, NEXTAUTH_SECRET,
  // GOOGLE_SHEETS_ID) to the `env` block here. The `env` block inlines values into
  // client bundles at build time. Server Components and API Routes read process.env
  // directly without any configuration needed.
  // Client-accessible values must use the NEXT_PUBLIC_ prefix instead.

  // Optimize images for Vercel
  images: {
    domains: [],
    unoptimized: false,
  },

  // Webpack configuration for better bundling
  webpack: (config, { isServer }) => {
    // Optimize for serverless functions
    if (isServer) {
      config.externals.push('puppeteer')
    }
    return config
  },

  // External packages for serverless functions
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
}

module.exports = nextConfig
