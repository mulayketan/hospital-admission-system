import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PatientModel } from '@/lib/sheets-models'
import { readSheet } from '@/lib/google-sheets'
import {
  generateProgressReportPDF,
  generateNursingNotesPDF,
  generateNursingChartPDF,
  generateDrugOrderPDF,
  generateCombinedIPDPDF,
  type IPDPatient,
  type ProgressReportEntry,
  type NursingNote,
  type VitalSign,
  type DrugOrder,
  type PatientAdvice,
} from '@/lib/ipd-pdf-generator'

export const runtime = 'nodejs'

// ---------------------------------------------------------------------------
// Inline sheet readers — minimal row-mapping for PDF data fetch
// ---------------------------------------------------------------------------

async function getProgressReportEntries(patientId: string): Promise<ProgressReportEntry[]> {
  const data = await readSheet('ProgressReport')
  if (data.length <= 1) return []
  return data
    .slice(1)
    .filter(row => row[1] === patientId)
    .map(row => ({
      id: row[0] || '',
      patientId: row[1] || '',
      ipdNo: row[2] || '',
      diagnosis: row[3] || null,
      dateTime: row[4] || '',
      isAdmissionNote: row[5] === 'true',
      doctorNotes: row[6] || '',
      treatment: row[7] || null,
      staffName: row[8] || '',
      doctorSignature: row[9] || null,
      createdAt: row[10] || '',
      updatedAt: row[11] || '',
    }))
}

async function getNursingNotes(patientId: string): Promise<NursingNote[]> {
  const data = await readSheet('NursingNotes')
  if (data.length <= 1) return []
  return data
    .slice(1)
    .filter(row => row[1] === patientId)
    .map(row => ({
      id: row[0] || '',
      patientId: row[1] || '',
      ipdNo: row[2] || '',
      dateTime: row[3] || '',
      notes: row[4] || '',
      treatment: row[5] || null,
      staffName: row[6] || '',
      isHandover: row[7] === 'true',
      createdAt: row[8] || '',
      updatedAt: row[9] || '',
    }))
}

async function getVitalSigns(patientId: string): Promise<VitalSign[]> {
  const data = await readSheet('NursingChart')
  if (data.length <= 1) return []
  return data
    .slice(1)
    .filter(row => row[1] === patientId)
    .map(row => ({
      id: row[0] || '',
      patientId: row[1] || '',
      ipdNo: row[2] || '',
      dateTime: row[3] || '',
      temp: row[4] || null,
      pulse: row[5] || null,
      bp: row[6] || null,
      spo2: row[7] || null,
      bsl: row[8] || null,
      ivFluids: row[9] || null,
      staffName: row[10] || '',
      createdAt: row[11] || '',
      updatedAt: row[12] || '',
    }))
}

async function getDrugOrders(patientId: string): Promise<DrugOrder[]> {
  const data = await readSheet('DrugOrders')
  if (data.length <= 1) return []
  return data
    .slice(1)
    .filter(row => row[1] === patientId)
    .map(row => {
      // Columns K–AT (indices 10–45) = day1–day36
      const days: Record<string, string> = {}
      for (let i = 0; i < 36; i++) {
        const val = row[10 + i]
        if (val) days[`day${i + 1}`] = val
      }
      return {
        id: row[0] || '',
        patientId: row[1] || '',
        ipdNo: row[2] || '',
        drugName: row[3] || '',
        drugAllergy: row[4] || null,
        frequency: row[5] || '',
        route: row[6] || '',
        startDate: row[7] || '',
        ward: row[8] || null,
        bedNo: row[9] || null,
        days,
        medOfficerSignature: row[46] || null,
        createdAt: row[47] || '',
        updatedAt: row[48] || '',
      }
    })
}

async function getPatientAdvice(patientId: string): Promise<PatientAdvice[]> {
  const data = await readSheet('PatientAdvice')
  if (data.length <= 1) return []
  return data
    .slice(1)
    .filter(row => row[1] === patientId)
    .map(row => ({
      id: row[0] || '',
      patientId: row[1] || '',
      ipdNo: row[2] || '',
      dateTime: row[3] || '',
      category: row[4] || '',
      investigationName: row[5] || '',
      notes: row[6] || null,
      advisedBy: row[7] || '',
      status: (row[8] as PatientAdvice['status']) || 'Pending',
      reportNotes: row[9] || null,
      createdAt: row[10] || '',
      updatedAt: row[11] || '',
    }))
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

const VALID_FORMS = ['progress-report', 'nursing-notes', 'nursing-chart', 'drug-orders'] as const
type FormParam = (typeof VALID_FORMS)[number]

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = request.nextUrl
    const formParam = searchParams.get('form')

    // Reject ?form=advice explicitly (§5: No ?form=advice)
    if (formParam === 'advice') {
      return NextResponse.json(
        { error: 'No standalone advice PDF. Advice is embedded in the Progress Report PDF.' },
        { status: 400 }
      )
    }

    // Validate ?form= value (if provided)
    if (formParam !== null && !VALID_FORMS.includes(formParam as FormParam)) {
      return NextResponse.json(
        { error: `Invalid form parameter. Valid values: ${VALID_FORMS.join(', ')}` },
        { status: 400 }
      )
    }

    // Fetch the patient record
    const patientRecord = await PatientModel.findById(id)
    if (!patientRecord) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    const patient: IPDPatient = {
      id: patientRecord.id,
      ipdNo: patientRecord.ipdNo,
      uhidNo: patientRecord.uhidNo,
      firstName: patientRecord.firstName,
      middleName: patientRecord.middleName,
      surname: patientRecord.surname,
      age: patientRecord.age,
      sex: patientRecord.sex,
      ward: patientRecord.ward,
      treatingDoctor: patientRecord.treatingDoctor,
      bedNo: patientRecord.bedNo ?? null,
    }

    let pdfBuffer: Buffer
    let fileName: string
    const ipdLabel = patient.ipdNo || id

    if (formParam === null) {
      // -----------------------------------------------------------------------
      // Combined — all 4 forms
      // -----------------------------------------------------------------------
      const [progressEntries, adviceEntries, nursingNotes, vitalSigns, drugOrders] =
        await Promise.all([
          getProgressReportEntries(id),
          getPatientAdvice(id),
          getNursingNotes(id),
          getVitalSigns(id),
          getDrugOrders(id),
        ])

      pdfBuffer = await generateCombinedIPDPDF({
        patient,
        progressEntries,
        adviceEntries,
        nursingNotes,
        vitalSigns,
        drugOrders,
      })
      fileName = `ipd-complete-${ipdLabel}.pdf`
    } else if (formParam === 'progress-report') {
      const [entries, adviceEntries] = await Promise.all([
        getProgressReportEntries(id),
        getPatientAdvice(id),
      ])
      pdfBuffer = await generateProgressReportPDF({ patient, entries, adviceEntries })
      fileName = `ipd-progress-report-${ipdLabel}.pdf`
    } else if (formParam === 'nursing-notes') {
      const entries = await getNursingNotes(id)
      pdfBuffer = await generateNursingNotesPDF({ patient, entries })
      fileName = `ipd-nursing-notes-${ipdLabel}.pdf`
    } else if (formParam === 'nursing-chart') {
      const vitalSigns = await getVitalSigns(id)
      pdfBuffer = await generateNursingChartPDF({ patient, vitalSigns })
      fileName = `ipd-nursing-chart-${ipdLabel}.pdf`
    } else {
      // formParam === 'drug-orders'
      const drugOrders = await getDrugOrders(id)
      pdfBuffer = await generateDrugOrderPDF({ patient, drugOrders })
      fileName = `ipd-drug-orders-${ipdLabel}.pdf`
    }

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error: unknown) {
    console.error('Error generating IPD PDF:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
