/**
 * API Route: /api/projects/[id]/labor-entries
 * Manage labor tracking entries for construction projects
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

    // Get labor entries
    const entries = await prisma.laborEntry.findMany({
      where: { projectId },
      orderBy: { workDate: 'desc' },
    })

    return NextResponse.json({
      success: true,
      entries,
    })
  } catch (error) {
    console.error('Error fetching labor entries:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch labor entries',
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

    const { workDate, workerRole, hoursWorked, hourlyRate, description } = body

    // Validate required fields
    if (!workDate || !workerRole || hoursWorked === undefined || hourlyRate === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Work date, role, hours, and rate are required',
        },
        { status: 400 }
      )
    }

    // Validate labor role
    const validRoles = ['SENIOR_BUILDER', 'BUILDER', 'APPRENTICE', 'LABOURER', 'SPECIALIST']
    if (!validRoles.includes(workerRole)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid worker role',
        },
        { status: 400 }
      )
    }

    // Validate hours (0.25 to 16 hours per day)
    if (hoursWorked < 0.25 || hoursWorked > 16) {
      return NextResponse.json(
        {
          success: false,
          error: 'Hours worked must be between 0.25 and 16',
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

    // Create the labor entry
    const entry = await prisma.laborEntry.create({
      data: {
        projectId,
        workDate: new Date(workDate),
        workerRole,
        hoursWorked: Number(hoursWorked),
        hourlyRate: Number(hourlyRate),
        description: description?.trim() || null,
        createdBy: user.id,
      },
    })

    return NextResponse.json(
      {
        success: true,
        entry,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating labor entry:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create labor entry',
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
