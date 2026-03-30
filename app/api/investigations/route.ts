import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { InvestigationModel } from '@/lib/sheets-models'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const investigations = await InvestigationModel.findMany()
    return NextResponse.json(investigations)
  } catch (error) {
    console.error('Error fetching investigations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
