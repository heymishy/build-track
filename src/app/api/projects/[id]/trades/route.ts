/**
 * API Route: /api/projects/[id]/trades
 * Get trades and line items for a project
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
    const { id: projectId } = await params

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

    // Get trades with line items for this project
    const trades = await prisma.trade.findMany({
      where: { projectId },
      include: {
        lineItems: {
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json({
      success: true,
      trades,
    })
  } catch (error) {
    console.error('Error fetching trades:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch trades',
      },
      { status: 500 }
    )
  }
}

async function POST(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const body = await request.json()

    // Verify user has access to this project
    if (user.role !== 'ADMIN') {
      const projectAccess = await prisma.projectUser.findFirst({
        where: {
          userId: user.id,
          projectId,
          role: { in: ['OWNER', 'CONTRACTOR'] }, // Only owners/contractors can create trades
        },
      })

      if (!projectAccess) {
        return NextResponse.json(
          {
            success: false,
            error: 'You do not have permission to create trades for this project',
          },
          { status: 403 }
        )
      }
    }

    if (body.type === 'trade') {
      // Create new trade
      const { name, description } = body

      if (!name) {
        return NextResponse.json(
          { success: false, error: 'Trade name is required' },
          { status: 400 }
        )
      }

      // Get the next sort order
      const maxSortOrder = await prisma.trade.findFirst({
        where: { projectId },
        select: { sortOrder: true },
        orderBy: { sortOrder: 'desc' },
      })

      const trade = await prisma.trade.create({
        data: {
          projectId,
          name,
          description: description || null,
          sortOrder: (maxSortOrder?.sortOrder || 0) + 1,
        },
      })

      return NextResponse.json({
        success: true,
        trade,
      })
    } else if (body.type === 'lineItem') {
      // Create new line item in existing trade
      const {
        tradeId,
        description,
        quantity,
        unit,
        materialCostEst = 0,
        laborCostEst = 0,
        equipmentCostEst = 0,
        markupPercent = 0,
        overheadPercent = 0,
      } = body

      if (!tradeId || !description || !quantity || !unit) {
        return NextResponse.json(
          { success: false, error: 'Trade ID, description, quantity, and unit are required' },
          { status: 400 }
        )
      }

      // Verify trade belongs to this project
      const trade = await prisma.trade.findFirst({
        where: { id: tradeId, projectId },
      })

      if (!trade) {
        return NextResponse.json(
          { success: false, error: 'Trade not found in this project' },
          { status: 404 }
        )
      }

      // Get the next sort order for this trade
      const maxSortOrder = await prisma.lineItem.findFirst({
        where: { tradeId },
        select: { sortOrder: true },
        orderBy: { sortOrder: 'desc' },
      })

      const lineItem = await prisma.lineItem.create({
        data: {
          tradeId,
          description,
          quantity: Number(quantity),
          unit,
          materialCostEst: Number(materialCostEst),
          laborCostEst: Number(laborCostEst),
          equipmentCostEst: Number(equipmentCostEst),
          markupPercent: Number(markupPercent),
          overheadPercent: Number(overheadPercent),
          sortOrder: (maxSortOrder?.sortOrder || 0) + 1,
        },
        include: {
          trade: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      return NextResponse.json({
        success: true,
        lineItem,
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Must be "trade" or "lineItem"' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error creating trade/line item:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create trade/line item',
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

const protectedPOST = withAuth(POST, {
  resource: 'projects',
  action: 'update',
  requireAuth: true,
})

export { protectedGET as GET, protectedPOST as POST }
