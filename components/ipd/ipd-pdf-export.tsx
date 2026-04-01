'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { translations } from '@/lib/translations'
import type { SelectedPatient } from '@/lib/ipd-types'
import { Download, FileText } from 'lucide-react'

type FormType = 'progress-report' | 'nursing-notes' | 'nursing-chart' | 'drug-orders'

interface IpdPdfExportProps {
  patient: SelectedPatient
  language: 'en' | 'mr'
}

export const IpdPdfExport = ({ patient, language }: IpdPdfExportProps) => {
  const t = translations[language]
  const [downloading, setDownloading] = useState<string | null>(null)

  const fullName = [patient.firstName, patient.middleName, patient.surname]
    .filter(Boolean)
    .join(' ')

  const downloadPdf = async (form?: FormType) => {
    const key = form ?? 'combined'
    setDownloading(key)
    try {
      const url = form
        ? `/api/patients/${patient.id}/ipd-pdf?form=${form}`
        : `/api/patients/${patient.id}/ipd-pdf`

      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to generate PDF')

      const blob = await res.blob()
      const objectUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = objectUrl
      a.download = form
        ? `${form}-${patient.ipdNo ?? patient.id}.pdf`
        : `ipd-complete-${patient.ipdNo ?? patient.id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(objectUrl)
      document.body.removeChild(a)
      toast.success('PDF generated successfully')
    } catch {
      toast.error('Error generating PDF')
    } finally {
      setDownloading(null)
    }
  }

  const PdfButton = ({
    form,
    label,
    description,
  }: {
    form?: FormType
    label: string
    description?: string
  }) => {
    const key = form ?? 'combined'
    const isLoading = downloading === key
    return (
      <button
        onClick={() => downloadPdf(form)}
        disabled={!!downloading}
        className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
          form
            ? 'border-gray-200 hover:bg-blue-50 hover:border-blue-300'
            : 'border-blue-300 bg-blue-50 hover:bg-blue-100 font-semibold'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 shrink-0" />
        ) : (
          <Download className={`h-5 w-5 shrink-0 ${form ? 'text-gray-500' : 'text-blue-600'}`} />
        )}
        <div>
          <div className={form ? 'text-sm text-gray-800' : 'text-sm text-blue-700'}>{label}</div>
          {description && (
            <div className="text-xs text-gray-400 mt-0.5">{description}</div>
          )}
        </div>
      </button>
    )
  }

  return (
    <div className="max-w-lg">
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-500" />
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">{t.exportIpdDocs}</h3>
            <p className="text-xs text-gray-500">{fullName}</p>
          </div>
        </div>
        <div className="p-4 space-y-2">
          <PdfButton
            form="progress-report"
            label={t.progressReportPdf}
            description={t.progressReportPdfDesc}
          />
          <PdfButton form="nursing-notes" label={t.nursingNotesPdf} />
          <PdfButton form="nursing-chart" label={t.nursingChartPdf} />
          <PdfButton form="drug-orders" label={t.drugOrderPdf} />

          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            Drug Order PDF shows up to 21 calendar days (7 pages, 3 date columns per page).
            For stays longer than 21 days, add a new drug row with a later start date — see §4.6.1.
          </p>

          <div className="border-t border-gray-200 pt-2">
            <PdfButton label={`↓ ${t.combinedPdf}`} />
          </div>
        </div>
      </div>
    </div>
  )
}
