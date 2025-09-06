#!/bin/bash

# Hospital Admission System - Vercel Deployment Script
# Run this script to prepare and deploy to Vercel

echo "🏥 Hospital Admission System - Vercel Deployment"
echo "================================================"

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
echo "🔐 Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    echo "🔑 Please login to Vercel:"
    vercel login
fi

# Run pre-deployment checks
echo "🔍 Running pre-deployment checks..."

# Check if required files exist
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found!"
    exit 1
fi

if [ ! -f "next.config.js" ]; then
    echo "❌ next.config.js not found!"
    exit 1
fi

if [ ! -f "vercel.json" ]; then
    echo "❌ vercel.json not found!"
    exit 1
fi

echo "✅ Required files found"

# Test build locally
echo "🔨 Testing build locally..."
if npm run build; then
    echo "✅ Build successful"
else
    echo "❌ Build failed. Please fix errors before deploying."
    exit 1
fi

# Check environment variables
echo "🔧 Checking environment variables..."
if [ -f ".env.local" ]; then
    echo "✅ Local environment file found"
else
    echo "⚠️  No .env.local found. Make sure to set environment variables in Vercel Dashboard"
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
echo ""
echo "📝 Make sure you have set these environment variables in Vercel Dashboard:"
echo "   - GOOGLE_SHEETS_ID"
echo "   - GOOGLE_SERVICE_ACCOUNT_KEY"
echo "   - NEXTAUTH_SECRET"
echo "   - NEXTAUTH_URL"
echo "   - DEFAULT_ADMIN_EMAIL"
echo "   - DEFAULT_ADMIN_PASSWORD"
echo ""

read -p "Have you set all environment variables in Vercel Dashboard? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starting deployment..."
    vercel --prod
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 Deployment successful!"
        echo ""
        echo "📋 Post-deployment checklist:"
        echo "   ✅ Test login with admin credentials"
        echo "   ✅ Create a test patient admission"
        echo "   ✅ Generate and download PDF"
        echo "   ✅ Test user management (if admin)"
        echo "   ✅ Verify Google Sheets integration"
        echo ""
        echo "🔗 Your application is now live!"
        echo "   Visit: https://your-app-name.vercel.app"
        echo ""
        echo "📚 For troubleshooting, see: VERCEL_DEPLOYMENT.md"
    else
        echo "❌ Deployment failed. Check the error messages above."
        exit 1
    fi
else
    echo "❌ Please set environment variables in Vercel Dashboard first."
    echo "📖 See VERCEL_DEPLOYMENT.md for detailed instructions."
    exit 1
fi
