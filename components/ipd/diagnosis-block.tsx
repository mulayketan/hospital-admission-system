'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { translations } from '@/lib/translations'
import type { ProgressReportEntry } from '@/lib/ipd-types'
import { Save } from 'lucide-react'

interface DiagnosisBlockProps {
  patientId: string
  language: 'en' | 'mr'
  admissionNote: ProgressReportEntry | null
  onUpdated: (diagnosis: string) => void
}

export const DiagnosisBlock = ({
  patientId,
  language,
  admissionNote,
  onUpdated,
}: DiagnosisBlockProps) => {
  const t = translations[language]
  const [diagnosis, setDiagnosis] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDiagnosis(admissionNote?.diagnosis ?? '')
  }, [admissionNote])

  const handleSave = async () => {
    if (!admissionNote) return
    setSaving(true)
    try {
      const res = await fetch(`/api/ipd/progress-report/${admissionNote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagnosis }),
      })
      if (!res.ok) throw new Error('Failed to save diagnosis')
      toast.success(t.diagnosisSaved)
      onUpdated(diagnosis)
    } catch {
      toast.error(t.entryError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
      <Label className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 block">
        {t.diagnosis}
      </Label>
      <div className="flex gap-2">
        <textarea
          data-gramm="false"
          data-gramm_editor="false"
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          rows={2}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Enter diagnosis / chief complaint..."
        />
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={saving || !admissionNote}
          className="self-end flex items-center gap-1"
        >
          <Save className="h-3 w-3" />
          {saving ? 'Saving...' : t.save}
        </Button>
      </div>
      {!admissionNote && (
        <p className="text-xs text-gray-400 mt-1">
          Add the first clinical note to unlock the diagnosis field.
        </p>
      )}
    </div>
  )
}
