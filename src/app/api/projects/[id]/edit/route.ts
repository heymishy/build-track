/**
 * API Route: PUT /api/projects/[id]/edit
 * Edit/update project details
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

interface EditProjectRequest {
  name: string
  description?: string
  totalBudget?: number
  currency?: string
  startDate?: string
  estimatedEndDate?: string
  status?: 'PLANNING' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
}

async function PUT(request: NextRequest, user: AuthUser, context?: { params: { id: string } }) {
  try {
    // Get project ID from URL pathname since context.params might be undefined
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const projectId = pathSegments[pathSegments.length - 2] // Get the ID from /api/projects/{id}/edit

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project ID is required',
        },
        { status: 400 }
      )
    }
    const body: EditProjectRequest = await request.json()

    console.log(`Editing project: ${projectId}`, body)

    // Verify user has access to edit this project
    if (user.role !== 'ADMIN') {
      const projectAccess = await prisma.projectUser.findFirst({
        where: {
          userId: user.id,
          projectId,
          role: { in: ['OWNER', 'CONTRACTOR'] }, // Owners and contractors can edit
        },
      })

      if (!projectAccess) {
        return NextResponse.json(
          {
            success: false,
            error: 'You do not have permission to edit this project',
          },
          { status: 403 }
        )
      }
    }

    // Validate input
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project name is required',
        },
        { status: 400 }
      )
    }

    if (body.totalBudget !== undefined && body.totalBudget < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Total budget cannot be negative',
        },
        { status: 400 }
      )
    }

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!existingProject) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project not found',
        },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {
      name: body.name.trim(),
      description: body.description?.trim() || null,
      updatedAt: new Date(),
    }

    // Only update fields that are provided
    if (body.totalBudget !== undefined) {
      updateData.totalBudget = body.totalBudget
    }
    if (body.currency) {
      updateData.currency = body.currency
    }
    if (body.startDate) {
      updateData.startDate = new Date(body.startDate)
    }
    if (body.estimatedEndDate) {
      updateData.estimatedEndDate = new Date(body.estimatedEndDate)
    }
    if (body.status) {
      updateData.status = body.status
    }

    // Update the project
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        trades: {
          include: {
            lineItems: true,
          },
        },
        milestones: true,
      },
    })

    console.log(`Successfully updated project ${projectId}`)

    return NextResponse.json({
      success: true,
      message: 'Project updated successfully',
      project: {
        id: updatedProject.id,
        name: updatedProject.name,
        description: updatedProject.description,
        totalBudget: updatedProject.totalBudget,
        currency: updatedProject.currency,
        startDate: updatedProject.startDate,
        estimatedEndDate: updatedProject.estimatedEndDate,
        status: updatedProject.status,
        createdAt: updatedProject.createdAt,
        updatedAt: updatedProject.updatedAt,
        users: updatedProject.users,
        tradesCount: updatedProject.trades.length,
        lineItemsCount: updatedProject.trades.reduce(
          (sum, trade) => sum + trade.lineItems.length,
          0
        ),
        milestonesCount: updatedProject.milestones.length,
      },
    })
  } catch (error) {
    console.error('Edit project error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update project',
      },
      { status: 500 }
    )
  }
}

// Apply authentication middleware
const protectedPUT = withAuth(PUT, {
  resource: 'projects',
  action: 'update',
  requireAuth: true,
})

export { protectedPUT as PUT }
