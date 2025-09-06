'use client'

import { useState, useRef } from 'react'
import { Input } from './input'

interface SimpleMarathiInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onValueChange?: (value: string) => void
}

// Simple transliteration mapping for common characters and names
const transliterationMap: Record<string, string> = {
  // Vowels
  'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ii': 'ई', 'u': 'उ', 'uu': 'ऊ',
  'e': 'ए', 'ai': 'ऐ', 'o': 'ओ', 'au': 'औ',
  
  // Consonants
  'ka': 'क', 'kha': 'ख', 'ga': 'ग', 'gha': 'घ', 'nga': 'ङ',
  'cha': 'च', 'chha': 'छ', 'ja': 'ज', 'jha': 'झ', 'nya': 'ञ',
  'ta': 'ट', 'tha': 'ठ', 'da': 'ड', 'dha': 'ढ', 'na': 'ण',
  'pa': 'प', 'pha': 'फ', 'ba': 'ब', 'bha': 'भ', 'ma': 'म',
  'ya': 'य', 'ra': 'र', 'la': 'ल', 'va': 'व', 'wa': 'व',
  'sha': 'श', 'shha': 'ष', 'sa': 'स', 'ha': 'ह',
  'ksha': 'क्ष', 'tra': 'त्र', 'gya': 'ज्ञ',
  
  // Common first names
  'ram': 'राम', 'rama': 'राम', 'sita': 'सीता', 'krishna': 'कृष्ण', 'radha': 'राधा',
  'vishnu': 'विष्णू', 'shiva': 'शिव', 'ganesh': 'गणेश', 'ganesha': 'गणेश',
  'lakshmi': 'लक्ष्मी', 'saraswati': 'सरस्वती', 'durga': 'दुर्गा',
  'arjun': 'अर्जुन', 'bhim': 'भीम', 'nakul': 'नकुल', 'sahadev': 'सहदेव',
  'ketan': 'केतन', 'prafulla': 'प्रफुल्ल', 'jitendra': 'जितेंद्र',
  'suresh': 'सुरेश', 'mahesh': 'महेश', 'rajesh': 'राजेश', 'dinesh': 'दिनेश',
  'mukesh': 'मुकेश', 'hitesh': 'हितेश', 'ritesh': 'रितेश',
  'priya': 'प्रिया', 'pooja': 'पूजा', 'sneha': 'स्नेहा', 'kavita': 'कविता',
  'sunita': 'सुनीता', 'anita': 'अनिता', 'geeta': 'गीता', 'meera': 'मीरा',
  
  // Common surnames
  'sharma': 'शर्मा', 'verma': 'वर्मा', 'gupta': 'गुप्ता', 'agarwal': 'अग्रवाल',
  'patel': 'पटेल', 'shah': 'शाह', 'joshi': 'जोशी', 'mehta': 'मेहता',
  'kulkarni': 'कुलकर्णी', 'deshpande': 'देशपांडे', 'patil': 'पाटील',
  'jadhav': 'जाधव', 'pawar': 'पवार', 'more': 'मोरे', 'shinde': 'शिंदे',
  'gaikwad': 'गायकवाड', 'bhosale': 'भोसले', 'salunkhe': 'सालुंखे',
  'kadam': 'कदम', 'mane': 'माने', 'sawant': 'सावंत', 'raut': 'राऊत',
  'kale': 'काळे', 'mali': 'माळी', 'kamble': 'कांबळे', 'thorat': 'थोरात',
  'chavan': 'चव्हाण', 'yadav': 'यादव', 'mahajan': 'महाजन',
  'mulay': 'मुळे', 'mulye': 'मुळे', 'desai': 'देसाई'
}

export function SimpleMarathiInput({ onValueChange, ...props }: SimpleMarathiInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase()
    setInputValue(e.target.value)
    
    if (value.length > 0) {
      const matches = Object.keys(transliterationMap)
        .filter(key => key.startsWith(value))
        .map(key => transliterationMap[key])
        .slice(0, 5)
      
      setSuggestions(matches)
      setShowSuggestions(matches.length > 0)
    } else {
      setShowSuggestions(false)
    }
    
    if (onValueChange) {
      onValueChange(e.target.value)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion)
    setShowSuggestions(false)
    if (onValueChange) {
      onValueChange(suggestion)
    }
    if (inputRef.current) {
      inputRef.current.value = suggestion
      inputRef.current.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && suggestions.length > 0) {
      e.preventDefault()
      handleSuggestionClick(suggestions[0])
    }
  }

  return (
    <div className="relative">
      <Input
        {...props}
        ref={inputRef}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className={`${props.className || ''} font-marathi`}
        placeholder={props.placeholder || 'Type in English (Tab to convert)'}
      />
      
      {showSuggestions && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm font-marathi"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
      
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
        मराठी
      </div>
      
      <style jsx global>{`
        .font-marathi {
          font-family: 'Noto Sans Devanagari', 'Mangal', 'Shree Devanagari 714', sans-serif;
        }
      `}</style>
    </div>
  )
}
