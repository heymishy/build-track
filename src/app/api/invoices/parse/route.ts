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
      // Get the user's project for database saving
      const userProject = await prisma.project.findFirst({
        where: {
          users: {
            some: { userId: user.id },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      console.error(`💾 Found project for user: ${userProject?.name} (ID: ${userProject?.id})`)

      // Call parseMultipleInvoices with database saving enabled
      result = await parseMultipleInvoices(buffer, user.id, true, userProject?.id)
      console.error('PDF parsing completed:', result.summary)

      // Log quality metrics for monitoring
      if (result.qualityMetrics) {
        const metrics = result.qualityMetrics
        console.error('📊 QUALITY METRICS:', {
          overallAccuracy: `${(metrics.overallAccuracy * 100).toFixed(1)}%`,
          extractionQuality: `${(metrics.extractionQuality * 100).toFixed(1)}%`,
          parsingSuccess: `${(metrics.parsingSuccess * 100).toFixed(1)}%`,
          dataCompleteness: `${(metrics.dataCompleteness * 100).toFixed(1)}%`,
          corruptionDetected: metrics.corruptionDetected,
          issuesFound: metrics.issuesFound.length,
          recommendedAction: metrics.recommendedAction || 'None',
        })

        // Log individual invoice quality scores
        result.invoices.forEach((invoice, index) => {
          if (invoice.validationScore !== undefined) {
            console.error(
              `📄 Invoice ${index + 1} quality: ${(invoice.validationScore * 100).toFixed(1)}% (${invoice.invoiceNumber || 'No number'})`
            )
          }
        })

        // Log warning if quality is poor
        if (metrics.overallAccuracy < 0.6) {
          console.warn(
            `⚠️ LOW QUALITY EXTRACTION: ${(metrics.overallAccuracy * 100).toFixed(1)}% accuracy`
          )
          console.warn(`⚠️ Issues found: ${metrics.issuesFound.join(', ')}`)
        }

        // Log success if quality is excellent
        if (metrics.overallAccuracy >= 0.8 && !metrics.corruptionDetected) {
          console.log(
            `✅ HIGH QUALITY EXTRACTION: ${(metrics.overallAccuracy * 100).toFixed(1)}% accuracy, no corruption`
          )
        }
      }

      // Update summary to reflect database saving and quality
      let enhancedSummary = `Found and saved ${result.totalInvoices} invoice(s) to your project. Total amount: $${result.totalAmount.toFixed(2)}`

      if (result.qualityMetrics) {
        const accuracy = Math.round(result.qualityMetrics.overallAccuracy * 100)
        if (accuracy >= 80) {
          enhancedSummary += ` ✅ Quality: ${accuracy}%`
        } else if (accuracy >= 60) {
          enhancedSummary += ` ⚠️ Quality: ${accuracy}%`
        } else {
          enhancedSummary += ` ❌ Quality: ${accuracy}% - Please review`
        }
      }

      result.summary = enhancedSummary
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

    // Add warnings based on quality and parsing results
    const warnings: string[] = []

    if (result.totalInvoices === 0) {
      warnings.push(
        'PDF processed but no invoices found. Please check if the PDF contains valid invoice data.'
      )
    }

    if (result.qualityMetrics) {
      const metrics = result.qualityMetrics

      if (metrics.overallAccuracy < 0.4) {
        warnings.push(
          'Very low extraction quality detected. Consider manual processing or using a different PDF.'
        )
      } else if (metrics.overallAccuracy < 0.6) {
        warnings.push(
          'Low extraction quality detected. Please review all extracted data carefully.'
        )
      }

      if (metrics.corruptionDetected) {
        warnings.push('Text corruption detected in PDF. Some data may be inaccurate.')
      }

      if (metrics.dataCompleteness < 0.7) {
        warnings.push('Incomplete data extraction. Some invoice fields may be missing.')
      }

      if (metrics.recommendedAction) {
        warnings.push(`Recommendation: ${metrics.recommendedAction}`)
      }
    }

    const responseWithWarnings = {
      ...response,
      ...(warnings.length > 0 && { warnings }),
    }

    return NextResponse.json(responseWithWarnings)
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
