/**
 * API Route: /api/invoices/export/csv
 * Export invoices to CSV format (no external APIs required)
 */

import { NextRequest } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

interface ExportRequest {
  projectId?: string
  status?: string[]
  dateFrom?: string
  dateTo?: string
  includeLineItems?: boolean
}

async function POST(request: NextRequest, user: AuthUser) {
  try {
    const body: ExportRequest = await request.json()
    const {
      projectId,
      status = ['PENDING', 'APPROVED', 'PAID'],
      dateFrom,
      dateTo,
      includeLineItems = false,
    } = body

    // Build query filters (same as Google Sheets export)
    const whereClause: any = {
      AND: [],
    }

    // User access control
    if (user.role !== 'ADMIN') {
      whereClause.AND.push({
        project: {
          users: {
            some: { userId: user.id },
          },
        },
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
        invoiceDate: { gte: new Date(dateFrom) },
      })
    }

    if (dateTo) {
      whereClause.AND.push({
        invoiceDate: { lte: new Date(dateTo) },
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
          },
        },
        lineItems: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ invoiceDate: 'desc' }, { createdAt: 'desc' }],
    })

    if (invoices.length === 0) {
      return Response.json({
        success: false,
        error: 'No invoices found matching the specified criteria',
      })
    }

    // Generate CSV content
    let csvContent = ''

    if (includeLineItems) {
      // Header for line items format
      csvContent =
        'Supplier,Invoice No.,Date,Customer Reference,Description,Quantity,Unit Price,Total Amount,Taxable Amount,Plus GST,Total\n'

      // Process each invoice's line items
      for (const invoice of invoices) {
        if (invoice.lineItems && invoice.lineItems.length > 0) {
          for (const lineItem of invoice.lineItems) {
            const row = [
              escapeCSV(invoice.supplierName || 'Unknown Supplier'),
              escapeCSV(invoice.invoiceNumber || ''),
              new Date(invoice.invoiceDate).toLocaleDateString('en-NZ'),
              escapeCSV(invoice.project?.name || invoice.notes || ''),
              escapeCSV(lineItem.description || 'Line Item'),
              lineItem.quantity || 1,
              (lineItem.unitPrice || 0).toFixed(2),
              (lineItem.totalPrice || 0).toFixed(2),
              (lineItem.totalPrice || 0).toFixed(2), // Simplified - line items don't separate GST
              '0.00', // GST is typically at invoice level
              (lineItem.totalPrice || 0).toFixed(2),
            ].join(',')
            csvContent += row + '\n'
          }
        } else {
          // Fallback to invoice level if no line items
          const taxableAmount = Number(invoice.totalAmount) - Number(invoice.gstAmount || 0)
          const gstAmount = Number(invoice.gstAmount || 0)
          const row = [
            escapeCSV(invoice.supplierName || 'Unknown Supplier'),
            escapeCSV(invoice.invoiceNumber || ''),
            new Date(invoice.invoiceDate).toLocaleDateString('en-NZ'),
            escapeCSV(invoice.project?.name || invoice.notes || ''),
            'Invoice',
            1,
            Number(invoice.totalAmount).toFixed(2),
            Number(invoice.totalAmount).toFixed(2),
            taxableAmount.toFixed(2),
            gstAmount.toFixed(2),
            Number(invoice.totalAmount).toFixed(2),
          ].join(',')
          csvContent += row + '\n'
        }
      }
    } else {
      // Header for summary format
      csvContent =
        'Supplier,Invoice No.,Date,Customer Reference,Description,Quantity,Unit Price,Total Amount,Taxable Amount,Plus GST,Total\n'

      // Process each invoice as single row
      for (const invoice of invoices) {
        const taxableAmount = Number(invoice.totalAmount) - Number(invoice.gstAmount || 0)
        const gstAmount = Number(invoice.gstAmount || 0)

        const row = [
          escapeCSV(invoice.supplierName || 'Unknown Supplier'),
          escapeCSV(invoice.invoiceNumber || ''),
          new Date(invoice.invoiceDate).toLocaleDateString('en-NZ'),
          escapeCSV(invoice.project?.name || invoice.notes || ''),
          escapeCSV(invoice.lineItems?.[0]?.description || 'Invoice'),
          Number(invoice.lineItems?.[0]?.quantity || 1),
          Number(invoice.lineItems?.[0]?.unitPrice || invoice.totalAmount).toFixed(2),
          Number(invoice.totalAmount).toFixed(2),
          taxableAmount.toFixed(2),
          gstAmount.toFixed(2),
          Number(invoice.totalAmount).toFixed(2),
        ].join(',')
        csvContent += row + '\n'
      }
    }

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `BuildTrack_Invoice_Export_${timestamp}.csv`

    // Return CSV as downloadable file
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('CSV export error:', error)
    return Response.json(
      { success: false, error: 'Failed to export invoices to CSV' },
      { status: 500 }
    )
  }
}

// Helper function to escape CSV values
function escapeCSV(value: string | null | undefined): string {
  if (!value) return ''
  const str = String(value)
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export const POST_WITH_AUTH = withAuth(POST, {
  resource: 'invoices',
  action: 'read',
  requireAuth: true,
})

export { POST_WITH_AUTH as POST }
