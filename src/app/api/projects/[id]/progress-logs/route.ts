/**
 * API Route: /api/projects/[id]/progress-logs
 * Manage weekly progress logs for construction projects
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

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

    // Get progress logs with photos
    const logs = await prisma.weeklyProgressLog.findMany({
      where: { projectId },
      include: {
        photos: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { weekStarting: 'desc' },
    })

    return NextResponse.json({
      success: true,
      logs,
    })
  } catch (error) {
    console.error('Error fetching progress logs:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch progress logs',
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
    const body = await request.json()

    const { weekStarting, weekEnding, summary, issues, nextWeekPlan } = body

    // Validate required fields
    if (!weekStarting || !weekEnding || !summary) {
      return NextResponse.json(
        {
          success: false,
          error: 'Week dates and summary are required',
        },
        { status: 400 }
      )
    }

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

    // Check for existing log for this week
    const existingLog = await prisma.weeklyProgressLog.findFirst({
      where: {
        projectId,
        weekStarting: new Date(weekStarting),
      },
    })

    if (existingLog) {
      return NextResponse.json(
        {
          success: false,
          error: 'A progress log already exists for this week',
        },
        { status: 400 }
      )
    }

    // Create the progress log
    const log = await prisma.weeklyProgressLog.create({
      data: {
        projectId,
        weekStarting: new Date(weekStarting),
        weekEnding: new Date(weekEnding),
        summary: summary.trim(),
        issues: issues?.trim() || null,
        nextWeekPlan: nextWeekPlan?.trim() || null,
        createdBy: user.id,
      },
      include: {
        photos: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        log,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating progress log:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create progress log',
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