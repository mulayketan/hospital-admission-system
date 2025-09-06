/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize for Vercel deployment
  output: 'standalone',
  
  // Environment variables
  env: {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID,
    GOOGLE_SERVICE_ACCOUNT_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
  },
  
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
  
  // Experimental features for better performance
  experimental: {
    serverComponentsExternalPackages: ['puppeteer'],
  },
}

module.exports = nextConfig
