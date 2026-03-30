import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { WardChargesModel } from '@/lib/sheets-models'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ward charges are managed directly in Google Sheets
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
