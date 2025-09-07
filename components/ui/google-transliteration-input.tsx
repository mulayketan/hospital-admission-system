'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from './input'

interface GoogleTransliterationInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onValueChange?: (value: string) => void
}

declare global {
  interface Window {
    google: any
  }
}

export function GoogleTransliterationInput({ onValueChange, ...props }: GoogleTransliterationInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const controlRef = useRef<any>(null)

  useEffect(() => {
    // Load Google JSAPI and transliteration
    const loadGoogleTransliteration = () => {
      if (window.google && window.google.elements) {
        initializeTransliteration()
        return
      }

      // Load Google JSAPI
      const script = document.createElement('script')
      script.src = 'https://www.google.com/jsapi'
      script.onload = () => {
        window.google.load('elements', '1', {
          packages: 'transliteration',
          callback: initializeTransliteration
        })
      }
      document.head.appendChild(script)
    }

    const initializeTransliteration = () => {
      if (!window.google?.elements?.transliteration) {
        console.warn('Google transliteration not available')
        return
      }

      try {
        const options = {
          sourceLanguage: 'en',
          destinationLanguage: ['mr'], // Marathi
          transliterationEnabled: true
        }

        controlRef.current = new window.google.elements.transliteration.TransliterationControl(options)
        
        if (inputRef.current) {
          // Make the input transliterable
          controlRef.current.makeTransliteratable([inputRef.current.id || 'marathi-input'])
          setIsGoogleLoaded(true)
        }
      } catch (error) {
        console.error('Error initializing Google transliteration:', error)
      }
    }

    loadGoogleTransliteration()

    return () => {
      // Cleanup
      if (controlRef.current) {
        try {
          controlRef.current.dispose()
        } catch (error) {
          console.warn('Error disposing transliteration control:', error)
        }
      }
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    
    if (onValueChange) {
      onValueChange(value)
    }
  }

  // Generate unique ID for the input
  const inputId = props.id || `marathi-input-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className="relative">
      <Input
        {...props}
        id={inputId}
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        className={`${props.className || ''} font-marathi`}
        placeholder={props.placeholder || 'Type in English (auto-converts to Marathi)'}
      />
      
      {!isGoogleLoaded && (
        <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}
      
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
        {isGoogleLoaded ? 'मराठी ✓' : 'मराठी'}
      </div>
      
      <style jsx global>{`
        .font-marathi {
          font-family: 'Noto Sans Devanagari', 'Mangal', 'Shree Devanagari 714', sans-serif;
        }
      `}</style>
    </div>
  )
}
