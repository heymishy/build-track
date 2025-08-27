/**
 * API Route: /api/projects/[id]/trades/[tradeId]/line-items
 * Add line items to existing trades
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function POST(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: Promise<{ id: string; tradeId: string }> }
) {
  try {
    const { id: projectId, tradeId } = await params
    const lineItemData = await request.json()

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

    // Verify the trade exists and belongs to the project
    const trade = await prisma.trade.findFirst({
      where: {
        id: tradeId,
        projectId,
      },
    })

    if (!trade) {
      return NextResponse.json(
        {
          success: false,
          error: 'Trade not found or does not belong to this project',
        },
        { status: 404 }
      )
    }

    // Create the line item
    const lineItem = await prisma.lineItem.create({
      data: {
        description: lineItemData.description,
        quantity: parseFloat(lineItemData.quantity) || 1,
        unit: lineItemData.unit || 'ea',
        materialCostEst: parseFloat(lineItemData.materialCostEst) || 0,
        laborCostEst: parseFloat(lineItemData.laborCostEst) || 0,
        equipmentCostEst: parseFloat(lineItemData.equipmentCostEst) || 0,
        markupPercent: parseFloat(lineItemData.markupPercent) || 0,
        overheadPercent: parseFloat(lineItemData.overheadPercent) || 0,
        tradeId,
        sortOrder: 0, // Will be updated below
      },
    })

    // Update sort order to place the new item at the end
    const existingItems = await prisma.lineItem.count({
      where: { tradeId },
    })

    await prisma.lineItem.update({
      where: { id: lineItem.id },
      data: { sortOrder: existingItems },
    })

    // Update project budget if needed
    const allTrades = await prisma.trade.findMany({
      where: { projectId },
      include: {
        lineItems: true,
      },
    })

    const totalBudget = allTrades.reduce((sum, trade) => {
      return sum + trade.lineItems.reduce((tradeSum, item) => {
        const baseTotal = (item.materialCostEst || 0) + (item.laborCostEst || 0) + (item.equipmentCostEst || 0)
        const markup = baseTotal * ((item.markupPercent || 0) / 100)
        const overhead = baseTotal * ((item.overheadPercent || 0) / 100)
        const itemTotal = (baseTotal + markup + overhead) * (item.quantity || 1)
        return tradeSum + itemTotal
      }, 0)
    }, 0)

    // Update project total budget
    await prisma.project.update({
      where: { id: projectId },
      data: { totalBudget },
    })

    return NextResponse.json({
      success: true,
      data: {
        lineItem: {
          id: lineItem.id,
          description: lineItem.description,
          quantity: lineItem.quantity,
          unit: lineItem.unit,
          materialCostEst: lineItem.materialCostEst,
          laborCostEst: lineItem.laborCostEst,
          equipmentCostEst: lineItem.equipmentCostEst,
          markupPercent: lineItem.markupPercent,
          overheadPercent: lineItem.overheadPercent,
          tradeId: lineItem.tradeId,
          sortOrder: lineItem.sortOrder,
        },
        totalBudget,
      },
    })
  } catch (error) {
    console.error('Error adding line item:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add line item',
      },
      { status: 500 }
    )
  }
}

// Apply authentication middleware
const protectedPOST = withAuth(POST, {
  resource: 'projects',
  action: 'update',
  requireAuth: true,
})

export { protectedPOST as POST }