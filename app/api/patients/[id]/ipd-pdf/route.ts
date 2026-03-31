import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  PatientModel,
  ProgressReportModel,
  NursingNotesModel,
  NursingChartModel,
  DrugOrderModel,
  PatientAdviceModel,
} from '@/lib/sheets-models'
import {
  generateProgressReportPDF,
  generateNursingNotesPDF,
  generateNursingChartPDF,
  generateDrugOrderPDF,
  generateCombinedIPDPDF,
  type IPDPatient,
} from '@/lib/ipd-pdf-generator'

export const runtime = 'nodejs'

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
          ProgressReportModel.findByPatientId(id),
          PatientAdviceModel.findByPatientId(id),
          NursingNotesModel.findByPatientId(id),
          NursingChartModel.findByPatientId(id),
          DrugOrderModel.findByPatientId(id),
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
        ProgressReportModel.findByPatientId(id),
        PatientAdviceModel.findByPatientId(id),
      ])
      pdfBuffer = await generateProgressReportPDF({ patient, entries, adviceEntries })
      fileName = `ipd-progress-report-${ipdLabel}.pdf`
    } else if (formParam === 'nursing-notes') {
      const entries = await NursingNotesModel.findByPatientId(id)
      pdfBuffer = await generateNursingNotesPDF({ patient, entries })
      fileName = `ipd-nursing-notes-${ipdLabel}.pdf`
    } else if (formParam === 'nursing-chart') {
      const vitalSigns = await NursingChartModel.findByPatientId(id)
      pdfBuffer = await generateNursingChartPDF({ patient, vitalSigns })
      fileName = `ipd-nursing-chart-${ipdLabel}.pdf`
    } else {
      // formParam === 'drug-orders'
      const drugOrders = await DrugOrderModel.findByPatientId(id)
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
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}
