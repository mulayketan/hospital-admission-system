'use client'

import { useEffect, useState } from 'react'
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
import { InvestigationSelect } from './investigation-select'
import { translations } from '@/lib/translations'
import { buildISTDateTime, todayDate, currentTime } from '@/lib/utils'
import {
  INVESTIGATION_CATEGORIES,
  ADVICE_STATUS_OPTIONS,
  type PatientAdvice,
  type SelectedPatient,
  type InvestigationCategory,
} from '@/lib/ipd-types'

const formSchema = z.object({
  date: z.string().min(1, 'Date required'),
  time: z.string().min(1, 'Time required'),
  category: z.enum([
    'Blood Test', 'Urine Test', 'X-Ray', 'CT Scan', 'MRI', 'USG', 'ECG', 'Echo', 'Other',
  ]),
  investigationName: z.string().min(1, 'Investigation name required'),
  notes: z.string().optional(),
  advisedBy: z.string().min(1, 'Advised by is required'),
  status: z.enum(['Pending', 'Done', 'Report Received']).default('Pending'),
  reportNotes: z.string().optional(),
})
type FormValues = z.infer<typeof formSchema>

interface AdviceFormProps {
  patient: SelectedPatient
  language: 'en' | 'mr'
  editingAdvice?: PatientAdvice | null
  onSaved: () => void
  onCancel: () => void
}

export const AdviceForm = ({
  patient,
  language,
  editingAdvice,
  onSaved,
  onCancel,
}: AdviceFormProps) => {
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
      date: todayDate(),
      time: currentTime(),
      category: 'Blood Test',
      investigationName: '',
      notes: '',
      advisedBy: '',
      status: 'Pending',
      reportNotes: '',
    },
  })

  const selectedCategory = watch('category')

  useEffect(() => {
    if (editingAdvice) {
      const dt = editingAdvice.dateTime.replace(/[+-]\d{2}:\d{2}$/, '').replace('Z', '')
      const d = new Date(dt)
      reset({
        date: d.toISOString().split('T')[0],
        time: d.toTimeString().slice(0, 5),
        category: editingAdvice.category,
        investigationName: editingAdvice.investigationName,
        notes: editingAdvice.notes ?? '',
        advisedBy: editingAdvice.advisedBy,
        status: editingAdvice.status,
        reportNotes: editingAdvice.reportNotes ?? '',
      })
    }
  }, [editingAdvice, reset])

  const onSubmit = async (values: FormValues) => {
    const dateTime = buildISTDateTime(values.date, values.time)
    const body = {
      patientId: patient.id,
      ipdNo: patient.ipdNo ?? '',
      dateTime,
      category: values.category,
      investigationName: values.investigationName,
      notes: values.notes || undefined,
      advisedBy: values.advisedBy,
      status: values.status,
      reportNotes: values.reportNotes || undefined,
    }

    const url = editingAdvice ? `/api/ipd/advice/${editingAdvice.id}` : '/api/ipd/advice'
    const method = editingAdvice ? 'PUT' : 'POST'

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
        {editingAdvice ? t.editEntry : t.addAdvice}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Date</Label>
          <Input type="date" {...register('date')} />
        </div>
        <div>
          <Label>Time</Label>
          <Input type="time" {...register('time')} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t.category}</Label>
          <Select
            value={selectedCategory}
            onValueChange={(v) => {
              setValue('category', v as FormValues['category'])
              setValue('investigationName', '')
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INVESTIGATION_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <InvestigationSelect
            value={watch('investigationName')}
            onChange={(v) => setValue('investigationName', v)}
            category={selectedCategory as InvestigationCategory}
            label={t.investigationName}
            error={errors.investigationName?.message}
          />
        </div>
      </div>

      <div>
        <Label>Notes (optional)</Label>
        <Input {...register('notes')} placeholder="e.g. fasting, with contrast" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t.advisedBy}</Label>
          <Input
            {...register('advisedBy')}
            placeholder="Dr. name"
            className={errors.advisedBy ? 'border-red-500' : ''}
          />
          {errors.advisedBy && (
            <p className="text-red-500 text-xs mt-1">{errors.advisedBy.message}</p>
          )}
        </div>
        <div>
          <Label>{t.status}</Label>
          <Select
            value={watch('status')}
            onValueChange={(v) => setValue('status', v as FormValues['status'])}
          >
            <SelectTrigger>
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
        </div>
      </div>

      {(watch('status') === 'Done' || watch('status') === 'Report Received') && (
        <div>
          <Label>{t.reportNotes}</Label>
          <Input {...register('reportNotes')} placeholder="Brief result summary" />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : t.saveEntry}
        </Button>
      </div>
    </form>
  )
}
