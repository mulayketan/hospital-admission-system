'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { VitalsForm } from './vitals-form'
import { VitalsTable } from './vitals-table'
import { translations } from '@/lib/translations'
import type { VitalSign, SelectedPatient } from '@/lib/ipd-types'
import { Plus } from 'lucide-react'

interface NursingChartViewProps {
  patient: SelectedPatient
  language: 'en' | 'mr'
}

export const NursingChartView = ({ patient, language }: NursingChartViewProps) => {
  const t = translations[language]
  const [vitals, setVitals] = useState<VitalSign[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingVital, setEditingVital] = useState<VitalSign | null>(null)

  const fetchVitals = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/ipd/nursing-chart?patientId=${patient.id}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setVitals(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Error loading vital signs')
    } finally {
      setLoading(false)
    }
  }, [patient.id])

  useEffect(() => { fetchVitals() }, [fetchVitals])

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/ipd/nursing-chart/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success(t.entryDeleted)
      fetchVitals()
    } catch {
      toast.error(t.deleteError2)
    }
  }

  const handleSaved = () => {
    toast.success(editingVital ? t.entryUpdated : t.entrySaved)
    setShowForm(false)
    setEditingVital(null)
    fetchVitals()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700 uppercase tracking-wide text-sm">
          {t.vitalSigns}
        </h3>
        {!showForm && (
          <Button
            size="sm"
            onClick={() => { setEditingVital(null); setShowForm(true) }}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            {t.addReading}
          </Button>
        )}
      </div>

      {showForm && (
        <VitalsForm
          patient={patient}
          language={language}
          editingVital={editingVital}
          onSaved={handleSaved}
          onCancel={() => { setShowForm(false); setEditingVital(null) }}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      ) : (
        <VitalsTable
          vitals={vitals}
          language={language}
          onEdit={(v) => { setEditingVital(v); setShowForm(true) }}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
