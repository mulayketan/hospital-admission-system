#!/usr/bin/env tsx

/**
 * Script to create the necessary sheet tabs in Google Sheets
 * Run this first before running setup-sheets.ts
 */

import dotenv from 'dotenv'
import { google } from 'googleapis'
import { JWT } from 'google-auth-library'

// Load environment variables
dotenv.config()

const getSpreadsheetId = () => {
  const id = process.env.GOOGLE_SHEETS_ID
  if (!id) {
    throw new Error('GOOGLE_SHEETS_ID environment variable is not set')
  }
  return id
}

const initSheetsClient = () => {
  try {
    const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}')
    
    const auth = new JWT({
      email: serviceAccountKey.client_email,
      key: serviceAccountKey.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    return google.sheets({ version: 'v4', auth })
  } catch (error) {
    console.error('Failed to initialize Google Sheets client:', error)
    throw new Error('Google Sheets configuration error')
  }
}

async function createSheetTabs() {
  console.log('🚀 Creating Google Sheets tabs...')

  const sheets = initSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  try {
    // Get current sheet info
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    })

    console.log('📊 Current spreadsheet:', spreadsheet.data.properties?.title)
    
    const existingSheets = spreadsheet.data.sheets?.map(s => s.properties?.title) || []
    console.log('📋 Existing sheets:', existingSheets)

    const requiredSheets = ['Users', 'Patients', 'WardCharges', 'Admissions']
    const sheetsToCreate = requiredSheets.filter(name => !existingSheets.includes(name))

    if (sheetsToCreate.length === 0) {
      console.log('✅ All required sheets already exist!')
      return
    }

    console.log('📝 Creating sheets:', sheetsToCreate)

    // Create missing sheets
    const requests = sheetsToCreate.map(sheetName => ({
      addSheet: {
        properties: {
          title: sheetName
        }
      }
    }))

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests
      }
    })

    console.log('✅ Successfully created sheet tabs!')
    console.log('🎯 You can now run: npm run setup:sheets')

  } catch (error) {
    console.error('❌ Error creating sheet tabs:', error)
    throw error
  }
}

createSheetTabs()
