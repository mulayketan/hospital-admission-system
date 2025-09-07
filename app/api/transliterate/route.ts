import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text, language } = await request.json()

    if (!text || !language) {
      return NextResponse.json({ error: 'Text and language are required' }, { status: 400 })
    }

    // Use Google Input Tools API for transliteration
    // This is a publicly available API that Google provides
    const googleApiUrl = 'https://www.google.com/inputtools/request'
    
    const requestBody = {
      method: 'transliterate',
      apikey: 'AIzaSyC_a8Sc-oAfXTq8gktWS1ZYl1R_Hq7y3-c', // Public API key for Input Tools
      params: {
        text: text,
        ime: language === 'mr' ? 'transliteration_en_mr' : 'transliteration_en_hi',
        num: 5,
        cp: 0,
        cs: 1,
        ie: 'utf-8',
        oe: 'utf-8'
      }
    }

    const response = await fetch(googleApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error('Google transliteration API failed')
    }

    const data = await response.json()
    
    // Extract the first transliteration result
    let transliterated = text
    if (data && data[1] && data[1][0] && data[1][0][1] && data[1][0][1].length > 0) {
      transliterated = data[1][0][1][0]
    }

    return NextResponse.json({ transliterated })
  } catch (error) {
    console.error('Transliteration error:', error)
    return NextResponse.json({ error: 'Failed to transliterate' }, { status: 500 })
  }
}
