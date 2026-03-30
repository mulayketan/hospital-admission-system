import * as validations from '@/lib/validations'

const getSchema = (name: string) => {
  const schema = (validations as any)[name]
  expect(schema).toBeDefined()
  if (!schema) {
    throw new Error(`Missing schema export: ${name}`)
  }
  return schema
}

describe('IPD validation schemas', () => {
  describe('progressReportEntrySchema', () => {
    const validEntry = {
      patientId: 'patient-1',
      ipdNo: 'IPD-101',
      diagnosis: 'Viral fever',
      dateTime: '2026-03-23T17:30:00+05:30',
      isAdmissionNote: true,
      doctorNotes: 'Patient has fever and chills',
      treatment: 'Paracetamol',
      staffName: 'Dr. Deshmukh',
      doctorSignature: 'Dr. Deshmukh',
    }

    it('accepts a valid payload', () => {
      const result = getSchema('progressReportEntrySchema').safeParse(validEntry)
      expect(result.success).toBe(true)
    })

    it('rejects when doctorNotes is missing', () => {
      const { doctorNotes, ...payload } = validEntry
      void doctorNotes
      const result = getSchema('progressReportEntrySchema').safeParse(payload)
      expect(result.success).toBe(false)
    })

    it('rejects when patientId is empty', () => {
      const result = getSchema('progressReportEntrySchema').safeParse({
        ...validEntry,
        patientId: '',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('nursingNoteSchema', () => {
    const validNote = {
      patientId: 'patient-1',
      ipdNo: 'IPD-101',
      dateTime: '2026-03-23T17:30:00+05:30',
      notes: 'Injection given',
      treatment: 'Continue fluids',
      staffName: 'Nurse A',
      isHandover: false,
    }

    it('accepts a valid payload', () => {
      const result = getSchema('nursingNoteSchema').safeParse(validNote)
      expect(result.success).toBe(true)
    })

    it('rejects when notes is missing', () => {
      const { notes, ...payload } = validNote
      void notes
      const result = getSchema('nursingNoteSchema').safeParse(payload)
      expect(result.success).toBe(false)
    })
  })

  describe('vitalSignSchema', () => {
    const validVital = {
      patientId: 'patient-1',
      ipdNo: 'IPD-101',
      dateTime: '2026-03-23T17:30:00+05:30',
      temp: '99.2F',
      pulse: '',
      bp: '',
      spo2: '',
      bsl: '',
      ivFluids: '',
      staffName: 'Nurse A',
    }

    it('accepts a valid payload', () => {
      const result = getSchema('vitalSignSchema').safeParse(validVital)
      expect(result.success).toBe(true)
    })

    it('rejects when temp/pulse/bp/spo2 are all empty', () => {
      const result = getSchema('vitalSignSchema').safeParse({
        ...validVital,
        temp: '   ',
        pulse: '',
        bp: '',
        spo2: '',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('drugOrderSchema', () => {
    const validOrder = {
      patientId: 'patient-1',
      ipdNo: 'IPD-101',
      drugName: 'INJ PAN 40mg',
      drugAllergy: '',
      frequency: 'BD',
      route: 'INJ (IM)',
      startDate: '2026-03-23',
      days: { day1: '8AM,8PM' },
      medOfficerSignature: 'Dr. Deshmukh',
      ward: 'Deluxe',
      bedNo: 'B-12',
    }

    it('accepts a valid payload', () => {
      const result = getSchema('drugOrderSchema').safeParse(validOrder)
      expect(result.success).toBe(true)
    })

    it('rejects invalid frequency enum', () => {
      const result = getSchema('drugOrderSchema').safeParse({
        ...validOrder,
        frequency: 'BID',
      })
      expect(result.success).toBe(false)
    })

    it('rejects route INJ(IM) and accepts INJ (IM)', () => {
      const invalid = getSchema('drugOrderSchema').safeParse({
        ...validOrder,
        route: 'INJ(IM)',
      })
      const valid = getSchema('drugOrderSchema').safeParse({
        ...validOrder,
        route: 'INJ (IM)',
      })

      expect(invalid.success).toBe(false)
      expect(valid.success).toBe(true)
    })
  })

  describe('patientAdviceSchema', () => {
    const validAdvice = {
      patientId: 'patient-1',
      ipdNo: 'IPD-101',
      dateTime: '2026-03-23T17:30:00+05:30',
      category: 'Urine Test',
      investigationName: 'Urine R/M',
      notes: 'Fasting not required',
      advisedBy: 'Dr. Deshmukh',
      status: 'Pending',
      reportNotes: '',
    }

    it('accepts a valid payload', () => {
      const result = getSchema('patientAdviceSchema').safeParse(validAdvice)
      expect(result.success).toBe(true)
    })

    it('rejects invalid category enum', () => {
      const result = getSchema('patientAdviceSchema').safeParse({
        ...validAdvice,
        category: 'Lab',
      })
      expect(result.success).toBe(false)
    })
  })
})
