'use client'

import { useState, useEffect } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginSchema, type LoginInput } from '@/lib/validations'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  // Clear any credentials from URL on component mount for security
  useEffect(() => {
    const hasCredentialsInUrl = searchParams.get('email') || searchParams.get('password')
    if (hasCredentialsInUrl) {
      // Clear the URL parameters immediately for security
      const url = new URL(window.location.href)
      url.searchParams.delete('email')
      url.searchParams.delete('password')
      window.history.replaceState({}, '', url.pathname)
      
      toast.error('Credentials should not be passed via URL for security reasons')
    }
  }, [searchParams])

  const handleLogin = async (data: LoginInput) => {
    setIsLoading(true)
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        toast.error('Invalid credentials')
      } else {
        toast.success('Login successful')
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error('An error occurred during login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-2xl font-bold text-blue-600">ZH</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Zawar Hospital
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Admission Management System
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(handleLogin)}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                className={errors.email ? 'border-red-500' : ''}
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                className={errors.password ? 'border-red-500' : ''}
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>
          
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-600">
              Default credentials: admin@hospital.com / admin123
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                const form = document.querySelector('form') as HTMLFormElement
                const emailInput = form?.querySelector('#email') as HTMLInputElement
                const passwordInput = form?.querySelector('#password') as HTMLInputElement
                if (emailInput && passwordInput) {
                  emailInput.value = 'admin@hospital.com'
                  passwordInput.value = 'admin123'
                  // Trigger form validation
                  emailInput.dispatchEvent(new Event('input', { bubbles: true }))
                  passwordInput.dispatchEvent(new Event('input', { bubbles: true }))
                }
              }}
            >
              Fill Default Credentials
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
