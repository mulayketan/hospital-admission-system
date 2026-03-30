import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DrugOrderModel } from '@/lib/sheets-models'
import { drugOrderSchema } from '@/lib/validations'

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
    const partial = drugOrderSchema.partial().parse(body)

    const updated = await DrugOrderModel.update(id, {
      ...(partial.drugName !== undefined && { drugName: partial.drugName }),
      ...(partial.drugAllergy !== undefined && { drugAllergy: partial.drugAllergy ?? null }),
      ...(partial.frequency !== undefined && { frequency: partial.frequency }),
      ...(partial.route !== undefined && { route: partial.route }),
      ...(partial.startDate !== undefined && { startDate: partial.startDate }),
      ...(partial.ward !== undefined && { ward: partial.ward ?? null }),
      ...(partial.bedNo !== undefined && { bedNo: partial.bedNo ?? null }),
      ...(partial.days !== undefined && { days: partial.days }),
      ...(partial.medOfficerSignature !== undefined && { medOfficerSignature: partial.medOfficerSignature ?? null }),
    })

    if (!updated) {
      return NextResponse.json({ error: 'Drug order not found' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error updating drug order:', error)
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
    const success = await DrugOrderModel.delete(id)

    if (!success) {
      return NextResponse.json({ error: 'Drug order not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Drug order deleted successfully' })
  } catch (error) {
    console.error('Error deleting drug order:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
