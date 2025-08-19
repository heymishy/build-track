/**
 * Currency formatting utilities for NZ Dollar
 */

export const formatNZD = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount

  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount)
}

export const parseNZD = (formatted: string): number => {
  // Remove currency symbol, spaces, and commas
  const cleaned = formatted.replace(/[^0-9.-]/g, '')
  return parseFloat(cleaned) || 0
}

export const formatPercentage = (value: number): string => {
  return new Intl.NumberFormat('en-NZ', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100)
}

export const calculateVariance = (
  actual: number,
  estimated: number
): {
  amount: number
  percentage: number
  status: 'under' | 'over' | 'on-track'
} => {
  const amount = actual - estimated
  const percentage = estimated > 0 ? (amount / estimated) * 100 : 0

  let status: 'under' | 'over' | 'on-track' = 'on-track'
  if (percentage < -2) status = 'under'
  else if (percentage > 2) status = 'over'

  return { amount, percentage, status }
}
