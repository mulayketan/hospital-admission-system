'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { MedicineSelect } from './medicine-select'
import { translations } from '@/lib/translations'
import { todayDate } from '@/lib/utils'
import { FREQUENCY_OPTIONS, ROUTE_OPTIONS } from '@/lib/ipd-types'
import type { DrugOrder, SelectedPatient, Medicine } from '@/lib/ipd-types'

const formSchema = z.object({
  drugName: z.string().min(1, 'Drug name required'),
  frequency: z.enum(['BD', 'TD', 'TDS', 'OD', 'STAT', 'SOS', 'QD', 'QID', 'HS', '1-0-1', '2-2-2', 'Other']),
  route: z.enum(['IV', 'INJ (IM)', 'Oral (TAB)', 'Oral (SYP)', 'Oral (CAP)', 'Topical', 'SL', 'Other']),
  startDate: z.string().min(1, 'Start date required'),
  drugAllergy: z.string().optional(),
})
type FormValues = z.infer<typeof formSchema>

interface DrugOrderFormProps {
  patient: SelectedPatient
  language: 'en' | 'mr'
  drugAllergy: string
  onSaved: () => void
  onCancel: () => void
}

export const DrugOrderForm = ({
  patient,
  language,
  drugAllergy,
  onSaved,
  onCancel,
}: DrugOrderFormProps) => {
  const t = translations[language]

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      drugName: '',
      frequency: 'BD',
      route: 'IV',
      startDate: todayDate(),
      drugAllergy: drugAllergy,
    },
  })

  useEffect(() => {
    setValue('drugAllergy', drugAllergy)
  }, [drugAllergy, setValue])

  const onSubmit = async (values: FormValues) => {
    const body = {
      patientId: patient.id,
      ipdNo: patient.ipdNo ?? '',
      drugName: values.drugName,
      drugAllergy: drugAllergy || undefined,
      frequency: values.frequency,
      route: values.route,
      startDate: values.startDate,
      medOfficerSignature: patient.treatingDoctor || undefined,
      ward: patient.ward,
      bedNo: patient.bedNo ?? undefined,
    }

    const res = await fetch('/api/ipd/drug-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error('Failed to save drug order')
    onSaved()
  }

  const handleMedicineSelect = (name: string, med?: Medicine) => {
    setValue('drugName', name)
    if (med) {
      if (med.defaultFrequency) {
        const freq = FREQUENCY_OPTIONS.find((f) => f === med.defaultFrequency)
        if (freq) setValue('frequency', freq)
      }
      if (med.defaultRoute) {
        const route = ROUTE_OPTIONS.find((r) => r === med.defaultRoute)
        if (route) setValue('route', route)
      }
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-white border border-gray-200 rounded-lg p-4 space-y-4"
    >
      <h3 className="font-semibold text-gray-800">{t.addDrug}</h3>

      <div>
        <MedicineSelect
          value={watch('drugName')}
          onChange={handleMedicineSelect}
          label={t.drugName}
          error={errors.drugName?.message}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label>{t.frequency}</Label>
          <Select
            value={watch('frequency')}
            onValueChange={(v) =>
              setValue('frequency', v as FormValues['frequency'])
            }
          >
            <SelectTrigger>
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
          <Select
            value={watch('route')}
            onValueChange={(v) => setValue('route', v as FormValues['route'])}
          >
            <SelectTrigger>
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

        <div>
          <Label>{t.startDate}</Label>
          <Input
            type="date"
            {...register('startDate')}
            className={errors.startDate ? 'border-red-500' : ''}
          />
          {errors.startDate && (
            <p className="text-red-500 text-xs mt-1">{errors.startDate.message}</p>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
        Ward / Bed: {patient.ward ?? '—'} / {patient.bedNo ?? '—'} (auto-filled from patient)
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : t.saveDrug}
        </Button>
      </div>
    </form>
  )
}
