'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { translations } from '@/lib/translations'
import { buildISTDateTime, todayDate, currentTime } from '@/lib/utils'
import type { VitalSign, SelectedPatient } from '@/lib/ipd-types'

const formSchema = z
  .object({
    date: z.string().min(1, 'Date required'),
    time: z.string().min(1, 'Time required'),
    temp: z.string().optional(),
    pulse: z.string().optional(),
    bp: z.string().optional(),
    spo2: z.string().optional(),
    bsl: z.string().optional(),
    ivFluids: z.string().optional(),
    staffName: z.string().min(1, 'Staff name required'),
  })
  .refine((d) => [d.temp, d.pulse, d.bp, d.spo2].some((v) => v && v.trim() !== ''), {
    message: 'At least one of Temp, Pulse, B.P, SPO2 is required',
    path: ['temp'],
  })

type FormValues = z.infer<typeof formSchema>

interface VitalsFormProps {
  patient: SelectedPatient
  language: 'en' | 'mr'
  editingVital?: VitalSign | null
  onSaved: () => void
  onCancel: () => void
}

export const VitalsForm = ({
  patient,
  language,
  editingVital,
  onSaved,
  onCancel,
}: VitalsFormProps) => {
  const t = translations[language]

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: todayDate(),
      time: currentTime(),
      temp: '',
      pulse: '',
      bp: '',
      spo2: '',
      bsl: '',
      ivFluids: '',
      staffName: '',
    },
  })

  useEffect(() => {
    if (editingVital) {
      const dt = editingVital.dateTime.replace(/[+-]\d{2}:\d{2}$/, '').replace('Z', '')
      const d = new Date(dt)
      reset({
        date: d.toISOString().split('T')[0],
        time: d.toTimeString().slice(0, 5),
        temp: editingVital.temp ?? '',
        pulse: editingVital.pulse ?? '',
        bp: editingVital.bp ?? '',
        spo2: editingVital.spo2 ?? '',
        bsl: editingVital.bsl ?? '',
        ivFluids: editingVital.ivFluids ?? '',
        staffName: editingVital.staffName,
      })
    }
  }, [editingVital, reset])

  const onSubmit = async (values: FormValues) => {
    const dateTime = buildISTDateTime(values.date, values.time)
    const body = {
      patientId: patient.id,
      ipdNo: patient.ipdNo ?? '',
      dateTime,
      temp: values.temp || undefined,
      pulse: values.pulse || undefined,
      bp: values.bp || undefined,
      spo2: values.spo2 || undefined,
      bsl: values.bsl || undefined,
      ivFluids: values.ivFluids || undefined,
      staffName: values.staffName,
    }

    const url = editingVital
      ? `/api/ipd/nursing-chart/${editingVital.id}`
      : '/api/ipd/nursing-chart'
    const method = editingVital ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error('Failed to save')
    onSaved()
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-white border border-gray-200 rounded-lg p-4 space-y-4"
    >
      <h3 className="font-semibold text-gray-800">
        {editingVital ? t.editEntry : t.addReading}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <Label>Date</Label>
          <Input type="date" {...register('date')} className={errors.date ? 'border-red-500' : ''} />
        </div>
        <div>
          <Label>Time</Label>
          <Input type="time" {...register('time')} className={errors.time ? 'border-red-500' : ''} />
        </div>
        <div>
          <Label>{t.temp}</Label>
          <Input {...register('temp')} placeholder="99.2°F" />
        </div>
        <div>
          <Label>{t.pulse}</Label>
          <Input {...register('pulse')} placeholder="78/min" />
        </div>
        <div>
          <Label>{t.bp}</Label>
          <Input {...register('bp')} placeholder="130/70" />
        </div>
        <div>
          <Label>{t.spo2}</Label>
          <Input {...register('spo2')} placeholder="99%" />
        </div>
        <div>
          <Label>{t.bsl}</Label>
          <Input {...register('bsl')} placeholder="Blood sugar" />
        </div>
        <div>
          <Label>{t.ivFluids}</Label>
          <Input {...register('ivFluids')} placeholder="DNS 500ml" />
        </div>
      </div>

      {errors.temp && (
        <p className="text-red-500 text-xs">{errors.temp.message}</p>
      )}

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label>{t.nameOfStaff}</Label>
          <Input
            {...register('staffName')}
            placeholder="Nurse name"
            className={errors.staffName ? 'border-red-500' : ''}
          />
          {errors.staffName && (
            <p className="text-red-500 text-xs mt-1">{errors.staffName.message}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t.cancel}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : t.add}
          </Button>
        </div>
      </div>
    </form>
  )
}
