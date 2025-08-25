/**
 * API Route: /api/projects/stage-transition
 * Log stage transitions for audit trail
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function POST(request: NextRequest, user: AuthUser) {
  try {
    const body = await request.json()
    const { projectId, fromStatus, toStatus, reason } = body

    // Validate required fields
    if (!projectId || !toStatus) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project ID and target status are required',
        },
        { status: 400 }
      )
    }

    // Verify user has access to this project
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

    // Create stage transition record
    const transition = await prisma.stageTransition.create({
      data: {
        projectId,
        fromStatus: fromStatus || null,
        toStatus,
        transitionedBy: user.id,
        reason: reason || null,
      },
    })

    return NextResponse.json({
      success: true,
      transition,
    })
  } catch (error) {
    console.error('Error logging stage transition:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to log stage transition',
      },
      { status: 500 }
    )
  }
}

// Apply authentication middleware
const protectedPOST = withAuth(POST, {
  resource: 'projects',
  action: 'update',
  requireAuth: true,
})

export { protectedPOST as POST }
