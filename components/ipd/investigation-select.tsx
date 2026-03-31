'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Check } from 'lucide-react'
import type { Investigation, InvestigationCategory } from '@/lib/ipd-types'

// ── Single-select mode (original) ─────────────────────────────────────────────
interface SingleSelectProps {
  multiple?: false
  value: string
  onChange: (value: string) => void
  values?: never
  onMultiChange?: never
}

// ── Multi-select mode ──────────────────────────────────────────────────────────
interface MultiSelectProps {
  multiple: true
  values: string[]
  onMultiChange: (values: string[]) => void
  value?: never
  onChange?: never
}

type InvestigationSelectProps = (SingleSelectProps | MultiSelectProps) & {
  category?: InvestigationCategory | ''
  label?: string
  placeholder?: string
  error?: string
}

export const InvestigationSelect = ({
  multiple,
  value,
  onChange,
  values,
  onMultiChange,
  category,
  label = 'Investigation',
  placeholder = 'Search investigations...',
  error,
}: InvestigationSelectProps) => {
  const [investigations, setInvestigations] = useState<Investigation[]>([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLoading(true)
    fetch('/api/investigations')
      .then((r) => r.json())
      .then((data) =>
        setInvestigations(
          Array.isArray(data)
            ? data
            : Array.isArray(data.investigations)
            ? data.investigations
            : []
        )
      )
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Sync single-select external value → query
  useEffect(() => {
    if (!multiple) setQuery(value ?? '')
  }, [value, multiple])

  const filtered = investigations.filter((inv) => {
    const matchesCategory = !category || inv.category === category
    const matchesQuery = !query || inv.name.toLowerCase().includes(query.toLowerCase())
    return matchesCategory && matchesQuery
  })

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSelectSingle = (inv: Investigation) => {
    setQuery(inv.name)
    onChange?.(inv.name)
    setOpen(false)
  }

  const handleToggleMulti = (inv: Investigation) => {
    if (!onMultiChange || !values) return
    const already = values.includes(inv.name)
    onMultiChange(already ? values.filter((v) => v !== inv.name) : [...values, inv.name])
    setQuery('')
    inputRef.current?.focus()
  }

  const handleRemoveTag = (name: string) => {
    if (!onMultiChange || !values) return
    onMultiChange(values.filter((v) => v !== name))
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [multiple, onChange, investigations, query])

  return (
    <div ref={containerRef} className="relative">
      {label && <Label className="mb-1 block text-sm font-medium">{label}</Label>}

      {/* ── Multi-select tags ──────────────────────────────────────────────── */}
      {multiple && values && values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {values.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-full px-2.5 py-0.5 text-xs font-medium"
            >
              {name}
              <button
                type="button"
                onClick={() => handleRemoveTag(name)}
                className="text-blue-500 hover:text-blue-700 ml-0.5 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ── Search input ───────────────────────────────────────────────────── */}
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          if (!multiple) onChange?.(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder={
          multiple && values && values.length > 0
            ? 'Add more investigations...'
            : placeholder
        }
        className={error ? 'border-red-500' : ''}
        autoComplete="off"
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

      {/* ── Dropdown ──────────────────────────────────────────────────────── */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {loading && (
            <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">
              {multiple
                ? 'No investigations found.'
                : 'No investigations found. You can type a custom name.'}
            </div>
          )}
          {!loading &&
            filtered.map((inv) => {
              const isSelected = multiple && values?.includes(inv.name)
              return (
                <button
                  key={inv.id}
                  type="button"
                  className={`w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b last:border-b-0 flex items-center justify-between ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                  onClick={() =>
                    multiple ? handleToggleMulti(inv) : handleSelectSingle(inv)
                  }
                >
                  <span>
                    <span className="font-medium">{inv.name}</span>
                    <span className="ml-2 text-gray-400 text-xs">{inv.category}</span>
                  </span>
                  {isSelected && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                </button>
              )
            })}
        </div>
      )}
    </div>
  )
}
