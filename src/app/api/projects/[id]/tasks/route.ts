/**
 * API Route: /api/projects/[id]/tasks
 * Advanced task management with Gantt chart support and dependencies
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

interface TaskData {
  name: string
  description?: string
  startDate: string
  endDate: string
  progress: number
  status: 'not-started' | 'in-progress' | 'completed' | 'on-hold' | 'overdue'
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignee?: string
  estimatedHours?: number
  actualHours?: number
  milestone: boolean
  dependencies: string[]
  parentTaskId?: string
}

async function GET(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params

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

    // Get all tasks for this project with hierarchical structure
    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        parentTaskId: null, // Only get root level tasks
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
            dependencies: {
              include: {
                dependentTask: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            startDate: 'asc',
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    })

    // Transform to the format expected by the Gantt chart
    const transformTask = (task: any) => ({
      id: task.id,
      name: task.name,
      description: task.description,
      startDate: task.startDate,
      endDate: task.endDate,
      progress: task.progress || 0,
      status: task.status,
      priority: task.priority,
      assignee: task.assignedUser?.name || task.assignee,
      estimatedHours: task.estimatedHours ? Number(task.estimatedHours) : undefined,
      actualHours: task.actualHours ? Number(task.actualHours) : undefined,
      milestone: task.milestone || false,
      dependencies: task.dependencies.map((dep: any) => dep.dependentTask.id),
      children: task.children?.map(transformTask),
      parentId: task.parentTaskId,
    })

    const transformedTasks = tasks.map(transformTask)

    // Calculate project statistics
    const allTasks = await prisma.task.findMany({
      where: { projectId },
    })

    const stats = {
      total: allTasks.length,
      completed: allTasks.filter(t => t.status === 'COMPLETED').length,
      inProgress: allTasks.filter(t => t.status === 'IN_PROGRESS').length,
      notStarted: allTasks.filter(t => t.status === 'NOT_STARTED').length,
      overdue: allTasks.filter(t => 
        new Date(t.endDate) < new Date() && t.status !== 'COMPLETED'
      ).length,
      avgProgress: allTasks.length > 0 
        ? Math.round(allTasks.reduce((sum, t) => sum + (t.progress || 0), 0) / allTasks.length)
        : 0,
    }

    return NextResponse.json({
      success: true,
      data: {
        tasks: transformedTasks,
        stats,
      },
    })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tasks',
      },
      { status: 500 }
    )
  }
}

async function POST(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const taskData: TaskData = await request.json()

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

    // Validate dates
    const startDate = new Date(taskData.startDate)
    const endDate = new Date(taskData.endDate)

    if (endDate <= startDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'End date must be after start date',
        },
        { status: 400 }
      )
    }

    // Create the task
    const task = await prisma.task.create({
      data: {
        name: taskData.name,
        description: taskData.description,
        startDate,
        endDate,
        progress: taskData.progress || 0,
        status: taskData.status.toUpperCase().replace('-', '_') as any,
        priority: taskData.priority.toUpperCase() as any,
        assignee: taskData.assignee,
        estimatedHours: taskData.estimatedHours,
        actualHours: taskData.actualHours || 0,
        milestone: taskData.milestone || false,
        projectId,
        parentTaskId: taskData.parentTaskId,
        createdBy: user.id,
      },
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

    // Handle dependencies
    if (taskData.dependencies && taskData.dependencies.length > 0) {
      await prisma.taskDependency.createMany({
        data: taskData.dependencies.map(depId => ({
          taskId: task.id,
          dependsOnTaskId: depId,
        })),
      })
    }

    // Update project timeline if this task extends beyond current end date
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { endDate: true },
    })

    if (project && (!project.endDate || endDate > project.endDate)) {
      await prisma.project.update({
        where: { id: projectId },
        data: { endDate },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: task.id,
        name: task.name,
        startDate: task.startDate,
        endDate: task.endDate,
        progress: task.progress,
        status: task.status,
        priority: task.priority,
        assignee: task.assignedUser?.name || task.assignee,
        estimatedHours: task.estimatedHours ? Number(task.estimatedHours) : undefined,
        actualHours: task.actualHours ? Number(task.actualHours) : undefined,
        milestone: task.milestone,
      },
    })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create task',
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
  action: 'update',
  requireAuth: true,
})

export { protectedGET as GET, protectedPOST as POST }