#!/usr/bin/env tsx

/**
 * Environment Check Script
 * Verifies that all required Google Sheets environment variables are set
 */

import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

function checkEnvironment() {
  console.log('🔍 Checking Google Sheets Environment Configuration...\n')

  const requiredVars = [
    'GOOGLE_SHEETS_ID',
    'GOOGLE_SERVICE_ACCOUNT_KEY',
    'NEXTAUTH_SECRET',
    'DEFAULT_ADMIN_EMAIL',
    'DEFAULT_ADMIN_PASSWORD'
  ]

  let allGood = true

  for (const varName of requiredVars) {
    const value = process.env[varName]
    
    if (!value) {
      console.log(`❌ Missing: ${varName}`)
      allGood = false
    } else if (varName === 'GOOGLE_SERVICE_ACCOUNT_KEY') {
      try {
        const parsed = JSON.parse(value)
        if (parsed.type === 'service_account' && parsed.client_email && parsed.private_key) {
          console.log(`✅ ${varName}: Valid service account JSON`)
        } else {
          console.log(`⚠️  ${varName}: Invalid service account JSON format`)
          allGood = false
        }
      } catch (error) {
        console.log(`❌ ${varName}: Invalid JSON format`)
        allGood = false
      }
    } else if (varName === 'GOOGLE_SHEETS_ID') {
      if (value.length > 20 && !value.includes('your-')) {
        console.log(`✅ ${varName}: ${value}`)
      } else {
        console.log(`⚠️  ${varName}: Looks like placeholder value`)
        allGood = false
      }
    } else {
      console.log(`✅ ${varName}: Set`)
    }
  }

  console.log('\n' + '='.repeat(50))
  
  if (allGood) {
    console.log('🎉 All environment variables are properly configured!')
    console.log('✅ You can now run: npm run setup:sheets')
  } else {
    console.log('❌ Please fix the missing/invalid environment variables')
    console.log('\n📋 Next Steps:')
    console.log('1. Create .env file in project root')
    console.log('2. Follow GOOGLE_SHEETS_SETUP.md guide')
    console.log('3. Set up Google Cloud Project and Service Account')
    console.log('4. Update GOOGLE_SERVICE_ACCOUNT_KEY with actual JSON')
  }
}

checkEnvironment()
