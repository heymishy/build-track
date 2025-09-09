/**
 * Analytics API route
 * GET /api/analytics - Get project analytics and spending reports
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function GET(request: NextRequest, user: AuthUser) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '30d'
    const projectId = searchParams.get('projectId')

    // Calculate date range
    const now = new Date()
    const daysBack =
      timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)

    // Build where clause for user access control
    interface ProjectWhereClause {
      AND?: Array<{
        id?: string
        users?: {
          some: {
            userId: string
          }
        }
      }>
    }

    const whereClause: ProjectWhereClause = {
      AND: [],
    }

    // Add user access control (same as projects API)
    if (user.role !== 'ADMIN') {
      whereClause.AND.push({
        users: {
          some: {
            userId: user.id,
          },
        },
      })
    }

    // Add project filter if specified
    if (projectId) {
      whereClause.AND.push({ id: projectId })
    }

    // Get projects with detailed data
    const projects = await prisma.project.findMany({
      where: whereClause.AND.length > 0 ? whereClause : undefined,
      include: {
        invoices: {
          where: {
            createdAt: {
              gte: startDate,
            },
          },
          include: {
            lineItems: true,
          },
        },
        milestones: true,
        trades: {
          include: {
            lineItems: true,
          },
        },
        _count: {
          select: {
            invoices: true,
            milestones: true,
            trades: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    // Calculate analytics
    const totalProjects = projects.length
    const totalBudget = projects.reduce((sum, p) => sum + Number(p.totalBudget), 0)
    const totalSpent = projects.reduce(
      (sum, p) =>
        sum +
        p.invoices.reduce((invoiceSum, invoice) => invoiceSum + Number(invoice.totalAmount), 0),
      0
    )

    const avgBudgetVariance = totalBudget > 0 ? ((totalSpent - totalBudget) / totalBudget) * 100 : 0

    const projectsOverBudget = projects.filter(p => {
      const spent = p.invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
      return spent > Number(p.totalBudget)
    }).length

    const completedProjects = projects.filter(p => p.status === 'COMPLETED').length
    const activeProjects = projects.filter(p =>
      ['PLANNING', 'IN_PROGRESS'].includes(p.status)
    ).length

    const allInvoices = projects.flatMap(p => p.invoices)
    const totalInvoices = allInvoices.length
    const avgInvoiceValue = totalInvoices > 0 ? totalSpent / totalInvoices : 0

    // Calculate average project duration (simplified)
    const completedProjectsWithDates = projects.filter(
      p => p.status === 'COMPLETED' && p.startDate && p.actualEndDate
    )
    const avgProjectDuration =
      completedProjectsWithDates.length > 0
        ? completedProjectsWithDates.reduce((sum, p) => {
            const duration = new Date(p.actualEndDate!).getTime() - new Date(p.startDate!).getTime()
            return sum + duration / (1000 * 60 * 60 * 24) // days
          }, 0) / completedProjectsWithDates.length
        : 180 // default 6 months

    // Monthly spending (simplified - would need more complex grouping in production)
    const monthlySpending = generateMonthlySpending(allInvoices, startDate, now)

    // Top vendors
    const vendorSpending = new Map<string, { total: number; count: number }>()
    allInvoices.forEach(invoice => {
      const vendor = invoice.supplierName
      const current = vendorSpending.get(vendor) || { total: 0, count: 0 }
      vendorSpending.set(vendor, {
        total: current.total + Number(invoice.totalAmount),
        count: current.count + 1,
      })
    })

    const topVendors = Array.from(vendorSpending.entries())
      .map(([name, data]) => ({
        name,
        totalSpent: data.total,
        invoiceCount: data.count,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5)

    // Budget variance by project
    const budgetVarianceByProject = projects
      .map(project => {
        const spent = project.invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
        const budget = Number(project.totalBudget)
        const variance = budget > 0 ? ((spent - budget) / budget) * 100 : 0

        return {
          name: project.name,
          budgetUsed: spent,
          budgetTotal: budget,
          variance,
          status: project.status,
        }
      })
      .slice(0, 10)

    // Spending by category (simplified)
    const spendingByCategory = calculateSpendingByCategory(allInvoices)

    const analyticsData = {
      totalProjects,
      totalBudget,
      totalSpent,
      avgBudgetVariance,
      projectsOverBudget,
      avgProjectDuration,
      completedProjects,
      activeProjects,
      totalInvoices,
      avgInvoiceValue,
      monthlySpending,
      topVendors,
      budgetVarianceByProject,
      spendingByCategory,
    }

    return NextResponse.json({
      success: true,
      data: analyticsData,
      timeRange,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch analytics data',
      },
      { status: 500 }
    )
  }
}

interface InvoiceWithAmount {
  invoiceDate: string | Date
  totalAmount: number | string
  supplierName: string
}

function generateMonthlySpending(invoices: InvoiceWithAmount[], startDate: Date, endDate: Date) {
  const months: { [key: string]: number } = {}

  // Initialize months
  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    const monthKey = currentDate.toLocaleDateString('en-US', { month: 'short' })
    months[monthKey] = 0
    currentDate.setMonth(currentDate.getMonth() + 1)
  }

  // Aggregate spending by month
  invoices.forEach(invoice => {
    const month = new Date(invoice.invoiceDate).toLocaleDateString('en-US', { month: 'short' })
    if (months.hasOwnProperty(month)) {
      months[month] += Number(invoice.totalAmount)
    }
  })

  // Convert to array format with budget estimates
  return Object.entries(months).map(([month, amount]) => ({
    month,
    amount,
    budget: amount * 1.1, // Assume budget is 10% higher than actual for demo
  }))
}

function calculateSpendingByCategory(invoices: InvoiceWithAmount[]) {
  // Simplified categorization based on invoice line items
  const categories = {
    Materials: 0,
    Labor: 0,
    Equipment: 0,
    'Permits & Fees': 0,
    Other: 0,
  }

  const totalSpending = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0)

  // Simple heuristic categorization (in production, this would use line item categories)
  invoices.forEach(invoice => {
    const amount = Number(invoice.totalAmount)
    const vendor = invoice.supplierName.toLowerCase()

    if (vendor.includes('supply') || vendor.includes('material') || vendor.includes('lumber')) {
      categories['Materials'] += amount
    } else if (vendor.includes('electric') || vendor.includes('plumb') || vendor.includes('hvac')) {
      categories['Labor'] += amount
    } else if (
      vendor.includes('rental') ||
      vendor.includes('tool') ||
      vendor.includes('equipment')
    ) {
      categories['Equipment'] += amount
    } else if (vendor.includes('permit') || vendor.includes('fee') || vendor.includes('city')) {
      categories['Permits & Fees'] += amount
    } else {
      categories['Other'] += amount
    }
  })

  return Object.entries(categories)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalSpending > 0 ? (amount / totalSpending) * 100 : 0,
    }))
    .filter(cat => cat.amount > 0)
}

// Apply authentication middleware
const protectedGET = withAuth(GET, {
  resource: 'projects',
  action: 'read',
  requireAuth: true,
})

export { protectedGET as GET }
