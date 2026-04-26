'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { AdviceForm } from './advice-form'
import { AdviceTable } from './advice-table'
import { translations } from '@/lib/translations'
import type { PatientAdvice, SelectedPatient } from '@/lib/ipd-types'
import { Plus } from 'lucide-react'

interface AdviceViewProps {
  patient: SelectedPatient
  language: 'en' | 'mr'
}

export const AdviceView = ({ patient, language }: AdviceViewProps) => {
  const t = translations[language]
  const [adviceList, setAdviceList] = useState<PatientAdvice[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingAdvice, setEditingAdvice] = useState<PatientAdvice | null>(null)

  const fetchAdvice = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/ipd/advice?patientId=${patient.id}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAdviceList(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Error loading advice entries')
    } finally {
      setLoading(false)
    }
  }, [patient.id])

  useEffect(() => { fetchAdvice() }, [fetchAdvice])

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/ipd/advice/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success(t.entryDeleted)
      fetchAdvice()
    } catch {
      toast.error(t.deleteError2)
    }
  }

  const handleSaved = () => {
    toast.success(editingAdvice ? t.entryUpdated : t.entrySaved)
    setShowForm(false)
    setEditingAdvice(null)
    fetchAdvice()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700 uppercase tracking-wide text-sm">
          {t.patientAdvice}
        </h3>
        {!showForm && (
          <Button
            size="sm"
            onClick={() => { setEditingAdvice(null); setShowForm(true) }}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            {t.addAdvice}
          </Button>
        )}
      </div>

      {showForm && (
        <AdviceForm
          patient={patient}
          language={language}
          editingAdvice={editingAdvice}
          onSaved={handleSaved}
          onCancel={() => { setShowForm(false); setEditingAdvice(null) }}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      ) : (
        <AdviceTable
          adviceList={adviceList}
          language={language}
          onEdit={(a) => { setEditingAdvice(a); setShowForm(true) }}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
