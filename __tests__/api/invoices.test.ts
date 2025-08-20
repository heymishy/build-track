/**
 * Test Suite for Invoice API Endpoints
 * Testing PDF upload and parsing functionality
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/invoices/parse/route'
import { extractTextFromPDF, parseInvoiceFromText } from '@/lib/pdf-parser'

// Mock the PDF parser
jest.mock('@/lib/pdf-parser')

const mockExtractTextFromPDF = extractTextFromPDF as jest.MockedFunction<typeof extractTextFromPDF>
const mockParseInvoiceFromText = parseInvoiceFromText as jest.MockedFunction<
  typeof parseInvoiceFromText
>

describe('/api/invoices/parse', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should parse a valid PDF invoice successfully', async () => {
    // Mock PDF text extraction
    const mockText = `INVOICE
Invoice #: INV-2024-001
Date: 2024-01-15
Bill To: ABC Construction Ltd
Description: Concrete work
Amount: $15,000.00
Tax: $1,500.00
Total: $16,500.00`

    mockExtractTextFromPDF.mockResolvedValue(mockText)
    mockParseInvoiceFromText.mockReturnValue({
      invoiceNumber: 'INV-2024-001',
      date: '2024-01-15',
      vendorName: 'ABC Construction Ltd',
      description: 'Concrete work',
      amount: 15000,
      tax: 1500,
      total: 16500,
      lineItems: [],
    })

    // Create a mock PDF file
    const pdfBuffer = Buffer.from('mock-pdf-data')
    const formData = new FormData()
    const file = new File([pdfBuffer], 'invoice.pdf', { type: 'application/pdf' })
    formData.append('file', file)

    const request = new NextRequest('http://localhost:3000/api/invoices/parse', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.invoice).toEqual({
      invoiceNumber: 'INV-2024-001',
      date: '2024-01-15',
      vendorName: 'ABC Construction Ltd',
      description: 'Concrete work',
      amount: 15000,
      tax: 1500,
      total: 16500,
      lineItems: [],
    })
  })

  it('should handle missing file error', async () => {
    const formData = new FormData()
    const request = new NextRequest('http://localhost:3000/api/invoices/parse', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('No file uploaded')
  })

  it('should handle invalid file type error', async () => {
    const textBuffer = Buffer.from('not a pdf file')
    const formData = new FormData()
    const file = new File([textBuffer], 'document.txt', { type: 'text/plain' })
    formData.append('file', file)

    const request = new NextRequest('http://localhost:3000/api/invoices/parse', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Invalid file type. Only PDF files are allowed.')
  })

  it('should handle PDF parsing errors gracefully', async () => {
    mockExtractTextFromPDF.mockRejectedValue(new Error('Invalid PDF format'))

    const pdfBuffer = Buffer.from('corrupted-pdf-data')
    const formData = new FormData()
    const file = new File([pdfBuffer], 'corrupted.pdf', { type: 'application/pdf' })
    formData.append('file', file)

    const request = new NextRequest('http://localhost:3000/api/invoices/parse', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to parse PDF: Invalid PDF format')
  })

  it('should handle large files appropriately', async () => {
    // Create a large buffer (over 10MB)
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024, 'a') // 11MB
    const formData = new FormData()
    const file = new File([largeBuffer], 'large.pdf', { type: 'application/pdf' })
    formData.append('file', file)

    const request = new NextRequest('http://localhost:3000/api/invoices/parse', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(413)
    expect(data.success).toBe(false)
    expect(data.error).toBe('File too large. Maximum size is 10MB.')
  })

  it('should handle text extraction with no parseable invoice data', async () => {
    const mockText = 'This is just some random text with no invoice information'

    mockExtractTextFromPDF.mockResolvedValue(mockText)
    mockParseInvoiceFromText.mockReturnValue({
      invoiceNumber: null,
      date: null,
      vendorName: null,
      description: null,
      amount: null,
      tax: null,
      total: null,
      lineItems: [],
    })

    const pdfBuffer = Buffer.from('mock-pdf-data')
    const formData = new FormData()
    const file = new File([pdfBuffer], 'random.pdf', { type: 'application/pdf' })
    formData.append('file', file)

    const request = new NextRequest('http://localhost:3000/api/invoices/parse', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.invoice.invoiceNumber).toBeNull()
    expect(data.warning).toBe('PDF processed but no clear invoice data found')
  })
})
