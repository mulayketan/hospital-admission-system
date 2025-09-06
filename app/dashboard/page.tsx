'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { AdmissionForm } from '@/components/admission-form'
import { PatientList } from '@/components/patient-list'
import { UserManagement } from '@/components/user-management'
import { translations } from '@/lib/translations'
import { PatientInput } from '@/lib/validations'
import { LogOut, Users, FileText, UserPlus, Download, Globe } from 'lucide-react'

type TabType = 'admission' | 'patients' | 'users'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('admission')
  const [language, setLanguage] = useState<'en' | 'mr'>('en')

  const t = translations[language]

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
    }
  }, [session, status, router])

  const handlePatientSubmit = async (data: PatientInput) => {
    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to save patient')
      }

      toast.success(t.saveSuccess)
      // Redirect to Patient Records tab after successful save
      setActiveTab('patients')
    } catch (error) {
      toast.error(t.saveError)
      throw error
    }
  }

  const handlePatientSearch = async (query: string): Promise<PatientInput[]> => {
    try {
      const response = await fetch(`/api/patients?search=${encodeURIComponent(query)}`)
      if (!response.ok) {
        throw new Error('Failed to search patients')
      }
      const data = await response.json()
      return data.patients
    } catch (error) {
      toast.error('Error searching patients')
      return []
    }
  }

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' })
  }

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'mr' : 'en')
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img 
                  src="/images/zawar-hospital-logo.svg" 
                  alt="Zawar Hospital Logo" 
                  className="h-10 w-auto"
                />
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">
                  {t.hospitalName}
                </h1>
                <p className="text-sm text-gray-500">
                  Admission Management System
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleLanguage}
                className="flex items-center gap-2"
              >
                <Globe className="h-4 w-4" />
                {language === 'en' ? 'मराठी' : 'English'}
              </Button>
              
              <div className="flex items-center text-sm text-gray-700">
                <span>{session.user?.name}</span>
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  {session.user?.role}
                </span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                {t.logout}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('admission')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'admission'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                {t.registrationAdmission}
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('patients')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'patients'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Patient Records
              </div>
            </button>
            
            {session.user?.role === 'ADMIN' && (
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  User Management
                </div>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {activeTab === 'admission' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {t.registrationAdmission}
              </h2>
              <p className="text-gray-600">
                Add new patient admission or search existing patients
              </p>
            </div>
            <AdmissionForm
              language={language}
              onSubmit={handlePatientSubmit}
              onSearch={handlePatientSearch}
            />
          </div>
        )}

        {activeTab === 'patients' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Patient Records
              </h2>
              <p className="text-gray-600">
                View and manage patient information
              </p>
            </div>
            <PatientList language={language} />
          </div>
        )}

        {activeTab === 'users' && session.user?.role === 'ADMIN' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                User Management
              </h2>
              <p className="text-gray-600">
                Manage system users and permissions
              </p>
            </div>
            <UserManagement />
          </div>
        )}

      </main>
    </div>
  )
}
