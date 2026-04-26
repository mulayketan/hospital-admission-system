'use client'

import { Button } from '@/components/ui/button'
import { translations } from '@/lib/translations'
import { formatISTDateTime } from '@/lib/utils'
import { type PatientAdvice } from '@/lib/ipd-types'
import { Pencil, Trash2 } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface AdviceTableProps {
  adviceList: PatientAdvice[]
  language: 'en' | 'mr'
  onEdit: (a: PatientAdvice) => void
  onDelete: (id: string) => void
}

export const AdviceTable = ({
  adviceList,
  language,
  onEdit,
  onDelete,
}: AdviceTableProps) => {
  const t = translations[language]
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  if (adviceList.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        No advice recorded yet. Add the first entry.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {[
              'Date & Time',
              t.category,
              t.investigationName,
              t.advisedBy,
              t.reportNotes,
              'Actions',
            ].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {adviceList.map((advice) => (
            <tr key={advice.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                {formatISTDateTime(advice.dateTime)}
              </td>
              <td className="px-4 py-3 text-gray-700">{advice.category}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {advice.investigationName
                    .split(',')
                    .map((n) => n.trim())
                    .filter(Boolean)
                    .map((name) => (
                      <span
                        key={name}
                        className="inline-block bg-blue-50 text-blue-800 border border-blue-200 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap"
                      >
                        {name}
                      </span>
                    ))}
                </div>
              </td>
              <td className="px-4 py-3 text-gray-700">{advice.advisedBy}</td>
              <td className="px-4 py-3 text-gray-600">{advice.reportNotes || '—'}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(advice)} title="Edit">
                    <Pencil className="h-4 w-4 text-blue-500" />
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(t.deleteConfirm)) onDelete(advice.id)
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
