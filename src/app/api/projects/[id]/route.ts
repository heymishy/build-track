/**
 * API Routes: /api/projects/[id]
 * Handles individual project operations (GET, PUT, DELETE)
 */

import { NextRequest } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function GET(request: NextRequest, user: AuthUser, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // Find the project
    const project = await prisma.project.findUnique({
      where: { id },
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
    })

    if (!project) {
      return Response.json(
        {
          success: false,
          error: 'Project not found',
        },
        { status: 404 }
      )
    }

    // Check if user has access to this project
    const hasAccess = user.role === 'ADMIN' || project.users.some(pu => pu.userId === user.id)

    if (!hasAccess) {
      return Response.json(
        {
          success: false,
          error: 'Access denied',
        },
        { status: 403 }
      )
    }

    // Map database fields to API fields for consistency
    const mappedProject = {
      ...project,
      budget: project.totalBudget,
      expectedEndDate: project.estimatedEndDate,
      actualCost: 0, // Will be calculated from invoices
    }

    return Response.json({
      success: true,
      project: mappedProject,
    })
  } catch (error) {
    console.error('Error fetching project:', error)
    return Response.json(
      {
        success: false,
        error: 'Failed to fetch project',
      },
      { status: 500 }
    )
  }
}

async function PUT(request: NextRequest, user: AuthUser, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()
    const { name, description, budget, startDate, expectedEndDate, status } = body

    // First check if project exists and user has access
    const existingProject = await prisma.project.findUnique({
      where: { id },
      include: {
        users: true,
      },
    })

    if (!existingProject) {
      return Response.json(
        {
          success: false,
          error: 'Project not found',
        },
        { status: 404 }
      )
    }

    // Check if user has access to modify this project
    const hasAccess =
      user.role === 'ADMIN' ||
      existingProject.users.some(
        pu => pu.userId === user.id && (pu.role === 'OWNER' || pu.role === 'CONTRACTOR')
      )

    if (!hasAccess) {
      return Response.json(
        {
          success: false,
          error: 'Access denied',
        },
        { status: 403 }
      )
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (budget !== undefined) updateData.totalBudget = budget
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null
    if (expectedEndDate !== undefined)
      updateData.estimatedEndDate = expectedEndDate ? new Date(expectedEndDate) : null
    if (status !== undefined) updateData.status = status

    // Update the project
    const updatedProject = await prisma.project.update({
      where: { id },
      data: updateData,
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

    // Map database fields to API fields
    const mappedProject = {
      ...updatedProject,
      budget: updatedProject.totalBudget,
      expectedEndDate: updatedProject.estimatedEndDate,
    }

    return Response.json({
      success: true,
      project: mappedProject,
    })
  } catch (error) {
    console.error('Error updating project:', error)
    return Response.json(
      {
        success: false,
        error: 'Failed to update project',
      },
      { status: 500 }
    )
  }
}

async function DELETE(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // First check if project exists and user has access
    const existingProject = await prisma.project.findUnique({
      where: { id },
      include: {
        users: true,
      },
    })

    if (!existingProject) {
      return Response.json(
        {
          success: false,
          error: 'Project not found',
        },
        { status: 404 }
      )
    }

    // Check if user has access to delete this project (only owners and admins)
    const hasAccess =
      user.role === 'ADMIN' ||
      existingProject.users.some(pu => pu.userId === user.id && pu.role === 'OWNER')

    if (!hasAccess) {
      return Response.json(
        {
          success: false,
          error: 'Access denied',
        },
        { status: 403 }
      )
    }

    // Delete the project (cascade will handle related records)
    await prisma.project.delete({
      where: { id },
    })

    return Response.json({
      success: true,
      message: 'Project deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting project:', error)
    return Response.json(
      {
        success: false,
        error: 'Failed to delete project',
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
  action: 'delete',
  requireAuth: true,
})

export { protectedGET as GET, protectedPUT as PUT, protectedDELETE as DELETE }
