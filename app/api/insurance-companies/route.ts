import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { InsuranceCompanyModel } from '@/lib/sheets-models'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const insuranceCompanies = await InsuranceCompanyModel.findMany()
    return NextResponse.json({ insuranceCompanies })
  } catch (error: any) {
    console.error('Error fetching insurance companies:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
