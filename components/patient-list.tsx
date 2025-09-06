'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { translations } from '@/lib/translations'
import { formatDate } from '@/lib/utils'
import { Search, Download, Edit, Trash2, Eye, FileText } from 'lucide-react'

interface Patient {
  id: string
  ipdNo: string | null
  firstName: string
  middleName: string | null
  surname: string
  phoneNo: string
  age: number
  sex: 'M' | 'F'
  address: string
  dateOfAdmission: string
  admissions: any[]
  createdAt: string
}

interface PatientListProps {
  language: 'en' | 'mr'
}

export const PatientList = ({ language }: PatientListProps) => {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [hasSearched, setHasSearched] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null)
  
  const t = translations[language]

  const fetchPatients = async (page = 1, search = '') => {
    // Only fetch if there's a search query
    if (!search.trim()) {
      setPatients([])
      setTotalPages(1)
      setCurrentPage(1)
      setHasSearched(false)
      return
    }

    setLoading(true)
    setHasSearched(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search: search.trim()
      })

      const response = await fetch(`/api/patients?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch patients')
      }

      const data = await response.json()
      setPatients(data.patients)
      setTotalPages(data.pagination.totalPages)
      setCurrentPage(data.pagination.page)
    } catch (error) {
      toast.error('Error fetching patients')
    } finally {
      setLoading(false)
    }
  }

  // Debounced search effect
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const timeoutId = setTimeout(() => {
        setCurrentPage(1)
        fetchPatients(1, searchQuery)
      }, 500) // 500ms delay

      return () => clearTimeout(timeoutId)
    } else if (searchQuery.trim().length === 0) {
      setPatients([])
      setHasSearched(false)
    }
  }, [searchQuery])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim().length >= 2) {
      setCurrentPage(1)
      fetchPatients(1, searchQuery)
    }
  }

  const handleDeletePatient = async (patientId: string) => {
    if (!confirm('Are you sure you want to delete this patient?')) {
      return
    }

    try {
      const response = await fetch(`/api/patients/${patientId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete patient')
      }

      toast.success(t.deleteSuccess)
      fetchPatients(currentPage, searchQuery)
    } catch (error) {
      toast.error(t.deleteError)
    }
  }

  const handleDownloadPDF = async (patientId: string) => {
    setDownloadingPdf(patientId)
    try {
      const response = await fetch(`/api/patients/${patientId}/pdf`)
      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `admission-form-${patientId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('PDF generated successfully')
    } catch (error) {
      toast.error('Error generating PDF')
    } finally {
      setDownloadingPdf(null)
    }
  }

  const handlePageChange = (page: number) => {
    fetchPatients(page, searchQuery)
  }

  // Remove the global loading state since we'll handle it inline

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="search" className="sr-only">
              Search patients
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="search"
                type="text"
                placeholder="Search by name, phone, IPD number... (min 2 characters)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Searching...' : t.search}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSearchQuery('')
              setCurrentPage(1)
              setPatients([])
              setHasSearched(false)
            }}
          >
            {t.clear}
          </Button>
        </form>
      </div>

      {/* Patient Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admission Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {patients.map((patient) => (
                <tr key={patient.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {patient.firstName} {patient.middleName} {patient.surname}
                        </div>
                        <div className="text-sm text-gray-500">
                          IPD: {patient.ipdNo || 'N/A'} • Age: {patient.age} • {patient.sex === 'M' ? t.male : t.female}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{patient.phoneNo}</div>
                    <div className="text-sm text-gray-500 max-w-xs truncate">
                      {patient.address}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(patient.dateOfAdmission)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {patient.admissions.length} admission(s)
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPDF(patient.id)}
                        disabled={downloadingPdf === patient.id}
                        className="flex items-center gap-1"
                      >
                        {downloadingPdf === patient.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        {downloadingPdf === patient.id ? 'Generating...' : 'PDF'}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePatient(patient.id)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-3 w-3" />
                        {t.delete}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Searching patients...</span>
          </div>
        )}

        {!loading && !hasSearched && (
          <div className="text-center py-12">
            <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg font-medium">Search for Patients</p>
            <p className="text-gray-400 text-sm mt-2">
              Enter patient name, phone number, or IPD number to find patient records
            </p>
          </div>
        )}

        {!loading && hasSearched && patients.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg font-medium">No patients found</p>
            <p className="text-gray-400 text-sm mt-2">
              Try searching with different keywords
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
