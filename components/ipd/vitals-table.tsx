'use client'

import { Button } from '@/components/ui/button'
import { translations } from '@/lib/translations'
import { formatISTDateTime } from '@/lib/utils'
import type { VitalSign } from '@/lib/ipd-types'
import { Pencil, Trash2 } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface VitalsTableProps {
  vitals: VitalSign[]
  language: 'en' | 'mr'
  onEdit: (v: VitalSign) => void
  onDelete: (id: string) => void
}

export const VitalsTable = ({ vitals, language, onEdit, onDelete }: VitalsTableProps) => {
  const t = translations[language]
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  if (vitals.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <p className="text-sm">No vital signs recorded yet. Add the first reading.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['DATE/TIME', t.temp, t.pulse, t.bp, t.spo2, t.bsl, t.ivFluids, t.nameOfStaff, 'Actions'].map(
              (h) => (
                <th
                  key={h}
                  className="px-3 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {vitals.map((v) => (
            <tr key={v.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                {formatISTDateTime(v.dateTime)}
              </td>
              <td className="px-3 py-2">{v.temp ?? '—'}</td>
              <td className="px-3 py-2">{v.pulse ?? '—'}</td>
              <td className="px-3 py-2">{v.bp ?? '—'}</td>
              <td className="px-3 py-2">{v.spo2 ?? '—'}</td>
              <td className="px-3 py-2">{v.bsl ?? '—'}</td>
              <td className="px-3 py-2">{v.ivFluids ?? '—'}</td>
              <td className="px-3 py-2">{v.staffName}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(v)} title="Edit">
                    <Pencil className="h-4 w-4 text-blue-500" />
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(t.deleteConfirm)) onDelete(v.id)
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
