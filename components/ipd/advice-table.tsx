'use client'

import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { translations } from '@/lib/translations'
import { formatISTDateTime } from '@/lib/utils'
import { ADVICE_STATUS_OPTIONS, type PatientAdvice } from '@/lib/ipd-types'
import { Pencil, Trash2 } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface AdviceTableProps {
  adviceList: PatientAdvice[]
  language: 'en' | 'mr'
  onEdit: (a: PatientAdvice) => void
  onDelete: (id: string) => void
  onStatusChanged: () => void
}

export const AdviceTable = ({
  adviceList,
  language,
  onEdit,
  onDelete,
  onStatusChanged,
}: AdviceTableProps) => {
  const t = translations[language]
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const handleStatusChange = async (advice: PatientAdvice, status: PatientAdvice['status']) => {
    try {
      const res = await fetch(`/api/ipd/advice/${advice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      toast.success(t.entryUpdated)
      onStatusChanged()
    } catch {
      toast.error(t.entryError)
    }
  }

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
              t.status,
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
              <td className="px-4 py-3 text-gray-800 font-medium">
                {advice.investigationName}
                {advice.notes && (
                  <div className="text-xs text-gray-400">{advice.notes}</div>
                )}
              </td>
              <td className="px-4 py-3 text-gray-700">{advice.advisedBy}</td>
              <td className="px-4 py-3">
                <Select
                  value={advice.status}
                  onValueChange={(v) =>
                    handleStatusChange(advice, v as PatientAdvice['status'])
                  }
                >
                  <SelectTrigger
                    className={`h-8 text-xs w-36 ${
                      advice.status === 'Done'
                        ? 'border-green-400 text-green-700'
                        : advice.status === 'Report Received'
                        ? 'border-blue-400 text-blue-700'
                        : 'border-yellow-400 text-yellow-700'
                    }`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADVICE_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {advice.reportNotes && (
                  <p className="text-xs text-gray-500 mt-1">{advice.reportNotes}</p>
                )}
              </td>
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
