import bcrypt from 'bcryptjs'
import { 
  readSheet, 
  appendSheet, 
  findRowByValue, 
  updateRow, 
  deleteRow, 
  generateId,
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
  firstName: string
  middleName: string | null
  surname: string
  firstNameMarathi: string
  middleNameMarathi: string | null
  surnameMarathi: string
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

export interface Admission {
  id: string
  patientId: string
  admissionDate: string
  dischargeDate: string | null
  ward: string
  doctorName: string
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
    const now = new Date().toISOString()
    const user: User = {
      id: generateId(),
      ...userData,
      // Password is already hashed from client side, don't double-hash
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
        updatedAt: new Date().toISOString()
      }
      
      // Password is already hashed from client side if provided
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
      console.log('PatientModel.findMany called with options:', options)
      const startTime = Date.now()
      
      // For search queries, limit the range to avoid loading too much data
      const maxRows = options?.search ? 1000 : 500 // Limit rows when searching
      const range = `A1:Z${maxRows}` // Read only first 500-1000 rows
      
      const data = await readSheet(SHEET_NAMES.PATIENTS, range)
      if (data.length <= 1) return { patients: [], total: 0 }
      
      const headers = data[0]
      let patients = data.slice(1).map(row => this.rowToPatient(headers, row))
      
      console.log(`Loaded ${patients.length} patients in ${Date.now() - startTime}ms`)
      
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
  
  static async create(patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Promise<Patient> {
    const now = new Date().toISOString()
    const patient: Patient = {
      id: generateId(),
      ...patientData,
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
        updatedAt: new Date().toISOString()
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
      'id', 'ipdNo', 'firstName', 'middleName', 'surname', 'firstNameMarathi', 'middleNameMarathi', 'surnameMarathi',
      'phoneNo', 'age', 'sex', 'address', 'nearestRelativeName', 'relationToPatient', 'ward', 'cashless', 'tpa', 'insuranceCompany', 'other',
      'admittedByDoctor', 'treatingDoctor', 'dateOfAdmission', 'timeOfAdmission',
      'dateOfDischarge', 'timeOfDischarge', 'createdAt', 'updatedAt'
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
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt
    }
  }
  
  private static patientToRow(patient: Patient): string[] {
    return [
      patient.id,
      patient.ipdNo || '',
      patient.firstName,
      patient.middleName || '',
      patient.surname,
      patient.firstNameMarathi,
      patient.middleNameMarathi || '',
      patient.surnameMarathi,
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
      // Return some default TPA options if sheet is not accessible
      return [
        { id: 'tpa1', name: 'Star Health Insurance', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'tpa2', name: 'ICICI Lombard', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'tpa3', name: 'HDFC ERGO', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ]
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
      createdAt: tpa.createdAt || new Date().toISOString(),
      updatedAt: tpa.updatedAt || new Date().toISOString()
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
      // Return some default insurance options if sheet is not accessible
      return [
        { id: 'ins1', name: 'LIC of India', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'ins2', name: 'SBI General Insurance', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'ins3', name: 'New India Assurance', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ]
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
      createdAt: company.createdAt || new Date().toISOString(),
      updatedAt: company.updatedAt || new Date().toISOString()
    }
  }
}
