/**
 * API Route: /api/estimates/import-parsed
 * Import project estimates from pre-parsed estimate data (skips LLM processing)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { ParsedEstimate } from '@/lib/estimate-parser'

interface ImportParsedEstimateRequest {
  parsedEstimate: ParsedEstimate
  projectId?: string
  createNewProject?: boolean
  projectName?: string
}

async function POST(request: NextRequest, user: AuthUser) {
  try {
    console.log('Import parsed estimate API called')

    const body: ImportParsedEstimateRequest = await request.json()
    const { parsedEstimate, projectId, createNewProject, projectName } = body

    // Validate parsed estimate data
    if (!parsedEstimate || !parsedEstimate.trades || parsedEstimate.trades.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid parsed estimate data',
        },
        { status: 400 }
      )
    }

    // Validate project parameters
    if (!createNewProject && !projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project ID is required when not creating a new project',
        },
        { status: 400 }
      )
    }

    if (createNewProject && !projectName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project name is required when creating a new project',
        },
        { status: 400 }
      )
    }

    // Verify user has access to existing project (if not creating new)
    if (!createNewProject && user.role !== 'ADMIN') {
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

    // Create or update project
    let targetProjectId: string
    let project: any

    if (createNewProject) {
      // Create new project with estimate data
      project = await prisma.project.create({
        data: {
          name: projectName,
          description: `Project created from estimate import: ${parsedEstimate.metadata.filename}`,
          totalBudget: parsedEstimate.totalBudget,
          currency: parsedEstimate.currency,
          status: 'PLANNING',
          users: {
            create: {
              userId: user.id,
              role: 'OWNER',
            },
          },
        },
        include: {
          users: true,
        },
      })
      targetProjectId = project.id
    } else {
      // Update existing project budget
      project = await prisma.project.update({
        where: { id: projectId },
        data: {
          totalBudget: parsedEstimate.totalBudget,
          currency: parsedEstimate.currency,
        },
        include: {
          users: true,
          trades: {
            include: {
              lineItems: true,
            },
          },
        },
      })
      targetProjectId = projectId
    }

    // Create trades and line items
    const createdTrades = []
    const errors = []

    for (const tradeData of parsedEstimate.trades) {
      try {
        // Check if trade already exists
        let trade = await prisma.trade.findFirst({
          where: {
            projectId: targetProjectId,
            name: tradeData.name,
          },
        })

        if (!trade) {
          // Create new trade
          trade = await prisma.trade.create({
            data: {
              projectId: targetProjectId,
              name: tradeData.name,
              description: tradeData.description,
              sortOrder: tradeData.sortOrder || 0,
            },
          })
        }

        // Create line items for this trade
        const lineItemsData = tradeData.lineItems.map((item, index) => ({
          tradeId: trade.id,
          itemCode: item.itemCode,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          materialCostEst: item.materialCost,
          laborCostEst: item.laborCost,
          equipmentCostEst: item.equipmentCost,
          markupPercent: item.markupPercent || 0,
          overheadPercent: item.overheadPercent || 0,
          sortOrder: index,
        }))

        // Delete existing line items for this trade (if updating)
        if (!createNewProject) {
          await prisma.lineItem.deleteMany({
            where: { tradeId: trade.id },
          })
        }

        // Create new line items
        const createdLineItems = await prisma.lineItem.createMany({
          data: lineItemsData,
        })

        createdTrades.push({
          id: trade.id,
          name: trade.name,
          lineItemsCount: createdLineItems.count,
          totalCost: tradeData.totalCost,
        })
      } catch (error) {
        console.error(`Error creating trade ${tradeData.name}:`, error)
        errors.push({
          tradeName: tradeData.name,
          error: 'Failed to create trade and line items',
        })
      }
    }

    // Calculate final totals
    const summary = {
      projectId: targetProjectId,
      projectName: project.name,
      totalBudget: parsedEstimate.totalBudget,
      tradesCreated: createdTrades.length,
      totalLineItems: parsedEstimate.summary.totalLineItems,
      materialCost: parsedEstimate.summary.totalMaterialCost,
      laborCost: parsedEstimate.summary.totalLaborCost,
      equipmentCost: parsedEstimate.summary.totalEquipmentCost,
      errors: errors.length,
    }

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        totalBudget: project.totalBudget,
        currency: project.currency,
      },
      estimate: parsedEstimate,
      createdTrades,
      errors,
      summary,
    })
  } catch (error) {
    console.error('Import parsed estimate API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}

// Apply authentication middleware
const protectedPOST = withAuth(POST, {
  resource: 'projects',
  action: 'create',
  requireAuth: true,
})

export { protectedPOST as POST }
