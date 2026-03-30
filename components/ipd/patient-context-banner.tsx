'use client'

import { Button } from '@/components/ui/button'
import { WARD_DISPLAY_NAMES, type SelectedPatient } from '@/lib/ipd-types'
import { translations } from '@/lib/translations'
import { UserCircle } from 'lucide-react'

interface PatientContextBannerProps {
  patient: SelectedPatient
  language: 'en' | 'mr'
  onChangePatient: () => void
}

export const PatientContextBanner = ({
  patient,
  language,
  onChangePatient,
}: PatientContextBannerProps) => {
  const t = translations[language]
  const fullName = [patient.firstName, patient.middleName, patient.surname]
    .filter(Boolean)
    .join(' ')
  const wardLabel = WARD_DISPLAY_NAMES[patient.ward] ?? patient.ward

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <UserCircle className="h-10 w-10 text-blue-400 shrink-0" />
          <div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="text-base font-semibold text-gray-900">{fullName}</span>
              {patient.ipdNo && (
                <span className="text-sm text-gray-600">
                  <span className="font-medium">IPD:</span> {patient.ipdNo}
                </span>
              )}
              {patient.uhidNo && (
                <span className="text-sm text-gray-600">
                  <span className="font-medium">UHID:</span> {patient.uhidNo}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-0.5 text-sm text-gray-600">
              <span>
                <span className="font-medium">{t.age}:</span> {patient.age}
              </span>
              <span>
                <span className="font-medium">{t.sex}:</span>{' '}
                {patient.sex === 'M' ? t.male : t.female}
              </span>
              <span>
                <span className="font-medium">{t.ward}:</span> {wardLabel}
              </span>
              {patient.bedNo && (
                <span>
                  <span className="font-medium">{t.bedNo}:</span> {patient.bedNo}
                </span>
              )}
              {patient.treatingDoctor && (
                <span>
                  <span className="font-medium">Dr.</span> {patient.treatingDoctor}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onChangePatient}
          className="shrink-0 text-blue-700 border-blue-300 hover:bg-blue-100"
        >
          {t.changePatient}
        </Button>
      </div>
    </div>
  )
}
