/**
 * Project Documents API
 * GET /api/projects/[id]/documents - Get documents for a project
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db-pool'
import { withAuth } from '@/lib/middleware'

export const GET = withAuth(async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { id: projectId } = params
    const { searchParams } = new URL(request.url)
    const phase = searchParams.get('phase')

    const db = await getDatabase()

    // Build query conditions
    const where: any = {
      projectId,
    }

    // Filter by phase/stage if specified
    if (phase) {
      where.stage = phase
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
})