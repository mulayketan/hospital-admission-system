import { z, ZodError } from 'zod'

/**
 * Returns a structured NextResponse-compatible error body for Zod validation failures.
 * Usage: if (error instanceof ZodError) return zodErrorResponse(error)
 */
export const zodErrorBody = (error: ZodError) => ({
  error: 'Validation failed',
  issues: error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
})

// ── IPD Treatment Plan schemas (§9 of spec) ──────────────────────────────────

export const progressReportEntrySchema = z.object({
  patientId:       z.string().min(1),
  ipdNo:           z.string().min(1),
  diagnosis:       z.string().optional(),
  dateTime:        z.string().min(1, 'Date and time required'),
  isAdmissionNote: z.boolean().default(false),
  doctorNotes:     z.string().min(1, 'Notes are required'),
  treatment:       z.string().optional(),
  staffName:       z.string().min(1, 'Staff name required'),
  doctorSignature: z.string().optional(),
})

export const nursingNoteSchema = z.object({
  patientId:  z.string().min(1),
  ipdNo:      z.string().min(1),
  dateTime:   z.string().min(1),
  notes:      z.string().min(1, 'Notes are required'),
  treatment:  z.string().optional(),
  staffName:  z.string().min(1),
  isHandover: z.boolean().default(false),
})

export const vitalSignBaseSchema = z.object({
  patientId: z.string().min(1),
  ipdNo:     z.string().min(1),
  dateTime:  z.string().min(1),
  temp:      z.string().optional(),
  pulse:     z.string().optional(),
  bp:        z.string().optional(),
  spo2:      z.string().optional(),
  bsl:       z.string().optional(),
  ivFluids:  z.string().optional(),
  staffName: z.string().min(1),
})

export const vitalSignSchema = vitalSignBaseSchema.refine(
  (d) => [d.temp, d.pulse, d.bp, d.spo2].some((v) => v && v.trim() !== ''),
  { message: 'At least one of Temp, Pulse, B.P, SPO2 is required' }
)

export const drugOrderSchema = z.object({
  patientId:           z.string().min(1),
  ipdNo:               z.string().min(1),
  drugName:            z.string().min(1, 'Drug name required'),
  drugAllergy:         z.string().optional(),
  frequency:           z.enum(['BD', 'TD', 'TDS', 'OD', 'STAT', 'SOS', 'QD', 'QID', 'HS', '1-0-1', '2-2-2', 'Other']),
  route:               z.enum(['IV', 'INJ (IM)', 'Oral (TAB)', 'Oral (SYP)', 'Oral (CAP)', 'Topical', 'SL', 'Other']),
  startDate:           z.string().min(1),
  days:                z.record(z.string(), z.string()).optional(),
  medOfficerSignature: z.string().optional(),
  ward:                z.string().optional(),
  bedNo:               z.string().optional(),
})

export const patientAdviceSchema = z.object({
  patientId:         z.string().min(1),
  ipdNo:             z.string().min(1),
  dateTime:          z.string().min(1),
  category:          z.enum(['Blood Test', 'Urine Test', 'X-Ray', 'CT Scan', 'MRI', 'USG', 'ECG', 'Echo', 'Other']),
  investigationName: z.string().min(1, 'Investigation name required'),
  advisedBy:         z.string().optional(),
  status:            z.enum(['Pending', 'Done', 'Report Received']).optional().default('Pending'),
  reportNotes:       z.string().optional(),
})

export type ProgressReportEntryInput = z.infer<typeof progressReportEntrySchema>
export type NursingNoteInput = z.infer<typeof nursingNoteSchema>
export type VitalSignBaseInput = z.infer<typeof vitalSignBaseSchema>
export type VitalSignInput = z.infer<typeof vitalSignSchema>
export type DrugOrderInput = z.infer<typeof drugOrderSchema>
export type PatientAdviceInput = z.infer<typeof patientAdviceSchema>

// ── Existing patient schemas ──────────────────────────────────────────────────

// Raw form schema without transforms for form input
export const patientFormSchema = z.object({
  ipdNo: z.string().min(1, 'IPD Number is required'),
  uhidNo: z.string().nullable().optional().transform(val => val ?? null),
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().nullable().optional().transform(val => val ?? null),
  surname: z.string().min(1, 'Surname is required'),
  firstNameMarathi: z.string().nullable().optional().transform(val => val ?? null),
  middleNameMarathi: z.string().nullable().optional().transform(val => val ?? null),
  surnameMarathi: z.string().nullable().optional().transform(val => val ?? null),
  nearestRelativeName: z.string().min(1, 'Nearest relative name is required'),
  relationToPatient: z.string().min(1, 'Relation to patient is required'),
  address: z.string().min(1, 'Address is required'),
  phoneNo: z.string().min(10, 'Phone number must be at least 10 digits'),
  age: z.number().min(0).max(150, 'Age must be between 0 and 150'),
  sex: z.enum(['M', 'F']),
  ward: z.enum(['GENERAL', 'SEMI', 'SPECIAL_WITHOUT_AC', 'SPECIAL_WITH_AC_DELUXE', 'ICU']),
  cashless: z.boolean().default(false),
  tpa: z.string().nullable().optional().transform(val => val ?? null),
  insuranceCompany: z.string().nullable().optional().transform(val => val ?? null),
  other: z.string().nullable().optional().transform(val => val ?? null),
  admittedByDoctor: z.string().min(1, 'Admitting doctor is required'),
  dateOfAdmission: z.string().min(1, 'Date of admission is required'),
  timeOfAdmission: z.string().min(1, 'Time of admission is required'),
  treatingDoctor: z.string().nullable().optional().transform(val => val ?? null),
  dateOfDischarge: z.string().optional(),
  timeOfDischarge: z.string().nullable().optional().transform(val => val ?? null),
  bedNo: z.string().nullable().optional().transform(val => val ?? null),
}).refine((data) => {
  if (data.cashless) {
    return data.tpa;
  }
  return true;
}, {
  message: "TPA is required when Cashless is selected",
  path: ["tpa"]
}).refine((data) => {
  if (data.cashless) {
    return data.insuranceCompany;
  }
  return true;
}, {
  message: "Insurance Company is required when Cashless is selected",
  path: ["insuranceCompany"]
})

// Schema with transforms for API processing
export const patientSchema = z.object({
  ipdNo: z.string().min(1, 'IPD Number is required'),
  uhidNo: z.string().nullable().optional().transform(val => val ?? null),
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().nullable().optional().transform(val => val ?? null),
  surname: z.string().min(1, 'Surname is required'),
  firstNameMarathi: z.string().nullable().optional().transform(val => val ?? null),
  middleNameMarathi: z.string().nullable().optional().transform(val => val ?? null),
  surnameMarathi: z.string().nullable().optional().transform(val => val ?? null),
  nearestRelativeName: z.string().min(1, 'Nearest relative name is required'),
  relationToPatient: z.string().min(1, 'Relation to patient is required'),
  address: z.string().min(1, 'Address is required'),
  phoneNo: z.string().min(10, 'Phone number must be at least 10 digits'),
  age: z.number().min(0).max(150, 'Age must be between 0 and 150'),
  sex: z.enum(['M', 'F']),
  ward: z.enum(['GENERAL', 'SEMI', 'SPECIAL_WITHOUT_AC', 'SPECIAL_WITH_AC_DELUXE', 'ICU']),
  cashless: z.boolean().default(false),
  tpa: z.string().nullable().optional().transform(val => val ?? null),
  insuranceCompany: z.string().nullable().optional().transform(val => val ?? null),
  other: z.string().nullable().optional().transform(val => val ?? null),
  admittedByDoctor: z.string().min(1, 'Admitting doctor is required'),
  dateOfAdmission: z.string().min(1, 'Date of admission is required').transform((str) => new Date(str)),
  timeOfAdmission: z.string().min(1, 'Time of admission is required'),
  treatingDoctor: z.string().nullable().optional().transform(val => val ?? null),
  dateOfDischarge: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  timeOfDischarge: z.string().nullable().optional().transform(val => val ?? null),
  bedNo: z.string().nullable().optional().transform(val => val ?? null),
}).refine((data) => {
  if (data.cashless) {
    return data.tpa;
  }
  return true;
}, {
  message: "TPA is required when Cashless is selected",
  path: ["tpa"]
}).refine((data) => {
  if (data.cashless) {
    return data.insuranceCompany;
  }
  return true;
}, {
  message: "Insurance Company is required when Cashless is selected",
  path: ["insuranceCompany"]
})

export const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['ADMIN', 'STAFF']).default('ADMIN'),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type PatientFormInput = z.infer<typeof patientFormSchema>
export type PatientInput = z.infer<typeof patientSchema>
export type UserInput = z.infer<typeof userSchema>
export type LoginInput = z.infer<typeof loginSchema>
