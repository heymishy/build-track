/**
 * API Route: PUT /api/estimates/[projectId]/edit
 * Edit/update estimate data for a specific project
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

interface EditEstimateRequest {
  trades: {
    id?: string // If provided, update existing; if not, create new
    name: string
    description?: string
    lineItems: {
      id?: string // If provided, update existing; if not, create new
      description: string
      quantity: number
      unit: string
      materialCost: number
      laborCost: number
      equipmentCost: number
      markupPercent?: number
      overheadPercent?: number
    }[]
  }[]
  deletedTradeIds?: string[] // Trades to delete
  deletedLineItemIds?: string[] // Line items to delete
}

async function PUT(
  request: NextRequest,
  user: AuthUser,
  context?: { params: { projectId: string } }
) {
  try {
    // Get projectId from URL pathname since context.params might be undefined
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const projectId = pathSegments[pathSegments.length - 2] // Get the projectId from /api/estimates/{projectId}/edit

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project ID is required',
        },
        { status: 400 }
      )
    }
    const body: EditEstimateRequest = await request.json()

    console.log(`Editing estimate data for project: ${projectId}`)

    // Verify user has access to this project
    if (user.role !== 'ADMIN') {
      const projectAccess = await prisma.projectUser.findFirst({
        where: {
          userId: user.id,
          projectId,
          role: { in: ['OWNER', 'CONTRACTOR'] }, // Only owners and contractors can edit estimates
        },
      })

      if (!projectAccess) {
        return NextResponse.json(
          {
            success: false,
            error: 'You do not have permission to edit estimates for this project',
          },
          { status: 403 }
        )
      }
    }

    // Start transaction for atomic updates
    const result = await prisma.$transaction(async tx => {
      // Delete specified trades and their line items
      if (body.deletedTradeIds && body.deletedTradeIds.length > 0) {
        // First delete line items
        await tx.lineItem.deleteMany({
          where: {
            tradeId: { in: body.deletedTradeIds },
          },
        })
        // Then delete trades
        await tx.trade.deleteMany({
          where: {
            id: { in: body.deletedTradeIds },
            projectId, // Security: ensure trade belongs to this project
          },
        })
      }

      // Delete specified line items
      if (body.deletedLineItemIds && body.deletedLineItemIds.length > 0) {
        await tx.lineItem.deleteMany({
          where: {
            id: { in: body.deletedLineItemIds },
            trade: { projectId }, // Security: ensure line item belongs to this project
          },
        })
      }

      const updatedTrades = []

      // Process trades (create/update)
      for (const [index, tradeData] of body.trades.entries()) {
        let trade

        if (tradeData.id) {
          // Update existing trade
          trade = await tx.trade.update({
            where: {
              id: tradeData.id,
              projectId, // Security: ensure trade belongs to this project
            },
            data: {
              name: tradeData.name,
              description: tradeData.description,
              sortOrder: index,
            },
          })
        } else {
          // Create new trade
          trade = await tx.trade.create({
            data: {
              projectId,
              name: tradeData.name,
              description: tradeData.description,
              sortOrder: index,
            },
          })
        }

        // Process line items for this trade
        const updatedLineItems = []
        for (const [lineIndex, lineItemData] of tradeData.lineItems.entries()) {
          let lineItem

          if (lineItemData.id) {
            // Update existing line item
            lineItem = await tx.lineItem.update({
              where: {
                id: lineItemData.id,
                tradeId: trade.id, // Security: ensure line item belongs to this trade
              },
              data: {
                description: lineItemData.description,
                quantity: lineItemData.quantity,
                unit: lineItemData.unit,
                materialCostEst: lineItemData.materialCost,
                laborCostEst: lineItemData.laborCost,
                equipmentCostEst: lineItemData.equipmentCost,
                markupPercent: lineItemData.markupPercent || 0,
                overheadPercent: lineItemData.overheadPercent || 0,
                sortOrder: lineIndex,
              },
            })
          } else {
            // Create new line item
            lineItem = await tx.lineItem.create({
              data: {
                tradeId: trade.id,
                description: lineItemData.description,
                quantity: lineItemData.quantity,
                unit: lineItemData.unit,
                materialCostEst: lineItemData.materialCost,
                laborCostEst: lineItemData.laborCost,
                equipmentCostEst: lineItemData.equipmentCost,
                markupPercent: lineItemData.markupPercent || 0,
                overheadPercent: lineItemData.overheadPercent || 0,
                sortOrder: lineIndex,
              },
            })
          }

          updatedLineItems.push(lineItem)
        }

        updatedTrades.push({
          ...trade,
          lineItems: updatedLineItems,
        })
      }

      // Calculate new total budget
      const allLineItems = await tx.lineItem.findMany({
        where: {
          trade: { projectId },
        },
      })

      const totalBudget = allLineItems.reduce((sum, item) => {
        const materialCost = Number(item.materialCostEst)
        const laborCost = Number(item.laborCostEst)
        const equipmentCost = Number(item.equipmentCostEst)
        const subtotal = materialCost + laborCost + equipmentCost
        const markup = subtotal * (Number(item.markupPercent) / 100)
        const overhead = subtotal * (Number(item.overheadPercent) / 100)
        return sum + subtotal + markup + overhead
      }, 0)

      // Update project budget
      await tx.project.update({
        where: { id: projectId },
        data: { totalBudget },
      })

      return {
        trades: updatedTrades,
        totalBudget,
        totalLineItems: allLineItems.length,
      }
    })

    console.log(
      `Updated estimate data for project ${projectId}: ${result.trades.length} trades, ${result.totalLineItems} line items, total budget: $${result.totalBudget}`
    )

    return NextResponse.json({
      success: true,
      message: 'Estimate data updated successfully',
      trades: result.trades,
      summary: {
        totalBudget: result.totalBudget,
        tradesCount: result.trades.length,
        lineItemsCount: result.totalLineItems,
      },
    })
  } catch (error) {
    console.error('Edit estimate data error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update estimate data',
      },
      { status: 500 }
    )
  }
}

// Apply authentication middleware
const protectedPUT = withAuth(PUT, {
  resource: 'projects',
  action: 'update',
  requireAuth: true,
})

export { protectedPUT as PUT }
