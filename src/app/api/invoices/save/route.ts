/**
 * API Route: /api/invoices/save
 * Saves parsed invoices to a project
 */

import { NextRequest } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

// POST /api/invoices/save - Save parsed invoices to a project
async function POST(request: NextRequest, user: AuthUser) {
  try {
    const body = await request.json()
    const { projectId, invoices } = body

    console.log('Invoice Save API - Request received:', {
      projectId,
      invoiceCount: invoices?.length,
      user: { id: user.id, email: user.email, role: user.role }
    })

    if (!projectId || !invoices || !Array.isArray(invoices)) {
      console.log('Invoice Save API - Invalid request data:', { projectId, invoicesType: typeof invoices, isArray: Array.isArray(invoices) })
      return Response.json(
        { success: false, error: 'Project ID and invoices array are required' },
        { status: 400 }
      )
    }

    // Verify user has access to the project
    if (user.role !== 'ADMIN') {
      const projectAccess = await prisma.projectUser.findFirst({
        where: {
          userId: user.id,
          projectId,
        },
      })

      if (!projectAccess) {
        return Response.json(
          { success: false, error: 'You do not have access to this project' },
          { status: 403 }
        )
      }
    }

    const savedInvoices = []
    const errors = []

    // Process each invoice
    for (let i = 0; i < invoices.length; i++) {
      const invoice = invoices[i]

      console.log(`Processing invoice ${i + 1}/${invoices.length}:`, {
        invoiceNumber: invoice.invoiceNumber,
        vendorName: invoice.vendorName,
        total: invoice.total,
        lineItemsCount: invoice.lineItems?.length
      })

      try {
        // Generate invoice number if not provided
        const invoiceNumber = invoice.invoiceNumber || `INV-${Date.now()}-${i + 1}`

        // Check for duplicate invoice number in the same project
        const existingInvoice = await prisma.invoice.findFirst({
          where: {
            projectId,
            invoiceNumber,
          },
        })

        if (existingInvoice) {
          errors.push({
            index: i,
            invoiceNumber,
            error: 'Duplicate invoice number in this project',
          })
          continue
        }

        // Create invoice with line items from parsed data
        const savedInvoice = await prisma.invoice.create({
          data: {
            projectId,
            userId: user.id,
            invoiceNumber,
            supplierName: invoice.vendorName || 'Unknown Supplier',
            supplierABN: null,
            invoiceDate: invoice.date ? new Date(invoice.date) : new Date(),
            dueDate: null,
            totalAmount: Number(invoice.total || 0),
            gstAmount: Number(invoice.tax || 0),
            status: 'PENDING',
            notes: invoice.description ? `Parsed description: ${invoice.description}` : null,
            lineItems: {
              create: (invoice.lineItems || []).map((item: any) => ({
                description: item.description || 'Parsed line item',
                quantity: Number(item.quantity || 1),
                unitPrice: Number(item.unitPrice || 0),
                totalPrice: Number(item.total || 0),
                category: 'MATERIAL', // Default category
              })),
            },
          },
          include: {
            lineItems: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })

        savedInvoices.push({
          ...savedInvoice,
          totalAmount: Number(savedInvoice.totalAmount),
          gstAmount: Number(savedInvoice.gstAmount),
        })

        console.log(`Successfully saved invoice ${i + 1}: ${invoiceNumber}`)
      } catch (error) {
        console.error(`Error saving invoice ${i + 1}:`, {
          invoiceNumber: invoice.invoiceNumber || `Invoice ${i + 1}`,
          error: error.message,
          stack: error.stack
        })
        errors.push({
          index: i,
          invoiceNumber: invoice.invoiceNumber || `Invoice ${i + 1}`,
          error: error.message || 'Failed to save invoice to database',
        })
      }
    }

    const result = {
      success: true,
      savedInvoices,
      errors,
      summary: {
        totalInvoices: invoices.length,
        savedCount: savedInvoices.length,
        errorCount: errors.length,
      },
    }

    console.log('Invoice Save API - Final result:', {
      summary: result.summary,
      hasErrors: errors.length > 0,
      errorMessages: errors.map(e => e.error)
    })

    return Response.json(result)
  } catch (error) {
    console.error('Error saving invoices:', error)
    return Response.json({ success: false, error: 'Failed to save invoices' }, { status: 500 })
  }
}

// Apply authentication middleware
const protectedPOST = withAuth(POST, {
  resource: 'invoices',
  action: 'create',
  requireAuth: true,
})

export { protectedPOST as POST }
