import { ZodError } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ProgressReportModel } from '@/lib/sheets-models'
import { progressReportEntrySchema, zodErrorBody } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const patientId = new URL(request.url).searchParams.get('patientId')
    if (!patientId) {
      return NextResponse.json({ error: 'patientId query parameter is required' }, { status: 400 })
    }

    const entries = await ProgressReportModel.findByPatientId(patientId)
    return NextResponse.json(entries)
  } catch (error) {
    console.error('Error fetching progress report entries:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = progressReportEntrySchema.parse(body)

    // Determine if this is the first entry for this patient (admission note)
    const hasAdmissionNote = await ProgressReportModel.hasAdmissionNote(validated.patientId)
    const isAdmissionNote = !hasAdmissionNote

    const entry = await ProgressReportModel.create({
      patientId: validated.patientId,
      ipdNo: validated.ipdNo,
      diagnosis: isAdmissionNote ? (validated.diagnosis ?? null) : null,
      dateTime: validated.dateTime,
      isAdmissionNote,
      doctorNotes: validated.doctorNotes,
      treatment: validated.treatment ?? null,
      staffName: validated.staffName,
      doctorSignature: validated.doctorSignature ?? null,
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(zodErrorBody(error), { status: 400 })
    }
    console.error('Error creating progress report entry:', error)
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 503 })
  }
}
