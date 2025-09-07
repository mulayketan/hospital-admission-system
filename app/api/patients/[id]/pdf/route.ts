import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PatientModel, WardChargesModel } from '@/lib/sheets-models'
import { generateAdmissionPDF } from '@/lib/pdf-generator-final'

// Use Node.js runtime for Google Sheets API compatibility
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const patient = await PatientModel.findById(id)

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    console.log('Patient data for PDF:', {
      id: patient.id,
      cashless: patient.cashless,
      tpa: patient.tpa,
      insuranceCompany: patient.insuranceCompany,
      fullPatient: patient
    })

    // Fetch ward charges from Google Sheets
    const wardCharges = await WardChargesModel.findByWardType(patient.ward)

    // Use the shared PDF generator with the approved template
    const pdfBuffer = await generateAdmissionPDF({
      patient: patient as any,
      wardCharges: wardCharges
        ? {
            bedCharges: wardCharges.bedCharges,
            doctorCharges: wardCharges.doctorCharges,
            nursingCharges: wardCharges.nursingCharges,
            asstDoctorCharges: wardCharges.asstDoctorCharges,
            totalPerDay: wardCharges.totalPerDay,
            monitorCharges: wardCharges.monitorCharges ?? undefined,
            o2Charges: wardCharges.o2Charges ?? undefined,
          }
        : undefined,
    })

    const fileName = `admission-form-${patient.ipdNo || id}.pdf`

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error: any) {
    console.error('Error generating PDF:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
