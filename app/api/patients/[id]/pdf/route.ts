import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PatientModel, WardChargesModel } from '@/lib/sheets-models'
import { generateAdmissionPDF } from '@/lib/pdf-generator-final'

interface Params {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const patient = await PatientModel.findById(params.id)

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Fetch ward charges from Google Sheets
    const wardCharges = await WardChargesModel.findByWardType(patient.ward)

    const pdfBuffer = await generateAdmissionPDF({
      patient,
      wardCharges: wardCharges ? {
        bedCharges: wardCharges.bedCharges,
        doctorCharges: wardCharges.doctorCharges,
        nursingCharges: wardCharges.nursingCharges,
        asstDoctorCharges: wardCharges.asstDoctorCharges,
        totalPerDay: wardCharges.totalPerDay,
        monitorCharges: wardCharges.monitorCharges || 0,
        o2Charges: wardCharges.o2Charges || 0,
      } : undefined
    })

    const fileName = `admission-form-${patient.ipdNo || patient.id}.pdf`

    return new NextResponse(pdfBuffer as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
