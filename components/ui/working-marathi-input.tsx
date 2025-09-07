'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from './input'

interface WorkingMarathiInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onValueChange?: (value: string) => void
}

// Simplified but comprehensive Marathi mapping
const marathiTranslation: Record<string, string> = {
  // Complete names - highest priority
  'samrat': 'समत्',
  'shashikant': 'शशिकांत', 
  'hoshing': 'होशींग',
  'ketan': 'केतन',
  'mulay': 'मुळे',
  
  // Common Marathi first names
  'ram': 'राम', 'sita': 'सीता', 'krishna': 'कृष्ण', 'radha': 'राधा',
  'vishnu': 'विष्णू', 'shiva': 'शिव', 'ganesh': 'गणेश', 'lakshmi': 'लक्ष्मी',
  'saraswati': 'सरस्वती', 'durga': 'दुर्गा', 'arjun': 'अर्जुन', 'bhim': 'भीम',
  'nakul': 'नकुल', 'sahadev': 'सहदेव', 'prafulla': 'प्रफुल्ल', 'jitendra': 'जितेंद्र',
  
  'suresh': 'सुरेश', 'mahesh': 'महेश', 'rajesh': 'राजेश', 'dinesh': 'दिनेश',
  'mukesh': 'मुकेश', 'hitesh': 'हितेश', 'ritesh': 'रितेश', 'umesh': 'उमेश',
  'ramesh': 'रमेश', 'naresh': 'नरेश', 'yogesh': 'योगेश',
  
  'priya': 'प्रिया', 'pooja': 'पूजा', 'sneha': 'स्नेहा', 'kavita': 'कविता',
  'sunita': 'सुनीता', 'anita': 'अनिता', 'geeta': 'गीता', 'meera': 'मीरा',
  'sushma': 'सुष्मा', 'rekha': 'रेखा', 'maya': 'माया', 'lata': 'लता',
  
  // Common Marathi surnames
  'sharma': 'शर्मा', 'verma': 'वर्मा', 'gupta': 'गुप्ता', 'patel': 'पटेल',
  'shah': 'शाह', 'joshi': 'जोशी', 'mehta': 'मेहता', 'kulkarni': 'कुलकर्णी',
  'deshpande': 'देशपांडे', 'patil': 'पाटील', 'jadhav': 'जाधव', 'pawar': 'पवार',
  'more': 'मोरे', 'shinde': 'शिंदे', 'gaikwad': 'गायकवाड', 'bhosale': 'भोसले',
  'salunkhe': 'सालुंखे', 'kadam': 'कदम', 'mane': 'माने', 'sawant': 'सावंत',
  'raut': 'राऊत', 'kale': 'काळे', 'mali': 'माळी', 'kamble': 'कांबळे',
  'thorat': 'थोरात', 'chavan': 'चव्हाण', 'yadav': 'यादव', 'mahajan': 'महाजन',
  'desai': 'देसाई', 'jain': 'जैन',
  
  // Basic consonant + vowel patterns for unknown words
  'ka': 'क', 'kha': 'ख', 'ga': 'ग', 'gha': 'घ',
  'cha': 'च', 'chha': 'छ', 'ja': 'ज', 'jha': 'झ',
  'ta': 'ट', 'tha': 'ठ', 'da': 'ड', 'dha': 'ढ', 'na': 'ण',
  'pa': 'प', 'pha': 'फ', 'ba': 'ब', 'bha': 'भ', 'ma': 'म',
  'ya': 'य', 'ra': 'र', 'la': 'ल', 'va': 'व', 'wa': 'व',
  'sha': 'श', 'sa': 'स', 'ha': 'ह'
}

function convertToMarathi(english: string): string {
  if (!english || english.trim() === '') return ''
  
  const text = english.toLowerCase().trim()
  
  // Direct mapping (highest priority)
  if (marathiTranslation[text]) {
    return marathiTranslation[text]
  }
  
  // Pattern-based conversion for compound words
  let result = ''
  let i = 0
  
  while (i < text.length) {
    let matched = false
    
    // Try 3-character matches first
    if (i <= text.length - 3) {
      const threeChar = text.substring(i, i + 3)
      if (marathiTranslation[threeChar]) {
        result += marathiTranslation[threeChar]
        i += 3
        matched = true
      }
    }
    
    // Try 2-character matches
    if (!matched && i <= text.length - 2) {
      const twoChar = text.substring(i, i + 2)
      if (marathiTranslation[twoChar]) {
        result += marathiTranslation[twoChar]
        i += 2
        matched = true
      }
    }
    
    // Single character fallback
    if (!matched) {
      const char = text[i]
      switch (char) {
        case 'a': result += 'अ'; break
        case 'b': result += 'ब'; break
        case 'c': result += 'च'; break
        case 'd': result += 'द'; break
        case 'e': result += 'ए'; break
        case 'f': result += 'फ'; break
        case 'g': result += 'ग'; break
        case 'h': result += 'ह'; break
        case 'i': result += 'इ'; break
        case 'j': result += 'ज'; break
        case 'k': result += 'क'; break
        case 'l': result += 'ल'; break
        case 'm': result += 'म'; break
        case 'n': result += 'न'; break
        case 'o': result += 'ओ'; break
        case 'p': result += 'प'; break
        case 'r': result += 'र'; break
        case 's': result += 'स'; break
        case 't': result += 'त'; break
        case 'u': result += 'उ'; break
        case 'v': result += 'व'; break
        case 'w': result += 'व'; break
        case 'y': result += 'य'; break
        case 'z': result += 'झ'; break
        default: result += char; break
      }
      i++
    }
  }
  
  return result || english // Return original if conversion fails
}

export function WorkingMarathiInput({ 
  value = '', 
  onChange, 
  onValueChange, 
  ...props 
}: WorkingMarathiInputProps) {
  const [inputValue, setInputValue] = useState(value)
  const [marathiValue, setMarathiValue] = useState('')
  const [showEnglish, setShowEnglish] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)

  // Update internal state when external value changes
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value)
      const converted = convertToMarathi(value)
      setMarathiValue(converted)
    }
  }, [value, inputValue])

  // Convert to Marathi and generate suggestions
  useEffect(() => {
    if (inputValue && inputValue.trim() !== '') {
      const converted = convertToMarathi(inputValue)
      setMarathiValue(converted)
      
      // Generate suggestions
      const matchingSuggestions = Object.entries(marathiTranslation)
        .filter(([eng]) => eng.startsWith(inputValue.toLowerCase()) && eng !== inputValue.toLowerCase())
        .slice(0, 4)
        .map(([, mar]) => mar)
      
      setSuggestions(matchingSuggestions)
      setShowSuggestions(matchingSuggestions.length > 0)
    } else {
      setMarathiValue('')
      setShowSuggestions(false)
    }
  }, [inputValue])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    
    // Call the original onChange if provided
    if (onChange) {
      onChange(e)
    }
    
    // Call onValueChange with the appropriate value
    if (onValueChange) {
      if (showEnglish) {
        onValueChange(newValue)
      } else {
        const converted = convertToMarathi(newValue)
        onValueChange(converted)
      }
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setMarathiValue(suggestion)
    setShowSuggestions(false)
    
    if (onValueChange) {
      onValueChange(suggestion)
    }
    
    // Update the input value to trigger onChange
    if (onChange && inputRef.current) {
      const syntheticEvent = {
        target: { value: suggestion },
        currentTarget: inputRef.current
      } as React.ChangeEvent<HTMLInputElement>
      onChange(syntheticEvent)
    }
    
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleToggle = () => {
    const newShowEnglish = !showEnglish
    setShowEnglish(newShowEnglish)
    
    if (onValueChange) {
      onValueChange(newShowEnglish ? inputValue : marathiValue)
    }
  }

  const displayValue = showEnglish ? inputValue : marathiValue || inputValue

  return (
    <div className="relative">
      <Input
        {...props}
        ref={inputRef}
        value={displayValue}
        onChange={handleInputChange}
        className={`${props.className || ''} font-marathi pr-16`}
        placeholder={props.placeholder || 'Type in English - converts to मराठी'}
        autoComplete="off"
      />
      
      {/* Toggle button */}
      <button
        type="button"
        onClick={handleToggle}
        className="absolute right-8 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800 focus:outline-none px-1 py-0.5 rounded border border-blue-200 hover:bg-blue-50"
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
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-32 overflow-y-auto">
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

      {/* Help text */}
      {inputValue && marathiValue && inputValue !== marathiValue && !showEnglish && (
        <div className="absolute top-full left-0 mt-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded border">
          English: {inputValue}
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
