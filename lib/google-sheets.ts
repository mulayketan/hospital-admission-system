import { randomUUID } from 'crypto'
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
  TPA: 'TPAList',
  INSURANCE_COMPANIES: 'InsuranceList',
  MEDICINES: 'Medicines',
  INVESTIGATIONS: 'Investigations',
  PROGRESS_REPORT: 'ProgressReport',
  NURSING_NOTES: 'NursingNotes',
  NURSING_CHART: 'NursingChart',
  DRUG_ORDERS: 'DrugOrders',
  PATIENT_ADVICE: 'PatientAdvice',
} as const

// Initialize Google Sheets client
let sheetsClient: any = null

export const initSheetsClient = () => {
  if (sheetsClient) return sheetsClient

  try {
    // Parse the service account key from environment variable.
    // Some local env files may contain a private_key with literal newlines,
    // which breaks JSON.parse with "Bad control character".
    const rawServiceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}'
    const parseServiceAccountKey = (raw: string) => {
      try {
        return JSON.parse(raw)
      } catch {
        // Normalize only private_key value by escaping literal newlines.
        const normalized = raw.replace(
          /"private_key"\s*:\s*"([\s\S]*?)"(\s*,\s*"client_email")/,
          (_match, privateKey, suffix) =>
            `"private_key":"${String(privateKey)
              .replace(/\r\n/g, '\n')
              .replace(/\n/g, '\\n')}"${suffix}`
        )
        return JSON.parse(normalized)
      }
    }
    const serviceAccountKey = parseServiceAccountKey(rawServiceAccountKey)
    
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

/** 429 / 503 from Sheets — often burst "per minute" quota; short backoff helps. */
function isSheetsTransientLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { code?: number; status?: number; response?: { status?: number } }
  const status = e.response?.status ?? e.code ?? e.status
  return status === 429 || status === 503
}

function sheetsBackoffMs(attempt: number): number {
  const base = 1200 * 2 ** (attempt - 1)
  return Math.min(40_000, base + Math.random() * 400)
}

async function withSheetsQuotaRetries<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const maxAttempts = 5
  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastError = e
      if (!isSheetsTransientLimitError(e) || attempt === maxAttempts) {
        throw e
      }
      const wait = sheetsBackoffMs(attempt)
      console.warn(
        `[google-sheets] ${label}: rate/quota limit (attempt ${attempt}/${maxAttempts}), retry in ${Math.round(wait)}ms`
      )
      await new Promise((r) => setTimeout(r, wait))
    }
  }
  throw lastError
}

// Generic function to read data from a sheet
export const readSheet = async (sheetName: string, range?: string): Promise<any[][]> => {
  const sheets = initSheetsClient()
  
  try {
    console.debug(`Reading sheet ${sheetName}${range ? ` with range ${range}` : ''}...`)
    const startTime = Date.now()

    const response = await withSheetsQuotaRetries(`read ${sheetName}`, async () => {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Google Sheets API timeout after 25 seconds')), 25000)
      })
      const apiPromise = sheets.spreadsheets.values.get({
        spreadsheetId: getSpreadsheetId(),
        range: range ? `${sheetName}!${range}` : sheetName,
      })
      return await Promise.race([apiPromise, timeoutPromise])
    })

    const duration = Date.now() - startTime
    console.debug(`Sheet ${sheetName} read completed in ${duration}ms`)
    
    return response.data.values || []
  } catch (error) {
    console.error(`Error reading sheet ${sheetName}:`, error)
    throw error
  }
}

/**
 * Sanitizes a user-supplied string before writing to Google Sheets.
 * Strings that start with =, +, -, @, TAB, or CR are prefixed with a single
 * quote so Google Sheets does not evaluate them as formulas when the sheet is
 * viewed in a browser or exported to CSV/Excel.
 * Apply this to all free-text fields: doctorNotes, treatment, diagnosis,
 * notes, drugName, investigationName, reportNotes, etc.
 */
export const sanitizeSheetValue = (value: string): string => {
  if (/^[=+\-@\t\r]/.test(value)) return `'${value}`
  return value
}

// Generic function to write data to a sheet
// Note: valueInputOption='RAW' is intentional — it prevents Sheets from evaluating
// user-supplied strings starting with '=' as formulas (formula injection control).
// Never switch to 'USER_ENTERED' without sanitizing inputs first.
export const writeSheet = async (sheetName: string, range: string, values: any[][]): Promise<void> => {
  const sheets = initSheetsClient()
  
  try {
    await withSheetsQuotaRetries(`update ${sheetName}`, () =>
      sheets.spreadsheets.values.update({
        spreadsheetId: getSpreadsheetId(),
        range: `${sheetName}!${range}`,
        valueInputOption: 'RAW',
        requestBody: {
          values,
        },
      })
    )
  } catch (error) {
    console.error(`Error writing to sheet ${sheetName}:`, error)
    throw error
  }
}

// Function to append data to a sheet
export const appendSheet = async (sheetName: string, values: any[][]): Promise<void> => {
  const sheets = initSheetsClient()
  
  try {
    await withSheetsQuotaRetries(`append ${sheetName}`, () =>
      sheets.spreadsheets.values.append({
        spreadsheetId: getSpreadsheetId(),
        range: sheetName,
        valueInputOption: 'RAW',
        requestBody: {
          values,
        },
      })
    )
  } catch (error) {
    console.error(`Error appending to sheet ${sheetName}:`, error)
    throw error
  }
}

// Function to clear a range in a sheet
export const clearSheet = async (sheetName: string, range?: string): Promise<void> => {
  const sheets = initSheetsClient()
  
  try {
    await withSheetsQuotaRetries(`clear ${sheetName}`, () =>
      sheets.spreadsheets.values.clear({
        spreadsheetId: getSpreadsheetId(),
        range: range ? `${sheetName}!${range}` : sheetName,
      })
    )
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
  const endCol = columnIndexToLetter(values.length - 1)
  const range = `A${rowNumber}:${endCol}${rowNumber}`
  await writeSheet(sheetName, range, [values])
}

// Function to delete a row (by clearing it)
export const deleteRow = async (sheetName: string, rowNumber: number): Promise<void> => {
  const sheets = initSheetsClient()
  
  try {
    await withSheetsQuotaRetries(`batchUpdate deleteRow ${sheetName}`, async () => {
      const sheetId = await getSheetId(sheetName)
      return sheets.spreadsheets.batchUpdate({
        spreadsheetId: getSpreadsheetId(),
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rowNumber - 1,
                endIndex: rowNumber
              }
            }
          }]
        }
      })
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

// Utility function to generate collision-resistant unique IDs
export const generateId = (): string => randomUUID()

/**
 * Converts a 0-based column index to an A1-notation column letter.
 * Handles columns beyond Z correctly (e.g. 26 → AA, 27 → AB, 52 → BA).
 */
export const columnIndexToLetter = (index: number): string => {
  let letter = ''
  let n = index + 1
  while (n > 0) {
    const remainder = (n - 1) % 26
    letter = String.fromCharCode(65 + remainder) + letter
    n = Math.floor((n - 1) / 26)
  }
  return letter
}

/**
 * Returns the current time as an ISO 8601 string with IST offset (+05:30).
 * Use this for all createdAt / updatedAt fields stored in Google Sheets.
 */
export const nowIST = (): string => {
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  const istDate = new Date(now.getTime() + istOffset)
  return istDate.toISOString().replace('Z', '+05:30')
}
