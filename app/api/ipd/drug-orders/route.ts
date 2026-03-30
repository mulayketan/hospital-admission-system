import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DrugOrderModel } from '@/lib/sheets-models'
import { drugOrderSchema } from '@/lib/validations'

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

    const orders = await DrugOrderModel.findByPatientId(patientId)
    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error fetching drug orders:', error)
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
    const validated = drugOrderSchema.parse(body)

    const order = await DrugOrderModel.create({
      patientId: validated.patientId,
      ipdNo: validated.ipdNo,
      drugName: validated.drugName,
      drugAllergy: validated.drugAllergy ?? null,
      frequency: validated.frequency,
      route: validated.route,
      startDate: validated.startDate,
      ward: validated.ward ?? null,
      bedNo: validated.bedNo ?? null,
      days: validated.days ?? {},
      medOfficerSignature: validated.medOfficerSignature ?? null,
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error creating drug order:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
