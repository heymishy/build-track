/**
 * API Route: /api/projects/[id]/analytics
 * Advanced project analytics with trends, forecasting, and alerts
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

interface TimeRangeQuery {
  startDate: Date
  endDate: Date
}

function getTimeRange(timeRange: string): TimeRangeQuery {
  const endDate = new Date()
  let startDate: Date

  switch (timeRange) {
    case '30d':
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case '90d':
      startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case '6m':
      startDate = new Date(endDate.getTime() - 180 * 24 * 60 * 60 * 1000)
      break
    case '1y':
      startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000)
      break
    default:
      startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000)
  }

  return { startDate, endDate }
}

async function calculateFinancialTrends(projectId: string, timeRange: TimeRangeQuery) {
  // Get invoices over time
  const invoices = await prisma.invoice.findMany({
    where: {
      projectId,
      invoiceDate: {
        gte: timeRange.startDate,
        lte: timeRange.endDate,
      },
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
    orderBy: { invoiceDate: 'asc' },
  })

  // Group by month and calculate trends
  const monthlyData = new Map<string, { estimated: number; actual: number; invoiceCount: number }>()

  invoices.forEach(invoice => {
    const monthKey = invoice.invoiceDate?.toISOString().slice(0, 7) || ''
    if (!monthKey) return

    const current = monthlyData.get(monthKey) || { estimated: 0, actual: 0, invoiceCount: 0 }

    // Calculate actual spent
    const actualAmount = Number(invoice.totalAmount)

    // Calculate estimated amount from line items
    const estimatedAmount = invoice.lineItems.reduce((sum, item) => {
      const lineItem = item.lineItem
      if (!lineItem) return sum

      const estimate =
        Number(lineItem.materialCostEst) +
        Number(lineItem.laborCostEst) +
        Number(lineItem.equipmentCostEst)
      return sum + estimate
    }, 0)

    monthlyData.set(monthKey, {
      estimated: current.estimated + estimatedAmount,
      actual: current.actual + actualAmount,
      invoiceCount: current.invoiceCount + 1,
    })
  })

  // Convert to trend data with cumulative values
  const trends = Array.from(monthlyData.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce((acc, [date, data], index) => {
      const prevCumulative =
        index > 0 ? acc[index - 1].cumulative : { estimated: 0, actual: 0, variance: 0 }

      const cumulative = {
        estimated: prevCumulative.estimated + data.estimated,
        actual: prevCumulative.actual + data.actual,
        variance: prevCumulative.actual + data.actual - (prevCumulative.estimated + data.estimated),
      }

      acc.push({
        date,
        estimated: data.estimated,
        actual: data.actual,
        variance: data.actual - data.estimated,
        invoiceCount: data.invoiceCount,
        cumulative,
      })

      return acc
    }, [] as any[])

  return trends
}

async function calculateCashFlowProjections(projectId: string) {
  // Get project milestones
  const milestones = await prisma.milestone.findMany({
    where: { projectId },
    orderBy: { targetDate: 'asc' },
  })

  // Get pending invoices
  const pendingInvoices = await prisma.invoice.findMany({
    where: {
      projectId,
      status: 'PENDING',
    },
  })

  // Create 6-month projection
  const projections = []
  const currentDate = new Date()

  for (let i = 0; i < 6; i++) {
    const projectionDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1)
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + i + 1, 0)

    // Calculate milestone payments due this month
    const milestonePayments = milestones
      .filter(m => {
        const targetDate = new Date(m.targetDate)
        return targetDate >= projectionDate && targetDate <= nextMonth
      })
      .reduce((sum, m) => sum + Number(m.paymentAmount), 0)

    // Calculate committed spending (approved invoices)
    const committed = pendingInvoices
      .filter(inv => {
        const invoiceDate = inv.invoiceDate || new Date()
        return invoiceDate >= projectionDate && invoiceDate <= nextMonth
      })
      .reduce((sum, inv) => sum + Number(inv.totalAmount), 0)

    projections.push({
      date: projectionDate.toISOString().slice(0, 7),
      projected: committed + milestonePayments * 0.8, // 80% likelihood
      committed,
      remaining: milestonePayments - committed,
      milestonePayments,
    })
  }

  return projections
}

async function calculateTradePerformance(projectId: string) {
  const trades = await prisma.trade.findMany({
    where: { projectId },
    include: {
      lineItems: {
        include: {
          invoiceItems: {
            include: {
              invoice: {
                select: {
                  status: true,
                  totalAmount: true,
                  invoiceDate: true,
                },
              },
            },
          },
        },
      },
    },
  })

  return trades.map(trade => {
    // Calculate estimated total
    const estimatedTotal = trade.lineItems.reduce((sum, item) => {
      return (
        sum +
        Number(item.materialCostEst) +
        Number(item.laborCostEst) +
        Number(item.equipmentCostEst)
      )
    }, 0)

    // Calculate actual spent
    const actualSpent = trade.lineItems.reduce((sum, lineItem) => {
      return (
        sum +
        lineItem.invoiceItems
          .filter(item => item.invoice.status === 'APPROVED' || item.invoice.status === 'PAID')
          .reduce((itemSum, item) => itemSum + Number(item.totalPrice), 0)
      )
    }, 0)

    const variance = actualSpent - estimatedTotal
    const variancePercent = estimatedTotal > 0 ? (variance / estimatedTotal) * 100 : 0
    const efficiency = estimatedTotal > 0 ? (estimatedTotal / actualSpent) * 100 : 100

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high'
    if (Math.abs(variancePercent) <= 10) {
      riskLevel = 'low'
    } else if (Math.abs(variancePercent) <= 25) {
      riskLevel = 'medium'
    } else {
      riskLevel = 'high'
    }

    // Determine trend (simplified - could be enhanced with historical data)
    let trend: 'improving' | 'stable' | 'declining'
    if (variancePercent < -10) {
      trend = 'improving' // Under budget
    } else if (variancePercent > 15) {
      trend = 'declining' // Over budget
    } else {
      trend = 'stable'
    }

    return {
      id: trade.id,
      name: trade.name,
      estimatedTotal,
      actualSpent,
      variance,
      variancePercent,
      efficiency,
      riskLevel,
      trend,
    }
  })
}

async function generateAlerts(projectId: string, tradePerformance: any[]) {
  const alerts = []
  const currentDate = new Date()

  // Budget overrun alerts
  tradePerformance.forEach(trade => {
    if (trade.variancePercent > 20) {
      alerts.push({
        id: `budget_overrun_${trade.id}`,
        type: 'budget_overrun' as const,
        severity: trade.variancePercent > 50 ? ('critical' as const) : ('high' as const),
        title: `Budget Overrun: ${trade.name}`,
        description: `Trade is ${Math.abs(trade.variancePercent).toFixed(1)}% over budget`,
        trade: trade.name,
        amount: Math.abs(trade.variance),
        date: currentDate.toISOString(),
        actionRequired: trade.variancePercent > 30,
      })
    }
  })

  // Check for overdue milestones
  const overdueMilestones = await prisma.milestone.findMany({
    where: {
      projectId,
      status: { not: 'COMPLETED' },
      targetDate: { lt: currentDate },
    },
  })

  overdueMilestones.forEach(milestone => {
    const daysOverdue = Math.ceil(
      (currentDate.getTime() - new Date(milestone.targetDate).getTime()) / (1000 * 60 * 60 * 24)
    )

    alerts.push({
      id: `schedule_delay_${milestone.id}`,
      type: 'schedule_delay' as const,
      severity:
        daysOverdue > 30
          ? ('critical' as const)
          : daysOverdue > 14
            ? ('high' as const)
            : ('medium' as const),
      title: `Overdue Milestone: ${milestone.name}`,
      description: `Milestone is ${daysOverdue} days overdue`,
      amount: Number(milestone.paymentAmount),
      date: milestone.targetDate.toISOString(),
      actionRequired: true,
    })
  })

  // Check for high-value pending invoices
  const highValuePending = await prisma.invoice.findMany({
    where: {
      projectId,
      status: 'PENDING',
      totalAmount: { gte: 10000 }, // $10k+ invoices
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  highValuePending.forEach(invoice => {
    alerts.push({
      id: `payment_due_${invoice.id}`,
      type: 'payment_due' as const,
      severity: 'medium' as const,
      title: `High-Value Invoice Pending`,
      description: `Invoice #${invoice.invoiceNumber || invoice.id.slice(0, 8)} requires approval`,
      amount: Number(invoice.totalAmount),
      date: invoice.createdAt.toISOString(),
      actionRequired: true,
    })
  })

  return alerts.sort((a, b) => {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
    return severityOrder[b.severity] - severityOrder[a.severity]
  })
}

async function GET(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const url = new URL(request.url)
    const timeRange = url.searchParams.get('timeRange') || '90d'

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

    // Get project details
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        totalBudget: true,
        currency: true,
        status: true,
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

    const timeRangeQuery = getTimeRange(timeRange)

    // Calculate all analytics data
    const [trends, cashFlow, tradePerformance] = await Promise.all([
      calculateFinancialTrends(projectId, timeRangeQuery),
      calculateCashFlowProjections(projectId),
      calculateTradePerformance(projectId),
    ])

    const alerts = await generateAlerts(projectId, tradePerformance)

    // Calculate KPIs
    const totalEstimated = tradePerformance.reduce((sum, trade) => sum + trade.estimatedTotal, 0)
    const totalActual = tradePerformance.reduce((sum, trade) => sum + trade.actualSpent, 0)
    const totalVariance = totalActual - totalEstimated
    const averageVariance =
      tradePerformance.length > 0
        ? tradePerformance.reduce((sum, trade) => sum + Math.abs(trade.variancePercent), 0) /
          tradePerformance.length
        : 0

    const kpis = {
      profitMargin:
        totalEstimated > 0 ? ((totalEstimated - totalActual) / totalEstimated) * 100 : 0,
      costEfficiency:
        tradePerformance.reduce((sum, trade) => sum + trade.efficiency, 0) /
        (tradePerformance.length || 1),
      scheduleVariance: 0, // Could be enhanced with milestone tracking
      budgetUtilization:
        Number(project.totalBudget) > 0 ? (totalActual / Number(project.totalBudget)) * 100 : 0,
      riskScore: averageVariance,
    }

    const summary = {
      totalBudget: Number(project.totalBudget),
      totalSpent: totalActual,
      projectedFinal: totalActual + (totalEstimated - totalActual) * 1.1, // Add 10% buffer
      remainingBudget: Math.max(0, Number(project.totalBudget) - totalActual),
      averageVariance,
      completionPercent: totalEstimated > 0 ? (totalActual / totalEstimated) * 100 : 0,
    }

    return NextResponse.json({
      success: true,
      data: {
        trends,
        cashFlow,
        tradePerformance,
        alerts,
        kpis,
        summary,
        project: {
          id: project.id,
          name: project.name,
          currency: project.currency,
          status: project.status,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching project analytics:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch project analytics',
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
