'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PatientContextBanner } from './ipd/patient-context-banner'
import { ProgressReportView } from './ipd/progress-report-view'
import { NursingNotesView } from './ipd/nursing-notes-view'
import { NursingChartView } from './ipd/nursing-chart-view'
import { DrugOrderView } from './ipd/drug-order-view'
import { AdviceView } from './ipd/advice-view'
import { IpdPdfExport } from './ipd/ipd-pdf-export'
import { translations } from '@/lib/translations'
import type { SelectedPatient } from '@/lib/ipd-types'
import { Search } from 'lucide-react'

type IpdSubTab =
  | 'progress-report'
  | 'nursing-notes'
  | 'nursing-chart'
  | 'drug-orders'
  | 'advice'
  | 'export'

interface IpdTreatmentPanelProps {
  selectedPatient: SelectedPatient | null
  onSelectPatient: (patient: SelectedPatient | null) => void
  language: 'en' | 'mr'
}

// Extend patient for list results
interface PatientResult {
  id: string
  ipdNo: string | null
  uhidNo: string | null
  firstName: string
  middleName: string | null
  surname: string
  age: number
  sex: 'M' | 'F'
  ward: string
  treatingDoctor: string | null
  bedNo: string | null
  phoneNo: string
  address: string
}

export const IpdTreatmentPanel = ({
  selectedPatient,
  onSelectPatient,
  language,
}: IpdTreatmentPanelProps) => {
  const t = translations[language]
  const [activeSubTab, setActiveSubTab] = useState<IpdSubTab>('progress-report')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PatientResult[]>([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Reset sub-tab when patient changes
  useEffect(() => {
    setActiveSubTab('progress-report')
  }, [selectedPatient?.id])

  const searchPatients = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([])
      setHasSearched(false)
      return
    }
    setSearching(true)
    setHasSearched(true)
    try {
      const res = await fetch(
        `/api/patients?search=${encodeURIComponent(query.trim())}&limit=10`
      )
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSearchResults(data.patients ?? [])
    } catch {
      toast.error('Error searching patients')
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    const id = setTimeout(() => searchPatients(searchQuery), 400)
    return () => clearTimeout(id)
  }, [searchQuery, searchPatients])

  const SUB_TABS: { key: IpdSubTab; label: string }[] = [
    { key: 'progress-report', label: t.progressReport },
    { key: 'nursing-notes',   label: t.nursingNotes },
    { key: 'nursing-chart',   label: t.nursingChart },
    { key: 'drug-orders',     label: t.drugOrders },
    { key: 'advice',          label: t.advice },
    { key: 'export',          label: t.exportPdf },
  ]

  // ─── Patient search view ───────────────────────────────────────────────────
  if (!selectedPatient) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t.ipdTreatment}</h2>
          <p className="text-gray-500 text-sm mt-1">{t.ipdTreatmentDesc}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          <div className="relative">
            <Label className="sr-only">Search patients</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, phone, IPD number..."
                className="pl-10"
              />
            </div>
          </div>

          {searching && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          )}

          {!searching && hasSearched && searchResults.length === 0 && (
            <p className="text-center text-gray-400 py-4 text-sm">No patients found.</p>
          )}

          {!searching && searchResults.length > 0 && (
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
              {searchResults.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div>
                    <div className="font-medium text-gray-800 text-sm">
                      {[p.firstName, p.middleName, p.surname].filter(Boolean).join(' ')}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      IPD: {p.ipdNo ?? 'N/A'} · UHID: {p.uhidNo ?? 'N/A'} · Age: {p.age} ·{' '}
                      {p.sex === 'M' ? t.male : t.female} · {p.phoneNo}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() =>
                      onSelectPatient({
                        id: p.id,
                        ipdNo: p.ipdNo,
                        uhidNo: p.uhidNo,
                        firstName: p.firstName,
                        middleName: p.middleName,
                        surname: p.surname,
                        age: p.age,
                        sex: p.sex,
                        ward: p.ward,
                        treatingDoctor: p.treatingDoctor,
                        bedNo: p.bedNo,
                      })
                    }
                    className="text-xs"
                  >
                    {t.openIpd}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {!hasSearched && (
            <div className="text-center py-8">
              <Search className="mx-auto h-10 w-10 text-gray-300 mb-3" />
              <p className="text-gray-400 text-sm">
                Search for a patient to begin the IPD treatment workflow.
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Treatment panel (patient selected) ───────────────────────────────────
  return (
    <div className="space-y-4">
      <PatientContextBanner
        patient={selectedPatient}
        language={language}
        onChangePatient={() => {
          onSelectPatient(null)
          setSearchQuery('')
          setSearchResults([])
          setHasSearched(false)
        }}
      />

      {/* Sub-tab navigation */}
      <div className="bg-white border-b border-gray-200 -mx-0 rounded-t-lg overflow-hidden">
        <nav className="flex overflow-x-auto">
          {SUB_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeSubTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Sub-tab content */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {activeSubTab === 'progress-report' && (
          <ProgressReportView patient={selectedPatient} language={language} />
        )}
        {activeSubTab === 'nursing-notes' && (
          <NursingNotesView patient={selectedPatient} language={language} />
        )}
        {activeSubTab === 'nursing-chart' && (
          <NursingChartView patient={selectedPatient} language={language} />
        )}
        {activeSubTab === 'drug-orders' && (
          <DrugOrderView patient={selectedPatient} language={language} />
        )}
        {activeSubTab === 'advice' && (
          <AdviceView patient={selectedPatient} language={language} />
        )}
        {activeSubTab === 'export' && (
          <IpdPdfExport patient={selectedPatient} language={language} />
        )}
      </div>
    </div>
  )
}
