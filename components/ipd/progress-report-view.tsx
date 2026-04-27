'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { DiagnosisBlock } from './diagnosis-block'
import { ClinicalNoteForm } from './clinical-note-form'
import { ClinicalNoteTable } from './clinical-note-table'
import { DrugOrdersSummary } from './drug-orders-summary'
import { translations } from '@/lib/translations'
import type { ProgressReportEntry, SelectedPatient } from '@/lib/ipd-types'
import { Plus } from 'lucide-react'

interface ProgressReportViewProps {
  patient: SelectedPatient
  language: 'en' | 'mr'
  onManageDrugOrders: () => void
}

export const ProgressReportView = ({
  patient,
  language,
  onManageDrugOrders,
}: ProgressReportViewProps) => {
  const t = translations[language]
  const [entries, setEntries] = useState<ProgressReportEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<ProgressReportEntry | null>(null)

  const admissionNote = entries.find((e) => e.isAdmissionNote) ?? null

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/ipd/progress-report?patientId=${patient.id}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setEntries(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Error loading progress report entries')
    } finally {
      setLoading(false)
    }
  }, [patient.id])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/ipd/progress-report/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success(t.entryDeleted)
      fetchEntries()
    } catch {
      toast.error(t.deleteError2)
    }
  }

  const handleSaved = () => {
    toast.success(editingEntry ? t.entryUpdated : t.entrySaved)
    setShowForm(false)
    setEditingEntry(null)
    fetchEntries()
  }

  const handleEdit = (entry: ProgressReportEntry) => {
    setEditingEntry(entry)
    setShowForm(true)
  }

  return (
    <div className="space-y-4">
      <DiagnosisBlock
        patientId={patient.id}
        language={language}
        admissionNote={admissionNote}
        onUpdated={(diag) => {
          setEntries((prev) =>
            prev.map((e) => (e.isAdmissionNote ? { ...e, diagnosis: diag } : e))
          )
        }}
      />

      <DrugOrdersSummary
        patientId={patient.id}
        language={language}
        onManageDrugOrders={onManageDrugOrders}
      />

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700 uppercase tracking-wide text-sm">
          {t.clinicalNotes}
        </h3>
        {!showForm && (
          <Button
            size="sm"
            onClick={() => { setEditingEntry(null); setShowForm(true) }}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            {t.addEntry}
          </Button>
        )}
      </div>

      {showForm && (
        <ClinicalNoteForm
          patient={patient}
          language={language}
          editingEntry={editingEntry}
          onSaved={handleSaved}
          onCancel={() => { setShowForm(false); setEditingEntry(null) }}
          onManageDrugOrders={onManageDrugOrders}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      ) : (
        <ClinicalNoteTable
          entries={entries}
          language={language}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
