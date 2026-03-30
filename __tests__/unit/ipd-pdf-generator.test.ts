let capturedHtml = ''

const setContentMock = jest.fn(async (html: string) => {
  capturedHtml = html
})
const pdfMock = jest.fn(async () => Buffer.from('mock-pdf'))
const pageCloseMock = jest.fn(async () => undefined)
const browserCloseMock = jest.fn(async () => undefined)

jest.mock('puppeteer-core', () => ({
  launch: jest.fn(async () => ({
    newPage: async () => ({
      setContent: setContentMock,
      pdf: pdfMock,
      close: pageCloseMock,
    }),
    close: browserCloseMock,
  })),
}))

const getPdfModule = () => {
  try {
    return require('@/lib/ipd-pdf-generator')
  } catch (error) {
    throw new Error('Missing module: lib/ipd-pdf-generator.ts')
  }
}

describe('IPD PDF generator templates', () => {
  const patient = {
    id: 'p1',
    firstName: 'Bharatkumar',
    surname: 'Jangid',
    uhidNo: 'Z-21667',
    ipdNo: '188',
    age: 42,
    sex: 'M',
    bedNo: 'Deluxe',
    ward: 'Deluxe',
    treatingDoctor: 'Dr. Deshmukh',
  }

  beforeEach(() => {
    capturedHtml = ''
    jest.clearAllMocks()
  })

  it('generateProgressReportPDF HTML contains patient name, IPD No, UHID, BED No', async () => {
    const { generateProgressReportPDF } = getPdfModule()

    await generateProgressReportPDF({
      patient,
      progressEntries: [],
      adviceEntries: [],
    })

    expect(capturedHtml).toContain('Bharatkumar')
    expect(capturedHtml).toContain('188')
    expect(capturedHtml).toContain('Z-21667')
    expect(capturedHtml).toContain('BED')
  })

  it('generateProgressReportPDF with empty adviceEntries omits INVESTIGATIONS section', async () => {
    const { generateProgressReportPDF } = getPdfModule()

    await generateProgressReportPDF({
      patient,
      progressEntries: [],
      adviceEntries: [],
    })

    expect(capturedHtml).not.toContain('INVESTIGATIONS')
  })

  it('generateProgressReportPDF with adviceEntries includes INVESTIGATIONS section', async () => {
    const { generateProgressReportPDF } = getPdfModule()

    await generateProgressReportPDF({
      patient,
      progressEntries: [],
      adviceEntries: [
        {
          dateTime: '2026-03-23T17:30:00+05:30',
          category: 'Blood Test',
          investigationName: 'CBC',
          notes: '',
          status: 'Pending',
        },
      ],
    })

    expect(capturedHtml).toContain('INVESTIGATIONS')
  })

  it('generateNursingNotesPDF HTML contains UHID and does not contain BED in patient strip', async () => {
    const { generateNursingNotesPDF } = getPdfModule()

    await generateNursingNotesPDF({
      patient,
      nursingEntries: [],
    })

    expect(capturedHtml).toContain('Z-21667')
    expect(capturedHtml).not.toContain('BED No.')
  })

  it('generateDrugOrderPDF with 16 days contains PTO', async () => {
    const { generateDrugOrderPDF } = getPdfModule()
    const dayMap: Record<string, string> = {}
    for (let day = 1; day <= 16; day += 1) {
      dayMap[`day${day}`] = '8AM,8PM'
    }

    await generateDrugOrderPDF({
      patient,
      drugOrders: [
        {
          drugName: 'INJ PAN',
          frequency: 'BD',
          route: 'IV',
          startDate: '2026-03-23',
          days: dayMap,
        },
      ],
    })

    expect(capturedHtml).toContain('PTO')
  })

  it('generateDrugOrderPDF with 14 days does not contain PTO', async () => {
    const { generateDrugOrderPDF } = getPdfModule()
    const dayMap: Record<string, string> = {}
    for (let day = 1; day <= 14; day += 1) {
      dayMap[`day${day}`] = '8AM,8PM'
    }

    await generateDrugOrderPDF({
      patient,
      drugOrders: [
        {
          drugName: 'INJ PAN',
          frequency: 'BD',
          route: 'IV',
          startDate: '2026-03-23',
          days: dayMap,
        },
      ],
    })

    expect(capturedHtml).not.toContain('PTO')
  })
})
