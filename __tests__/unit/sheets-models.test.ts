jest.mock('@/lib/google-sheets', () => ({
  appendSheet: jest.fn(),
  readSheet: jest.fn(),
  updateRow: jest.fn(),
  deleteRow: jest.fn(),
  findRowByValue: jest.fn(),
  generateId: jest.fn(() => 'generated-id'),
  nowIST: jest.fn(() => '2026-03-30T10:00:00.000Z'),
  sanitizeSheetValue: (value: string) => value,
  SHEET_NAMES: {
    MEDICINES: 'Medicines',
    INVESTIGATIONS: 'Investigations',
    PROGRESS_REPORT: 'ProgressReport',
    NURSING_CHART: 'NursingChart',
    DRUG_ORDERS: 'DrugOrders',
    PATIENT_ADVICE: 'PatientAdvice',
  },
}))

import * as googleSheets from '@/lib/google-sheets'
import * as models from '@/lib/sheets-models'

const getModel = (allModels: any, name: string) => {
  const model = allModels[name]
  expect(model).toBeDefined()
  if (!model) {
    throw new Error(`Missing model export: ${name}`)
  }
  return model
}

describe('IPD sheets models', () => {
  const mockedSheets = googleSheets as any
  const modelExports = models as any

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers().setSystemTime(new Date('2026-03-30T10:00:00.000Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('MedicineModel.findMany returns mapped Medicine[]', async () => {
    const MedicineModel = getModel(modelExports, 'MedicineModel')
    mockedSheets.readSheet.mockResolvedValue([
      ['id', 'name', 'category', 'defaultDose', 'defaultFrequency', 'defaultRoute', 'createdAt', 'updatedAt'],
      ['m1', 'INJ PAN 40mg', 'INJ', '40mg', 'BD', 'IV', 'c1', 'u1'],
    ])

    const rows = await MedicineModel.findMany()
    expect(rows).toEqual([
      expect.objectContaining({
        id: 'm1',
        name: 'INJ PAN 40mg',
        defaultRoute: 'IV',
      }),
    ])
  })

  it('InvestigationModel.findMany returns mapped Investigation[]', async () => {
    const InvestigationModel = getModel(modelExports, 'InvestigationModel')
    mockedSheets.readSheet.mockResolvedValue([
      ['id', 'name', 'category', 'createdAt', 'updatedAt'],
      ['i1', 'Echo test', 'Echo', 'c1', 'u1'],
    ])

    const rows = await InvestigationModel.findMany()
    expect(rows).toEqual([
      expect.objectContaining({
        id: 'i1',
        name: 'Echo test',
        category: 'Echo',
      }),
    ])
  })

  it('ProgressReportModel.create calls appendSheet with §4.3 row order', async () => {
    const ProgressReportModel = getModel(modelExports, 'ProgressReportModel')

    await ProgressReportModel.create({
      patientId: 'p1',
      ipdNo: 'IPD-001',
      diagnosis: 'Viral fever',
      dateTime: '2026-03-23T17:30:00+05:30',
      isAdmissionNote: true,
      doctorNotes: 'C/O fever',
      treatment: 'Rx CT-011',
      staffName: 'Dr A',
      doctorSignature: 'Dr A',
    })

    expect(mockedSheets.appendSheet).toHaveBeenCalledTimes(1)
    const appendedRow = mockedSheets.appendSheet.mock.calls[0][1][0]
    expect(appendedRow).toEqual([
      'generated-id',
      'p1',
      'IPD-001',
      'Viral fever',
      '2026-03-23T17:30:00+05:30',
      'true',
      'C/O fever',
      'Rx CT-011',
      'Dr A',
      'Dr A',
      '2026-03-30T10:00:00.000Z',
      '2026-03-30T10:00:00.000Z',
    ])
  })

  it('ProgressReportModel.findByPatientId filters by column B patientId', async () => {
    const ProgressReportModel = getModel(modelExports, 'ProgressReportModel')
    mockedSheets.readSheet.mockResolvedValue([
      ['id', 'patientId', 'ipdNo', 'diagnosis', 'dateTime', 'isAdmissionNote', 'doctorNotes', 'treatment', 'staffName', 'doctorSignature', 'createdAt', 'updatedAt'],
      ['r1', 'patient-1', 'IPD-001', '', 'dt', 'false', 'n1', '', 'staff', '', 'c1', 'u1'],
      ['r2', 'patient-2', 'IPD-002', '', 'dt', 'false', 'n2', '', 'staff', '', 'c2', 'u2'],
    ])

    const rows = await ProgressReportModel.findByPatientId('patient-1')
    expect(rows).toHaveLength(1)
    expect(rows[0].patientId).toBe('patient-1')
  })

  it("ProgressReportModel.update diagnosis-only merges without overwriting staffName", async () => {
    const ProgressReportModel = getModel(modelExports, 'ProgressReportModel')
    mockedSheets.readSheet.mockResolvedValue([
      ['id', 'patientId', 'ipdNo', 'diagnosis', 'dateTime', 'isAdmissionNote', 'doctorNotes', 'treatment', 'staffName', 'doctorSignature', 'createdAt', 'updatedAt'],
      ['r1', 'patient-1', 'IPD-001', 'Old Dx', 'dt', 'true', 'notes', 'tx', 'Original Staff', 'Dr A', 'c1', 'u1'],
    ])
    mockedSheets.findRowByValue.mockResolvedValue(2)

    await ProgressReportModel.update('r1', { diagnosis: 'New Dx' })

    const updatedRow = mockedSheets.updateRow.mock.calls[0][2]
    expect(updatedRow[3]).toBe('New Dx')
    expect(updatedRow[8]).toBe('Original Staff')
  })

  it('NursingChartModel.create uses §4.5 column order', async () => {
    const NursingChartModel = getModel(modelExports, 'NursingChartModel')

    await NursingChartModel.create({
      patientId: 'p1',
      ipdNo: 'IPD-001',
      dateTime: '2026-03-23T17:30:00+05:30',
      temp: '99.2F',
      pulse: '78/min',
      bp: '130/70',
      spo2: '99%',
      bsl: '110',
      ivFluids: 'DNS 500ml',
      staffName: 'Nurse A',
    })

    const appendedRow = mockedSheets.appendSheet.mock.calls[0][1][0]
    expect(appendedRow).toEqual([
      'generated-id',
      'p1',
      'IPD-001',
      '2026-03-23T17:30:00+05:30',
      '99.2F',
      '78/min',
      '130/70',
      '99%',
      '110',
      'DNS 500ml',
      'Nurse A',
      '2026-03-30T10:00:00.000Z',
      '2026-03-30T10:00:00.000Z',
    ])
  })

  it('DrugOrderModel.create serializes day1-day36 into columns K-AT', async () => {
    const DrugOrderModel = getModel(modelExports, 'DrugOrderModel')

    await DrugOrderModel.create({
      patientId: 'p1',
      ipdNo: 'IPD-001',
      drugName: 'INJ PAN',
      drugAllergy: 'None',
      frequency: 'BD',
      route: 'INJ (IM)',
      startDate: '2026-03-23',
      ward: 'Deluxe',
      bedNo: 'B12',
      days: { day1: '8AM,8PM', day2: '8AM', day36: '9PM' },
      medOfficerSignature: 'Dr A',
    })

    const appendedRow = mockedSheets.appendSheet.mock.calls[0][1][0]
    expect(appendedRow[10]).toBe('8AM,8PM')
    expect(appendedRow[11]).toBe('8AM')
    expect(appendedRow[45]).toBe('9PM')
    expect(appendedRow[46]).toBe('Dr A')
  })

  it('PatientAdviceModel.update updates only status/reportNotes/updatedAt', async () => {
    const PatientAdviceModel = getModel(modelExports, 'PatientAdviceModel')
    mockedSheets.readSheet.mockResolvedValue([
      ['id', 'patientId', 'ipdNo', 'dateTime', 'category', 'investigationName', 'notes', 'advisedBy', 'status', 'reportNotes', 'createdAt', 'updatedAt'],
      ['a1', 'p1', 'IPD-001', 'dt', 'Blood Test', 'CBC', 'note', 'Dr A', 'Pending', '', 'c1', 'u1'],
    ])
    mockedSheets.findRowByValue.mockResolvedValue(2)

    await PatientAdviceModel.update('a1', {
      status: 'Done',
      reportNotes: 'Reviewed',
    })

    const updatedRow = mockedSheets.updateRow.mock.calls[0][2]
    expect(updatedRow[0]).toBe('a1')
    expect(updatedRow[1]).toBe('p1')
    expect(updatedRow[8]).toBe('Done')
    expect(updatedRow[9]).toBe('Reviewed')
    expect(updatedRow[11]).toBe('2026-03-30T10:00:00.000Z')
  })
})
