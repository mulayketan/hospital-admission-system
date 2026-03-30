import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PatientAdviceModel } from '@/lib/sheets-models'
import { patientAdviceSchema } from '@/lib/validations'

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

    const advice = await PatientAdviceModel.findByPatientId(patientId)
    return NextResponse.json(advice)
  } catch (error) {
    console.error('Error fetching patient advice:', error)
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
    const validated = patientAdviceSchema.parse(body)

    const advice = await PatientAdviceModel.create({
      patientId: validated.patientId,
      ipdNo: validated.ipdNo,
      dateTime: validated.dateTime,
      category: validated.category,
      investigationName: validated.investigationName,
      notes: validated.notes ?? null,
      advisedBy: validated.advisedBy,
      status: validated.status,
      reportNotes: validated.reportNotes ?? null,
    })

    return NextResponse.json(advice, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error creating patient advice:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
