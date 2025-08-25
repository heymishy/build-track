/**
 * Bulk Estimate Updates API
 * POST /api/projects/[id]/estimates/bulk - Bulk create/update/delete estimate line items
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

interface BulkEstimateOperation {
  action: 'create' | 'update' | 'delete' | 'split'
  data?: {
    id?: string
    tradeId: string
    itemCode?: string | null
    description: string
    quantity: number
    unit: string
    materialCostEst: number
    laborCostEst: number
    equipmentCostEst: number
    markupPercent: number
    overheadPercent: number
    sortOrder: number
  }
  splitData?: {
    originalId: string
    newItems: Array<{
      tradeId: string
      itemCode?: string | null
      description: string
      quantity: number
      unit: string
      materialCostEst: number
      laborCostEst: number
      equipmentCostEst: number
      markupPercent: number
      overheadPercent: number
      sortOrder: number
    }>
  }
}

async function POST(request: NextRequest, user: AuthUser, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params
    const body = await request.json()
    const { operations }: { operations: BulkEstimateOperation[] } = body

    if (!operations || !Array.isArray(operations)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Operations array is required',
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

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project not found',
        },
        { status: 404 }
      )
    }

    // Execute all operations in a transaction
    const result = await prisma.$transaction(async tx => {
      const results: any[] = []

      for (const operation of operations) {
        try {
          switch (operation.action) {
            case 'create':
              if (!operation.data) throw new Error('Data required for create operation')
              
              const created = await tx.lineItem.create({
                data: {
                  tradeId: operation.data.tradeId,
                  itemCode: operation.data.itemCode,
                  description: operation.data.description,
                  quantity: operation.data.quantity,
                  unit: operation.data.unit,
                  materialCostEst: operation.data.materialCostEst,
                  laborCostEst: operation.data.laborCostEst,
                  equipmentCostEst: operation.data.equipmentCostEst,
                  markupPercent: operation.data.markupPercent,
                  overheadPercent: operation.data.overheadPercent,
                  sortOrder: operation.data.sortOrder,
                },
                include: {
                  trade: true,
                  invoiceItems: true,
                },
              })
              results.push({ action: 'create', result: created })
              break

            case 'update':
              if (!operation.data?.id) throw new Error('ID required for update operation')
              
              const updated = await tx.lineItem.update({
                where: { id: operation.data.id },
                data: {
                  tradeId: operation.data.tradeId,
                  itemCode: operation.data.itemCode,
                  description: operation.data.description,
                  quantity: operation.data.quantity,
                  unit: operation.data.unit,
                  materialCostEst: operation.data.materialCostEst,
                  laborCostEst: operation.data.laborCostEst,
                  equipmentCostEst: operation.data.equipmentCostEst,
                  markupPercent: operation.data.markupPercent,
                  overheadPercent: operation.data.overheadPercent,
                  sortOrder: operation.data.sortOrder,
                  updatedAt: new Date(),
                },
                include: {
                  trade: true,
                  invoiceItems: true,
                },
              })
              results.push({ action: 'update', result: updated })
              break

            case 'delete':
              if (!operation.data?.id) throw new Error('ID required for delete operation')
              
              const deleted = await tx.lineItem.delete({
                where: { id: operation.data.id },
              })
              results.push({ action: 'delete', result: deleted })
              break

            case 'split':
              if (!operation.splitData) throw new Error('Split data required for split operation')
              
              // Delete original item
              await tx.lineItem.delete({
                where: { id: operation.splitData.originalId },
              })
              
              // Create new items
              const splitResults = []
              for (const newItem of operation.splitData.newItems) {
                const created = await tx.lineItem.create({
                  data: {
                    tradeId: newItem.tradeId,
                    itemCode: newItem.itemCode,
                    description: newItem.description,
                    quantity: newItem.quantity,
                    unit: newItem.unit,
                    materialCostEst: newItem.materialCostEst,
                    laborCostEst: newItem.laborCostEst,
                    equipmentCostEst: newItem.equipmentCostEst,
                    markupPercent: newItem.markupPercent,
                    overheadPercent: newItem.overheadPercent,
                    sortOrder: newItem.sortOrder,
                  },
                  include: {
                    trade: true,
                    invoiceItems: true,
                  },
                })
                splitResults.push(created)
              }
              results.push({ action: 'split', result: splitResults })
              break

            default:
              throw new Error(`Unknown operation: ${operation.action}`)
          }
        } catch (error) {
          throw new Error(`Operation ${operation.action} failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      return results
    })

    // Get updated project estimates for response
    const updatedEstimates = await prisma.lineItem.findMany({
      where: {
        trade: {
          projectId,
        },
      },
      include: {
        trade: true,
        invoiceItems: {
          select: {
            id: true,
            invoiceId: true,
            totalPrice: true,
          },
        },
      },
      orderBy: [
        { trade: { sortOrder: 'asc' } },
        { sortOrder: 'asc' },
      ],
    })

    // Calculate project totals
    const projectTotals = updatedEstimates.reduce(
      (acc, item) => {
        const materialCost = Number(item.materialCostEst)
        const laborCost = Number(item.laborCostEst)
        const equipmentCost = Number(item.equipmentCostEst)
        const subtotal = materialCost + laborCost + equipmentCost
        const markup = subtotal * (Number(item.markupPercent) / 100)
        const overhead = subtotal * (Number(item.overheadPercent) / 100)
        const total = subtotal + markup + overhead

        acc.materialCost += materialCost
        acc.laborCost += laborCost
        acc.equipmentCost += equipmentCost
        acc.subtotal += subtotal
        acc.markup += markup
        acc.overhead += overhead
        acc.total += total

        return acc
      },
      {
        materialCost: 0,
        laborCost: 0,
        equipmentCost: 0,
        subtotal: 0,
        markup: 0,
        overhead: 0,
        total: 0,
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        operationsCompleted: result.length,
        results: result,
        updatedEstimates,
        projectTotals,
        message: `Successfully completed ${result.length} estimate operations`,
      },
    })
  } catch (error) {
    console.error('Error in bulk estimate operations:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process bulk estimate operations',
        details: error instanceof Error ? error.message : 'Unknown error',
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