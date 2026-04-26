import { ZodError } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PatientAdviceModel, PatientModel } from '@/lib/sheets-models'
import { patientAdviceSchema , zodErrorBody } from '@/lib/validations'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const partial = patientAdviceSchema.partial().parse(body)
    const existing = await PatientAdviceModel.findById(id)
    const patient = existing ? await PatientModel.findById(existing.patientId) : null
    const advisedBy = partial.advisedBy ?? patient?.treatingDoctor ?? undefined

    const updated = await PatientAdviceModel.update(id, {
      ...(partial.dateTime !== undefined && { dateTime: partial.dateTime }),
      ...(partial.category !== undefined && { category: partial.category }),
      ...(partial.investigationName !== undefined && { investigationName: partial.investigationName }),
      ...(advisedBy !== undefined && { advisedBy: advisedBy as string }),
      ...(partial.status !== undefined && { status: partial.status }),
      ...(partial.reportNotes !== undefined && { reportNotes: partial.reportNotes ?? null }),
    })

    if (!updated) {
      return NextResponse.json({ error: 'Advice not found' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(zodErrorBody(error), { status: 400 })
    }
    console.error('Error updating patient advice:', error)
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 503 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: ADMIN role required' }, { status: 403 })
    }

    const { id } = await params
    const success = await PatientAdviceModel.delete(id)

    if (!success) {
      return NextResponse.json({ error: 'Advice not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Advice deleted successfully' })
  } catch (error) {
    console.error('Error deleting patient advice:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
