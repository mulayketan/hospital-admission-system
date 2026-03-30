import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NursingNotesModel } from '@/lib/sheets-models'
import { nursingNoteSchema } from '@/lib/validations'

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

    const notes = await NursingNotesModel.findByPatientId(patientId)
    return NextResponse.json(notes)
  } catch (error) {
    console.error('Error fetching nursing notes:', error)
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
    const validated = nursingNoteSchema.parse(body)

    const note = await NursingNotesModel.create({
      patientId: validated.patientId,
      ipdNo: validated.ipdNo,
      dateTime: validated.dateTime,
      notes: validated.notes,
      treatment: validated.treatment ?? null,
      staffName: validated.staffName,
      isHandover: validated.isHandover,
    })

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error creating nursing note:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
