/**
 * API Route: /api/invoices/[id]
 * Handles operations on individual invoices
 */

import { NextRequest } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

// GET /api/invoices/[id] - Get single invoice
async function GET(request: NextRequest, user: AuthUser, { params }: { params: { id: string } }) {
  try {
    const invoiceId = params.id

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        ...(user.role !== 'ADMIN' && {
          project: {
            users: {
              some: {
                userId: user.id,
              },
            },
          },
        }),
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            status: true,
            totalBudget: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lineItems: true,
      },
    })

    if (!invoice) {
      return Response.json(
        { success: false, error: 'Invoice not found or access denied' },
        { status: 404 }
      )
    }

    return Response.json({
      success: true,
      invoice: {
        ...invoice,
        totalAmount: Number(invoice.totalAmount),
        gstAmount: Number(invoice.gstAmount),
        lineItems: invoice.lineItems.map(item => ({
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return Response.json({ success: false, error: 'Failed to fetch invoice' }, { status: 500 })
  }
}

// PATCH /api/invoices/[id] - Update invoice (mainly status)
async function PATCH(request: NextRequest, user: AuthUser, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: invoiceId } = await params
    const body = await request.json()
    const { status, notes, dueDate } = body

    // Verify user has access to this invoice
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        ...(user.role !== 'ADMIN' && {
          project: {
            users: {
              some: {
                userId: user.id,
              },
            },
          },
        }),
      },
    })

    if (!existingInvoice) {
      return Response.json(
        { success: false, error: 'Invoice not found or access denied' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: any = {}
    if (status) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    if (dueDate) updateData.dueDate = new Date(dueDate)

    // Update invoice
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        lineItems: true,
      },
    })

    return Response.json({
      success: true,
      invoice: {
        ...updatedInvoice,
        totalAmount: Number(updatedInvoice.totalAmount),
        gstAmount: Number(updatedInvoice.gstAmount),
      },
    })
  } catch (error) {
    console.error('Error updating invoice:', error)
    return Response.json({ success: false, error: 'Failed to update invoice' }, { status: 500 })
  }
}

// DELETE /api/invoices/[id] - Delete invoice
async function DELETE(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params

    // Verify user has access to this invoice and is authorized to delete
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        ...(user.role !== 'ADMIN' && {
          project: {
            users: {
              some: {
                userId: user.id,
                role: { in: ['OWNER', 'CONTRACTOR'] }, // Only owners and contractors can delete
              },
            },
          },
        }),
      },
      include: {
        project: {
          include: {
            users: {
              where: { userId: user.id },
            },
          },
        },
      },
    })

    if (!existingInvoice) {
      return Response.json(
        { success: false, error: 'Invoice not found or insufficient permissions' },
        { status: 404 }
      )
    }

    // Delete invoice (cascade will handle line items)
    await prisma.invoice.delete({
      where: { id: invoiceId },
    })

    return Response.json({
      success: true,
      message: 'Invoice deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting invoice:', error)
    return Response.json({ success: false, error: 'Failed to delete invoice' }, { status: 500 })
  }
}

// Apply authentication middleware
const protectedGET = withAuth(GET, {
  resource: 'invoices',
  action: 'read',
  requireAuth: true,
})

const protectedPATCH = withAuth(PATCH, {
  resource: 'invoices',
  action: 'update',
  requireAuth: true,
})

const protectedDELETE = withAuth(DELETE, {
  resource: 'invoices',
  action: 'delete',
  requireAuth: true,
})

export { protectedGET as GET, protectedPATCH as PATCH, protectedDELETE as DELETE }
