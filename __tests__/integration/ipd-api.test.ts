jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/sheets-models', () => ({
  ProgressReportModel: {
    create: jest.fn(),
    delete: jest.fn(),
    hasAdmissionNote: jest.fn(),
  },
  NursingChartModel: {
    create: jest.fn(),
  },
  PatientModel: {
    findById: jest.fn(),
  },
  PatientAdviceModel: {
    findByPatientId: jest.fn(),
  },
  NursingNotesModel: {
    findByPatientId: jest.fn(),
  },
  DrugOrderModel: {
    findByPatientId: jest.fn(),
  },
}))

jest.mock('@/lib/ipd-pdf-generator', () => ({
  generateCombinedIPDPDF: jest.fn(async () => Buffer.from('%PDF-1.4\n')),
  generateProgressReportPDF: jest.fn(),
  generateNursingNotesPDF: jest.fn(),
  generateNursingChartPDF: jest.fn(),
  generateDrugOrderPDF: jest.fn(),
}))

import { getServerSession } from 'next-auth'
import * as sheetModels from '@/lib/sheets-models'

const mockSession = getServerSession as jest.Mock
const mockedModels = sheetModels as any

const importRoute = (path: string) => {
  try {
    return require(path)
  } catch (error) {
    throw new Error(`Missing route module: ${path}`)
  }
}

describe('IPD API integration scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN', name: 'Admin' } })
    mockedModels.ProgressReportModel.hasAdmissionNote.mockResolvedValue(false)
  })

  it('POST /api/ipd/progress-report returns 201 with valid body', async () => {
    const route = importRoute('@/app/api/ipd/progress-report/route')
    mockedModels.ProgressReportModel.create.mockResolvedValue({ id: 'pr1' })

    const request = new Request('http://localhost/api/ipd/progress-report', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        patientId: 'p1',
        ipdNo: 'IPD-001',
        dateTime: '2026-03-23T17:30:00+05:30',
        doctorNotes: 'notes',
        treatment: 'tx',
        staffName: 'Dr A',
      }),
    })

    const response = await route.POST(request)
    expect(response.status).toBe(201)
  })

  it('POST /api/ipd/progress-report returns 400 with missing doctorNotes', async () => {
    const route = importRoute('@/app/api/ipd/progress-report/route')
    const request = new Request('http://localhost/api/ipd/progress-report', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        patientId: 'p1',
        ipdNo: 'IPD-001',
        dateTime: '2026-03-23T17:30:00+05:30',
        treatment: 'tx',
        staffName: 'Dr A',
      }),
    })

    const response = await route.POST(request)
    expect(response.status).toBe(400)
  })

  it('POST /api/ipd/progress-report returns 401 without session', async () => {
    const route = importRoute('@/app/api/ipd/progress-report/route')
    mockSession.mockResolvedValueOnce(null)

    const request = new Request('http://localhost/api/ipd/progress-report', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        patientId: 'p1',
        ipdNo: 'IPD-001',
        dateTime: '2026-03-23T17:30:00+05:30',
        doctorNotes: 'notes',
        staffName: 'Dr A',
      }),
    })

    const response = await route.POST(request)
    expect(response.status).toBe(401)
  })

  it('DELETE /api/ipd/progress-report/[id] returns 403 for STAFF role', async () => {
    const route = importRoute('@/app/api/ipd/progress-report/[id]/route')
    mockSession.mockResolvedValueOnce({ user: { id: 's1', role: 'STAFF', name: 'Staff' } })

    const request = new Request('http://localhost/api/ipd/progress-report/pr1', {
      method: 'DELETE',
    })

    const response = await route.DELETE(request, {
      params: Promise.resolve({ id: 'pr1' }),
    })
    expect(response.status).toBe(403)
  })

  it('POST /api/ipd/nursing-chart returns 400 when temp/pulse/bp/spo2 are empty', async () => {
    const route = importRoute('@/app/api/ipd/nursing-chart/route')
    const request = new Request('http://localhost/api/ipd/nursing-chart', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        patientId: 'p1',
        ipdNo: 'IPD-001',
        dateTime: '2026-03-23T17:30:00+05:30',
        temp: '',
        pulse: '',
        bp: '',
        spo2: '',
        staffName: 'Nurse A',
      }),
    })

    const response = await route.POST(request)
    expect(response.status).toBe(400)
  })

  it('GET /api/patients/[id]/ipd-pdf?form=advice returns 400', async () => {
    const route = importRoute('@/app/api/patients/[id]/ipd-pdf/route')
    const request = new Request('http://localhost/api/patients/p1/ipd-pdf?form=advice', {
      method: 'GET',
    })

    const response = await route.GET(request, { params: Promise.resolve({ id: 'p1' }) })
    expect(response.status).toBe(400)
  })

  it('GET /api/patients/[id]/ipd-pdf returns 200 with binary content-type', async () => {
    const route = importRoute('@/app/api/patients/[id]/ipd-pdf/route')
    mockedModels.PatientModel.findById.mockResolvedValue({
      id: 'p1',
      ipdNo: '188',
      firstName: 'Bharatkumar',
      surname: 'Jangid',
      age: 42,
      sex: 'M',
    })
    mockedModels.ProgressReportModel.findByPatientId = jest.fn(async () => [])
    mockedModels.NursingNotesModel.findByPatientId = jest.fn(async () => [])
    mockedModels.NursingChartModel.findByPatientId = jest.fn(async () => [])
    mockedModels.DrugOrderModel.findByPatientId = jest.fn(async () => [])
    mockedModels.PatientAdviceModel.findByPatientId = jest.fn(async () => [])

    const request = new Request('http://localhost/api/patients/p1/ipd-pdf', { method: 'GET' })
    const response = await route.GET(request, { params: Promise.resolve({ id: 'p1' }) })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/pdf')
  })
})
