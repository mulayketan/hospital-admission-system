'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from './input'

interface GoogleMarathiInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onValueChange?: (value: string) => void
}

export function GoogleMarathiInput({ onValueChange, ...props }: GoogleMarathiInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [transliteratedValue, setTransliteratedValue] = useState('')
  const [isTransliterating, setIsTransliterating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce transliteration requests
  useEffect(() => {
    if (!inputValue.trim()) {
      setTransliteratedValue('')
      return
    }

    const timeoutId = setTimeout(async () => {
      await transliterate(inputValue)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [inputValue])

  const transliterate = async (text: string) => {
    if (!text || isTransliterating) return

    setIsTransliterating(true)
    try {
      // Using Google Input Tools API for transliteration
      // This is a public API endpoint that doesn't require authentication
      const response = await fetch('/api/transliterate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, language: 'mr' }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.transliterated) {
          setTransliteratedValue(data.transliterated)
          if (onValueChange) {
            onValueChange(data.transliterated)
          }
        }
      }
    } catch (error) {
      console.error('Transliteration error:', error)
    } finally {
      setIsTransliterating(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    
    // If user is typing in English characters, show the input
    // If user manually edits the Marathi text, update the transliterated value
    if (/^[a-zA-Z\s]+$/.test(value)) {
      // English input, wait for transliteration
      if (onValueChange) {
        onValueChange(value)
      }
    } else {
      // Direct Marathi input
      setTransliteratedValue(value)
      if (onValueChange) {
        onValueChange(value)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && transliteratedValue && transliteratedValue !== inputValue) {
      e.preventDefault()
      setInputValue(transliteratedValue)
      if (inputRef.current) {
        inputRef.current.value = transliteratedValue
      }
    }
  }

  // Use transliterated value if available, otherwise show input value
  const displayValue = transliteratedValue || inputValue

  return (
    <div className="relative">
      <Input
        {...props}
        ref={inputRef}
        value={displayValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className={`${props.className || ''} font-marathi`}
        placeholder={props.placeholder || 'Type in English or Marathi (Tab to convert)'}
      />
      
      {isTransliterating && (
        <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}
      
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
        मराठी
      </div>
      
      {inputValue && transliteratedValue && inputValue !== transliteratedValue && (
        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
          <span className="text-gray-600">Tab to use: </span>
          <span className="font-marathi text-blue-800">{transliteratedValue}</span>
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
