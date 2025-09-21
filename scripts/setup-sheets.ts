#!/usr/bin/env tsx

/**
 * Setup script to initialize Google Sheets with proper structure and default data
 * Run this script after setting up your Google Sheets credentials
 */

import dotenv from 'dotenv'
import { UserModel, PatientModel, WardChargesModel } from '../lib/sheets-models'
import bcrypt from 'bcryptjs'

// Load environment variables
dotenv.config()

async function setupGoogleSheets() {
  console.log('🚀 Setting up Google Sheets structure...')

  // Debug environment variables
  console.log('📋 Environment Check:')
  console.log('- GOOGLE_SHEETS_ID:', process.env.GOOGLE_SHEETS_ID ? '✅ Set' : '❌ Missing')
  console.log('- GOOGLE_SERVICE_ACCOUNT_KEY:', process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? '✅ Set' : '❌ Missing')
  console.log('')

  if (!process.env.GOOGLE_SHEETS_ID) {
    throw new Error('GOOGLE_SHEETS_ID environment variable is not set')
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set')
  }

  try {
    // Initialize Users sheet
    console.log('📊 Setting up Users sheet...')
    await UserModel.initializeSheet()
    
    // Create default admin user
    const adminExists = await UserModel.findByEmail(process.env.DEFAULT_ADMIN_EMAIL || 'admin@hospital.com')
    if (!adminExists) {
      await UserModel.create({
        email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@hospital.com',
        password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
        name: 'Administrator',
        role: 'ADMIN'
      })
      console.log('✅ Default admin user created')
    } else {
      console.log('ℹ️  Admin user already exists')
    }

    // Create default staff user
    const staffExists = await UserModel.findByEmail('staff@hospital.com')
    if (!staffExists) {
      await UserModel.create({
        email: 'staff@hospital.com',
        password: 'staff123',
        name: 'Staff Member',
        role: 'STAFF'
      })
      console.log('✅ Default staff user created')
    } else {
      console.log('ℹ️  Staff user already exists')
    }

    // Initialize Patients sheet
    console.log('📊 Setting up Patients sheet...')
    await PatientModel.initializeSheet()
    
    // Add sample patient
    const samplePatient = await PatientModel.create({
      ipdNo: 'IPD001',
      uhidNo: 'UHID001',
      firstName: 'Ram',
      middleName: 'Vishnu',
      surname: 'Sharma',
      firstNameMarathi: 'राम',
      middleNameMarathi: 'विष्णू',
      surnameMarathi: 'शर्मा',
      phoneNo: '9876543210',
      age: 45,
      sex: 'M',
      address: 'मुंबई, महाराष्ट्र',
      nearestRelativeName: 'सीता शर्मा',
      relationToPatient: 'पत्नी',
      ward: 'GENERAL',
      cashless: false,
      tpa: null,
      insuranceCompany: null,
      other: '',
      admittedByDoctor: 'डॉ. पटेल',
      treatingDoctor: 'डॉ. शाह',
      dateOfAdmission: new Date().toISOString(),
      timeOfAdmission: '10:30 AM',
      dateOfDischarge: null,
      timeOfDischarge: null
    })
    console.log('✅ Sample patient created:', samplePatient.firstName)

    // Initialize Ward Charges sheet
    console.log('📊 Setting up Ward Charges sheet...')
    await WardChargesModel.initializeSheet()
    console.log('✅ Ward charges initialized')

    console.log('\n🎉 Google Sheets setup completed successfully!')
    console.log('\n📋 Summary:')
    console.log('- Users sheet with admin and staff accounts')
    console.log('- Patients sheet with sample patient')
    console.log('- Ward Charges sheet with pricing data')
    console.log('\n🔐 Default Login Credentials:')
    console.log(`Admin: ${process.env.DEFAULT_ADMIN_EMAIL || 'admin@hospital.com'} / ${process.env.DEFAULT_ADMIN_PASSWORD || 'admin123'}`)
    console.log('Staff: staff@hospital.com / staff123')

  } catch (error) {
    console.error('❌ Error setting up Google Sheets:', error)
    process.exit(1)
  }
}

// Run the setup
setupGoogleSheets()
