'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { translations } from '@/lib/translations'
import type { DrugOrder } from '@/lib/ipd-types'
import { Pill, Loader2 } from 'lucide-react'

type Lang = 'en' | 'mr'

interface DrugOrdersSummaryProps {
  patientId: string
  language: Lang
  onManageDrugOrders: () => void
}

export const DrugOrdersSummary = ({
  patientId,
  language,
  onManageDrugOrders,
}: DrugOrdersSummaryProps) => {
  const t = translations[language]
  const [orders, setOrders] = useState<DrugOrder[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/ipd/drug-orders?patientId=${encodeURIComponent(patientId)}`)
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Pill className="h-4 w-4 text-gray-500 shrink-0" aria-hidden />
          {t.progressCurrentMedications}
        </h4>
        <Button type="button" size="sm" variant="default" onClick={onManageDrugOrders} className="w-full sm:w-auto">
          {t.addManageDrugOrders}
        </Button>
      </div>
      <p className="text-xs text-gray-500">{t.progressMedicationsBlurb}</p>

      {loading ? (
        <div className="flex justify-center py-6 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <p className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-md bg-white px-3 py-4 text-center">
          {t.noDrugsInOrderSheet}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
          <table className="w-full text-sm text-left min-w-[480px]">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-xs uppercase tracking-wide">
                <th className="px-3 py-2 font-medium">{t.drugName}</th>
                <th className="px-2 py-2 font-medium w-[6rem]">{t.frequency}</th>
                <th className="px-2 py-2 font-medium w-[5rem]">{t.route}</th>
                <th className="px-2 py-2 font-medium w-[6.5rem]">{t.startDate}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => (
                <tr key={o.id} className="text-gray-800">
                  <td className="px-3 py-2 font-medium">{o.drugName}</td>
                  <td className="px-2 py-2 text-gray-700">{o.frequency}</td>
                  <td className="px-2 py-2 text-gray-700">{o.route}</td>
                  <td className="px-2 py-2 text-gray-600 whitespace-nowrap tabular-nums">
                    {o.startDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
