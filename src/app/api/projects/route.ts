/**
 * Projects API route with authentication middleware
 * GET /api/projects - List projects user has access to
 * POST /api/projects - Create a new project
 */

import { NextRequest } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function GET(request: NextRequest, user: AuthUser) {
  try {
    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    // Build query filters
    const whereClause: {
      AND: Array<Record<string, unknown>>
    } = {
      AND: [],
    }

    // Add user access control
    if (user.role === 'ADMIN') {
      // Admin can see all projects
    } else {
      whereClause.AND.push({
        users: {
          some: {
            userId: user.id,
          },
        },
      })
    }

    // Add status filter if provided
    if (status) {
      whereClause.AND.push({ status })
    }

    // Add search filter if provided
    if (search) {
      whereClause.AND.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      } as any)
    }

    // Get projects where user is a member or admin can see all
    const projects = await prisma.project.findMany({
      where: whereClause.AND.length > 0 ? whereClause : undefined,
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        invoices: {
          select: {
            id: true,
            totalAmount: true,
            gstAmount: true,
            status: true,
          },
        },
        milestones: {
          select: {
            id: true,
            paymentAmount: true,
            status: true,
            percentComplete: true,
          },
        },
        _count: {
          select: {
            trades: true,
            invoices: true,
            milestones: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    // Map database fields to API fields with calculated statistics
    const mappedProjects = projects.map(project => {
      const totalInvoiceAmount = project.invoices.reduce(
        (sum, invoice) => sum + Number(invoice.totalAmount),
        0
      )
      const paidInvoiceAmount = project.invoices
        .filter(invoice => invoice.status === 'PAID')
        .reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0)
      const pendingInvoiceAmount = project.invoices
        .filter(invoice => invoice.status === 'PENDING')
        .reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0)

      const totalMilestoneAmount = project.milestones.reduce(
        (sum, milestone) => sum + Number(milestone.paymentAmount),
        0
      )
      const completedMilestones = project.milestones.filter(m => m.status === 'COMPLETED').length

      const budgetUsedPercent =
        Number(project.totalBudget) > 0
          ? (totalInvoiceAmount / Number(project.totalBudget)) * 100
          : 0

      return {
        ...project,
        budget: project.totalBudget,
        expectedEndDate: project.estimatedEndDate,
        actualCost: totalInvoiceAmount,
        stats: {
          totalInvoices: project._count.invoices,
          totalTrades: project._count.trades,
          totalMilestones: project._count.milestones,
          completedMilestones,
          totalInvoiceAmount,
          paidInvoiceAmount,
          pendingInvoiceAmount,
          totalMilestoneAmount,
          budgetUsed: totalInvoiceAmount,
          budgetRemaining: Number(project.totalBudget) - totalInvoiceAmount,
          budgetUsedPercent: Math.round(budgetUsedPercent * 100) / 100,
          isOverBudget: totalInvoiceAmount > Number(project.totalBudget),
        },
      }
    })

    return Response.json({
      success: true,
      projects: mappedProjects,
    })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return Response.json(
      {
        success: false,
        error: 'Failed to fetch projects',
      },
      { status: 500 }
    )
  }
}

async function POST(request: NextRequest, user: AuthUser) {
  try {
    const body = await request.json()
    const { name, description, budget, startDate, expectedEndDate, status } = body

    // Validate required fields
    if (!name || !budget) {
      return Response.json(
        {
          success: false,
          error: 'Project name and budget are required',
        },
        { status: 400 }
      )
    }

    // Create project with user as owner
    const project = await prisma.project.create({
      data: {
        name,
        description,
        totalBudget: budget, // Map budget to totalBudget
        startDate: startDate ? new Date(startDate) : null,
        estimatedEndDate: expectedEndDate ? new Date(expectedEndDate) : null, // Map expectedEndDate to estimatedEndDate
        status: status || 'PLANNING',
        users: {
          create: {
            userId: user.id,
            role: 'OWNER',
          },
        },
      },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    })

    return Response.json(
      {
        success: true,
        project: {
          ...project,
          budget: project.totalBudget, // Map back for consistent API
          expectedEndDate: project.estimatedEndDate,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating project:', error)
    return Response.json(
      {
        success: false,
        error: 'Failed to create project',
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
  action: 'create',
  requireAuth: true,
})

export { protectedGET as GET, protectedPOST as POST }
