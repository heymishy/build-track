/**
 * API Route: /api/projects/[id]/milestones
 * Manage milestones for a specific project
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

    // Get milestones for this project
    const milestones = await prisma.milestone.findMany({
      where: { projectId },
      orderBy: { sortOrder: 'asc' },
    })

    // Calculate summary stats
    const totalMilestones = milestones.length
    const completedMilestones = milestones.filter(m => m.status === 'COMPLETED').length
    const totalPaymentAmount = milestones.reduce((sum, m) => sum + Number(m.paymentAmount), 0)
    const completedPaymentAmount = milestones
      .filter(m => m.status === 'COMPLETED')
      .reduce((sum, m) => sum + Number(m.paymentAmount), 0)

    return NextResponse.json({
      success: true,
      milestones: milestones.map(milestone => ({
        ...milestone,
        paymentAmount: Number(milestone.paymentAmount),
        percentComplete: Number(milestone.percentComplete),
      })),
      summary: {
        totalMilestones,
        completedMilestones,
        totalPaymentAmount,
        completedPaymentAmount,
        overallProgress:
          totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0,
      },
    })
  } catch (error) {
    console.error('Error fetching milestones:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch milestones',
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

    const { name, description, targetDate, paymentAmount, sortOrder } = body

    // Validate required fields
    if (!name || !targetDate || paymentAmount === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name, target date, and payment amount are required',
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

    // Create the milestone
    const milestone = await prisma.milestone.create({
      data: {
        projectId,
        name: name.trim(),
        description: description?.trim() || null,
        targetDate: new Date(targetDate),
        paymentAmount: Number(paymentAmount),
        sortOrder: sortOrder || 0,
        status: 'PENDING',
        percentComplete: 0,
      },
    })

    return NextResponse.json(
      {
        success: true,
        milestone: {
          ...milestone,
          paymentAmount: Number(milestone.paymentAmount),
          percentComplete: Number(milestone.percentComplete),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating milestone:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create milestone',
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
