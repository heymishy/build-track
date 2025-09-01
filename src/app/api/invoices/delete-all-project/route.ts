/**
 * Delete all invoices in a project API endpoint
 * DELETE /api/invoices/delete-all-project
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

export const DELETE = withAuth(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url)
      const projectId = searchParams.get('projectId')

      if (!projectId || projectId === 'undefined') {
        return NextResponse.json(
          { success: false, error: 'Project ID is required' },
          { status: 400 }
        )
      }

      // Handle "unlinked" special case
      if (projectId === 'unlinked') {
        // Delete invoices that are not assigned to any project
        const deletedCount = await prisma.invoice.deleteMany({
          where: {
            projectId: null,
          },
        })

        return NextResponse.json({
          success: true,
          deletedCount: deletedCount.count,
          message: `Deleted ${deletedCount.count} unlinked invoices`,
        })
      }

      // Verify project exists
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true },
      })

      if (!project) {
        return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
      }

      // Delete all invoices in the project
      const deletedCount = await prisma.invoice.deleteMany({
        where: {
          projectId: projectId,
        },
      })

      return NextResponse.json({
        success: true,
        deletedCount: deletedCount.count,
        message: `Deleted ${deletedCount.count} invoices from project: ${project.name}`,
      })
    } catch (error) {
      console.error('Delete all project invoices error:', error)
      return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
  },
  {
    resource: 'invoices',
    action: 'delete',
    requireAuth: true,
  }
)
