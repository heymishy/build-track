/**
 * Test Suite for PDF Parser Utility
 * Testing PDF text extraction and invoice data parsing
 */

import { extractTextFromPDF, parseInvoiceFromText } from '@/lib/pdf-parser'

// Mock pdf-parse at the module level
jest.mock('pdf-parse', () => {
  return jest.fn()
})

describe('PDF Parser', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('extractTextFromPDF', () => {
    it('should extract text from a valid PDF buffer', async () => {
      const mockPDFBuffer = Buffer.from('mock-pdf-data')
      const mockPdfParse = require('pdf-parse')
      
      const expectedText = `INVOICE
Invoice #: INV-2024-001
Date: 2024-01-15
Bill To: ABC Construction Ltd
Description: Concrete work phase 1
Amount: $15,000.00
Tax: $1,500.00
Total: $16,500.00`

      mockPdfParse.mockResolvedValue({
        text: expectedText
      })

      const extractedText = await extractTextFromPDF(mockPDFBuffer)
      
      expect(extractedText).toContain('INVOICE')
      expect(extractedText).toContain('INV-2024-001')
      expect(extractedText).toContain('$16,500.00')
    })

    it('should handle PDF parsing errors gracefully', async () => {
      const mockPDFBuffer = Buffer.from('invalid-pdf-data')
      const mockPdfParse = require('pdf-parse')
      
      mockPdfParse.mockRejectedValue(new Error('Invalid PDF format'))

      await expect(extractTextFromPDF(mockPDFBuffer)).rejects.toThrow('Invalid PDF format')
    })
  })

  describe('parseInvoiceFromText', () => {
    it('should parse basic invoice information from text', () => {
      const invoiceText = `INVOICE
Invoice #: INV-2024-001
Date: 2024-01-15
Bill To: ABC Construction Ltd
Description: Concrete work phase 1
Amount: $15,000.00
Tax: $1,500.00
Total: $16,500.00`

      const parsedInvoice = parseInvoiceFromText(invoiceText)

      expect(parsedInvoice).toEqual({
        invoiceNumber: 'INV-2024-001',
        date: '2024-01-15',
        vendorName: 'ABC Construction Ltd',
        description: 'Concrete work phase 1',
        amount: 15000,
        tax: 1500,
        total: 16500,
        lineItems: expect.any(Array)
      })
    })

    it('should parse line items from detailed invoices', () => {
      const invoiceText = `INVOICE
Invoice #: INV-2024-002
Date: 2024-01-20
Bill To: XYZ Contractors

Item 1: Steel beams - Qty: 10 - $500.00 each - $5,000.00
Item 2: Labor costs - 40 hours - $50.00/hour - $2,000.00
Item 3: Equipment rental - 5 days - $200.00/day - $1,000.00

Subtotal: $8,000.00
Tax (10%): $800.00
Total: $8,800.00`

      const parsedInvoice = parseInvoiceFromText(invoiceText)

      expect(parsedInvoice.lineItems).toHaveLength(3)
      expect(parsedInvoice.lineItems[0]).toEqual({
        description: 'Steel beams',
        quantity: 10,
        unitPrice: 500,
        total: 5000
      })
      expect(parsedInvoice.lineItems[1]).toEqual({
        description: 'Labor costs',
        quantity: 40,
        unitPrice: 50,
        total: 2000
      })
      expect(parsedInvoice.total).toBe(8800)
    })

    it('should handle New Zealand dollar amounts correctly', () => {
      const invoiceText = `TAX INVOICE
Invoice Number: NZ-INV-001
Date: 15/01/2024
To: Wellington Construction Co.

Subtotal: NZ$12,500.00
GST (15%): NZ$1,875.00
Total Amount: NZ$14,375.00`

      const parsedInvoice = parseInvoiceFromText(invoiceText)

      expect(parsedInvoice.amount).toBe(12500)
      expect(parsedInvoice.tax).toBe(1875)
      expect(parsedInvoice.total).toBe(14375)
      expect(parsedInvoice.invoiceNumber).toBe('NZ-INV-001')
    })

    it('should extract vendor information from various formats', () => {
      const invoiceText = `INVOICE
Invoice: 12345
Date: 01/15/2024
From: Premium Building Supplies Ltd
Address: 123 Queen Street, Auckland

Materials delivered to site
Total: $5,500.00`

      const parsedInvoice = parseInvoiceFromText(invoiceText)
      expect(parsedInvoice.vendorName).toBe('Premium Building Supplies Ltd')
    })

    it('should handle missing or incomplete information gracefully', () => {
      const incompleteText = `Some random document
Amount mentioned: $1,000
No clear structure here`

      const parsedInvoice = parseInvoiceFromText(incompleteText)

      expect(parsedInvoice.invoiceNumber).toBeNull()
      expect(parsedInvoice.vendorName).toBeNull()
      expect(parsedInvoice.total).toBeNull()
      expect(parsedInvoice.lineItems).toEqual([])
    })

    it('should parse dates in various formats', () => {
      const testCases = [
        { text: 'Date: 2024-01-15', expected: '2024-01-15' },
        { text: 'Date: 15/01/2024', expected: '2024-01-15' },
      ]

      testCases.forEach(({ text, expected }) => {
        const invoiceText = `INVOICE\nInvoice #: TEST-001\n${text}\nTotal: $100.00`
        const parsed = parseInvoiceFromText(invoiceText)
        expect(parsed.date).toBe(expected)
      })
    })
  })
})