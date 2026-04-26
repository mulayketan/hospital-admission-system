'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { InvestigationSelect } from './investigation-select'
import { translations } from '@/lib/translations'
import { buildISTDateTime, todayDate, currentTime } from '@/lib/utils'
import {
  INVESTIGATION_CATEGORIES,
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

  const [selectedInvestigations, setSelectedInvestigations] = useState<string[]>([])
  const [investigationError, setInvestigationError] = useState<string>('')
  const [submitError, setSubmitError] = useState<string>('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: todayDate(),
      time: currentTime(),
      category: 'Blood Test',
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
        reportNotes: editingAdvice.reportNotes ?? '',
      })
      setSelectedInvestigations(
        editingAdvice.investigationName
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      )
    }
  }, [editingAdvice, reset])

  const onSubmit = async (values: FormValues) => {
    if (selectedInvestigations.length === 0) {
      setInvestigationError('At least one investigation is required')
      return
    }
    setInvestigationError('')

    const body = {
      patientId: patient.id,
      ipdNo: patient.ipdNo ?? '',
      dateTime: buildISTDateTime(values.date, values.time),
      category: values.category,
      investigationName: selectedInvestigations.join(', '),
      advisedBy: patient.treatingDoctor || undefined,
      reportNotes: values.reportNotes || undefined,
    }

    const url = editingAdvice ? `/api/ipd/advice/${editingAdvice.id}` : '/api/ipd/advice'
    const method = editingAdvice ? 'PUT' : 'POST'

    setSubmitError('')
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg = data?.error ?? 'Failed to save entry'
        setSubmitError(msg)
        toast.error(msg)
        return
      }
      onSaved()
    } catch {
      const msg = 'Network error — please try again'
      setSubmitError(msg)
      toast.error(msg)
    }
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

      {/* Category + multi-select investigations */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t.category}</Label>
          <Select
            value={selectedCategory}
            onValueChange={(v) => {
              setValue('category', v as FormValues['category'])
              setSelectedInvestigations([])
              setInvestigationError('')
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
            multiple
            values={selectedInvestigations}
            onMultiChange={(names) => {
              setSelectedInvestigations(names)
              if (names.length > 0) setInvestigationError('')
            }}
            category={selectedCategory as InvestigationCategory}
            label={t.investigationName}
            error={investigationError}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t.advisedBy}</Label>
          <Input value={patient.treatingDoctor || ''} disabled placeholder="Treating doctor" />
        </div>
        <div />
      </div>

      <div>
        <Label>{t.reportNotes}</Label>
        <Input {...register('reportNotes')} placeholder="Brief result summary" />
      </div>

      {submitError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {submitError}
        </p>
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
