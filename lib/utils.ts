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

/**
 * Formats an ISO 8601 datetime string to "DD/MM/YY h:MM AM/PM" for IPD display.
 * Parses the IST offset literally without UTC conversion.
 */
export const formatISTDateTime = (isoString: string): string => {
  if (!isoString) return ''
  // Strip timezone offset and parse as local
  const clean = isoString.replace(/[+-]\d{2}:\d{2}$/, '').replace('Z', '')
  const d = new Date(clean)
  if (isNaN(d.getTime())) return isoString
  const day = d.getDate()
  const month = d.getMonth() + 1
  const year = d.getFullYear().toString().slice(-2)
  const hours = d.getHours()
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const period = hours >= 12 ? 'PM' : 'AM'
  const h = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${day}/${month}/${year} ${h}:${minutes}${period}`
}

/**
 * Builds an ISO 8601 IST datetime string from separate date (YYYY-MM-DD) and
 * time (HH:MM) inputs.
 */
export const buildISTDateTime = (date: string, time: string): string => {
  return `${date}T${time}:00+05:30`
}

/**
 * Returns today's date as YYYY-MM-DD in IST (Asia/Kolkata).
 * Using IST prevents the date rolling back to yesterday after midnight IST but before midnight UTC.
 */
export const todayDate = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())

/**
 * Returns current time as HH:MM (24-hour).
 */
export const currentTime = (): string =>
  new Date().toLocaleTimeString('en-GB', { hour12: false }).slice(0, 5)

export const generateIPDNumber = (): string => {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
  return `IPD${year}${month}${day}${random}`
}
