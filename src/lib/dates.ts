/**
 * Date utilities for construction project tracking
 */

export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-NZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj)
}

export const formatDateLong = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-NZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(dateObj)
}

export const getDaysFromToday = (date: Date | string): number => {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  targetDate.setHours(0, 0, 0, 0)

  const diffTime = targetDate.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export const getWeekNumber = (date: Date = new Date()): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export const getDateStatus = (
  targetDate: Date | string
): {
  status: 'overdue' | 'due-soon' | 'upcoming' | 'completed'
  daysFromNow: number
} => {
  const daysFromNow = getDaysFromToday(targetDate)

  let status: 'overdue' | 'due-soon' | 'upcoming' | 'completed'
  if (daysFromNow < 0) status = 'overdue'
  else if (daysFromNow <= 7) status = 'due-soon'
  else status = 'upcoming'

  return { status, daysFromNow }
}

export const addBusinessDays = (startDate: Date, days: number): Date => {
  const result = new Date(startDate)
  let addedDays = 0

  while (addedDays < days) {
    result.setDate(result.getDate() + 1)
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      addedDays++
    }
  }

  return result
}
