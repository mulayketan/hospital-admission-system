import { ZodError } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NursingChartModel } from '@/lib/sheets-models'
import { vitalSignSchema, zodErrorBody } from '@/lib/validations'

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

    const entries = await NursingChartModel.findByPatientId(patientId)
    return NextResponse.json(entries)
  } catch (error) {
    console.error('Error fetching nursing chart entries:', error)
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
    const validated = vitalSignSchema.parse(body)

    const entry = await NursingChartModel.create({
      patientId: validated.patientId,
      ipdNo: validated.ipdNo,
      dateTime: validated.dateTime,
      temp: validated.temp ?? null,
      pulse: validated.pulse ?? null,
      bp: validated.bp ?? null,
      spo2: validated.spo2 ?? null,
      bsl: validated.bsl ?? null,
      ivFluids: validated.ivFluids ?? null,
      staffName: validated.staffName,
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
        return NextResponse.json(zodErrorBody(error), { status: 400 })
      }
      if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    console.error('Error creating nursing chart entry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
