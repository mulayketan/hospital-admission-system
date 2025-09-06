#!/bin/bash

# Vercel Environment Variables Setup Script
# Run this script to set up environment variables for your Vercel deployment

echo "🔧 Setting up Vercel Environment Variables"
echo "=========================================="

echo ""
echo "📝 You'll need to provide the following values:"
echo "1. Google Sheets ID (from your Google Sheet URL)"
echo "2. Google Service Account Key (JSON from Google Cloud)"
echo "3. NextAuth Secret (random string for session encryption)"
echo "4. Admin credentials"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Login to Vercel if not already logged in
echo "🔐 Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    echo "🔑 Please login to Vercel:"
    vercel login
fi

echo ""
echo "🔧 Setting environment variables..."
echo "Note: You can also set these in the Vercel Dashboard at:"
echo "https://vercel.com/dashboard → Your Project → Settings → Environment Variables"
echo ""

# Set environment variables using Vercel CLI
echo "Setting GOOGLE_SHEETS_ID..."
echo "Enter your Google Sheets ID (from the URL):"
vercel env add GOOGLE_SHEETS_ID

echo ""
echo "Setting GOOGLE_SERVICE_ACCOUNT_KEY..."
echo "Enter your complete Google Service Account JSON key:"
vercel env add GOOGLE_SERVICE_ACCOUNT_KEY

echo ""
echo "Setting NEXTAUTH_SECRET..."
echo "Enter a random secret for NextAuth (or press Enter for auto-generated):"
read -p "NextAuth Secret: " nextauth_secret
if [ -z "$nextauth_secret" ]; then
    nextauth_secret=$(openssl rand -base64 32)
    echo "Generated secret: $nextauth_secret"
fi
echo "$nextauth_secret" | vercel env add NEXTAUTH_SECRET

echo ""
echo "Setting NEXTAUTH_URL..."
echo "Enter your production URL (e.g., https://your-app.vercel.app):"
vercel env add NEXTAUTH_URL

echo ""
echo "Setting DEFAULT_ADMIN_EMAIL..."
echo "Enter default admin email:"
vercel env add DEFAULT_ADMIN_EMAIL

echo ""
echo "Setting DEFAULT_ADMIN_PASSWORD..."
echo "Enter default admin password:"
vercel env add DEFAULT_ADMIN_PASSWORD

echo ""
echo "✅ Environment variables setup complete!"
echo ""
echo "🚀 You can now deploy with:"
echo "vercel --prod"
echo ""
echo "📖 For manual setup, see: VERCEL_DEPLOYMENT.md"
