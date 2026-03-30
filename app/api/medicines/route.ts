import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MedicineModel } from '@/lib/sheets-models'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const medicines = await MedicineModel.findMany()
    return NextResponse.json(medicines)
  } catch (error) {
    console.error('Error fetching medicines:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
