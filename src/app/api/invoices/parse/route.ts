/**
 * API Route: /api/invoices/parse
 * Handles PDF invoice upload and parsing
 */

import { NextRequest, NextResponse } from 'next/server'
import { extractTextFromPDF, parseInvoiceFromText } from '@/lib/pdf-parser'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPE = 'application/pdf'

export async function POST(request: NextRequest) {
  console.log('PDF parse API called')
  const startMemory = process.memoryUsage()
  console.log('Initial memory usage:', {
    rss: Math.round(startMemory.rss / 1024 / 1024) + 'MB',
    heapUsed: Math.round(startMemory.heapUsed / 1024 / 1024) + 'MB'
  })
  
  try {
    // Parse the form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    console.log('File received:', file?.name, 'Size:', file?.size)
    
    // Validate file presence
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Validate file type
    if (file.type !== ALLOWED_FILE_TYPE) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only PDF files are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 10MB.' },
        { status: 413 }
      )
    }

    // Convert file to buffer
    console.log('Converting file to buffer...')
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    const bufferMemory = process.memoryUsage()
    console.log('After buffer conversion:', {
      rss: Math.round(bufferMemory.rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(bufferMemory.heapUsed / 1024 / 1024) + 'MB'
    })

    // Extract text from PDF
    let extractedText: string
    try {
      console.log('Starting PDF text extraction...')
      extractedText = await extractTextFromPDF(buffer)
      console.log('PDF text extracted, length:', extractedText.length)
    } catch (error) {
      console.error('PDF extraction error:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}` 
        },
        { status: 500 }
      )
    }

    // Parse invoice data from text
    const parsedInvoice = parseInvoiceFromText(extractedText)

    // Check if we found meaningful invoice data
    const hasInvoiceData = (
      parsedInvoice.invoiceNumber ||
      parsedInvoice.total ||
      parsedInvoice.amount ||
      parsedInvoice.vendorName
    )

    const response = {
      success: true,
      invoice: parsedInvoice,
      extractedText: extractedText, // Include for debugging purposes
      filename: file.name,
      fileSize: file.size
    }

    // Add warning if no clear invoice data was found
    if (!hasInvoiceData) {
      return NextResponse.json({
        ...response,
        warning: 'PDF processed but no clear invoice data found'
      })
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Invoice parsing API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed. Use POST to upload a PDF file.' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed. Use POST to upload a PDF file.' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed. Use POST to upload a PDF file.' },
    { status: 405 }
  )
}