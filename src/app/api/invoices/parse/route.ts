/**
 * API Route: /api/invoices/parse
 * Handles PDF invoice upload and parsing
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { parseMultipleInvoices } from '@/lib/pdf-parser'
import { prisma } from '@/lib/prisma'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPE = 'application/pdf'
// const CACHE_BUST = Date.now() // Force rebuild: 1725070756000

async function POST(request: NextRequest, user: AuthUser) {
  console.error('🚀🚀🚀 PDF parse API called - ENHANCED LOGGING ACTIVE 🚀🚀🚀')
  const startMemory = process.memoryUsage()
  console.error('Initial memory usage:', {
    rss: Math.round(startMemory.rss / 1024 / 1024) + 'MB',
    heapUsed: Math.round(startMemory.heapUsed / 1024 / 1024) + 'MB',
  })

  try {
    // Parse the form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    console.log('File received:', file?.name, 'Size:', file?.size)

    // Validate file presence
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 })
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
      heapUsed: Math.round(bufferMemory.heapUsed / 1024 / 1024) + 'MB',
    })

    // Parse multiple invoices from PDF
    let result
    try {
      console.error('🚀 API ROUTE: Starting PDF multi-invoice parsing with enhanced logging...')
      console.error('DEBUG: parseMultipleInvoices function type:', typeof parseMultipleInvoices)
      result = await parseMultipleInvoices(buffer, user.id)
      console.error('PDF parsing completed:', result.summary)
      
      // Save parsed invoices to database
      if (result.invoices && result.invoices.length > 0) {
        console.error(`💾 Saving ${result.invoices.length} parsed invoices to database`)
        
        // Get the user's default project (or the first project)
        const userProject = await prisma.project.findFirst({
          where: {
            users: {
              some: { userId: user.id }
            }
          },
          orderBy: { createdAt: 'desc' }
        })
        
        console.error(`💾 Found project for user: ${userProject?.name} (ID: ${userProject?.id})`)
        
        // Save each parsed invoice
        let savedCount = 0
        for (const parsedInvoice of result.invoices) {
          try {
            const invoiceData = {
              number: parsedInvoice.invoiceNumber || `AUTO-${Date.now()}-${savedCount + 1}`,
              supplierName: parsedInvoice.vendorName || 'Unknown Supplier',
              totalAmount: parsedInvoice.total || parsedInvoice.amount || 0,
              taxAmount: parsedInvoice.tax || 0,
              invoiceDate: parsedInvoice.date ? new Date(parsedInvoice.date) : new Date(),
              description: parsedInvoice.description || 'Parsed from PDF',
              status: 'PENDING' as const,
              userId: user.id,
              projectId: userProject?.id || null,
              rawText: parsedInvoice.rawText?.substring(0, 5000) || '', // Limit text size
            }
            
            const savedInvoice = await prisma.invoice.create({
              data: invoiceData
            })
            
            console.error(`💾 Saved invoice: ${savedInvoice.id} - ${invoiceData.supplierName} - $${invoiceData.totalAmount}`)
            savedCount++
            
          } catch (saveError) {
            console.error(`💾 Failed to save parsed invoice:`, saveError)
          }
        }
        
        console.error(`💾 Successfully saved ${savedCount}/${result.invoices.length} invoices to database`)
        result.summary = `Found and saved ${savedCount} invoice(s) to your project. Total amount: $${result.totalAmount.toFixed(2)}`
      }
      
    } catch (error) {
      console.error('PDF parsing error:', error)
      return NextResponse.json(
        {
          success: false,
          error: `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
        { status: 500 }
      )
    }

    const response = {
      success: true,
      result,
      filename: file.name,
      fileSize: file.size,
    }

    // Add warning if no invoices were found
    if (result.totalInvoices === 0) {
      return NextResponse.json({
        ...response,
        warning:
          'PDF processed but no invoices found. Please check if the PDF contains valid invoice data.',
      })
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Invoice parsing API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
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

// Apply authentication middleware
const protectedPOST = withAuth(POST, {
  resource: 'invoices',
  action: 'create',
  requireAuth: true,
})

export { protectedPOST as POST }
