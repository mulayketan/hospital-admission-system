'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Investigation, InvestigationCategory } from '@/lib/ipd-types'

interface InvestigationSelectProps {
  value: string
  onChange: (value: string) => void
  category?: InvestigationCategory | ''
  label?: string
  placeholder?: string
  error?: string
}

export const InvestigationSelect = ({
  value,
  onChange,
  category,
  label = 'Investigation',
  placeholder = 'Search investigations...',
  error,
}: InvestigationSelectProps) => {
  const [investigations, setInvestigations] = useState<Investigation[]>([])
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    fetch('/api/investigations')
      .then((r) => r.json())
      .then((data) => setInvestigations(data.investigations ?? data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setQuery(value)
  }, [value])

  // Filter by category if provided, then by search query
  const filtered = investigations.filter((inv) => {
    const matchesCategory = !category || inv.category === category
    const matchesQuery = inv.name.toLowerCase().includes(query.toLowerCase())
    return matchesCategory && matchesQuery
  })

  const handleSelect = (inv: Investigation) => {
    setQuery(inv.name)
    onChange(inv.name)
    setOpen(false)
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      {label && <Label className="mb-1 block text-sm font-medium">{label}</Label>}
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={error ? 'border-red-500' : ''}
        autoComplete="off"
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {loading && (
            <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">
              No investigations found. You can type a custom name.
            </div>
          )}
          {!loading &&
            filtered.map((inv) => (
              <button
                key={inv.id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b last:border-b-0"
                onClick={() => handleSelect(inv)}
              >
                <span className="font-medium">{inv.name}</span>
                <span className="ml-2 text-gray-400 text-xs">{inv.category}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
