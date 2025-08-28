/**
 * Project Documents API
 * GET /api/projects/[id]/documents - Get documents for a project
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db-pool'
import { withAuth, AuthUser } from '@/lib/middleware'

async function GET(request: NextRequest, user: AuthUser, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params
    const { searchParams } = new URL(request.url)
    const phase = searchParams.get('phase')

    const db = await getDatabase()

    // Build query conditions
    const where: any = {
      projectId,
    }

    // Filter by phase/stage if specified
    if (phase) {
      // Map frontend phase names to database ProjectStatus enum
      const phaseMapping: Record<string, string> = {
        'PLANNING': 'PLANNING',
        'CONSTRUCTION': 'IN_PROGRESS',
        'COMPLETION': 'COMPLETED',
      }
      
      const mappedStage = phaseMapping[phase.toUpperCase()]
      if (mappedStage) {
        where.stage = mappedStage
      }
    }

    // Get documents for the project
    const documents = await db.projectDocument.findMany({
      where,
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      documents,
      count: documents.length,
    })

  } catch (error) {
    console.error('Documents API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch documents',
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