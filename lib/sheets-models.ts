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
  bedCharges: number
  doctorCharges: number
  nursingCharges: number
  asstDoctorCharges: number
  totalPerDay: number
  monitorCharges: number | null
  o2Charges: number | null
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
      'phoneNo', 'age', 'sex', 'address', 'nearestRelativeName', 'relationToPatient', 'ward', 'cashless', 'other',
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
    const headers = [
      'id', 'wardType', 'bedCharges', 'doctorCharges', 'nursingCharges',
      'asstDoctorCharges', 'totalPerDay', 'monitorCharges', 'o2Charges',
      'createdAt', 'updatedAt'
    ]
    await appendSheet(SHEET_NAMES.WARD_CHARGES, [headers])
    
    // Add initial ward charges data
    const initialData = [
      ['ward1', 'GENERAL', '800', '400', '300', '200', '1700', '0', '0', new Date().toISOString(), new Date().toISOString()],
      ['ward2', 'SEMI', '1400', '500', '300', '300', '2500', '0', '0', new Date().toISOString(), new Date().toISOString()],
      ['ward3', 'SPECIAL_WITHOUT_AC', '2200', '600', '400', '300', '3500', '0', '0', new Date().toISOString(), new Date().toISOString()],
      ['ward4', 'SPECIAL_WITH_AC_DELUXE', '2600', '600', '500', '300', '4000', '0', '0', new Date().toISOString(), new Date().toISOString()],
      ['ward5', 'ICU', '2000', '700', '600', '400', '3700', '500', '300', new Date().toISOString(), new Date().toISOString()]
    ]
    
    await appendSheet(SHEET_NAMES.WARD_CHARGES, initialData)
  }
  
  private static rowToWardCharges(headers: string[], row: string[]): WardCharges {
    const charges: any = {}
    headers.forEach((header, index) => {
      charges[header] = row[index] || null
    })
    
    return {
      id: charges.id,
      wardType: charges.wardType as any,
      bedCharges: parseFloat(charges.bedCharges) || 0,
      doctorCharges: parseFloat(charges.doctorCharges) || 0,
      nursingCharges: parseFloat(charges.nursingCharges) || 0,
      asstDoctorCharges: parseFloat(charges.asstDoctorCharges) || 0,
      totalPerDay: parseFloat(charges.totalPerDay) || 0,
      monitorCharges: charges.monitorCharges ? parseFloat(charges.monitorCharges) : null,
      o2Charges: charges.o2Charges ? parseFloat(charges.o2Charges) : null,
      createdAt: charges.createdAt,
      updatedAt: charges.updatedAt
    }
  }
}
