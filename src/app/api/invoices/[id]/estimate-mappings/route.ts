/**
 * API Route: /api/invoices/[id]/estimate-mappings
 * Get estimate mappings for a specific invoice
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function GET(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params

    // Verify user has access to this invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        project: {
          include: {
            users: true,
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invoice not found',
        },
        { status: 404 }
      )
    }

    // Check user access to the project
    if (user.role !== 'ADMIN') {
      const hasAccess = invoice.project.users.some(pu => pu.userId === user.id)
      if (!hasAccess) {
        return NextResponse.json(
          {
            success: false,
            error: 'You do not have access to this invoice',
          },
          { status: 403 }
        )
      }
    }

    // Get invoice line items with their estimate mappings
    const invoiceLineItems = await prisma.invoiceLineItem.findMany({
      where: {
        invoiceId,
      },
      include: {
        estimateLineItem: {
          include: {
            trade: true,
          },
        },
      },
    })

    // Format the mappings for the frontend
    const mappings = invoiceLineItems.map(item => ({
      invoiceLineItemId: item.id,
      estimateLineItemId: item.estimateLineItemId,
      estimateLineItem: item.estimateLineItem
        ? {
            id: item.estimateLineItem.id,
            description: item.estimateLineItem.description,
            materialCostEst: item.estimateLineItem.materialCostEst,
            laborCostEst: item.estimateLineItem.laborCostEst,
            equipmentCostEst: item.estimateLineItem.equipmentCostEst,
            trade: {
              id: item.estimateLineItem.trade.id,
              name: item.estimateLineItem.trade.name,
            },
          }
        : null,
    }))

    return NextResponse.json({
      success: true,
      mappings,
    })
  } catch (error) {
    console.error('Error fetching invoice estimate mappings:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch invoice estimate mappings',
      },
      { status: 500 }
    )
  }
}

// Apply authentication middleware
const protectedGET = withAuth(GET, {
  resource: 'invoices',
  action: 'read',
  requireAuth: true,
})

export { protectedGET as GET }
