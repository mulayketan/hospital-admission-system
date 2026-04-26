'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { translations } from '@/lib/translations'
import type { DrugOrder } from '@/lib/ipd-types'
import { DRUG_ORDER_DATE_COLUMNS_PER_PAGE, FREQUENCY_OPTIONS, ROUTE_OPTIONS } from '@/lib/ipd-types'
import { X, Check, Pencil } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface DrugDayGridProps {
  orders: DrugOrder[]
  treatingDoctor: string | null
  language: 'en' | 'mr'
  onDelete: (id: string) => void
  onRefresh: () => void
}

interface CellPopup {
  orderId: string
  dayKey: string
  currentValue: string
}

function getDayColumns(orders: DrugOrder[]): { key: string; label: string }[] {
  const maxDay = orders.reduce((max, o) => {
    const keys = Object.keys(o.days ?? {})
    const nums = keys.map((k) => parseInt(k.replace('day', ''), 10)).filter(Boolean)
    return Math.max(max, ...nums, 1)
  }, 1)
  // Show at least (startDate day range), up to 36
  const cols: { key: string; label: string }[] = []
  for (let i = 1; i <= Math.min(maxDay + 2, 36); i++) {
    cols.push({ key: `day${i}`, label: `D${i}` })
  }
  return cols
}

function formatDayTimes(value: string): React.ReactNode {
  if (!value) return <span className="text-gray-300">—</span>
  return (
    <div className="text-xs leading-tight">
      {value.split(',').map((t, i) => (
        <div key={i}>{t.trim()}</div>
      ))}
    </div>
  )
}

export const DrugDayGrid = ({
  orders,
  treatingDoctor,
  language,
  onDelete,
  onRefresh,
}: DrugDayGridProps) => {
  const t = translations[language]
  const { data: session } = useSession()
  const canManageOrders = Boolean(session?.user)

  const [popup, setPopup] = useState<CellPopup | null>(null)
  const [popupValue, setPopupValue] = useState('')
  const [savingCell, setSavingCell] = useState(false)

  const [editOrder, setEditOrder] = useState<DrugOrder | null>(null)
  const [editDrugName, setEditDrugName] = useState('')
  const [editFrequency, setEditFrequency] = useState<string>('BD')
  const [editRoute, setEditRoute] = useState<string>('IV')
  const [editStartDate, setEditStartDate] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const dayColumns = getDayColumns(orders)

  const openPopup = (order: DrugOrder, dayKey: string) => {
    const current = order.days?.[dayKey] ?? ''
    setPopup({ orderId: order.id, dayKey, currentValue: current })
    setPopupValue(current)
  }

  const closePopup = () => {
    setPopup(null)
    setPopupValue('')
  }

  const openEditOrder = (order: DrugOrder) => {
    setEditOrder(order)
    setEditDrugName(order.drugName)
    setEditFrequency(order.frequency)
    setEditRoute(order.route)
    setEditStartDate(order.startDate)
  }

  const closeEditOrder = () => {
    setEditOrder(null)
    setSavingEdit(false)
  }

  const saveEditOrder = async () => {
    if (!editOrder) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/ipd/drug-orders/${editOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drugName: editDrugName.trim(),
          frequency: editFrequency,
          route: editRoute,
          startDate: editStartDate,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success(t.entryUpdated)
      closeEditOrder()
      onRefresh()
    } catch {
      toast.error(t.entryError)
    } finally {
      setSavingEdit(false)
    }
  }

  const saveCell = async () => {
    if (!popup) return
    setSavingCell(true)
    try {
      const order = orders.find((o) => o.id === popup.orderId)
      if (!order) return
      const updatedDays = { ...(order.days ?? {}), [popup.dayKey]: popupValue }
      const res = await fetch(`/api/ipd/drug-orders/${popup.orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: updatedDays }),
      })
      if (!res.ok) throw new Error()
      toast.success(t.entryUpdated)
      closePopup()
      onRefresh()
    } catch {
      toast.error(t.entryError)
    } finally {
      setSavingCell(false)
    }
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        No drug orders yet. Add the first drug.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Horizontal scrollable grid */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <p className="text-xs text-gray-500 px-2 py-1 bg-gray-50 border-b border-gray-200">
          Day columns align with the order sheet PDF: {DRUG_ORDER_DATE_COLUMNS_PER_PAGE} &quot;Date:&quot; columns per printed page (scroll for more days).
        </p>
        <table className="text-xs divide-y divide-gray-200" style={{ minWidth: '960px' }}>
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500 sticky left-0 bg-gray-50 z-10 min-w-[220px]">
                Drug
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap min-w-[72px]">
                Freq
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap min-w-[100px]">
                Route
              </th>
              <th className="px-2 py-2 text-left font-medium text-gray-500 whitespace-nowrap">
                Start
              </th>
              {dayColumns.map((col, idx) => (
                <th
                  key={col.key}
                  className={`px-2 py-2 text-center font-medium text-gray-500 whitespace-nowrap min-w-[72px] ${
                    idx % DRUG_ORDER_DATE_COLUMNS_PER_PAGE === 0 ? 'border-l-2 border-gray-400' : ''
                  }`}
                >
                  {col.label}
                </th>
              ))}
              <th className="px-2 py-2 text-left font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-800 sticky left-0 bg-white z-10 max-w-[280px]">
                  <span className="line-clamp-3">{order.drugName}</span>
                </td>
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{order.frequency}</td>
                <td className="px-3 py-2 text-gray-600">{order.route}</td>
                <td className="px-2 py-2 text-gray-600 whitespace-nowrap">{order.startDate}</td>
                {dayColumns.map((col, idx) => (
                  <td
                    key={col.key}
                    className={`px-1 py-1 text-center align-top cursor-pointer hover:bg-blue-50 transition-colors ${
                      idx % DRUG_ORDER_DATE_COLUMNS_PER_PAGE === 0 ? 'border-l-2 border-gray-300' : ''
                    }`}
                    onClick={() => openPopup(order, col.key)}
                    title={`Click to edit ${col.label}`}
                  >
                    {formatDayTimes(order.days?.[col.key] ?? '')}
                  </td>
                ))}
                <td className="px-2 py-2">
                  {canManageOrders && (
                    <div className="flex items-center gap-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title={t.editDrugOrder}
                        onClick={() => openEditOrder(order)}
                      >
                        <Pencil className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(t.deleteConfirm)) onDelete(order.id)
                        }}
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Treating doctor (single doctor source) */}
      <div className="flex items-end gap-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div className="flex-1">
          <Label className="text-sm">{t.treatingDoctor}</Label>
          <Input
            value={treatingDoctor || ''}
            disabled
            placeholder="Treating doctor"
          />
        </div>
      </div>

      {editOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">{t.editDrugOrder}</h3>
              <button type="button" onClick={closeEditOrder} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div>
              <Label>{t.drugName}</Label>
              <Input value={editDrugName} onChange={(e) => setEditDrugName(e.target.value)} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t.frequency}</Label>
                <Select value={editFrequency} onValueChange={setEditFrequency}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t.route}</Label>
                <Select value={editRoute} onValueChange={setEditRoute}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROUTE_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t.startDate}</Label>
              <Input
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <p className="text-xs text-gray-500">{t.editDrugOrderHint}</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeEditOrder}>
                {t.cancel}
              </Button>
              <Button type="button" onClick={saveEditOrder} disabled={savingEdit} className="flex items-center gap-1">
                <Check className="h-4 w-4" />
                {savingEdit ? '...' : t.save}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Day cell popup */}
      {popup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">
                {t.editCell} — {popup.dayKey.replace('day', 'Day ')}
              </h3>
              <button onClick={closePopup} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div>
              <Label>{t.administrationTimes}</Label>
              <Input
                value={popupValue}
                onChange={(e) => setPopupValue(e.target.value)}
                placeholder={t.timesPlaceholder}
                className="mt-1"
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">
                Comma-separated times e.g. 8AM, 2PM, 8PM
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closePopup}>
                {t.cancel}
              </Button>
              <Button onClick={saveCell} disabled={savingCell} className="flex items-center gap-1">
                <Check className="h-4 w-4" />
                {savingCell ? 'Saving...' : t.save}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
