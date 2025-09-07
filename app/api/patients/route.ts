import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PatientModel } from '@/lib/sheets-models'
import { patientSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const search = url.searchParams.get('search')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')

    const { patients, total } = await PatientModel.findMany({
      search: search || undefined,
      page,
      limit
    })

    return NextResponse.json({
      patients: patients.map(patient => ({
        ...patient,
        admissions: [] // Add empty admissions array for compatibility
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching patients:', error)
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
    console.log('Raw patient data from form:', {
      cashless: body.cashless,
      tpa: body.tpa,
      insuranceCompany: body.insuranceCompany
    })
    const validatedData = patientSchema.parse(body)
    console.log('Validated patient data:', {
      cashless: validatedData.cashless,
      tpa: validatedData.tpa,
      insuranceCompany: validatedData.insuranceCompany
    })

    const patient = await PatientModel.create({
      ...validatedData,
      ipdNo: validatedData.ipdNo, // Use the user-provided IPD number
      dateOfAdmission: validatedData.dateOfAdmission.toISOString(),
      dateOfDischarge: validatedData.dateOfDischarge ? validatedData.dateOfDischarge.toISOString() : null,
      firstNameMarathi: validatedData.firstNameMarathi || '',
      middleNameMarathi: validatedData.middleNameMarathi || '',
      surnameMarathi: validatedData.surnameMarathi || '',
    })

    return NextResponse.json({
      ...patient,
      admissions: [] // Add empty admissions array for compatibility
    }, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error creating patient:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
