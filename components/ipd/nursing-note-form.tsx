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
import type { NursingNote, SelectedPatient } from '@/lib/ipd-types'

const formSchema = z.object({
  date: z.string().min(1, 'Date required'),
  time: z.string().min(1, 'Time required'),
  notes: z.string().min(1, 'Notes are required'),
  treatment: z.string().optional(),
  staffName: z.string().min(1, 'Staff name required'),
  isHandover: z.boolean().default(false),
})
type FormValues = z.infer<typeof formSchema>

interface NursingNoteFormProps {
  patient: SelectedPatient
  language: 'en' | 'mr'
  editingNote?: NursingNote | null
  onSaved: () => void
  onCancel: () => void
}

export const NursingNoteForm = ({
  patient,
  language,
  editingNote,
  onSaved,
  onCancel,
}: NursingNoteFormProps) => {
  const t = translations[language]

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: todayDate(),
      time: currentTime(),
      notes: '',
      treatment: '',
      staffName: '',
      isHandover: false,
    },
  })

  useEffect(() => {
    if (editingNote) {
      const dt = editingNote.dateTime.replace(/[+-]\d{2}:\d{2}$/, '').replace('Z', '')
      const d = new Date(dt)
      reset({
        date: d.toISOString().split('T')[0],
        time: d.toTimeString().slice(0, 5),
        notes: editingNote.notes,
        treatment: editingNote.treatment ?? '',
        staffName: editingNote.staffName,
        isHandover: editingNote.isHandover,
      })
    }
  }, [editingNote, reset])

  const onSubmit = async (values: FormValues) => {
    const dateTime = buildISTDateTime(values.date, values.time)
    const body = {
      patientId: patient.id,
      ipdNo: patient.ipdNo ?? '',
      dateTime,
      notes: values.notes,
      treatment: values.treatment || undefined,
      staffName: values.staffName,
      isHandover: values.isHandover,
    }

    const url = editingNote
      ? `/api/ipd/nursing-notes/${editingNote.id}`
      : '/api/ipd/nursing-notes'
    const method = editingNote ? 'PUT' : 'POST'

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
        {editingNote ? t.editEntry : t.addNursingNote}
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
        <Label>{t.notes}</Label>
        <textarea
          {...register('notes')}
          rows={3}
          className={`w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 ${
            errors.notes ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="What was done/given..."
        />
        {errors.notes && <p className="text-red-500 text-xs mt-1">{errors.notes.message}</p>}
      </div>

      <div>
        <Label>{t.treatmentGiven}</Label>
        <textarea
          {...register('treatment')}
          rows={2}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Additional treatment given..."
        />
      </div>

      <div className="flex items-center gap-6">
        <div className="flex-1">
          <Label>{t.staffName}</Label>
          <Input
            {...register('staffName')}
            placeholder="Nurse name"
            className={errors.staffName ? 'border-red-500' : ''}
          />
          {errors.staffName && (
            <p className="text-red-500 text-xs mt-1">{errors.staffName.message}</p>
          )}
        </div>
        <div className="flex items-center gap-2 mt-5">
          <input
            type="checkbox"
            id="isHandover"
            {...register('isHandover')}
            className="rounded h-4 w-4"
          />
          <Label htmlFor="isHandover" className="cursor-pointer">
            {t.isHandover}
          </Label>
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
