/**
 * API Route: /api/invoices/export/google-sheets
 * Export invoices to Google Sheets
 */

import { NextRequest } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { googleSheetsService, formatInvoiceForExport, expandInvoiceLineItems } from '@/lib/google-sheets'

interface ExportRequest {
  projectId?: string
  status?: string[]
  dateFrom?: string
  dateTo?: string
  includeLineItems?: boolean
  spreadsheetTitle?: string
}

async function POST(request: NextRequest, user: AuthUser) {
  try {
    if (!googleSheetsService.isAvailable()) {
      return Response.json(
        { 
          success: false, 
          error: 'Google Sheets API not configured. Please contact administrator to set up Google Sheets integration.' 
        },
        { status: 503 }
      )
    }

    const body: ExportRequest = await request.json()
    const { 
      projectId, 
      status = ['PENDING', 'APPROVED', 'PAID'], 
      dateFrom, 
      dateTo,
      includeLineItems = false,
      spreadsheetTitle
    } = body

    // Build query filters
    const whereClause: any = {
      AND: [],
    }

    // User access control
    if (user.role !== 'ADMIN') {
      whereClause.AND.push({
        project: {
          users: {
            some: { userId: user.id }
          }
        }
      })
    }

    // Project filter
    if (projectId && projectId !== 'all') {
      whereClause.AND.push({ projectId })
    }

    // Status filter
    if (status.length > 0) {
      whereClause.AND.push({ status: { in: status } })
    }

    // Date filters
    if (dateFrom) {
      whereClause.AND.push({
        invoiceDate: { gte: new Date(dateFrom) }
      })
    }

    if (dateTo) {
      whereClause.AND.push({
        invoiceDate: { lte: new Date(dateTo) }
      })
    }

    // Fetch invoices with related data
    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          }
        },
        lineItems: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
      },
      orderBy: [
        { invoiceDate: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    if (invoices.length === 0) {
      return Response.json({
        success: false,
        error: 'No invoices found matching the specified criteria'
      })
    }

    // Transform data for export
    let exportData
    if (includeLineItems) {
      exportData = invoices.flatMap(invoice => expandInvoiceLineItems(invoice))
    } else {
      exportData = invoices.map(invoice => formatInvoiceForExport(invoice))
    }

    // Generate spreadsheet title
    const title = spreadsheetTitle || `BuildTrack Invoice Export - ${new Date().toLocaleDateString('en-NZ')}`

    try {
      // Create new spreadsheet
      const spreadsheetId = await googleSheetsService.createSpreadsheet(title)
      if (!spreadsheetId) {
        throw new Error('Failed to create spreadsheet')
      }

      // Export data to the spreadsheet
      await googleSheetsService.exportInvoicesToSheet(spreadsheetId, exportData)

      // Get the spreadsheet URL
      const spreadsheetUrl = await googleSheetsService.getSpreadsheetUrl(spreadsheetId)

      return Response.json({
        success: true,
        message: `Successfully exported ${exportData.length} invoice${exportData.length === 1 ? '' : 's'} to Google Sheets`,
        data: {
          spreadsheetId,
          spreadsheetUrl,
          totalInvoices: invoices.length,
          totalRows: exportData.length,
          exportedAt: new Date().toISOString(),
          filters: {
            projectId: projectId || 'all',
            status,
            dateFrom,
            dateTo,
            includeLineItems,
          }
        }
      })

    } catch (sheetsError: any) {
      console.error('Google Sheets export error:', sheetsError)
      
      let errorMessage = 'Failed to export to Google Sheets. Please try again or contact support.'
      let statusCode = 500
      
      if (sheetsError.name === 'PermissionError' || sheetsError.code === 403) {
        errorMessage = 'Permission denied. Please ensure your Google Cloud setup includes:\n\n' +
          '✅ Google Sheets API enabled\n' +
          '✅ Google Drive API enabled\n' +
          '✅ Service account has Editor role\n\n' +
          'Contact administrator for setup assistance.'
        statusCode = 403
      } else if (sheetsError.message?.includes('API')) {
        errorMessage = 'Google API configuration issue: ' + sheetsError.message
        statusCode = 503
      }
      
      return Response.json(
        { 
          success: false, 
          error: errorMessage,
          details: sheetsError instanceof Error ? sheetsError.message : 'Unknown error',
          troubleshooting: sheetsError.name === 'PermissionError' ? 
            'Visit Google Cloud Console and ensure both Sheets and Drive APIs are enabled, and service account has proper permissions.' : 
            'Check server logs for detailed error information.'
        },
        { status: statusCode }
      )
    }

  } catch (error) {
    console.error('Invoice export API error:', error)
    return Response.json(
      { success: false, error: 'Failed to export invoices' },
      { status: 500 }
    )
  }
}

export const POST_WITH_AUTH = withAuth(POST, {
  resource: 'invoices',
  action: 'read',
  requireAuth: true,
})

export { POST_WITH_AUTH as POST }