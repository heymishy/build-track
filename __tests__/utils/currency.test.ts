import { formatNZD, parseNZD, formatPercentage, calculateVariance } from '@/lib/currency'

describe('Currency Utils', () => {
  describe('formatNZD', () => {
    it('should format numbers as NZD currency', () => {
      expect(formatNZD(1000)).toBe('$1,000.00')
      expect(formatNZD(1234.56)).toBe('$1,234.56')
      expect(formatNZD(0)).toBe('$0.00')
    })

    it('should format string numbers as NZD currency', () => {
      expect(formatNZD('1000')).toBe('$1,000.00')
      expect(formatNZD('1234.56')).toBe('$1,234.56')
    })
  })

  describe('parseNZD', () => {
    it('should parse formatted currency back to numbers', () => {
      expect(parseNZD('$1,000.00')).toBe(1000)
      expect(parseNZD('$1,234.56')).toBe(1234.56)
      expect(parseNZD('1000')).toBe(1000)
    })

    it('should handle malformed input', () => {
      expect(parseNZD('invalid')).toBe(0)
      expect(parseNZD('')).toBe(0)
    })
  })

  describe('formatPercentage', () => {
    it('should format percentages correctly', () => {
      expect(formatPercentage(10)).toBe('10.0%')
      expect(formatPercentage(5.5)).toBe('5.5%')
      expect(formatPercentage(0)).toBe('0.0%')
    })
  })

  describe('calculateVariance', () => {
    it('should calculate positive variance (over budget)', () => {
      const result = calculateVariance(1100, 1000)
      expect(result.amount).toBe(100)
      expect(result.percentage).toBe(10)
      expect(result.status).toBe('over')
    })

    it('should calculate negative variance (under budget)', () => {
      const result = calculateVariance(900, 1000)
      expect(result.amount).toBe(-100)
      expect(result.percentage).toBe(-10)
      expect(result.status).toBe('under')
    })

    it('should identify on-track status', () => {
      const result = calculateVariance(1010, 1000)
      expect(result.percentage).toBe(1)
      expect(result.status).toBe('on-track')
    })

    it('should handle zero estimated values', () => {
      const result = calculateVariance(100, 0)
      expect(result.percentage).toBe(0)
    })
  })
})
