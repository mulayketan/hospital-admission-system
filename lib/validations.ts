import { z } from 'zod'

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

export const admissionSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  admissionDate: z.string().min(1, 'Admission date is required').transform((str) => new Date(str)),
  dischargeDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  wardType: z.enum(['GENERAL', 'SEMI', 'SPECIAL_WITHOUT_AC', 'SPECIAL_WITH_AC_DELUXE', 'ICU']),
  bedCharges: z.number().min(0),
  doctorCharges: z.number().min(0),
  nursingCharges: z.number().min(0),
  asstDoctorCharges: z.number().min(0),
  totalPerDay: z.number().min(0),
  monitorCharges: z.number().min(0).optional(),
  o2Charges: z.number().min(0).optional(),
  syringePumpCharges: z.number().min(0).optional(),
  bloodTransfusionCharges: z.number().min(0).optional(),
  visitingCharges: z.number().min(0).optional(),
  finalDiagnosis: z.string().optional(),
  treatmentDetails: z.string().optional(),
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
export type AdmissionInput = z.infer<typeof admissionSchema>
export type UserInput = z.infer<typeof userSchema>
export type LoginInput = z.infer<typeof loginSchema>
