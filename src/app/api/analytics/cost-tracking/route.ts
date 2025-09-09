/**
 * API Route: /api/analytics/cost-tracking
 * Provides cost tracking data for all projects
 */

import { NextRequest } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function GET(request: NextRequest, user: AuthUser) {
  try {
    const { searchParams } = new URL(request.url)
    const enhanced = searchParams.get('enhanced') === 'true'

    // Get projects user has access to
    const projectsQuery =
      user.role === 'ADMIN'
        ? { include: { users: true } }
        : {
            where: {
              users: {
                some: { userId: user.id },
              },
            },
            include: { users: true },
          }

    const projects = await prisma.project.findMany(projectsQuery)

    if (projects.length === 0) {
      return Response.json({
        success: true,
        data: [],
      })
    }

    const projectIds = projects.map(p => p.id)

    // Get all invoices for these projects
    const invoices = await prisma.invoice.findMany({
      where: {
        projectId: { in: projectIds },
      },
      include: {
        lineItems: true,
      },
    })

    // Get all trades and line items (estimates) for these projects
    const trades = await prisma.trade.findMany({
      where: {
        projectId: { in: projectIds },
      },
      include: {
        lineItems: true,
      },
    })

    // Get milestones for these projects
    const milestones = await prisma.milestone.findMany({
      where: {
        projectId: { in: projectIds },
      },
      orderBy: { sortOrder: 'asc' },
    })

    // Calculate cost tracking data for each project
    const costTrackingData = await Promise.all(
      projects.map(async project => {
        const projectInvoices = invoices.filter(i => i.projectId === project.id)
        const projectTrades = trades.filter(t => t.projectId === project.id)
        const projectMilestones = milestones.filter(m => m.projectId === project.id)

        // Calculate total spend from invoices
        const totalSpend = projectInvoices.reduce((sum, invoice) => {
          return sum + Number(invoice.totalAmount)
        }, 0)

        // Calculate total estimated cost from line items
        const totalBudget = Number(project.totalBudget)

        // Calculate variance
        const variance = totalSpend - totalBudget
        const variancePercent = totalBudget > 0 ? (variance / totalBudget) * 100 : 0

        // Calculate spend by category
        const spendByCategory = await calculateSpendByCategory(projectInvoices, projectTrades)

        // Format milestones
        const formattedMilestones = projectMilestones.map(milestone => ({
          id: milestone.id,
          name: milestone.name,
          targetDate: milestone.targetDate.toISOString(),
          actualDate: milestone.actualDate?.toISOString(),
          paymentAmount: Number(milestone.paymentAmount),
          percentComplete: Number(milestone.percentComplete),
          status: milestone.status,
        }))

        return {
          projectId: project.id,
          projectName: project.name,
          totalBudget,
          totalSpend,
          variance,
          variancePercent,
          currency: project.currency,
          milestones: formattedMilestones,
          spendByCategory,
        }
      })
    )

    return Response.json({
      success: true,
      data: costTrackingData,
    })
  } catch (error) {
    console.error('Cost tracking analytics error:', error)
    return Response.json(
      { success: false, error: 'Failed to fetch cost tracking data' },
      { status: 500 }
    )
  }
}

async function calculateSpendByCategory(invoices: any[], trades: any[]) {
  // Group invoice line items by category
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
      // Calculate total estimated cost for this line item
      const materialCost = Number(lineItem.materialCostEst || 0)
      const laborCost = Number(lineItem.laborCostEst || 0)
      const equipmentCost = Number(lineItem.equipmentCostEst || 0)
      const quantity = Number(lineItem.quantity || 1)

      let totalEstimate = (materialCost + laborCost + equipmentCost) * quantity

      // Apply markup and overhead
      const markupPercent = Number(lineItem.markupPercent || 0)
      const overheadPercent = Number(lineItem.overheadPercent || 0)

      totalEstimate *= 1 + markupPercent / 100
      totalEstimate *= 1 + overheadPercent / 100

      // Categorize based on the line item description or default to MATERIAL
      const category = categorizeLineItem(lineItem.description)
      const current = estimatesByCategory.get(category) || 0
      estimatesByCategory.set(category, current + totalEstimate)
    })
  })

  // Combine data from both maps
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

// Apply authentication middleware
const protectedGET = withAuth(GET, {
  resource: 'projects',
  action: 'read',
  requireAuth: true,
})

export { protectedGET as GET }
