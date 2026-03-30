'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { NursingNoteForm } from './nursing-note-form'
import { NursingNoteTable } from './nursing-note-table'
import { translations } from '@/lib/translations'
import type { NursingNote, SelectedPatient } from '@/lib/ipd-types'
import { Plus } from 'lucide-react'

interface NursingNotesViewProps {
  patient: SelectedPatient
  language: 'en' | 'mr'
}

export const NursingNotesView = ({ patient, language }: NursingNotesViewProps) => {
  const t = translations[language]
  const [notes, setNotes] = useState<NursingNote[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingNote, setEditingNote] = useState<NursingNote | null>(null)

  const fetchNotes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/ipd/nursing-notes?patientId=${patient.id}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setNotes(data.notes ?? data ?? [])
    } catch {
      toast.error('Error loading nursing notes')
    } finally {
      setLoading(false)
    }
  }, [patient.id])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/ipd/nursing-notes/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success(t.entryDeleted)
      fetchNotes()
    } catch {
      toast.error(t.deleteError2)
    }
  }

  const handleSaved = () => {
    toast.success(editingNote ? t.entryUpdated : t.entrySaved)
    setShowForm(false)
    setEditingNote(null)
    fetchNotes()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700 uppercase tracking-wide text-sm">
          {t.nursingNotes}
        </h3>
        {!showForm && (
          <Button
            size="sm"
            onClick={() => { setEditingNote(null); setShowForm(true) }}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            {t.addNote}
          </Button>
        )}
      </div>

      {showForm && (
        <NursingNoteForm
          patient={patient}
          language={language}
          editingNote={editingNote}
          onSaved={handleSaved}
          onCancel={() => { setShowForm(false); setEditingNote(null) }}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      ) : (
        <NursingNoteTable
          notes={notes}
          language={language}
          onEdit={(note) => { setEditingNote(note); setShowForm(true) }}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
