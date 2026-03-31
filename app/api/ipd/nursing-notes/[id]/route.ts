import { ZodError } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NursingNotesModel } from '@/lib/sheets-models'
import { nursingNoteSchema , zodErrorBody } from '@/lib/validations'

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
    const partial = nursingNoteSchema.partial().parse(body)

    const updated = await NursingNotesModel.update(id, {
      ...(partial.dateTime !== undefined && { dateTime: partial.dateTime }),
      ...(partial.notes !== undefined && { notes: partial.notes }),
      ...(partial.treatment !== undefined && { treatment: partial.treatment ?? null }),
      ...(partial.staffName !== undefined && { staffName: partial.staffName }),
      ...(partial.isHandover !== undefined && { isHandover: partial.isHandover }),
    })

    if (!updated) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(zodErrorBody(error), { status: 400 })
    }
    console.error('Error updating nursing note:', error)
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
    const success = await NursingNotesModel.delete(id)

    if (!success) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Note deleted successfully' })
  } catch (error) {
    console.error('Error deleting nursing note:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
