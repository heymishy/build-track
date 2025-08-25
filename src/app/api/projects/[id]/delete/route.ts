/**
 * API Route: DELETE /api/projects/[id]/delete
 * Delete a project and all associated data
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function DELETE(request: NextRequest, user: AuthUser, context?: { params: { id: string } }) {
  try {
    // Get project ID from URL pathname since context.params might be undefined
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const projectId = pathSegments[pathSegments.length - 2] // Get the ID from /api/projects/{id}/delete

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project ID is required',
        },
        { status: 400 }
      )
    }

    console.log(`DELETE API: Deleting project: ${projectId}`)
    console.log('DELETE API: User attempting delete:', {
      id: user.id,
      email: user.email,
      role: user.role,
    })

    // Verify user has access to delete this project
    if (user.role !== 'ADMIN') {
      console.log('DELETE API: User is not ADMIN, checking project permissions...')

      // First, check if the user has any access to this project
      const allProjectAccess = await prisma.projectUser.findMany({
        where: {
          projectId,
        },
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
      })

      console.log('DELETE API: All project users for project', projectId, ':', allProjectAccess)
      console.log('DELETE API: Current user:', { id: user.id, role: user.role })

      // Check if user has access to this project
      const userProjectAccess = allProjectAccess.find(access => access.userId === user.id)

      console.log('DELETE API: User project access found:', userProjectAccess)

      if (!userProjectAccess) {
        console.log('DELETE API: User has no access to project')
        return NextResponse.json(
          {
            success: false,
            error: 'You do not have access to this project.',
          },
          { status: 403 }
        )
      }

      // Check if user is an owner OR if they have admin role globally
      if (userProjectAccess.role !== 'OWNER' && user.role !== 'ADMIN') {
        console.log(
          'DELETE API: Permission denied - User role in project:',
          userProjectAccess.role,
          'Global role:',
          user.role
        )
        return NextResponse.json(
          {
            success: false,
            error: `You do not have permission to delete this project. Your role: ${userProjectAccess.role}. Only project owners or administrators can delete projects.`,
          },
          { status: 403 }
        )
      }

      console.log(
        'DELETE API: User has permission to delete project - Role:',
        userProjectAccess.role
      )
    }

    // Get project details before deletion for logging
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        trades: {
          include: {
            lineItems: true,
          },
        },
        invoices: true,
        milestones: true,
        users: true,
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

    // Calculate what will be deleted for confirmation
    const totalLineItems = project.trades.reduce((sum, trade) => sum + trade.lineItems.length, 0)
    const deletionSummary = {
      projectName: project.name,
      trades: project.trades.length,
      lineItems: totalLineItems,
      invoices: project.invoices.length,
      milestones: project.milestones.length,
      users: project.users.length,
    }

    // Delete everything in the correct order (foreign key constraints)
    await prisma.$transaction(async tx => {
      // Delete line items first
      await tx.lineItem.deleteMany({
        where: {
          trade: { projectId },
        },
      })

      // Delete invoice line items
      await tx.invoiceLineItem.deleteMany({
        where: {
          invoice: { projectId },
        },
      })

      // Delete invoices
      await tx.invoice.deleteMany({
        where: { projectId },
      })

      // Delete trades
      await tx.trade.deleteMany({
        where: { projectId },
      })

      // Delete milestones
      await tx.milestone.deleteMany({
        where: { projectId },
      })

      // Delete project users
      await tx.projectUser.deleteMany({
        where: { projectId },
      })

      // Finally delete the project
      await tx.project.delete({
        where: { id: projectId },
      })
    })

    console.log(`Successfully deleted project ${projectId}:`, deletionSummary)

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
      deleted: deletionSummary,
    })
  } catch (error) {
    console.error('Delete project error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete project',
      },
      { status: 500 }
    )
  }
}

// Apply authentication middleware - use 'read' for global check since delete is handled at project level
const protectedDELETE = withAuth(DELETE, {
  resource: 'projects',
  action: 'read', // Use 'read' instead of 'delete' since we handle delete permissions at project level
  requireAuth: true,
})

export { protectedDELETE as DELETE }
