'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { translations } from '@/lib/translations'
import { buildISTDateTime, todayDate, currentTime } from '@/lib/utils'
import type { ProgressReportEntry, SelectedPatient } from '@/lib/ipd-types'

// Form-specific schema (date + time separate inputs)
const formSchema = z.object({
  date: z.string().min(1, 'Date required'),
  time: z.string().min(1, 'Time required'),
  doctorNotes: z.string().min(1, 'Notes are required'),
  treatment: z.string().optional(),
  staffName: z.string().min(1, 'Staff name required'),
  doctorSignature: z.string().min(1, 'Signing doctor required'),
})
type FormValues = z.infer<typeof formSchema>

interface ClinicalNoteFormProps {
  patient: SelectedPatient
  language: 'en' | 'mr'
  editingEntry?: ProgressReportEntry | null
  onSaved: () => void
  onCancel: () => void
  /** Opens Drug Orders tab from parent (IPD panel). */
  onManageDrugOrders?: () => void
}

export const ClinicalNoteForm = ({
  patient,
  language,
  editingEntry,
  onSaved,
  onCancel,
  onManageDrugOrders,
}: ClinicalNoteFormProps) => {
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
      doctorNotes: '',
      treatment: '',
      staffName: '',
      doctorSignature: 'Dr. Rahul Zawar',
    },
  })

  useEffect(() => {
    if (editingEntry) {
      const dt = editingEntry.dateTime.replace(/[+-]\d{2}:\d{2}$/, '').replace('Z', '')
      const d = new Date(dt)
      reset({
        date: d.toISOString().split('T')[0],
        time: d.toTimeString().slice(0, 5),
        doctorNotes: editingEntry.doctorNotes,
        treatment: editingEntry.treatment ?? '',
        staffName: editingEntry.staffName,
        doctorSignature: editingEntry.doctorSignature || 'Dr. Rahul Zawar',
      })
    }
  }, [editingEntry, reset])

  const onSubmit = async (values: FormValues) => {
    const dateTime = buildISTDateTime(values.date, values.time)
    const body = {
      patientId: patient.id,
      ipdNo: patient.ipdNo && patient.ipdNo.length > 0 ? patient.ipdNo : 'UNKNOWN',
      dateTime,
      doctorNotes: values.doctorNotes,
      treatment: values.treatment || undefined,
      staffName: values.staffName,
      doctorSignature: values.doctorSignature,
    }

    const url = editingEntry
      ? `/api/ipd/progress-report/${editingEntry.id}`
      : '/api/ipd/progress-report'
    const method = editingEntry ? 'PUT' : 'POST'

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
        {editingEntry ? t.editEntry : t.addClinicalNote}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Date</Label>
          <Input type="date" {...register('date')} className={errors.date ? 'border-red-500' : ''} />
          {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
        </div>
        <div>
          <Label>Time</Label>
          <Input type="time" {...register('time')} className={errors.time ? 'border-red-500' : ''} />
          {errors.time && <p className="text-red-500 text-xs mt-1">{errors.time.message}</p>}
        </div>
      </div>

      <div>
        <Label>{t.doctorNotes}</Label>
        <textarea
          data-gramm="false"
          data-gramm_editor="false"
          {...register('doctorNotes')}
          rows={3}
          className={`w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 ${
            errors.doctorNotes ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="C/O complaints, O/E findings..."
        />
        {errors.doctorNotes && (
          <p className="text-red-500 text-xs mt-1">{errors.doctorNotes.message}</p>
        )}
      </div>

      <div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
          <div>
            <Label>{t.treatment}</Label>
            <p className="text-xs text-gray-500 mt-0.5 max-w-prose">{t.treatmentAdditionalNotes}</p>
          </div>
          {onManageDrugOrders && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 self-start"
              onClick={onManageDrugOrders}
            >
              {t.addManageDrugOrders}
            </Button>
          )}
        </div>
        <textarea
          data-gramm="false"
          data-gramm_editor="false"
          {...register('treatment')}
          rows={2}
          className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Other instructions, procedures, or context…"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t.staffName}</Label>
          <Input
            {...register('staffName')}
            placeholder="Staff name"
            className={errors.staffName ? 'border-red-500' : ''}
          />
          {errors.staffName && (
            <p className="text-red-500 text-xs mt-1">{errors.staffName.message}</p>
          )}
        </div>
        <div>
          <Label>Signing Doctor</Label>
          <Select {...register('doctorSignature')} defaultValue="Dr. Rahul Zawar">
            <SelectTrigger className={errors.doctorSignature ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select doctor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Dr. Rahul Zawar">Dr. Rahul Zawar</SelectItem>
              <SelectItem value="Dr. Ajinkya Deshmukh">Dr. Ajinkya Deshmukh</SelectItem>
            </SelectContent>
          </Select>
          {errors.doctorSignature && (
            <p className="text-red-500 text-xs mt-1">{errors.doctorSignature.message}</p>
          )}
        </div>
      </div>

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
