/**
 * API Route: /api/projects/[id]/estimate-vs-actual
 * Provides detailed estimate vs actual invoice comparison data
 */

import { NextRequest } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function GET(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: { id: string } }
) {
  try {
    const { id: projectId } = params

    // Find the project and verify access
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        users: true,
        trades: {
          include: {
            lineItems: true,
            _count: {
              select: {
                lineItems: true,
              },
            },
          },
        },
        invoices: {
          where: {
            status: {
              in: ['APPROVED', 'PENDING'],
            },
          },
          include: {
            lineItems: {
              include: {
                matchedLineItem: {
                  include: {
                    trade: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!project) {
      return Response.json(
        {
          success: false,
          error: 'Project not found',
        },
        { status: 404 }
      )
    }

    // Check access
    const hasAccess = user.role === 'ADMIN' || project.users.some(pu => pu.userId === user.id)
    if (!hasAccess) {
      return Response.json(
        {
          success: false,
          error: 'Access denied',
        },
        { status: 403 }
      )
    }

    // Calculate trade-level comparisons
    const tradeComparisons = project.trades.map((trade) => {
      // Sum estimated amounts from line items
      const estimatedAmount = trade.lineItems.reduce((sum, item) => sum + item.amount, 0)

      // Sum actual amounts from matched invoice line items
      const actualAmount = project.invoices.reduce((sum, invoice) => {
        const tradeInvoiceItems = invoice.lineItems.filter(
          (item) => item.matchedLineItem?.trade.id === trade.id
        )
        return sum + tradeInvoiceItems.reduce((itemSum, item) => itemSum + item.amount, 0)
      }, 0)

      // Calculate variance
      const variance = actualAmount - estimatedAmount
      const variancePercent = estimatedAmount > 0 ? (variance / estimatedAmount) * 100 : 0

      // Count invoices for this trade
      const invoiceCount = project.invoices.filter((invoice) =>
        invoice.lineItems.some((item) => item.matchedLineItem?.trade.id === trade.id)
      ).length

      // Determine status
      let status: 'UNDER' | 'OVER' | 'ON_TARGET' = 'ON_TARGET'
      if (variancePercent > 5) status = 'OVER'
      else if (variancePercent < -5) status = 'UNDER'

      return {
        tradeId: trade.id,
        tradeName: trade.name,
        estimatedAmount,
        actualAmount,
        variance,
        variancePercent: Math.round(variancePercent * 10) / 10, // Round to 1 decimal
        invoiceCount,
        status,
      }
    })

    // Calculate project totals
    const totalEstimated = tradeComparisons.reduce((sum, trade) => sum + trade.estimatedAmount, 0)
    const totalActual = tradeComparisons.reduce((sum, trade) => sum + trade.actualAmount, 0)
    const totalVariance = totalActual - totalEstimated
    const totalVariancePercent = totalEstimated > 0 ? (totalVariance / totalEstimated) * 100 : 0

    const data = {
      projectId: project.id,
      projectName: project.name,
      totalEstimated,
      totalActual,
      totalVariance,
      totalVariancePercent: Math.round(totalVariancePercent * 10) / 10,
      currency: project.currency || 'NZD',
      tradeComparisons: tradeComparisons.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)), // Sort by largest variance first
      lastUpdated: new Date().toISOString(),
    }

    return Response.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Error fetching estimate vs actual:', error)
    return Response.json(
      {
        success: false,
        error: 'Failed to fetch estimate vs actual data',
      },
      { status: 500 }
    )
  }
}

// Apply authentication middleware
const protectedGET = withAuth(GET, {
  resource: 'projects',
  action: 'read',
  requireAuth: true,
})

export { protectedGET as GET }