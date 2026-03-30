import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TPAModel } from '@/lib/sheets-models'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tpaList = await TPAModel.findMany()
    return NextResponse.json({ tpaList })
  } catch (error) {
    console.error('Error fetching TPA list:', error)
    return NextResponse.json({ error: 'Failed to fetch TPA list' }, { status: 500 })
  }
}
