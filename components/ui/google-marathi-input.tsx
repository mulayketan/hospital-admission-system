'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from './input'

interface GoogleMarathiInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onValueChange?: (value: string) => void
}

// Comprehensive English to Marathi transliteration mapping
const englishToMarathi: Record<string, string> = {
  // Vowels
  'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ii': 'ई', 'u': 'उ', 'uu': 'ऊ',
  'e': 'ए', 'ai': 'ऐ', 'o': 'ओ', 'au': 'औ', 'ri': 'ऋ',
  
  // Consonants with inherent 'a'
  'ka': 'क', 'kha': 'ख', 'ga': 'ग', 'gha': 'घ', 'nga': 'ङ',
  'cha': 'च', 'chha': 'छ', 'ja': 'ज', 'jha': 'झ', 'nya': 'ञ',
  'ta': 'ट', 'tha': 'ठ', 'da': 'ड', 'dha': 'ढ', 'na': 'ण',
  'tta': 'त', 'ttha': 'थ', 'dda': 'द', 'ddha': 'ध', 'nna': 'न',
  'pa': 'प', 'pha': 'फ', 'ba': 'ब', 'bha': 'भ', 'ma': 'म',
  'ya': 'य', 'ra': 'र', 'la': 'ल', 'va': 'व', 'wa': 'व',
  'sha': 'श', 'shha': 'ष', 'sa': 'स', 'ha': 'ह',
  'ksha': 'क्ष', 'tra': 'त्र', 'gya': 'ज्ञ',
  
  // Single consonants (without vowel)
  'k': 'क्', 'kh': 'ख्', 'g': 'ग्', 'gh': 'घ्',
  'ch': 'च्', 'j': 'ज्', 'jh': 'झ्',
  't': 'त्', 'th': 'थ्', 'd': 'द्', 'dh': 'ध्', 'n': 'न्',
  'p': 'प्', 'ph': 'फ्', 'b': 'ब्', 'bh': 'भ्', 'm': 'म्',
  'y': 'य्', 'r': 'र्', 'l': 'ल्', 'v': 'व्', 'w': 'व्',
  'sh': 'श्', 's': 'स्', 'h': 'ह्',
  
  // Common Marathi names and words
  'ram': 'राम', 'rama': 'राम', 'krishna': 'कृष्ण', 'shiva': 'शिव',
  'ganesh': 'गणेश', 'ganesha': 'गणेश', 'hanuman': 'हनुमान',
  'sita': 'सीता', 'radha': 'राधा', 'lakshmi': 'लक्ष्मी',
  'saraswati': 'सरस्वती', 'durga': 'दुर्गा', 'kali': 'काली',
  'vishnu': 'विष्णू', 'brahma': 'ब्रह्मा',
  
  // Common first names
  'ketan': 'केतन', 'amit': 'अमित', 'sumit': 'सुमित', 'rohit': 'रोहित',
  'suresh': 'सुरेश', 'mahesh': 'महेश', 'rajesh': 'राजेश', 'dinesh': 'दिनेश',
  'mukesh': 'मुकेश', 'hitesh': 'हितेश', 'ritesh': 'रितेश', 'umesh': 'उमेश',
  'ramesh': 'रमेश', 'naresh': 'नरेश', 'yogesh': 'योगेश', 'rakesh': 'राकेश',
  'priya': 'प्रिया', 'pooja': 'पूजा', 'sneha': 'स्नेहा', 'kavita': 'कविता',
  'sunita': 'सुनीता', 'anita': 'अनिता', 'geeta': 'गीता', 'meera': 'मीरा',
  'shubham': 'शुभम', 'abhishek': 'अभिषेक', 'aniket': 'अनिकेत',
  'sachin': 'सचिन', 'rahul': 'राहुल', 'arjun': 'अर्जुन', 'arun': 'अरुण',
  'samrat': 'समत्', 'shashikant': 'शशिकांत', 'hoshing': 'होशींग',
  
  // Common surnames
  'sharma': 'शर्मा', 'verma': 'वर्मा', 'gupta': 'गुप्ता', 'agarwal': 'अग्रवाल',
  'patel': 'पटेल', 'shah': 'शाह', 'joshi': 'जोशी', 'mehta': 'मेहता',
  'kulkarni': 'कुलकर्णी', 'deshpande': 'देशपांडे', 'patil': 'पाटील',
  'jadhav': 'जाधव', 'pawar': 'पवार', 'more': 'मोरे', 'shinde': 'शिंदे',
  'gaikwad': 'गायकवाड', 'bhosale': 'भोसले', 'salunkhe': 'सालुंखे',
  'kadam': 'कदम', 'mane': 'माने', 'sawant': 'सावंत', 'raut': 'राऊत',
  'kale': 'काळे', 'mali': 'माळी', 'kamble': 'कांबळे', 'thorat': 'थोरात',
  'chavan': 'चव्हाण', 'yadav': 'यादव', 'mahajan': 'महाजन',
  'mulay': 'मुळे', 'mulye': 'मुळे', 'desai': 'देसाई', 'naik': 'नायक'
}

const transliterateText = (text: string): string => {
  if (!text) return ''
  
  const lowerText = text.toLowerCase().trim()
  
  // Check for exact matches first
  if (englishToMarathi[lowerText]) {
    return englishToMarathi[lowerText]
  }
  
  // Try word-by-word transliteration for multi-word input
  const words = lowerText.split(/\s+/)
  if (words.length > 1) {
    const transliteratedWords = words.map(word => englishToMarathi[word] || word).join(' ')
    if (transliteratedWords !== lowerText) {
      return transliteratedWords
    }
  }
  
  // Character-by-character transliteration for complex words
  let result = ''
  let i = 0
  
  while (i < lowerText.length) {
    let found = false
    
    // Try longer combinations first (up to 4 characters)
    for (let len = Math.min(4, lowerText.length - i); len > 0; len--) {
      const substr = lowerText.substring(i, i + len)
      if (englishToMarathi[substr]) {
        result += englishToMarathi[substr]
        i += len
        found = true
        break
      }
    }
    
    if (!found) {
      // If no match found, keep the original character
      result += lowerText[i]
      i++
    }
  }
  
  return result
}

export function GoogleMarathiInput({ onValueChange, ...props }: GoogleMarathiInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [transliteratedValue, setTransliteratedValue] = useState('')
  const [isTransliterating, setIsTransliterating] = useState(false)
  const [showSuggestion, setShowSuggestion] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce transliteration
  useEffect(() => {
    if (!inputValue.trim()) {
      setTransliteratedValue('')
      setShowSuggestion(false)
      return
    }

    // Check if input is English characters
    const hasEnglishChars = /[a-zA-Z]/.test(inputValue)
    
    if (hasEnglishChars) {
      setIsTransliterating(true)
      const timeoutId = setTimeout(() => {
        const transliterated = transliterateText(inputValue)
        setTransliteratedValue(transliterated)
        setShowSuggestion(transliterated !== inputValue && transliterated !== '')
        setIsTransliterating(false)
      }, 200)

      return () => clearTimeout(timeoutId)
    } else {
      // Direct Marathi input
      setTransliteratedValue(inputValue)
      setShowSuggestion(false)
      setIsTransliterating(false)
    }
  }, [inputValue])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    
    if (onValueChange) {
      onValueChange(value)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && showSuggestion && transliteratedValue) {
      e.preventDefault()
      setInputValue(transliteratedValue)
      setShowSuggestion(false)
      if (onValueChange) {
        onValueChange(transliteratedValue)
      }
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }
  }

  const handleSuggestionClick = () => {
    if (transliteratedValue) {
      setInputValue(transliteratedValue)
      setShowSuggestion(false)
      if (onValueChange) {
        onValueChange(transliteratedValue)
      }
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }
  }

  return (
    <div className="relative">
      <Input
        {...props}
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className={`${props.className || ''} font-marathi`}
        placeholder={props.placeholder || 'Type in English (ram → राम) or direct Marathi'}
      />
      
      {isTransliterating && (
        <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}
      
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
        मराठी
      </div>
      
      {showSuggestion && transliteratedValue && (
        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-blue-50 border border-blue-200 rounded text-sm cursor-pointer hover:bg-blue-100"
             onClick={handleSuggestionClick}>
          <span className="text-gray-600">Press Tab or click: </span>
          <span className="font-marathi text-blue-800 font-medium">{transliteratedValue}</span>
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
