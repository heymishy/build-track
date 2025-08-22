/**
 * API Route: /api/projects/[id]/trades
 * Get trades and line items for a project
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function GET(request: NextRequest, user: AuthUser, { params }: { params: Promise<{ id: string }> }) {
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
        return NextResponse.json({
          success: false,
          error: 'You do not have access to this project'
        }, { status: 403 })
      }
    }

    // Get trades with line items for this project
    const trades = await prisma.trade.findMany({
      where: { projectId },
      include: {
        lineItems: {
          orderBy: { id: 'asc' }
        }
      },
      orderBy: { sortOrder: 'asc' }
    })

    return NextResponse.json({
      success: true,
      trades
    })

  } catch (error) {
    console.error('Error fetching trades:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch trades'
    }, { status: 500 })
  }
}

// Apply authentication middleware
const protectedGET = withAuth(GET, {
  resource: 'projects',
  action: 'read',
  requireAuth: true,
})

export { protectedGET as GET }