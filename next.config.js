/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize for Vercel deployment
  output: 'standalone',

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
