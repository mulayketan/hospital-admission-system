'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { WorkingMarathiInput } from '@/components/ui/working-marathi-input'
import { patientFormSchema, patientSchema, type PatientFormInput, type PatientInput } from '@/lib/validations'
import { translations } from '@/lib/translations'
import { convertFullNameToMarathi } from '@/lib/name-converter'

interface AdmissionFormProps {
  language: 'en' | 'mr'
  onSubmit: (data: PatientInput) => Promise<void>
  initialData?: Partial<PatientInput>
  onSearch?: (query: string) => Promise<PatientInput[]>
}

interface WardCharges {
  id: string
  wardType: string
  bedCharges: number
  doctorCharges: number
  nursingCharges: number
  asstDoctorCharges: number
  totalPerDay: number
  monitorCharges?: number
  o2Charges?: number
  syringePumpCharges?: number
  bloodTransfusionCharges?: number
  visitingCharges?: number
}

const wardDisplayNames: Record<string, string> = {
  'GENERAL': 'General',
  'SEMI': 'Semi',
  'SPECIAL_WITHOUT_AC': 'Special without AC',
  'SPECIAL_WITH_AC_DELUXE': 'Special with AC (Deluxe)',
  'ICU': 'ICU'
}

export const AdmissionForm = ({ language, onSubmit, initialData, onSearch }: AdmissionFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PatientInput[]>([])
  const [selectedWard, setSelectedWard] = useState<string>('GENERAL')
  const [wardCharges, setWardCharges] = useState<WardCharges[]>([])
  const [isLoadingCharges, setIsLoadingCharges] = useState(true)
  const [tpaList, setTpaList] = useState<Array<{id: string, name: string}>>([])
  const [insuranceCompanies, setInsuranceCompanies] = useState<Array<{id: string, name: string}>>([])
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true)
  
  const t = translations[language]

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<PatientFormInput>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      ipdNo: initialData?.ipdNo || '',
      firstName: initialData?.firstName || '',
      middleName: initialData?.middleName || null,
      surname: initialData?.surname || '',
      firstNameMarathi: initialData?.firstNameMarathi || '',
      middleNameMarathi: initialData?.middleNameMarathi || null,
      surnameMarathi: initialData?.surnameMarathi || '',
      nearestRelativeName: initialData?.nearestRelativeName || '',
      relationToPatient: initialData?.relationToPatient || '',
      address: initialData?.address || '',
      phoneNo: initialData?.phoneNo || '',
      age: initialData?.age || 0,
      sex: initialData?.sex || 'M',
      ward: initialData?.ward || 'GENERAL',
      cashless: initialData?.cashless || false,
      tpa: initialData?.tpa || null,
      insuranceCompany: initialData?.insuranceCompany || null,
      other: initialData?.other || null,
      admittedByDoctor: initialData?.admittedByDoctor || '',
      dateOfAdmission: initialData?.dateOfAdmission ? 
        (typeof initialData.dateOfAdmission === 'string' ? initialData.dateOfAdmission : new Date(initialData.dateOfAdmission).toISOString().split('T')[0]) : 
        new Date().toISOString().split('T')[0],
      timeOfAdmission: initialData?.timeOfAdmission || new Date().toLocaleTimeString('en-GB', { hour12: false }).slice(0, 5),
      treatingDoctor: initialData?.treatingDoctor || null,
      dateOfDischarge: initialData?.dateOfDischarge ? 
        (typeof initialData.dateOfDischarge === 'string' ? initialData.dateOfDischarge : new Date(initialData.dateOfDischarge).toISOString().split('T')[0]) : 
        undefined,
      timeOfDischarge: initialData?.timeOfDischarge || null,
    }
  })

  // Fetch ward charges from database
  useEffect(() => {
    const fetchWardCharges = async () => {
      try {
        const response = await fetch('/api/ward-charges')
        if (!response.ok) {
          throw new Error('Failed to fetch ward charges')
        }
        const data = await response.json()
        setWardCharges(data.wardCharges)
      } catch (error) {
        console.error('Error fetching ward charges:', error)
        toast.error('Failed to load ward charges')
      } finally {
        setIsLoadingCharges(false)
      }
    }

    fetchWardCharges()
  }, [])

  // Fetch TPA and Insurance Company data
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [tpaResponse, insuranceResponse] = await Promise.all([
          fetch('/api/tpa'),
          fetch('/api/insurance-companies')
        ])

        if (tpaResponse.ok) {
          const tpaData = await tpaResponse.json()
          setTpaList(tpaData.tpaList || [])
        }

        if (insuranceResponse.ok) {
          const insuranceData = await insuranceResponse.json()
          setInsuranceCompanies(insuranceData.insuranceCompanies || [])
        }
      } catch (error) {
        console.error('Error fetching dropdown data:', error)
        toast.error('Failed to load TPA and Insurance data')
      } finally {
        setIsLoadingDropdowns(false)
      }
    }

    fetchDropdownData()
  }, [])

  // Auto-convert English names to Marathi
  const firstName = watch('firstName')
  const middleName = watch('middleName')
  const surname = watch('surname')

  useEffect(() => {
    if (firstName || middleName || surname) {
      const marathiNames = convertFullNameToMarathi(firstName, middleName || '', surname)
      // Only set if the Marathi fields are empty (don't overwrite user input)
      const currentFirstMarathi = watch('firstNameMarathi')
      const currentMiddleMarathi = watch('middleNameMarathi')
      const currentSurnameMarathi = watch('surnameMarathi')
      
      if (!currentFirstMarathi && marathiNames.firstNameMarathi) {
        setValue('firstNameMarathi', marathiNames.firstNameMarathi)
      }
      if (!currentMiddleMarathi && marathiNames.middleNameMarathi) {
        setValue('middleNameMarathi', marathiNames.middleNameMarathi)
      }
      if (!currentSurnameMarathi && marathiNames.surnameMarathi) {
        setValue('surnameMarathi', marathiNames.surnameMarathi)
      }
    }
  }, [firstName, middleName, surname, setValue, watch])

  const handleSearchPatient = async (query: string) => {
    if (!onSearch || query.length < 2) {
      setSearchResults([])
      return
    }

    try {
      const results = await onSearch(query)
      setSearchResults(results)
    } catch (error) {
      toast.error(t.saveError)
    }
  }

  const handleSelectPatient = (patient: PatientInput) => {
    // Convert PatientInput to PatientFormInput for the form
    const formData: PatientFormInput = {
      ...patient,
      dateOfAdmission: typeof patient.dateOfAdmission === 'string' ? patient.dateOfAdmission : new Date(patient.dateOfAdmission).toISOString().split('T')[0],
      dateOfDischarge: patient.dateOfDischarge ? 
        (typeof patient.dateOfDischarge === 'string' ? patient.dateOfDischarge : new Date(patient.dateOfDischarge).toISOString().split('T')[0]) : 
        undefined,
    }
    reset(formData)
    setSearchResults([])
    setSearchQuery('')
  }

  const handleFormSubmit = async (data: PatientFormInput) => {
    setIsSubmitting(true)
    try {
      // Convert form data back to PatientInput for API
      const apiData = patientSchema.parse(data)
      await onSubmit(apiData)
      // Success message is handled by parent component
      reset()
    } catch (error) {
      toast.error(t.saveError)
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentCharges = wardCharges.find(wc => wc.wardType === selectedWard)

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg">
      {/* Header */}
      <div className="text-center mb-6 border-2 border-black p-4">
        <div className="flex items-center justify-center gap-4 mb-2">
          <img 
            src="/images/zh-logo.svg" 
            alt="ZH Hospital Logo" 
            className="h-12 w-auto"
          />
          <h1 className="text-2xl font-bold">{t.hospitalName}</h1>
        </div>
        <div className="bg-black text-white px-4 py-2 inline-block rounded">
          {t.registrationAdmission}
        </div>
        <div className="mt-2 text-right">
          <span className="border border-black px-2 py-1">
            {t.ipdNo}: {watch('ipdNo') || '___________'}
          </span>
        </div>
      </div>

      {/* Search Section */}
      {onSearch && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <Label htmlFor="search" className="text-sm font-medium mb-2 block">
            {t.search} {t.patientName}
          </Label>
          <div className="flex gap-2">
            <Input
              id="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                handleSearchPatient(e.target.value)
              }}
              placeholder="Search by name, phone, or IPD number..."
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearchQuery('')
                setSearchResults([])
                reset()
              }}
            >
              {t.clear}
            </Button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-md max-h-48 overflow-y-auto">
              {searchResults.map((patient, index) => (
                <div
                  key={index}
                  className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                  onClick={() => handleSelectPatient(patient)}
                >
                  <div className="font-medium">
                    {patient.firstName} {patient.middleName} {patient.surname}
                  </div>
                  <div className="text-sm text-gray-600">
                    {patient.phoneNo} • Age: {patient.age} • {patient.address}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* IPD Number */}
        <div className="p-4 border border-gray-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="ipdNo">{t.ipdNo}</Label>
              <Input
                id="ipdNo"
                {...register('ipdNo')}
                className={errors.ipdNo ? 'border-red-500' : ''}
                placeholder="Enter IPD Number"
              />
              {errors.ipdNo && (
                <p className="text-red-500 text-sm mt-1">{errors.ipdNo.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-300">
          <div>
            <Label htmlFor="firstName">{t.firstName}</Label>
            <Input
              id="firstName"
              {...register('firstName')}
              className={errors.firstName ? 'border-red-500' : ''}
            />
            {errors.firstName && (
              <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="middleName">{t.middleName}</Label>
            <Input
              id="middleName"
              {...register('middleName')}
            />
          </div>

          <div>
            <Label htmlFor="surname">{t.surname}</Label>
            <Input
              id="surname"
              {...register('surname')}
              className={errors.surname ? 'border-red-500' : ''}
            />
            {errors.surname && (
              <p className="text-red-500 text-sm mt-1">{errors.surname.message}</p>
            )}
          </div>

          {/* Marathi Name Fields */}
          <div>
            <Label htmlFor="firstNameMarathi">First Name (मराठी)</Label>
            <WorkingMarathiInput
              id="firstNameMarathi"
              {...register('firstNameMarathi')}
              placeholder=""
              onValueChange={(value) => setValue('firstNameMarathi', value)}
            />
          </div>

          <div>
            <Label htmlFor="middleNameMarathi">Middle Name (मराठी)</Label>
            <WorkingMarathiInput
              id="middleNameMarathi"
              {...register('middleNameMarathi')}
              placeholder=""
              onValueChange={(value) => setValue('middleNameMarathi', value)}
            />
          </div>

          <div>
            <Label htmlFor="surnameMarathi">Surname (मराठी)</Label>
            <WorkingMarathiInput
              id="surnameMarathi"
              {...register('surnameMarathi')}
              placeholder=""
              onValueChange={(value) => setValue('surnameMarathi', value)}
            />
          </div>

          <div>
            <Label htmlFor="nearestRelativeName">{t.nearestRelative}</Label>
            <Input
              id="nearestRelativeName"
              {...register('nearestRelativeName')}
              className={errors.nearestRelativeName ? 'border-red-500' : ''}
            />
            {errors.nearestRelativeName && (
              <p className="text-red-500 text-sm mt-1">{errors.nearestRelativeName.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="relationToPatient">{t.relationToPatient}</Label>
            <Input
              id="relationToPatient"
              {...register('relationToPatient')}
              className={errors.relationToPatient ? 'border-red-500' : ''}
            />
            {errors.relationToPatient && (
              <p className="text-red-500 text-sm mt-1">{errors.relationToPatient.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="phoneNo">{t.phoneNo}</Label>
            <Input
              id="phoneNo"
              {...register('phoneNo')}
              className={errors.phoneNo ? 'border-red-500' : ''}
            />
            {errors.phoneNo && (
              <p className="text-red-500 text-sm mt-1">{errors.phoneNo.message}</p>
            )}
          </div>

          <div className="md:col-span-3">
            <Label htmlFor="address">{t.address}</Label>
            <Input
              id="address"
              {...register('address')}
              className={errors.address ? 'border-red-500' : ''}
            />
            {errors.address && (
              <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="age">{t.age}</Label>
            <Input
              id="age"
              type="number"
              {...register('age', { valueAsNumber: true })}
              className={errors.age ? 'border-red-500' : ''}
            />
            {errors.age && (
              <p className="text-red-500 text-sm mt-1">{errors.age.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="sex">{t.sex}</Label>
            <Select onValueChange={(value) => setValue('sex', value as 'M' | 'F')}>
              <SelectTrigger className={errors.sex ? 'border-red-500' : ''}>
                <SelectValue placeholder={`${t.sex} : ${t.male} / ${t.female}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">{t.male}</SelectItem>
                <SelectItem value="F">{t.female}</SelectItem>
              </SelectContent>
            </Select>
            {errors.sex && (
              <p className="text-red-500 text-sm mt-1">{errors.sex.message}</p>
            )}
          </div>
        </div>

        {/* Ward Information */}
        <div className="p-4 border border-gray-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="ward">{t.ward}</Label>
              <Select onValueChange={(value) => {
                setValue('ward', value as 'GENERAL' | 'SEMI' | 'SPECIAL_WITHOUT_AC' | 'SPECIAL_WITH_AC_DELUXE' | 'ICU')
                setSelectedWard(value)
              }}>
                <SelectTrigger className={errors.ward ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select ward type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">{t.generalWard}</SelectItem>
                  <SelectItem value="SEMI">{t.semiPrivate}</SelectItem>
                  <SelectItem value="SPECIAL_WITHOUT_AC">{t.specialWithoutAC}</SelectItem>
                  <SelectItem value="SPECIAL_WITH_AC_DELUXE">{t.specialWithAC}</SelectItem>
                  <SelectItem value="ICU">{t.icu}</SelectItem>
                </SelectContent>
              </Select>
              {errors.ward && (
                <p className="text-red-500 text-sm mt-1">{errors.ward.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cashless"
                {...register('cashless')}
                className="rounded"
              />
              <Label htmlFor="cashless">{t.cashless}</Label>
            </div>
          </div>

          {/* TPA and Insurance Company fields - shown only when cashless is selected */}
          {watch('cashless') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="tpa">TPA *</Label>
                <Select onValueChange={(value) => setValue('tpa', value)}>
                  <SelectTrigger className={errors.tpa ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select TPA" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingDropdowns ? (
                      <SelectItem value="loading" disabled>Loading TPAs...</SelectItem>
                    ) : (
                      tpaList.map((tpa) => (
                        <SelectItem key={tpa.id} value={tpa.name}>
                          {tpa.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.tpa && (
                  <p className="text-red-500 text-sm mt-1">{errors.tpa.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="insuranceCompany">Insurance Company *</Label>
                <Select onValueChange={(value) => setValue('insuranceCompany', value)}>
                  <SelectTrigger className={errors.insuranceCompany ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select Insurance Company" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingDropdowns ? (
                      <SelectItem value="loading-insurance" disabled>Loading Insurance Companies...</SelectItem>
                    ) : (
                      insuranceCompanies.map((company) => (
                        <SelectItem key={company.id} value={company.name}>
                          {company.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.insuranceCompany && (
                  <p className="text-red-500 text-sm mt-1">{errors.insuranceCompany.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Other field */}
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div>
              <Label htmlFor="other">{t.other}</Label>
              <Input
                id="other"
                {...register('other')}
              />
            </div>
          </div>

          {/* Charges Table */}
          <div className="border border-gray-400">
            <div className="bg-gray-100 p-2 text-center font-bold border-b border-gray-400">
              {t.payeeSlip}
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-400 p-2 text-left">{t.srNo}</th>
                  <th className="border border-gray-400 p-2 text-left">{t.ward}</th>
                  <th className="border border-gray-400 p-2 text-left">{t.bedCharges}</th>
                  <th className="border border-gray-400 p-2 text-left">{t.doctorCharges}</th>
                  <th className="border border-gray-400 p-2 text-left">{t.nursingCharges}</th>
                  <th className="border border-gray-400 p-2 text-left">{t.asstDoctor}</th>
                  <th className="border border-gray-400 p-2 text-left">{t.totalPerDay}</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingCharges ? (
                  <tr>
                    <td colSpan={7} className="border border-gray-400 p-2 text-center">
                      Loading ward charges...
                    </td>
                  </tr>
                ) : currentCharges ? (
                  <tr>
                    <td className="border border-gray-400 p-2">1</td>
                    <td className="border border-gray-400 p-2">{wardDisplayNames[selectedWard] || selectedWard}</td>
                    <td className="border border-gray-400 p-2">{currentCharges.bedCharges}</td>
                    <td className="border border-gray-400 p-2">{currentCharges.doctorCharges}</td>
                    <td className="border border-gray-400 p-2">{currentCharges.nursingCharges}</td>
                    <td className="border border-gray-400 p-2">{currentCharges.asstDoctorCharges}</td>
                    <td className="border border-gray-400 p-2">{currentCharges.totalPerDay}/day</td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={7} className="border border-gray-400 p-2 text-center">
                      No charges found for selected ward
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="p-2 border-t border-gray-400">
              <div className="flex justify-between mb-1">
                <span>{t.monitor}- {currentCharges?.monitorCharges || 0}/day</span>
                <span>{t.o2}- {currentCharges?.o2Charges || 0}/day</span>
              </div>
              <div className="flex justify-between">
                <span>Syringe Pump- {currentCharges?.syringePumpCharges || 0}/day</span>
                <span>Blood Transfusion- {currentCharges?.bloodTransfusionCharges || 0}/day</span>
              </div>
              <div className="text-center mt-1">
                <span>Visiting Charges- {currentCharges?.visitingCharges || 0}/day</span>
              </div>
            </div>
          </div>
        </div>

        {/* Admission Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-gray-300">
          <div>
            <Label htmlFor="admittedByDoctor">{t.admittedByDoctor}</Label>
            <Input
              id="admittedByDoctor"
              {...register('admittedByDoctor')}
              className={errors.admittedByDoctor ? 'border-red-500' : ''}
            />
            {errors.admittedByDoctor && (
              <p className="text-red-500 text-sm mt-1">{errors.admittedByDoctor.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="treatingDoctor">{t.treatingDoctor}</Label>
            <Input
              id="treatingDoctor"
              {...register('treatingDoctor')}
            />
          </div>

          <div>
            <Label htmlFor="dateOfAdmission">{t.dateOfAdmission}</Label>
            <Input
              id="dateOfAdmission"
              type="date"
              max={new Date().toISOString().split('T')[0]}
              {...register('dateOfAdmission')}
              className={errors.dateOfAdmission ? 'border-red-500' : ''}
            />
            {errors.dateOfAdmission && (
              <p className="text-red-500 text-sm mt-1">{errors.dateOfAdmission.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="timeOfAdmission">{t.time}</Label>
            <Input
              id="timeOfAdmission"
              type="time"
              {...register('timeOfAdmission')}
              className={errors.timeOfAdmission ? 'border-red-500' : ''}
            />
            {errors.timeOfAdmission && (
              <p className="text-red-500 text-sm mt-1">{errors.timeOfAdmission.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="dateOfDischarge">{t.dateOfDischarge}</Label>
            <Input
              id="dateOfDischarge"
              type="date"
              max={new Date().toISOString().split('T')[0]}
              min={watch('dateOfAdmission')?.toString().split('T')[0] || undefined}
              {...register('dateOfDischarge')}
              className={errors.dateOfDischarge ? 'border-red-500' : ''}
            />
            {errors.dateOfDischarge && (
              <p className="text-red-500 text-sm mt-1">{errors.dateOfDischarge.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="timeOfDischarge">{t.time}</Label>
            <Input
              id="timeOfDischarge"
              type="time"
              {...register('timeOfDischarge')}
              className={errors.timeOfDischarge ? 'border-red-500' : ''}
            />
            {errors.timeOfDischarge && (
              <p className="text-red-500 text-sm mt-1">{errors.timeOfDischarge.message}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => reset()}
          >
            {t.clear}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? 'Saving...' : t.save}
          </Button>
        </div>
      </form>
    </div>
  )
}
