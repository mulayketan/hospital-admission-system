import { google } from 'googleapis'
import { JWT } from 'google-auth-library'

// Google Sheets configuration
const getSpreadsheetId = () => {
  const id = process.env.GOOGLE_SHEETS_ID
  if (!id) {
    throw new Error('GOOGLE_SHEETS_ID environment variable is not set')
  }
  return id
}
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

// Sheet names (tabs in the Google Sheet)
export const SHEET_NAMES = {
  USERS: 'Users',
  PATIENTS: 'Patients', 
  WARD_CHARGES: 'WardCharges',
  ADMISSIONS: 'Admissions',
  TPA: 'TPAList',
  INSURANCE_COMPANIES: 'InsuranceList'
} as const

// Initialize Google Sheets client
let sheetsClient: any = null

export const initSheetsClient = () => {
  if (sheetsClient) return sheetsClient

  try {
    // Parse the service account key from environment variable
    const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}')
    
    const auth = new JWT({
      email: serviceAccountKey.client_email,
      key: serviceAccountKey.private_key,
      scopes: SCOPES,
    })

    sheetsClient = google.sheets({ version: 'v4', auth })
    return sheetsClient
  } catch (error) {
    console.error('Failed to initialize Google Sheets client:', error)
    throw new Error('Google Sheets configuration error')
  }
}

// Generic function to read data from a sheet
export const readSheet = async (sheetName: string, range?: string): Promise<any[][]> => {
  const sheets = initSheetsClient()
  
  try {
    console.log(`Reading sheet ${sheetName}${range ? ` with range ${range}` : ''}...`)
    const startTime = Date.now()
    
    // Add timeout wrapper
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Google Sheets API timeout after 25 seconds')), 25000)
    })
    
    const apiPromise = sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range: range ? `${sheetName}!${range}` : sheetName,
    })
    
    const response = await Promise.race([apiPromise, timeoutPromise])
    const duration = Date.now() - startTime
    console.log(`Sheet ${sheetName} read completed in ${duration}ms`)
    
    return response.data.values || []
  } catch (error) {
    console.error(`Error reading sheet ${sheetName}:`, error)
    throw error
  }
}

// Generic function to write data to a sheet
export const writeSheet = async (sheetName: string, range: string, values: any[][]): Promise<void> => {
  const sheets = initSheetsClient()
  
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: getSpreadsheetId(),
      range: `${sheetName}!${range}`,
      valueInputOption: 'RAW',
      requestBody: {
        values,
      },
    })
  } catch (error) {
    console.error(`Error writing to sheet ${sheetName}:`, error)
    throw error
  }
}

// Function to append data to a sheet
export const appendSheet = async (sheetName: string, values: any[][]): Promise<void> => {
  const sheets = initSheetsClient()
  
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: getSpreadsheetId(),
      range: sheetName,
      valueInputOption: 'RAW',
      requestBody: {
        values,
      },
    })
  } catch (error) {
    console.error(`Error appending to sheet ${sheetName}:`, error)
    throw error
  }
}

// Function to clear a range in a sheet
export const clearSheet = async (sheetName: string, range?: string): Promise<void> => {
  const sheets = initSheetsClient()
  
  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: getSpreadsheetId(),
      range: range ? `${sheetName}!${range}` : sheetName,
    })
  } catch (error) {
    console.error(`Error clearing sheet ${sheetName}:`, error)
    throw error
  }
}

// Function to find a row by a specific column value
export const findRowByValue = async (sheetName: string, searchValue: string, searchColumn: number = 0): Promise<number | null> => {
  const data = await readSheet(sheetName)
  
  for (let i = 0; i < data.length; i++) {
    if (data[i][searchColumn] === searchValue) {
      return i + 1 // Return 1-based row number for Google Sheets
    }
  }
  
  return null
}

// Function to update a specific row
export const updateRow = async (sheetName: string, rowNumber: number, values: any[]): Promise<void> => {
  const range = `A${rowNumber}:${String.fromCharCode(65 + values.length - 1)}${rowNumber}`
  await writeSheet(sheetName, range, [values])
}

// Function to delete a row (by clearing it)
export const deleteRow = async (sheetName: string, rowNumber: number): Promise<void> => {
  const sheets = initSheetsClient()
  
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: getSpreadsheetId(),
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: await getSheetId(sheetName),
              dimension: 'ROWS',
              startIndex: rowNumber - 1,
              endIndex: rowNumber
            }
          }
        }]
      }
    })
  } catch (error) {
    console.error(`Error deleting row ${rowNumber} from sheet ${sheetName}:`, error)
    throw error
  }
}

// Helper function to get sheet ID by name
const getSheetId = async (sheetName: string): Promise<number> => {
  const sheets = initSheetsClient()
  
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: getSpreadsheetId(),
    })
    
    const sheet = response.data.sheets?.find((s: any) => s.properties?.title === sheetName)
    return sheet?.properties?.sheetId || 0
  } catch (error) {
    console.error(`Error getting sheet ID for ${sheetName}:`, error)
    throw error
  }
}

// Utility function to generate unique IDs
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}
