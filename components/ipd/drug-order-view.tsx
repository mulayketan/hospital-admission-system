'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DrugOrderForm } from './drug-order-form'
import { DrugDayGrid } from './drug-day-grid'
import { translations } from '@/lib/translations'
import type { DrugOrder, SelectedPatient } from '@/lib/ipd-types'
import { Plus } from 'lucide-react'

interface DrugOrderViewProps {
  patient: SelectedPatient
  language: 'en' | 'mr'
}

export const DrugOrderView = ({ patient, language }: DrugOrderViewProps) => {
  const t = translations[language]
  const [orders, setOrders] = useState<DrugOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [drugAllergy, setDrugAllergy] = useState('')
  const [medOfficerSignature, setMedOfficerSignature] = useState('')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/ipd/drug-orders?patientId=${patient.id}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      const list: DrugOrder[] = data.orders ?? data ?? []
      setOrders(list)
      // Populate allergy/signature from first row if available
      if (list.length > 0) {
        setDrugAllergy(list[0].drugAllergy ?? '')
        setMedOfficerSignature(list[0].medOfficerSignature ?? '')
      }
    } catch {
      toast.error('Error loading drug orders')
    } finally {
      setLoading(false)
    }
  }, [patient.id])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/ipd/drug-orders/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success(t.entryDeleted)
      fetchOrders()
    } catch {
      toast.error(t.deleteError2)
    }
  }

  const handleSaved = () => {
    toast.success(t.entrySaved)
    setShowForm(false)
    fetchOrders()
  }

  const handleSignatureSave = async () => {
    if (orders.length === 0) return
    try {
      // Update first order's signature (representative)
      await fetch(`/api/ipd/drug-orders/${orders[0].id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medOfficerSignature }),
      })
      toast.success(t.entrySaved)
    } catch {
      toast.error(t.entryError)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-semibold text-gray-700 uppercase tracking-wide text-sm">
          {t.drugOrderSheet}
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="whitespace-nowrap text-sm">{t.drugAllergy}:</Label>
            <Input
              value={drugAllergy}
              onChange={(e) => setDrugAllergy(e.target.value)}
              className="w-40"
              placeholder="NKDA or list..."
            />
          </div>
          {!showForm && (
            <Button
              size="sm"
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              {t.addDrug}
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <DrugOrderForm
          patient={patient}
          language={language}
          drugAllergy={drugAllergy}
          onSaved={handleSaved}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      ) : (
        <DrugDayGrid
          orders={orders}
          language={language}
          onDelete={handleDelete}
          onRefresh={fetchOrders}
          medOfficerSignature={medOfficerSignature}
          onSignatureChange={setMedOfficerSignature}
          onSignatureSave={handleSignatureSave}
        />
      )}
    </div>
  )
}
