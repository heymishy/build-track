/**
 * API Route: /api/projects/[id]/tasks/[taskId]
 * Individual task operations (GET, PUT, DELETE)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function GET(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id: projectId, taskId } = await params

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

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        dependencies: {
          include: {
            dependentTask: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
        dependentTasks: {
          include: {
            dependsOnTask: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
        children: {
          include: {
            assignedUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            startDate: 'asc',
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: 'Task not found',
        },
        { status: 404 }
      )
    }

    const transformedTask = {
      id: task.id,
      name: task.name,
      description: task.description,
      startDate: task.startDate,
      endDate: task.endDate,
      progress: task.progress || 0,
      status: task.status,
      priority: task.priority,
      assignee: task.assignedUser?.name || task.assignee,
      assignedUserId: task.assignedUser?.id,
      estimatedHours: task.estimatedHours ? Number(task.estimatedHours) : undefined,
      actualHours: task.actualHours ? Number(task.actualHours) : undefined,
      milestone: task.milestone || false,
      dependencies: task.dependencies.map(dep => dep.dependentTask),
      dependentTasks: task.dependentTasks.map(dep => dep.dependsOnTask),
      children: task.children.map(child => ({
        id: child.id,
        name: child.name,
        progress: child.progress || 0,
        status: child.status,
        assignee: child.assignedUser?.name || child.assignee,
      })),
      parent: task.parent,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }

    return NextResponse.json({
      success: true,
      data: transformedTask,
    })
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch task',
      },
      { status: 500 }
    )
  }
}

async function PUT(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id: projectId, taskId } = await params
    const updates = await request.json()

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

    // Check if task exists
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
      },
    })

    if (!existingTask) {
      return NextResponse.json(
        {
          success: false,
          error: 'Task not found',
        },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}

    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.progress !== undefined) updateData.progress = updates.progress
    if (updates.estimatedHours !== undefined) updateData.estimatedHours = updates.estimatedHours
    if (updates.actualHours !== undefined) updateData.actualHours = updates.actualHours
    if (updates.assignee !== undefined) updateData.assignee = updates.assignee
    if (updates.milestone !== undefined) updateData.milestone = updates.milestone

    // Handle status updates
    if (updates.status !== undefined) {
      updateData.status = updates.status.toUpperCase().replace('-', '_')
      
      // Auto-update progress based on status
      if (updates.status === 'completed' && updates.progress === undefined) {
        updateData.progress = 100
      } else if (updates.status === 'not-started' && updates.progress === undefined) {
        updateData.progress = 0
      }
    }

    // Handle priority updates
    if (updates.priority !== undefined) {
      updateData.priority = updates.priority.toUpperCase()
    }

    // Handle date updates with validation
    if (updates.startDate !== undefined) {
      updateData.startDate = new Date(updates.startDate)
    }
    if (updates.endDate !== undefined) {
      updateData.endDate = new Date(updates.endDate)
    }

    // Validate date ranges
    const startDate = updateData.startDate || existingTask.startDate
    const endDate = updateData.endDate || existingTask.endDate

    if (endDate <= startDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'End date must be after start date',
        },
        { status: 400 }
      )
    }

    // Update the task
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Handle dependency updates if provided
    if (updates.dependencies !== undefined) {
      // Remove existing dependencies
      await prisma.taskDependency.deleteMany({
        where: { taskId },
      })

      // Add new dependencies
      if (updates.dependencies.length > 0) {
        await prisma.taskDependency.createMany({
          data: updates.dependencies.map((depId: string) => ({
            taskId,
            dependsOnTaskId: depId,
          })),
        })
      }
    }

    // Update project timeline if needed
    if (updateData.endDate) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { endDate: true },
      })

      if (project && (!project.endDate || updateData.endDate > project.endDate)) {
        await prisma.project.update({
          where: { id: projectId },
          data: { endDate: updateData.endDate },
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedTask.id,
        name: updatedTask.name,
        description: updatedTask.description,
        startDate: updatedTask.startDate,
        endDate: updatedTask.endDate,
        progress: updatedTask.progress,
        status: updatedTask.status,
        priority: updatedTask.priority,
        assignee: updatedTask.assignedUser?.name || updatedTask.assignee,
        estimatedHours: updatedTask.estimatedHours ? Number(updatedTask.estimatedHours) : undefined,
        actualHours: updatedTask.actualHours ? Number(updatedTask.actualHours) : undefined,
        milestone: updatedTask.milestone,
        updatedAt: updatedTask.updatedAt,
      },
    })
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update task',
      },
      { status: 500 }
    )
  }
}

async function DELETE(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id: projectId, taskId } = await params

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

    // Check if task exists
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
      },
      include: {
        children: true,
        dependentTasks: true,
      },
    })

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: 'Task not found',
        },
        { status: 404 }
      )
    }

    // Check if task has dependencies that would be affected
    if (task.dependentTasks.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete task with dependent tasks. Please update dependencies first.',
        },
        { status: 400 }
      )
    }

    // Delete task and its dependencies in transaction
    await prisma.$transaction(async (tx) => {
      // Delete all dependencies
      await tx.taskDependency.deleteMany({
        where: {
          OR: [
            { taskId },
            { dependsOnTaskId: taskId },
          ],
        },
      })

      // Delete child tasks recursively
      if (task.children.length > 0) {
        await tx.task.deleteMany({
          where: {
            parentTaskId: taskId,
          },
        })
      }

      // Delete the main task
      await tx.task.delete({
        where: { id: taskId },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete task',
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