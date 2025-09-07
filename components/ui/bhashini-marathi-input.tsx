'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Input } from './input'

interface BhashiniMarathiInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onValueChange?: (value: string) => void
  debounceMs?: number
}

interface TransliterationResponse {
  transliteratedText: string
  isFallback: boolean
  error?: string
}

export function BhashiniMarathiInput({ 
  onValueChange, 
  debounceMs = 500,
  ...props 
}: BhashiniMarathiInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [marathiText, setMarathiText] = useState('')
  const [isTransliterating, setIsTransliterating] = useState(false)
  const [showEnglish, setShowEnglish] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced transliteration function
  const debouncedTransliterate = useCallback(async (text: string) => {
    if (!text.trim()) {
      setMarathiText('')
      setError(null)
      return
    }

    // Only transliterate if text contains English characters
    if (!/[a-zA-Z]/.test(text)) {
      setMarathiText(text)
      setError(null)
      return
    }

    setIsTransliterating(true)
    setError(null)

    try {
      const response = await fetch('/api/bhashini-transliterate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          sourceLanguage: 'en',
          targetLanguage: 'mr'
        })
      })

      const data: TransliterationResponse = await response.json()

      if (data.isFallback && data.error) {
        setError(`Transliteration unavailable: ${data.error}`)
        setMarathiText(text) // Show original text
      } else {
        setMarathiText(data.transliteratedText)
      }
    } catch (err) {
      console.error('Transliteration error:', err)
      setError('Connection error')
      setMarathiText(text) // Fallback to original text
    } finally {
      setIsTransliterating(false)
    }
  }, [])

  // Handle input changes with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout for transliteration
    timeoutRef.current = setTimeout(() => {
      debouncedTransliterate(value)
    }, debounceMs)
  }

  // Handle manual transliteration trigger (Enter key)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      debouncedTransliterate(inputValue)
    }
  }

  // Use Marathi text when available
  const displayValue = marathiText || inputValue

  // Update parent component when Marathi text changes
  useEffect(() => {
    if (onValueChange) {
      onValueChange(displayValue)
    }
  }, [displayValue, onValueChange])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="relative">
      <Input
        {...props}
        ref={inputRef}
        value={showEnglish ? inputValue : displayValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className={`${props.className || ''} font-marathi pr-20`}
        placeholder={props.placeholder || 'Type in English (auto-converts to Marathi)'}
      />
      
      {/* Loading indicator */}
      {isTransliterating && (
        <div className="absolute right-16 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}

      {/* Toggle between English and Marathi display */}
      <button
        type="button"
        onClick={() => setShowEnglish(!showEnglish)}
        className="absolute right-8 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800 focus:outline-none"
        title={showEnglish ? 'Show Marathi' : 'Show English'}
      >
        {showEnglish ? 'मर' : 'En'}
      </button>
      
      {/* Language indicator */}
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
        मराठी
      </div>

      {/* Error display */}
      {error && (
        <div className="absolute top-full left-0 mt-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
          ⚠️ {error}
        </div>
      )}

      {/* Dual text display when typing */}
      {inputValue && marathiText && inputValue !== marathiText && !showEnglish && (
        <div className="absolute top-full left-0 mt-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded border max-w-full overflow-hidden">
          <span className="font-mono">English:</span> {inputValue}
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
