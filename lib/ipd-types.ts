// IPD Treatment Plan — TypeScript interfaces (§10 of spec)

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
  | 'Blood Test'
  | 'Urine Test'
  | 'X-Ray'
  | 'CT Scan'
  | 'MRI'
  | 'USG'
  | 'ECG'
  | 'Echo'
  | 'Other'

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
  days: Record<string, string>
  medOfficerSignature: string | null
  ward: string | null
  bedNo: string | null
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

// Patient context held in dashboard state for IPD Treatment tab
export interface SelectedPatient {
  id: string
  ipdNo: string | null
  uhidNo: string | null
  firstName: string
  middleName: string | null
  surname: string
  age: number
  sex: 'M' | 'F'
  ward: string
  treatingDoctor: string | null
  bedNo: string | null
}

export const FREQUENCY_OPTIONS = [
  'BD', 'TDS', 'OD', 'STAT', 'SOS', 'QID', 'HS', '1-0-1', '2-2-2', 'Other',
] as const

export const ROUTE_OPTIONS = [
  'IV', 'INJ (IM)', 'Oral (TAB)', 'Oral (SYP)', 'Oral (CAP)', 'Topical', 'SL', 'Other',
] as const

export const INVESTIGATION_CATEGORIES: InvestigationCategory[] = [
  'Blood Test', 'Urine Test', 'X-Ray', 'CT Scan', 'MRI', 'USG', 'ECG', 'Echo', 'Other',
]

export const ADVICE_STATUS_OPTIONS = ['Pending', 'Done', 'Report Received'] as const

export const WARD_DISPLAY_NAMES: Record<string, string> = {
  GENERAL: 'General',
  SEMI: 'Semi',
  SPECIAL_WITHOUT_AC: 'Special (No AC)',
  SPECIAL_WITH_AC_DELUXE: 'Deluxe (AC)',
  ICU: 'ICU',
}
