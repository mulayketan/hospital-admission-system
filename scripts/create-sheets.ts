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

  const requiredSheets = [
    'Users', 'Patients', 'WardCharges', 'Admissions',
    'Medicines', 'Investigations',
    'ProgressReport', 'NursingNotes', 'NursingChart', 'DrugOrders', 'PatientAdvice',
  ]
  const sheetsToCreate = requiredSheets.filter(name => !existingSheets.includes(name))

  if (sheetsToCreate.length === 0) {
    console.log('✅ All required sheets already exist!')
  } else {
    console.log('📝 Creating sheets:', sheetsToCreate)

    const requests = sheetsToCreate.map(sheetName => ({
      addSheet: { properties: { title: sheetName } }
    }))

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests }
    })

    console.log('✅ Successfully created sheet tabs!')
  }

  // ---------------------------------------------------------------------------
  // Write headers to IPD sheets (idempotent — only writes if sheet is empty)
  // ---------------------------------------------------------------------------

  const day36Columns = Array.from({ length: 36 }, (_, i) => `day${i + 1}`)

  const ipdSheetHeaders: Record<string, string[]> = {
    Medicines: [
      'id', 'name', 'category', 'defaultDose', 'defaultFrequency', 'defaultRoute',
      'createdAt', 'updatedAt',
    ],
    Investigations: [
      'id', 'name', 'category', 'createdAt', 'updatedAt',
    ],
    ProgressReport: [
      'id', 'patientId', 'ipdNo', 'diagnosis', 'dateTime', 'isAdmissionNote',
      'doctorNotes', 'treatment', 'staffName', 'doctorSignature',
      'createdAt', 'updatedAt',
    ],
    NursingNotes: [
      'id', 'patientId', 'ipdNo', 'dateTime', 'notes', 'treatment',
      'staffName', 'isHandover', 'createdAt', 'updatedAt',
    ],
    NursingChart: [
      'id', 'patientId', 'ipdNo', 'dateTime', 'temp', 'pulse', 'bp', 'spo2',
      'bsl', 'ivFluids', 'staffName', 'createdAt', 'updatedAt',
    ],
    DrugOrders: [
      'id', 'patientId', 'ipdNo', 'drugName', 'drugAllergy', 'frequency', 'route',
      'startDate', 'ward', 'bedNo',
      ...day36Columns,
      'medOfficerSignature', 'createdAt', 'updatedAt',
    ],
    PatientAdvice: [
      'id', 'patientId', 'ipdNo', 'dateTime', 'category', 'investigationName',
      'notes', 'advisedBy', 'status', 'reportNotes', 'createdAt', 'updatedAt',
    ],
  }

  for (const [sheetName, headers] of Object.entries(ipdSheetHeaders)) {
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:A1`,
    })
    const firstCell = existing.data.values?.[0]?.[0]
    if (!firstCell) {
      console.log(`📋 Writing headers to ${sheetName}...`)
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      })
    } else {
      console.log(`⏭️  ${sheetName} already has data in A1 — skipping header write`)
    }
  }

  // ---------------------------------------------------------------------------
  // Pre-populate Medicines (16 drugs from §2.4)
  // ---------------------------------------------------------------------------
  const medicinesSheet = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Medicines!A2:A2',
  })
  if (!medicinesSheet.data.values?.[0]?.[0]) {
    console.log('💊 Pre-populating Medicines tab...')
    const now = new Date().toISOString()
    const medicines = [
      ['m01', 'INJ PAN', 'INJ', '40mg', 'BD', 'IV', now, now],
      ['m02', 'INJ C-ONE SB', 'INJ', '1.5gm', 'BD', 'IV', now, now],
      ['m03', 'INJ DEXA', 'INJ', '4mg', 'TDS', 'IV', now, now],
      ['m04', 'IV PACIRNOL', 'IV', '1gm', 'BD', 'IV', now, now],
      ['m05', 'TAB ETODONOL ER', 'TAB', '300mg', 'BD', 'Oral (TAB)', now, now],
      ['m06', 'TAB HCQS', 'TAB', '300mg', '1-0-1', 'Oral (TAB)', now, now],
      ['m07', 'SYP MEDICAINE GEL', 'SYP', '2tsp', 'TDS', 'Oral (SYP)', now, now],
      ['m08', 'TAB MAHAYOGRAJ GUGGAL', 'TAB', '', '2-2-2', 'Oral (TAB)', now, now],
      ['m09', 'DNS', 'IV', '500ml', '', 'IV', now, now],
      ['m10', 'NS (Normal Saline)', 'IV', '500ml', '', 'IV', now, now],
      ['m11', 'INJ CALCIUM GLUCONATE', 'INJ', '', '', 'IV', now, now],
      ['m12', 'INJ FEBRINIL', 'INJ', '2 amp', '', 'IV', now, now],
      ['m13', 'INJ KITCOFOL', 'INJ', '', '', 'IV', now, now],
      ['m14', 'SYP CADILASE', 'SYP', '15ml', '', 'Oral (SYP)', now, now],
      ['m15', 'TAB DROTIK MF', 'TAB', '', '', 'Oral (TAB)', now, now],
      ['m16', 'INJ NC95', 'INJ', '', '', 'IV', now, now],
    ]
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Medicines!A2',
      valueInputOption: 'RAW',
      requestBody: { values: medicines },
    })
    console.log('✅ Medicines pre-populated')
  }

  // ---------------------------------------------------------------------------
  // Pre-populate Investigations (sample data from §4.2)
  // ---------------------------------------------------------------------------
  const investigationsSheet = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Investigations!A2:A2',
  })
  if (!investigationsSheet.data.values?.[0]?.[0]) {
    console.log('🔬 Pre-populating Investigations tab...')
    const now = new Date().toISOString()
    const investigations = [
      // Blood Test
      ['i01', 'CBC', 'Blood Test', now, now],
      ['i02', 'LFT', 'Blood Test', now, now],
      ['i03', 'KFT', 'Blood Test', now, now],
      ['i04', 'HbA1c', 'Blood Test', now, now],
      ['i05', 'CRP', 'Blood Test', now, now],
      ['i06', 'ESR', 'Blood Test', now, now],
      ['i07', 'RA Factor', 'Blood Test', now, now],
      ['i08', 'Blood Culture', 'Blood Test', now, now],
      ['i09', 'Blood Sugar F/PP', 'Blood Test', now, now],
      ['i10', 'Electrolytes', 'Blood Test', now, now],
      ['i11', 'TFT', 'Blood Test', now, now],
      ['i12', 'Lipid Profile', 'Blood Test', now, now],
      // Urine Test
      ['i13', 'Urine R/M', 'Urine Test', now, now],
      // X-Ray
      ['i14', 'Chest PA', 'X-Ray', now, now],
      ['i15', 'Abdomen', 'X-Ray', now, now],
      ['i16', 'LS Spine', 'X-Ray', now, now],
      ['i17', 'Knee', 'X-Ray', now, now],
      // CT Scan
      ['i18', 'Brain', 'CT Scan', now, now],
      ['i19', 'Chest', 'CT Scan', now, now],
      ['i20', 'Abdomen', 'CT Scan', now, now],
      ['i21', 'LS Spine', 'CT Scan', now, now],
      // MRI
      ['i22', 'Brain', 'MRI', now, now],
      ['i23', 'Lumbar Spine', 'MRI', now, now],
      ['i24', 'Knee', 'MRI', now, now],
      ['i25', 'Shoulder', 'MRI', now, now],
      // USG
      ['i26', 'Abdomen', 'USG', now, now],
      ['i27', 'Pelvis', 'USG', now, now],
      ['i28', 'Whole Abdomen', 'USG', now, now],
      // ECG
      ['i29', 'ECG', 'ECG', now, now],
      // Echo
      ['i30', 'Echocardiography', 'Echo', now, now],
      ['i31', '2D Echo', 'Echo', now, now],
      // Other
      ['i32', 'Spirometry', 'Other', now, now],
    ]
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Investigations!A2',
      valueInputOption: 'RAW',
      requestBody: { values: investigations },
    })
    console.log('✅ Investigations pre-populated')
  }

  console.log('🎯 Sheet setup complete. You can now run: npm run setup:sheets')

  } catch (error) {
    console.error('❌ Error creating sheet tabs:', error)
    throw error
  }
}

createSheetTabs()
