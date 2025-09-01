/**
 * API Route: /api/projects/[id]/milestones/[milestoneId]
 * Individual milestone operations (GET, PUT, DELETE)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function GET(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const { id: projectId, milestoneId } = await params

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

    // Get the milestone with dependencies
    const milestone = await prisma.milestone.findFirst({
      where: {
        id: milestoneId,
        projectId,
      },
      include: {
        dependencies: {
          select: { id: true, name: true, status: true }
        },
        dependentOn: {
          select: { id: true, name: true, status: true }
        }
      },
    })

    if (!milestone) {
      return NextResponse.json(
        {
          success: false,
          error: 'Milestone not found',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      milestone: {
        ...milestone,
        paymentAmount: Number(milestone.paymentAmount),
        percentComplete: Number(milestone.percentComplete),
      },
    })
  } catch (error) {
    console.error('Error fetching milestone:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch milestone',
      },
      { status: 500 }
    )
  }
}

async function PUT(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const { id: projectId, milestoneId } = await params
    const body = await request.json()

    const {
      name,
      description,
      targetDate,
      actualDate,
      paymentAmount,
      percentComplete,
      status,
      sortOrder,
      dependencies,
    } = body

    // Verify user has access to modify this project
    if (user.role !== 'ADMIN') {
      const projectAccess = await prisma.projectUser.findFirst({
        where: {
          userId: user.id,
          projectId,
          role: { in: ['OWNER', 'CONTRACTOR'] },
        },
      })

      if (!projectAccess) {
        return NextResponse.json(
          {
            success: false,
            error: 'You do not have permission to modify this project',
          },
          { status: 403 }
        )
      }
    }

    // Check if milestone exists
    const existingMilestone = await prisma.milestone.findFirst({
      where: {
        id: milestoneId,
        projectId,
      },
    })

    if (!existingMilestone) {
      return NextResponse.json(
        {
          success: false,
          error: 'Milestone not found',
        },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: Record<string, any> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (targetDate !== undefined) updateData.targetDate = new Date(targetDate)
    if (actualDate !== undefined) updateData.actualDate = actualDate ? new Date(actualDate) : null
    if (paymentAmount !== undefined) updateData.paymentAmount = Number(paymentAmount)
    if (percentComplete !== undefined)
      updateData.percentComplete = Math.max(0, Math.min(100, Number(percentComplete)))
    if (status !== undefined) updateData.status = status
    if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder)

    // Handle dependencies update if provided
    let dependenciesUpdate = {}
    if (dependencies !== undefined) {
      // Validate dependencies exist and belong to the same project, excluding self
      let validatedDependencies: string[] = []
      if (Array.isArray(dependencies) && dependencies.length > 0) {
        const existingMilestones = await prisma.milestone.findMany({
          where: {
            id: { in: dependencies },
            projectId, // Ensure dependencies are from same project
            NOT: { id: milestoneId }, // Exclude self
          },
          select: { id: true },
        })
        validatedDependencies = existingMilestones.map(m => m.id)
      }

      // Set up dependency relationships (replace all existing)
      dependenciesUpdate = {
        dependencies: {
          set: validatedDependencies.map(id => ({ id }))
        }
      }
    }

    // Update the milestone
    const updatedMilestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        ...updateData,
        ...dependenciesUpdate,
      },
      include: {
        dependencies: {
          select: { id: true, name: true, status: true }
        },
      },
    })

    return NextResponse.json({
      success: true,
      milestone: {
        ...updatedMilestone,
        paymentAmount: Number(updatedMilestone.paymentAmount),
        percentComplete: Number(updatedMilestone.percentComplete),
      },
    })
  } catch (error) {
    console.error('Error updating milestone:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update milestone',
      },
      { status: 500 }
    )
  }
}

async function DELETE(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const { id: projectId, milestoneId } = await params

    // Verify user has access to modify this project
    if (user.role !== 'ADMIN') {
      const projectAccess = await prisma.projectUser.findFirst({
        where: {
          userId: user.id,
          projectId,
          role: { in: ['OWNER', 'CONTRACTOR'] },
        },
      })

      if (!projectAccess) {
        return NextResponse.json(
          {
            success: false,
            error: 'You do not have permission to modify this project',
          },
          { status: 403 }
        )
      }
    }

    // Check if milestone exists
    const existingMilestone = await prisma.milestone.findFirst({
      where: {
        id: milestoneId,
        projectId,
      },
    })

    if (!existingMilestone) {
      return NextResponse.json(
        {
          success: false,
          error: 'Milestone not found',
        },
        { status: 404 }
      )
    }

    // Delete the milestone
    await prisma.milestone.delete({
      where: { id: milestoneId },
    })

    return NextResponse.json({
      success: true,
      message: 'Milestone deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting milestone:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete milestone',
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

const protectedPUT = withAuth(PUT, {
  resource: 'projects',
  action: 'update',
  requireAuth: true,
})

const protectedDELETE = withAuth(DELETE, {
  resource: 'projects',
  action: 'update',
  requireAuth: true,
})

export { protectedGET as GET, protectedPUT as PUT, protectedDELETE as DELETE }
