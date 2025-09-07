'use client'

import { useState, useRef, useCallback } from 'react'
import { Input } from './input'

interface ImprovedMarathiInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onValueChange?: (value: string) => void
}

// Comprehensive English to Marathi transliteration mapping
const marathiMap: Record<string, string> = {
  // Vowels
  'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ii': 'ई', 'u': 'उ', 'uu': 'ऊ',
  'e': 'ए', 'ai': 'ऐ', 'o': 'ओ', 'au': 'औ', 'an': 'अं', 'ah': 'अः',
  
  // Basic consonants
  'ka': 'क', 'kha': 'ख', 'ga': 'ग', 'gha': 'घ', 'nga': 'ङ',
  'cha': 'च', 'chha': 'छ', 'ja': 'ज', 'jha': 'झ', 'nya': 'ञ',
  'ta': 'ट', 'tha': 'ठ', 'da': 'ड', 'dha': 'ढ', 'na': 'ण',
  'taa': 'त', 'thaa': 'थ', 'daa': 'द', 'dhaa': 'ध', 'naa': 'न',
  'pa': 'प', 'pha': 'फ', 'ba': 'ब', 'bha': 'भ', 'ma': 'म',
  'ya': 'य', 'ra': 'र', 'la': 'ल', 'va': 'व', 'wa': 'व',
  'sha': 'श', 'shha': 'ष', 'sa': 'स', 'ha': 'ह',
  'ksha': 'क्ष', 'tra': 'त्र', 'gya': 'ज्ञ',
  
  // Single consonants (fallback)
  'k': 'क', 'kh': 'ख', 'g': 'ग', 'gh': 'घ',
  'ch': 'च', 'j': 'ज', 'jh': 'झ',
  't': 'त', 'th': 'थ', 'd': 'द', 'dh': 'ध', 'n': 'न',
  'p': 'प', 'ph': 'फ', 'b': 'ब', 'bh': 'भ', 'm': 'म',
  'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व', 'w': 'व',
  'sh': 'श', 's': 'स', 'h': 'ह',
  
  // Common name patterns
  'ram': 'राम', 'rama': 'राम', 'sita': 'सीता', 'krishna': 'कृष्ण',
  'radha': 'राधा', 'vishnu': 'विष्णू', 'shiva': 'शिव', 'ganesh': 'गणेश',
  'lakshmi': 'लक्ष्मी', 'saraswati': 'सरस्वती', 'durga': 'दुर्गा',
  'arjun': 'अर्जुन', 'bhim': 'भीम', 'nakul': 'नकुल', 'sahadev': 'सहदेव',
  
  // Enhanced name mappings
  'samrat': 'समत्', 'shashikant': 'शशिकांत', 'hoshing': 'होशींग',
  'ketan': 'केतन', 'prafulla': 'प्रफुल्ल', 'jitendra': 'जितेंद्र',
  'suresh': 'सुरेश', 'mahesh': 'महेश', 'rajesh': 'राजेश', 'dinesh': 'दिनेश',
  'mukesh': 'मुकेश', 'hitesh': 'हितेश', 'ritesh': 'रितेश', 'umesh': 'उमेश',
  'ramesh': 'रमेश', 'ganesh': 'गणेश', 'naresh': 'नरेश', 'yogesh': 'योगेश',
  
  'priya': 'प्रिया', 'pooja': 'पूजा', 'sneha': 'स्नेहा', 'kavita': 'कविता',
  'sunita': 'सुनीता', 'anita': 'अनिता', 'geeta': 'गीता', 'meera': 'मीरा',
  'sushma': 'सुष्मा', 'rekha': 'रेखा', 'maya': 'माया', 'lata': 'लता',
  
  // Marathi surnames
  'sharma': 'शर्मा', 'verma': 'वर्मा', 'gupta': 'गुप्ता', 'agarwal': 'अग्रवाल',
  'patel': 'पटेल', 'shah': 'शाह', 'joshi': 'जोशी', 'mehta': 'मेहता',
  'kulkarni': 'कुलकर्णी', 'deshpande': 'देशपांडे', 'patil': 'पाटील',
  'jadhav': 'जाधव', 'pawar': 'पवार', 'more': 'मोरे', 'shinde': 'शिंदे',
  'gaikwad': 'गायकवाड', 'bhosale': 'भोसले', 'salunkhe': 'सालुंखे',
  'kadam': 'कदम', 'mane': 'माने', 'sawant': 'सावंत', 'raut': 'राऊत',
  'kale': 'काळे', 'mali': 'माळी', 'kamble': 'कांबळे', 'thorat': 'थोरात',
  'chavan': 'चव्हाण', 'yadav': 'यादव', 'mahajan': 'महाजन',
  'mulay': 'मुळे', 'mulye': 'मुळे', 'desai': 'देसाई', 'jain': 'जैन',
  
  // Additional common words
  'aai': 'आई', 'baba': 'बाबा', 'mama': 'मामा', 'kaka': 'काका',
  'tai': 'ताई', 'dada': 'दादा', 'nana': 'नाना', 'aji': 'आजी',
  'ajoba': 'आजोबा', 'anna': 'अण्णा', 'didi': 'दीदी'
}

// Character-level fallback mapping
const charMap: Record<string, string> = {
  'a': 'अ', 'b': 'ब', 'c': 'च', 'd': 'द', 'e': 'ए', 'f': 'फ',
  'g': 'ग', 'h': 'ह', 'i': 'इ', 'j': 'ज', 'k': 'क', 'l': 'ल',
  'm': 'म', 'n': 'न', 'o': 'ओ', 'p': 'प', 'q': 'क', 'r': 'र',
  's': 'स', 't': 'त', 'u': 'उ', 'v': 'व', 'w': 'व', 'x': 'क्स',
  'y': 'य', 'z': 'झ'
}

function transliterateToMarathi(englishText: string): string {
  if (!englishText || englishText.trim() === '') return ''
  
  const text = englishText.toLowerCase().trim()
  
  // First check for exact word match
  if (marathiMap[text]) {
    return marathiMap[text]
  }
  
  // Check for partial matches (for compound names)
  for (const [eng, mar] of Object.entries(marathiMap)) {
    if (text === eng) return mar
  }
  
  // Pattern-based transliteration
  let result = ''
  let i = 0
  
  while (i < text.length) {
    let matched = false
    
    // Try 4-character combinations first
    if (i <= text.length - 4) {
      const fourChar = text.substring(i, i + 4)
      if (marathiMap[fourChar]) {
        result += marathiMap[fourChar]
        i += 4
        matched = true
      }
    }
    
    // Try 3-character combinations
    if (!matched && i <= text.length - 3) {
      const threeChar = text.substring(i, i + 3)
      if (marathiMap[threeChar]) {
        result += marathiMap[threeChar]
        i += 3
        matched = true
      }
    }
    
    // Try 2-character combinations
    if (!matched && i <= text.length - 2) {
      const twoChar = text.substring(i, i + 2)
      if (marathiMap[twoChar]) {
        result += marathiMap[twoChar]
        i += 2
        matched = true
      }
    }
    
    // Single character fallback
    if (!matched) {
      const char = text[i]
      result += charMap[char] || char
      i++
    }
  }
  
  return result || englishText // Return original if conversion fails
}

export function ImprovedMarathiInput({ onValueChange, ...props }: ImprovedMarathiInputProps) {
  const [englishValue, setEnglishValue] = useState('')
  const [marathiValue, setMarathiValue] = useState('')
  const [showEnglish, setShowEnglish] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)

  const updateMarathiValue = useCallback((english: string) => {
    const marathi = transliterateToMarathi(english)
    setMarathiValue(marathi)
    
    // Generate suggestions based on partial matches
    if (english.length > 1) {
      const matchingSuggestions = Object.entries(marathiMap)
        .filter(([eng]) => eng.startsWith(english.toLowerCase()))
        .slice(0, 5)
        .map(([, mar]) => mar)
      
      setSuggestions(matchingSuggestions)
      setShowSuggestions(matchingSuggestions.length > 0)
    } else {
      setShowSuggestions(false)
    }
    
    if (onValueChange) {
      onValueChange(marathi)
    }
  }, [onValueChange])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEnglishValue(value)
    
    if (!showEnglish) {
      updateMarathiValue(value)
    } else if (onValueChange) {
      onValueChange(value)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setMarathiValue(suggestion)
    setShowSuggestions(false)
    if (onValueChange) {
      onValueChange(suggestion)
    }
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && suggestions.length > 0 && !showEnglish) {
      e.preventDefault()
      handleSuggestionClick(suggestions[0])
    }
    if (e.key === 'Enter' && !showEnglish) {
      updateMarathiValue(englishValue)
    }
  }

  const displayValue = showEnglish ? englishValue : marathiValue || englishValue

  return (
    <div className="relative">
      <Input
        {...props}
        ref={inputRef}
        value={displayValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className={`${props.className || ''} font-marathi pr-20`}
        placeholder={props.placeholder || 'Type in English - converts to मराठी'}
      />
      
      {/* Toggle between English and Marathi */}
      <button
        type="button"
        onClick={() => {
          setShowEnglish(!showEnglish)
          if (!showEnglish && onValueChange) {
            onValueChange(englishValue)
          } else if (showEnglish && onValueChange) {
            onValueChange(marathiValue)
          }
        }}
        className="absolute right-8 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800 focus:outline-none px-1 py-0.5 rounded border border-blue-200"
        title={showEnglish ? 'Show Marathi' : 'Show English'}
      >
        {showEnglish ? 'मर' : 'En'}
      </button>
      
      {/* Language indicator */}
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
        मराठी
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && !showEnglish && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm font-marathi border-b border-gray-100 last:border-b-0"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}

      {/* Input help text */}
      {englishValue && marathiValue && englishValue !== marathiValue && !showEnglish && (
        <div className="absolute top-full left-0 mt-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded border">
          English: {englishValue} | Tab for suggestions
        </div>
      )}
      
      <style jsx global>{`
        .font-marathi {
          font-family: 'Noto Sans Devanagari', 'Mangal', 'Shree Devanagari 714', sans-serif;
        }
      `}</style>
    </div>
  )
}
