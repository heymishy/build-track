/**
 * API Route: DELETE /api/estimates/[projectId]/delete
 * Delete all estimate data (trades and line items) from a project
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function DELETE(
  request: NextRequest,
  user: AuthUser,
  context?: { params: { projectId: string } }
) {
  try {
    // Get projectId from URL pathname since context.params might be undefined
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const projectId = pathSegments[pathSegments.length - 2] // Get the projectId from /api/estimates/{projectId}/delete

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project ID is required',
        },
        { status: 400 }
      )
    }

    console.log(`Deleting estimate data for project: ${projectId}`)

    // Verify user has access to this project
    if (user.role !== 'ADMIN') {
      const projectAccess = await prisma.projectUser.findFirst({
        where: {
          userId: user.id,
          projectId,
          role: { in: ['OWNER', 'CONTRACTOR'] }, // Only owners and contractors can delete estimates
        },
      })

      if (!projectAccess) {
        return NextResponse.json(
          {
            success: false,
            error: 'You do not have permission to delete estimates for this project',
          },
          { status: 403 }
        )
      }
    }

    // Get all trades for this project to get line item counts
    const trades = await prisma.trade.findMany({
      where: { projectId },
      include: {
        lineItems: true,
      },
    })

    let totalLineItemsDeleted = 0
    let totalTradesDeleted = 0

    // Delete all line items first (due to foreign key constraints)
    for (const trade of trades) {
      const lineItemCount = await prisma.lineItem.deleteMany({
        where: { tradeId: trade.id },
      })
      totalLineItemsDeleted += lineItemCount.count
    }

    // Then delete all trades
    const tradesDeleted = await prisma.trade.deleteMany({
      where: { projectId },
    })
    totalTradesDeleted = tradesDeleted.count

    // Reset project budget to 0
    await prisma.project.update({
      where: { id: projectId },
      data: {
        totalBudget: 0,
      },
    })

    console.log(
      `Deleted ${totalLineItemsDeleted} line items and ${totalTradesDeleted} trades from project ${projectId}`
    )

    return NextResponse.json({
      success: true,
      message: 'Estimate data deleted successfully',
      deleted: {
        trades: totalTradesDeleted,
        lineItems: totalLineItemsDeleted,
      },
    })
  } catch (error) {
    console.error('Delete estimate data error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete estimate data',
      },
      { status: 500 }
    )
  }
}

// Apply authentication middleware
const protectedDELETE = withAuth(DELETE, {
  resource: 'projects',
  action: 'update',
  requireAuth: true,
})

export { protectedDELETE as DELETE }
