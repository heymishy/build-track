/**
 * API Route: /api/invoices/parse-v2
 * NEW endpoint to bypass Vercel caching issues
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { parseMultipleInvoices } from '@/lib/pdf-parser'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPE = 'application/pdf'

async function POST(request: NextRequest, user: AuthUser) {
  console.error('🚀🚀🚀 NEW PARSE-V2 API CALLED - CACHE BYPASS ACTIVE 🚀🚀🚀')
  console.error('Current timestamp:', new Date().toISOString())

  try {
    // Parse the form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    console.error('File received via V2 API:', file?.name, 'Size:', file?.size)

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
    console.error('V2 API: Converting file to buffer...')
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Parse multiple invoices from PDF
    let result
    try {
      console.error('🎯 V2 API: Starting PDF multi-invoice parsing...')
      result = await parseMultipleInvoices(buffer, user.id)
      console.error('🎯 V2 API: PDF parsing completed:', result.summary)
    } catch (error) {
      console.error('V2 API: PDF parsing error:', error)
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
      apiVersion: 'v2',
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
    console.error('V2 Invoice parsing API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        apiVersion: 'v2',
      },
      { status: 500 }
    )
  }
}

// Apply authentication middleware
const protectedPOST = withAuth(POST, {
  resource: 'invoices',
  action: 'create',
  requireAuth: true,
})

export { protectedPOST as POST }
