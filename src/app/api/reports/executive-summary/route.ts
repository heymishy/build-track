/**
 * API Route: /api/reports/executive-summary
 * Generate executive summary reports
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function GET(
  request: NextRequest,
  user: AuthUser
) {
  try {
    const { searchParams } = new URL(request.url)
    const projectIds = searchParams.get('projects')?.split(',').filter(Boolean)

    let projects
    
    if (user.role === 'ADMIN') {
      // Admins can see all projects
      projects = await prisma.project.findMany({
        where: projectIds ? { id: { in: projectIds } } : undefined,
        include: {
          trades: {
            include: {
              lineItems: true
            }
          },
          invoices: {
            include: {
              lineItems: true
            }
          },
          milestones: true,
          projectUsers: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true
                }
              }
            }
          }
        }
      })
    } else {
      // Regular users can only see their assigned projects
      projects = await prisma.project.findMany({
        where: {
          AND: [
            projectIds ? { id: { in: projectIds } } : {},
            {
              projectUsers: {
                some: {
                  userId: user.id
                }
              }
            }
          ]
        },
        include: {
          trades: {
            include: {
              lineItems: true
            }
          },
          invoices: {
            include: {
              lineItems: true
            }
          },
          milestones: true,
          projectUsers: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true
                }
              }
            }
          }
        }
      })
    }

    // Calculate summary statistics
    const totalProjects = projects.length
    const totalBudget = projects.reduce((sum, p) => sum + (p.totalBudget || 0), 0)
    const totalSpent = projects.reduce((sum, p) => {
      const tradeSpent = p.trades.reduce((tSum, t) => {
        return tSum + t.lineItems.reduce((lSum, l) => lSum + (l.actualCost || 0), 0)
      }, 0)
      return sum + tradeSpent
    }, 0)

    const activeProjects = projects.filter(p => p.status === 'IN_PROGRESS').length
    const completedProjects = projects.filter(p => p.status === 'COMPLETED').length
    const onHoldProjects = projects.filter(p => p.status === 'ON_HOLD').length

    const totalInvoices = projects.reduce((sum, p) => sum + p.invoices.length, 0)
    const totalInvoiceAmount = projects.reduce((sum, p) => {
      return sum + p.invoices.reduce((iSum, i) => iSum + (i.totalAmount || 0), 0)
    }, 0)

    const totalMilestones = projects.reduce((sum, p) => sum + p.milestones.length, 0)
    const completedMilestones = projects.reduce((sum, p) => {
      return sum + p.milestones.filter(m => m.status === 'COMPLETED').length
    }, 0)

    // Project performance analysis
    const projectPerformance = projects.map(project => {
      const tradeBudget = project.trades.reduce((sum, t) => sum + (t.budget || 0), 0)
      const tradeSpent = project.trades.reduce((sum, t) => {
        return sum + t.lineItems.reduce((lSum, l) => lSum + (l.actualCost || 0), 0)
      }, 0)
      
      const budgetUsedPercent = tradeBudget > 0 ? (tradeSpent / tradeBudget) * 100 : 0
      const isOverBudget = tradeSpent > tradeBudget

      const milestonesComplete = project.milestones.filter(m => m.status === 'COMPLETED').length
      const milestonesTotal = project.milestones.length
      const milestoneProgress = milestonesTotal > 0 ? (milestonesComplete / milestonesTotal) * 100 : 0

      let healthScore = 100
      if (isOverBudget) healthScore -= 40
      else if (budgetUsedPercent > 85) healthScore -= 20
      if (project.status === 'ON_HOLD') healthScore -= 30
      if (milestoneProgress < 50) healthScore -= 20

      return {
        id: project.id,
        name: project.name,
        status: project.status,
        budget: project.totalBudget || 0,
        spent: tradeSpent,
        budgetUsedPercent,
        isOverBudget,
        milestoneProgress,
        healthScore: Math.max(0, healthScore),
        invoiceCount: project.invoices.length,
        tradeCount: project.trades.length
      }
    })

    // Risk analysis
    const highRiskProjects = projectPerformance.filter(p => p.healthScore < 60).length
    const overBudgetProjects = projectPerformance.filter(p => p.isOverBudget).length
    const avgHealthScore = projectPerformance.length > 0 
      ? projectPerformance.reduce((sum, p) => sum + p.healthScore, 0) / projectPerformance.length
      : 100

    // Financial trends (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const recentInvoices = await prisma.invoice.findMany({
      where: {
        createdAt: {
          gte: sixMonthsAgo
        },
        projectId: projectIds ? { in: projectIds } : undefined
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Group invoices by month
    const monthlyTrends = Array.from({ length: 6 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const month = date.toISOString().slice(0, 7) // YYYY-MM format
      
      const monthInvoices = recentInvoices.filter(inv => 
        inv.createdAt.toISOString().slice(0, 7) === month
      )
      
      return {
        month,
        monthName: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        invoiceCount: monthInvoices.length,
        totalAmount: monthInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
        avgAmount: monthInvoices.length > 0 
          ? monthInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0) / monthInvoices.length
          : 0
      }
    }).reverse()

    const summaryData = {
      overview: {
        totalProjects,
        totalBudget,
        totalSpent,
        budgetUtilization: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
        avgHealthScore,
        totalInvoices,
        totalInvoiceAmount,
        totalMilestones,
        completedMilestones
      },
      projectStatus: {
        active: activeProjects,
        completed: completedProjects,
        onHold: onHoldProjects,
        planning: projects.filter(p => p.status === 'PLANNING').length,
        cancelled: projects.filter(p => p.status === 'CANCELLED').length
      },
      riskAnalysis: {
        highRiskProjects,
        overBudgetProjects,
        avgHealthScore,
        riskDistribution: {
          low: projectPerformance.filter(p => p.healthScore >= 80).length,
          medium: projectPerformance.filter(p => p.healthScore >= 60 && p.healthScore < 80).length,
          high: projectPerformance.filter(p => p.healthScore < 60).length
        }
      },
      projectPerformance,
      financialTrends: monthlyTrends,
      generatedAt: new Date(),
      generatedBy: user.name || user.email
    }

    return NextResponse.json({
      success: true,
      data: summaryData
    })

  } catch (error) {
    console.error('Error generating executive summary:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate executive summary'
      },
      { status: 500 }
    )
  }
}

// Apply authentication middleware
const protectedGET = withAuth(GET, {
  resource: 'reports',
  action: 'read',
  requireAuth: true,
})

export { protectedGET as GET }