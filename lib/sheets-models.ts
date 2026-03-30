import bcrypt from 'bcryptjs'
import { 
  readSheet, 
  appendSheet, 
  findRowByValue, 
  updateRow, 
  deleteRow, 
  generateId,
  nowIST,
  sanitizeSheetValue,
  SHEET_NAMES 
} from './google-sheets'

// Type definitions
export interface User {
  id: string
  email: string
  password: string
  name: string
  role: 'ADMIN' | 'STAFF'
  createdAt: string
  updatedAt: string
}

export interface Patient {
  id: string
  ipdNo: string | null
  uhidNo: string | null
  firstName: string
  middleName: string | null
  surname: string
  firstNameMarathi: string | null
  middleNameMarathi: string | null
  surnameMarathi: string | null
  phoneNo: string
  age: number
  sex: 'M' | 'F'
  address: string
  nearestRelativeName: string
  relationToPatient: string
  ward: 'GENERAL' | 'SEMI' | 'SPECIAL_WITHOUT_AC' | 'SPECIAL_WITH_AC_DELUXE' | 'ICU'
  cashless: boolean
  tpa: string | null
  insuranceCompany: string | null
  other: string | null
  admittedByDoctor: string
  treatingDoctor: string | null
  dateOfAdmission: string
  timeOfAdmission: string
  dateOfDischarge: string | null
  timeOfDischarge: string | null
  bedNo: string | null
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
}

// IPD Treatment interfaces
export interface Medicine {
  id: string
  name: string
  category: 'INJ' | 'IV' | 'TAB' | 'SYP' | 'CAP' | 'DROP' | 'CREAM' | 'OTHER'
  defaultDose: string | null
  defaultFrequency: string | null
  defaultRoute: string | null
  createdAt: string
  updatedAt: string
}

export type InvestigationCategory =
  'Blood Test' | 'Urine Test' | 'X-Ray' | 'CT Scan' | 'MRI' | 'USG' | 'ECG' | 'Echo' | 'Other'

export interface Investigation {
  id: string
  name: string
  category: InvestigationCategory
  createdAt: string
  updatedAt: string
}

export interface ProgressReportEntry {
  id: string
  patientId: string
  ipdNo: string
  diagnosis: string | null
  dateTime: string
  isAdmissionNote: boolean
  doctorNotes: string
  treatment: string | null
  staffName: string
  doctorSignature: string | null
  createdAt: string
  updatedAt: string
}

export interface NursingNote {
  id: string
  patientId: string
  ipdNo: string
  dateTime: string
  notes: string
  treatment: string | null
  staffName: string
  isHandover: boolean
  createdAt: string
  updatedAt: string
}

export interface VitalSign {
  id: string
  patientId: string
  ipdNo: string
  dateTime: string
  temp: string | null
  pulse: string | null
  bp: string | null
  spo2: string | null
  bsl: string | null
  ivFluids: string | null
  staffName: string
  createdAt: string
  updatedAt: string
}

export interface DrugOrder {
  id: string
  patientId: string
  ipdNo: string
  drugName: string
  drugAllergy: string | null
  frequency: string
  route: string
  startDate: string
  ward: string | null
  bedNo: string | null
  days: Record<string, string>
  medOfficerSignature: string | null
  createdAt: string
  updatedAt: string
}

export interface PatientAdvice {
  id: string
  patientId: string
  ipdNo: string
  dateTime: string
  category: InvestigationCategory
  investigationName: string
  notes: string | null
  advisedBy: string
  status: 'Pending' | 'Done' | 'Report Received'
  reportNotes: string | null
  createdAt: string
  updatedAt: string
}

export interface WardCharges {
  id: string
  wardType: 'GENERAL' | 'SEMI' | 'SPECIAL_WITHOUT_AC' | 'SPECIAL_WITH_AC_DELUXE' | 'ICU'
  bedCharges: number | string
  doctorCharges: number | string
  nursingCharges: number | string
  asstDoctorCharges: number | string
  totalPerDay: number | string
  monitorCharges: number | string | null
  o2Charges: number | string | null
  syringePumpCharges: number | string | null
  bloodTransfusionCharges: number | string | null
  visitingCharges: number | string | null
  createdAt: string
  updatedAt: string
}

export interface TPA {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface InsuranceCompany {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

// User model functions
export class UserModel {
  static async findByEmail(email: string): Promise<User | null> {
    try {
      const data = await readSheet(SHEET_NAMES.USERS)
      if (data.length <= 1) return null // No data or only headers
      
      const headers = data[0]
      const userRow = data.find(row => row[1] === email) // email is in column B (index 1)
      
      if (!userRow) return null
      
      return this.rowToUser(headers, userRow)
    } catch (error) {
      console.error('Error finding user by email:', error)
      return null
    }
  }
  
  static async findById(id: string): Promise<User | null> {
    try {
      const data = await readSheet(SHEET_NAMES.USERS)
      if (data.length <= 1) return null
      
      const headers = data[0]
      const userRow = data.find(row => row[0] === id) // id is in column A (index 0)
      
      if (!userRow) return null
      
      return this.rowToUser(headers, userRow)
    } catch (error) {
      console.error('Error finding user by id:', error)
      return null
    }
  }
  
  static async findMany(): Promise<User[]> {
    try {
      const data = await readSheet(SHEET_NAMES.USERS)
      if (data.length <= 1) return []
      
      const headers = data[0]
      return data.slice(1).map(row => this.rowToUser(headers, row))
    } catch (error) {
      console.error('Error finding users:', error)
      return []
    }
  }
  
  static async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const now = nowIST()
    const user: User = {
      id: generateId(),
      ...userData,
      // Password arrives pre-hashed from the API route (server-side bcrypt)
      password: userData.password,
      createdAt: now,
      updatedAt: now
    }
    
    const row = this.userToRow(user)
    await appendSheet(SHEET_NAMES.USERS, [row])
    
    return user
  }
  
  static async update(id: string, userData: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
    try {
      const data = await readSheet(SHEET_NAMES.USERS)
      if (data.length <= 1) return null
      
      const headers = data[0]
      const userIndex = data.findIndex(row => row[0] === id)
      
      if (userIndex === -1) return null
      
      const existingUser = this.rowToUser(headers, data[userIndex])
      const updatedUser: User = {
        ...existingUser,
        ...userData,
        updatedAt: nowIST()
      }
      
      // Password arrives pre-hashed from the API route (server-side bcrypt) if provided
      if (userData.password) {
        updatedUser.password = userData.password
      }
      
      const updatedRow = this.userToRow(updatedUser)
      await updateRow(SHEET_NAMES.USERS, userIndex + 1, updatedRow) // +1 because sheets are 1-indexed
      
      return updatedUser
    } catch (error) {
      console.error('Error updating user:', error)
      return null
    }
  }
  
  static async delete(id: string): Promise<boolean> {
    try {
      const data = await readSheet(SHEET_NAMES.USERS)
      if (data.length <= 1) return false
      
      const userIndex = data.findIndex(row => row[0] === id)
      if (userIndex === -1) return false
      
      await deleteRow(SHEET_NAMES.USERS, userIndex + 1) // +1 because sheets are 1-indexed
      return true
    } catch (error) {
      console.error('Error deleting user:', error)
      return false
    }
  }
  
  static async initializeSheet(): Promise<void> {
    const headers = ['id', 'email', 'password', 'name', 'role', 'createdAt', 'updatedAt']
    await appendSheet(SHEET_NAMES.USERS, [headers])
  }
  
  private static rowToUser(headers: string[], row: string[]): User {
    const user: any = {}
    headers.forEach((header, index) => {
      user[header] = row[index] || null
    })
    
    return {
      id: user.id,
      email: user.email,
      password: user.password,
      name: user.name,
      role: user.role as 'ADMIN' | 'STAFF',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  }
  
  private static userToRow(user: User): string[] {
    return [
      user.id,
      user.email,
      user.password,
      user.name,
      user.role,
      user.createdAt,
      user.updatedAt
    ]
  }
}

// Patient model functions
export class PatientModel {
  static async findMany(options?: { 
    search?: string, 
    page?: number, 
    limit?: number 
  }): Promise<{ patients: Patient[], total: number }> {
    try {
      const startTime = Date.now()
      
      // For search queries, limit the range to avoid loading too much data
      const maxRows = options?.search ? 1000 : 500 // Limit rows when searching
      const range = `A1:Z${maxRows}` // Read only first 500-1000 rows
      
      const data = await readSheet(SHEET_NAMES.PATIENTS, range)
      if (data.length <= 1) return { patients: [], total: 0 }
      
      const headers = data[0]
      let patients = data.slice(1).map(row => this.rowToPatient(headers, row))
      
      // Apply search filter
      if (options?.search) {
        const searchTerm = options.search.toLowerCase()
        patients = patients.filter(patient => 
          patient.firstName.toLowerCase().includes(searchTerm) ||
          patient.surname.toLowerCase().includes(searchTerm) ||
          patient.phoneNo.includes(searchTerm) ||
          (patient.ipdNo && patient.ipdNo.toLowerCase().includes(searchTerm))
        )
        console.log(`Filtered to ${patients.length} patients matching "${searchTerm}"`)
      }
      
      const total = patients.length
      
      // Apply pagination
      if (options?.page && options?.limit) {
        const start = (options.page - 1) * options.limit
        const end = start + options.limit
        patients = patients.slice(start, end)
        console.log(`Paginated to ${patients.length} patients (page ${options.page})`)
      }
      
      console.log(`PatientModel.findMany completed in ${Date.now() - startTime}ms`)
      return { patients, total }
    } catch (error) {
      console.error('Error finding patients:', error)
      return { patients: [], total: 0 }
    }
  }
  
  static async findById(id: string): Promise<Patient | null> {
    try {
      const data = await readSheet(SHEET_NAMES.PATIENTS)
      if (data.length <= 1) return null
      
      const headers = data[0]
      const patientRow = data.find(row => row[0] === id)
      
      if (!patientRow) return null
      
      return this.rowToPatient(headers, patientRow)
    } catch (error) {
      console.error('Error finding patient by id:', error)
      return null
    }
  }
  
  static async create(patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'bedNo' | 'createdByUserId'> & { bedNo?: string | null; createdByUserId?: string | null }): Promise<Patient> {
    const now = nowIST()
    const patient: Patient = {
      id: generateId(),
      ...patientData,
      bedNo: patientData.bedNo ?? null,
      createdByUserId: patientData.createdByUserId ?? null,
      createdAt: now,
      updatedAt: now
    }
    
    const row = this.patientToRow(patient)
    await appendSheet(SHEET_NAMES.PATIENTS, [row])
    
    return patient
  }
  
  static async update(id: string, updateData: Partial<Patient>): Promise<Patient | null> {
    try {
      const rowNumber = await findRowByValue(SHEET_NAMES.PATIENTS, id, 0)
      if (!rowNumber) return null
      
      const existing = await this.findById(id)
      if (!existing) return null
      
      const updated: Patient = {
        ...existing,
        ...updateData,
        updatedAt: nowIST()
      }
      
      const row = this.patientToRow(updated)
      await updateRow(SHEET_NAMES.PATIENTS, rowNumber, row)
      
      return updated
    } catch (error) {
      console.error('Error updating patient:', error)
      return null
    }
  }
  
  static async delete(id: string): Promise<boolean> {
    try {
      const rowNumber = await findRowByValue(SHEET_NAMES.PATIENTS, id, 0)
      if (!rowNumber) return false
      
      await deleteRow(SHEET_NAMES.PATIENTS, rowNumber)
      return true
    } catch (error) {
      console.error('Error deleting patient:', error)
      return false
    }
  }
  
  static async initializeSheet(): Promise<void> {
    const headers = [
      'id', 'ipdNo', 'uhidNo', 'firstName', 'middleName', 'surname', 'firstNameMarathi', 'middleNameMarathi', 'surnameMarathi',
      'phoneNo', 'age', 'sex', 'address', 'nearestRelativeName', 'relationToPatient', 'ward', 'cashless', 'tpa', 'insuranceCompany', 'other',
      'admittedByDoctor', 'treatingDoctor', 'dateOfAdmission', 'timeOfAdmission',
      'dateOfDischarge', 'timeOfDischarge', 'bedNo', 'createdByUserId', 'createdAt', 'updatedAt'
    ]
    await appendSheet(SHEET_NAMES.PATIENTS, [headers])
  }
  
  private static rowToPatient(headers: string[], row: string[]): Patient {
    const patient: any = {}
    headers.forEach((header, index) => {
      patient[header] = row[index] || null
    })
    
    return {
      id: patient.id,
      ipdNo: patient.ipdNo,
      uhidNo: patient.uhidNo,
      firstName: patient.firstName,
      middleName: patient.middleName,
      surname: patient.surname,
      firstNameMarathi: patient.firstNameMarathi,
      middleNameMarathi: patient.middleNameMarathi,
      surnameMarathi: patient.surnameMarathi,
      phoneNo: patient.phoneNo,
      age: parseInt(patient.age) || 0,
      sex: patient.sex as 'M' | 'F',
      address: patient.address,
      nearestRelativeName: patient.nearestRelativeName,
      relationToPatient: patient.relationToPatient,
      ward: patient.ward as any,
      cashless: patient.cashless === 'true',
      tpa: patient.tpa || patient.TPA || patient['TPA'],
      insuranceCompany: patient.insuranceCompany || patient.Insurance || patient['Insurance'],
      other: patient.other,
      admittedByDoctor: patient.admittedByDoctor,
      treatingDoctor: patient.treatingDoctor,
      dateOfAdmission: patient.dateOfAdmission,
      timeOfAdmission: patient.timeOfAdmission,
      dateOfDischarge: patient.dateOfDischarge,
      timeOfDischarge: patient.timeOfDischarge,
      bedNo: patient.bedNo || null,
      createdByUserId: patient.createdByUserId || null,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt
    }
  }
  
  private static patientToRow(patient: Patient): string[] {
    return [
      patient.id,
      patient.ipdNo || '',
      patient.uhidNo || '',
      patient.firstName,
      patient.middleName || '',
      patient.surname,
      patient.firstNameMarathi || '',
      patient.middleNameMarathi || '',
      patient.surnameMarathi || '',
      patient.phoneNo,
      patient.age.toString(),
      patient.sex,
      patient.address,
      patient.nearestRelativeName,
      patient.relationToPatient,
      patient.ward,
      patient.cashless.toString(),
      patient.tpa || '',
      patient.insuranceCompany || '',
      patient.other || '',
      patient.admittedByDoctor,
      patient.treatingDoctor || '',
      patient.dateOfAdmission,
      patient.timeOfAdmission,
      patient.dateOfDischarge || '',
      patient.timeOfDischarge || '',
      patient.bedNo || '',
      patient.createdByUserId || '',
      patient.createdAt,
      patient.updatedAt
    ]
  }
}

// Ward Charges model functions
export class WardChargesModel {
  static async findMany(): Promise<WardCharges[]> {
    try {
      const data = await readSheet(SHEET_NAMES.WARD_CHARGES)
      if (data.length <= 1) return []
      
      const headers = data[0]
      return data.slice(1).map(row => this.rowToWardCharges(headers, row))
    } catch (error) {
      console.error('Error finding ward charges:', error)
      return []
    }
  }
  
  static async findByWardType(wardType: string): Promise<WardCharges | null> {
    try {
      const data = await readSheet(SHEET_NAMES.WARD_CHARGES)
      if (data.length <= 1) return null
      
      const headers = data[0]
      const wardRow = data.find(row => row[1] === wardType) // wardType is in column B
      
      if (!wardRow) return null
      
      return this.rowToWardCharges(headers, wardRow)
    } catch (error) {
      console.error('Error finding ward charges by type:', error)
      return null
    }
  }
  
  static async initializeSheet(): Promise<void> {
    // Only create headers if sheet doesn't exist - data comes from Google Sheets
    const headers = [
      'id', 'wardType', 'bedCharges', 'doctorCharges', 'nursingCharges',
      'asstDoctorCharges', 'totalPerDay', 'monitorCharges', 'o2Charges',
      'syringePumpCharges', 'bloodTransfusionCharges', 'visitingCharges',
      'createdAt', 'updatedAt'
    ]
    await appendSheet(SHEET_NAMES.WARD_CHARGES, [headers])
    // Note: Data should be managed directly in Google Sheets, not inserted via code
  }
  
  // Helper function to parse range values like "1000 to 2000" or single values like "1500"
  private static parseChargeValue(value: string | null): number | string {
    if (!value) return 0
    
    // Check if it's a range (contains "to" or "-")
    const rangeMatch = value.match(/(\d+)\s*(?:to|-)\s*(\d+)/)
    if (rangeMatch) {
      return `${rangeMatch[1]} to ${rangeMatch[2]}`
    }
    
    // Try to parse as single number
    const singleValue = parseFloat(value)
    return isNaN(singleValue) ? value.toString() : singleValue
  }

  private static rowToWardCharges(headers: string[], row: string[]): WardCharges {
    const charges: any = {}
    headers.forEach((header, index) => {
      charges[header] = row[index] || null
    })
    
    return {
      id: charges.id,
      wardType: charges.wardType as any,
      bedCharges: this.parseChargeValue(charges.bedCharges) as any,
      doctorCharges: this.parseChargeValue(charges.doctorCharges) as any,
      nursingCharges: this.parseChargeValue(charges.nursingCharges) as any,
      asstDoctorCharges: this.parseChargeValue(charges.asstDoctorCharges) as any,
      totalPerDay: this.parseChargeValue(charges.totalPerDay) as any,
      monitorCharges: charges.monitorCharges ? this.parseChargeValue(charges.monitorCharges) as any : null,
      o2Charges: charges.o2Charges ? this.parseChargeValue(charges.o2Charges) as any : null,
      syringePumpCharges: charges.syringePumpCharges ? this.parseChargeValue(charges.syringePumpCharges) as any : null,
      bloodTransfusionCharges: charges.bloodTransfusionCharges ? this.parseChargeValue(charges.bloodTransfusionCharges) as any : null,
      visitingCharges: charges.visitingCharges ? this.parseChargeValue(charges.visitingCharges) as any : null,
      createdAt: charges.createdAt,
      updatedAt: charges.updatedAt
    }
  }
}

// TPA model functions
export class TPAModel {
  static async findMany(): Promise<TPA[]> {
    try {
      const data = await readSheet(SHEET_NAMES.TPA)
      if (data.length === 0) {
        console.log('TPAList sheet is empty, returning empty array')
        return []
      }
      
      // If there's only headers or the first row has data
      if (data.length === 1) {
        console.log('TPAList sheet has only headers, returning empty array')
        return []
      }
      
      const headers = data[0]
      const rows = data.slice(1).filter(row => row && row.length > 0 && row[0]) // Filter out empty rows
      
      return rows.map((row, index) => this.rowToTPA(headers, row))
    } catch (error) {
      console.error('Error finding TPAs:', error)
      throw error
    }
  }
  
  static async initializeSheet(): Promise<void> {
    // This method is optional since sheets already exist
    console.log('TPAList sheet already exists, skipping initialization')
  }
  
  private static rowToTPA(headers: string[], row: string[]): TPA {
    const tpa: any = {}
    headers.forEach((header, index) => {
      tpa[header] = row[index] || null
    })
    
    // Handle flexible column names - could be 'name', 'tpa_name', etc.
    const name = tpa.name || tpa.tpa_name || tpa.Name || tpa.TPA || row[0] || 'Unknown TPA'
    const id = tpa.id || `tpa_${row[0]?.toLowerCase().replace(/\s+/g, '_')}` || `tpa_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      id,
      name,
      createdAt: tpa.createdAt || nowIST(),
      updatedAt: tpa.updatedAt || nowIST()
    }
  }
}

// Insurance Company model functions
export class InsuranceCompanyModel {
  static async findMany(): Promise<InsuranceCompany[]> {
    try {
      const data = await readSheet(SHEET_NAMES.INSURANCE_COMPANIES)
      if (data.length === 0) {
        console.log('InsuranceList sheet is empty, returning empty array')
        return []
      }
      
      // If there's only headers or the first row has data
      if (data.length === 1) {
        console.log('InsuranceList sheet has only headers, returning empty array')
        return []
      }
      
      const headers = data[0]
      const rows = data.slice(1).filter(row => row && row.length > 0 && row[0]) // Filter out empty rows
      
      return rows.map((row, index) => this.rowToInsuranceCompany(headers, row))
    } catch (error) {
      console.error('Error finding insurance companies:', error)
      throw error
    }
  }
  
  static async initializeSheet(): Promise<void> {
    // This method is optional since sheets already exist
    console.log('InsuranceList sheet already exists, skipping initialization')
  }
  
  private static rowToInsuranceCompany(headers: string[], row: string[]): InsuranceCompany {
    const company: any = {}
    headers.forEach((header, index) => {
      company[header] = row[index] || null
    })
    
    // Handle flexible column names - could be 'name', 'company_name', etc.
    const name = company.name || company.company_name || company.Name || company.Insurance || row[0] || 'Unknown Insurance'
    const id = company.id || `ins_${row[0]?.toLowerCase().replace(/\s+/g, '_')}` || `ins_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      id,
      name,
      createdAt: company.createdAt || nowIST(),
      updatedAt: company.updatedAt || nowIST()
    }
  }
}

// Medicine model (master reference — read-only from API)
export class MedicineModel {
  static async findMany(): Promise<Medicine[]> {
    try {
      const data = await readSheet(SHEET_NAMES.MEDICINES)
      if (data.length <= 1) return []
      const headers = data[0]
      return data.slice(1)
        .filter(row => row && row.length > 0 && row[0])
        .map(row => this.rowToMedicine(headers, row))
    } catch (error) {
      console.error('Error finding medicines:', error)
      return []
    }
  }

  static async initializeSheet(): Promise<void> {
    const headers = ['id', 'name', 'category', 'defaultDose', 'defaultFrequency', 'defaultRoute', 'createdAt', 'updatedAt']
    await appendSheet(SHEET_NAMES.MEDICINES, [headers])
  }

  private static rowToMedicine(headers: string[], row: string[]): Medicine {
    const m: any = {}
    headers.forEach((h, i) => { m[h] = row[i] || null })
    return {
      id: m.id,
      name: m.name,
      category: m.category as Medicine['category'],
      defaultDose: m.defaultDose || null,
      defaultFrequency: m.defaultFrequency || null,
      defaultRoute: m.defaultRoute || null,
      createdAt: m.createdAt || '',
      updatedAt: m.updatedAt || '',
    }
  }
}

// Investigation model (master reference — read-only from API)
export class InvestigationModel {
  static async findMany(): Promise<Investigation[]> {
    try {
      const data = await readSheet(SHEET_NAMES.INVESTIGATIONS)
      if (data.length <= 1) return []
      const headers = data[0]
      return data.slice(1)
        .filter(row => row && row.length > 0 && row[0])
        .map(row => this.rowToInvestigation(headers, row))
    } catch (error) {
      console.error('Error finding investigations:', error)
      return []
    }
  }

  static async initializeSheet(): Promise<void> {
    const headers = ['id', 'name', 'category', 'createdAt', 'updatedAt']
    await appendSheet(SHEET_NAMES.INVESTIGATIONS, [headers])
  }

  private static rowToInvestigation(headers: string[], row: string[]): Investigation {
    const inv: any = {}
    headers.forEach((h, i) => { inv[h] = row[i] || null })
    return {
      id: inv.id,
      name: inv.name,
      category: inv.category as InvestigationCategory,
      createdAt: inv.createdAt || '',
      updatedAt: inv.updatedAt || '',
    }
  }
}

// Progress Report model
export class ProgressReportModel {
  static async findByPatientId(patientId: string): Promise<ProgressReportEntry[]> {
    try {
      const data = await readSheet(SHEET_NAMES.PROGRESS_REPORT)
      if (data.length <= 1) return []
      const headers = data[0]
      return data.slice(1)
        .filter(row => row && row.length > 0 && row[1] === patientId)
        .map(row => this.rowToEntry(headers, row))
    } catch (error) {
      console.error('Error finding progress report entries:', error)
      return []
    }
  }

  static async findById(id: string): Promise<ProgressReportEntry | null> {
    try {
      const data = await readSheet(SHEET_NAMES.PROGRESS_REPORT)
      if (data.length <= 1) return null
      const headers = data[0]
      const row = data.find(r => r[0] === id)
      return row ? this.rowToEntry(headers, row) : null
    } catch (error) {
      console.error('Error finding progress report entry by id:', error)
      return null
    }
  }

  static async hasAdmissionNote(patientId: string): Promise<boolean> {
    try {
      const data = await readSheet(SHEET_NAMES.PROGRESS_REPORT)
      if (data.length <= 1) return false
      return data.slice(1).some(row => row[1] === patientId && row[5] === 'true')
    } catch (error) {
      console.error('hasAdmissionNote: Sheets read failed', { patientId, error })
      throw error
    }
  }

  static async create(entryData: Omit<ProgressReportEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProgressReportEntry> {
    const now = nowIST()
    const entry: ProgressReportEntry = {
      id: generateId(),
      ...entryData,
      createdAt: now,
      updatedAt: now,
    }
    await appendSheet(SHEET_NAMES.PROGRESS_REPORT, [this.entryToRow(entry)])
    return entry
  }

  static async update(id: string, updateData: Partial<ProgressReportEntry>): Promise<ProgressReportEntry | null> {
    try {
      const data = await readSheet(SHEET_NAMES.PROGRESS_REPORT)
      if (data.length <= 1) return null
      const headers = data[0]
      const rowIndex = data.findIndex(r => r[0] === id)
      if (rowIndex === -1) return null
      const existing = this.rowToEntry(headers, data[rowIndex])
      const updated: ProgressReportEntry = {
        ...existing,
        ...updateData,
        id: existing.id,
        updatedAt: nowIST(),
      }
      await updateRow(SHEET_NAMES.PROGRESS_REPORT, rowIndex + 1, this.entryToRow(updated))
      return updated
    } catch (error) {
      console.error('Error updating progress report entry:', error)
      return null
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      const data = await readSheet(SHEET_NAMES.PROGRESS_REPORT)
      if (data.length <= 1) return false
      const rowIndex = data.findIndex(r => r[0] === id)
      if (rowIndex === -1) return false
      await deleteRow(SHEET_NAMES.PROGRESS_REPORT, rowIndex + 1)
      return true
    } catch (error) {
      console.error('Error deleting progress report entry:', error)
      return false
    }
  }

  static async initializeSheet(): Promise<void> {
    const headers = ['id', 'patientId', 'ipdNo', 'diagnosis', 'dateTime', 'isAdmissionNote', 'doctorNotes', 'treatment', 'staffName', 'doctorSignature', 'createdAt', 'updatedAt']
    await appendSheet(SHEET_NAMES.PROGRESS_REPORT, [headers])
  }

  private static rowToEntry(headers: string[], row: string[]): ProgressReportEntry {
    const e: any = {}
    headers.forEach((h, i) => { e[h] = row[i] ?? null })
    return {
      id: e.id,
      patientId: e.patientId,
      ipdNo: e.ipdNo,
      diagnosis: e.diagnosis || null,
      dateTime: e.dateTime,
      isAdmissionNote: e.isAdmissionNote === 'true',
      doctorNotes: e.doctorNotes || '',
      treatment: e.treatment || null,
      staffName: e.staffName || '',
      doctorSignature: e.doctorSignature || null,
      createdAt: e.createdAt || '',
      updatedAt: e.updatedAt || '',
    }
  }

  private static entryToRow(entry: ProgressReportEntry): string[] {
    return [
      entry.id,
      entry.patientId,
      entry.ipdNo,
      sanitizeSheetValue(entry.diagnosis || ''),
      entry.dateTime,
      entry.isAdmissionNote.toString(),
      sanitizeSheetValue(entry.doctorNotes),
      sanitizeSheetValue(entry.treatment || ''),
      entry.staffName,
      entry.doctorSignature || '',
      entry.createdAt,
      entry.updatedAt,
    ]
  }
}

// Nursing Notes model
export class NursingNotesModel {
  static async findByPatientId(patientId: string): Promise<NursingNote[]> {
    try {
      const data = await readSheet(SHEET_NAMES.NURSING_NOTES)
      if (data.length <= 1) return []
      const headers = data[0]
      return data.slice(1)
        .filter(row => row && row.length > 0 && row[1] === patientId)
        .map(row => this.rowToNote(headers, row))
    } catch (error) {
      console.error('Error finding nursing notes:', error)
      return []
    }
  }

  static async findById(id: string): Promise<NursingNote | null> {
    try {
      const data = await readSheet(SHEET_NAMES.NURSING_NOTES)
      if (data.length <= 1) return null
      const headers = data[0]
      const row = data.find(r => r[0] === id)
      return row ? this.rowToNote(headers, row) : null
    } catch (error) {
      console.error('Error finding nursing note by id:', error)
      return null
    }
  }

  static async create(noteData: Omit<NursingNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<NursingNote> {
    const now = nowIST()
    const note: NursingNote = { id: generateId(), ...noteData, createdAt: now, updatedAt: now }
    await appendSheet(SHEET_NAMES.NURSING_NOTES, [this.noteToRow(note)])
    return note
  }

  static async update(id: string, updateData: Partial<NursingNote>): Promise<NursingNote | null> {
    try {
      const data = await readSheet(SHEET_NAMES.NURSING_NOTES)
      if (data.length <= 1) return null
      const headers = data[0]
      const rowIndex = data.findIndex(r => r[0] === id)
      if (rowIndex === -1) return null
      const existing = this.rowToNote(headers, data[rowIndex])
      const updated: NursingNote = { ...existing, ...updateData, id: existing.id, updatedAt: nowIST() }
      await updateRow(SHEET_NAMES.NURSING_NOTES, rowIndex + 1, this.noteToRow(updated))
      return updated
    } catch (error) {
      console.error('Error updating nursing note:', error)
      return null
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      const data = await readSheet(SHEET_NAMES.NURSING_NOTES)
      if (data.length <= 1) return false
      const rowIndex = data.findIndex(r => r[0] === id)
      if (rowIndex === -1) return false
      await deleteRow(SHEET_NAMES.NURSING_NOTES, rowIndex + 1)
      return true
    } catch (error) {
      console.error('Error deleting nursing note:', error)
      return false
    }
  }

  static async initializeSheet(): Promise<void> {
    const headers = ['id', 'patientId', 'ipdNo', 'dateTime', 'notes', 'treatment', 'staffName', 'isHandover', 'createdAt', 'updatedAt']
    await appendSheet(SHEET_NAMES.NURSING_NOTES, [headers])
  }

  private static rowToNote(headers: string[], row: string[]): NursingNote {
    const n: any = {}
    headers.forEach((h, i) => { n[h] = row[i] ?? null })
    return {
      id: n.id,
      patientId: n.patientId,
      ipdNo: n.ipdNo,
      dateTime: n.dateTime,
      notes: n.notes || '',
      treatment: n.treatment || null,
      staffName: n.staffName || '',
      isHandover: n.isHandover === 'true',
      createdAt: n.createdAt || '',
      updatedAt: n.updatedAt || '',
    }
  }

  private static noteToRow(note: NursingNote): string[] {
    return [
      note.id,
      note.patientId,
      note.ipdNo,
      note.dateTime,
      sanitizeSheetValue(note.notes),
      sanitizeSheetValue(note.treatment || ''),
      note.staffName,
      note.isHandover.toString(),
      note.createdAt,
      note.updatedAt,
    ]
  }
}

// Nursing Chart (Vitals) model
export class NursingChartModel {
  static async findByPatientId(patientId: string): Promise<VitalSign[]> {
    try {
      const data = await readSheet(SHEET_NAMES.NURSING_CHART)
      if (data.length <= 1) return []
      const headers = data[0]
      return data.slice(1)
        .filter(row => row && row.length > 0 && row[1] === patientId)
        .map(row => this.rowToVital(headers, row))
    } catch (error) {
      console.error('Error finding nursing chart entries:', error)
      return []
    }
  }

  static async findById(id: string): Promise<VitalSign | null> {
    try {
      const data = await readSheet(SHEET_NAMES.NURSING_CHART)
      if (data.length <= 1) return null
      const headers = data[0]
      const row = data.find(r => r[0] === id)
      return row ? this.rowToVital(headers, row) : null
    } catch (error) {
      console.error('Error finding nursing chart entry by id:', error)
      return null
    }
  }

  static async create(vitalData: Omit<VitalSign, 'id' | 'createdAt' | 'updatedAt'>): Promise<VitalSign> {
    const now = nowIST()
    const vital: VitalSign = { id: generateId(), ...vitalData, createdAt: now, updatedAt: now }
    await appendSheet(SHEET_NAMES.NURSING_CHART, [this.vitalToRow(vital)])
    return vital
  }

  static async update(id: string, updateData: Partial<VitalSign>): Promise<VitalSign | null> {
    try {
      const data = await readSheet(SHEET_NAMES.NURSING_CHART)
      if (data.length <= 1) return null
      const headers = data[0]
      const rowIndex = data.findIndex(r => r[0] === id)
      if (rowIndex === -1) return null
      const existing = this.rowToVital(headers, data[rowIndex])
      const updated: VitalSign = { ...existing, ...updateData, id: existing.id, updatedAt: nowIST() }
      await updateRow(SHEET_NAMES.NURSING_CHART, rowIndex + 1, this.vitalToRow(updated))
      return updated
    } catch (error) {
      console.error('Error updating nursing chart entry:', error)
      return null
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      const data = await readSheet(SHEET_NAMES.NURSING_CHART)
      if (data.length <= 1) return false
      const rowIndex = data.findIndex(r => r[0] === id)
      if (rowIndex === -1) return false
      await deleteRow(SHEET_NAMES.NURSING_CHART, rowIndex + 1)
      return true
    } catch (error) {
      console.error('Error deleting nursing chart entry:', error)
      return false
    }
  }

  static async initializeSheet(): Promise<void> {
    const headers = ['id', 'patientId', 'ipdNo', 'dateTime', 'temp', 'pulse', 'bp', 'spo2', 'bsl', 'ivFluids', 'staffName', 'createdAt', 'updatedAt']
    await appendSheet(SHEET_NAMES.NURSING_CHART, [headers])
  }

  private static rowToVital(headers: string[], row: string[]): VitalSign {
    const v: any = {}
    headers.forEach((h, i) => { v[h] = row[i] ?? null })
    return {
      id: v.id,
      patientId: v.patientId,
      ipdNo: v.ipdNo,
      dateTime: v.dateTime,
      temp: v.temp || null,
      pulse: v.pulse || null,
      bp: v.bp || null,
      spo2: v.spo2 || null,
      bsl: v.bsl || null,
      ivFluids: v.ivFluids || null,
      staffName: v.staffName || '',
      createdAt: v.createdAt || '',
      updatedAt: v.updatedAt || '',
    }
  }

  private static vitalToRow(vital: VitalSign): string[] {
    return [
      vital.id,
      vital.patientId,
      vital.ipdNo,
      vital.dateTime,
      vital.temp || '',
      vital.pulse || '',
      vital.bp || '',
      vital.spo2 || '',
      vital.bsl || '',
      vital.ivFluids || '',
      vital.staffName,
      vital.createdAt,
      vital.updatedAt,
    ]
  }
}

// Drug Order model
// Columns: A=id, B=patientId, C=ipdNo, D=drugName, E=drugAllergy, F=frequency, G=route,
//          H=startDate, I=ward, J=bedNo, K-AT=day1-day36, AU=medOfficerSignature, AV=createdAt, AW=updatedAt
const DAY_COLUMNS = 36
const DAY_START_INDEX = 10 // 0-based index of day1 (column K)

export class DrugOrderModel {
  static async findByPatientId(patientId: string): Promise<DrugOrder[]> {
    try {
      const data = await readSheet(SHEET_NAMES.DRUG_ORDERS)
      if (data.length <= 1) return []
      const headers = data[0]
      return data.slice(1)
        .filter(row => row && row.length > 0 && row[1] === patientId)
        .map(row => this.rowToDrugOrder(headers, row))
    } catch (error) {
      console.error('Error finding drug orders:', error)
      return []
    }
  }

  static async findById(id: string): Promise<DrugOrder | null> {
    try {
      const data = await readSheet(SHEET_NAMES.DRUG_ORDERS)
      if (data.length <= 1) return null
      const headers = data[0]
      const row = data.find(r => r[0] === id)
      return row ? this.rowToDrugOrder(headers, row) : null
    } catch (error) {
      console.error('Error finding drug order by id:', error)
      return null
    }
  }

  static async create(orderData: Omit<DrugOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<DrugOrder> {
    const now = nowIST()
    const order: DrugOrder = { id: generateId(), ...orderData, createdAt: now, updatedAt: now }
    await appendSheet(SHEET_NAMES.DRUG_ORDERS, [this.drugOrderToRow(order)])
    return order
  }

  static async update(id: string, updateData: Partial<DrugOrder>): Promise<DrugOrder | null> {
    try {
      const data = await readSheet(SHEET_NAMES.DRUG_ORDERS)
      if (data.length <= 1) return null
      const headers = data[0]
      const rowIndex = data.findIndex(r => r[0] === id)
      if (rowIndex === -1) return null
      const existing = this.rowToDrugOrder(headers, data[rowIndex])
      const updated: DrugOrder = {
        ...existing,
        ...updateData,
        id: existing.id,
        days: { ...existing.days, ...(updateData.days || {}) },
        updatedAt: nowIST(),
      }
      await updateRow(SHEET_NAMES.DRUG_ORDERS, rowIndex + 1, this.drugOrderToRow(updated))
      return updated
    } catch (error) {
      console.error('Error updating drug order:', error)
      return null
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      const data = await readSheet(SHEET_NAMES.DRUG_ORDERS)
      if (data.length <= 1) return false
      const rowIndex = data.findIndex(r => r[0] === id)
      if (rowIndex === -1) return false
      await deleteRow(SHEET_NAMES.DRUG_ORDERS, rowIndex + 1)
      return true
    } catch (error) {
      console.error('Error deleting drug order:', error)
      return false
    }
  }

  static async initializeSheet(): Promise<void> {
    const dayHeaders = Array.from({ length: DAY_COLUMNS }, (_, i) => `day${i + 1}`)
    const headers = [
      'id', 'patientId', 'ipdNo', 'drugName', 'drugAllergy', 'frequency', 'route',
      'startDate', 'ward', 'bedNo',
      ...dayHeaders,
      'medOfficerSignature', 'createdAt', 'updatedAt',
    ]
    await appendSheet(SHEET_NAMES.DRUG_ORDERS, [headers])
  }

  private static rowToDrugOrder(headers: string[], row: string[]): DrugOrder {
    const d: any = {}
    headers.forEach((h, i) => { d[h] = row[i] ?? null })
    const days: Record<string, string> = {}
    for (let i = 1; i <= DAY_COLUMNS; i++) {
      const key = `day${i}`
      const val = d[key]
      if (val && val.trim()) days[key] = val.trim()
    }
    return {
      id: d.id,
      patientId: d.patientId,
      ipdNo: d.ipdNo,
      drugName: d.drugName,
      drugAllergy: d.drugAllergy || null,
      frequency: d.frequency,
      route: d.route,
      startDate: d.startDate,
      ward: d.ward || null,
      bedNo: d.bedNo || null,
      days,
      medOfficerSignature: d.medOfficerSignature || null,
      createdAt: d.createdAt || '',
      updatedAt: d.updatedAt || '',
    }
  }

  private static drugOrderToRow(order: DrugOrder): string[] {
    const dayValues = Array.from({ length: DAY_COLUMNS }, (_, i) => order.days[`day${i + 1}`] || '')
    return [
      order.id,
      order.patientId,
      order.ipdNo,
      sanitizeSheetValue(order.drugName),
      order.drugAllergy || '',
      order.frequency,
      order.route,
      order.startDate,
      order.ward || '',
      order.bedNo || '',
      ...dayValues,
      order.medOfficerSignature || '',
      order.createdAt,
      order.updatedAt,
    ]
  }
}

// Patient Advice model
export class PatientAdviceModel {
  static async findByPatientId(patientId: string): Promise<PatientAdvice[]> {
    try {
      const data = await readSheet(SHEET_NAMES.PATIENT_ADVICE)
      if (data.length <= 1) return []
      const headers = data[0]
      return data.slice(1)
        .filter(row => row && row.length > 0 && row[1] === patientId)
        .map(row => this.rowToAdvice(headers, row))
    } catch (error) {
      console.error('Error finding patient advice:', error)
      return []
    }
  }

  static async findById(id: string): Promise<PatientAdvice | null> {
    try {
      const data = await readSheet(SHEET_NAMES.PATIENT_ADVICE)
      if (data.length <= 1) return null
      const headers = data[0]
      const row = data.find(r => r[0] === id)
      return row ? this.rowToAdvice(headers, row) : null
    } catch (error) {
      console.error('Error finding patient advice by id:', error)
      return null
    }
  }

  static async create(adviceData: Omit<PatientAdvice, 'id' | 'createdAt' | 'updatedAt'>): Promise<PatientAdvice> {
    const now = nowIST()
    const advice: PatientAdvice = { id: generateId(), ...adviceData, createdAt: now, updatedAt: now }
    await appendSheet(SHEET_NAMES.PATIENT_ADVICE, [this.adviceToRow(advice)])
    return advice
  }

  static async update(id: string, updateData: Partial<PatientAdvice>): Promise<PatientAdvice | null> {
    try {
      const data = await readSheet(SHEET_NAMES.PATIENT_ADVICE)
      if (data.length <= 1) return null
      const headers = data[0]
      const rowIndex = data.findIndex(r => r[0] === id)
      if (rowIndex === -1) return null
      const existing = this.rowToAdvice(headers, data[rowIndex])
      const updated: PatientAdvice = { ...existing, ...updateData, id: existing.id, updatedAt: nowIST() }
      await updateRow(SHEET_NAMES.PATIENT_ADVICE, rowIndex + 1, this.adviceToRow(updated))
      return updated
    } catch (error) {
      console.error('Error updating patient advice:', error)
      return null
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      const data = await readSheet(SHEET_NAMES.PATIENT_ADVICE)
      if (data.length <= 1) return false
      const rowIndex = data.findIndex(r => r[0] === id)
      if (rowIndex === -1) return false
      await deleteRow(SHEET_NAMES.PATIENT_ADVICE, rowIndex + 1)
      return true
    } catch (error) {
      console.error('Error deleting patient advice:', error)
      return false
    }
  }

  static async initializeSheet(): Promise<void> {
    const headers = ['id', 'patientId', 'ipdNo', 'dateTime', 'category', 'investigationName', 'notes', 'advisedBy', 'status', 'reportNotes', 'createdAt', 'updatedAt']
    await appendSheet(SHEET_NAMES.PATIENT_ADVICE, [headers])
  }

  private static rowToAdvice(headers: string[], row: string[]): PatientAdvice {
    const a: any = {}
    headers.forEach((h, i) => { a[h] = row[i] ?? null })
    return {
      id: a.id,
      patientId: a.patientId,
      ipdNo: a.ipdNo,
      dateTime: a.dateTime,
      category: a.category as InvestigationCategory,
      investigationName: a.investigationName || '',
      notes: a.notes || null,
      advisedBy: a.advisedBy || '',
      status: (a.status as PatientAdvice['status']) || 'Pending',
      reportNotes: a.reportNotes || null,
      createdAt: a.createdAt || '',
      updatedAt: a.updatedAt || '',
    }
  }

  private static adviceToRow(advice: PatientAdvice): string[] {
    return [
      advice.id,
      advice.patientId,
      advice.ipdNo,
      advice.dateTime,
      advice.category,
      sanitizeSheetValue(advice.investigationName),
      sanitizeSheetValue(advice.notes || ''),
      advice.advisedBy,
      advice.status,
      sanitizeSheetValue(advice.reportNotes || ''),
      advice.createdAt,
      advice.updatedAt,
    ]
  }
}
