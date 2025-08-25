/**
 * API Route: GET /api/projects/[id]/permissions
 * Check user permissions for a specific project (for debugging)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function GET(request: NextRequest, user: AuthUser, context?: { params: { id: string } }) {
  try {
    // Get project ID from URL pathname since context.params might be undefined
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const projectId = pathSegments[pathSegments.length - 2] // Get the ID from /api/projects/{id}/permissions

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project ID is required',
        },
        { status: 400 }
      )
    }

    console.log(`Checking permissions for project: ${projectId}, user: ${user.id}`)

    // Get project info
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project not found',
        },
        { status: 404 }
      )
    }

    // Check user's role in this project
    const userProjectRole = project.users.find(u => u.userId === user.id)

    const permissions = {
      projectId,
      projectName: project.name,
      currentUser: {
        id: user.id,
        globalRole: user.role,
      },
      userProjectRole: userProjectRole?.role || 'NONE',
      hasAccess: !!userProjectRole,
      canView: !!userProjectRole,
      canEdit:
        userProjectRole?.role === 'OWNER' ||
        userProjectRole?.role === 'CONTRACTOR' ||
        user.role === 'ADMIN',
      canDelete: userProjectRole?.role === 'OWNER' || user.role === 'ADMIN',
      allProjectUsers: project.users.map(u => ({
        userId: u.userId,
        userName: u.user.name,
        userEmail: u.user.email,
        projectRole: u.role,
        globalRole: u.user.role,
      })),
    }

    return NextResponse.json({
      success: true,
      permissions,
    })
  } catch (error) {
    console.error('Check permissions error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check permissions',
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

export { protectedGET as GET }
