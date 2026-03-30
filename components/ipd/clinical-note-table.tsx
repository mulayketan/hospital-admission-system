'use client'

import { Button } from '@/components/ui/button'
import { translations } from '@/lib/translations'
import { formatISTDateTime } from '@/lib/utils'
import type { ProgressReportEntry } from '@/lib/ipd-types'
import { Pencil, Trash2 } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface ClinicalNoteTableProps {
  entries: ProgressReportEntry[]
  language: 'en' | 'mr'
  onEdit: (entry: ProgressReportEntry) => void
  onDelete: (id: string) => void
}

export const ClinicalNoteTable = ({
  entries,
  language,
  onEdit,
  onDelete,
}: ClinicalNoteTableProps) => {
  const t = translations[language]
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  if (entries.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <p className="text-sm">No clinical notes yet. Add the first entry.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider w-28">
              Date &amp; Time
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
              {t.doctorNotes}
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
              {t.treatment}
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider w-24">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {entries.map((entry) => (
            <tr key={entry.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                {formatISTDateTime(entry.dateTime)}
                {entry.isAdmissionNote && (
                  <span className="ml-1 inline-block bg-blue-100 text-blue-700 text-xs px-1 rounded">
                    {t.admissionNote}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-800 whitespace-pre-wrap max-w-xs">
                {entry.doctorNotes}
                {entry.staffName && (
                  <div className="text-xs text-gray-400 mt-1">by {entry.staffName}</div>
                )}
              </td>
              <td className="px-4 py-3 text-gray-700 whitespace-pre-wrap max-w-xs">
                {entry.treatment ?? '—'}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(entry)}
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4 text-blue-500" />
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(t.deleteConfirm)) onDelete(entry.id)
                      }}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
