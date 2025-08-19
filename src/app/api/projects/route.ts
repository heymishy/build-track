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
    // Get projects where user is a member or admin can see all
    const projects = await prisma.project.findMany({
      where:
        user.role === 'ADMIN'
          ? {}
          : {
              users: {
                some: {
                  userId: user.id,
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

    return Response.json({
      success: true,
      projects,
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
    const { name, description, totalBudget, startDate, estimatedEndDate } = body

    // Validate required fields
    if (!name || !totalBudget) {
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
        totalBudget,
        startDate: startDate ? new Date(startDate) : null,
        estimatedEndDate: estimatedEndDate ? new Date(estimatedEndDate) : null,
        status: 'PLANNING',
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
        project,
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
