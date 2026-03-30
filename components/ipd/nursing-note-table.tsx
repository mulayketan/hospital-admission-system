'use client'

import { Button } from '@/components/ui/button'
import { translations } from '@/lib/translations'
import { formatISTDateTime } from '@/lib/utils'
import type { NursingNote } from '@/lib/ipd-types'
import { Pencil, Trash2, ArrowLeftRight } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface NursingNoteTableProps {
  notes: NursingNote[]
  language: 'en' | 'mr'
  onEdit: (note: NursingNote) => void
  onDelete: (id: string) => void
}

export const NursingNoteTable = ({
  notes,
  language,
  onEdit,
  onDelete,
}: NursingNoteTableProps) => {
  const t = translations[language]
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  if (notes.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <p className="text-sm">No nursing notes yet. Add the first entry.</p>
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
              {t.notes}
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider w-24">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {notes.map((note) => (
            <tr
              key={note.id}
              className={note.isHandover ? 'bg-gray-100' : 'hover:bg-gray-50'}
            >
              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                {formatISTDateTime(note.dateTime)}
              </td>
              <td className="px-4 py-3 text-gray-800">
                {note.isHandover && (
                  <div className="flex items-center gap-1 text-orange-700 font-semibold text-xs mb-1">
                    <ArrowLeftRight className="h-3 w-3" />
                    ⇄ {t.handover} TO NEXT DUTY
                  </div>
                )}
                <p className="whitespace-pre-wrap">{note.notes}</p>
                {note.treatment && (
                  <p className="text-gray-500 mt-1 whitespace-pre-wrap">
                    <span className="font-medium">Treatment:</span> {note.treatment}
                  </p>
                )}
                {note.staffName && (
                  <div className="text-xs text-gray-400 mt-1">by {note.staffName}</div>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(note)} title="Edit">
                    <Pencil className="h-4 w-4 text-blue-500" />
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(t.deleteConfirm)) onDelete(note.id)
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
