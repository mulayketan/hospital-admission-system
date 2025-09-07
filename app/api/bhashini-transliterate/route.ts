import { NextRequest, NextResponse } from 'next/server'

// Bhashini API configuration
const BHASHINI_CONFIG = {
  BASE_URL: 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline',
  USER_ID: process.env.BHASHINI_USER_ID,
  API_KEY: process.env.BHASHINI_API_KEY,
  PIPELINE_ID: process.env.BHASHINI_PIPELINE_ID, // For transliteration
}

interface BhashiniRequest {
  pipelineTasks: Array<{
    taskType: string
    config: {
      language: {
        sourceLanguage: string
        targetLanguage: string
      }
      serviceId: string
    }
  }>
  inputData: {
    input: Array<{
      source: string
    }>
  }
}

interface BhashiniResponse {
  pipelineResponse: Array<{
    output: Array<{
      target: string
    }>
  }>
}

export async function POST(request: NextRequest) {
  try {
    const { text, sourceLanguage = 'en', targetLanguage = 'mr' } = await request.json()

    if (!text || text.trim() === '') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    if (!BHASHINI_CONFIG.USER_ID || !BHASHINI_CONFIG.API_KEY) {
      console.error('Bhashini API credentials not configured')
      return NextResponse.json({ 
        error: 'Translation service not configured',
        fallback: text // Return original text as fallback
      }, { status: 500 })
    }

    // Prepare Bhashini API request
    const bhashiniRequest: BhashiniRequest = {
      pipelineTasks: [
        {
          taskType: 'transliteration', // or 'translation' for full translation
          config: {
            language: {
              sourceLanguage,
              targetLanguage
            },
            serviceId: 'ai4bharat/indicxlit--cpu-fsv2' // Transliteration service
          }
        }
      ],
      inputData: {
        input: [
          {
            source: text.trim()
          }
        ]
      }
    }

    // Call Bhashini API
    const response = await fetch(BHASHINI_CONFIG.BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'userID': BHASHINI_CONFIG.USER_ID,
        'ulcaApiKey': BHASHINI_CONFIG.API_KEY,
      },
      body: JSON.stringify(bhashiniRequest)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Bhashini API error:', response.status, errorText)
      
      // Return fallback response
      return NextResponse.json({
        transliteratedText: text, // Return original text as fallback
        isFallback: true,
        error: 'Translation service unavailable'
      })
    }

    const data: BhashiniResponse = await response.json()
    
    const transliteratedText = data.pipelineResponse?.[0]?.output?.[0]?.target || text

    return NextResponse.json({
      transliteratedText,
      isFallback: false,
      originalText: text
    })

  } catch (error) {
    console.error('Error in Bhashini transliteration:', error)
    
    // Return fallback response
    const { text } = await request.json().catch(() => ({ text: '' }))
    
    return NextResponse.json({
      transliteratedText: text || '',
      isFallback: true,
      error: 'Translation service error'
    })
  }
}
