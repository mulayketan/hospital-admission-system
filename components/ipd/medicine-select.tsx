'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Medicine } from '@/lib/ipd-types'

interface MedicineSelectProps {
  value: string
  onChange: (value: string, medicine?: Medicine) => void
  label?: string
  placeholder?: string
  error?: string
}

export const MedicineSelect = ({
  value,
  onChange,
  label = 'Drug Name',
  placeholder = 'Search medicines...',
  error,
}: MedicineSelectProps) => {
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    fetch('/api/medicines')
      .then((r) => r.json())
      .then((data) => setMedicines(Array.isArray(data) ? data : (Array.isArray(data.medicines) ? data.medicines : [])))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Sync external value changes
  useEffect(() => {
    setQuery(value)
  }, [value])

  const filtered = medicines.filter((m) =>
    m.name.toLowerCase().includes(query.toLowerCase())
  )

  const handleSelect = (med: Medicine) => {
    setQuery(med.name)
    onChange(med.name, med)
    setOpen(false)
  }

  // Close on outside click
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
              No medicines found. You can type a custom name.
            </div>
          )}
          {!loading &&
            filtered.map((med) => (
              <button
                key={med.id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b last:border-b-0"
                onClick={() => handleSelect(med)}
              >
                <span className="font-medium">{med.name}</span>
                <span className="ml-2 text-gray-400 text-xs">
                  {med.category}
                  {med.defaultDose ? ` · ${med.defaultDose}` : ''}
                  {med.defaultFrequency ? ` · ${med.defaultFrequency}` : ''}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
