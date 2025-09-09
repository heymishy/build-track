/**
 * API Route: /api/projects/[id]/cost-tracking
 * Get cost tracking data comparing estimates vs actual invoices
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
    const { searchParams } = new URL(request.url)
    const enhanced = searchParams.get('enhanced') === 'true'

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

    // Get project with trades, line items, and invoices
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        trades: {
          include: {
            lineItems: {
              include: {
                invoiceItems: {
                  include: {
                    invoice: {
                      select: {
                        id: true,
                        totalAmount: true,
                        status: true,
                        invoiceDate: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
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

    // Calculate cost tracking data for each trade
    const tradesWithCosts = project.trades.map(trade => {
      // Calculate estimated totals from line items
      const estimatedMaterial = trade.lineItems.reduce(
        (sum, item) => sum + Number(item.materialCostEst),
        0
      )
      const estimatedLabor = trade.lineItems.reduce(
        (sum, item) => sum + Number(item.laborCostEst),
        0
      )
      const estimatedEquipment = trade.lineItems.reduce(
        (sum, item) => sum + Number(item.equipmentCostEst),
        0
      )

      // Calculate markup and overhead
      const subtotal = estimatedMaterial + estimatedLabor + estimatedEquipment
      const markupTotal = trade.lineItems.reduce(
        (sum, item) => sum + (subtotal * Number(item.markupPercent)) / 100,
        0
      )
      const overheadTotal = trade.lineItems.reduce(
        (sum, item) => sum + (subtotal * Number(item.overheadPercent)) / 100,
        0
      )

      const estimatedTotal = subtotal + markupTotal + overheadTotal

      // Calculate actual spent from invoices
      const actualSpent = trade.lineItems.reduce((sum, lineItem) => {
        const lineItemActual = lineItem.invoiceItems.reduce((itemSum, invoiceItem) => {
          // Only count approved/paid invoices
          if (invoiceItem.invoice.status === 'APPROVED' || invoiceItem.invoice.status === 'PAID') {
            return itemSum + Number(invoiceItem.totalPrice)
          }
          return itemSum
        }, 0)
        return sum + lineItemActual
      }, 0)

      // Calculate variance and percentages
      const variance = actualSpent - estimatedTotal
      const variancePercent = estimatedTotal > 0 ? (variance / estimatedTotal) * 100 : 0
      const percentSpent = estimatedTotal > 0 ? (actualSpent / estimatedTotal) * 100 : 0
      const remainingBudget = Math.max(estimatedTotal - actualSpent, 0)

      // Determine status
      let status: 'under_budget' | 'on_budget' | 'over_budget' | 'no_estimate'
      if (estimatedTotal === 0) {
        status = 'no_estimate'
      } else if (Math.abs(variancePercent) <= 5) {
        status = 'on_budget'
      } else if (variance > 0) {
        status = 'over_budget'
      } else {
        status = 'under_budget'
      }

      // Process line items with actual costs
      const lineItemsWithActuals = trade.lineItems.map(lineItem => {
        const lineItemActual = lineItem.invoiceItems.reduce((sum, invoiceItem) => {
          if (invoiceItem.invoice.status === 'APPROVED' || invoiceItem.invoice.status === 'PAID') {
            return sum + Number(invoiceItem.totalPrice)
          }
          return sum
        }, 0)

        const lineItemEstimate =
          Number(lineItem.materialCostEst) +
          Number(lineItem.laborCostEst) +
          Number(lineItem.equipmentCostEst)
        const lineItemPercentComplete =
          lineItemEstimate > 0 ? Math.min((lineItemActual / lineItemEstimate) * 100, 100) : 0

        return {
          id: lineItem.id,
          description: lineItem.description,
          quantity: Number(lineItem.quantity),
          unit: lineItem.unit,
          materialCostEst: Number(lineItem.materialCostEst),
          laborCostEst: Number(lineItem.laborCostEst),
          equipmentCostEst: Number(lineItem.equipmentCostEst),
          markupPercent: Number(lineItem.markupPercent),
          overheadPercent: Number(lineItem.overheadPercent),
          totalEstimate: lineItemEstimate,
          actualSpent: lineItemActual,
          percentComplete: lineItemPercentComplete,
        }
      })

      return {
        id: trade.id,
        name: trade.name,
        description: trade.description,
        sortOrder: trade.sortOrder,
        lineItems: lineItemsWithActuals,
        actualSpent,
        estimatedTotal,
        remainingBudget,
        percentSpent,
        variance,
        variancePercent,
        status,
      }
    })

    // Calculate project-level summary
    const totalEstimated = tradesWithCosts.reduce((sum, trade) => sum + trade.estimatedTotal, 0)
    const totalActual = tradesWithCosts.reduce((sum, trade) => sum + trade.actualSpent, 0)
    const totalVariance = totalActual - totalEstimated
    const variancePercent = totalEstimated > 0 ? (totalVariance / totalEstimated) * 100 : 0
    const totalRemaining = Math.max(totalEstimated - totalActual, 0)
    const percentComplete = totalEstimated > 0 ? (totalActual / totalEstimated) * 100 : 0

    const tradesOnBudget = tradesWithCosts.filter(t => t.status === 'on_budget').length
    const tradesOverBudget = tradesWithCosts.filter(t => t.status === 'over_budget').length
    const tradesUnderBudget = tradesWithCosts.filter(t => t.status === 'under_budget').length

    const summary = {
      totalEstimated,
      totalActual,
      totalVariance,
      variancePercent,
      totalRemaining,
      tradesOnBudget,
      tradesOverBudget,
      tradesUnderBudget,
      percentComplete,
    }

    // Get milestones for this project
    const milestones = await prisma.milestone.findMany({
      where: { projectId },
      orderBy: { sortOrder: 'asc' },
    })

    const formattedMilestones = milestones.map(milestone => ({
      id: milestone.id,
      name: milestone.name,
      targetDate: milestone.targetDate.toISOString(),
      actualDate: milestone.actualDate?.toISOString(),
      paymentAmount: Number(milestone.paymentAmount),
      percentComplete: Number(milestone.percentComplete),
      status: milestone.status,
    }))

    // Calculate spend by category for widget compatibility
    const spendByCategory = await calculateSpendByCategory(projectId)

    // Format data for CostTrackingWidget compatibility
    const widgetData = {
      projectId: project.id,
      projectName: project.name,
      totalBudget: Number(project.totalBudget),
      totalSpend: totalActual,
      variance: totalVariance,
      variancePercent,
      currency: project.currency,
      milestones: formattedMilestones,
      spendByCategory,
    }

    // Return enhanced format if requested
    if (enhanced) {
      // Calculate enhanced metrics
      let overallStatus: 'ON_BUDGET' | 'OVER_BUDGET' | 'UNDER_BUDGET' | 'AT_RISK'
      if (Math.abs(variancePercent) <= 5) {
        overallStatus = 'ON_BUDGET'
      } else if (variancePercent > 0) {
        overallStatus = variancePercent > 15 ? 'OVER_BUDGET' : 'AT_RISK'
      } else {
        overallStatus = 'UNDER_BUDGET'
      }

      // Transform trades data for enhanced view
      const enhancedTrades = tradesWithCosts.map(trade => ({
        name: trade.name,
        estimatedCost: trade.estimatedTotal,
        actualCost: trade.actualSpent,
        variance: trade.variance,
        variancePercent: trade.variancePercent,
        lineItemCount: trade.lineItems.length,
        invoiceCount: trade.lineItems.reduce((sum, item) => {
          // Count unique invoices for this trade
          const uniqueInvoices = new Set()
          // This would need to be calculated from the invoice relationships
          return sum + 1 // Placeholder
        }, 0),
        lineItems: trade.lineItems.map(item => ({
          id: item.id,
          description: item.description,
          trade: trade.name,
          estimatedCost: item.totalEstimate,
          actualCost: item.actualSpent,
          variance: item.actualSpent - item.totalEstimate,
          variancePercent: item.totalEstimate > 0 ? ((item.actualSpent - item.totalEstimate) / item.totalEstimate) * 100 : 0,
          invoiceCount: 0, // Would need to calculate from invoice relationships
          unit: item.unit,
          quantity: item.quantity,
        }))
      }))

      const enhancedData = {
        projectId: project.id,
        projectName: project.name,
        totalBudget: Number(project.totalBudget),
        totalEstimatedCost: totalEstimated,
        totalActualCost: totalActual,
        totalVariance,
        totalVariancePercent: variancePercent,
        currency: project.currency,
        completionPercent: Math.round(percentComplete),
        trades: enhancedTrades,
        overallStatus,
        lastUpdated: new Date().toISOString(),
      }

      return NextResponse.json({
        success: true,
        data: enhancedData,
      })
    }

    // Return legacy format for backward compatibility
    return NextResponse.json({
      success: true,
      data: widgetData,
      trades: tradesWithCosts,
      summary,
      project: {
        id: project.id,
        name: project.name,
        totalBudget: Number(project.totalBudget),
        currency: project.currency,
      },
    })
  } catch (error) {
    console.error('Error fetching cost tracking data:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch cost tracking data',
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

async function calculateSpendByCategory(projectId: string) {
  // Get invoices for this project
  const invoices = await prisma.invoice.findMany({
    where: {
      projectId,
      status: { not: 'CANCELLED' },
    },
    include: {
      lineItems: true,
    },
  })

  // Get trades and line items for estimates
  const trades = await prisma.trade.findMany({
    where: {
      projectId,
    },
    include: {
      lineItems: true,
    },
  })

  // Group invoice spend by category
  const invoiceSpendByCategory = new Map<string, number>()

  invoices.forEach(invoice => {
    invoice.lineItems.forEach((lineItem: any) => {
      const category = lineItem.category || 'OTHER'
      const current = invoiceSpendByCategory.get(category) || 0
      invoiceSpendByCategory.set(category, current + Number(lineItem.totalPrice))
    })
  })

  // Group estimates by category
  const estimatesByCategory = new Map<string, number>()

  trades.forEach(trade => {
    trade.lineItems.forEach((lineItem: any) => {
      const materialCost = Number(lineItem.materialCostEst || 0)
      const laborCost = Number(lineItem.laborCostEst || 0)
      const equipmentCost = Number(lineItem.equipmentCostEst || 0)
      const quantity = Number(lineItem.quantity || 1)

      let totalEstimate = (materialCost + laborCost + equipmentCost) * quantity

      const markupPercent = Number(lineItem.markupPercent || 0)
      const overheadPercent = Number(lineItem.overheadPercent || 0)

      totalEstimate *= 1 + markupPercent / 100
      totalEstimate *= 1 + overheadPercent / 100

      const category = categorizeLineItem(lineItem.description)
      const current = estimatesByCategory.get(category) || 0
      estimatesByCategory.set(category, current + totalEstimate)
    })
  })

  // Combine data
  const allCategories = new Set([...invoiceSpendByCategory.keys(), ...estimatesByCategory.keys()])

  return Array.from(allCategories)
    .map(category => {
      const estimated = estimatesByCategory.get(category) || 0
      const actual = invoiceSpendByCategory.get(category) || 0
      const variance = actual - estimated

      return {
        category,
        estimated,
        actual,
        variance,
      }
    })
    .filter(item => item.estimated > 0 || item.actual > 0)
}

function categorizeLineItem(description: string): string {
  const desc = description.toLowerCase()

  if (desc.includes('labor') || desc.includes('install') || desc.includes('work')) {
    return 'LABOR'
  }
  if (desc.includes('equipment') || desc.includes('tool') || desc.includes('machinery')) {
    return 'EQUIPMENT'
  }
  if (
    desc.includes('material') ||
    desc.includes('supply') ||
    desc.includes('concrete') ||
    desc.includes('timber') ||
    desc.includes('steel') ||
    desc.includes('pipe')
  ) {
    return 'MATERIAL'
  }

  return 'OTHER'
}

export { protectedGET as GET }
