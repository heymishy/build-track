/**
 * API Route: /api/estimates/parse
 * Preview estimate parsing without saving to database
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import {
  parseEstimateFromCSV,
  parseEstimateFromXLSX,
  parseEstimateFromPDF,
} from '@/lib/estimate-parser'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/pdf',
]

async function POST(request: NextRequest, user: AuthUser) {
  try {
    console.log('Estimate parse (preview) API called')

    // Parse the form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    // Validate file presence
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file uploaded',
        },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type. Only CSV, Excel (.xlsx, .xls), and PDF files are allowed.',
        },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: 'File too large. Maximum size is 10MB.',
        },
        { status: 413 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Parse estimate based on file type
    try {
      let parsedEstimate

      if (file.type === 'text/csv') {
        const csvContent = buffer.toString('utf-8')
        parsedEstimate = await parseEstimateFromCSV(csvContent, file.name)
      } else if (file.type.includes('spreadsheet') || file.type.includes('excel')) {
        parsedEstimate = await parseEstimateFromXLSX(buffer, file.name)
      } else if (file.type === 'application/pdf') {
        parsedEstimate = await parseEstimateFromPDF(buffer, file.name, user.id)
      } else {
        throw new Error('Unsupported file type')
      }

      return NextResponse.json({
        success: true,
        estimate: parsedEstimate,
        preview: true,
      })
    } catch (error) {
      console.error('Estimate parsing error:', error)
      return NextResponse.json(
        {
          success: false,
          error: `Failed to parse estimate file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Estimate parse API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}

// Apply authentication middleware
const protectedPOST = withAuth(POST, {
  resource: 'projects',
  action: 'read',
  requireAuth: true,
})

export { protectedPOST as POST }
