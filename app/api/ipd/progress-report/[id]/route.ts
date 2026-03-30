import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ProgressReportModel } from '@/lib/sheets-models'
import { progressReportEntrySchema } from '@/lib/validations'

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
    const partial = progressReportEntrySchema.partial().parse(body)

    const updated = await ProgressReportModel.update(id, {
      ...(partial.diagnosis !== undefined && { diagnosis: partial.diagnosis ?? null }),
      ...(partial.dateTime !== undefined && { dateTime: partial.dateTime }),
      ...(partial.doctorNotes !== undefined && { doctorNotes: partial.doctorNotes }),
      ...(partial.treatment !== undefined && { treatment: partial.treatment ?? null }),
      ...(partial.staffName !== undefined && { staffName: partial.staffName }),
      ...(partial.doctorSignature !== undefined && { doctorSignature: partial.doctorSignature ?? null }),
    })

    if (!updated) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error updating progress report entry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
    const success = await ProgressReportModel.delete(id)

    if (!success) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Entry deleted successfully' })
  } catch (error) {
    console.error('Error deleting progress report entry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
