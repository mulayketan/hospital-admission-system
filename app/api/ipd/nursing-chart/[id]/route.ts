import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NursingChartModel } from '@/lib/sheets-models'
import { vitalSignBaseSchema } from '@/lib/validations'

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
    const partial = vitalSignBaseSchema.partial().parse(body)

    const updated = await NursingChartModel.update(id, {
      ...(partial.dateTime !== undefined && { dateTime: partial.dateTime }),
      ...(partial.temp !== undefined && { temp: partial.temp ?? null }),
      ...(partial.pulse !== undefined && { pulse: partial.pulse ?? null }),
      ...(partial.bp !== undefined && { bp: partial.bp ?? null }),
      ...(partial.spo2 !== undefined && { spo2: partial.spo2 ?? null }),
      ...(partial.bsl !== undefined && { bsl: partial.bsl ?? null }),
      ...(partial.ivFluids !== undefined && { ivFluids: partial.ivFluids ?? null }),
      ...(partial.staffName !== undefined && { staffName: partial.staffName }),
    })

    if (!updated) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error updating nursing chart entry:', error)
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
    const success = await NursingChartModel.delete(id)

    if (!success) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Entry deleted successfully' })
  } catch (error) {
    console.error('Error deleting nursing chart entry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
