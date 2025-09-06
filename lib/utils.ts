import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
}

export const formatDate = (date: Date | string): string => {
  const d = new Date(date)
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export const formatTime = (time: string): string => {
  return time
}

export function formatTimeWithAmPm(time: string): string {
  if (!time) return ''
  
  // If time already has AM/PM, return as is
  if (time.toLowerCase().includes('am') || time.toLowerCase().includes('pm')) {
    return time
  }
  
  // Parse time in HH:MM format
  const [hours, minutes] = time.split(':').map(Number)
  
  if (isNaN(hours) || isNaN(minutes)) {
    return time // Return original if parsing fails
  }
  
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  const displayMinutes = minutes.toString().padStart(2, '0')
  
  return `${displayHours}:${displayMinutes} ${period}`
}

export const generateIPDNumber = (): string => {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
  return `IPD${year}${month}${day}${random}`
}
