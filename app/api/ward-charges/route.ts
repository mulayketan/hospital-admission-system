import { NextRequest, NextResponse } from 'next/server'
import { WardChargesModel } from '@/lib/sheets-models'

export async function GET() {
  try {
    const wardCharges = await WardChargesModel.findMany()

    return NextResponse.json({ wardCharges })
  } catch (error) {
    console.error('Error fetching ward charges:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ward charges' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // For now, we'll keep this endpoint but it won't be used since ward charges are pre-populated
    return NextResponse.json(
      { error: 'Ward charges are managed in Google Sheets' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error creating/updating ward charges:', error)
    return NextResponse.json(
      { error: 'Failed to create/update ward charges' },
      { status: 500 }
    )
  }
}
