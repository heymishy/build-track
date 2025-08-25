/**
 * Invoice Approval API
 * POST /api/invoices/approve - Approve matched invoices
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function POST(request: NextRequest, user: AuthUser) {
  try {
    const body = await request.json()
    const { invoiceIds, projectId } = body

    if (!projectId || !invoiceIds || !Array.isArray(invoiceIds)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project ID and invoice IDs array are required',
        },
        { status: 400 }
      )
    }

    // Verify user has access to this project
    if (user.role !== 'ADMIN') {
      const projectAccess = await prisma.projectUser.findFirst({
        where: {
          userId: user.id,
          projectId,
        },
      })

      if (!projectAccess) {
        return NextResponse.json(
          {
            success: false,
            error: 'You do not have access to this project',
          },
          { status: 403 }
        )
      }
    }

    // Get invoices to approve and validate they belong to the project
    const invoicesToApprove = await prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds },
        projectId,
      },
      include: {
        lineItems: {
          include: {
            lineItem: true, // Include the linked estimate line item
          },
        },
      },
    })

    if (invoicesToApprove.length !== invoiceIds.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'Some invoices not found or do not belong to this project',
        },
        { status: 400 }
      )
    }

    // Validate that all invoice line items are matched
    const unmatchedItems: string[] = []
    for (const invoice of invoicesToApprove) {
      for (const lineItem of invoice.lineItems) {
        if (!lineItem.lineItemId) {
          unmatchedItems.push(
            `Invoice ${invoice.invoiceNumber} - Line item: ${lineItem.description}`
          )
        }
      }
    }

    if (unmatchedItems.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot approve invoices with unmatched line items',
          unmatchedItems,
        },
        { status: 400 }
      )
    }

    // Approve the invoices
    const result = await prisma.$transaction(async tx => {
      const approvedInvoices = []
      for (const invoice of invoicesToApprove) {
        const approved = await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: 'APPROVED',
            updatedAt: new Date(),
          },
          include: {
            lineItems: {
              include: {
                lineItem: {
                  include: {
                    trade: true,
                  },
                },
              },
            },
          },
        })
        approvedInvoices.push(approved)
      }
      return approvedInvoices
    })

    return NextResponse.json({
      success: true,
      data: {
        approvedInvoices: result.length,
        invoices: result,
        message: `Successfully approved ${result.length} invoice(s)`,
      },
    })
  } catch (error) {
    console.error('Error in invoice approval:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to approve invoices',
      },
      { status: 500 }
    )
  }
}

// Apply authentication middleware
const protectedPOST = withAuth(POST, {
  resource: 'invoices',
  action: 'update',
  requireAuth: true,
})

export { protectedPOST as POST }
